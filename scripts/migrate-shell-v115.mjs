import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const skipDirs = new Set(['.git','node_modules','.vercel']);

async function walk(dir) {
  const entries = await fs.readdir(dir,{withFileTypes:true});
  const files=[];
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.well-known') continue;
    const full=path.join(dir,entry.name);
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) files.push(...await walk(full));
    } else files.push(full);
  }
  return files;
}

async function patch(file, transform) {
  let before;
  try { before=await fs.readFile(file,'utf8'); } catch { return false; }
  const after=transform(before);
  if (after===before) return false;
  await fs.writeFile(file,after);
  console.log('updated',path.relative(root,file));
  return true;
}

const files=await walk(root);
let changed=0;

for (const file of files.filter(f=>f.endsWith('.html'))) {
  if (await patch(file,text=>text
    .replace(/tl-shell-v114\.css(?:\?v=[^"'\s>]+)?/g,'tl-shell-v115.css?v=115.0')
    .replace(/tl-shell-v114\.js(?:\?v=[^"'\s>]+)?/g,'tl-shell-v115.js?v=115.0')
    .replace(/home-v102\.css\?v=[^"'\s>]+/g,'home-v102.css?v=105.2')
    .replace(/home-slider-v113\.css\?v=[^"'\s>]+/g,'home-slider-v113.css?v=113.2')
    .replace(/home-streamers-v102\.css\?v=[^"'\s>]+/g,'home-streamers-v102.css?v=103.1')
    .replace(/id="forumGamesCount">0\/3</g,'id="forumGamesCount">0/4')
    .replace(/Selecione até 3 jogos\./g,'Selecione até 4 jogos.')
  )) changed++;
}

const profileService=path.join(root,'services','profile-service.js');
if (await patch(profileService,text=>text.replace(
  'const games = [...new Set(input.games || [])].slice(0, 3);',
  'const games = [...new Set(input.games || [])].slice(0, 4);'
))) changed++;

const forumBoard=path.join(root,'forum-board-v2.js');
if (await patch(forumBoard,text=>text
  .replaceAll('${selectedGames.size}/3','${selectedGames.size}/4')
  .replaceAll('selectedGames.size >= 3','selectedGames.size >= 4')
  .replaceAll('até 3 jogos','até 4 jogos')
)) changed++;

console.log(`migration complete: ${changed} file(s) changed`);
