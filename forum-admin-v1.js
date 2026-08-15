(() => {
  "use strict";
  const sb = window.teamSupabase;
  const approvedHost = document.getElementById("forumAdminList");
  const pendingHost = document.getElementById("pendingForumAdminList");
  if (!sb || !approvedHost || !pendingHost) return;

  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[character],
    );
  let topics = [],
    sections = [],
    profiles = new Map();
  const sectionName = (id) =>
    sections.find((item) => item.id === id)?.name || "Pasta";
  const authorName = (id) =>
    profiles.get(id)?.game_nickname || profiles.get(id)?.full_name || "Membro";
  const options = (selected) =>
    sections
      .map(
        (item) =>
          `<option value="${item.id}" ${item.id === selected ? "selected" : ""}>${esc(item.name)}</option>`,
      )
      .join("");

  function message(text) {
    if (typeof toast === "function") toast(text);
  }

  function approvedCard(topic) {
    return `<article class="admin-item pending-topic" data-forum-topic="${esc(topic.id)}">
      <div class="item-top"><strong>${esc(topic.title)}</strong><span class="pill">${topic.is_locked ? "Fechado" : topic.is_pinned ? "Fixado" : "Aberto"}</span></div>
      <p><b>Autor:</b> ${esc(authorName(topic.author_id))} · <b>Pasta:</b> ${esc(sectionName(topic.section_id))}</p>
      <div class="pending-actions"><button data-forum-action="${topic.is_pinned ? "unpin" : "pin"}">${topic.is_pinned ? "Desfixar" : "Fixar"}</button><button data-forum-action="${topic.is_locked ? "unlock" : "lock"}">${topic.is_locked ? "Reabrir" : "Fechar"}</button><select aria-label="Mover tópico" data-forum-section>${options(topic.section_id)}</select><button data-forum-action="move">Mover</button><a href="forum.html?topic=${encodeURIComponent(topic.id)}">Ver tópico</a></div>
    </article>`;
  }

  function pendingCard(topic) {
    return `<article class="admin-item pending-topic" data-forum-topic="${esc(topic.id)}">
      <div class="item-top"><strong>${esc(topic.title)}</strong><span class="pill">Pendente</span></div>
      <p><b>Autor:</b> ${esc(authorName(topic.author_id))} · <b>Pasta:</b> ${esc(sectionName(topic.section_id))}</p>
      <p>${esc(topic.body)}</p>
      <div class="pending-actions"><button data-forum-action="approve">Aprovar</button><button class="danger" data-forum-action="reject">Recusar</button><a href="forum.html?topic=${encodeURIComponent(topic.id)}">Rever tópico</a></div>
    </article>`;
  }

  function render() {
    const approved = topics.filter((item) => item.status === "approved");
    const pending = topics.filter((item) => item.status === "pending");
    approvedHost.innerHTML = approved.length
      ? approved.map(approvedCard).join("")
      : '<div class="empty-admin">Nenhum tópico aprovado.</div>';
    pendingHost.innerHTML = pending.length
      ? pending.map(pendingCard).join("")
      : '<div class="empty-admin">Nenhum tópico pendente.</div>';
  }

  async function load() {
    const [topicResult, sectionResult, profileResult] = await Promise.all([
      sb
        .from("forum_topics")
        .select("*")
        .order("last_activity_at", { ascending: false }),
      sb.from("forum_sections").select("id,name").order("sort_order"),
      sb.from("profiles").select("id,full_name,game_nickname"),
    ]);
    if (topicResult.error || sectionResult.error) {
      pendingHost.innerHTML =
        '<div class="empty-admin">Não foi possível carregar a moderação do Fórum.</div>';
      return;
    }
    topics = topicResult.data || [];
    sections = sectionResult.data || [];
    profiles = new Map(
      (profileResult.data || []).map((item) => [item.id, item]),
    );
    render();
  }

  async function act(button) {
    const card = button.closest("[data-forum-topic]");
    const action = button.dataset.forumAction;
    if (!card || !action) return;
    button.disabled = true;
    const section = card.querySelector("[data-forum-section]");
    const { error } = await sb.rpc("tl_forum_moderate_topic_v2", {
      p_topic_id: card.dataset.forumTopic,
      p_action: action,
      p_section_id: action === "move" ? Number(section?.value) : null,
    });
    button.disabled = false;
    if (error) {
      message(error.message);
      return;
    }
    message(
      action === "approve"
        ? "Tópico aprovado."
        : action === "reject"
          ? "Tópico recusado."
          : "Tópico atualizado.",
    );
    await load();
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-forum-action]");
    if (button) act(button);
  });
  load();
})();
