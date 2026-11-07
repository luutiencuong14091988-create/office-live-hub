const { isAuthed, query, send, fetchOrdersPage } = require('../lib/core');

// Chỉ giữ các trường cần cho văn phòng ảo. Bỏ toàn bộ thông tin khách hàng (tên, SĐT, địa chỉ...).
const person = p => p && typeof p === 'object'
  ? { id: p.id, name: p.name, avatar_url: p.avatar_url || p.avatar || p.picture || p.image_url || p.profile_picture || undefined, fb_id: p.fb_id || undefined }
  : undefined;
const slim = o => ({
  id: o.id, status: o.status,
  total_price: o.total_price, total_price_after_sub_discount: o.total_price_after_sub_discount,
  inserted_at: o.inserted_at, order_sources_name: o.order_sources_name,
  page: o.page && o.page.name ? { name: o.page.name } : undefined,
  creator: person(o.creator), creator_id: o.creator_id,
  assigning_seller: person(o.assigning_seller), assigning_seller_id: o.assigning_seller_id,
});

// Đơn Pancake theo ngày tạo (updateStatus=inserted_at). Chỉ cho phép khoảng thời gian ngắn quanh hôm nay.
module.exports = async (req, res) => {
  if (!isAuthed(req)) return send(res, 401, { error: 'unauthorized' });
  if (!process.env.PANCAKE_API_KEY) return send(res, 503, { error: 'Chưa cài PANCAKE_API_KEY trên Vercel' });
  const q = query(req);
  const start = parseInt(q.startDateTime, 10), end = parseInt(q.endDateTime, 10);
  const page = parseInt(q.page_number || '1', 10), size = parseInt(q.page_size || '100', 10);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return send(res, 400, { error: 'thời gian không hợp lệ' });
  if (end - start > 2 * 86400 || end > now + 300 || start < now - 3 * 86400) return send(res, 400, { error: 'chỉ hỗ trợ dữ liệu hôm nay' });
  if (!(page >= 1 && page <= 300) || !(size >= 1 && size <= 100)) return send(res, 400, { error: 'phân trang không hợp lệ' });
  try {
    const r = await fetchOrdersPage({ start, end, page, size });
    let j = {};
    try { j = JSON.parse(r.body); } catch { /* giữ rỗng */ }
    if (r.status !== 200) return send(res, r.status, { success: false, message: j.message || `Pancake HTTP ${r.status}` });
    send(res, 200, {
      success: j.success !== false, message: j.message,
      data: (j.data || []).map(slim),
      total_pages: j.total_pages, page_number: j.page_number, total_entries: j.total_entries,
    });
  } catch (e) {
    send(res, 502, { success: false, message: 'Không gọi được Pancake: ' + e.message });
  }
};
