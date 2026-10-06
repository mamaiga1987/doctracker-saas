const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { query } = require('../db');

router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(`SELECT ls.*,r.name as member_name,d.title FROM live_sessions ls LEFT JOIN recipients r ON r.id=ls.member_id LEFT JOIN documents d ON d.id=ls.document_id WHERE ls.organization_id=$1 ORDER BY ls.started_at DESC LIMIT 100`, [req.user.organization_id]);
    res.json(rows);
  } catch(e) { res.json([]); }
});

router.get('/summary', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(`SELECT COUNT(DISTINCT te.share_id) as total_sessions, COUNT(DISTINCT ds.recipient_id) as unique_members, COUNT(DISTINCT ds.document_id) as unique_documents, COALESCE(AVG(te.duration_seconds),0) as avg_duration, MAX(te.created_at) as last_activity FROM tracking_events te LEFT JOIN document_shares ds ON ds.id=te.share_id WHERE te.organization_id=$1`, [req.user.organization_id]);
    res.json(rows[0]||{});
  } catch(e) { res.json({}); }
});

router.get('/member/:memberId', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(`SELECT te.*,d.title FROM tracking_events te LEFT JOIN document_shares ds ON ds.id=te.share_id LEFT JOIN documents d ON d.id=ds.document_id LEFT JOIN recipients r ON r.id=ds.recipient_id WHERE te.organization_id=$1 AND r.id=$2 ORDER BY te.created_at DESC LIMIT 50`, [req.user.organization_id, req.params.memberId]);
    res.json(rows);
  } catch(e) { res.json([]); }
});

module.exports = router;
