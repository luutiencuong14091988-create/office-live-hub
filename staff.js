const { isAuthed, send } = require('../lib/core');
const staff = require('../staff.json');

module.exports = (req, res) => {
  if (!isAuthed(req)) return send(res, 401, { error: 'unauthorized' });
  send(res, 200, staff);
};
