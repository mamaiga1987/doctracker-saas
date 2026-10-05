const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { query } = require('../db');

router.get('/forensic/:documentId', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT te.*, m.name as member_name, m.email as member_email, d.original_name, d.title
       FROM tracking_events te
       LEFT JOIN document_shares ds ON ds.id = te.share_id
       LEFT JOIN recipients m ON m.id = ds.member_id
       LEFT JOIN documents d ON d.id = ds.document_id
       WHERE ds.document_id=$1 AND te.organization_id=$2
       ORDER BY te.created_at ASC`,
      [req.params.documentId, req.user.organization_id]
    );
    res.json({ events: rows, generated_at: new Date(), organization_id: req.user.organization_id });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/forensic', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT d.id, d.title, d.original_name, COUNT(te.id) as event_count, MAX(te.created_at) as last_activity
       FROM documents d
       LEFT JOIN document_shares ds ON ds.document_id = d.id
       LEFT JOIN tracking_events te ON te.share_id = ds.id
       WHERE d.organization_id=$1
       GROUP BY d.id ORDER BY last_activity DESC NULLS LAST`,
      [req.user.organization_id]
    );
    res.json(rows);
  } catch(e) { res.json([]); }
});

module.exports = router;
