import fs from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const errors=[];
const read=rel=>fs.readFile(path.join(root,rel),'utf8');

const htmlFiles=[];
async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){if(['.git','node_modules','.vercel'].includes(entry.name))continue;const full=path.join(dir,entry.name);if(entry.isDirectory())await walk(full);else if(entry.name.endsWith('.html'))htmlFiles.push(full)}}
await walk(root);

for(const file of htmlFiles){
  const rel=path.relative(root,file),text=await fs.readFile(file,'utf8');
  if(/tl-shell-v11[34]\.(?:css|js)/.test(text))errors.push(`${rel}: legacy shell reference`);
  if(/profile-v102\.(?:css|js)/.test(text))errors.push(`${rel}: deleted profile V102 reference`);
  if(/tl-shell-v115\.js/.test(text)&&!/tl-shell-v115\.css/.test(text))errors.push(`${rel}: V115 JS without V115 CSS`);
  const assets=[...text.matchAll(/(?:src|href)=["']([^"']+\.(?:css|js))(?:\?[^"']*)?["']/g)].map(match=>match[1]);
  const duplicates=assets.filter((asset,index)=>assets.indexOf(asset)!==index);
  if(duplicates.length)errors.push(`${rel}: duplicate assets: ${[...new Set(duplicates)].join(', ')}`);
}

const home=await read('home.html');
if(!home.includes('tl-shell-v115.css?v=115.0')||!home.includes('tl-shell-v115.js?v=115.0'))errors.push('home.html: shell v115 not pinned');
const service=await read('services/profile-service.js');
if(!service.includes('slice(0, 4)'))errors.push('profile-service: games are not capped at 4');
const forum=await read('forum-board-v2.js');
if(forum.includes('selectedGames.size >= 3')||forum.includes('${selectedGames.size}/3')||forum.includes('até 3 jogos'))errors.push('forum-board-v2: old 3-game limit remains');
const guardMigration=await read('supabase/migrations/20260908213000_profile_cover_transform_and_four_games_guard.sql');
if(guardMigration.includes('cardinality(new.games)>3')||guardMigration.includes('até 3 jogos'))errors.push('profile catalog trigger: old 3-game limit remains');
const profileHtml=await read('profile.html');
for(const asset of ['profile-v122-position.css?v=125.0','profile-v122-position.js?v=125.0','profile-game-v123.css?v=125.0','profile-game-v123.js?v=125.0'])if(!profileHtml.includes(asset))errors.push(`profile.html: current asset not pinned: ${asset}`);
for(const obsolete of ['profile-social-editor-v106.js','buddy-gunbound-v1.css','buddy.html.before-mobile-auth-fix','profile-v123-preview.html']){try{await read(obsolete);errors.push(`${obsolete}: obsolete file returned`)}catch(error){if(error?.code!=='ENOENT')throw error}}
const vercel=JSON.parse(await read('vercel.json'));
const joined=JSON.stringify(vercel);
if(joined.includes('css|js|png'))errors.push('vercel.json: CSS/JS still share immutable asset cache rule');

if(errors.length){console.error('\nREGRESSION CHECK FAILED');errors.forEach(e=>console.error(' -',e));process.exit(1)}
console.log(`Regression check OK: ${htmlFiles.length} HTML files scanned.`);
