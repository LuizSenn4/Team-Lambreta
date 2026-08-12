(() => {
  'use strict';
  const URL='https://ahiatqnokyhfpailobjx.supabase.co';
  const KEY='sb_publishable_qgwMhZPrB_3cFv3yCMcToA_9nDvHz-O';
  const sb=window.teamSupabase || window.supabase?.createClient(URL,KEY);
  if(!sb) return;

  let session=null;
  let lastInteraction=Date.now();
  let livePlaying=false;
  let pendingActive=0,pendingAfk=0,pendingLive=0;
  let flushing=false;
  const AFK_AFTER=2*60*1000;

  const touch=()=>{lastInteraction=Date.now()};
  ['pointerdown','keydown','touchstart','scroll','wheel'].forEach(type=>window.addEventListener(type,touch,{passive:true,capture:true}));
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden) touch(); });

  async function getSession(){
    if(session) return session;
    const r=await sb.auth.getSession(); session=r.data.session||null; return session;
  }

  async function forumProgress(type,metadata={}){
    if(!await getSession()) return null;
    const key=metadata?.dedupe_key||null;
    const clean={...(metadata||{})};delete clean.dedupe_key;
    const data=await record(type,1,key,clean);
    if(data) console.info('[TL Progress] contabilizado',type,data);
    return data;
  }

  async function record(type,amount=1,key=null,metadata={}){
    if(!await getSession()) return null;
    try{
      let {data,error}=await sb.rpc('tl_record_progress_v2',{p_event_type:type,p_amount:amount,p_dedupe_key:key,p_metadata:metadata});
      if(error && /Could not find the function|PGRST202|schema cache/i.test(String(error.message||''))){
        ({data,error}=await sb.rpc('tl_record_progress',{p_event_type:type,p_amount:amount,p_dedupe_key:key,p_metadata:metadata}));
      }
      if(error) throw error;
      window.dispatchEvent(new CustomEvent('tl:progress',{detail:data}));
      return data;
    }catch(err){ console.warn('[TL Progress]',type,err?.message||err); return null; }
  }

  async function thank(targetUserId,topicKey){
    if(!targetUserId||!await getSession()) return false;
    try{
      const {data,error}=await sb.rpc('give_community_forum_thank_v2',{
        p_target:targetUserId,
        p_topic_key:String(topicKey||'')
      });
      if(error) throw error;
      console.info('[TL Progress] like contabilizado',data);
      if(data) window.dispatchEvent(new CustomEvent('tl:progress',{detail:{type:'forum_thank',targetUserId}}));
      return !!data;
    }catch(err){
      console.error('[TL Progress] RPC give_community_forum_thank_v2 falhou:',err?.message||err);
      return false;
    }
  }

  async function flush(){
    if(flushing||!await getSession()) return; flushing=true;
    const a=pendingActive,f=pendingAfk,l=pendingLive; pendingActive=pendingAfk=pendingLive=0;
    try{
      if(a) await record('active_seconds',a);
      if(f) await record('afk_seconds',f);
      if(l) await record('live_seconds',l);
    }finally{flushing=false;}
  }

  setInterval(()=>{
    if(document.hidden) return;
    const active=(Date.now()-lastInteraction)<AFK_AFTER;
    if(active){ pendingActive+=30; if(livePlaying) pendingLive+=30; }
    else pendingAfk+=30;
    if(pendingActive+pendingAfk+pendingLive>=60) flush();
  },30000);
  window.addEventListener('pagehide',flush);

  document.addEventListener('click',event=>{
    const btn=event.target.closest('[data-tl-event-key]');
    if(!btn) return;
    const key=decodeURIComponent(btn.dataset.tlEventKey||'event');
    btn.disabled=true;
    record('event_participation',1,`event:${key}`,{event:key}).then(data=>{
      btn.textContent=data?'PRESENÇA REGISTADA':'ENTRA PARA REGISTAR';
      if(!data) btn.disabled=false;
    });
  });

  window.TeamProgress={
    record,
    event:(type,key=null,metadata={})=>{
      if(type==='forum_topic'||type==='forum_reply') return forumProgress(type,{...metadata,dedupe_key:key});
      return record(type,1,key,metadata);
    },
    thank,
    setLiveActive(value){livePlaying=!!value; if(livePlaying) touch();},
    touch,
    flush,
    get client(){return sb;}
  };
})();
