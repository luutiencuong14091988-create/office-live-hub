const { COOKIE, expectedToken, safeEqual, send, readJson } = require('../lib/core');
const crypto = require('crypto');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  const { user = '', pass = '' } = await readJson(req);
  const secret = process.env.COOKIE_SECRET || 'office-live-hub-default-secret';
  const token = crypto.createHmac('sha256', secret).update(`${user}:${pass}`).digest('hex');
  if (!safeEqual(token, expectedToken())) {
    await new Promise(r => setTimeout(r, 600));   // làm chậm dò mật khẩu
    return send(res, 401, { ok: false, error: 'Sai tài khoản hoặc mật khẩu' });
  }
  send(res, 200, { ok: true }, {
    'Set-Cookie': `${COOKIE}=${token}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax; Secure`,
  });
};
