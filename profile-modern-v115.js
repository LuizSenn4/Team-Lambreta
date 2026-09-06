(() => {
  'use strict';
  if (window.TeamProfileV115) return;

  const root = document.getElementById('profileRoot');
  const sb = window.teamSupabase;
  if (!root || !sb) return;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl = value => { try { const u = new URL(String(value || '').trim(), location.href); return ['http:','https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };

  const covers = {
    cover_gold:'assets/profile-covers/cover-gold.png',
    cover_green_black:'assets/profile-covers/cover-green-black.png',
    cover_neon:'assets/profile-covers/cover-neon.png',
    cover_lambretta_classic:'assets/profile-covers/cover-lambreetta-classic.png',
    cover_competitive:'assets/profile-covers/cover-competitive.png',
    cover_cyber_gamer:'assets/profile-covers/cover-cyber-gamer.png',
    cover_minimal:'assets/profile-covers/cover-minimal.png'
  };

  const icons = {
    check:'<svg viewBox="0 0 24 24"><path d="m6.5 12.5 3.2 3.2 7.8-8"/></svg>',
    message:'<svg viewBox="0 0 24 24"><path d="M20 14a4 4 0 0 1-4 4H9l-5 3V7a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4Z"/><path d="M8 9h8M8 13h5"/></svg>',
    friends:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 6a3 3 0 0 1 0 6M17 15a5 5 0 0 1 4 5"/></svg>',
    game:'<svg viewBox="0 0 24 24"><path d="M8 8h8a5 5 0 0 1 4.7 6.7l-1 2.8a2.2 2.2 0 0 1-3.7.8L14.5 17h-5L8 18.3a2.2 2.2 0 0 1-3.7-.8l-1-2.8A5 5 0 0 1 8 8Z"/><path d="M7 12v4M5 14h4M16 12h.01M18 15h.01"/></svg>',
    network:'<svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="2.5"/><circle cx="17" cy="5" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 10.8 6.6-4.5M8.3 13.1l7.3 3.7"/></svg>',
    profile:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    copy:'<svg viewBox="0 0 24 24"><rect x="9" y="9" width="10" height="11" rx="2"/><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>',
    discord:'<svg viewBox="0 0 24 24"><path d="M8 7a14 14 0 0 1 8 0l2 3 1 7a15 15 0 0 1-4 2l-1-2a9 9 0 0 1-4 0l-1 2a15 15 0 0 1-4-2l1-7 2-3Z"/><circle cx="9.5" cy="12.5" r="1"/><circle cx="14.5" cy="12.5" r="1"/></svg>',
    tiktok:'<svg viewBox="0 0 24 24"><path d="M15 4c.4 2.3 1.8 3.7 4 4v3c-1.6 0-2.9-.4-4-1.2v5.7A5.5 5.5 0 1 1 10 10v3.1a2.5 2.5 0 1 0 2 2.4V4z"/></svg>',
    youtube:'<svg viewBox="0 0 24 24"><path d="M21 12s0-4-1-5-3-1-8-1-7 0-8 1-1 5 0 10c1 1 8 1 8 1s7 0 8-1c1-1 1-5 1-5z"/><path d="m10 9 5 3-5 3z"/></svg>',
    twitch:'<svg viewBox="0 0 24 24"><path d="M5 3h16v11l-5 5h-4l-3 3v-3H4V6zM8 6v9h3v2l2-2h4l2-2V6z"/><path d="M12 8v4M16 8v4"/></svg>'
  };

  const initials = name => String(name || 'TL').trim().split(/\s+/).slice(0,2).map(p => p[0] || '').join('').toUpperCase() || 'TL';
  const avatarUrl = p => window.TeamProfiles?.getAvatarUrl?.(p) || p?.avatar_display_url || p?.avatar_external_url || p?.custom_avatar_url || p?.avatar_url || '';
  const avatarMarkup = p => avatarUrl(p) ? `<img src="${esc(avatarUrl(p))}" alt="" loading="lazy" decoding="async">` : `<span class="tl-profile-avatar-fallback-v106">${esc(initials(p?.display_name || p?.full_name))}</span>`;
  const presence = p => window.TeamPresence?.resolve?.(p) || String(p?.presence || 'offline').toLowerCase();
  const presenceLabel = v => ({online:'ONLINE',busy:'OCUPADO',away:'AUSENTE',offline:'OFFLINE'}[v] || 'OFFLINE');

  function roles(profile) {
    const visual = window.TeamPermissions?.getVisualRoles?.(profile) || [];
    if (visual.length) return visual;
    const role = String(profile?.role || 'member').toLowerCase();
    const map = {
      developer:{key:'developer',label:'DEV',color:'#e157ff',icon:'⚡'},
      admin:{key:'admin',label:'ADMINISTRADOR',color:'#7b24ca',icon:'♛'},
      staff:{key:'staff',label:'STAFF',color:'#237dff',icon:'◆'},
      moderator:{key:'moderator',label:'MODERADOR',color:'#00c98f',icon:'◆'},
      member:{key:'member',label:'MEMBRO',color:'#4d6377',icon:'◆'}
    };
    return [map[role] || map.member];
  }

  function trustedRoleIcon(value) {
    const raw = String(value || '').trim();
    if (/^<svg\b[\s\S]*<\/svg>$/.test(raw)) return raw;
    return esc(raw || '◆');
  }

  function roleMarkup(profile) {
    return roles(profile).slice(0,3).map(role => `<span class="tl-profile-role-v106" style="--role-color:${esc(role.color || '#7b24ca')}"><span class="role-icon" aria-hidden="true">${trustedRoleIcon(role.icon)}</span><b>${esc(role.key === 'developer' ? 'DEV' : role.label || role.key)}</b></span>`).join('');
  }

  const verified = profile => roles(profile).some(r => ['developer','admin','administrator','staff','moderator'].includes(String(r.key || '').toLowerCase()));

  async function relationship(viewerId, userId) {
    if (viewerId === userId) return { state:'self', relation:null, request:null };
    const pairFilter = `and(requester_id.eq.${viewerId},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${viewerId})`;
    const blockFilter = `and(blocker_id.eq.${viewerId},blocked_id.eq.${userId}),and(blocker_id.eq.${userId},blocked_id.eq.${viewerId})`;
    const requestFilter = `and(sender_id.eq.${viewerId},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${viewerId})`;
    const [relationResult,blockResult,requestResult] = await Promise.all([
      sb.from('buddy_relations').select('*').or(pairFilter).maybeSingle(),
      sb.from('user_blocks').select('*').or(blockFilter).limit(1),
      sb.from('private_message_requests').select('*').or(requestFilter).maybeSingle()
    ]);
    if (blockResult.data?.length) return { state:'blocked', relation:null, request:null };
    const relation = relationResult.data || null;
    const request = requestResult.data || null;
    if (relation?.status === 'accepted') return { state:'buddy', relation, request };
    if (relation?.status === 'pending' && relation.requester_id === viewerId) return { state:'sent', relation, request };
    if (relation?.status === 'pending') return { state:'received', relation, request };
    return { state:'none', relation, request };
  }

  async function loadFriends(userId) {
    const [listResult,countResult] = await Promise.all([
      sb.rpc('tl_profile_public_friends',{p_user_id:userId,p_limit:4}),
      sb.rpc('tl_profile_public_friend_count',{p_user_id:userId})
    ]);
    if (listResult.error || countResult.error) return {list:[],total:0};
    return {list:listResult.data || [],total:Number(countResult.data || 0)};
  }

  function friendMarkup(friend) {
    const state = presence(friend);
    return `<a class="tl-profile-friend-v106" href="profile.html?user=${encodeURIComponent(friend.id)}"><span class="tl-profile-friend-avatar-v106"><span>${avatarMarkup(friend)}</span><i class="tl-profile-friend-status-v106 is-${esc(state)}"></i></span><span class="tl-profile-friend-name-v106">${esc(friend.display_name || 'Membro')}</span></a>`;
  }

  function gameMeta(slug, name) {
    const raw = `${slug || ''} ${name || ''}`.toLowerCase();
    if (/league|lol/.test(raw)) return ['is-league','L'];
    if (/fortnite/.test(raw)) return ['is-fortnite','F'];
    if (/grand|gta/.test(raw)) return ['is-gta','V'];
    const mark = String(name || slug || 'Jogo').trim().split(/\s+/).slice(0,2).map(w => w[0]).join('').toUpperCase();
    return ['', mark];
  }

  function gamesMarkup(profile, catalog, own) {
    const map = new Map((catalog?.games || []).map(g => [g.slug,g]));
    const chosen = Array.isArray(profile.games) && profile.games.length ? profile.games.slice(0,3) : [profile.main_game].filter(Boolean).slice(0,3);
    const cards = chosen.map(slug => {
      const item = map.get(slug) || {slug,name:String(slug || 'Jogo').replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase())};
      const [cls,mark] = gameMeta(item.slug,item.name);
      return `<article class="tl-profile-game-card-v106 ${cls}"><span class="game-mark">${esc(mark)}</span><span class="game-name">${esc(item.name)}</span></article>`;
    });
    while (cards.length < 3) cards.push('<article class="tl-profile-game-card-v106"><span class="game-mark">?</span><span class="game-name">Em breve</span></article>');
    cards.push(`<a class="tl-profile-game-card-v106 is-more" href="${own ? 'profile-edit.html' : '#profileInfo'}"><span class="game-mark">+</span><span class="game-name">Ver mais</span></a>`);
    return cards.join('');
  }

  function normalizeSocial(profile) {
    const allowed = ['discord','tiktok','youtube','twitch'];
    const labels = {discord:'Discord',tiktok:'TikTok',youtube:'YouTube',twitch:'Twitch'};
    const map = new Map(allowed.map(type => [type,{type,label:labels[type],url:'',value:''}]));
    if (profile?.discord) map.set('discord',{...map.get('discord'),value:String(profile.discord)});
    const raw = profile?.social_links;
    const entries = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? Object.entries(raw).map(([type,value]) => typeof value === 'object' ? {type,...value} : {type,url:value}) : [];
    for (const item of entries) {
      const type = String(item?.type || item?.platform || '').toLowerCase().replace(/[^a-z]/g,'');
      if (!map.has(type)) continue;
      map.set(type,{...map.get(type),url:safeUrl(item?.url || item?.href || ''),value:String(item?.handle || item?.username || '').trim()});
    }
    return allowed.map(type => map.get(type));
  }

  function socialCard(item) {
    const value = item.value || item.url || 'Não informado';
    const empty = !item.value && !item.url;
    return `<article class="tl-profile-social-v106 is-${esc(item.type)}${empty ? ' is-empty' : ''}"${item.url ? ` data-social-href="${esc(item.url)}"` : ''}><span class="tl-profile-social-icon-v106">${icons[item.type]}</span><span class="tl-profile-social-copy-v106"><strong>${esc(item.label)}</strong><span>${esc(value)}</span></span><button class="tl-profile-copy-v106" type="button" data-copy-value="${esc(empty ? '' : value)}" aria-label="Copiar ${esc(item.label)}">${icons.copy}</button></article>`;
  }

  function infoMarkup(profile,stats,own) {
    const country = window.TeamCountryCatalog?.resolve?.(profile.country);
    const countryValue = country ? `${country.flag || ''} ${country.name}`.trim() : (profile.country || '—');
    const nickname = profile.game_nickname_public || profile.game_nickname || '—';
    const memberSince = stats?.memberSince ? new Date(stats.memberSince).toLocaleDateString('pt-PT') : profile.created_at ? new Date(profile.created_at).toLocaleDateString('pt-PT') : '—';
    return `<div class="tl-profile-info-grid-v106"><div class="tl-profile-info-v106"><small>País</small><strong>${esc(countryValue)}</strong></div><div class="tl-profile-info-v106"><small>Nickname gamer</small><strong>${esc(nickname)}</strong></div><div class="tl-profile-info-v106"><small>Membro desde</small><strong>${esc(memberSince)}</strong></div></div>${own ? '<div class="tl-profile-info-action-v106"><a class="tl-profile-edit-link-v106" href="profile-edit.html">Editar perfil</a></div>' : ''}`;
  }

  function actionMarkup(rel,userId) {
    if (rel.state === 'self') return '';
    if (rel.state === 'buddy') return `<div class="tl-profile-hero-actions-v106"><span class="tl-profile-action-v106 is-primary" aria-label="Esta pessoa está na tua lista de amigos">${icons.friends}<span>Amigos</span></span></div>`;
    if (rel.state === 'sent') return `<div class="tl-profile-hero-actions-v106"><span class="tl-profile-action-v106">${icons.friends}<span>Pedido enviado</span></span></div>`;
    if (rel.state === 'received') return `<div class="tl-profile-hero-actions-v106"><button class="tl-profile-action-v106 is-primary" type="button" data-accept-buddy>${icons.friends}<span>Aceitar amizade</span></button></div>`;
    if (rel.state === 'blocked') return '';
    const requestState = rel.request?.status || '';
    const requestLabel = requestState === 'pending' ? 'Solicitação enviada' : 'Enviar mensagem';
    return `<div class="tl-profile-hero-actions-v106"><button class="tl-profile-action-v106 is-primary" type="button" data-add-buddy>${icons.friends}<span>Adicionar amigo</span></button><a class="tl-profile-action-v106" href="buddy.html?user=${encodeURIComponent(userId)}&request=1">${icons.message}<span>${esc(requestLabel)}</span></a></div>`;
  }

  function render(profile,stats,catalog,friends,userId,own,rel) {
    const state = presence(profile);
    const cover = covers[profile.cover_preset] || covers.cover_cyber_gamer;
    const bio = profile.bio || profile.public_bio || 'Fé, foco e muita força. Unidos somos imbatíveis.';
    const friendCards = friends.list.length ? friends.list.map(friendMarkup).join('') : '<div class="tl-profile-empty-v106" style="grid-column:1/-1">Ainda não há amigos para mostrar.</div>';
    const more = friends.total > friends.list.length ? `<span class="tl-profile-friend-more-v106"><strong>+${friends.total-friends.list.length}</strong><span>Amigos</span></span>` : '';

    root.innerHTML = `<section class="tl-profile-hero-v106" style="--profile-cover:url('${esc(cover)}')"><div class="tl-profile-hero-content-v106"><div class="tl-profile-avatar-wrap-v106"><div class="tl-profile-avatar-inner-v106">${avatarMarkup(profile)}</div><i class="tl-profile-presence-dot-v106 is-${esc(state)}"></i></div><div class="tl-profile-identity-v106"><div class="tl-profile-title-row-v106"><h1 class="tl-profile-title-v106">${esc(profile.display_name || 'Membro Lambreta')}</h1>${verified(profile) ? `<span class="tl-profile-verified-v106" title="Conta oficial Team Lambreta">${icons.check}</span>` : ''}</div><div class="tl-profile-presence-label-v106 is-${esc(state)}"><i></i>${esc(presenceLabel(state))}</div><div class="tl-profile-role-list-v106">${roleMarkup(profile)}</div><p class="tl-profile-quote-v106">${esc(bio)}</p></div><img class="tl-profile-crest-v106" src="img/brasao-96.webp" alt="Brasão Team Lambreta"></div>${actionMarkup(rel,userId)}</section><section class="tl-profile-content-v106"><div class="tl-profile-tabs-v106" role="tablist"><button class="tl-profile-tab-v106 is-active" type="button" data-target="#profileGames">${icons.game}<span class="tl-profile-tab-copy-v106"><strong>JOGOS</strong><small>Mais jogados</small></span></button><button class="tl-profile-tab-v106" type="button" data-target="#profileFriends">${icons.friends}<span class="tl-profile-tab-copy-v106"><strong>AMIGOS</strong><small>Lista de amigos</small></span></button><button class="tl-profile-tab-v106" type="button" data-target="#profileSocial">${icons.network}<span class="tl-profile-tab-copy-v106"><strong>REDES</strong><small></small></span></button><button class="tl-profile-tab-v106" type="button" data-target="#profileInfo">${icons.profile}<span class="tl-profile-tab-copy-v106"><strong>PERFIL</strong><small>Informações</small></span></button></div><div class="tl-profile-sections-v106"><section id="profileGames" class="tl-profile-section-v106"><div class="tl-profile-section-head-v106"><h2 class="tl-profile-section-title-v106">${icons.game}JOGOS MAIS JOGADOS</h2></div><div class="tl-profile-games-v106">${gamesMarkup(profile,catalog,own)}</div></section><section id="profileFriends" class="tl-profile-section-v106"><div class="tl-profile-section-head-v106"><h2 class="tl-profile-section-title-v106">${icons.friends}LISTA DE AMIGOS</h2><span class="tl-profile-section-link-v106">${friends.total} ${friends.total === 1 ? 'amigo' : 'amigos'}</span></div><div class="tl-profile-friends-v106">${friendCards}${more}</div></section><section id="profileSocial" class="tl-profile-section-v106"><div class="tl-profile-section-head-v106"><h2 class="tl-profile-section-title-v106">${icons.network}REDES SOCIAIS</h2></div><div class="tl-profile-social-grid-v106">${normalizeSocial(profile).map(socialCard).join('')}</div></section><section id="profileInfo" class="tl-profile-section-v106"><div class="tl-profile-section-head-v106"><h2 class="tl-profile-section-title-v106">${icons.profile}INFORMAÇÕES</h2></div>${infoMarkup(profile,stats,own)}</section></div></section>`;

    bindInteractions(rel,userId);
  }

  function bindInteractions(rel,userId) {
    document.querySelectorAll('.tl-profile-tab-v106').forEach(tab => tab.addEventListener('click',() => {
      document.querySelectorAll('.tl-profile-tab-v106').forEach(item => item.classList.toggle('is-active',item === tab));
      document.querySelector(tab.dataset.target)?.scrollIntoView({behavior:'smooth',block:'start'});
    }));
    document.querySelectorAll('[data-copy-value]').forEach(button => button.addEventListener('click',async event => {
      event.preventDefault();event.stopPropagation();
      const value = button.dataset.copyValue;if (!value) return;
      try { await navigator.clipboard.writeText(value); } catch (_) {}
    }));
    document.querySelectorAll('[data-social-href]').forEach(card => card.addEventListener('click',event => { if (!event.target.closest('button')) window.open(card.dataset.socialHref,'_blank','noopener,noreferrer'); }));

    document.querySelector('[data-add-buddy]')?.addEventListener('click',async buttonEvent => {
      const button = buttonEvent.currentTarget;
      button.disabled = true;
      try {
        const inserted = await sb.from('buddy_relations').insert({requester_id:(await window.TeamAuth.getSession()).user.id,addressee_id:userId,status:'pending',requester_notify:false,addressee_notify:true}).select().single();
        if (inserted.error) throw inserted.error;
        button.innerHTML = `${icons.friends}<span>Pedido enviado</span>`;
      } catch (error) {
        console.error('[Profile buddy request]',error);
        button.disabled = false;
      }
    });

    document.querySelector('[data-accept-buddy]')?.addEventListener('click',async buttonEvent => {
      const button = buttonEvent.currentTarget;
      button.disabled = true;
      try {
        const updated = await sb.from('buddy_relations').update({status:'accepted',addressee_notify:false,requester_notify:true,updated_at:new Date().toISOString()}).eq('id',rel.relation.id).select().single();
        if (updated.error) throw updated.error;
        button.innerHTML = `${icons.friends}<span>Amigos</span>`;
      } catch (error) {
        console.error('[Profile buddy accept]',error);
        button.disabled = false;
      }
    });
  }

  async function boot() {
    try {
      const session = await window.TeamAuth?.getSession?.();
      if (!session?.user) {
        root.innerHTML = '<section class="tl-profile-login-v106"><div><h1>Perfil Team Lambreta</h1><p>Inicia sessão para veres os perfis da comunidade.</p><button type="button" data-profile-login>Entrar com Google</button></div></section>';
        document.querySelector('[data-profile-login]')?.addEventListener('click',() => window.TeamAuth?.signInWithGoogle?.());
        return;
      }
      const userId = new URLSearchParams(location.search).get('user') || session.user.id;
      const own = userId === session.user.id;
      const [profile,stats,catalog,friends,rel] = await Promise.all([
        window.TeamProfiles.getPublicProfile(userId),
        window.TeamProfiles.getProfileStats(userId).catch(() => ({})),
        window.TeamProfiles.getCatalog().catch(() => ({games:[],platforms:[]})),
        loadFriends(userId),
        relationship(session.user.id,userId)
      ]);
      if (!profile) throw new Error('Perfil não encontrado.');
      render(profile,stats,catalog,friends,userId,own,rel);
    } catch (error) {
      console.error('[TL Profile V115]',error);
      root.innerHTML = `<section class="tl-profile-error-v106"><div><h1>Perfil indisponível</h1><p>Não foi possível carregar este perfil.</p><small>${esc(error?.message || 'Erro desconhecido')}</small></div></section>`;
    }
  }

  window.TeamProfileV115 = Object.freeze({ boot });
  void boot();
})();