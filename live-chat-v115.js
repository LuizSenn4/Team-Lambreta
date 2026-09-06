(() => {
  'use strict';
  if (window.TeamLiveChat) return;
  const sb=window.teamSupabase, box=document.getElementById('chatMessages'), form=document.getElementById('chatForm'), input=document.getElementById('chatInput');
  const mentionBox=document.getElementById('chatMentionSuggestions'), mentionBadge=document.getElementById('chatMentionBadge'), panel=document.getElementById('moderationPanel'), panelTarget=document.getElementById('moderationTarget'), info=document.getElementById('chatModerationInfo');
  if(!sb||!box||!form||!input)return;
  const room=String(window.TL_CHAT_ROOM||document.body.dataset.chatRoom||'lobby').trim().toLowerCase().replace(/[^a-z0-9:_-]/g,'').slice(0,120)||'lobby';
  window.TeamLambretaChatRoom=room;
  let session=null,profile=null,channel=null,rows=[],mentionProfiles=[],selectedTargetId=null,sendTimes=[],unsubscribeAuth=null,destroyed=false,generation=0;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=r=>window.TeamPermissions?.normalizeRole?.(r)||String(r||'member').toLowerCase();
  const roleLabel=r=>window.TeamPermissions?.roleLabel?.(r)||'MEMBRO';
  const can=p=>window.TeamPermissions?.canForRole?.(profile?.role,p)||false;
  const canMod=()=>can('chat.moderate'),canAdmin=()=>can('admin.full');
  const nameOf=p=>p?.game_nickname||p?.full_name||'Membro';
  const avatar=p=>window.TeamProfiles?.getAvatarUrl?.(p)||p?.avatar_url||'';
  const isStreamer=p=>p?.is_streamer===true||String(p?.is_streamer).toLowerCase()==='true';
  const isVip=p=>Boolean(p?.vip_until&&new Date(p.vip_until).getTime()>Date.now());
  const nearBottom=()=>box.scrollHeight-box.scrollTop-box.clientHeight<120;
  const formatMessage=t=>esc(t).replace(/(^|\s)@([A-Za-z0-9_.-]{2,32})/g,'$1<span class="tl-chat-mention">@$2</span>');

  function markup(row){
    const p=row.profiles||{},name=nameOf(p),role=norm(p.role),mine=session?.user?.id===row.user_id,src=avatar(p);
    const badges=`${isStreamer(p)?'<small class="streamer-badge">STREAMER</small>':''}${isVip(p)?'<small class="vip-badge">VIP</small>':''}`;
    const actions=session?`<div class="tl-chat-actions"><button type="button" data-chat-action="reply">Responder</button>${mine||canMod()?'<button type="button" data-chat-action="delete">Apagar</button>':''}${!mine?'<button type="button" data-chat-action="report">Denunciar</button><button type="button" data-chat-action="block">Bloquear</button>':''}${canMod()&&!mine?'<button type="button" data-chat-action="moderate">Moderar</button>':''}</div>`:'';
    return `<article class="chat-message role-${esc(role)}" data-message-id="${esc(row.id)}" data-user-id="${esc(row.user_id)}" data-nickname="${esc(name)}"><div class="chat-avatar">${src?`<img src="${esc(src)}" alt="">`:`<span>${esc(name.slice(0,2).toUpperCase())}</span>`}</div><div class="chat-message-main"><div class="chat-message-head"><strong>${esc(name)}</strong><small>${esc(roleLabel(role))}</small>${badges}<time>${new Date(row.created_at).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})}</time></div><p>${formatMessage(row.message)}</p>${actions}</div></article>`;
  }

  const mentionKey=()=>`tl_mentions_read_${session?.user?.id||'guest'}`;
  const readMentionIds=()=>{try{return new Set(JSON.parse(localStorage.getItem(mentionKey())||'[]').map(String))}catch{return new Set()}};
  const saveMentionIds=ids=>{try{localStorage.setItem(mentionKey(),JSON.stringify([...ids].slice(-200)))}catch{}};
  const currentNick=()=>String(profile?.game_nickname||profile?.display_name||'').trim();
  function mentionsMe(row){const nick=currentNick();if(!nick||row.user_id===session?.user?.id)return false;const safe=nick.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp(`(^|\\s)@${safe}(?=\\s|$|[.,!?;:])`,'i').test(String(row.message||''))}
  function paintMentionBadge(){if(!mentionBadge)return;const ids=readMentionIds(),unread=rows.filter(mentionsMe).filter(r=>!ids.has(String(r.id)));mentionBadge.hidden=!unread.length;mentionBadge.classList.toggle('is-visible',!!unread.length);mentionBadge.textContent=unread.length?`@ ${unread.length}`:''}

  async function load({follow=false}={}){
    const version=++generation;
    if(!session?.user){rows=[];box.innerHTML='<div class="sb-login-required">Entra com Google para ver e escrever no chat.</div>';return}
    const stick=follow||nearBottom()||!rows.length;
    const {data,error}=await sb.from('chat_messages').select('id,message,created_at,user_id,profiles!chat_messages_user_id_fkey(full_name,game_nickname,role,presence,last_seen,avatar_url,donation_total,vip_until,is_streamer)').eq('is_deleted',false).eq('room',room).order('created_at',{ascending:false}).limit(30);
    if(destroyed||version!==generation)return;
    if(error){box.innerHTML=`<p>${esc(error.message)}</p>`;return}
    rows=[...(data||[])].reverse();box.innerHTML=rows.length?rows.map(markup).join(''):'<div class="empty-chat">Ainda não há mensagens nesta live.</div>';paintMentionBadge();if(stick)box.scrollTop=box.scrollHeight;
  }

  async function loadMentions(){if(!session?.user)return;const {data}=await sb.from('profiles').select('id,game_nickname,full_name,role').not('game_nickname','is',null).order('game_nickname').limit(100);mentionProfiles=(data||[]).filter(p=>p.game_nickname)}
  function token(){const caret=input.selectionStart??input.value.length,before=input.value.slice(0,caret),m=before.match(/(?:^|\s)@([A-Za-z0-9_.-]*)$/);return m?{query:m[1],start:caret-m[1].length-1,end:caret}:null}
  function closeMentions(){if(mentionBox){mentionBox.hidden=true;mentionBox.innerHTML=''}}
  async function paintMentions(){if(!mentionBox)return;const t=token();if(!t)return closeMentions();if(!mentionProfiles.length)await loadMentions();const q=t.query.toLowerCase(),matches=mentionProfiles.filter(p=>`${p.game_nickname} ${p.full_name||''}`.toLowerCase().includes(q)).slice(0,12);if(!matches.length)return closeMentions();mentionBox.innerHTML=matches.map(p=>`<button type="button" data-mention="${esc(p.game_nickname)}"><strong>@${esc(p.game_nickname)}</strong><small>${esc(roleLabel(p.role))}</small></button>`).join('');mentionBox.hidden=false}

  function cleanText(v){const text=String(v||'').normalize('NFKC').trim();if(!text||/(.)\1{12,}/u.test(text))return'';return text.slice(0,240)}
  function floodOk(){const now=Date.now();sendTimes=sendTimes.filter(t=>now-t<10000);if(sendTimes.length>=5)return false;sendTimes.push(now);return true}
  async function send(event){
    event.preventDefault();if(!session?.user||form.dataset.sending==='1')return;const clean=cleanText(input.value);if(!clean)return;if(!floodOk()){if(info)info.textContent='Aguarda alguns segundos antes de enviar novamente.';return}
    form.dataset.sending='1';const submit=form.querySelector('button[type="submit"]');if(submit)submit.disabled=true;
    let message=clean,translation=null;const target=window.TLChatTranslateTarget?.()||'';
    if(target){try{const result=await sb.functions.invoke('translate-message',{body:{text:clean,target}});if(!result.error&&result.data?.translatedText)translation=result.data}catch{}}
    if(translation?.translatedText)message=translation.translatedText;
    let payload={user_id:session.user.id,message,room};if(translation)payload={...payload,original_message:clean,translated_message:message,source_language:translation.detectedSourceLanguage||null,target_language:target};
    let {error}=await sb.from('chat_messages').insert(payload);if(error&&translation)({error}=await sb.from('chat_messages').insert({user_id:session.user.id,message,room}));
    if(!error){input.value='';closeMentions();await load({follow:true})}else if(info)info.textContent=error.message;
    form.dataset.sending='0';if(submit)submit.disabled=false;
  }

  async function deleteMessage(article){if(!confirm('Apagar esta mensagem?'))return;const {error}=await sb.rpc('moderate_chat_message',{target_message_id:Number(article.dataset.messageId)});if(error)alert(error.message);else await load()}
  async function blockUser(article){if(!confirm(`Bloquear @${article.dataset.nickname||'utilizador'}?`))return;const {error}=await sb.rpc('block_chat_user',{target_user_id:article.dataset.userId});if(error)alert(error.message);else await load()}
  async function report(article){const reason=prompt('Motivo da denúncia:');if(!reason?.trim())return;const details=prompt('Detalhes adicionais (opcional):')||null;const {error}=await sb.rpc('report_and_block_chat_message',{target_message_id:Number(article.dataset.messageId),report_reason:reason.trim(),report_details:details?.trim()||null});if(error)alert(error.message);else{if(info)info.textContent='Denúncia enviada.';await load()}}
  function reply(article){const nick=article.dataset.nickname;if(!nick)return;input.value=`${input.value.trimEnd()}${input.value.trim()?' ':''}@${nick} `;input.focus()}
  function openMod(article){if(!panel||!canMod())return;selectedTargetId=article.dataset.userId||null;if(panelTarget)panelTarget.textContent=`@${article.dataset.nickname||'utilizador'}`;panel.classList.add('show')}
  async function applyModeration(action){if(action==='close'){panel?.classList.remove('show');return}if(!selectedTargetId||!canMod())return;if(action==='ban'||action==='unban'){const {error}=await sb.rpc('set_chat_ban',{target_user_id:selectedTargetId,banned:action==='ban'});if(error)alert(error.message);else{if(info)info.textContent=action==='ban'?'Usuário bloqueado permanentemente.':'Bloqueio permanente removido.';panel?.classList.remove('show')}return}const minutes=action==='block-1'?1:action==='block-5'?5:action==='block-15'?15:0;if(!['block-1','block-5','block-15','unblock'].includes(action))return;const {error}=await sb.rpc('moderate_user',{target_user_id:selectedTargetId,mute_minutes:minutes});if(error)alert(error.message);else{if(info)info.textContent=minutes?`Usuário silenciado por ${minutes} min.`:'Silêncio removido.';panel?.classList.remove('show')}}
  async function setIdentity(identity){if(!selectedTargetId||!canAdmin())return;const value=identity==='user'?'member':identity;if(!['member','supporter','vip','staff','moderator','admin','streamer'].includes(value))return;const {error}=await sb.rpc('set_profile_identity',{target_user_id:selectedTargetId,new_identity:value});if(error)alert(error.message);else{panel?.classList.remove('show');await load()}}
  function paintPanel(){if(!panel)return;panel.querySelectorAll('[data-mod-action]').forEach(b=>{b.hidden=b.dataset.modAction!=='close'&&!canMod()});panel.querySelectorAll('[data-role-set],[data-badge-set]').forEach(b=>{b.hidden=!canAdmin()})}

  async function connect(next){session=next||null;profile=session?.user?await window.TeamProfiles?.getCurrentProfile?.({fresh:false})||null:null;mentionProfiles=[];paintPanel();if(channel){await sb.removeChannel(channel);channel=null}if(!session?.user){await load();return}await load({follow:true});channel=sb.channel(`tl-live-chat-${room}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_messages',filter:`room=eq.${room}`},()=>load({follow:true})).on('postgres_changes',{event:'UPDATE',schema:'public',table:'chat_messages',filter:`room=eq.${room}`},()=>load()).subscribe()}

  form.addEventListener('submit',send);input.addEventListener('input',paintMentions);input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!document.getElementById('enterBreakToggle')?.checked){e.preventDefault();form.requestSubmit()}});
  mentionBox?.addEventListener('click',e=>{const b=e.target.closest('[data-mention]'),t=token();if(!b||!t)return;input.value=`${input.value.slice(0,t.start)}@${b.dataset.mention} ${input.value.slice(t.end)}`;input.focus();closeMentions()});
  mentionBadge?.addEventListener('click',()=>{const ids=readMentionIds(),target=rows.find(r=>mentionsMe(r)&&!ids.has(String(r.id)))||rows.find(mentionsMe);if(!target)return;document.querySelector(`[data-message-id="${CSS.escape(String(target.id))}"]`)?.scrollIntoView({behavior:'smooth',block:'center'});ids.add(String(target.id));saveMentionIds(ids);paintMentionBadge()});
  box.addEventListener('click',e=>{const b=e.target.closest('[data-chat-action]'),a=e.target.closest('[data-message-id]');if(!b||!a)return;const action=b.dataset.chatAction;if(action==='reply')reply(a);else if(action==='delete')void deleteMessage(a);else if(action==='report')void report(a);else if(action==='block')void blockUser(a);else if(action==='moderate')openMod(a)});
  panel?.addEventListener('click',e=>{const mod=e.target.closest('[data-mod-action]');if(mod)return void applyModeration(mod.dataset.modAction);const role=e.target.closest('[data-role-set]');if(role)return void setIdentity(role.dataset.roleSet);const badge=e.target.closest('[data-badge-set]');if(badge)return void setIdentity(badge.dataset.enabled==='true'?badge.dataset.badgeSet:'member')});

  unsubscribeAuth=window.TeamAuth?.subscribe?.(next=>void connect(next))||null;if(!unsubscribeAuth)void window.TeamAuth?.getSession?.().then(connect);
  function destroy(){destroyed=true;unsubscribeAuth?.();if(channel)sb.removeChannel(channel);channel=null}
  window.addEventListener('pagehide',destroy,{once:true});window.TeamLiveChat=Object.freeze({room,refresh:()=>load(),destroy});
})();