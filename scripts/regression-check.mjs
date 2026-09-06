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
}

const home=await read('home.html');
if(!home.includes('tl-shell-v115.css?v=115.0')||!home.includes('tl-shell-v115.js?v=115.0'))errors.push('home.html: shell v115 not pinned');
const service=await read('services/profile-service.js');
if(!service.includes('slice(0, 4)'))errors.push('profile-service: games are not capped at 4');
const forum=await read('forum-board-v2.js');
if(forum.includes('selectedGames.size >= 3')||forum.includes('${selectedGames.size}/3')||forum.includes('até 3 jogos'))errors.push('forum-board-v2: old 3-game limit remains');
const vercel=JSON.parse(await read('vercel.json'));
const joined=JSON.stringify(vercel);
if(joined.includes('css|js|png'))errors.push('vercel.json: CSS/JS still share immutable asset cache rule');

if(errors.length){console.error('\nREGRESSION CHECK FAILED');errors.forEach(e=>console.error(' -',e));process.exit(1)}
console.log(`Regression check OK: ${htmlFiles.length} HTML files scanned.`);
