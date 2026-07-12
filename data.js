const DEFAULT_TEAM_DATA = {
  general: {
    teamName: "TEAM LAMBRETA",
    slogan: "Lambreta é uma família",
    heroTitle: "Bem-vindo ao Team Lambreta",
    heroText: "Foco, garra, lealdade, disciplina e família. Este é o lobby oficial do Team Lambreta.",
    announcement: "O lobby está aberto. Em breve teremos eventos, tópicos e novidades."
  },
  socials: { tiktok: "", instagram: "", youtube: "", discord: "", facebook: "" },
  members: [
    {
      name: "Lambreta Prime",
      role: "Gamer / Entry Fragger",
      group: "Gamers",
      bio: "Jogador agressivo, foco em rush, pressão e abrir espaço para o team.",
      image: "",
      instagram: "",
      tiktok: "",
      facebook: ""
    },
    {
      name: "Mod Guard",
      role: "Staff / Moderador",
      group: "Staff",
      bio: "Apoio da comunidade, organização do lobby, moderação do chat e ajuda nos eventos internos.",
      image: "",
      instagram: "",
      tiktok: "",
      facebook: ""
    }
  ],
  streamers: [
    {
      name: "Live Rider",
      role: "Streamer / Criador de conteúdo",
      group: "Streamers",
      bio: "Responsável por lives, clips, highlights e presença nas redes. Perfil de exemplo para streamers do Team Lambreta.",
      image: "",
      instagram: "",
      tiktok: "",
      facebook: ""
    }
  ],
  forum: [],
  pendingForum: [],
  pendingUsers: [],
  streamerApplications: [],
  privateInbox: [
    {
      title: "Bem-vindo ao centro de mensagens",
      message: "Aqui vão aparecer notícias, eventos, respostas da administração e candidaturas de streamers.",
      type: "Notícia",
      audience: "Todos",
      author: "Admin",
      createdAt: new Date().toISOString()
    }
  ],
  hallOfFame: [
    {
      name: "Apoiador de Exemplo",
      title: "Hall da Fama",
      description: "Apoio inicial ao projeto Team Lambreta.",
      totalDonated: 25,
      reward: "Apoiador Bronze",
      image: ""
    }
  ],
  events: [],
  achievements: [],
  media: [],
  store: []
};

function cloneDefaultData() {
  return JSON.parse(JSON.stringify(DEFAULT_TEAM_DATA));
}

function isStreamerProfile(item) {
  const raw = String(item?.group || item?.role || "").toLowerCase();
  return raw.includes("stream");
}

function splitLegacyMembers(members = []) {
  const cleanMembers = [];
  const cleanStreamers = [];
  members.forEach(item => {
    if (isStreamerProfile(item)) cleanStreamers.push({ ...item, group: "Streamers" });
    else cleanMembers.push({ ...item });
  });
  return { cleanMembers, cleanStreamers };
}

function getTeamData() {
  const saved = localStorage.getItem("team_lambreta_data_v1");
  if (!saved) return cloneDefaultData();

  try {
    const parsed = JSON.parse(saved);
    const base = cloneDefaultData();
    const legacySplit = splitLegacyMembers(parsed.members || []);
    const members = Array.isArray(parsed.members)
      ? (Array.isArray(parsed.streamers) ? legacySplit.cleanMembers : legacySplit.cleanMembers)
      : base.members;
    const streamers = Array.isArray(parsed.streamers)
      ? parsed.streamers
      : legacySplit.cleanStreamers.length
        ? legacySplit.cleanStreamers
        : base.streamers;

    return {
      ...base,
      ...parsed,
      general: { ...base.general, ...(parsed.general || {}) },
      socials: { ...base.socials, ...(parsed.socials || {}) },
      members: members.length ? members : base.members,
      streamers: streamers.length ? streamers : base.streamers,
      forum: parsed.forum || [],
      pendingForum: parsed.pendingForum || [],
      pendingUsers: parsed.pendingUsers || [],
      streamerApplications: parsed.streamerApplications || [],
      privateInbox: parsed.privateInbox || base.privateInbox,
      hallOfFame: parsed.hallOfFame || base.hallOfFame,
      events: parsed.events || [],
      achievements: parsed.achievements || [],
      media: parsed.media || [],
      store: parsed.store || []
    };
  } catch {
    return cloneDefaultData();
  }
}

function saveTeamData(data) {
  localStorage.setItem("team_lambreta_data_v1", JSON.stringify(data));
}
