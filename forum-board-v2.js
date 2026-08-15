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
  const profiles = new Map();
  const forumProfiles = new Map();
  const progress = new Map();
  let currentForumProfile = null;
  let quotePostId = null;
  let editingPostId = null;

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

  const avatarMarkup = (userId, sizeClass = "") => {
    const member = person(userId);
    const name = personName(userId);
    const source = member.avatar_signed_url || member.avatar_url;
    return source
      ? `<img class="forum-user-avatar ${sizeClass}" src="${esc(source)}" alt="Avatar de ${esc(name)}">`
      : `<span class="forum-avatar-fallback ${sizeClass}" aria-label="Avatar padrão de ${esc(name)}">${esc(name.slice(0, 1).toUpperCase())}</span>`;
  };

  function ownForumStats(userId) {
    const topicCount = topics.filter(
      (topic) => topic.author_id === userId && topic.status === "approved",
    ).length;
    const postCount = posts.filter((post) => post.author_id === userId).length;
    const global = progress.get(userId) || {};
    return {
      topics: Number(global.forum_topics ?? topicCount),
      posts: Number(
        global.forum_replies ?? Math.max(0, postCount - topicCount),
      ),
      totalPosts: postCount,
      xp: Number(global.xp || 0),
      accountCreatedAt: global.account_created_at || null,
    };
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
              renderTlMark(textarea.value) || "<em>Sem conteúdo.</em>";
          event.currentTarget.textContent = preview.hidden
            ? "Pré-visualizar"
            : "Continuar editando";
        });
    });
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
    ]);
    const failure = [
      categoryResult,
      sectionResult,
      topicResult,
      postResult,
      forumProfileResult,
    ].find((result) => result.error);
    if (failure) throw failure.error;
    categories = categoryResult.data || [];
    sections = sectionResult.data || [];
    topics = topicResult.data || [];
    posts = postResult.data || [];
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

  function fillProfileForm() {
    const item = currentForumProfile || {};
    $("forumProfileDialogTitle").textContent = profileReady()
      ? "Editar perfil do Fórum"
      : "Complete seu perfil do Fórum";
    $("forumProfileNickname").value =
      item.forum_nickname || profile?.game_nickname || "";
    $("forumProfileCountry").value = item.country || "";
    $("forumProfileGame").value = item.main_game || "";
    $("forumProfilePlatform").value = item.platform || "";
    $("forumProfileMode").value = item.preferred_mode || "";
    $("forumProfileDiscord").value = item.discord || "";
    $("forumProfileBio").value = item.bio || "";
    const preview = $("forumProfileAvatarPreview");
    const source = item.avatar_signed_url || profile?.avatar_url;
    preview.innerHTML = source
      ? `<img src="${esc(source)}" alt="Preview do avatar">`
      : esc(
          (item.forum_nickname || profile?.game_nickname || "TL")
            .slice(0, 1)
            .toUpperCase(),
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
      uploadedPath = await uploadAvatar($("forumProfileAvatar").files?.[0]);
      const oldPath = currentForumProfile?.avatar_path || null;
      const { error } = await sb.rpc("tl_forum_save_profile", {
        p_nickname: $("forumProfileNickname").value.trim(),
        p_avatar_path: uploadedPath,
        p_country: $("forumProfileCountry").value.trim(),
        p_main_game: $("forumProfileGame").value.trim(),
        p_platform: $("forumProfilePlatform").value.trim(),
        p_preferred_mode: $("forumProfileMode").value.trim(),
        p_bio: $("forumProfileBio").value.trim(),
        p_discord: $("forumProfileDiscord").value.trim(),
      });
      if (error) throw error;
      if (oldPath && uploadedPath && oldPath !== uploadedPath)
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
      (topic) => topic.author_id === userId && topic.status === "approved",
    );
    const memberPosts = posts.filter(
      (post) => post.author_id === userId && !post.is_original,
    );
    setHeading("PERFIL DO FÓRUM", personName(userId));
    renderBreadcrumb([
      { label: "Fórum", href: "forum.html" },
      { label: personName(userId) },
    ]);
    view.innerHTML = `<section class="forum-full-profile">
      <header>${avatarMarkup(userId, "is-profile")}<div><h3 class="role-${esc(role(userId))}">${esc(personName(userId))}</h3><span class="forum-role-badge role-${esc(role(userId))}">${esc(roleLabel(userId))}</span><p>${esc(member.country || "País não informado")}</p></div>${userId === session.user.id ? '<button type="button" data-edit-profile>Editar perfil</button>' : ""}</header>
      <div class="forum-profile-stats"><article><b>${stats.topics}</b><small>Tópicos</small></article><article><b>${stats.posts}</b><small>Respostas</small></article><article><b>${stats.xp}</b><small>XP</small></article><article><b>${stats.accountCreatedAt ? esc(fmtDate(stats.accountCreatedAt)) : "—"}</b><small>Membro desde</small></article></div>
      <div id="forumProfileOverview" class="forum-profile-details"><section><h4>Perfil</h4><p>${esc(member.bio || "Este membro ainda não adicionou uma bio.")}</p></section><dl><div><dt>Jogo</dt><dd>${esc(member.main_game || "—")}</dd></div><div><dt>Plataforma</dt><dd>${esc(member.platform || "—")}</dd></div><div><dt>Modo</dt><dd>${esc(member.preferred_mode || "—")}</dd></div>${member.discord ? `<div><dt>Discord</dt><dd>${esc(member.discord)}</dd></div>` : ""}</dl></div>
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
                return `<a class="forum-profile-activity-row" href="forum.html?topic=${encodeURIComponent(post.topic_id)}#post-${encodeURIComponent(post.id)}" data-route><strong>${esc(topic?.title || "Tópico")}</strong><span>${esc(post.body.slice(0, 140))}</span><small>${esc(relative(post.created_at))}</small></a>`;
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
                text: item.body.slice(0, 100),
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
      (topic) => topic.section_id === section.id && topic.status === "approved",
    );
    const sectionPosts = posts.filter((post) =>
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
      postCount: sectionPosts.length,
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
      <span class="forum-section-count"><b>${stats.topicCount}</b><small>Tópicos</small></span>
      <span class="forum-section-count forum-post-count"><b>${stats.postCount}</b><small>Posts</small></span>
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
        : [{ label: "Fórum" }],
    );
    view.innerHTML =
      shown
        .map(
          (category) => `<section class="forum-category-block">
      <header><div><small>CATEGORIA</small><h3><a href="forum.html?category=${encodeURIComponent(category.slug)}" data-route>${esc(category.name)}</a></h3><p>${esc(category.description)}</p></div><span>${sections.filter((section) => section.category_id === category.id).length} pastas</span></header>
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
    const replies = Math.max(
      0,
      posts.filter((post) => post.topic_id === topic.id).length - 1,
    );
    return `<a class="forum-topic-row ${topic.is_pinned ? "is-pinned" : ""}" href="forum.html?topic=${encodeURIComponent(topic.id)}" data-route>
      <span class="forum-topic-state" aria-hidden="true">${topic.is_locked ? "◆" : topic.is_pinned ? "★" : "●"}</span>
      <span class="forum-topic-copy"><strong>${esc(topic.title)}</strong><small>por <b class="role-${esc(role(topic.author_id))}">${esc(personName(topic.author_id))}</b>${topic.is_pinned ? " · Fixado" : ""}${topic.is_locked ? " · Fechado" : ""}</small></span>
      <span class="forum-topic-metric"><b>${replies}</b><small>Respostas</small></span>
      <span class="forum-topic-metric forum-views"><b>${topic.view_count}</b><small>Visualizações</small></span>
      <span class="forum-topic-activity"><small>Última atividade</small><strong>${esc(relative(topic.last_activity_at))}</strong></span>
    </a>`;
  }

  function renderSection(slug) {
    const section = sections.find((item) => item.slug === slug);
    if (!section) return renderNotFound("Pasta não encontrada.");
    const category = categories.find((item) => item.id === section.category_id);
    const list = topics.filter(
      (topic) => topic.section_id === section.id && topic.status === "approved",
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
    return `<article id="${esc(postHash)}" class="forum-post-card" data-post-id="${esc(post.id)}">
      <header><a class="forum-post-author-mobile" href="forum.html?profile=${encodeURIComponent(post.author_id)}" data-route>${avatarMarkup(post.author_id, "is-mobile")}<span><strong class="role-${esc(role(post.author_id))}">${esc(personName(post.author_id))}</strong><small>${esc(author.country || "País não informado")} · ${stats.totalPosts} posts</small></span><span class="forum-role-badge role-${esc(role(post.author_id))}">${esc(roleLabel(post.author_id))}</span></a><div><time datetime="${esc(post.created_at)}">${esc(fmt(post.created_at))}</time><a href="#${esc(postHash)}" data-share-post="${esc(post.id)}" aria-label="Copiar link do post ${index + 1}">#${index + 1}</a></div></header>
      <div class="forum-post-layout"><aside class="forum-post-author"><a href="forum.html?profile=${encodeURIComponent(post.author_id)}" data-route>${avatarMarkup(post.author_id, "is-post")}<strong class="role-${esc(role(post.author_id))}">${esc(personName(post.author_id))}</strong></a><span class="forum-role-badge role-${esc(role(post.author_id))}">${esc(roleLabel(post.author_id))}</span><small>${esc(author.country || "País não informado")}</small><dl><div><dt>Jogo</dt><dd>${esc(author.main_game || "—")}</dd></div><div><dt>Posts</dt><dd>${stats.totalPosts}</dd></div><div><dt>XP</dt><dd>${stats.xp}</dd></div><div><dt>Publicado</dt><dd>${esc(relative(post.created_at))}</dd></div><div><dt>Membro desde</dt><dd>${memberSince ? esc(fmtDate(memberSince)) : "—"}</dd></div></dl></aside>
      <div class="forum-post-main">${quoted ? `<blockquote class="forum-linked-quote"><a href="#post-${esc(quoted.id)}">${esc(personName(quoted.author_id))} escreveu:</a><p>${renderTlMark(quoted.body.slice(0, 500))}</p></blockquote>` : ""}<div class="forum-post-body">${renderTlMark(post.body)}</div>${post.edited_at ? `<p class="forum-post-edited">Editado em ${esc(fmt(post.edited_at))}</p>` : ""}</div></div>
      <footer><span>${post.is_original ? "POST ORIGINAL" : `ID ${esc(post.id)}`}</span><div><button type="button" data-reply-post="${esc(post.id)}">Responder</button><button type="button" data-quote-post="${esc(post.id)}">Citar</button>${post.author_id === session.user.id || isModerator() ? `<button type="button" data-edit-post="${esc(post.id)}">Editar</button>` : ""}<button type="button" data-share-post="${esc(post.id)}">Compartilhar</button></div></footer>
    </article>`;
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
    view.innerHTML = `<section class="forum-topic-page">
      <header class="forum-topic-page-head"><div><h3>${esc(topic.title)}</h3><p>Iniciado por <b class="role-${esc(role(topic.author_id))}">${esc(personName(topic.author_id))}</b> · ${esc(fmt(topic.created_at))}</p></div><button type="button" data-share-topic>Compartilhar tópico</button></header>
      ${topic.status === "pending" ? '<div class="forum-pending-notice">Este tópico está visível apenas para você e para a moderação enquanto aguarda aprovação.</div>' : ""}
      <div class="forum-post-stack">${topicPosts.map(postCard).join("")}</div>
      ${topic.status === "approved" && !topic.is_locked ? '<button id="forumReplyButton" class="forum-primary-button forum-reply-button" type="button">Responder</button>' : topic.is_locked ? '<p class="forum-locked-note">Este tópico está fechado para novas respostas.</p>' : ""}
    </section>`;
    bindRoutes();
    bindShare(topic);
    bindPostActions(topic);
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

  function openReplyEditor(postId = null, quote = false) {
    if (!profileReady()) return openProfileEditor("reply");
    quotePostId = quote ? postId : null;
    const post = postId ? posts.find((item) => item.id === postId) : null;
    const context = $("forumReplyQuoteContext");
    context.hidden = !quotePostId;
    context.innerHTML =
      quotePostId && post
        ? `<strong>Citando ${esc(personName(post.author_id))}</strong><span>${esc(post.body.slice(0, 180))}</span>`
        : "";
    $("forumReplyBody").value =
      post && !quote ? `@${personName(post.author_id)} ` : "";
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
        $("forumEditPostBody").value = post.body;
        $("forumEditPostDialog").showModal();
      }),
    );
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
      notify("Link copiado.");
    } catch (_) {
      notify("Não foi possível copiar o link.", true);
    }
  }

  function bindShare(topic) {
    view
      .querySelector("[data-share-topic]")
      ?.addEventListener("click", () =>
        copyLink(
          `${location.origin}${location.pathname}?topic=${encodeURIComponent(topic.id)}`,
        ),
      );
    view.querySelectorAll("[data-share-post]").forEach((button) =>
      button.addEventListener("click", () => {
        copyLink(
          `${location.origin}${location.pathname}?topic=${encodeURIComponent(topic.id)}#post-${encodeURIComponent(button.dataset.sharePost)}`,
        );
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
    const query = params();
    const publicProfile = query.get("profile");
    const topic = query.get("topic");
    const section = query.get("section");
    if (publicProfile) return renderProfile(publicProfile);
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
      p_body: $("forumTopicBody").value.trim(),
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
      p_body: $("forumReplyBody").value.trim(),
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
      p_body: $("forumEditPostBody").value.trim(),
    });
    submit.disabled = false;
    if (error) return notify(error.message, true);
    $("forumEditPostDialog").close();
    editingPostId = null;
    await loadBoard();
    renderRoute();
    notify("Post atualizado.");
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
  $("forumProfileForm")?.addEventListener("submit", saveForumProfile);
  $("forumProfileAvatar")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const preview = $("forumProfileAvatarPreview");
    const url = window.URL.createObjectURL(file);
    preview.innerHTML = `<img src="${esc(url)}" alt="Preview do novo avatar">`;
  });
  document
    .querySelectorAll("[data-dialog-close]")
    .forEach((button) =>
      button.addEventListener("click", () => button.closest("dialog").close()),
    );
  document.querySelectorAll(".forum-board-dialog").forEach((dialog) =>
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    }),
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
