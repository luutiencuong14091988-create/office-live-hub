const { COOKIE, send } = require('../lib/core');

module.exports = (req, res) => {
  send(res, 200, { ok: true }, { 'Set-Cookie': `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure` });
};
