// Office Live Hub: logic dùng chung cho các API trên Vercel.
// Backend CHỈ ĐỌC dữ liệu Pancake. API key nằm ở biến môi trường, không bao giờ gửi xuống trình duyệt.
const crypto = require('crypto');

const SHOP_ID = process.env.SHOP_ID || '1290006440';
const POS_BASE = process.env.POS_BASE || 'https://pos.pages.fm/api/v1/';
const COOKIE = 'olh';

function expectedToken() {
  const u = process.env.DASHBOARD_USER || '0';
  const p = process.env.DASHBOARD_PASSWORD || '0';
  const secret = process.env.COOKIE_SECRET || 'office-live-hub-default-secret';
  return crypto.createHmac('sha256', secret).update(`${u}:${p}`).digest('hex');
}

function parseCookies(req) {
  const out = {};
  String(req.headers.cookie || '').split(';').forEach(part => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Mặc định: ai có link đều xem được. Muốn bắt đăng nhập thì đặt DASHBOARD_PASSWORD trên Vercel.
function authRequired() { return !!process.env.DASHBOARD_PASSWORD; }

function isAuthed(req) {
  if (!authRequired()) return true;
  const c = parseCookies(req)[COOKIE];
  return !!c && safeEqual(c, expectedToken());
}

function query(req) {
  return Object.fromEntries(new URL(req.url, 'http://x').searchParams);
}

function send(res, code, obj, headers = {}) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(obj));
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  const chunks = [];
  let size = 0;
  for await (const c of req) { size += c.length; if (size > 10000) break; chunks.push(c); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { return {}; }
}

// Bộ nhớ đệm 8 giây trong từng function instance: nhiều người xem cùng lúc dùng chung 1 lần gọi Pancake.
const CACHE = new Map();
const TTL_MS = 8000;

async function fetchOrdersPage({ start, end, page, size }) {
  const key = `${start}|${end}|${page}|${size}`;
  const hit = CACHE.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.res;
  const qs = new URLSearchParams({
    api_key: process.env.PANCAKE_API_KEY || '',
    page_size: String(size), page_number: String(page),
    updateStatus: 'inserted_at', startDateTime: String(start), endDateTime: String(end),
  });
  const r = await fetch(`${POS_BASE}shops/${encodeURIComponent(SHOP_ID)}/orders?${qs}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'office-live-hub' },
  });
  const res = { status: r.status, body: await r.text() };
  if (r.ok) {
    if (CACHE.size > 300) CACHE.clear();
    CACHE.set(key, { at: Date.now(), res });
  }
  return res;
}

module.exports = { COOKIE, authRequired, expectedToken, safeEqual, isAuthed, query, send, readJson, fetchOrdersPage };
