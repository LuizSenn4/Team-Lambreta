import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const catalogPath = path.join(root, 'scripts/game-cover-catalog.json');
const outDir = path.join(root, 'assets/game-covers');
const manifestPath = path.join(outDir, 'index.json');
const games = JSON.parse(await fs.readFile(catalogPath, 'utf8'));
await fs.mkdir(outDir, { recursive: true });

const overrides = {
  fortnite: 'https://cdn2.unrealengine.com/fortnite-og-image-1920x1080-5e359e3cc6f7.jpg',
  minecraft: 'https://www.minecraft.net/content/dam/minecraftnet/games/minecraft/key-art/Minecraft_KeyArt_2024.jpg'
};

const normalize = value => String(value || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function fetchBuffer(url) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'TeamLambretaCoverSync/1.0 (+https://teamlambreta.net)' },
    redirect: 'follow'
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const type = response.headers.get('content-type') || '';
  if (!type.startsWith('image/')) throw new Error(`Not an image: ${type}`);
  return Buffer.from(await response.arrayBuffer());
}

async function steamCandidate(name) {
  const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(name)}&l=english&cc=US`;
  const response = await fetch(url, { headers: { 'user-agent': 'TeamLambretaCoverSync/1.0' } });
  if (!response.ok) return null;
  const data = await response.json().catch(() => null);
  const items = Array.isArray(data?.items) ? data.items : [];
  const wanted = normalize(name);
  const exact = items.find(item => normalize(item?.name) === wanted);
  const chosen = exact || items.find(item => normalize(item?.name).includes(wanted) || wanted.includes(normalize(item?.name)));
  if (!chosen?.id) return null;
  return {
    source: 'steam',
    url: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${chosen.id}/header.jpg`
  };
}

async function wikipediaCandidate(name) {
  const search = `${name} video game`;
  const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(search)}&gsrlimit=5&prop=pageimages&piprop=thumbnail&pithumbsize=900&format=json&origin=*`;
  const response = await fetch(url, { headers: { 'user-agent': 'TeamLambretaCoverSync/1.0 (+https://teamlambreta.net)' } });
  if (!response.ok) return null;
  const data = await response.json().catch(() => null);
  const pages = Object.values(data?.query?.pages || {});
  const page = pages.find(item => item?.thumbnail?.source) || null;
  return page?.thumbnail?.source ? { source: 'wikipedia', url: page.thumbnail.source } : null;
}

function fallbackSvg(game) {
  const title = String(game.short_name || game.name || game.slug).slice(0, 28)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#07131d"/><stop offset="1" stop-color="#0e3144"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><circle cx="560" cy="80" r="110" fill="#18d1ff" opacity=".12"/><text x="36" y="290" fill="#dff8ff" font-family="Arial,Helvetica,sans-serif" font-size="42" font-weight="700">${title}</text><text x="38" y="326" fill="#66dfff" font-family="Arial,Helvetica,sans-serif" font-size="18">TEAM LAMBRETA</text></svg>`);
}

const manifest = {};
for (const game of games) {
  const target = path.join(outDir, `${game.slug}.webp`);
  let source = 'fallback';
  let sourceUrl = '';
  let input = null;

  const candidates = [];
  if (overrides[game.slug]) candidates.push({ source: 'official', url: overrides[game.slug] });
  const steam = await steamCandidate(game.name).catch(() => null);
  if (steam) candidates.push(steam);
  const wiki = await wikipediaCandidate(game.name).catch(() => null);
  if (wiki) candidates.push(wiki);

  for (const candidate of candidates) {
    try {
      input = await fetchBuffer(candidate.url);
      source = candidate.source;
      sourceUrl = candidate.url;
      break;
    } catch {}
  }

  try {
    const image = input || fallbackSvg(game);
    await sharp(image)
      .resize(640, 360, { fit: 'cover', position: 'centre' })
      .webp({ quality: 78, effort: 4 })
      .toFile(target);
    manifest[game.slug] = { file: `assets/game-covers/${game.slug}.webp`, source, source_url: sourceUrl };
    console.log(`✓ ${game.slug} (${source})`);
  } catch (error) {
    manifest[game.slug] = { file: '', source: 'error', source_url: '', error: String(error?.message || error) };
    console.error(`✗ ${game.slug}:`, error?.message || error);
  }
}

await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Saved ${Object.keys(manifest).length} cover entries.`);
