(() => {
  const URL='https://ahiatqnokyhfpailobjx.supabase.co';
  const KEY='sb_publishable_qgwMhZPrB_3cFv3yCMcToA_9nDvHz-O';
  const sb=window.teamSupabase || window.supabase?.createClient(URL,KEY);
  const rankingEl=document.getElementById('hallRankingList');
  const grid=document.getElementById('hallAchievementGrid');
  const modal=document.getElementById('hallModal');
  let me=null, progress=[], profiles=[],progressChannel=null;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const name=p=>p?.game_nickname||p?.full_name||'Membro';
  const roleClass=r=>String(r||'member').toLowerCase().replace(/[^a-z0-9_-]/g,'');
  const pct=(v,max)=>Math.max(0,Math.min(100,Math.round((Number(v||0)/max)*100)));
  const hours=s=>Math.floor(Number(s||0)/3600);

  function achievementList(p={}){
    return [
      {category:'activity',icon:'⚡',title:'Motor Ligado',description:'Complete 10 horas de atividade real no site.',progress:pct(p.active_seconds,36000),current:`${Math.min(hours(p.active_seconds),10)}/10h`},
      {category:'activity',icon:'◉',title:'Presença Real',description:'Complete 60 minutos ativos sem depender de aba abandonada.',progress:pct(p.active_seconds,3600),current:`${Math.min(Math.floor((p.active_seconds||0)/60),60)}/60m`},
      {category:'community',icon:'✎',title:'Primeira Palavra',description:'Publique o seu primeiro tópico no fórum.',progress:p.forum_topics?100:0,current:p.forum_topics?'Concluída':'0/1'},
      {category:'community',icon:'↩',title:'Voz da Família',description:'Publique 20 respostas no fórum.',progress:pct(p.forum_replies,20),current:`${p.forum_replies||0}/20`},
      {category:'community',icon:'♥',title:'Família Reconhece',description:'Receba 25 agradecimentos/likes em tópicos.',progress:pct(p.forum_thanks,25),current:`${p.forum_thanks||0}/25`},
      {category:'events',icon:'◉',title:'Na Bancada',description:'Acompanhe 5 horas de live ativa pelo Team Lambreta.',progress:pct(p.live_seconds,18000),current:`${Math.min(hours(p.live_seconds),5)}/5h`},
      {category:'events',icon:'⚑',title:'Presença Confirmada',description:'Registe presença em 5 eventos oficiais do Team.',progress:pct(p.event_participations,5),current:`${p.event_participations||0}/5`},
      {category:'special',icon:'★',title:'Hall da Fama',description:'Conquista especial entregue pela administração a quem marcou a história.',progress:0,current:'Especial'}
    ];
  }

  function renderChampion(){
    const champion=progress[0]||null;
    const avatarEl=document.getElementById('hallChampionAvatar');
    const roleEl=document.getElementById('hallChampionRole');
    const nameEl=document.getElementById('hallChampionName');
    const levelEl=document.getElementById('hallChampionLevel');
    const xpBar=document.getElementById('hallChampionXpBar');
    const activeEl=document.getElementById('hallChampionActive');
    const achievementsEl=document.getElementById('hallChampionAchievements');
    const eventsEl=document.getElementById('hallChampionEvents');
    if(!champion){
      if(avatarEl)avatarEl.textContent='—';
      if(roleEl){roleEl.textContent='MEMBRO';roleEl.className='hall-role hall-role-member';}
      if(nameEl)nameEl.textContent='Ainda sem ranking';
      if(levelEl)levelEl.textContent='Nível 1 · 0 XP';
      if(xpBar)xpBar.style.setProperty('--progress','0%');
      if(activeEl)activeEl.textContent='0h';
      if(achievementsEl)achievementsEl.textContent='0';
      if(eventsEl)eventsEl.textContent='0';
      return;
    }
    const pr=profiles.find(x=>x.id===champion.user_id)||{};
    const displayName=name(pr);
    const role=String(pr.role||'MEMBRO').toUpperCase();
    const achievements=achievementList(champion).filter(a=>a.progress===100).length;
    if(avatarEl)avatarEl.textContent=(displayName.charAt(0)||'—').toUpperCase();
    if(roleEl){roleEl.textContent=role;roleEl.className=`hall-role hall-role-${roleClass(pr.role)}`;}
    if(nameEl)nameEl.textContent=displayName;
    if(levelEl)levelEl.textContent=`Nível ${champion.level||1} · ${champion.xp||0} XP`;
    if(xpBar)xpBar.style.setProperty('--progress',`${Math.round(((champion.xp||0)%250)/250*100)}%`);
    if(activeEl)activeEl.textContent=`${hours(champion.active_seconds)}h`;
    if(achievementsEl)achievementsEl.textContent=String(achievements);
    if(eventsEl)eventsEl.textContent=String(Number(champion.event_participations||0));
  }

  function renderRanking(){
    if(!rankingEl)return;
    const top=progress.slice(0,5);
    rankingEl.innerHTML=top.length?top.map((p,i)=>{const pr=profiles.find(x=>x.id===p.user_id)||{};return `<button type="button" class="hall-ranking-row"><span class="hall-ranking-number">${String(i+1).padStart(2,'0')}</span><span class="hall-avatar">${esc(name(pr).charAt(0).toUpperCase())}</span><span class="hall-ranking-user"><strong>${esc(name(pr))}</strong><small>Nível ${p.level||1} · ${p.xp||0} XP</small></span><span class="hall-role hall-role-${roleClass(pr.role)}">${esc(String(pr.role||'MEMBRO').toUpperCase())}</span><span class="hall-mini-xp"><i style="--progress:${Math.round(((p.xp||0)%250)/250*100)}%"></i></span></button>`}).join(''):'<p class="hall-empty">O ranking começa assim que os membros acumularem XP.</p>';
  }

  function renderAchievements(filter='all'){
    if(!grid)return;
    const p=progress.find(x=>x.user_id===me?.id)||{};
    const visible=achievementList(p).filter(x=>filter==='all'||x.category===filter);
    grid.innerHTML=visible.map(item=>`<button type="button" class="hall-achievement-card ${item.progress===100?'is-complete':''}" data-title="${esc(item.title)}" data-category="${esc(item.category)}" data-description="${esc(item.description)}" data-icon="${esc(item.icon)}"><span class="hall-achievement-icon">${item.icon}</span><span class="hall-achievement-content"><small>${item.category}</small><strong>${item.title}</strong><p>${item.description}</p><span class="hall-achievement-progress"><i style="--progress:${item.progress}%"></i></span><em>${item.current}</em></span></button>`).join('');
  }

  function renderMetrics(){
    const total=(key)=>progress.reduce((s,p)=>s+Number(p[key]||0),0);
    const completed=progress.reduce((s,p)=>s+achievementList(p).filter(a=>a.progress===100).length,0);
    document.getElementById('hallActiveHours')&&(document.getElementById('hallActiveHours').textContent=hours(total('active_seconds')));
    document.getElementById('hallAchievementTotal')&&(document.getElementById('hallAchievementTotal').textContent=completed);
    document.getElementById('hallEventTotal')&&(document.getElementById('hallEventTotal').textContent=total('event_participations'));
    document.getElementById('hallAfkTotal')&&(document.getElementById('hallAfkTotal').textContent=hours(total('live_seconds')));
    const labels=document.querySelectorAll('.hall-metrics small'); if(labels[3]) labels[3].textContent='Horas de live';
  }

  function openModal({title,text,icon='★',category='HALL DA FAMA'}){if(!modal)return;document.getElementById('hallModalTitle').textContent=title;document.getElementById('hallModalText').textContent=text;document.getElementById('hallModalIcon').textContent=icon;document.getElementById('hallModalCategory').textContent=category.toUpperCase();modal.hidden=false;requestAnimationFrame(()=>modal.classList.add('is-open'));}
  function closeModal(){if(!modal)return;modal.classList.remove('is-open');setTimeout(()=>modal.hidden=true,180);}

  async function load(){
    if(!sb){renderChampion();renderRanking();renderAchievements();renderMetrics();return;}
    const sess=await sb.auth.getSession();
    const r=await sb.from('profiles').select('id,game_nickname,full_name,role,avatar_url').order('game_nickname');
    profiles=r.data||[];me=profiles.find(p=>p.id===sess.data.session?.user?.id)||null;
    const pr=await sb.from('community_progress').select('*').order('xp',{ascending:false}).order('active_seconds',{ascending:false}).limit(100);
    progress=pr.data||[];
    renderChampion();renderRanking();renderAchievements();renderMetrics();
  }

  document.getElementById('hallFilters')?.addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;document.querySelectorAll('#hallFilters [data-filter]').forEach(x=>x.classList.toggle('is-active',x===b));renderAchievements(b.dataset.filter);});
  grid?.addEventListener('click',e=>{const c=e.target.closest('.hall-achievement-card');if(c)openModal({title:c.dataset.title,text:c.dataset.description,icon:c.dataset.icon,category:c.dataset.category});});
  document.getElementById('hallRankingInfo')?.addEventListener('click',()=>openModal({title:'Ranking do Hall',text:'Beta ativa: XP vem de presença real, fórum, eventos e horas de live. Aba abandonada entra como AFK e não gera XP.',icon:'♛',category:'Ranking'}));
  modal?.addEventListener('click',e=>{if(e.target.closest('[data-close-hall]'))closeModal();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal&&!modal.hidden)closeModal();});
  document.getElementById('year')&&(document.getElementById('year').textContent=new Date().getFullYear());
  load();
  if(sb){progressChannel=sb.channel('hall-progress-v96').on('postgres_changes',{event:'*',schema:'public',table:'community_progress'},()=>load()).subscribe();}
  window.addEventListener('tl:progress',()=>load());
  window.addEventListener('focus',load);
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden) load(); });
  setInterval(()=>{ if(!document.hidden) load(); },15000);
  window.addEventListener('pagehide',()=>{if(progressChannel)sb.removeChannel(progressChannel)});
})();
