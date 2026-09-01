const { credentials, authorizationUrl } = require('./_oauth');

function htmlError(res, message) {
  res.status(503).setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.end(`<!doctype html><meta charset="utf-8"><title>Login TikTok indisponível</title><p>${message}</p>`);
}

module.exports = function tiktokStart(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  const config = credentials();
  if (!config) return htmlError(res, 'O Login TikTok ainda não está configurado neste ambiente.');
  res.setHeader('Cache-Control', 'no-store');
  res.writeHead(302, { Location: authorizationUrl(config.clientKey, config.clientSecret) });
  return res.end();
};
