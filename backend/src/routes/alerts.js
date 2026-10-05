
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { query } = require('../db');

router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT COUNT(*) as count FROM alerts WHERE organization_id=$1 AND is_read=false',
      [req.user.organization_id]
    );
    res.json({ count: parseInt(rows[0].count) });
  } catch(e) { res.json({ count: 0 }); }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM alerts WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 50',
      [req.user.organization_id]
    );
    res.json(rows);
  } catch(e) { res.json([]); }
});

router.put('/:id/read', requireAuth, async (req, res) => {
  try {
    await query('UPDATE alerts SET is_read=true WHERE id=$1 AND organization_id=$2',
      [req.params.id, req.user.organization_id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/mark-all-read', requireAuth, async (req, res) => {
  try {
    await query('UPDATE alerts SET is_read=true WHERE organization_id=$1',
      [req.user.organization_id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
