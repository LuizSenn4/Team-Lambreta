(() => {
  'use strict';
  if (window.TeamProfileV118) return;
  window.TeamProfileV118 = true;

  const root = document.getElementById('profileRoot');
  const sb = window.teamSupabase;
  if (!root || !sb) return;

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl = v => { try { const u = new URL(String(v || '').trim(), location.href); return ['http:','https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
  const q = (s,r=document) => r.querySelector(s);
  const qa = (s,r=document) => [...r.querySelectorAll(s)];

  const icons = {
    game:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8h8a5 5 0 0 1 4.7 6.7l-1 2.8a2.2 2.2 0 0 1-3.7.8L14.5 17h-5L8 18.3a2.2 2.2 0 0 1-3.7-.8l-1-2.8A5 5 0 0 1 8 8Z"/><path d="M7 12v4M5 14h4M16 12h.01M18 15h.01"/></svg>',
    network:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="2.4"/><circle cx="17" cy="5" r="2.4"/><circle cx="18" cy="18" r="2.4"/><path d="m8.2 10.8 6.6-4.5M8.3 13.1l7.3 3.7"/></svg>',
    profile:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    actions:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>',
    friend:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 6a3 3 0 0 1 0 6M17 15a5 5 0 0 1 4 5"/></svg>',
    message:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14a4 4 0 0 1-4 4H9l-5 3V7a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4Z"/><path d="M8 9h8M8 13h5"/></svg>',
    report:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4m0 1h11l-2 4 2 4H5"/></svg>',
    block:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/></svg>',
    edit:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4-1 10-10-3-3L5 16l-1 4Z"/></svg>',
    discord:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7a14 14 0 0 1 8 0l2 3 1 7a15 15 0 0 1-4 2l-1-2a9 9 0 0 1-4 0l-1 2a15 15 0 0 1-4-2l1-7 2-3Z"/><circle cx="9.5" cy="12.5" r="1"/><circle cx="14.5" cy="12.5" r="1"/></svg>',
    tiktok:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4c.4 2.3 1.8 3.7 4 4v3c-1.6 0-2.9-.4-4-1.2v5.7A5.5 5.5 0 1 1 10 10v3.1a2.5 2.5 0 1 0 2 2.4V4z"/></svg>',
    youtube:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12s0-4-1-5-3-1-8-1-7 0-8 1-1 5 0 10c1 1 8 1 8 1s7 0 8-1c1-1 1-5 1-5Z"/><path d="m10 9 5 3-5 3Z"/></svg>',
    twitch:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h16v11l-5 5h-4l-3 3v-3H4V6Z"/><path d="M12 8v4M16 8v4"/></svg>'
  };

  const covers = {
    cover_gold:'assets/profile-covers/cover-gold.png', cover_green_black:'assets/profile-covers/cover-green-black.png',
    cover_neon:'assets/profile-covers/cover-neon.png', cover_lambretta_classic:'assets/profile-covers/cover-lambretta-classic.png',
    cover_competitive:'assets/profile-covers/cover-competitive.png', cover_cyber_gamer:'assets/profile-covers/cover-cyber-gamer.png', cover_minimal:'assets/profile-covers/cover-minimal.png'
  };
  const steam = {'counter-strike-2':'730','grand-theft-auto-v':'271590','dota-2':'570','apex-legends':'1172470','dead-by-daylight':'381210','marvel-rivals':'2767030','path-of-exile-2':'2694490','rust':'252490','rocket-league':'252950','pubg-battlegrounds':'578080','the-finals':'2073850','destiny-2':'1085660','warframe':'230410','elden-ring':'1245620','cyberpunk-2077':'1091500','red-dead-redemption-2':'1174180','street-fighter-6':'1364780','tekken-8':'1778820','dayz':'221100','terraria':'105600','stardew-valley':'413150','the-sims-4':'1222670','no-mans-sky':'275850','sea-of-thieves':'1172620','helldivers-2':'553850','war-thunder':'236390','fall-guys':'1097150','among-us':'945360','phasmophobia':'739630','lethal-company':'1966720','content-warning':'2881650','garrys-mod':'4000','geometry-dash':'322170','old-school-runescape':'1343370','albion-online':'761890','smite-2':'2437170','delta-force':'2507950','trackmania':'2225070','path-of-exile':'238960','balatro':'2379780','halo-infinite':'1240440'};
  const official = {minecraft:'https://www.minecraft.net/content/dam/minecraftnet/games/minecraft/key-art/Minecraft_KeyArt_2024.jpg',fortnite:'https://cdn2.unrealengine.com/fortnite-og-image-1920x1080-5e359e3cc6f7.jpg'};
  const localCover = slug => `assets/game-covers/${encodeURIComponent(slug)}.webp`;
  const remoteCover = slug => official[slug] || (steam[slug] ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${steam[slug]}/header.jpg` : '');

  const avatarUrl = p => window.TeamProfiles?.getAvatarUrl?.(p) || p?.avatar_display_url || p?.avatar_external_url || p?.custom_avatar_url || p?.avatar_url || '';
  const initials = p => String(p?.display_name || p?.game_nickname || p?.full_name || 'TL').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
  const presence = p => window.TeamPresence?.resolve?.(p) || 'offline';
  const presenceLabel = s => ({online:'ONLINE',busy:'OCUPADO',away:'AUSENTE',offline:'OFFLINE'}[s] || 'OFFLINE');
  const roleRows = p => (window.TeamPermissions?.getVisualRoles?.(p) || []).slice(0,3);

  function avatar(p){ const src=avatarUrl(p); return src ? `<img src="${esc(src)}" alt="" decoding="async">` : `<span>${esc(initials(p))}</span>`; }
  function roles(p){ const rows=roleRows(p); if(!rows.length) return '<span class="tl118-role"><i>◆</i><b>MEMBRO</b></span>'; return rows.map(r=>`<span class="tl118-role" style="--role:${esc(r.color||'#6b8191')}"><i>◆</i><b>${esc(r.key==='developer'?'DEV':(r.label||r.key||'MEMBRO'))}</b></span>`).join(''); }

  function socialItems(p){
    const out = new Map([['discord',{label:'Discord',value:String(p.discord||''),url:''}],['tiktok',{label:'TikTok',value:'',url:''}],['youtube',{label:'YouTube',value:'',url:''}],['twitch',{label:'Twitch',value:'',url:''}]]);
    const raw=p?.social_links; const rows=Array.isArray(raw)?raw:(raw&&typeof raw==='object'?Object.entries(raw).map(([type,v])=>typeof v==='object'?{type,...v}:{type,url:v}):[]);
    rows.forEach(row=>{ const type=String(row?.type||row?.platform||'').toLowerCase().replace(/[^a-z]/g,''); if(!out.has(type))return; const item=out.get(type); item.url=safeUrl(row.url||row.href||''); item.value=String(row.handle||row.username||'').trim(); });
    return [...out.entries()].map(([type,item])=>({type,...item}));
  }

  async function relationFor(viewer,user){
    if(viewer===user)return {state:'self'};
    const pair=`and(requester_id.eq.${viewer},addressee_id.eq.${user}),and(requester_id.eq.${user},addressee_id.eq.${viewer})`;
    const [rel,blocks]=await Promise.all([
      sb.from('buddy_relations').select('*').or(pair).maybeSingle(),
      sb.from('user_blocks').select('*').or(`and(blocker_id.eq.${viewer},blocked_id.eq.${user}),and(blocker_id.eq.${user},blocked_id.eq.${viewer})`)
    ]);
    if(rel.error) throw rel.error; if(blocks.error) throw blocks.error;
    const mine=(blocks.data||[]).some(x=>x.blocker_id===viewer); const theirs=(blocks.data||[]).some(x=>x.blocker_id===user);
    if(mine)return {state:'blocked',relation:rel.data}; if(theirs)return {state:'blocked-by',relation:rel.data};
    if(rel.data?.status==='accepted')return {state:'buddy',relation:rel.data};
    if(rel.data?.status==='pending'&&rel.data.requester_id===viewer)return {state:'sent',relation:rel.data};
    if(rel.data?.status==='pending')return {state:'received',relation:rel.data};
    return {state:'none',relation:rel.data};
  }

  function gameCards(p,catalog){
    const map=new Map((catalog?.games||[]).map(g=>[g.slug,g]));
    const chosen=(Array.isArray(p.games)&&p.games.length?p.games:[p.main_game].filter(Boolean)).slice(0,4);
    const rows=chosen.map(slug=>{const g=map.get(slug)||{slug,name:String(slug||'Jogo').replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}; const remote=remoteCover(slug); return `<article class="tl118-game"><div class="tl118-game-media"><img data-cover-stage="0" data-cover-remote="${esc(remote)}" src="${esc(localCover(slug))}" alt="Capa de ${esc(g.name)}" loading="lazy" decoding="async"><span>${esc(g.short_name||g.name||slug)}</span></div><b>${esc(g.name||slug)}</b></article>`;});
    while(rows.length<4)rows.push('<article class="tl118-game is-empty"><div class="tl118-game-media"><span>—</span></div><b>Sem jogo</b></article>');
    return rows.join('');
  }

  function bindCovers(){
    qa('.tl118-game img',root).forEach(img=>img.addEventListener('error',()=>{
      const stage=Number(img.dataset.coverStage||0); const remote=img.dataset.coverRemote||'';
      if(stage===0&&remote){img.dataset.coverStage='1';img.src=remote;return;}
      img.dataset.coverStage='2';img.remove();
    }));
  }

  function infoSection(p,stats,own){
    const c=window.TeamCountryCatalog?.resolve?.(p.country); const country=c?`${c.flag||''} ${c.name}`.trim():(p.country||'—');
    const since=stats?.memberSince?new Date(stats.memberSince).toLocaleDateString('pt-PT'):(p.created_at?new Date(p.created_at).toLocaleDateString('pt-PT'):'—');
    return `<div class="tl118-info-grid"><article><small>País</small><strong>${esc(country)}</strong></article><article><small>Nickname gamer</small><strong>${esc(p.game_nickname_public||p.game_nickname||'—')}</strong></article><article><small>Membro desde</small><strong>${esc(since)}</strong></article><article><small>Tópicos</small><strong>${Number(stats?.topics||0)}</strong></article><article><small>Respostas</small><strong>${Number(stats?.replies||0)}</strong></article><article><small>Nível</small><strong>${Number(stats?.level||0)}</strong></article></div>${own?`<a class="tl118-edit" href="profile-edit.html">${icons.edit}<span>Editar perfil</span></a>`:''}`;
  }

  function socialSection(p){return `<div class="tl118-social-grid">${socialItems(p).map(item=>{const value=item.value||item.url||'Não informado'; const content=`<span class="tl118-social-icon">${icons[item.type]||icons.network}</span><span><strong>${esc(item.label)}</strong><small>${esc(value)}</small></span>`; return item.url?`<a class="tl118-social" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${content}</a>`:`<article class="tl118-social is-empty">${content}</article>`;}).join('')}</div>`;}

  function actionsSection(rel,userId){
    if(rel.state==='blocked-by') return '<p class="tl118-muted">Este perfil não está disponível para interação.</p>';
    if(rel.state==='blocked') return `<div class="tl118-actions"><button data-action="unblock">${icons.block}<span>Desbloquear</span></button></div>`;
    const report=`<button data-action="report">${icons.report}<span>Denunciar</span></button>`; const block=`<button class="is-danger" data-action="block">${icons.block}<span>Bloquear</span></button>`;
    if(rel.state==='buddy')return `<div class="tl118-actions"><a class="is-primary" href="buddy.html?user=${encodeURIComponent(userId)}">${icons.message}<span>Mensagem</span></a><button data-action="unfriend">${icons.friend}<span>Desfazer amizade</span></button>${report}${block}</div>`;
    if(rel.state==='received')return `<div class="tl118-actions"><button class="is-primary" data-action="accept">${icons.friend}<span>Aceitar amizade</span></button><button data-action="reject">${icons.friend}<span>Recusar</span></button>${report}${block}</div>`;
    const friend=rel.state==='sent'?`<button disabled>${icons.friend}<span>Pedido enviado</span></button>`:`<button class="is-primary" data-action="add">${icons.friend}<span>Adicionar amigo</span></button>`;
    return `<div class="tl118-actions">${friend}<a href="buddy.html?user=${encodeURIComponent(userId)}&request=1">${icons.message}<span>Enviar mensagem</span></a>${report}${block}</div>`;
  }

  function modal(title,body,actions=''){ let host=q('#tl118Modal'); if(!host){host=document.createElement('div');host.id='tl118Modal';host.className='tl118-modal';document.body.appendChild(host);} host.innerHTML=`<section role="dialog" aria-modal="true"><header><h2>${esc(title)}</h2><button type="button" data-close aria-label="Fechar">×</button></header>${body}<footer>${actions}</footer></section>`; host.hidden=false; q('[data-close]',host)?.addEventListener('click',()=>host.hidden=true); host.addEventListener('click',e=>{if(e.target===host)host.hidden=true},{once:true}); return host; }
  function toast(text,type='ok'){window.TeamNotifications?.show?.(text,{type:type==='error'?'error':'success'});}

  async function bindActions(friendService,rel,userId,refresh){
    const act=async(name)=>{
      try{
        if(name==='add')await friendService.request(userId);
        if(name==='accept')await friendService.respond(rel.relation.id,true);
        if(name==='reject')await friendService.respond(rel.relation.id,false);
        if(name==='unfriend'){
          const pair=`and(requester_id.eq.${friendService.userId},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${friendService.userId})`;
          const r=await sb.from('buddy_relations').delete().or(pair); if(r.error)throw r.error;
        }
        if(name==='block'){
          await friendService.block(userId);
          const pair=`and(requester_id.eq.${friendService.userId},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${friendService.userId})`;
          await sb.from('buddy_relations').delete().or(pair);
        }
        if(name==='unblock')await friendService.unblock(userId);
        toast(name==='add'?'Pedido de amizade enviado.':name==='accept'?'Amizade aceita.':name==='reject'?'Pedido recusado.':name==='unfriend'?'Amizade desfeita.':name==='block'?'Utilizador bloqueado.':'Utilizador desbloqueado.');
        await refresh();
      }catch(e){console.error('[Profile V118 action]',e);toast(e?.message||'Não foi possível concluir a ação.','error');}
    };
    qa('[data-action]',root).forEach(button=>button.addEventListener('click',()=>{
      const name=button.dataset.action;
      if(name==='report'){
        const host=modal('Denunciar perfil','<label class="tl118-report"><span>Motivo</span><select><option value="spam">Spam</option><option value="harassment">Assédio</option><option value="impersonation">Falsidade de identidade</option><option value="inappropriate">Conteúdo impróprio</option><option value="other">Outro</option></select><span>Detalhes</span><textarea maxlength="1000" rows="4" placeholder="Descreve o problema…"></textarea></label>','<button type="button" data-send-report>Enviar denúncia</button>');
        q('[data-send-report]',host)?.addEventListener('click',async()=>{try{await friendService.report(userId,q('select',host).value,q('textarea',host).value);host.hidden=true;toast('Denúncia enviada.');}catch(e){toast(e?.message||'Falha ao denunciar.','error');}}); return;
      }
      const dangerous=['unfriend','block'].includes(name); if(dangerous){const host=modal(name==='block'?'Bloquear utilizador':'Desfazer amizade',`<p>${name==='block'?'Este utilizador deixará de poder interagir contigo.':'Tens a certeza que queres desfazer esta amizade?'}</p>`,`<button type="button" data-confirm>Confirmar</button>`);q('[data-confirm]',host)?.addEventListener('click',()=>{host.hidden=true;void act(name)});return;}
      void act(name);
    }));
  }

  function bindTabs(){ qa('[data-tab]',root).forEach(button=>button.addEventListener('click',()=>{qa('[data-tab]',root).forEach(x=>x.classList.toggle('is-active',x===button));qa('[data-panel]',root).forEach(x=>x.hidden=x.dataset.panel!==button.dataset.tab);})); }

  async function renderAll(){
    const session=await window.TeamAuth?.getSession?.();
    if(!session?.user){root.innerHTML='<section class="tl118-state"><h1>Perfil Team Lambreta</h1><p>Inicia sessão para veres os perfis.</p><button data-login>Entrar com Google</button></section>';q('[data-login]',root)?.addEventListener('click',()=>window.TeamAuth?.signInWithGoogle?.());return;}
    const userId=new URLSearchParams(location.search).get('user')||session.user.id; const own=userId===session.user.id;
    const friendService=new window.TeamBuddyFriendsService(sb,session.user.id);
    const [p,stats,catalog,rel]=await Promise.all([window.TeamProfiles.getPublicProfile(userId,{fresh:true}),window.TeamProfiles.getProfileStats(userId),window.TeamProfiles.getCatalog(),relationFor(session.user.id,userId)]);
    if(!p)throw new Error('Perfil não encontrado.');
    const st=presence(p); const cover=covers[p.cover_preset]||covers.cover_cyber_gamer; const bio=p.bio||p.public_bio||'Fé, foco e muita força. Unidos somos imbatíveis.';
    const tabs=[['games',icons.game,'JOGOS','Mais jogados'],['social',icons.network,'REDES','Sociais'],['profile',icons.profile,'PERFIL','Informações']]; if(!own)tabs.push(['actions',icons.actions,'AÇÕES','Interagir']);
    root.innerHTML=`<section class="tl118-hero" style="--cover:url('${esc(cover)}')"><div class="tl118-avatar">${avatar(p)}<i class="is-${esc(st)}"></i></div><div class="tl118-identity"><div class="tl118-title"><h1>${esc(p.display_name||p.game_nickname||'Membro Lambreta')}</h1></div><div class="tl118-presence is-${esc(st)}"><i></i>${esc(presenceLabel(st))}</div><div class="tl118-roles">${roles(p)}</div><p>${esc(bio)}</p></div><img class="tl118-crest" src="img/brasao-96.webp" alt=""></section><section class="tl118-card"><nav class="tl118-tabs ${own?'is-own':'is-public'}">${tabs.map((t,i)=>`<button type="button" data-tab="${t[0]}" class="${i===0?'is-active':''}">${t[1]}<span><strong>${t[2]}</strong><small>${t[3]}</small></span></button>`).join('')}</nav><div class="tl118-panels"><section data-panel="games"><h2>${icons.game} JOGOS MAIS JOGADOS</h2><div class="tl118-games">${gameCards(p,catalog)}</div></section><section data-panel="social" hidden><h2>${icons.network} REDES SOCIAIS</h2>${socialSection(p)}</section><section data-panel="profile" hidden><h2>${icons.profile} INFORMAÇÕES</h2>${infoSection(p,stats,own)}</section>${own?'':`<section data-panel="actions" hidden><h2>${icons.actions} AÇÕES</h2>${actionsSection(rel,userId)}</section>`}</div></section>`;
    bindTabs();bindCovers();if(!own)await bindActions(friendService,rel,userId,renderAll);
  }

  const boot=()=>renderAll().catch(e=>{console.error('[Profile V118]',e);root.innerHTML=`<section class="tl118-state"><h1>Perfil indisponível</h1><p>${esc(e?.message||'Não foi possível carregar o perfil.')}</p></section>`;});
  window.addEventListener('tl:presence-peers',()=>{const dot=q('.tl118-presence',root);if(!dot)return;void (async()=>{try{const session=await window.TeamAuth?.getSession?.();const id=new URLSearchParams(location.search).get('user')||session?.user?.id;if(!id)return;const {data}=await sb.from('profiles').select('presence,last_seen').eq('id',id).maybeSingle();const st=presence(data||{});dot.className=`tl118-presence is-${st}`;dot.innerHTML=`<i></i>${presenceLabel(st)}`;}catch{}})();});
  void boot();
})();