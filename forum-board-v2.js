(() => {
  "use strict";

  const sb = window.teamSupabase;
  if (!sb) return;

  const $ = (id) => document.getElementById(id);
  const gate = $("forumMemberGate");
  const app = $("forumApplication");
  const view = $("forumBoardView");
  const crumbs = $("forumBreadcrumbs");
  const feedback = $("forumFeedback");
  if (feedback) document.body.append(feedback);
  const RETURN_KEY = "tl_forum_return_v1";
  const MOD_ROLES = new Set([
    "master",
    "dev",
    "admin",
    "staff",
    "moderator",
    "moderador",
    "boss",
  ]);
  let session = null;
  let profile = null;
  let categories = [];
  let sections = [];
  let topics = [];
  let posts = [];
  let gameCatalog = [];
  const selectedGames = new Set();
  const selectedPlatforms = new Set();
  const selectedModes = new Set();
  const PLATFORM_OPTIONS = [
    ["pc", "PC"],
    ["playstation-5", "PlayStation 5"],
    ["playstation-4", "PlayStation 4"],
    ["xbox-series", "Xbox Series X|S"],
    ["xbox-one", "Xbox One"],
    ["nintendo-switch", "Nintendo Switch"],
    ["nintendo-switch-2", "Nintendo Switch 2"],
    ["android", "Android"],
    ["ios", "iOS"],
    ["cloud-gaming", "Cloud Gaming"],
  ];
  const profiles = new Map();
  const forumProfiles = new Map();
  const progress = new Map();
  const postReactions = new Map();
  const editorMentions = new WeakMap();
  let currentForumProfile = null;
  let quotePostId = null;
  let editingPostId = null;
  let deletingPostId = null;
  let deletingPostKind = "reply";
  let mentionPreview = null;
  let gameResultsOpen = false;
  let countryResultsOpen = false;
  let selectedCountryCode = "";
  let sharePopover = null;
  let activeShareTrigger = null;
  let topicModerationController = null;
  const countryCatalog = window.TeamCountryCatalog;
  const shareIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a3 3 0 1 0-2.83-4A3 3 0 0 0 15 5c0 .2.02.39.06.57L8.91 9.1A3 3 0 1 0 9 14.78l6.13 3.5A3 3 0 1 0 16 16.55l-6.12-3.49c.08-.34.1-.7.06-1.05l6.16-3.54c.52.34 1.18.53 1.9.53Z"/></svg>`;
  const trashIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-3 6h12l-1 12H7L6 9Zm3 2v7h2v-7H9Zm4 0v7h2v-7h-2Z"/></svg>`;
  const moderationIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>`;
  const likeIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.4 10.2 11 3.8c.5-.9 1.7-1.2 2.5-.6.6.4.9 1.2.7 1.9l-.9 3.5h4.9c1.7 0 2.9 1.6 2.4 3.2l-1.8 6.1c-.3 1.1-1.3 1.8-2.4 1.8H7.4V10.2Z"/><path d="M3.2 10.2h4.2v9.5H3.2z"/></svg>`;
  const dislikeIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.4 13.8 11 20.2c.5.9 1.7 1.2 2.5.6.6-.4.9-1.2.7-1.9l-.9-3.5h4.9c1.7 0 2.9-1.6 2.4-3.2l-1.8-6.1c-.3-1.1-1.3-1.8-2.4-1.8H7.4v9.5Z"/><path d="M3.2 4.3h4.2v9.5H3.2z"/></svg>`;

  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  const fmt = (value) =>
    new Intl.DateTimeFormat("pt-PT", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  const fmtDate = (value) =>
    new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  const relative = (value) => {
    const seconds = Math.max(
      0,
      Math.round((Date.now() - new Date(value).getTime()) / 1000),
    );
    if (seconds < 60) return "agora";
    if (seconds < 3600) return `há ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `há ${Math.floor(seconds / 3600)} h`;
    if (seconds < 604800) return `há ${Math.floor(seconds / 86400)} d`;
    return fmt(value);
  };
  const currentUrl = () =>
    `${location.pathname}${location.search}${location.hash}`;
  const safeReturn = (value) => {
    try {
      const url = new window.URL(value, location.origin);
      return url.origin === location.origin &&
        /\/forum\.html$/.test(url.pathname)
        ? `${url.pathname}${url.search}${url.hash}`
        : "/forum.html";
    } catch (_) {
      return "/forum.html";
    }
  };
  const params = () => new URLSearchParams(location.search);
  const person = (id) => ({
    ...(profiles.get(id) || {
      full_name: "Membro",
      game_nickname: "",
      role: "member",
    }),
    ...(forumProfiles.get(id) || {}),
  });
  const personName = (id) =>
    person(id).forum_nickname ||
    person(id).game_nickname ||
    person(id).full_name ||
    "Membro";
  const role = (id) => String(person(id).role || "member").toLowerCase();
  const roleLabel = (id) =>
    ({
      master: "DEV",
      dev: "DEV",
      admin: "ADMIN",
      staff: "STAFF",
      moderator: "MODERADOR",
      moderador: "MODERADOR",
      boss: "BOSS",
      streamer: "STREAMER",
    })[role(id)] || "MEMBRO";
  const isModerator = () =>
    MOD_ROLES.has(String(profile?.role || "").toLowerCase());
  const gameBySlug = (slug) => gameCatalog.find((game) => game.slug === slug);
  const gameSlugs = (member) =>
    Array.isArray(member?.games) && member.games.length
      ? member.games
      : gameCatalog
          .filter(
            (game) =>
              member?.main_game &&
              [game.name, game.short_name]
                .map((value) => value.toLocaleLowerCase("pt-PT"))
                .includes(member.main_game.toLocaleLowerCase("pt-PT")),
          )
          .map((game) => game.slug)
          .slice(0, 1);
  const gameLabels = (member, short = true) =>
    gameSlugs(member)
      .map((slug) => gameBySlug(slug))
      .filter(Boolean)
      .map((game) => (short ? game.short_name : game.name));
  const platformLabel = (slug) =>
    PLATFORM_OPTIONS.find(([value]) => value === slug)?.[1] || slug;
  const gameChips = (member) => {
    const labels = gameLabels(member);
    return labels.length
      ? `<span class="forum-public-chips">${labels.map((label) => `<span>${esc(label)}</span>`).join("")}</span>`
      : "—";
  };

  function notify(message, error = false) {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.classList.toggle("is-error", error);
    feedback.classList.add("is-visible");
    clearTimeout(notify.timer);
    notify.timer = setTimeout(
      () => feedback.classList.remove("is-visible"),
      3500,
    );
  }

  function renderTlMark(value) {
    let output = esc(value || "");
    output = output.replace(
      /\[mention=([0-9a-f-]{36})\][\s\S]*?\[\/mention\]/gi,
      (_all, userId) => {
        if (!forumProfiles.has(userId) && !profiles.has(userId))
          return "@Membro";
        return `<button type="button" class="forum-mention role-${esc(role(userId))}" data-forum-mention="${esc(userId)}">@${esc(personName(userId))}</button>`;
      },
    );
    output = output.replace(
      /\[code\]([\s\S]*?)\[\/code\]/gi,
      "<pre><code>$1</code></pre>",
    );
    output = output.replace(
      /\[quote\]([\s\S]*?)\[\/quote\]/gi,
      "<blockquote>$1</blockquote>",
    );
    output = output.replace(/\[b\]([\s\S]*?)\[\/b\]/gi, "<strong>$1</strong>");
    output = output.replace(/\[i\]([\s\S]*?)\[\/i\]/gi, "<em>$1</em>");
    output = output.replace(/\[u\]([\s\S]*?)\[\/u\]/gi, "<u>$1</u>");
    output = output.replace(
      /\[url=(https?:\/\/[^\]\s]+)\]([\s\S]*?)\[\/url\]/gi,
      '<a href="$1" target="_blank" rel="noopener noreferrer nofollow">$2</a>',
    );
    output = output.replace(
      /\[list\]([\s\S]*?)\[\/list\]/gi,
      (_all, content) => {
        const items = content.split(/\[\*\]/).filter((item) => item.trim());
        return `<ul>${items.map((item) => `<li>${item.trim()}</li>`).join("")}</ul>`;
      },
    );
    return output.replace(/\n/g, "<br>");
  }

  function plainMentions(value) {
    return String(value || "").replace(
      /\[mention=([0-9a-f-]{36})\]([\s\S]*?)\[\/mention\]/gi,
      (_all, userId, label) =>
        forumProfiles.has(userId) || profiles.has(userId)
          ? `@${personName(userId)}`
          : String(label || "@Membro").replace(/^@?/, "@"),
    );
  }

  function hydrateEditorValue(textarea, value = "") {
    const mentions = new Map();
    String(value || "").replace(
      /\[mention=([0-9a-f-]{36})\][\s\S]*?\[\/mention\]/gi,
      (_all, userId) => {
        if (forumProfiles.has(userId) || profiles.has(userId))
          mentions.set(userId, personName(userId));
        return _all;
      },
    );
    editorMentions.set(textarea, mentions);
    textarea.value = plainMentions(value);
  }

  function rememberEditorMention(textarea, userId) {
    const mentions = editorMentions.get(textarea) || new Map();
    mentions.set(userId, personName(userId));
    editorMentions.set(textarea, mentions);
  }

  function serializeEditorValue(textarea) {
    let value = textarea.value;
    const mentions = [
      ...(editorMentions.get(textarea) || new Map()).entries(),
    ].sort((a, b) => b[1].length - a[1].length);
    mentions.forEach(([userId, nick]) => {
      const escapedNick = nick.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const matcher = new RegExp(
        `(^|[^\\p{L}\\p{N}_.-])@${escapedNick}(?![\\p{L}\\p{N}_.-])`,
        "giu",
      );
      value = value.replace(
        matcher,
        (_all, prefix) => `${prefix}[mention=${userId}]@${nick}[/mention]`,
      );
    });
    return value;
  }

  const avatarMarkup = (userId, sizeClass = "") => {
    const member = person(userId);
    const name = personName(userId);
    const source =
      member.avatar_external_url ||
      member.avatar_signed_url ||
      member.avatar_url;
    return source
      ? `<img class="forum-user-avatar ${sizeClass}" src="${esc(source)}" alt="Avatar de ${esc(name)}" data-avatar-name="${esc(name)}">`
      : `<span class="forum-avatar-fallback ${sizeClass}" aria-label="Avatar padrão de ${esc(name)}">${esc(name.slice(0, 1).toUpperCase())}</span>`;
  };

  function bindAvatarFallbacks(root = document) {
    root.querySelectorAll("img[data-avatar-name]").forEach((image) => {
      const fallback = () => {
        const replacement = document.createElement("span");
        replacement.className = image.className.replace(
          "forum-user-avatar",
          "forum-avatar-fallback",
        );
        replacement.setAttribute(
          "aria-label",
          `Avatar padrão de ${image.dataset.avatarName}`,
        );
        replacement.textContent = image.dataset.avatarName
          .slice(0, 1)
          .toUpperCase();
        image.replaceWith(replacement);
      };
      image.addEventListener("error", fallback, { once: true });
      if (image.complete && !image.naturalWidth) fallback();
    });
  }

  function ownForumStats(userId) {
    const validTopicIds = new Set(
      posts
        .filter((post) => post.is_original && !post.deleted_at)
        .map((post) => post.topic_id),
    );
    const topicCount = topics.filter(
      (topic) =>
        topic.author_id === userId &&
        topic.status === "approved" &&
        validTopicIds.has(topic.id),
    ).length;
    const postCount = posts.filter((post) =>
      post.author_id === userId &&
      !post.deleted_at &&
      validTopicIds.has(post.topic_id),
    ).length;
    const global = progress.get(userId) || {};
    return {
      topics: Number(global.forum_topics ?? topicCount),
      posts: Number(
        global.forum_replies ?? Math.max(0, postCount - topicCount),
      ),
      totalPosts: postCount,
      xp: Number(global.xp || 0),
      likes: Number(global.forum_likes || 0),
      accountCreatedAt: global.account_created_at || null,
    };
  }

  const topicOriginalRemoved = (topicId) =>
    posts.some(
      (post) =>
        post.topic_id === topicId && post.is_original && post.deleted_at,
    );
  const topicAllowsReplies = (topic) =>
    Boolean(
      topic &&
        topic.status === "approved" &&
        !topic.is_locked &&
        !topic.is_closed &&
        posts.some(
          (post) =>
            post.topic_id === topic.id &&
            post.is_original &&
            !post.deleted_at,
        ),
    );

  function topicStateBadges(topic) {
    return [
      topic.is_pinned
        ? '<span class="forum-topic-badge is-pinned">FIXADO</span>'
        : "",
      topic.is_locked
        ? '<span class="forum-topic-badge is-locked">TRANCADO</span>'
        : "",
      topic.is_closed
        ? '<span class="forum-topic-badge is-closed">FECHADO</span>'
        : "",
    ].join("");
  }

  function applyEditorTag(textarea, open, close = open) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.slice(start, end);
    textarea.setRangeText(`${open}${selected}${close}`, start, end, "select");
    textarea.focus();
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function setupEditors() {
    const tools = [
      ["B", "Negrito", "[b]", "[/b]"],
      ["I", "Itálico", "[i]", "[/i]"],
      ["U", "Sublinhado", "[u]", "[/u]"],
      ["❝", "Citação", "[quote]", "[/quote]"],
      ["☷", "Lista", "[list]\n[*]", "\n[/list]"],
      ["🔗", "Link", "[url=https://]", "[/url]"],
      ["</>", "Código", "[code]", "[/code]"],
    ];
    document.querySelectorAll(".forum-editor").forEach((editor) => {
      const textarea = editor.querySelector("textarea");
      const toolbar = editor.querySelector(".forum-editor-toolbar");
      const preview = editor.querySelector(".forum-editor-preview");
      editorMentions.set(textarea, new Map());
      toolbar.innerHTML = `${tools.map(([label, title, open, close]) => `<button type="button" title="${title}" aria-label="${title}" data-open="${esc(open)}" data-close="${esc(close)}">${label}</button>`).join("")}<span class="forum-editor-emojis" aria-label="Emojis">${["😊", "😂", "❤️", "👍", "🔥", "🎮", "🛵", "🏆"].map((emoji) => `<button type="button" data-emoji="${emoji}" aria-label="Inserir ${emoji}">${emoji}</button>`).join("")}</span><button type="button" data-preview>Pré-visualizar</button>`;
      toolbar
        .querySelectorAll("[data-open]")
        .forEach((button) =>
          button.addEventListener("click", () =>
            applyEditorTag(textarea, button.dataset.open, button.dataset.close),
          ),
        );
      toolbar
        .querySelectorAll("[data-emoji]")
        .forEach((button) =>
          button.addEventListener("click", () =>
            applyEditorTag(textarea, button.dataset.emoji, ""),
          ),
        );
      toolbar
        .querySelector("[data-preview]")
        ?.addEventListener("click", (event) => {
          preview.hidden = !preview.hidden;
          textarea.hidden = !preview.hidden;
          if (!preview.hidden)
            preview.innerHTML =
              renderTlMark(serializeEditorValue(textarea)) ||
              "<em>Sem conteúdo.</em>";
          event.currentTarget.textContent = preview.hidden
            ? "Pré-visualizar"
            : "Continuar editando";
        });
      if (editor.dataset.editor === "reply")
        setupMentionAutocomplete(editor, textarea);
    });
  }

  function topicParticipants(topicId) {
    const recent = posts
      .filter((post) => post.topic_id === topicId && !post.deleted_at && !post.is_deleted)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, 20)
      .map((post) => post.author_id);
    return [...new Set(recent)]
      .filter((userId) => userId !== session?.user?.id)
      .filter((userId) => forumProfiles.has(userId) || profiles.has(userId));
  }

  function mentionQuery(textarea) {
    const beforeCaret = textarea.value.slice(0, textarea.selectionStart);
    const match = beforeCaret.match(/(?:^|\s)@([A-Za-zÀ-ÖØ-öø-ÿ0-9_.-]*)$/u);
    return match
      ? {
          query: match[1],
          start: textarea.selectionStart - match[1].length - 1,
        }
      : null;
  }

  function setupMentionAutocomplete(editor, textarea) {
    const list = document.createElement("div");
    list.className = "forum-mention-autocomplete";
    list.hidden = true;
    list.setAttribute("role", "listbox");
    list.setAttribute("aria-label", "Participantes do tópico");
    editor.append(list);
    let activeIndex = 0;
    let matches = [];

    const close = () => {
      list.hidden = true;
      matches = [];
      textarea.removeAttribute("aria-activedescendant");
    };
    const paint = () => {
      list
        .querySelectorAll("[data-mention-option]")
        .forEach((option, index) => {
          option.classList.toggle("is-active", index === activeIndex);
          option.setAttribute("aria-selected", String(index === activeIndex));
        });
      const active = list.querySelectorAll("[data-mention-option]")[
        activeIndex
      ];
      if (active) {
        textarea.setAttribute("aria-activedescendant", active.id);
        active.scrollIntoView({ block: "nearest" });
      }
    };
    const select = (userId) => {
      const context = mentionQuery(textarea);
      if (!context || !matches.includes(userId)) return close();
      const visibleMention = `@${personName(userId)} `;
      rememberEditorMention(textarea, userId);
      textarea.setRangeText(
        visibleMention,
        context.start,
        textarea.selectionStart,
        "end",
      );
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      close();
      textarea.focus();
    };
    const update = () => {
      const context = mentionQuery(textarea);
      if (!context) return close();
      const needle = context.query.toLocaleLowerCase("pt-PT");
      matches = topicParticipants(params().get("topic"))
        .filter((userId) =>
          personName(userId).toLocaleLowerCase("pt-PT").includes(needle),
        )
        .slice(0, 20);
      activeIndex = 0;
      list.hidden = false;
      list.innerHTML = matches.length
        ? matches
            .map((userId, index) => {
              const member = person(userId);
              const detail = [roleLabel(userId), ...gameLabels(member)]
                .filter(Boolean)
                .join(" · ");
              return `<button id="forum-mention-option-${index}" type="button" role="option" data-mention-option="${esc(userId)}">${avatarMarkup(userId, "is-mention")}<span><strong class="role-${esc(role(userId))}">${esc(personName(userId))}</strong><small>${esc(detail)}</small></span></button>`;
            })
            .join("")
        : '<p class="forum-mention-empty">Nenhum outro participante encontrado.</p>';
      list.querySelectorAll("[data-mention-option]").forEach((option) => {
        option.addEventListener("pointerdown", (event) =>
          event.preventDefault(),
        );
        option.addEventListener("click", () =>
          select(option.dataset.mentionOption),
        );
      });
      paint();
    };
    textarea.setAttribute("aria-autocomplete", "list");
    textarea.addEventListener("input", update);
    textarea.addEventListener("click", update);
    textarea.addEventListener("keydown", (event) => {
      if (list.hidden) return;
      if (event.key === "Escape") {
        event.preventDefault();
        return close();
      }
      if (!matches.length) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        activeIndex =
          (activeIndex +
            (event.key === "ArrowDown" ? 1 : -1) +
            matches.length) %
          matches.length;
        return paint();
      }
      if (event.key === "Enter") {
        event.preventDefault();
        select(matches[activeIndex]);
      }
    });
    textarea.addEventListener("blur", () => setTimeout(close, 120));
  }

  function setUrl(next, replace = false) {
    const url = new window.URL("forum.html", location.href);
    Object.entries(next).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
    const target = `${url.pathname}${url.search}`;
    history[replace ? "replaceState" : "pushState"]({}, "", target);
    renderRoute();
  }

  async function loginGoogle() {
    sessionStorage.setItem(RETURN_KEY, safeReturn(currentUrl()));
    const redirectTo = `${location.origin}${location.pathname}${location.search}`;
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) notify("Não foi possível iniciar o login Google.", true);
  }

  async function loadProfile() {
    const { data } = await sb
      .from("profiles")
      .select("id,full_name,game_nickname,role")
      .eq("id", session.user.id)
      .maybeSingle();
    profile = data || null;
  }

  const profileReady = () => Boolean(currentForumProfile?.forum_nickname);

  async function signAvatarUrls(items) {
    const paths = [
      ...new Set(items.map((item) => item.avatar_path).filter(Boolean)),
    ];
    if (!paths.length) return;
    const { data, error } = await sb.storage
      .from("forum-avatars")
      .createSignedUrls(paths, 3600);
    if (error)
      return console.warn("[TL Fórum] avatares", { message: error.message });
    (data || []).forEach((signed, index) => {
      const owner = items.find((item) => item.avatar_path === paths[index]);
      if (owner && signed.signedUrl) owner.avatar_signed_url = signed.signedUrl;
    });
  }

  async function loadBoard() {
    view.setAttribute("aria-busy", "true");
    const [
      categoryResult,
      sectionResult,
      topicResult,
      postResult,
      profileResult,
      forumProfileResult,
      progressResult,
      gameCatalogResult,
      reactionResult,
    ] = await Promise.all([
      sb.from("forum_categories").select("*").order("sort_order"),
      sb.from("forum_sections").select("*").order("sort_order"),
      sb
        .from("forum_topics")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("last_activity_at", { ascending: false }),
      sb.from("forum_posts").select("*").order("created_at"),
      sb
        .from("profiles")
        .select("id,full_name,game_nickname,avatar_url,role,created_at"),
      sb.from("forum_profiles").select("*"),
      sb.rpc("tl_forum_profile_stats"),
      sb.from("forum_game_catalog").select("*").order("sort_order"),
      sb.rpc("tl_forum_post_reaction_summary"),
    ]);
    const failure = [
      categoryResult,
      sectionResult,
      topicResult,
      postResult,
      forumProfileResult,
      gameCatalogResult,
    ].find((result) => result.error);
    if (failure) throw failure.error;
    categories = categoryResult.data || [];
    sections = sectionResult.data || [];
    topics = topicResult.data || [];
    posts = postResult.data || [];
    gameCatalog = gameCatalogResult.data || [];
    profiles.clear();
    (profileResult.data || []).forEach((item) => profiles.set(item.id, item));
    forumProfiles.clear();
    await signAvatarUrls(forumProfileResult.data || []);
    (forumProfileResult.data || []).forEach((item) =>
      forumProfiles.set(item.user_id, item),
    );
    progress.clear();
    (progressResult.data || []).forEach((item) =>
      progress.set(item.user_id, item),
    );
    postReactions.clear();
    (Array.isArray(reactionResult.data) ? reactionResult.data : []).forEach((item) =>
      postReactions.set(String(item.post_id), {
        likes: Number(item.likes || 0),
        dislikes: Number(item.dislikes || 0),
        myReaction: item.my_reaction || null,
      }),
    );
    currentForumProfile = forumProfiles.get(session.user.id) || null;
    populateSectionSelect();
    view.setAttribute("aria-busy", "false");
  }

  function populateSectionSelect() {
    const select = $("forumTopicSection");
    if (!select) return;
    select.innerHTML = categories
      .map((category) => {
        const choices = sections.filter(
          (section) => section.category_id === category.id,
        );
        return choices.length
          ? `<optgroup label="${esc(category.name)}">${choices.map((section) => `<option value="${section.id}">${esc(section.name)}</option>`).join("")}</optgroup>`
          : "";
      })
      .join("");
  }

  const normalizedSearch = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-PT")
      .trim();

  const countryInfo = (value) => countryCatalog?.resolve(value) || null;
  const countryFlag = (value) => countryInfo(value)?.flag || "🌍";
  const countryFullLabel = (value) => {
    const country = countryInfo(value);
    return country ? `${country.flag} ${country.name}` : "🌍 País não informado";
  };

  function renderProfilePickers() {
    $("forumGamesCount").textContent = `${selectedGames.size}/3`;
    $("forumSelectedGames").innerHTML = [...selectedGames]
      .map((slug) => gameBySlug(slug))
      .filter(Boolean)
      .map(
        (game) =>
          `<button type="button" data-remove-game="${esc(game.slug)}">${esc(game.short_name)} <span aria-hidden="true">×</span><span class="sr-only">Remover ${esc(game.name)}</span></button>`,
      )
      .join("");
    $("forumGamesHint").textContent =
      selectedGames.size >= 3
        ? "Você pode selecionar até 3 jogos."
        : "Selecione até 3 jogos.";
    $("forumPlatformOptions").innerHTML = PLATFORM_OPTIONS.map(
      ([slug, label]) =>
        `<label class="forum-choice-chip"><input type="checkbox" value="${slug}" ${selectedPlatforms.has(slug) ? "checked" : ""}><span>${esc(label)}</span></label>`,
    ).join("");
    const modes = [...selectedGames]
      .map((slug) => gameBySlug(slug))
      .filter(Boolean)
      .map((game) => ({
        game,
        modes: game.modes?.length ? game.modes : ["Outro"],
      }));
    $("forumModeOptions").innerHTML = modes.length
      ? modes
          .map(
            ({ game, modes: choices }) =>
              `<section><strong>${esc(game.short_name)}</strong><div class="forum-profile-chips">${choices
                .map((mode) => {
                  const value = `${game.slug}::${mode}`;
                  return `<label class="forum-choice-chip"><input type="checkbox" value="${esc(value)}" ${selectedModes.has(value) ? "checked" : ""}><span>${esc(mode)}</span></label>`;
                })
                .join("")}</div></section>`,
          )
          .join("")
      : '<p class="forum-picker-empty">Selecione um jogo para escolher modos.</p>';
  }

  function setGameResultsOpen(open, { restoreFocus = false } = {}) {
    const search = $("forumGameSearch");
    const host = $("forumGameResults");
    if (!search || !host) return;
    gameResultsOpen = Boolean(open && search.value.trim());
    host.hidden = !gameResultsOpen;
    search.setAttribute("aria-expanded", String(gameResultsOpen));
    if (!gameResultsOpen && restoreFocus) search.focus();
  }

  function renderGameResults(query = "", { open = Boolean(query.trim()) } = {}) {
    const needle = normalizedSearch(query);
    const host = $("forumGameResults");
    if (!needle) {
      host.innerHTML = "";
      setGameResultsOpen(false);
      return;
    }
    const matches = gameCatalog
      .filter((game) =>
        [game.name, game.short_name, ...(game.aliases || [])].some((value) =>
          normalizedSearch(value).includes(needle),
        ),
      )
      .slice(0, 12);
    host.innerHTML = matches.length
      ? matches
          .map(
            (game) =>
              `<label><input type="checkbox" value="${esc(game.slug)}" ${selectedGames.has(game.slug) ? "checked" : ""} ${selectedGames.size >= 3 && !selectedGames.has(game.slug) ? "disabled" : ""}><span><strong>${esc(game.name)}</strong>${game.short_name !== game.name ? `<small>${esc(game.short_name)}</small>` : ""}</span></label>`,
          )
          .join("")
      : '<p class="forum-picker-empty">Nenhum jogo encontrado.</p>';
    setGameResultsOpen(open);
  }

  function setCountryResultsOpen(open, { restoreFocus = false } = {}) {
    const search = $("forumProfileCountry");
    const host = $("forumCountryResults");
    if (!search || !host) return;
    countryResultsOpen = Boolean(open && search.value.trim());
    host.hidden = !countryResultsOpen;
    search.setAttribute("aria-expanded", String(countryResultsOpen));
    if (!countryResultsOpen && restoreFocus) search.focus();
  }

  function renderSelectedCountry() {
    const host = $("forumSelectedCountry");
    const country = countryInfo(selectedCountryCode);
    host.hidden = !country;
    host.innerHTML = country
      ? `<button type="button" data-clear-country aria-label="Alterar país selecionado"><span aria-hidden="true">${country.flag}</span><strong>${esc(country.name)}</strong><small>${country.code}</small><b aria-hidden="true">×</b></button>`
      : "";
  }

  function renderCountryResults(query = "", { open = Boolean(query.trim()) } = {}) {
    const host = $("forumCountryResults");
    const matches = countryCatalog?.search(query, 12) || [];
    if (!query.trim()) {
      host.innerHTML = "";
      setCountryResultsOpen(false);
      return;
    }
    host.innerHTML = matches.length
      ? matches.map((country) => `<button type="button" data-country-code="${country.code}"><span aria-hidden="true">${country.flag}</span><strong>${esc(country.name)}</strong><small>${country.code}</small></button>`).join("")
      : '<p class="forum-picker-empty">Nenhum país encontrado.</p>';
    setCountryResultsOpen(open);
  }

  function setAvatarPreview(source, name) {
    const host = $("forumProfileAvatarPreview");
    host.className = "forum-avatar-fallback";
    host.textContent = (name || "TL").slice(0, 1).toUpperCase();
    if (!source) return;
    const image = new Image();
    image.alt = "Preview do avatar";
    image.onload = () => {
      host.textContent = "";
      host.append(image);
    };
    image.onerror = () => {
      host.textContent = (name || "TL").slice(0, 1).toUpperCase();
    };
    image.src = source;
  }

  function fillProfileForm() {
    const item = currentForumProfile || {};
    $("forumProfileDialogTitle").textContent = profileReady()
      ? "Editar perfil do Fórum"
      : "Complete seu perfil do Fórum";
    $("forumProfileNickname").value =
      item.forum_nickname || profile?.game_nickname || "";
    selectedCountryCode = countryInfo(item.country)?.code || "";
    $("forumProfileCountry").value = "";
    renderSelectedCountry();
    renderCountryResults("");
    $("forumProfileDiscord").value = item.discord || "";
    $("forumProfileBio").value = item.bio || "";
    $("forumProfileAvatarUrl").value = item.avatar_external_url || "";
    $("forumProfileAvatarUrl").dataset.valid = item.avatar_external_url
      ? "true"
      : "";
    selectedGames.clear();
    gameSlugs(item).forEach((slug) => selectedGames.add(slug));
    selectedPlatforms.clear();
    (item.platforms || []).forEach((slug) => selectedPlatforms.add(slug));
    selectedModes.clear();
    (item.game_modes || []).forEach((mode) => selectedModes.add(mode));
    renderProfilePickers();
    renderGameResults("");
    setAvatarPreview(
      item.avatar_external_url || item.avatar_signed_url || profile?.avatar_url,
      item.forum_nickname || profile?.game_nickname,
    );
    $("forumProfileFeedback").textContent = "";
    $("forumProfileAvatar").value = "";
  }

  function openProfileEditor(nextAction = "") {
    $("forumProfileDialog").dataset.nextAction = nextAction;
    fillProfileForm();
    $("forumProfileDialog").showModal();
    setTimeout(() => $("forumProfileNickname").focus(), 30);
  }

  async function uploadAvatar(file) {
    if (!file) return currentForumProfile?.avatar_path || null;
    const types = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };
    if (!types[file.type])
      throw new Error("Use um avatar JPG, PNG, WebP ou GIF.");
    if (file.size > 2 * 1024 * 1024)
      throw new Error("O avatar deve ter no máximo 2 MB.");
    const path = `${session.user.id}/${crypto.randomUUID()}.${types[file.type]}`;
    const { error } = await sb.storage
      .from("forum-avatars")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    return path;
  }

  async function saveForumProfile(event) {
    event.preventDefault();
    const submit = event.submitter;
    const status = $("forumProfileFeedback");
    submit.disabled = true;
    let uploadedPath = null;
    try {
      const requestedExternalUrl = $("forumProfileAvatarUrl").value.trim();
      if (
        requestedExternalUrl &&
        $("forumProfileAvatarUrl").dataset.valid !== "true"
      )
        throw new Error("A URL do avatar precisa carregar uma imagem válida.");
      uploadedPath = await uploadAvatar($("forumProfileAvatar").files?.[0]);
      const oldPath = currentForumProfile?.avatar_path || null;
      const externalUrl = $("forumProfileAvatarUrl").value.trim();
      const usingUpload = Boolean($("forumProfileAvatar").files?.[0]);
      const { error } = await sb.rpc("tl_forum_save_profile_v2", {
        p_nickname: $("forumProfileNickname").value.trim(),
        p_avatar_path: usingUpload
          ? uploadedPath
          : externalUrl
            ? null
            : uploadedPath,
        p_avatar_external_url: usingUpload ? null : externalUrl || null,
        p_country: selectedCountryCode,
        p_games: [...selectedGames],
        p_platforms: [...selectedPlatforms],
        p_game_modes: [...selectedModes].filter((mode) =>
          selectedGames.has(mode.split("::")[0]),
        ),
        p_bio: $("forumProfileBio").value.trim(),
        p_discord: $("forumProfileDiscord").value.trim(),
      });
      if (error) throw error;
      if (
        oldPath &&
        (externalUrl || (uploadedPath && oldPath !== uploadedPath))
      )
        await sb.storage.from("forum-avatars").remove([oldPath]);
      const nextAction = $("forumProfileDialog").dataset.nextAction;
      $("forumProfileDialog").close();
      await loadBoard();
      renderRoute();
      notify("Perfil do Fórum salvo.");
      if (nextAction === "create") $("forumCreateDialog").showModal();
      if (nextAction === "reply") openReplyEditor();
    } catch (error) {
      if (uploadedPath && uploadedPath !== currentForumProfile?.avatar_path)
        await sb.storage.from("forum-avatars").remove([uploadedPath]);
      status.textContent = error.message || "Não foi possível salvar o perfil.";
    } finally {
      submit.disabled = false;
    }
  }

  function renderProfile(userId) {
    if (!profiles.has(userId)) return renderNotFound("Perfil não encontrado.");
    const member = person(userId);
    const stats = ownForumStats(userId);
    const memberTopics = topics.filter(
      (topic) =>
        topic.author_id === userId &&
        topic.status === "approved" &&
        !topicOriginalRemoved(topic.id),
    );
    const memberPosts = posts.filter(
      (post) =>
        post.author_id === userId && !post.is_original && !post.deleted_at,
    );
    setHeading("PERFIL DO FÓRUM", personName(userId));
    renderBreadcrumb([
      { label: "Fórum", href: "forum.html" },
      { label: personName(userId) },
    ]);
    view.innerHTML = `<section class="forum-full-profile">
      <header data-tour="forum-profile-header">${avatarMarkup(userId, "is-profile")}<div><h3 class="role-${esc(role(userId))}">${esc(personName(userId))}</h3><span class="forum-role-badge role-${esc(role(userId))}">${esc(roleLabel(userId))}</span><p>${esc(countryFullLabel(member.country))}</p></div>${userId === session.user.id ? '<button type="button" data-edit-profile>Editar perfil</button>' : ""}</header>
      <div class="forum-profile-stats"><article><b>${stats.topics}</b><small>Tópicos</small></article><article><b>${stats.posts}</b><small>Respostas</small></article><article><b>${stats.xp}</b><small>XP</small></article><article><b>${stats.accountCreatedAt ? esc(fmtDate(stats.accountCreatedAt)) : "—"}</b><small>Membro desde</small></article></div>
      <div id="forumProfileOverview" class="forum-profile-details"><section><h4>Perfil</h4><p>${esc(member.bio || "Este membro ainda não adicionou uma bio.")}</p></section><dl><div><dt>Jogos</dt><dd>${gameChips(member)}</dd></div><div><dt>Plataformas</dt><dd>${member.platforms?.length ? `<span class="forum-public-chips">${member.platforms.map((item) => `<span>${esc(platformLabel(item))}</span>`).join("")}</span>` : "—"}</dd></div><div><dt>Modos de jogo</dt><dd>${member.game_modes?.length ? `<span class="forum-public-chips">${member.game_modes.map((item) => `<span>${esc(item.split("::")[1] || item)}</span>`).join("")}</span>` : "—"}</dd></div>${member.discord ? `<div><dt>Discord</dt><dd>${esc(member.discord)}</dd></div>` : ""}</dl></div>
      <div class="forum-profile-tabs" role="tablist"><button class="is-active" type="button" data-profile-tab="profile">Perfil</button><button type="button" data-profile-tab="topics">Tópicos</button><button type="button" data-profile-tab="replies">Respostas</button><button type="button" data-profile-tab="activity">Atividade</button></div>
      <div id="forumProfileActivity" hidden></div>
    </section>`;
    view
      .querySelector("[data-edit-profile]")
      ?.addEventListener("click", () => openProfileEditor());
    view.querySelectorAll("[data-profile-tab]").forEach((button) =>
      button.addEventListener("click", () => {
        view
          .querySelectorAll("[data-profile-tab]")
          .forEach((item) =>
            item.classList.toggle("is-active", item === button),
          );
        const host = $("forumProfileActivity");
        const overview = $("forumProfileOverview");
        const showingProfile = button.dataset.profileTab === "profile";
        overview.hidden = !showingProfile;
        host.hidden = showingProfile;
        if (showingProfile) return;
        if (button.dataset.profileTab === "topics")
          host.innerHTML =
            memberTopics.map(topicRow).join("") ||
            '<p class="forum-empty-state">Nenhum tópico publicado.</p>';
        else if (button.dataset.profileTab === "replies")
          host.innerHTML =
            memberPosts
              .map((post) => {
                const topic = topics.find((item) => item.id === post.topic_id);
                return `<a class="forum-profile-activity-row" href="forum.html?topic=${encodeURIComponent(post.topic_id)}#post-${encodeURIComponent(post.id)}" data-route><strong>${esc(topic?.title || "Tópico")}</strong><span>${esc(plainMentions(post.body).slice(0, 140))}</span><small>${esc(relative(post.created_at))}</small></a>`;
              })
              .join("") ||
            '<p class="forum-empty-state">Nenhuma resposta publicada.</p>';
        else
          host.innerHTML =
            [
              ...memberTopics.map((item) => ({
                type: "Tópico",
                date: item.created_at,
                text: item.title,
                href: `forum.html?topic=${encodeURIComponent(item.id)}`,
              })),
              ...memberPosts.map((item) => ({
                type: "Resposta",
                date: item.created_at,
                text: plainMentions(item.body).slice(0, 100),
                href: `forum.html?topic=${encodeURIComponent(item.topic_id)}#post-${encodeURIComponent(item.id)}`,
              })),
            ]
              .sort((a, b) => String(b.date).localeCompare(String(a.date)))
              .map(
                (item) =>
                  `<a class="forum-profile-activity-row" href="${item.href}" data-route><strong>${item.type}</strong><span>${esc(item.text)}</span><small>${esc(relative(item.date))}</small></a>`,
              )
              .join("") || '<p class="forum-empty-state">Sem atividade.</p>';
        bindRoutes();
      }),
    );
    bindRoutes();
  }

  function sectionStats(section) {
    const sectionTopics = topics.filter(
      (topic) =>
        topic.section_id === section.id &&
        topic.status === "approved" &&
        !topicOriginalRemoved(topic.id),
    );
    const sectionPosts = posts.filter(
      (post) =>
        !post.deleted_at &&
        sectionTopics.some((topic) => topic.id === post.topic_id),
    );
    const lastTopic = [...sectionTopics].sort((a, b) =>
      String(b.last_activity_at).localeCompare(String(a.last_activity_at)),
    )[0];
    const lastPost = lastTopic
      ? [...sectionPosts]
          .filter((post) => post.topic_id === lastTopic.id)
          .sort((a, b) =>
            String(b.created_at).localeCompare(String(a.created_at)),
          )[0]
      : null;
    return {
      topicCount: sectionTopics.length,
      replyCount: sectionPosts.filter((post) => !post.is_original).length,
      lastTopic,
      lastPost,
    };
  }

  function sectionRow(section) {
    const stats = sectionStats(section);
    const lastAuthor = stats.lastPost?.author_id || stats.lastTopic?.author_id;
    return `<a class="forum-section-row" href="forum.html?section=${encodeURIComponent(section.slug)}" data-route>
      <span class="forum-section-icon" aria-hidden="true">◆</span>
      <span class="forum-section-copy"><strong>${esc(section.name)}</strong><small>${esc(section.description)}</small></span>
      <span class="forum-section-count"><b>${stats.topicCount}</b><small>Tóp.</small></span>
      <span class="forum-section-count forum-post-count"><b>${stats.replyCount}</b><small>Resp.</small></span>
      <span class="forum-section-last">${stats.lastTopic ? `<small>Última atividade</small><strong>${esc(stats.lastTopic.title)}</strong><span>por <b class="role-${esc(role(lastAuthor))}">${esc(personName(lastAuthor))}</b> · ${esc(relative(stats.lastTopic.last_activity_at))}</span>` : "<small>Sem atividade</small><span>Seja o primeiro a publicar.</span>"}</span>
    </a>`;
  }

  function setHeading(eyebrow, title) {
    $("forumViewEyebrow").textContent = eyebrow;
    $("forumViewTitle").textContent = title;
  }

  function renderBreadcrumb(items) {
    crumbs.innerHTML = items
      .map(
        (item, index) =>
          `${index ? '<span aria-hidden="true">›</span>' : ""}${item.href ? `<a href="${esc(item.href)}" data-route>${esc(item.label)}</a>` : `<strong aria-current="page">${esc(item.label)}</strong>`}`,
      )
      .join("");
  }

  function renderHome(categorySlug = "") {
    const selected = categorySlug
      ? categories.find((item) => item.slug === categorySlug)
      : null;
    const shown = selected ? [selected] : categories;
    setHeading(
      selected ? "CATEGORIA" : "FÓRUM",
      selected?.name || "Categorias",
    );
    renderBreadcrumb(
      selected
        ? [{ label: "Fórum", href: "forum.html" }, { label: selected.name }]
        : [],
    );
    view.innerHTML =
      shown
        .map(
          (category) => `<section class="forum-category-block">
      <header><div><h3><a href="forum.html?category=${encodeURIComponent(category.slug)}" data-route>${esc(category.name)}</a></h3><p>${esc(category.description)}</p></div><span>${sections.filter((section) => section.category_id === category.id).length} pastas</span></header>
      <div class="forum-section-list">${
        sections
          .filter((section) => section.category_id === category.id)
          .map(sectionRow)
          .join("") ||
        '<p class="forum-empty-state">Nenhuma pasta disponível.</p>'
      }</div>
    </section>`,
        )
        .join("") ||
      '<p class="forum-empty-state">Nenhuma categoria disponível.</p>';
    bindRoutes();
  }

  function topicRow(topic) {
    if (topicOriginalRemoved(topic.id)) return "";
    const replies = Math.max(
      0,
      posts.filter((post) => post.topic_id === topic.id && !post.deleted_at)
        .length - 1,
    );
    return `<a class="forum-topic-row ${topic.is_pinned ? "is-pinned" : ""}" href="forum.html?topic=${encodeURIComponent(topic.id)}" data-route>
      <span class="forum-topic-state" aria-hidden="true">${topic.is_locked || topic.is_closed ? "◆" : topic.is_pinned ? "★" : "●"}</span>
      <span class="forum-topic-copy"><strong>${esc(topic.title)}</strong><small>por <b class="role-${esc(role(topic.author_id))}">${esc(personName(topic.author_id))}</b><span class="forum-topic-badges">${topicStateBadges(topic)}</span></small></span>
      <span class="forum-topic-metric"><b>${replies}</b><small>Respostas</small></span>
      <span class="forum-topic-metric forum-views"><b>${topic.view_count}</b><small>Visualizações</small></span>
      <span class="forum-topic-activity"><small>Última atividade</small><strong>${esc(relative(topic.last_activity_at))}</strong></span>
    </a>`;
  }

  function renderSection(slug) {
    const section = sections.find((item) => item.slug === slug);
    if (!section) return renderNotFound("Pasta não encontrada.");
    const category = categories.find((item) => item.id === section.category_id);
    const list = topics
      .filter(
        (topic) =>
          topic.section_id === section.id &&
          topic.status === "approved" &&
          !topicOriginalRemoved(topic.id),
      )
      .sort(
        (a, b) =>
          Number(Boolean(b.is_pinned)) - Number(Boolean(a.is_pinned)) ||
          String(b.last_activity_at).localeCompare(String(a.last_activity_at)),
      );
    const ownPending = topics.filter(
      (topic) =>
        topic.section_id === section.id &&
        topic.status === "pending" &&
        topic.author_id === session.user.id,
    );
    setHeading("PASTA", section.name);
    renderBreadcrumb([
      { label: "Fórum", href: "forum.html" },
      {
        label: category?.name || "Categoria",
        href: `forum.html?category=${encodeURIComponent(category?.slug || "")}`,
      },
      { label: section.name },
    ]);
    view.innerHTML = `<section class="forum-topic-list-panel">
      <header><div><h3>${esc(section.name)}</h3><p>${esc(section.description)}</p></div><span>${list.length} ${list.length === 1 ? "tópico" : "tópicos"}</span></header>
      <div class="forum-topic-columns" aria-hidden="true"><span>Tópico</span><span>Respostas</span><span>Visualizações</span><span>Última atividade</span></div>
      ${ownPending.length ? `<div class="forum-pending-notice">${ownPending.length === 1 ? "Você tem 1 tópico aguardando aprovação nesta pasta." : `Você tem ${ownPending.length} tópicos aguardando aprovação nesta pasta.`}</div>` : ""}
      <div>${list.map(topicRow).join("") || '<p class="forum-empty-state">Ainda não existem tópicos aprovados nesta pasta.</p>'}</div>
    </section>`;
    $("forumTopicSection").value = String(section.id);
    bindRoutes();
  }

  function postCard(post, index) {
    const author = person(post.author_id);
    const stats = ownForumStats(post.author_id);
    const memberSince = progress.get(post.author_id)?.account_created_at;
    const quoted = post.quote_post_id
      ? posts.find((item) => item.id === post.quote_post_id)
      : null;
    const postHash = `post-${post.id}`;
    const removed = Boolean(post.deleted_at);
    if (removed && !post.is_original) {
      return `<div id="${esc(postHash)}" class="forum-post-deleted-anchor" data-post-id="${esc(post.id)}" aria-hidden="true"></div>`;
    }
    const canManage = post.author_id === session.user.id || isModerator();
    const canReply = topicAllowsReplies(
      topics.find((topic) => topic.id === post.topic_id),
    );
    return `<article id="${esc(postHash)}" class="forum-post-card" data-post-id="${esc(post.id)}">
      <header><a class="forum-post-author-mobile" href="forum.html?profile=${encodeURIComponent(post.author_id)}" data-route>${avatarMarkup(post.author_id, "is-mobile")}<span><strong class="role-${esc(role(post.author_id))}">${esc(personName(post.author_id))}</strong><small>${countryFlag(author.country)} · ${stats.totalPosts} posts</small></span><span class="forum-role-badge role-${esc(role(post.author_id))}">${esc(roleLabel(post.author_id))}</span></a><div><time datetime="${esc(post.created_at)}">${esc(fmt(post.created_at))}</time><a href="#${esc(postHash)}" data-share-post="${esc(post.id)}" aria-label="Copiar link do post ${index + 1}">#${index + 1}</a></div></header>
      <div class="forum-post-layout"><aside class="forum-post-author"><a href="forum.html?profile=${encodeURIComponent(post.author_id)}" data-route>${avatarMarkup(post.author_id, "is-post")}<strong class="role-${esc(role(post.author_id))}">${esc(personName(post.author_id))}</strong></a><span class="forum-role-badge role-${esc(role(post.author_id))}">${esc(roleLabel(post.author_id))}</span><small class="forum-post-country" title="${esc(countryInfo(author.country)?.name || "País não informado")}">${countryFlag(author.country)}</small><dl><div><dt>Jogos</dt><dd>${gameLabels(author).length ? esc(gameLabels(author).map((label) => `${label} -`).join("\n")) : "—"}</dd></div><div><dt>Posts</dt><dd>${stats.totalPosts}</dd></div><div><dt>XP</dt><dd>${stats.xp}</dd></div><div><dt>Likes</dt><dd class="forum-author-likes" data-author-likes="${esc(post.author_id)}">${likeIcon}<span>${stats.likes}</span></dd></div><div><dt>Publicado</dt><dd>${esc(relative(post.created_at))}</dd></div><div><dt>Membro desde</dt><dd>${memberSince ? esc(fmtDate(memberSince)) : "—"}</dd></div></dl></aside>
      <div class="forum-post-main">${quoted ? `<blockquote class="forum-linked-quote"><a href="#post-${esc(quoted.id)}">${esc(personName(quoted.author_id))} escreveu:</a><p>${quoted.deleted_at ? "Conteúdo removido." : renderTlMark(quoted.body.slice(0, 500))}</p></blockquote>` : ""}<div class="forum-post-body ${removed ? "is-removed" : ""}">${removed ? "Esta publicação foi removida." : renderTlMark(post.body)}</div>${post.edited_at && !removed ? `<p class="forum-post-edited">Editado em ${esc(fmt(post.edited_at))}</p>` : ""}</div></div>
      <footer><div class="forum-post-footer-meta"><span>${post.is_original ? "POST ORIGINAL" : `ID ${esc(post.id)}`}</span>${removed ? "" : reactionButtons(post.id)}</div><div class="forum-post-actions">${removed ? "" : `${canReply ? `<button type="button" data-reply-post="${esc(post.id)}">Responder</button><button type="button" data-quote-post="${esc(post.id)}">Citar</button>` : ""}${canManage ? `<button type="button" data-edit-post="${esc(post.id)}">Editar</button>${post.is_original ? "" : `<button type="button" class="forum-delete-action" data-delete-post="${esc(post.id)}">Apagar resposta</button>`}` : ""}`}<button type="button" data-share-post="${esc(post.id)}">Compartilhar</button></div></footer>
    </article>`;
  }

  function reactionButtons(postId) {
    const state = postReactions.get(String(postId)) || {likes:0,dislikes:0,myReaction:null};
    return `<div class="forum-post-reactions" aria-label="Reações do post"><button type="button" class="forum-post-reaction is-like${state.myReaction === "like" ? " is-active" : ""}" data-post-reaction="like" data-post-id="${esc(postId)}" data-tooltip="Curtir" aria-label="Curtir">${likeIcon}<span>${state.likes}</span></button><button type="button" class="forum-post-reaction is-dislike${state.myReaction === "dislike" ? " is-active" : ""}" data-post-reaction="dislike" data-post-id="${esc(postId)}" data-tooltip="Não curtir" aria-label="Não curtir">${dislikeIcon}<span>${state.dislikes}</span></button></div>`;
  }

  function ensureMentionPreview() {
    if (mentionPreview) return mentionPreview;
    mentionPreview = document.createElement("aside");
    mentionPreview.className = "forum-mention-preview";
    mentionPreview.hidden = true;
    mentionPreview.setAttribute("role", "dialog");
    mentionPreview.setAttribute("aria-label", "Resumo do perfil mencionado");
    document.body.append(mentionPreview);
    mentionPreview.addEventListener("pointerenter", () =>
      clearTimeout(mentionPreview.hideTimer),
    );
    mentionPreview.addEventListener("pointerleave", () => hideMentionPreview());
    document.addEventListener("click", (event) => {
      if (
        !mentionPreview.hidden &&
        !event.target.closest("[data-forum-mention]") &&
        !event.target.closest(".forum-mention-preview")
      )
        hideMentionPreview(0);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") hideMentionPreview(0);
    });
    window.addEventListener("scroll", () => hideMentionPreview(0), {
      passive: true,
    });
    return mentionPreview;
  }

  function hideMentionPreview(delay = 100) {
    if (!mentionPreview) return;
    clearTimeout(mentionPreview.hideTimer);
    mentionPreview.hideTimer = setTimeout(() => {
      mentionPreview.hidden = true;
    }, delay);
  }

  function showMentionPreview(trigger) {
    const userId = trigger.dataset.forumMention;
    if (!userId || (!forumProfiles.has(userId) && !profiles.has(userId)))
      return;
    const member = person(userId);
    const preview = ensureMentionPreview();
    clearTimeout(preview.hideTimer);
    preview.innerHTML = `<header>${avatarMarkup(userId, "is-mention-preview")}<div><strong class="role-${esc(role(userId))}">${esc(personName(userId))}</strong><span class="forum-role-badge role-${esc(role(userId))}">${esc(roleLabel(userId))}</span></div></header><dl>${member.country ? `<div><dt>País</dt><dd>${esc(countryFullLabel(member.country))}</dd></div>` : ""}${gameLabels(member).length ? `<div><dt>Jogos</dt><dd>${esc(gameLabels(member).join(" · "))}</dd></div>` : ""}${member.game_modes?.length ? `<div><dt>Modos</dt><dd>${esc(member.game_modes.map((item) => item.split("::")[1] || item).join(" · "))}</dd></div>` : ""}</dl><a href="forum.html?profile=${encodeURIComponent(userId)}">Ver perfil →</a>`;
    preview.hidden = false;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(310, window.innerWidth - 24);
    preview.style.width = `${width}px`;
    const left = Math.min(
      Math.max(12, rect.left),
      window.innerWidth - width - 12,
    );
    const top =
      rect.bottom + 10 + preview.offsetHeight <= window.innerHeight
        ? rect.bottom + 8
        : Math.max(12, rect.top - preview.offsetHeight - 8);
    preview.style.left = `${left}px`;
    preview.style.top = `${top}px`;
    preview.querySelector("a").addEventListener("click", (event) => {
      event.preventDefault();
      preview.hidden = true;
      history.pushState(
        {},
        "",
        `forum.html?profile=${encodeURIComponent(userId)}`,
      );
      renderRoute();
    });
  }

  function bindMentions() {
    view.querySelectorAll("[data-forum-mention]").forEach((mention) => {
      let longPressTimer = null;
      let hoverTimer = null;
      mention.addEventListener("pointerenter", (event) => {
        if (event.pointerType !== "touch")
          hoverTimer = setTimeout(() => showMentionPreview(mention), 260);
      });
      mention.addEventListener("pointerleave", () => {
        clearTimeout(hoverTimer);
        hideMentionPreview();
      });
      mention.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "touch")
          longPressTimer = setTimeout(() => showMentionPreview(mention), 850);
      });
      ["pointerup", "pointercancel", "pointermove"].forEach((name) =>
        mention.addEventListener(name, () => clearTimeout(longPressTimer)),
      );
      mention.addEventListener("focus", () => showMentionPreview(mention));
      mention.addEventListener("blur", () => hideMentionPreview());
      mention.addEventListener("click", () => showMentionPreview(mention));
    });
  }

  async function renderTopic(id) {
    const topic = topics.find((item) => item.id === id);
    if (
      !topic ||
      (topic.status !== "approved" &&
        topic.author_id !== session.user.id &&
        !isModerator())
    )
      return renderNotFound("Tópico não encontrado ou ainda não aprovado.");
    const section = sections.find((item) => item.id === topic.section_id);
    const category = categories.find(
      (item) => item.id === section?.category_id,
    );
    const topicPosts = posts
      .filter((post) => post.topic_id === topic.id)
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    setHeading(
      topic.status === "pending" ? "AGUARDANDO APROVAÇÃO" : "TÓPICO",
      topic.title,
    );
    renderBreadcrumb([
      { label: "Fórum", href: "forum.html" },
      {
        label: category?.name || "Categoria",
        href: `forum.html?category=${encodeURIComponent(category?.slug || "")}`,
      },
      {
        label: section?.name || "Pasta",
        href: `forum.html?section=${encodeURIComponent(section?.slug || "")}`,
      },
      { label: topic.title },
    ]);
    const originalPost = topicPosts.find((post) => post.is_original);
    const topicRemoved = Boolean(originalPost?.deleted_at);
    if (topicRemoved) {
      view.innerHTML = `<section class="forum-topic-page forum-topic-page--removed">
        <header class="forum-topic-page-head"><div><h3>${esc(topic.title)}</h3><p>Iniciado por <b class="role-${esc(role(topic.author_id))}">${esc(personName(topic.author_id))}</b> · ${esc(fmt(topic.created_at))}</p></div></header>
        <div class="forum-topic-removed-state" role="status">Este tópico foi removido.</div>
      </section>`;
      bindRoutes();
      return;
    }
    const canDeleteTopic = originalPost && !originalPost.deleted_at && (originalPost.author_id === session.user.id || isModerator());
    const canReply = topicAllowsReplies(topic);
    const moderationMenu = isModerator()
      ? `<div class="forum-topic-moderation">
          <button class="forum-icon-action" type="button" data-tour="topic-moderation" data-topic-moderation-toggle aria-label="Moderação do tópico" aria-expanded="false" aria-controls="forumTopicModerationMenu">${moderationIcon}</button>
          <div id="forumTopicModerationMenu" class="forum-topic-moderation-menu" role="menu" hidden>
            <button type="button" role="menuitem" data-topic-state="${topic.is_pinned ? "unpin" : "pin"}">${topic.is_pinned ? "Desafixar tópico" : "Fixar tópico"}</button>
            <button type="button" role="menuitem" data-topic-state="${topic.is_locked ? "unlock" : "lock"}">${topic.is_locked ? "Destrancar tópico" : "Trancar tópico"}</button>
            <button type="button" role="menuitem" data-topic-state="${topic.is_closed ? "reopen" : "close"}">${topic.is_closed ? "Reabrir tópico" : "Fechar tópico"}</button>
          </div>
        </div>`
      : "";
    view.innerHTML = `<section class="forum-topic-page">
      <header class="forum-topic-page-head"><div><div class="forum-topic-title-line"><h3>${esc(topic.title)}</h3><span class="forum-topic-badges">${topicStateBadges(topic)}</span></div><p>Iniciado por <b class="role-${esc(role(topic.author_id))}">${esc(personName(topic.author_id))}</b> · ${esc(fmt(topic.created_at))}</p></div><div class="forum-topic-actions"><button class="forum-icon-action" type="button" data-tour="forum-share" data-share-topic data-tooltip="Compartilhar publicação" aria-label="Compartilhar publicação">${shareIcon}</button>${canDeleteTopic ? `<button class="forum-icon-action forum-topic-delete-action" type="button" data-delete-topic-post="${esc(originalPost.id)}" data-tooltip="Deletar publicação" aria-label="Deletar publicação">${trashIcon}</button>` : ""}${moderationMenu}</div></header>
      ${topic.status === "pending" ? '<div class="forum-pending-notice">Este tópico está visível apenas para você e para a moderação enquanto aguarda aprovação.</div>' : ""}
      <div class="forum-post-stack">${topicPosts.map(postCard).join("")}</div>
      ${canReply ? '<button id="forumReplyButton" class="forum-primary-button forum-reply-button" type="button">Responder</button>' : topic.is_closed ? '<p class="forum-locked-note">Este tópico foi encerrado.</p>' : topic.is_locked ? '<p class="forum-locked-note">Tópico trancado. Novas respostas não são permitidas.</p>' : ""}
    </section>`;
    bindRoutes();
    bindShare(topic);
    bindPostActions(topic);
    bindPostReactions();
    view.querySelector("[data-delete-topic-post]")?.addEventListener("click", (event) => {
      const post = posts.find((item) => item.id === event.currentTarget.dataset.deleteTopicPost);
      if (post && !post.deleted_at) openDeleteDialog(post, "topic");
    });
    bindMentions();
    bindActionTooltips();
    bindTopicModeration(topic);
    $("forumReplyButton")?.addEventListener("click", () => openReplyEditor());
    if (topic.status === "approved") {
      sb.rpc("tl_forum_register_view", { p_topic_id: topic.id }).then(
        ({ data }) => {
          if (Number.isFinite(data)) topic.view_count = data;
        },
      );
    }
    scrollToRequestedPost();
  }

  function bindTopicModeration(topic) {
    const toggle = view.querySelector("[data-topic-moderation-toggle]");
    const menu = view.querySelector(".forum-topic-moderation-menu");
    if (!toggle || !menu) return;
    topicModerationController = new AbortController();
    const { signal } = topicModerationController;
    const close = ({ restoreFocus = false } = {}) => {
      menu.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      if (restoreFocus) toggle.focus();
    };
    toggle.addEventListener("click", () => {
      const opening = menu.hidden;
      menu.hidden = !opening;
      toggle.setAttribute("aria-expanded", String(opening));
      if (opening) menu.querySelector("button")?.focus();
    });
    menu.querySelectorAll("[data-topic-state]").forEach((button) =>
      button.addEventListener("click", async () => {
        menu.querySelectorAll("button").forEach((item) => (item.disabled = true));
        const { error } = await sb.rpc("tl_forum_set_topic_state", {
          p_topic_id: topic.id,
          p_action: button.dataset.topicState,
        });
        if (error) {
          menu.querySelectorAll("button").forEach((item) => (item.disabled = false));
          return notify(error.message, true);
        }
        await loadBoard();
        renderRoute();
        notify("Estado do tópico atualizado.");
      }),
    );
    document.addEventListener(
      "pointerdown",
      (event) => {
        if (!event.target.closest(".forum-topic-moderation")) close();
      },
      { signal },
    );
    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape" && !menu.hidden) {
          event.preventDefault();
          close({ restoreFocus: true });
        }
      },
      { signal },
    );
  }

  function openReplyEditor(postId = null, quote = false) {
    const topic = topics.find((item) => item.id === params().get("topic"));
    if (!topicAllowsReplies(topic))
      return notify(
        topic?.is_closed
          ? "Este tópico foi encerrado."
          : "Tópico trancado. Novas respostas não são permitidas.",
        true,
      );
    if (!profileReady()) return openProfileEditor("reply");
    quotePostId = quote ? postId : null;
    const post = postId ? posts.find((item) => item.id === postId) : null;
    const context = $("forumReplyQuoteContext");
    context.hidden = !quotePostId;
    context.innerHTML =
      quotePostId && post
        ? `<strong>Citando ${esc(personName(post.author_id))}</strong><span>${esc(plainMentions(post.body).slice(0, 180))}</span>`
        : "";
    hydrateEditorValue(
      $("forumReplyBody"),
      post && !quote
        ? `[mention=${post.author_id}]@${personName(post.author_id)}[/mention] `
        : "",
    );
    $("forumReplyDialog").showModal();
    setTimeout(() => $("forumReplyBody").focus(), 30);
  }

  function bindPostActions(topic) {
    view
      .querySelectorAll("[data-reply-post]")
      .forEach((button) =>
        button.addEventListener("click", () =>
          openReplyEditor(button.dataset.replyPost, false),
        ),
      );
    view
      .querySelectorAll("[data-quote-post]")
      .forEach((button) =>
        button.addEventListener("click", () =>
          openReplyEditor(button.dataset.quotePost, true),
        ),
      );
    view.querySelectorAll("[data-edit-post]").forEach((button) =>
      button.addEventListener("click", () => {
        const post = posts.find((item) => item.id === button.dataset.editPost);
        if (!post) return;
        editingPostId = post.id;
        hydrateEditorValue($("forumEditPostBody"), post.body);
        $("forumEditPostDialog").showModal();
      }),
    );
    view.querySelectorAll("[data-delete-post]").forEach((button) =>
      button.addEventListener("click", () => {
        const post = posts.find(
          (item) => item.id === button.dataset.deletePost,
        );
        if (!post || post.deleted_at) return;
        openDeleteDialog(post, "reply");
      }),
    );
  }

  function bindPostReactions() {
    view.querySelectorAll("[data-post-reaction]").forEach((button) =>
      button.addEventListener("click", async () => {
        const postId = button.dataset.postId;
        const nextReaction = button.dataset.postReaction;
        const previous = postReactions.get(postId) || {likes:0,dislikes:0,myReaction:null};
        const requested = previous.myReaction === nextReaction ? null : nextReaction;
        view.querySelectorAll(`[data-post-id="${CSS.escape(postId)}"] [data-post-reaction]`).forEach((item) => item.disabled = true);
        const { data, error } = await sb.rpc("tl_forum_set_post_reaction", {
          p_post_id: postId,
          p_reaction: requested,
        });
        if (error) {
          view.querySelectorAll(`[data-post-id="${CSS.escape(postId)}"] [data-post-reaction]`).forEach((item) => item.disabled = false);
          return notify(error.message, true);
        }
        const next = {
          likes: Number(data?.likes || 0),
          dislikes: Number(data?.dislikes || 0),
          myReaction: data?.my_reaction || null,
        };
        postReactions.set(postId, next);
        const card = view.querySelector(`[data-post-id="${CSS.escape(postId)}"]`);
        card?.querySelectorAll("[data-post-reaction]").forEach((item) => {
          const type = item.dataset.postReaction;
          item.classList.toggle("is-active", next.myReaction === type);
          item.querySelector("span").textContent = String(type === "like" ? next.likes : next.dislikes);
          item.disabled = false;
        });
        const post = posts.find((item) => item.id === postId);
        const likeDelta = next.likes - Number(previous.likes || 0);
        if (post && likeDelta) {
          const authorStats = progress.get(post.author_id);
          if (authorStats) authorStats.forum_likes = Math.max(0, Number(authorStats.forum_likes || 0) + likeDelta);
          view.querySelectorAll(`[data-author-likes="${CSS.escape(post.author_id)}"] span`).forEach((item) => item.textContent = String(Math.max(0, Number(authorStats?.forum_likes || 0))));
        }
      }),
    );
  }

  function openDeleteDialog(post, kind) {
    deletingPostId = post.id;
    deletingPostKind = kind === "topic" ? "topic" : "reply";
    const isTopic = deletingPostKind === "topic";
    $("forumDeletePostTitle").textContent = isTopic ? "Deletar publicação?" : "Apagar resposta?";
    $("forumDeletePostText").textContent = isTopic
      ? "Esta ação removerá a publicação e afetará o tópico correspondente."
      : "O conteúdo desta resposta será removido.";
    $("forumDeletePostSubmit").textContent = isTopic ? "Deletar publicação" : "Apagar resposta";
    $("forumDeletePostDialog").showModal();
  }

  function bindActionTooltips() {
    view.querySelectorAll("[data-tooltip]").forEach((button) => {
      let timer = null;
      button.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "touch")
          timer = setTimeout(() => button.classList.add("show-tooltip"), 1000);
      });
      ["pointerup", "pointercancel", "pointermove"].forEach((name) =>
        button.addEventListener(name, () => clearTimeout(timer)),
      );
      button.addEventListener("blur", () =>
        button.classList.remove("show-tooltip"),
      );
      button.addEventListener("click", () =>
        setTimeout(() => button.classList.remove("show-tooltip"), 1200),
      );
    });
  }

  function renderNotFound(message) {
    setHeading("FÓRUM", "Conteúdo indisponível");
    renderBreadcrumb([
      { label: "Fórum", href: "forum.html" },
      { label: "Não encontrado" },
    ]);
    view.innerHTML = `<div class="forum-empty-state"><h3>${esc(message)}</h3><a href="forum.html" data-route>Voltar às categorias</a></div>`;
    bindRoutes();
  }

  function bindRoutes() {
    document.querySelectorAll("[data-route]").forEach((link) =>
      link.addEventListener("click", (event) => {
        if (
          event.button ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        event.preventDefault();
        const url = new window.URL(link.href, location.href);
        history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
        renderRoute();
      }),
    );
  }

  async function copyLink(url) {
    try {
      await navigator.clipboard.writeText(url);
      notify("Link copiado!");
    } catch (_) {
      notify("Não foi possível copiar o link.", true);
    }
  }

  function closeSharePopover({ restoreFocus = false } = {}) {
    if (!sharePopover) return;
    sharePopover.remove();
    sharePopover = null;
    activeShareTrigger?.setAttribute("aria-expanded", "false");
    activeShareTrigger?.removeAttribute("aria-controls");
    if (restoreFocus) activeShareTrigger?.focus();
    activeShareTrigger = null;
  }

  function socialShareUrl(platform, { text, url }) {
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(url);
    if (platform === "whatsapp")
      return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
    if (platform === "facebook")
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    if (platform === "twitter")
      return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
    return `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
  }

  function openSharePopover(trigger, shareData) {
    closeSharePopover();
    activeShareTrigger = trigger;
    const popover = document.createElement("div");
    popover.id = "forumSharePopover";
    popover.className = "forum-share-popover";
    popover.setAttribute("role", "menu");
    popover.setAttribute("aria-label", "Compartilhar publicação");
    popover.innerHTML = `
      <strong>Compartilhar</strong>
      ${[
        ["whatsapp", "WhatsApp"],
        ["facebook", "Facebook"],
        ["twitter", "X / Twitter"],
        ["telegram", "Telegram"],
      ]
        .map(
          ([platform, label]) =>
            `<a role="menuitem" href="${esc(socialShareUrl(platform, shareData))}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`,
        )
        .join("")}
      <button type="button" role="menuitem" data-copy-share-link>Copiar link</button>`;
    document.body.append(popover);
    sharePopover = popover;
    trigger.setAttribute("aria-expanded", "true");
    trigger.setAttribute("aria-controls", popover.id);

    const triggerRect = trigger.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const gap = 8;
    const left = Math.min(
      window.innerWidth - popoverRect.width - gap,
      Math.max(gap, triggerRect.right - popoverRect.width),
    );
    const roomBelow = window.innerHeight - triggerRect.bottom;
    const top =
      roomBelow >= popoverRect.height + gap
        ? triggerRect.bottom + gap
        : Math.max(gap, triggerRect.top - popoverRect.height - gap);
    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;

    popover.querySelector("[data-copy-share-link]").addEventListener("click", async () => {
      await copyLink(shareData.url);
      closeSharePopover({ restoreFocus: true });
    });
    popover.querySelectorAll("a").forEach((link) =>
      link.addEventListener("click", () => closeSharePopover()),
    );
    popover.querySelector("a")?.focus();
  }

  async function sharePublication(trigger, shareData) {
    closeSharePopover();
    if (typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }
    openSharePopover(trigger, shareData);
  }

  document.addEventListener("pointerdown", (event) => {
    if (
      sharePopover &&
      !sharePopover.contains(event.target) &&
      !event.target.closest("[data-share-topic], [data-share-post]")
    )
      closeSharePopover();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && sharePopover) {
      event.preventDefault();
      closeSharePopover({ restoreFocus: true });
    }
  });
  window.addEventListener("resize", () => closeSharePopover());
  window.addEventListener("scroll", () => closeSharePopover(), true);

  function bindShare(topic) {
    const text = "Veja esta publicação no Fórum Team Lambreta";
    view.querySelector("[data-share-topic]")?.addEventListener("click", (event) => {
      event.preventDefault();
      sharePublication(event.currentTarget, {
        title: topic.title,
        text,
        url: `${location.origin}${location.pathname}?topic=${encodeURIComponent(topic.id)}`,
      });
    });
    view.querySelectorAll("[data-share-post]").forEach((button) =>
      button.addEventListener("click", (event) => {
        event.preventDefault();
        sharePublication(event.currentTarget, {
          title: topic.title,
          text,
          url: `${location.origin}${location.pathname}?topic=${encodeURIComponent(topic.id)}#post-${encodeURIComponent(button.dataset.sharePost)}`,
        });
      }),
    );
  }

  function scrollToRequestedPost() {
    if (!location.hash.startsWith("#post-")) return;
    requestAnimationFrame(() =>
      document
        .getElementById(decodeURIComponent(location.hash.slice(1)))
        ?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  }

  function renderRoute() {
    topicModerationController?.abort();
    topicModerationController = null;
    const query = params();
    const publicProfile = query.get("profile");
    const topic = query.get("topic");
    const section = query.get("section");
    if (publicProfile) return renderProfile(publicProfile);
    const tourTarget = query.get("tourTarget");
    if (!topic && (tourTarget === "forum-share" || tourTarget === "topic-moderation")) {
      const approvedTopics = topics.filter((item) => item.status === "approved" && !topicOriginalRemoved(item.id));
      const welcomeTopic = approvedTopics.find((item) => /bem[- ]vindos/i.test(String(item.title || ""))) || approvedTopics.find((item) => item.is_pinned) || approvedTopics[0];
      if (welcomeTopic) {
        const targetUrl = `forum.html?topic=${encodeURIComponent(welcomeTopic.id)}&tlTour=1`;
        window.location.replace(targetUrl);
        return;
      }
    }
    if (topic) return renderTopic(topic);
    if (section) return renderSection(section);
    renderHome(query.get("category") || "");
  }

  async function submitTopic(event) {
    event.preventDefault();
    if (!profileReady()) return openProfileEditor("create");
    const button = event.submitter;
    button.disabled = true;
    const { data, error } = await sb.rpc("tl_forum_create_topic_v3", {
      p_section_id: Number($("forumTopicSection").value),
      p_title: $("forumTopicTitle").value.trim(),
      p_body: serializeEditorValue($("forumTopicBody")).trim(),
    });
    button.disabled = false;
    if (error) return notify(error.message, true);
    $("forumCreateDialog").close();
    event.target.reset();
    await loadBoard();
    notify(
      data.status === "approved"
        ? "Tópico publicado."
        : "Tópico enviado para aprovação.",
    );
    setUrl({ topic: data.id });
  }

  async function submitReply(event) {
    event.preventDefault();
    const topicId = params().get("topic");
    const button = event.submitter;
    button.disabled = true;
    const { data, error } = await sb.rpc("tl_forum_create_post_v3", {
      p_topic_id: topicId,
      p_body: serializeEditorValue($("forumReplyBody")).trim(),
      p_quote_post_id: quotePostId,
    });
    button.disabled = false;
    if (error) return notify(error.message, true);
    $("forumReplyDialog").close();
    event.target.reset();
    quotePostId = null;
    await loadBoard();
    history.replaceState(
      {},
      "",
      `forum.html?topic=${encodeURIComponent(topicId)}#post-${encodeURIComponent(data.id)}`,
    );
    renderRoute();
    notify("Resposta publicada.");
  }

  async function submitPostEdit(event) {
    event.preventDefault();
    const submit = event.submitter;
    submit.disabled = true;
    const { error } = await sb.rpc("tl_forum_edit_post", {
      p_post_id: editingPostId,
      p_body: serializeEditorValue($("forumEditPostBody")).trim(),
    });
    submit.disabled = false;
    if (error) return notify(error.message, true);
    $("forumEditPostDialog").close();
    editingPostId = null;
    await loadBoard();
    renderRoute();
    notify("Post atualizado.");
  }

  async function submitPostDelete(event) {
    event.preventDefault();
    if (!deletingPostId) return;
    const submit = event.submitter;
    submit.disabled = true;
    const { error } = await sb.rpc("tl_forum_delete_post", {
      p_post_id: deletingPostId,
    });
    submit.disabled = false;
    if (error) {
      console.error("[TL Fórum] Falha ao apagar conteúdo", {
        postId: deletingPostId,
        message: error.message,
      });
      return notify(
        deletingPostKind === "topic"
          ? "Não foi possível deletar a publicação. Tente novamente."
          : "Não foi possível apagar a resposta. Tente novamente.",
        true,
      );
    }
    const deletedKind = deletingPostKind;
    $("forumDeletePostDialog").close();
    deletingPostId = null;
    deletingPostKind = "reply";
    await loadBoard();
    renderRoute();
    notify(deletedKind === "topic" ? "Publicação deletada." : "Resposta apagada.");
  }

  async function activate() {
    gate.hidden = true;
    app.hidden = false;
    await loadProfile();
    const saved = sessionStorage.getItem(RETURN_KEY);
    if (saved) {
      sessionStorage.removeItem(RETURN_KEY);
      const target = safeReturn(saved);
      if (target !== currentUrl()) history.replaceState({}, "", target);
    }
    try {
      await loadBoard();
      renderRoute();
    } catch (error) {
      console.error("[TL Fórum] carregamento", { message: error.message });
      renderNotFound("Não foi possível carregar o Fórum agora.");
    }
  }

  async function init() {
    sessionStorage.setItem(RETURN_KEY, safeReturn(currentUrl()));
    const { data } = await sb.auth.getSession();
    session = data.session;
    if (!session) {
      app.hidden = true;
      gate.hidden = false;
      return;
    }
    await activate();
  }

  $("forumGoogleLogin")?.addEventListener("click", loginGoogle);
  $("forumCreateTopicButton")?.addEventListener("click", () =>
    profileReady()
      ? $("forumCreateDialog").showModal()
      : openProfileEditor("create"),
  );
  $("forumMyProfileButton")?.addEventListener("click", () =>
    profileReady() ? setUrl({ profile: session.user.id }) : openProfileEditor(),
  );
  $("forumCreateForm")?.addEventListener("submit", submitTopic);
  $("forumReplyForm")?.addEventListener("submit", submitReply);
  $("forumEditPostForm")?.addEventListener("submit", submitPostEdit);
  $("forumDeletePostForm")?.addEventListener("submit", submitPostDelete);
  $("forumProfileForm")?.addEventListener("submit", saveForumProfile);
  $("forumProfileAvatar")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = window.URL.createObjectURL(file);
    $("forumProfileAvatarUrl").value = "";
    setAvatarPreview(url, $("forumProfileNickname").value);
  });
  $("forumProfileAvatarUrl")?.addEventListener("input", (event) => {
    const input = event.currentTarget;
    input.dataset.valid = "";
    clearTimeout(input.previewTimer);
    input.previewTimer = setTimeout(() => {
      const value = input.value.trim();
      if (!value)
        return setAvatarPreview(
          currentForumProfile?.avatar_signed_url || profile?.avatar_url,
          $("forumProfileNickname").value,
        );
      try {
        const url = new URL(value);
        if (!/^https?:$/.test(url.protocol)) throw new Error();
        $("forumProfileAvatar").value = "";
        const probe = new Image();
        probe.onload = () => {
          if (input.value.trim() !== value) return;
          input.dataset.valid = "true";
          $("forumProfileFeedback").textContent = "";
          setAvatarPreview(url.href, $("forumProfileNickname").value);
        };
        probe.onerror = () => {
          if (input.value.trim() !== value) return;
          input.dataset.valid = "false";
          $("forumProfileFeedback").textContent =
            "Não foi possível carregar uma imagem nessa URL.";
        };
        probe.src = url.href;
      } catch (_) {
        $("forumProfileFeedback").textContent =
          "Use uma URL de imagem HTTP ou HTTPS válida.";
      }
    }, 350);
  });
  $("forumGameSearch")?.addEventListener("input", (event) =>
    renderGameResults(event.currentTarget.value, { open: true }),
  );
  $("forumGameSearch")?.addEventListener("click", (event) => {
    event.stopPropagation();
    const search = event.currentTarget;
    if (!search.value.trim()) return setGameResultsOpen(false);
    if (gameResultsOpen) setGameResultsOpen(false);
    else renderGameResults(search.value, { open: true });
  });
  $("forumGameResults")?.addEventListener("change", (event) => {
    const input = event.target.closest('input[type="checkbox"]');
    if (!input) return;
    if (input.checked && selectedGames.size >= 3) {
      input.checked = false;
      $("forumGamesHint").textContent = "Você pode selecionar até 3 jogos.";
      return;
    }
    input.checked
      ? selectedGames.add(input.value)
      : selectedGames.delete(input.value);
    [...selectedModes].forEach((mode) => {
      if (!selectedGames.has(mode.split("::")[0])) selectedModes.delete(mode);
    });
    renderProfilePickers();
    renderGameResults($("forumGameSearch").value);
  });
  $("forumProfileCountry")?.addEventListener("input", (event) =>
    renderCountryResults(event.currentTarget.value, { open: true }),
  );
  $("forumProfileCountry")?.addEventListener("click", (event) => {
    event.stopPropagation();
    const search = event.currentTarget;
    if (!search.value.trim()) return setCountryResultsOpen(false);
    if (countryResultsOpen) setCountryResultsOpen(false);
    else renderCountryResults(search.value, { open: true });
  });
  $("forumCountryResults")?.addEventListener("click", (event) => {
    const option = event.target.closest("[data-country-code]");
    if (!option) return;
    selectedCountryCode = option.dataset.countryCode;
    $("forumProfileCountry").value = "";
    renderSelectedCountry();
    setCountryResultsOpen(false);
  });
  $("forumSelectedCountry")?.addEventListener("click", (event) => {
    if (!event.target.closest("[data-clear-country]")) return;
    selectedCountryCode = "";
    renderSelectedCountry();
    $("forumProfileCountry").focus();
  });
  $("forumSelectedGames")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-game]");
    if (!button) return;
    selectedGames.delete(button.dataset.removeGame);
    [...selectedModes].forEach((mode) => {
      if (mode.startsWith(`${button.dataset.removeGame}::`))
        selectedModes.delete(mode);
    });
    renderProfilePickers();
    renderGameResults($("forumGameSearch").value);
  });
  $("forumPlatformOptions")?.addEventListener("change", (event) => {
    const input = event.target.closest('input[type="checkbox"]');
    if (input)
      input.checked
        ? selectedPlatforms.add(input.value)
        : selectedPlatforms.delete(input.value);
  });
  $("forumModeOptions")?.addEventListener("change", (event) => {
    const input = event.target.closest('input[type="checkbox"]');
    if (input)
      input.checked
        ? selectedModes.add(input.value)
        : selectedModes.delete(input.value);
  });
  document.addEventListener("click", (event) => {
    if (!gameResultsOpen) return;
    if (event.target.closest("#forumGamesPicker")) return;
    setGameResultsOpen(false);
  });
  document.addEventListener("click", (event) => {
    if (!countryResultsOpen) return;
    if (event.target.closest("#forumCountryPicker")) return;
    setCountryResultsOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !gameResultsOpen) return;
    event.preventDefault();
    setGameResultsOpen(false, { restoreFocus: true });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !countryResultsOpen) return;
    event.preventDefault();
    setCountryResultsOpen(false, { restoreFocus: true });
  });
  document.addEventListener(
    "error",
    (event) => {
      const image = event.target;
      if (
        !(image instanceof HTMLImageElement) ||
        !image.matches("img[data-avatar-name]")
      )
        return;
      const replacement = document.createElement("span");
      replacement.className = image.className.replace(
        "forum-user-avatar",
        "forum-avatar-fallback",
      );
      replacement.setAttribute(
        "aria-label",
        `Avatar padrão de ${image.dataset.avatarName}`,
      );
      replacement.textContent = image.dataset.avatarName
        .slice(0, 1)
        .toUpperCase();
      image.replaceWith(replacement);
    },
    true,
  );
  document
    .querySelectorAll("[data-dialog-close]")
    .forEach((button) =>
      button.addEventListener("click", () => button.closest("dialog").close()),
    );
  document.querySelectorAll(".forum-board-dialog").forEach((dialog) =>
    dialog.addEventListener("click", (event) => {
      if (
        dialog.id === "forumProfileDialog" &&
        (gameResultsOpen || countryResultsOpen)
      ) {
        setGameResultsOpen(false);
        setCountryResultsOpen(false);
        if (event.target === dialog) event.stopPropagation();
        return;
      }
      if (event.target === dialog) dialog.close();
    }),
  );
  $("forumProfileDialog")?.addEventListener("close", () =>
    (setGameResultsOpen(false), setCountryResultsOpen(false)),
  );
  window.addEventListener("popstate", () => session && renderRoute());
  sb.auth.onAuthStateChange((_event, nextSession) => {
    const changed = nextSession?.user?.id !== session?.user?.id;
    session = nextSession;
    if (changed && session) activate();
    if (!session) {
      app.hidden = true;
      gate.hidden = false;
    }
  });
  setupEditors();
  init();
})();
