(()=>{'use strict';
if(!window.supabase)return;
const URL='https://ahiatqnokyhfpailobjx.supabase.co',KEY='sb_publishable_qgwMhZPrB_3cFv3yCMcToA_9nDvHz-O';
const sb=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
let uid=null,timer=null,lastStatus='';
async function send(status){if(!uid)return;const now=new Date().toISOString();lastStatus=status;await sb.from('profiles').update({presence:status,last_seen_at:now}).eq('id',uid)}
function desired(){const stored=localStorage.getItem('tl_presence_mode');if(stored==='busy'||stored==='ocupado')return 'busy';return document.hidden?'away':'online'}
async function tick(){await send(desired())}
async function init(){const {data}=await sb.auth.getSession();uid=data.session?.user?.id;if(!uid)return;await tick();timer=setInterval(tick,45000);document.addEventListener('visibilitychange',tick);window.addEventListener('focus',tick);window.addEventListener('online',tick)}
window.TeamBuddyPresence={setMode:async mode=>{localStorage.setItem('tl_presence_mode',mode);await send(mode==='busy'||mode==='ocupado'?'busy':'online')},getMode:()=>lastStatus||desired()};
init();
})();
