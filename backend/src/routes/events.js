const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { query } = require('../db');

router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT te.*, ds.document_id, d.original_name, d.title
       FROM tracking_events te
       LEFT JOIN document_shares ds ON ds.id = te.share_id
       LEFT JOIN documents d ON d.id = ds.document_id
       WHERE te.organization_id=$1
       ORDER BY te.created_at DESC LIMIT 200`,
      [req.user.organization_id]
    );
    res.json(rows);
  } catch(e) { res.json([]); }
});

module.exports = router;
