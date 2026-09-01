const crypto = require('crypto');

const CALLBACK_URI = 'https://teamlambreta.net/auth/tiktok/callback';
const AUTH_ENDPOINT = 'https://www.tiktok.com/v2/auth/authorize/';
const TOKEN_ENDPOINT = 'https://open.tiktokapis.com/v2/oauth/token/';
const USER_ENDPOINT = 'https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url';
const VIDEO_ENDPOINT = 'https://open.tiktokapis.com/v2/video/list/?fields=id,title,cover_image_url,share_url,create_time';
const SCOPES = 'user.info.basic,video.list';

function credentials() {
  const clientKey = String(process.env.TIKTOK_CLIENT_KEY || '').trim();
  const clientSecret = String(process.env.TIKTOK_CLIENT_SECRET || '').trim();
  return clientKey && clientSecret ? { clientKey, clientSecret } : null;
}

function redirectUri() {
  return String(process.env.TIKTOK_REDIRECT_URI || CALLBACK_URI).trim() || CALLBACK_URI;
}

function createState(clientSecret) {
  const payload = Buffer.from(JSON.stringify({ iat: Date.now(), nonce: crypto.randomBytes(18).toString('hex') })).toString('base64url');
  const signature = crypto.createHmac('sha256', clientSecret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyState(state, clientSecret) {
  if (typeof state !== 'string') return false;
  const [payload, signature] = state.split('.');
  if (!payload || !signature) return false;
  const expected = crypto.createHmac('sha256', clientSecret).update(payload).digest('base64url');
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Number.isFinite(data.iat) && Date.now() - data.iat >= 0 && Date.now() - data.iat < 10 * 60 * 1000;
  } catch (_) { return false; }
}

function authorizationUrl(clientKey, clientSecret) {
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set('client_key', clientKey);
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', redirectUri());
  url.searchParams.set('state', createState(clientSecret));
  return url.href;
}

async function parseResponse(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message || body?.error_description || `TikTok respondeu HTTP ${response.status}`);
  if (body?.error?.code && body.error.code !== 'ok') throw new Error(body.error.message || body.error.code);
  return body;
}

async function exchangeCode(code, config) {
  const response = await fetch(TOKEN_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_key: config.clientKey, client_secret: config.clientSecret, code, grant_type: 'authorization_code', redirect_uri: redirectUri() }) });
  return parseResponse(response);
}

async function fetchTikTokData(accessToken) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const user = await parseResponse(await fetch(USER_ENDPOINT, { headers }));
  const videos = await parseResponse(await fetch(VIDEO_ENDPOINT, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ max_count: 20 }) }));
  return { user: user.data?.user || {}, videos: Array.isArray(videos.data?.videos) ? videos.data.videos : [] };
}

module.exports = { credentials, verifyState, authorizationUrl, exchangeCode, fetchTikTokData };
