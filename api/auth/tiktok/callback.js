const { credentials, verifyState, exchangeCode, fetchTikTokData } = require('./_oauth');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
}

function page(res, status, title, content) {
  res.status(status).setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.end(`<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} — Team Lambreta</title><style>body{margin:0;padding:32px;background:#05090d;color:#eef5f7;font:16px/1.55 Arial,sans-serif}main{width:min(760px,100%);margin:auto;padding:28px;border:1px solid rgba(94,243,255,.25);border-radius:18px;background:#101922}h1{margin-top:0;color:#5ef3ff}a{color:#73ff18}img{width:72px;height:72px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:12px}.profile{display:flex;align-items:center;margin:20px 0}.videos{display:grid;gap:12px}.video{display:grid;grid-template-columns:120px 1fr;gap:12px;align-items:center}.video img{width:120px;height:68px;border-radius:8px;margin:0}.muted{color:#9caeb5}@media(max-width:560px){body{padding:14px}main{padding:20px}.video{grid-template-columns:1fr}.video img{width:100%;height:auto}}</style></head><body><main>${content}</main></body></html>`);
}

module.exports = async function tiktokCallback(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return page(res, 405, 'Método não permitido', '<h1>Callback TikTok</h1><p>Este endereço aceita apenas retornos GET do TikTok.</p>');
  }
  const config = credentials();
  if (!config) return page(res, 503, 'Login TikTok indisponível', '<h1>Login TikTok indisponível</h1><p>Adicione <code>TIKTOK_CLIENT_KEY</code> e <code>TIKTOK_CLIENT_SECRET</code> às variáveis server-side da Vercel.</p>');
  const query = req.query || {};
  if (query.error) return page(res, 400, 'Autorização cancelada', `<h1>Autorização cancelada</h1><p>${escapeHtml(query.error_description || query.error)}</p><p><a href="/home.html">Voltar ao Team Lambreta</a></p>`);
  const code = typeof query.code === 'string' ? query.code : '';
  const state = typeof query.state === 'string' ? query.state : '';
  if (!code || !verifyState(state, config.clientSecret)) return page(res, 400, 'Retorno inválido', '<h1>Retorno TikTok inválido</h1><p>O código ou o state não pôde ser validado. Inicia o login novamente.</p><p><a href="/home.html">Voltar ao Team Lambreta</a></p>');
  try {
    const token = await exchangeCode(code, config);
    const accessToken = token?.data?.access_token || token?.access_token;
    if (!accessToken) throw new Error('TikTok não devolveu access token.');
    const { user, videos } = await fetchTikTokData(accessToken);
    const avatar = user.avatar_url ? `<img src="${escapeHtml(user.avatar_url)}" alt="">` : '';
    const videoMarkup = videos.length ? videos.map(video => `<article class="video">${video.cover_image_url ? `<img src="${escapeHtml(video.cover_image_url)}" alt="">` : '<div class="muted">Sem miniatura</div>'}<div><strong>${escapeHtml(video.title || 'Vídeo TikTok')}</strong>${video.share_url ? `<br><a href="${escapeHtml(video.share_url)}" target="_blank" rel="noopener noreferrer">Ver vídeo</a>` : ''}</div></article>`).join('') : '<p class="muted">Nenhum vídeo público encontrado.</p>';
    return page(res, 200, 'TikTok ligado', `<h1>Login TikTok concluído</h1><div class="profile">${avatar}<strong>${escapeHtml(user.display_name || 'Utilizador TikTok')}</strong></div><h2>Vídeos públicos</h2><section class="videos">${videoMarkup}</section><p><a href="/home.html">Voltar ao Team Lambreta</a></p>`);
  } catch (error) {
    console.error('[TikTok OAuth]', error);
    return page(res, 502, 'Falha no Login TikTok', `<h1>Não foi possível concluir o Login TikTok</h1><p>${escapeHtml(error.message || 'Erro ao comunicar com o TikTok.')}</p><p><a href="/home.html">Voltar ao Team Lambreta</a></p>`);
  }
};
