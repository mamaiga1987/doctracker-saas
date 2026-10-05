const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { query } = require('../db');

// Route stub - à implémenter
router.get('/', requireAuth, async (req, res) => {
  res.json({ message: 'sessions - disponible prochainement', data: [] });
});

module.exports = router;

// ── GET /api/sessions/summary ─────────────────────────────────
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        COUNT(DISTINCT te.share_id) as total_sessions,
        COUNT(DISTINCT ds.recipient_id) as unique_members,
        COUNT(DISTINCT ds.document_id) as unique_documents,
        AVG(te.duration_seconds) as avg_duration,
        MAX(te.created_at) as last_activity
      FROM tracking_events te
      LEFT JOIN document_shares ds ON ds.id = te.share_id
      WHERE te.organization_id=$1`,
      [req.user.organization_id]
    );
    res.json(rows[0] || {});
  } catch(e) { res.json({}); }
});
