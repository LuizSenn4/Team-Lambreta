let data = getTeamData();

const fields = {
  teamNameInput: ["general", "teamName"],
  sloganInput: ["general", "slogan"],
  heroTitleInput: ["general", "heroTitle"],
  heroTextInput: ["general", "heroText"],
  announcementInput: ["general", "announcement"],
  tiktokInput: ["socials", "tiktok"],
  instagramInput: ["socials", "instagram"],
  youtubeInput: ["socials", "youtube"],
  discordInput: ["socials", "discord"],
  facebookInput: ["socials", "facebook"]
};

const sections = {
  members: {
    id: "membersAdminList",
    title: "MEMBRO",
    labels: ["Nome", "Função/Cargo", "Área (Gamers / Staff)", "Sobre a pessoa", "Foto da pessoa / URL", "Instagram", "TikTok", "Facebook"],
    keys: ["name", "role", "group", "bio", "image", "instagram", "tiktok", "facebook"],
    empty: { name: "", role: "", group: "Gamers", bio: "", image: "", instagram: "", tiktok: "", facebook: "" }
  },
  streamers: {
    id: "streamersAdminList",
    title: "STREAMER",
    labels: ["Nome", "Função/Cargo", "Área", "Sobre a pessoa", "Foto da pessoa / URL", "Instagram", "TikTok", "Facebook"],
    keys: ["name", "role", "group", "bio", "image", "instagram", "tiktok", "facebook"],
    empty: { name: "", role: "Streamer / Criador de conteúdo", group: "Streamers", bio: "", image: "", instagram: "", tiktok: "", facebook: "" }
  },
  hallOfFame: {
    id: "hallOfFameAdminList",
    title: "DESTAQUE",
    labels: ["Nome", "Título", "Descrição", "Total doado (€)", "Mimo / benefício", "Imagem URL"],
    keys: ["name", "title", "description", "totalDonated", "reward", "image"],
    empty: { name: "", title: "Hall da Fama", description: "", totalDonated: 0, reward: "", image: "" }
  },
  forum: {
    id: "forumAdminList",
    title: "TÓPICO",
    labels: ["Título", "Descrição", "Autor/Equipe", "Status", "Fixado"],
    keys: ["title", "description", "author", "status", "fixed"],
    empty: { title: "", description: "", author: "Equipe", status: "Aberto", fixed: false, approved: true }
  },
  privateInbox: {
    id: "privateInboxAdminList",
    title: "MENSAGEM",
    labels: ["Título", "Mensagem", "Tipo", "Público", "Autor"],
    keys: ["title", "message", "type", "audience", "author"],
    empty: { title: "", message: "", type: "Notícia", audience: "Todos", author: "Admin", createdAt: "" }
  },
  events: {
    id: "eventsAdminList",
    title: "EVENTO",
    labels: ["Título", "Data/Descrição", "Imagem URL"],
    keys: ["title", "description", "image"],
    empty: { title: "", description: "", image: "" }
  },
  achievements: {
    id: "achievementsAdminList",
    title: "CONQUISTA",
    labels: ["Título", "Descrição", "Imagem URL"],
    keys: ["title", "description", "image"],
    empty: { title: "", description: "", image: "" }
  },
  media: {
    id: "mediaAdminList",
    title: "MÍDIA",
    labels: ["Título", "Descrição", "Tipo (photo/video/short)", "Foto/Thumb URL", "Link do vídeo/short/reel"],
    keys: ["title", "description", "type", "image", "link"],
    empty: { title: "", description: "", type: "photo", image: "", link: "" }
  },
  store: {
    id: "storeAdminList",
    title: "PRODUTO",
    labels: ["Produto", "Descrição/Preço", "Imagem URL"],
    keys: ["title", "description", "image"],
    empty: { title: "", description: "", image: "" }
  },
  pendingUsers: {
    id: "pendingUsersAdminList",
    title: "USUÁRIO",
    labels: ["Nome", "Email/Contacto", "Status"],
    keys: ["name", "contact", "status"],
    empty: { name: "", contact: "", status: "Pendente" }
  }
};

function fillInputs(){
  Object.entries(fields).forEach(([id,[group,key]])=>{
    const el=document.getElementById(id);
    if(el) el.value = data[group]?.[key] || "";
  });
}

function syncInputsToData(){
  Object.entries(fields).forEach(([id,[group,key]])=>{
    const el=document.getElementById(id);
    if(el) data[group][key] = el.value.trim();
  });
}

function toast(message){
  const box = document.getElementById("toast");
  if(!box) return;
  box.textContent = message;
  box.classList.add("show");
  setTimeout(()=>box.classList.remove("show"), 1800);
}

function inputHTML(type,key,label,item,index){
  const value = item[key];

  if(["bio","message","description"].includes(key) && (String(value || "").length > 70 || ["bio","message"].includes(key))){
    return `<label>${label}<textarea rows="4" maxlength="${key === 'message' ? 500 : 320}" data-field="${key}" data-type="${type}" data-index="${index}">${value || ""}</textarea></label>`;
  }

  if(key === "group" && (type === "members" || type === "streamers")){
    const options = type === "members"
      ? ['Gamers','Staff']
      : ['Streamers','Parceiros'];
    return `<label>${label}<select data-field="${key}" data-type="${type}" data-index="${index}">${options.map(opt => `<option ${value===opt?"selected":""}>${opt}</option>`).join("")}</select></label>`;
  }

  if(key === "type" && type === "media"){
    return `<label>${label}<select data-field="${key}" data-type="${type}" data-index="${index}"><option value="photo" ${value==="photo"?"selected":""}>photo</option><option value="video" ${value==="video"?"selected":""}>video</option><option value="short" ${value==="short"?"selected":""}>short</option></select></label>`;
  }

  if(key === "type" && type === "privateInbox"){
    return `<label>${label}<select data-field="${key}" data-type="${type}" data-index="${index}"><option ${value==="Notícia"?"selected":""}>Notícia</option><option ${value==="Evento"?"selected":""}>Evento</option><option ${value==="Admin"?"selected":""}>Admin</option><option ${value==="Parceria"?"selected":""}>Parceria</option></select></label>`;
  }

  if(key === "audience" && type === "privateInbox"){
    return `<label>${label}<select data-field="${key}" data-type="${type}" data-index="${index}"><option ${value==="Todos"?"selected":""}>Todos</option><option ${value==="Streamers"?"selected":""}>Streamers</option><option ${value==="VIP"?"selected":""}>VIP</option><option ${value==="Admin"?"selected":""}>Admin</option></select></label>`;
  }

  if(key === "status" && type === "forum"){
    return `<label>${label}<select data-field="${key}" data-type="${type}" data-index="${index}"><option ${value==="Aberto"?"selected":""}>Aberto</option><option ${value==="Fechado"?"selected":""}>Fechado</option></select></label>`;
  }

  if(key === "status" && type === "pendingUsers"){
    return `<label>${label}<select data-field="${key}" data-type="${type}" data-index="${index}"><option ${value==="Pendente"?"selected":""}>Pendente</option><option ${value==="Aceito"?"selected":""}>Aceito</option><option ${value==="Recusado"?"selected":""}>Recusado</option></select></label>`;
  }

  if(key === "fixed"){
    return `<label class="check-row"><input type="checkbox" data-field="${key}" data-type="${type}" data-index="${index}" ${value ? "checked" : ""}>Fixado</label>`;
  }

  if(key === "image"){
    const preview = value ? `<img class="admin-upload-preview" src="${value}" alt="Preview">` : `<div class="admin-upload-empty">Sem imagem</div>`;
    return `<label>${label}<input maxlength="5000000" data-field="${key}" data-type="${type}" data-index="${index}" value="${value || ""}" placeholder="Cole um link ou carregue uma imagem"><div class="admin-upload-row"><input class="admin-file-input" type="file" accept="image/*" data-file-field="${key}" data-type="${type}" data-index="${index}">${preview}</div></label>`;
  }

  if(key === "link" && type === "media"){
    return `<label>${label}<input maxlength="5000000" data-field="${key}" data-type="${type}" data-index="${index}" value="${value || ""}" placeholder="YouTube, Shorts, TikTok, Reel ou link direto"><small class="admin-help-note">Para shorts/reels, cola o link aqui. Para vídeo local pequeno, podes carregar abaixo.</small><input class="admin-file-input" type="file" accept="video/*" data-file-field="${key}" data-type="${type}" data-index="${index}"></label>`;
  }

  const max = key === "name" ? 24 : key === "title" ? 60 : key === "reward" ? 80 : key === "totalDonated" ? 8 : 180;
  const typeAttr = key === "totalDonated" ? 'type="number" min="0" step="1"' : '';
  return `<label>${label}<input ${typeAttr} maxlength="${max}" data-field="${key}" data-type="${type}" data-index="${index}" value="${value ?? ""}"></label>`;
}

function createItemHTML(type,item,index){
  const cfg = sections[type];
  return `<article class="admin-item"><div class="item-top"><strong>${cfg.title} #${index+1}</strong><div class="item-actions"><button data-save-item="${type}" data-index="${index}" type="button">Salvar este</button><button class="danger" data-remove="${type}" data-index="${index}">Remover</button></div></div><div class="form-grid">${cfg.keys.map((key,i)=>inputHTML(type,key,cfg.labels[i],item,index)).join("")}</div></article>`;
}

function renderGenericList(type){
  const cfg = sections[type];
  const container = document.getElementById(cfg.id);
  if(!container) return;
  const items = data[type] || [];
  container.innerHTML = items.length ? items.map((item,index)=>createItemHTML(type,item,index)).join("") : `<div class="empty-admin">Nada cadastrado ainda.</div>`;
}

function renderPendingForum(){
  const container = document.getElementById("pendingForumAdminList");
  if(!container) return;
  const items = data.pendingForum || [];
  if(!items.length){ container.innerHTML = `<div class="empty-admin">Nenhum tópico pendente.</div>`; return; }

  container.innerHTML = items.map((item,index)=>`<article class="admin-item pending-topic"><div class="item-top"><strong>${item.title || "Tópico sem título"}</strong><span class="pill">Pendente</span></div><p><b>Autor:</b> ${item.author || "Visitante"}</p><p>${item.description || "Sem descrição"}</p><div class="pending-actions"><button data-approve-topic="${index}">Aprovar</button><button class="danger" data-reject-topic="${index}">Recusar</button></div></article>`).join("");
}

function renderStreamerApplications(){
  const container = document.getElementById("streamerApplicationsAdminList");
  if(!container) return;
  const items = data.streamerApplications || [];
  if(!items.length){ container.innerHTML = `<div class="empty-admin">Nenhuma candidatura recebida ainda.</div>`; return; }

  container.innerHTML = items.map((item,index)=>`<article class="admin-item pending-topic"><div class="item-top"><strong>${item.name || 'Sem nome'}</strong><span class="pill">${item.platform || 'Streamer'}</span></div><p><b>Contacto:</b> ${item.contact || 'Sem contacto'}</p><p><b>Canal:</b> ${item.channel || 'Sem canal'}</p><p>${item.message || 'Sem mensagem.'}</p><div class="pending-actions"><button data-approve-streamer="${index}">Aprovar e abrir perfil</button><button class="danger" data-reject-streamer="${index}">Recusar</button></div></article>`).join("");
}

function normalizeSocialValue(value, network){
  const raw = String(value || "").trim();
  if(!raw) return "";
  if(raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  const clean = raw.replace(/^@/, "").replace(/^instagram\//i, "").replace(/^tiktok\//i, "").replace(/^facebook\//i, "");
  if(network === "instagram") return "https://instagram.com/" + clean;
  if(network === "tiktok") return "https://www.tiktok.com/@" + clean.replace(/^@/, "");
  if(network === "facebook") return "https://facebook.com/" + clean;
  return raw;
}

function normalizeAdminData(){
  ["members", "streamers"].forEach(listName => {
    if(Array.isArray(data[listName])){
      data[listName].forEach(item => {
        item.instagram = normalizeSocialValue(item.instagram, "instagram");
        item.tiktok = normalizeSocialValue(item.tiktok, "tiktok");
        item.facebook = normalizeSocialValue(item.facebook, "facebook");
      });
    }
  });

  if(Array.isArray(data.privateInbox)){
    data.privateInbox.forEach(item => {
      if(!item.createdAt) item.createdAt = new Date().toISOString();
    });
  }
}

function saveAdminData(message = "Salvo com sucesso."){
  syncInputsToData();
  normalizeAdminData();
  saveTeamData(data);
  toast(message);
}

function renderAdminLists(){
  ["members","streamers","hallOfFame","forum","privateInbox","events","achievements","media","store","pendingUsers"].forEach(renderGenericList);
  renderPendingForum();
  renderStreamerApplications();
}

fillInputs();
renderAdminLists();

function rerenderAndSave(message){
  renderAdminLists();
  saveAdminData(message);
}

document.addEventListener("input", event=>{
  const el = event.target;
  const type = el.dataset.type;
  const index = Number(el.dataset.index);
  const field = el.dataset.field;
  if(type && field && data[type] && data[type][index]){
    data[type][index][field] = el.type === "checkbox" ? el.checked : el.value;
  }
});

document.addEventListener("change", event=>{
  const el = event.target;
  const type = el.dataset.type;
  const index = Number(el.dataset.index);
  const field = el.dataset.field;
  if(type && field && data[type] && data[type][index]){
    data[type][index][field] = el.type === "checkbox" ? el.checked : el.value;
  }
});

document.addEventListener("change", event=>{
  const fileInput = event.target.closest("[data-file-field]");
  if(!fileInput) return;
  const type = fileInput.dataset.type;
  const index = Number(fileInput.dataset.index);
  const field = fileInput.dataset.fileField;
  const file = fileInput.files && fileInput.files[0];
  if(!type || Number.isNaN(index) || !field || !file || !data[type] || !data[type][index]) return;
  const isVideo = file.type.startsWith("video/");
  const maxBytes = isVideo ? 5 * 1024 * 1024 : 2 * 1024 * 1024;
  if(file.size > maxBytes){
    alert(isVideo ? "Vídeo muito pesado para demo local. Usa link YouTube/TikTok/Shorts por enquanto." : "Imagem muito pesada. Usa uma imagem até 2MB.");
    fileInput.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    data[type][index][field] = reader.result;
    rerenderAndSave("Arquivo carregado e salvo.");
  };
  reader.readAsDataURL(file);
});

document.addEventListener("click", event=>{
  const addType = event.target.dataset.add;
  const removeType = event.target.dataset.remove;
  const approveIndex = event.target.dataset.approveTopic;
  const rejectIndex = event.target.dataset.rejectTopic;
  const saveItemType = event.target.dataset.saveItem;
  const approveStreamerIndex = event.target.dataset.approveStreamer;
  const rejectStreamerIndex = event.target.dataset.rejectStreamer;

  if(saveItemType && sections[saveItemType]){ saveAdminData("Item salvo com sucesso."); return; }

  if(addType && sections[addType]){
    const entry = { ...sections[addType].empty };
    if(addType === 'privateInbox' && !entry.createdAt) entry.createdAt = new Date().toISOString();
    data[addType].push(entry);
    renderAdminLists();
    return;
  }

  if(removeType && sections[removeType]){
    data[removeType].splice(Number(event.target.dataset.index), 1);
    rerenderAndSave("Item removido.");
    return;
  }

  if(approveIndex !== undefined){
    const topic = data.pendingForum.splice(Number(approveIndex), 1)[0];
    if(topic){
      topic.approved = true;
      topic.status = topic.status || "Aberto";
      data.forum.push(topic);
    }
    rerenderAndSave("Tópico aprovado.");
    return;
  }

  if(rejectIndex !== undefined){
    data.pendingForum.splice(Number(rejectIndex), 1);
    rerenderAndSave("Tópico recusado.");
    return;
  }

  if(approveStreamerIndex !== undefined){
    const application = data.streamerApplications.splice(Number(approveStreamerIndex), 1)[0];
    if(application){
      data.streamers.push({
        name: application.name || "Novo streamer",
        role: application.platform ? `Streamer / ${application.platform}` : "Streamer / Parceiro",
        group: "Streamers",
        bio: application.message || "Perfil aprovado pela administração.",
        image: "",
        instagram: application.instagram || application.contact || "",
        tiktok: application.tiktok || application.channel || "",
        facebook: application.facebook || ""
      });
      data.privateInbox.unshift({
        title: `Candidatura aprovada: ${application.name || 'Streamer'}`,
        message: "A administração aprovou a candidatura e abriu o perfil na área de streamers.",
        type: "Admin",
        audience: "Streamers",
        author: "Admin",
        createdAt: new Date().toISOString()
      });
    }
    rerenderAndSave("Streamer aprovado e perfil criado.");
    return;
  }

  if(rejectStreamerIndex !== undefined){
    data.streamerApplications.splice(Number(rejectStreamerIndex), 1);
    rerenderAndSave("Candidatura removida.");
    return;
  }
});

document.getElementById("saveAllBtn")?.addEventListener("click",()=> saveAdminData("Tudo salvo com sucesso."));
