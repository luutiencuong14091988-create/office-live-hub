const { isAuthed, authRequired, send } = require('../lib/core');

// Không trả dữ liệu nào: chỉ cho trang biết đang chạy trên Vercel và đã đăng nhập chưa.
module.exports = (req, res) => {
  send(res, 200, { ok: true, mode: 'vercel', authed: isAuthed(req), authRequired: authRequired(), hasKey: !!process.env.PANCAKE_API_KEY });
};
