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
  const person = (id) =>
    profiles.get(id) || {
      full_name: "Membro",
      game_nickname: "",
      role: "member",
    };
  const personName = (id) =>
    person(id).game_nickname || person(id).full_name || "Membro";
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

  async function loadBoard() {
    view.setAttribute("aria-busy", "true");
    const [
      categoryResult,
      sectionResult,
      topicResult,
      postResult,
      profileResult,
    ] = await Promise.all([
      sb.from("forum_categories").select("*").order("sort_order"),
      sb.from("forum_sections").select("*").order("sort_order"),
      sb
        .from("forum_topics")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("last_activity_at", { ascending: false }),
      sb.from("forum_posts").select("*").order("created_at"),
      sb.from("profiles").select("id,full_name,game_nickname,role"),
    ]);
    const failure = [
      categoryResult,
      sectionResult,
      topicResult,
      postResult,
    ].find((result) => result.error);
    if (failure) throw failure.error;
    categories = categoryResult.data || [];
    sections = sectionResult.data || [];
    topics = topicResult.data || [];
    posts = postResult.data || [];
    profiles.clear();
    (profileResult.data || []).forEach((item) => profiles.set(item.id, item));
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
    const postHash = `post-${post.id}`;
    return `<article id="${esc(postHash)}" class="forum-post-card" data-post-id="${esc(post.id)}">
      <header><div><strong class="role-${esc(role(post.author_id))}">${esc(personName(post.author_id))}</strong><span class="forum-role-badge role-${esc(role(post.author_id))}">${esc(roleLabel(post.author_id))}</span></div><div><time datetime="${esc(post.created_at)}">${esc(fmt(post.created_at))}</time><a href="#${esc(postHash)}" aria-label="Link para este post">#${index + 1}</a></div></header>
      <div class="forum-post-body">${esc(post.body).replace(/\n/g, "<br>")}</div>
      <footer><span>${post.is_original ? "POST ORIGINAL" : `ID ${esc(post.id)}`}</span><button type="button" data-share-post="${esc(post.id)}">Compartilhar</button></footer>
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
    $("forumReplyButton")?.addEventListener("click", () =>
      $("forumReplyDialog").showModal(),
    );
    if (topic.status === "approved") {
      sb.rpc("tl_forum_register_view", { p_topic_id: topic.id }).then(
        ({ data }) => {
          if (Number.isFinite(data)) topic.view_count = data;
        },
      );
    }
    scrollToRequestedPost();
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
    const topic = query.get("topic");
    const section = query.get("section");
    if (topic) return renderTopic(topic);
    if (section) return renderSection(section);
    renderHome(query.get("category") || "");
  }

  async function submitTopic(event) {
    event.preventDefault();
    const button = event.submitter;
    button.disabled = true;
    const { data, error } = await sb.rpc("tl_forum_create_topic_v2", {
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
    const { data, error } = await sb.rpc("tl_forum_create_post_v2", {
      p_topic_id: topicId,
      p_body: $("forumReplyBody").value.trim(),
    });
    button.disabled = false;
    if (error) return notify(error.message, true);
    $("forumReplyDialog").close();
    event.target.reset();
    await loadBoard();
    history.replaceState(
      {},
      "",
      `forum.html?topic=${encodeURIComponent(topicId)}#post-${encodeURIComponent(data.id)}`,
    );
    renderRoute();
    notify("Resposta publicada.");
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
    $("forumCreateDialog").showModal(),
  );
  $("forumCreateForm")?.addEventListener("submit", submitTopic);
  $("forumReplyForm")?.addEventListener("submit", submitReply);
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
  init();
})();
