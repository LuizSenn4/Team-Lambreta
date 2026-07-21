function renderEmpty(container,text){
  container.innerHTML=`<article class="empty-card safe-card"><h3>${text}</h3><p>Conteúdo ainda não cadastrado no admin.</p></article>`;
}

function renderCards(containerId,items,emptyTitle){
  const c=document.getElementById(containerId);
  if(!c)return;
  if(!items||!items.length)return renderEmpty(c,emptyTitle);

  if(containerId === "membersGrid"){
    const members = items.length ? items : [];
    document.getElementById("membersCount") && (document.getElementById("membersCount").textContent = members.length);
    c.innerHTML=members.map((item,index)=>`
      <article class="member-card">
        <div class="member-number">${String(index+1).padStart(2,"0")}</div>
        ${item.image?`<img src="${item.image}" alt="${item.name||"Membro"}">`:`<div class="member-avatar">${(item.name||"L").charAt(0)}</div>`}
        <h3>${item.name||"Sem nome"}</h3>
        <p>${item.role||"Membro da família"}</p>
      </article>
    `).join("");
    return;
  }

  if(containerId === "eventsGrid"){
    c.innerHTML=items.map((item,index)=>`
      <article class="event-item">
        <span>${String(index+1).padStart(2,"0")}</span>
        <div>
          <h3>${item.title||"Evento sem título"}</h3>
          <p>${item.description||"Sem descrição"}</p>
        </div>
      </article>
    `).join("");
    return;
  }

  if(containerId === "achievementsGrid"){
    c.innerHTML=items.map(item=>`
      <article class="trophy-card">
        <span>🏆</span>
        <h3>${item.title||"Conquista"}</h3>
        <p>${item.description||"Sem descrição"}</p>
      </article>
    `).join("");
    return;
  }

  if(containerId === "mediaGrid"){
    c.innerHTML=items.map(item=>{
      const type = (item.type || 'photo').toLowerCase();
      const title = item.title || 'Mídia';
      const desc = item.description || '';
      const direct = item.link || item.image || '';
      const yt = extractYouTubeId(direct);
      let mediaMarkup = '';
      if(type === 'video'){
        if(yt){
          mediaMarkup = `<iframe src="https://www.youtube.com/embed/${yt}" title="${title}" loading="lazy" allowfullscreen></iframe>`;
        } else if(direct){
          mediaMarkup = `<video controls preload="metadata" ${item.image ? `poster="${item.image}"` : ''}><source src="${direct}"></video>`;
        } else {
          mediaMarkup = `<div class="media-placeholder">VIDEO</div>`;
        }
      } else {
        mediaMarkup = item.image ? `<img src="${item.image}" alt="${title}">` : `<div class="media-placeholder">PHOTO</div>`;
      }
      return `<article class="media-card ${type}">${mediaMarkup}<h3>${title}</h3><p>${desc}</p></article>`;
    }).join("");
    return;
  }

  if(containerId === "storeGrid"){
    c.innerHTML=items.map(item=>`
      <article class="product-card">
        ${item.image?`<img src="${item.image}" alt="${item.title||"Produto"}">`:`<div class="product-placeholder">DROP</div>`}
        <h3>${item.title||"Produto"}</h3>
        <p>${item.description||"Em breve"}</p>
      </article>
    `).join("");
    return;
  }

  c.innerHTML=items.map(item=>`
    <article class="public-card">
      ${item.image?`<img src="${item.image}" alt="${item.title||item.name||"Item"}">`:""}
      <h3>${item.title||item.name||"Sem título"}</h3>
      <p>${item.description||item.role||item.date||"Sem descrição"}</p>
    </article>
  `).join("");
}

function renderForum(items){
  const c=document.getElementById("forumGrid");
  if(!c)return;
  if(!items||!items.length)return renderEmpty(c,"Nenhum tópico ainda");
  c.innerHTML=items.map(t=>`
    <article class="forum-topic">
      <div class="topic-meta">
        <span class="${t.status==="Fechado"?"closed":"open"}">${t.status||"Aberto"}</span>
        ${t.fixed?`<span class="fixed">FIXADO</span>`:""}
        <span>${t.author||"Equipe"}</span>
      </div>
      <h3>${t.title||"Sem título"}</h3>
      <p>${t.description||"Sem descrição"}</p>
    </article>
  `).join("");
}

function renderSocials(data){
  const b=document.getElementById("socialLinks");
  if(!b)return;
  const links=[["TikTok",data.socials.tiktok],["Instagram",data.socials.instagram],["YouTube",data.socials.youtube],["Discord",data.socials.discord],["Facebook",data.socials.facebook]].filter(([,u])=>u);

  if(!links.length){
    b.innerHTML=`<article class="empty-card"><h3>Redes em breve</h3><p>Adiciona as redes no painel admin.</p></article>`;
    return;
  }

  b.innerHTML=links.map(([n,u])=>`<a class="contact-social-card" href="${u}" target="_blank" rel="noopener"><span class="social-svg">${socialIcon(n)}</span><strong>${n}</strong><small>Abrir rede</small></a>`).join("");
}

function renderPublicSite(){
  const data=getTeamData();
  document.querySelectorAll("#publicTeamName").forEach(el => el.textContent=data.general.teamName);
  document.querySelectorAll("#publicSlogan").forEach(el => el.textContent=data.general.slogan);
  const heroTitle = document.getElementById("publicHeroTitle");
  const heroText = document.getElementById("publicHeroText");
  const announcement = document.getElementById("publicAnnouncement");
  const year = document.getElementById("year");

  if(heroTitle) heroTitle.textContent=data.general.heroTitle;
  if(heroText) heroText.textContent=data.general.heroText;
  if(announcement) announcement.textContent=data.general.announcement || "O lobby está aberto.";
  if(year) year.textContent=new Date().getFullYear();

  renderCards("membersGrid",data.members,"Nenhum membro ainda");
  renderTeamSections(data.members || []);
  renderStreamersPage(data);
  renderForum(data.forum);
  renderCards("eventsGrid",data.events,"Nenhum evento ainda");
  renderCards("achievementsGrid",data.achievements,"Nenhuma conquista ainda");
  renderCards("mediaGrid",data.media,"Nenhuma mídia ainda");
  renderCards("storeGrid",data.store,"Nenhum produto ainda");
  renderSocials(data);
}

const chatDefaults=[
  {name:"Sistema",status:"online",text:"Bem-vindo ao lobby do Team Lambreta."},
  {name:"Team",status:"away",text:"Chat visual/local por enquanto. Depois vira online real."}
];

function getChatMessages(){
  const saved=localStorage.getItem("team_lambreta_chat_v1");
  if(!saved)return chatDefaults;
  try{return JSON.parse(saved)}catch{return chatDefaults}
}

function saveChatMessages(messages){
  localStorage.setItem("team_lambreta_chat_v1",JSON.stringify(messages));
}

function statusLabel(status){
  if(status==="busy")return"ocupado";
  if(status==="away")return"ausente";
  return"online";
}

function statusClass(status){
  if(status==="busy")return"busy";
  if(status==="away")return"away";
  return"online";
}

function updateStatusDot(){
  const select=document.getElementById("userStatus");
  const dot=document.getElementById("onlineDot");
  if(!select || !dot)return;
  localStorage.setItem("team_lambreta_presence_v1", select.value);
  dot.classList.remove("online","busy","away");
  dot.classList.add(statusClass(select.value));
}

function loadStatus(){
  const select=document.getElementById("userStatus");
  if(!select)return;
  const saved=localStorage.getItem("team_lambreta_presence_v1") || "online";
  select.value=saved;
  updateStatusDot();
}

function roleLabel(role){
  if(role === "master") return "Admin Master";
  if(role === "admin") return "Admin";
  if(role === "staff") return "Staff";
  if(role === "moderator") return "Moderador";
  if(role === "streamer") return "Streamer";
  if(role === "vip1") return "VIP I";
  if(role === "vip2") return "VIP II";
  if(role === "vip3") return "VIP III";
  return "Usuário";
}

function roleClass(role){
  if(role === "master") return "master";
  if(role === "admin") return "admin";
  if(role === "staff") return "staff";
  if(role === "moderator") return "moderator";
  if(role === "streamer") return "streamer";
  if(role === "vip1") return "vip1";
  if(role === "vip2") return "vip2";
  if(role === "vip3") return "vip3";
  return "user";
}

function getRolesMap(){
  const raw = localStorage.getItem("team_lambreta_roles_v1");
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

function saveRolesMap(map){
  localStorage.setItem("team_lambreta_roles_v1", JSON.stringify(map));
}

function getAssignedRole(name){
  const clean = normalizeChatName(name);
  const bootMasters = ["professor", "luiz", "adminmaster", "admin_master"];
  if(bootMasters.includes(clean)) return "master";

  const map = getRolesMap();
  return map[clean] || "user";
}

function setAssignedRole(name, role){
  const map = getRolesMap();
  map[normalizeChatName(name)] = role;
  saveRolesMap(map);
}

function getCurrentUserName(){
  return document.getElementById("chatName")?.value.trim() || "Visitante";
}

function getCurrentUserRole(){
  return getAssignedRole(getCurrentUserName());
}

function canModerate(){
  return ["master", "admin", "staff", "moderator"].includes(getCurrentUserRole());
}

function canLockChat(){
  return ["master", "admin"].includes(getCurrentUserRole());
}

function canAssignRoles(){
  return getCurrentUserRole() === "master";
}

function renderChat(){
  const box=document.getElementById("chatMessages");
  if(!box)return;
  const messages=getChatMessages();
  box.innerHTML=messages.map(m=>`
    <article class="chat-msg ${statusClass(m.status)} role-${roleClass(getAssignedRole(m.name) || m.role)}">
      <div class="chat-msg-top">
        <strong class="chat-name" data-chat-name="${String(m.name).replace(/"/g, "&quot;")}">${m.name}</strong>
        <span class="role-badge">${roleLabel(getAssignedRole(m.name) || m.role)}</span>
        <span class="status">${statusLabel(m.status)}</span>
      </div>
      <p>${m.text}</p>
    </article>
  `).join("");
  box.scrollTop=box.scrollHeight;
}

function isChatAuthReady(){
  const googleOk = localStorage.getItem('team_lambreta_google_auth_demo') === '1';
  const captchaOk = localStorage.getItem('team_lambreta_captcha_demo') === '1';
  return googleOk && captchaOk;
}

function updateChatAuthUI(){
  const box = document.getElementById('chatAuthBox');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const name = document.getElementById('chatName');
  const button = form ? form.querySelector('button[type="submit"]') : null;
  const captcha = document.getElementById('chatCaptchaCheck');
  const googleBtn = document.getElementById('googleLoginBtn');
  const ready = isChatAuthReady();

  if(captcha) captcha.checked = localStorage.getItem('team_lambreta_captcha_demo') === '1';

  if(box){
    box.classList.toggle('ready', ready);
    box.querySelector('h3').textContent = ready ? 'Chat liberado' : 'Entrar para usar o chat';
    const p = box.querySelector('p');
    if(p) p.textContent = ready ? 'Google + captcha validados nesta demo local.' : 'Estrutura preparada para Google Login + captcha, para reduzir spam e bots.';
  }
  if(googleBtn){
    googleBtn.textContent = localStorage.getItem('team_lambreta_google_auth_demo') === '1' ? 'Google conectado' : 'Entrar com Google';
  }
  if(input) input.disabled = !ready;
  if(name){
    name.disabled = true;
    name.readOnly = true;
    name.setAttribute("aria-readonly", "true");
    name.value = ready ? getDemoGoogleDisplayName() : "Visitante";
  }
  if(button) button.disabled = !ready;
}

function bindChatAuth(){
  const googleBtn = document.getElementById('googleLoginBtn');
  const captcha = document.getElementById('chatCaptchaCheck');
  if(googleBtn){
    googleBtn.addEventListener('click', ()=>{
      localStorage.setItem('team_lambreta_google_auth_demo', '1');
      if(!localStorage.getItem('team_lambreta_google_name_demo')){
        const raw = prompt('Nome da conta Google (demo local):', 'Luiz Eduardo');
        if(raw) localStorage.setItem('team_lambreta_google_name_demo', raw.trim());
      }
      updateChatAuthUI();
      bindChatRole();
    });
  }
  if(captcha){
    captcha.addEventListener('change', ()=>{
      localStorage.setItem('team_lambreta_captcha_demo', captcha.checked ? '1' : '0');
      updateChatAuthUI();
    });
  }
  updateChatAuthUI();
}

const FLOOD_LIMIT = 3;
const FLOOD_WINDOW_MS = 10 * 1000;
const FLOOD_DELAY_MS = 10 * 1000;

function getChatRole(){
  return getCurrentUserRole();
}

function getFloodKey(name){
  return "team_lambreta_flood_" + String(name || "visitante").toLowerCase().replace(/[^a-z0-9_-]/gi, "_");
}

function getFloodState(name){
  const raw = localStorage.getItem(getFloodKey(name));
  if(!raw) return { times: [], blockedUntil: 0 };
  try { return JSON.parse(raw); } catch { return { times: [], blockedUntil: 0 }; }
}

function saveFloodState(name, state){
  localStorage.setItem(getFloodKey(name), JSON.stringify(state));
}

function updateDelayInfo(text, isError = false){
  const info = document.getElementById("chatDelayInfo");
  if(!info) return;
  info.textContent = text || "";
  info.classList.toggle("error", !!isError);
}

function canSendChat(name){
  if(["master", "admin", "staff", "moderator"].includes(getChatRole())) return { ok: true, wait: 0 };

  const state = getFloodState(name);
  const now = Date.now();

  if(state.blockedUntil && now < state.blockedUntil){
    return { ok: false, wait: Math.ceil((state.blockedUntil - now) / 1000) };
  }

  return { ok: true, wait: 0 };
}

function registerChatSend(name){
  if(["master", "admin", "staff", "moderator"].includes(getChatRole())){
    updateDelayInfo(`${roleLabel(getChatRole())}: sem delay.`);
    return;
  }

  const state = getFloodState(name);
  const now = Date.now();

  state.times = (state.times || []).filter(t => now - t <= FLOOD_WINDOW_MS);
  state.times.push(now);

  if(state.times.length >= FLOOD_LIMIT){
    state.times = [];
    state.blockedUntil = now + FLOOD_DELAY_MS;
    updateDelayInfo(`Anti-flood ativado: 3 mensagens muito rápidas. Aguarda ${FLOOD_DELAY_MS / 1000}s.`, true);
  } else {
    const left = FLOOD_LIMIT - state.times.length;
    updateDelayInfo(`Anti-flood: ${left} mensagem(ns) rápida(s) antes do cooldown.`);
  }

  saveFloodState(name, state);
}

function bindChatRole(){
  updateDelayInfo(getCurrentUserRole() === "master" ? "Admin Master: cargo máximo." : `Cargo atual: ${roleLabel(getCurrentUserRole())}.`);
}

function getBlockKey(name){
  return "team_lambreta_block_" + normalizeChatName(name);
}

function getBlockedUntil(name){
  return Number(localStorage.getItem(getBlockKey(name)) || 0);
}

function blockUser(name, minutes){
  const until = Date.now() + minutes * 60 * 1000;
  localStorage.setItem(getBlockKey(name), String(until));
  updateModerationInfo(`${name} bloqueado por ${minutes} min.`);
}

function unblockUser(name){
  localStorage.removeItem(getBlockKey(name));
  updateModerationInfo(`${name} desbloqueado.`);
}

function isUserBlocked(name){
  const until = getBlockedUntil(name);
  if(!until) return { blocked:false, wait:0 };
  const now = Date.now();
  if(now >= until){
    localStorage.removeItem(getBlockKey(name));
    return { blocked:false, wait:0 };
  }
  return { blocked:true, wait: Math.ceil((until - now) / 1000) };
}

function isChatLocked(){
  return localStorage.getItem("team_lambreta_chat_locked_v1") === "1";
}

function setChatLocked(locked){
  localStorage.setItem("team_lambreta_chat_locked_v1", locked ? "1" : "0");
  updateModerationInfo(locked ? "Chat travado para usuários normais." : "Chat liberado.");
}

function updateModerationInfo(text){
  const info = document.getElementById("chatModerationInfo");
  if(!info) return;
  const locked = isChatLocked();
  const lockText = locked ? "Chat: LOCK ativo. " : "";
  info.textContent = text ? lockText + text : lockText;
}

function openModerationPanel(name){
  if(!canModerate()) return;
  const panel = document.getElementById("moderationPanel");
  const target = document.getElementById("moderationTarget");
  if(!panel || !target) return;
  panel.dataset.targetName = name;
  target.textContent = "Moderar: " + name;
  panel.classList.add("show");
}

function bindModeration(){
  document.addEventListener("click", event => {
    const nick = event.target.closest(".chat-name");
    if(nick && canModerate()){
      openModerationPanel(nick.dataset.chatName || nick.textContent);
      return;
    }

    const roleBtn = event.target.closest("[data-role-set]");
    const actionBtn = event.target.closest("[data-mod-action]");
    if(!roleBtn && !actionBtn) return;

    const panel = document.getElementById("moderationPanel");
    const target = panel?.dataset.targetName || "";

    if(roleBtn){
      if(!canAssignRoles()){
        updateModerationInfo("Só Admin Master pode atribuir cargos.");
        return;
      }
      setAssignedRole(target, roleBtn.dataset.roleSet);
      updateModerationInfo(`${target} agora é ${roleLabel(roleBtn.dataset.roleSet)}.`);
      panel?.classList.remove("show");
      renderChat();
      return;
    }

    const action = actionBtn.dataset.modAction;

    if(["block-1","block-5","block-15","unblock"].includes(action) && !canModerate()){
      updateModerationInfo("Sem permissão para moderar usuários.");
      return;
    }

    if(["lock-chat","unlock-chat"].includes(action) && !canLockChat()){
      updateModerationInfo("Só Admin Master ou Admin podem travar/liberar o chat.");
      return;
    }

    if(action === "block-1") blockUser(target, 1);
    if(action === "block-5") blockUser(target, 5);
    if(action === "block-15") blockUser(target, 15);
    if(action === "unblock") unblockUser(target);
    if(action === "lock-chat") setChatLocked(true);
    if(action === "unlock-chat") setChatLocked(false);
    if(action === "close") panel?.classList.remove("show");

    if(action !== "close" && panel) panel.classList.remove("show");
  });

  updateModerationInfo("");
}

function bindChat(){
  const form=document.getElementById("chatForm");
  const select=document.getElementById("userStatus");

  if(select){
    select.addEventListener("change", updateStatusDot);
  }

  if(!form)return;
  form.addEventListener("submit",event=>{
    event.preventDefault();
    if(!isChatAuthReady()) return;

    const name=document.getElementById("chatName")?.value.trim() || document.getElementById("googleLoginBtn")?.textContent.replace(/^Logado como:\s*/i, "").trim() || "Visitante";
    const text=document.getElementById("chatInput").value.trim();
    const status=document.getElementById("userStatus")?.value || "online";

    if(!text)return;

    if(getChatRole() !== "master" && getChatRole() !== "admin" && isChatLocked()){
      updateModerationInfo("Chat travado no momento. Só admin pode falar.");
      return;
    }

    const blocked = isUserBlocked(name);
    if(!canModerate() && blocked.blocked){
      updateModerationInfo(`Usuário bloqueado. Aguarda ${blocked.wait}s.`);
      return;
    }

    const permission = canSendChat(name);
    if(!permission.ok){
      updateDelayInfo(`Anti-flood: espera ${permission.wait}s antes de enviar outra mensagem.`, true);
      return;
    }

    const messages=getChatMessages();
    messages.push({name,status,text,role:getChatRole()});
    saveChatMessages(messages.slice(-40));
    document.getElementById("chatInput").value="";
    renderChat();
    registerChatSend(name);
  });
}

renderPublicSite();
if(!window.TEAM_SUPABASE_MODE){
  loadStatus();
  renderChat();
  bindChatAuth();
  bindChatRole();
  bindModeration();
  bindChat();
}


/* Usuário cria tópico -> pendente para o admin */
function bindUserTopicForm(){
  const form = document.getElementById("userTopicForm");
  if(!form) return;

  form.addEventListener("submit", event => {
    event.preventDefault();

    const author = (document.getElementById("topicUserName").value.trim() || "Visitante").slice(0,18);
    const title = document.getElementById("topicTitle").value.trim().slice(0,60);
    const description = document.getElementById("topicDescription").value.trim().slice(0,280);
    const feedback = document.getElementById("topicFeedback");

    if(!title || !description){
      feedback.textContent = "Preenche o título e a descrição antes de enviar.";
      feedback.classList.add("error");
      return;
    }
    feedback.classList.remove("error");

    const data = getTeamData();

    data.pendingForum.push({
      title,
      description,
      author,
      status: "Aberto",
      fixed: false,
      approved: false,
      createdAt: new Date().toISOString()
    });

    saveTeamData(data);

    document.getElementById("topicTitle").value = "";
    document.getElementById("topicDescription").value = "";
    feedback.textContent = "Tópico enviado. Agora fica pendente de aprovação do admin.";
    document.querySelectorAll(`.field-counter[data-for="topicTitle"], .field-counter[data-for="topicDescription"]`).forEach(el=>{ const f=document.getElementById(el.dataset.for); if(f && f.maxLength) el.textContent=`${f.value.length}/${f.maxLength}`; });
    feedback.classList.remove("error");
  });
}

bindUserTopicForm();


/* V26 - slider de banners */
function bindBannerSlider(){
  const slides = Array.from(document.querySelectorAll('.banner-slide'));
  const dots = Array.from(document.querySelectorAll('.banner-dots button'));
  const prev = document.getElementById('bannerPrev');
  const next = document.getElementById('bannerNext');
  if(!slides.length || !dots.length || !prev || !next) return;

  let current = 0;
  let timer = null;

  function renderBanner(index){
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle('active', i === current));
    dots.forEach((dot, i) => dot.classList.toggle('active', i === current));
  }

  function startAuto(){
    clearInterval(timer);
    timer = setInterval(() => renderBanner(current + 1), 5000);
  }

  prev.addEventListener('click', () => { renderBanner(current - 1); startAuto(); });
  next.addEventListener('click', () => { renderBanner(current + 1); startAuto(); });
  dots.forEach((dot, i) => dot.addEventListener('click', () => { renderBanner(i); startAuto(); }));

  renderBanner(0);
  startAuto();
}

bindBannerSlider();


/* V22 - ausente automático após 5 minutos parado */
let awayTimer = null;
let autoAwayActive = false;
const AWAY_AFTER_MS = 5 * 60 * 1000;

function getStatusSelect(){
  return document.getElementById("userStatus");
}

function forceStatus(status){
  const select = getStatusSelect();
  if(!select) return;
  select.value = status;
  updateStatusDot();
}

function markAutoAway(){
  const select = getStatusSelect();
  if(!select) return;

  if(select.value !== "busy"){
    autoAwayActive = true;
    forceStatus("away");
  }
}

function resetAwayTimer(){
  const select = getStatusSelect();
  if(!select) return;

  if(autoAwayActive && select.value === "away"){
    autoAwayActive = false;
    forceStatus("online");
  }

  clearTimeout(awayTimer);
  awayTimer = setTimeout(markAutoAway, AWAY_AFTER_MS);
}

["mousemove", "keydown", "click", "scroll", "touchstart", "touchmove"].forEach(evt => {
  window.addEventListener(evt, resetAwayTimer, { passive: true });
});

const statusSelectV22 = getStatusSelect();
if(statusSelectV22){
  statusSelectV22.addEventListener("change", () => {
    autoAwayActive = false;
    resetAwayTimer();
  });
  resetAwayTimer();
}


const DEMO_TEAM_MEMBERS = [
  {
    name:"Lambreta Prime",
    role:"Gamer / Entry Fragger",
    group:"Gamers",
    bio:"Jogador agressivo, foco em rush, pressão e abrir espaço para o team. Perfil de exemplo para mostrar como vai ficar a página dos integrantes.",
    image:"",
    instagram:"",
    tiktok:"",
    facebook:""
  },
  {
    name:"Live Rider",
    role:"Streamer / Criador de conteúdo",
    group:"Streamers",
    bio:"Responsável por lives, clips, highlights e presença nas redes. Perfil de exemplo para streamers do Team Lambreta.",
    image:"",
    instagram:"",
    tiktok:"",
    facebook:""
  },
  {
    name:"Mod Guard",
    role:"Staff / Moderador",
    group:"Staff",
    bio:"Apoio da comunidade, organização do lobby, moderação do chat e ajuda nos eventos internos.",
    image:"",
    instagram:"",
    tiktok:"",
    facebook:""
  }
];

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, function(ch){
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch];
  });
}

function normalizePublicSocial(value, network){
  const raw = String(value || "").trim();
  if(!raw) return "";
  if(raw.startsWith("http://") || raw.startsWith("https://")) return raw;

  const clean = raw
    .replace(/^@/, "")
    .replace(/^instagram\//i, "")
    .replace(/^tiktok\//i, "")
    .replace(/^facebook\//i, "");

  if(network === "instagram") return "https://instagram.com/" + clean;
  if(network === "tiktok") return "https://www.tiktok.com/@" + clean.replace(/^@/, "");
  if(network === "facebook") return "https://facebook.com/" + clean;
  return raw;
}

function teamCardHTML(item){
  const name = escapeHtml(item.name || 'Sem nome');
  const role = escapeHtml(item.role || 'Membro');
  const group = escapeHtml(item.group || 'Gamers');
  const bio = escapeHtml(item.bio || item.role || 'Sem descrição ainda.');
  const imageSrc = item.image || '';
  const image = imageSrc
    ? `<img src="${imageSrc}" alt="${name}">`
    : `<div class="team-photo-placeholder">${name.charAt(0)}</div>`;

  const socials = [
    item.instagram ? `<a class="person-link" href="${normalizePublicSocial(item.instagram, 'instagram')}" target="_blank" rel="noopener">${socialIcon('Instagram')}<span>@ Instagram</span></a>` : '',
    item.tiktok ? `<a class="person-link" href="${normalizePublicSocial(item.tiktok, 'tiktok')}" target="_blank" rel="noopener">${socialIcon('TikTok')}<span>@ TikTok</span></a>` : '',
    item.facebook ? `<a class="person-link" href="${normalizePublicSocial(item.facebook, 'facebook')}" target="_blank" rel="noopener">${socialIcon('Facebook')}<span>@ Facebook</span></a>` : ''
  ].filter(Boolean).join('');

  const payload = encodeURIComponent(JSON.stringify({
    name: item.name || 'Sem nome',
    role: item.role || 'Membro',
    group: item.group || 'Gamers',
    bio: item.bio || item.role || 'Sem descrição ainda.',
    image: imageSrc,
    instagram: item.instagram || '',
    tiktok: item.tiktok || '',
    facebook: item.facebook || ''
  }));

  return `
    <article class="team-player-card" data-profile="${payload}">
      <div class="team-player-photo team-preview-zone">
        ${image}
        
      </div>

      <div class="team-player-info">
        <span class="team-role-pill">${group}</span>
        <h3>${name}</h3>
        <strong>${role}</strong>
        <p>${bio}</p>
        ${socials ? `<div class="person-links">${socials}</div>` : ''}
      </div>
    </article>`;
}

function renderTeamBucket(elId, members, emptyText){
  const el = document.getElementById(elId);
  if(!el) return;
  if(!members.length){
    el.innerHTML = `<article class="empty-card safe-card"><h3>${emptyText}</h3><p>Adiciona perfis no admin para preencher esta área.</p></article>`;
    return;
  }
  el.innerHTML = members.map(teamCardHTML).join('');
  bindTeamProfileCards();
}

function normalizeGroup(member){
  const raw = (member.group || member.role || '').toLowerCase();
  if(raw.includes('stream')) return 'Streamers';
  if(raw.includes('staff') || raw.includes('admin') || raw.includes('famil')) return 'Staff';
  return 'Gamers';
}

function renderTeamSections(items){
  const gamersEl = document.getElementById('teamGamersGrid');
  const staffEl = document.getElementById('teamStaffGrid');
  if(!gamersEl && !staffEl) return;

  const source = (items && items.length) ? items : DEMO_TEAM_MEMBERS.filter(item => normalizeGroup(item) !== 'Streamers');
  const gamers = source.filter(item => normalizeGroup(item) === 'Gamers');
  const staff = source.filter(item => normalizeGroup(item) === 'Staff');

  renderTeamBucket('teamGamersGrid', gamers, 'Sem gamers ainda');
  renderTeamBucket('teamStaffGrid', staff, 'Sem staff ainda');

  const total = document.getElementById('teamTotalCount');
  if(total) total.textContent = source.length;
}

function bindFieldCounters(){
  document.querySelectorAll('.field-counter[data-for]').forEach(counter => {
    const field = document.getElementById(counter.dataset.for);
    if(!field || !field.maxLength) return;
    const update = () => { counter.textContent = `${field.value.length}/${field.maxLength}`; };
    field.addEventListener('input', update);
    update();
  });
}

bindFieldCounters();
bindTeamPreview();


function extractYouTubeId(url){
  if(!url) return '';
  const match = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/);
  return match ? match[1] : '';
}

function socialIcon(name){
  const icons = {
    TikTok: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3c.3 1.8 1.4 3 3.2 3.7.8.3 1.6.4 2.8.4v2.7c-1.4 0-2.7-.3-3.9-.8v5.6c0 3.2-2.3 5.4-5.5 5.4S5 17.8 5 14.8s2.3-5.2 5.2-5.4v2.8c-1.4.2-2.4 1.2-2.4 2.6s1.1 2.6 2.6 2.6 2.6-1.1 2.6-2.8V3h1z" fill="currentColor"/></svg>`,
    Instagram: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm5 5.2A3.8 3.8 0 1 0 12 16a3.8 3.8 0 0 0 0-7.8zm0 2A1.8 1.8 0 1 1 12 14a1.8 1.8 0 0 1 0-3.8zm4.5-3.3a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8z" fill="currentColor"/></svg>`,
    YouTube: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 7.2a2.9 2.9 0 0 0-2-2C17.9 4.7 12 4.7 12 4.7s-5.9 0-7.6.5a2.9 2.9 0 0 0-2 2A30 30 0 0 0 2 12a30 30 0 0 0 .4 4.8 2.9 2.9 0 0 0 2 2c1.7.5 7.6.5 7.6.5s5.9 0 7.6-.5a2.9 2.9 0 0 0 2-2A30 30 0 0 0 22 12a30 30 0 0 0-.4-4.8zM10 15.5v-7l6 3.5-6 3.5z" fill="currentColor"/></svg>`,
    Discord: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.9 5.1A15.5 15.5 0 0 0 15 4l-.2.4a10.6 10.6 0 0 1 3.5 1.7 13 13 0 0 0-4.3-1.3 15.8 15.8 0 0 0-4 0A13 13 0 0 0 5.7 6a10.6 10.6 0 0 1 3.5-1.7L9 4a15.5 15.5 0 0 0-3.9 1.1C2.6 8.6 2 12 2.2 15.3a15.7 15.7 0 0 0 4.7 2.4l1.1-1.8c-.6-.2-1.1-.4-1.6-.7.1-.1.3-.2.4-.3 3.1 1.5 6.4 1.5 9.5 0 .1.1.3.2.4.3-.5.3-1 .5-1.6.7l1.1 1.8a15.7 15.7 0 0 0 4.7-2.4c.3-3.8-.6-7.1-2-10.2zM9.6 13.8c-.9 0-1.5-.8-1.5-1.7s.7-1.7 1.5-1.7 1.5.8 1.5 1.7-.6 1.7-1.5 1.7zm4.8 0c-.9 0-1.5-.8-1.5-1.7s.7-1.7 1.5-1.7 1.5.8 1.5 1.7-.6 1.7-1.5 1.7z" fill="currentColor"/></svg>`,
    Facebook: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 21v-7h2.4l.4-2.8h-2.8V9.4c0-.8.2-1.4 1.4-1.4H16V5.5c-.4 0-1.1-.1-2-.1-2 0-3.4 1.2-3.4 3.5v2.1H8.3V14h2.3v7h2.9z" fill="currentColor"/></svg>`
  };
  return icons[name] || '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="currentColor"/></svg>';
}

function ensurePreviewModal(){
  if(document.getElementById('imagePreviewModal')) return;
  const modal = document.createElement('div');
  modal.id = 'imagePreviewModal';
  modal.className = 'image-preview-modal';
  modal.innerHTML = `<div class="image-preview-backdrop" data-close="1"></div><div class="image-preview-box"><button class="image-preview-close" type="button" data-close="1">×</button><img id="imagePreviewEl" src="" alt="Preview"><p id="imagePreviewTitle"></p></div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', (e)=>{ if(e.target.dataset.close) modal.classList.remove('show'); });
}

function bindTeamPreview(){
  ensurePreviewModal();
  const modal = document.getElementById('imagePreviewModal');
  const img = document.getElementById('imagePreviewEl');
  const title = document.getElementById('imagePreviewTitle');
  document.querySelectorAll('.team-preview-trigger').forEach(el => {
    if(el.dataset.bound === '1') return;
    el.dataset.bound = '1';
    el.addEventListener('click', ()=>{
      const src = el.dataset.image;
      if(!src) return;
      img.src = src;
      title.textContent = el.dataset.title || '';
      modal.classList.add('show');
    });
  });
}


/* V31 - Team preview igual Liga Fácil / Shop */
function decodeProfilePayload(card){
  try {
    return JSON.parse(decodeURIComponent(card.dataset.profile || ""));
  } catch {
    return null;
  }
}

function profilePhotoHTML(profile){
  if(profile.image){
    return `<img src="${profile.image}" alt="${escapeHtml(profile.name)}">`;
  }
  return `<div class="team-photo-placeholder big">${escapeHtml(profile.name || "L").charAt(0)}</div>`;
}

function showTeamHoverPreview(card, event){
  const preview = document.getElementById("teamHoverPreview");
  if(!preview) return;

  const profile = decodeProfilePayload(card);
  if(!profile) return;

  preview.querySelector(".team-hover-photo").innerHTML = profilePhotoHTML(profile);
  preview.querySelector("strong").textContent = profile.name || "Sem nome";
  preview.querySelector("span").textContent = profile.role || "Membro";

  const x = event?.clientX || window.innerWidth / 2;
  const y = event?.clientY || window.innerHeight / 2;

  preview.style.left = Math.min(x + 22, window.innerWidth - 260) + "px";
  preview.style.top = Math.max(y - 90, 18) + "px";
  preview.classList.add("show");
}

function moveTeamHoverPreview(event){
  const preview = document.getElementById("teamHoverPreview");
  if(!preview || !preview.classList.contains("show")) return;
  preview.style.left = Math.min(event.clientX + 22, window.innerWidth - 260) + "px";
  preview.style.top = Math.max(event.clientY - 90, 18) + "px";
}

function hideTeamHoverPreview(){
  const preview = document.getElementById("teamHoverPreview");
  if(preview) preview.classList.remove("show");
}

function openTeamProfile(card){
  const modal = document.getElementById("teamProfileModal");
  if(!modal) return;

  const profile = decodeProfilePayload(card);
  if(!profile) return;

  modal.querySelector(".team-profile-full-photo").innerHTML = profilePhotoHTML(profile);
  modal.querySelector("h2").textContent = profile.name || "Sem nome";
  modal.querySelector(".team-profile-full-copy > strong").textContent = profile.role || "Membro";
  modal.querySelector(".team-profile-full-bio").textContent = profile.bio || "Sem descrição ainda.";

  const links = [
    profile.instagram ? `<a class="person-link" href="${profile.instagram}" target="_blank" rel="noopener">${socialIcon('Instagram')}<span>Instagram</span></a>` : "",
    profile.tiktok ? `<a class="person-link" href="${profile.tiktok}" target="_blank" rel="noopener">${socialIcon('TikTok')}<span>TikTok</span></a>` : "",
    profile.facebook ? `<a class="person-link" href="${profile.facebook}" target="_blank" rel="noopener">${socialIcon('Facebook')}<span>Facebook</span></a>` : ""
  ].filter(Boolean).join("");

  modal.querySelector(".team-profile-full-links").innerHTML = links || `<span class="no-links">Redes ainda não cadastradas.</span>`;
  modal.classList.add("show");
  hideTeamHoverPreview();
}

function bindTeamProfileCards(){
  const cards = document.querySelectorAll(".team-player-card");
  cards.forEach(card => {
    if(card.dataset.v31Bound === "1") return;
    card.dataset.v31Bound = "1";

    let holdTimer = null;
    let touchHeld = false;

    const photoZone = card.querySelector(".team-preview-zone");

    if(photoZone){
      photoZone.addEventListener("mouseenter", event => {
        if(window.matchMedia("(hover:hover)").matches) showTeamHoverPreview(card, event);
      });

      photoZone.addEventListener("mousemove", moveTeamHoverPreview);
      photoZone.addEventListener("mouseleave", hideTeamHoverPreview);

      photoZone.addEventListener("touchstart", event => {
        touchHeld = false;
        clearTimeout(holdTimer);
        holdTimer = setTimeout(() => {
          touchHeld = true;
          const touch = event.touches[0];
          showTeamHoverPreview(card, touch);
        }, 650);
      }, { passive: true });

      photoZone.addEventListener("touchmove", event => {
        if(touchHeld && event.touches[0]) showTeamHoverPreview(card, event.touches[0]);
      }, { passive: true });

      photoZone.addEventListener("touchend", () => {
        clearTimeout(holdTimer);
        setTimeout(hideTeamHoverPreview, 450);
      });
    }

    card.addEventListener("click", event => {
      if(event.target.closest("a")) return;
      openTeamProfile(card);
    });
  });

  document.querySelectorAll("[data-team-close]").forEach(btn => {
    if(btn.dataset.closeBound === "1") return;
    btn.dataset.closeBound = "1";
    btn.addEventListener("click", () => {
      document.getElementById("teamProfileModal")?.classList.remove("show");
    });
  });
}

bindTeamProfileCards();


/* V44 - DEBUG/FIX FOR BANNER SLIDER
   Este bloco é isolado para não depender do resto do script.
*/
(function(){
  function log(){
    try { console.log("[Team Lambreta Slider]", ...arguments); } catch(e) {}
  }

  function initBannerSliderV44(){
    const root = document.querySelector(".banner-v22");
    if(!root){
      log("banner-v22 não encontrado nesta página.");
      return;
    }

    const slides = Array.from(root.querySelectorAll(".banner-slide"));
    const dots = Array.from(root.querySelectorAll(".banner-dots button"));
    const prev = root.querySelector("#bannerPrev");
    const next = root.querySelector("#bannerNext");

    log("init", {slides: slides.length, dots: dots.length, prev: !!prev, next: !!next});

    if(!slides.length){
      log("sem slides");
      return;
    }

    let current = slides.findIndex(s => s.classList.contains("active"));
    if(current < 0) current = 0;
    let timer = null;

    function render(index){
      current = (index + slides.length) % slides.length;

      slides.forEach((slide, i) => {
        slide.classList.toggle("active", i === current);
        slide.style.display = i === current ? "block" : "none";
        slide.style.opacity = i === current ? "1" : "0";
        slide.style.pointerEvents = i === current ? "auto" : "none";
      });

      dots.forEach((dot, i) => {
        dot.classList.toggle("active", i === current);
        dot.setAttribute("aria-current", i === current ? "true" : "false");
      });

      log("render slide", current + 1);
    }

    function restart(){
      clearInterval(timer);
      timer = setInterval(() => render(current + 1), 6000);
    }

    if(prev){
      prev.onclick = function(event){
        event.preventDefault();
        event.stopPropagation();
        log("click prev");
        render(current - 1);
        restart();
      };
    }

    if(next){
      next.onclick = function(event){
        event.preventDefault();
        event.stopPropagation();
        log("click next");
        render(current + 1);
        restart();
      };
    }

    dots.forEach((dot, i) => {
      dot.onclick = function(event){
        event.preventDefault();
        event.stopPropagation();
        log("click dot", i + 1);
        render(i);
        restart();
      };
    });

    render(current);
    restart();

    window.teamLambretaSliderDebug = {
      next: () => { render(current + 1); restart(); },
      prev: () => { render(current - 1); restart(); },
      go: (i) => { render(Number(i) || 0); restart(); },
      state: () => ({ current, slides: slides.length, dots: dots.length, prev: !!prev, next: !!next })
    };

    log("pronto. Teste no console: teamLambretaSliderDebug.next()");
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", initBannerSliderV44);
  } else {
    initBannerSliderV44();
  }
})();


/* V45 - banner limpo refeito do zero, sem labels verdes e sem dependência antiga */
(function(){
  function initCleanBanner(){
    const root = document.getElementById("lambretaBanner");
    if(!root) return;

    const slides = Array.from(root.querySelectorAll(".clean-banner-slide"));
    const dots = Array.from(root.querySelectorAll(".clean-banner-dots button"));
    const prev = root.querySelector("#bannerPrev");
    const next = root.querySelector("#bannerNext");

    if(!slides.length) return;

    let current = 0;
    let timer = null;

    function render(index){
      current = (index + slides.length) % slides.length;

      slides.forEach((slide, i) => {
        slide.classList.toggle("active", i === current);
      });

      dots.forEach((dot, i) => {
        dot.classList.toggle("active", i === current);
        dot.setAttribute("aria-current", i === current ? "true" : "false");
      });

      try { console.log("[Banner V45] slide", current + 1); } catch(e) {}
    }

    function restart(){
      clearInterval(timer);
      timer = setInterval(() => render(current + 1), 6500);
    }

    prev && prev.addEventListener("click", (event) => {
      event.preventDefault();
      render(current - 1);
      restart();
    });

    next && next.addEventListener("click", (event) => {
      event.preventDefault();
      render(current + 1);
      restart();
    });

    dots.forEach((dot, index) => {
      dot.addEventListener("click", (event) => {
        event.preventDefault();
        render(index);
        restart();
      });
    });

    render(0);
    restart();

    window.teamLambretaBanner = {
      next: () => { render(current + 1); restart(); },
      prev: () => { render(current - 1); restart(); },
      go: (i) => { render(Number(i) || 0); restart(); },
      state: () => ({ current, slides: slides.length, dots: dots.length })
    };
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", initCleanBanner);
  } else {
    initCleanBanner();
  }
})();

/* V47 — aplica o hover de elevação em Enviar, Salvar e Remover */
(() => {
  const classifyActionButtons = (scope = document) => {
    scope.querySelectorAll?.('button, input[type="submit"], input[type="button"], .lobby-actions a').forEach((button) => {
      const label = String(button.textContent || button.value || '').trim().toLocaleLowerCase('pt-PT');
      if (/^(enviar|salvar|remover)(\b|\s)/i.test(label)) {
        button.classList.add('action-lift-button');
        if (label.startsWith('remover')) button.classList.add('action-remove');
      }
    });
  };

  const initActionButtons = () => {
    classifyActionButtons(document);
    new MutationObserver((mutations) => {
      mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          if (node.matches?.('button, input[type="submit"], input[type="button"], .lobby-actions a')) classifyActionButtons(node.parentElement || document);
          else classifyActionButtons(node);
        }
      }));
    }).observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initActionButtons);
  else initActionButtons();
})();


/* V49 - Streamers, VIP, Hall da Fama e caixa de mensagens */
function formatShortName(fullName){
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if(!parts.length) return "Visitante";
  if(parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1].charAt(0).toUpperCase()}.`;
}

function getDemoGoogleDisplayName(){
  const raw = localStorage.getItem('team_lambreta_google_name_demo') || 'Luiz Eduardo';
  return formatShortName(raw);
}

function vipLevelByDonation(total){
  const value = Number(total || 0);
  if(value >= 150) return { role:'vip3', label:'VIP III', className:'vip3' };
  if(value >= 75) return { role:'vip2', label:'VIP II', className:'vip2' };
  if(value >= 25) return { role:'vip1', label:'VIP I', className:'vip1' };
  return { role:'user', label:'Apoiador', className:'supporter' };
}

function hallCardHTML(item){
  const vip = vipLevelByDonation(item.totalDonated);
  const name = escapeHtml(item.name || 'Apoiador');
  const title = escapeHtml(item.title || 'Hall da Fama');
  const desc = escapeHtml(item.description || 'Apoio ao projeto Team Lambreta.');
  const reward = escapeHtml(item.reward || vip.label);
  const image = item.image ? `<img src="${item.image}" alt="${name}">` : `<div class="hall-avatar">${name.charAt(0)}</div>`;
  return `<article class="hall-card hall-${vip.className}">${image}<div><span class="hall-vip-badge">${vip.label}</span><h3>${name}</h3><strong>${title}</strong><p>${desc}</p><small>€${Number(item.totalDonated || 0).toFixed(0)} acumulados • ${reward}</small></div></article>`;
}

function renderStreamersPage(data){
  const streamGrid = document.getElementById('streamersPublicGrid');
  if(streamGrid){
    const items = data.streamers || [];
    streamGrid.innerHTML = items.length ? items.map(teamCardHTML).join('') : `<article class="empty-card safe-card"><h3>Sem streamers ainda</h3><p>Envia uma candidatura para participar.</p></article>`;
    bindTeamProfileCards();
  }

  const hall = document.getElementById('hallOfFameGrid');
  if(hall){
    const items = data.hallOfFame || [];
    hall.innerHTML = items.length ? items.map(hallCardHTML).join('') : `<article class="empty-card safe-card"><h3>Hall vazio</h3><p>Os apoiadores aparecerão aqui.</p></article>`;
  }

  const inbox = document.getElementById('privateInboxFeed');
  if(inbox){
    const items = data.privateInbox || [];
    inbox.innerHTML = items.length ? items.slice(0,8).map(item => `<article class="inbox-item"><div><span>${escapeHtml(item.type || 'Mensagem')}</span><small>${escapeHtml(item.audience || 'Todos')}</small></div><h3>${escapeHtml(item.title || 'Sem título')}</h3><p>${escapeHtml(item.message || '')}</p><small>Por ${escapeHtml(item.author || 'Admin')}</small></article>`).join('') : `<article class="empty-card safe-card"><h3>Sem mensagens</h3><p>Notícias e respostas aparecerão aqui.</p></article>`;
  }

  const sc = document.getElementById('streamersCount');
  const hc = document.getElementById('hallCount');
  const ic = document.getElementById('inboxCount');
  if(sc) sc.textContent = (data.streamers || []).length;
  if(hc) hc.textContent = (data.hallOfFame || []).length;
  if(ic) ic.textContent = (data.privateInbox || []).length;
}

function bindStreamerApplications(){
  const form = document.getElementById('streamerApplyForm');
  if(form){
    form.addEventListener('submit', event => {
      event.preventDefault();
      const name = document.getElementById('streamerApplyName').value.trim();
      const contact = document.getElementById('streamerApplyContact').value.trim();
      const platform = document.getElementById('streamerApplyPlatform').value.trim();
      const channel = document.getElementById('streamerApplyChannel').value.trim();
      const message = document.getElementById('streamerApplyMessage').value.trim();
      const feedback = document.getElementById('streamerApplyFeedback');
      if(!name || !contact || !platform || !message){
        feedback.textContent = 'Preenche nome, contacto, plataforma e mensagem.';
        feedback.classList.add('error');
        return;
      }
      const data = getTeamData();
      data.streamerApplications.push({ name, contact, platform, channel, message, status:'Pendente', createdAt:new Date().toISOString() });
      data.privateInbox.unshift({ title:`Nova candidatura: ${name}`, message:`${platform} • ${channel || contact}\n${message}`, type:'Parceria', audience:'Admin', author:name, createdAt:new Date().toISOString() });
      saveTeamData(data);
      form.reset();
      feedback.classList.remove('error');
      feedback.textContent = 'Candidatura enviada para a caixa da administração.';
      renderStreamersPage(data);
    });
  }

  const adminForm = document.getElementById('contactAdminForm');
  if(adminForm){
    adminForm.addEventListener('submit', event => {
      event.preventDefault();
      const title = document.getElementById('contactAdminTitle').value.trim();
      const name = document.getElementById('contactAdminName').value.trim();
      const message = document.getElementById('contactAdminMessage').value.trim();
      const feedback = document.getElementById('contactAdminFeedback');
      if(!title || !name || !message){
        feedback.textContent = 'Preenche assunto, nome e mensagem.';
        feedback.classList.add('error');
        return;
      }
      const data = getTeamData();
      data.privateInbox.unshift({ title, message, type:'Admin', audience:'Admin', author:name, createdAt:new Date().toISOString() });
      saveTeamData(data);
      adminForm.reset();
      feedback.classList.remove('error');
      feedback.textContent = 'Mensagem enviada para a caixa da administração.';
      renderStreamersPage(data);
    });
  }
}

bindStreamerApplications();

// V67 — efeito Portugal no menu também em toque no telemóvel.
(() => {
  const menuSelector = '.site-header nav a[href]';
  let touchTimer = null;

  document.addEventListener('touchstart', event => {
    const link = event.target.closest(menuSelector);
    if (!link) return;

    document.querySelectorAll(`${menuSelector}.pt-flag-hover`).forEach(item => {
      if (item !== link) item.classList.remove('pt-flag-hover');
    });

    link.classList.add('pt-flag-hover');
    clearTimeout(touchTimer);
    touchTimer = setTimeout(() => {
      link.classList.remove('pt-flag-hover');
    }, 900);
  }, { passive: true });
})();
