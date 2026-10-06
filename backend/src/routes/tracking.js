const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { query } = require('../db');

router.get('/events', requireAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit)||50;
    const type = req.query.type;
    let sql = `SELECT te.*,ds.document_id,d.original_name,d.title,r.name as member_name
               FROM tracking_events te
               LEFT JOIN document_shares ds ON ds.id=te.share_id
               LEFT JOIN documents d ON d.id=ds.document_id
               LEFT JOIN recipients r ON r.id=ds.recipient_id
               WHERE te.organization_id=$1`;
    const params = [req.user.organization_id];
    if(type){ sql+=' AND te.event_type=$2'; params.push(type); }
    sql+=` ORDER BY te.created_at DESC LIMIT ${limit}`;
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch(e) { res.json([]); }
});

router.get('/stats', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(`SELECT COUNT(*) as total_events, COUNT(DISTINCT share_id) as unique_shares, COUNT(DISTINCT ip_address) as unique_ips, COALESCE(SUM(duration_seconds),0) as total_duration FROM tracking_events WHERE organization_id=$1`, [req.user.organization_id]);
    res.json(rows[0]);
  } catch(e) { res.json({}); }
});

router.get('/heatmap/:documentId', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(`SELECT page_number,COUNT(*) as views,AVG(duration_seconds) as avg_duration FROM tracking_events WHERE organization_id=$1 AND share_id IN (SELECT id FROM document_shares WHERE document_id=$2) AND page_number IS NOT NULL GROUP BY page_number ORDER BY page_number`, [req.user.organization_id, req.params.documentId]);
    res.json(rows);
  } catch(e) { res.json([]); }
});

router.get('/heatmap-global', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(`SELECT d.id,d.title,d.original_name,COUNT(te.id) as total_views,AVG(te.duration_seconds) as avg_duration FROM documents d LEFT JOIN document_shares ds ON ds.document_id=d.id LEFT JOIN tracking_events te ON te.share_id=ds.id WHERE d.organization_id=$1 GROUP BY d.id ORDER BY total_views DESC NULLS LAST`, [req.user.organization_id]);
    res.json(rows);
  } catch(e) { res.json([]); }
});

router.get('/active-sessions', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(`SELECT te.share_id,te.ip_address,MAX(te.created_at) as last_activity,r.name as member_name,d.title FROM tracking_events te LEFT JOIN document_shares ds ON ds.id=te.share_id LEFT JOIN recipients r ON r.id=ds.recipient_id LEFT JOIN documents d ON d.id=ds.document_id WHERE te.organization_id=$1 AND te.created_at>NOW()-INTERVAL '15 minutes' GROUP BY te.share_id,te.ip_address,r.name,d.title`, [req.user.organization_id]);
    res.json(rows);
  } catch(e) { res.json([]); }
});

router.post('/event', async (req, res) => {
  try {
    const { token, event_type, page, duration, ip, user_agent, device_fingerprint } = req.body;
    const share = await query('SELECT * FROM document_shares WHERE token=$1', [token]);
    if(!share.rows.length) return res.status(404).json({ error: 'Token invalide' });
    const s = share.rows[0];
    await query('INSERT INTO tracking_events (share_id,organization_id,event_type,page_number,duration_seconds,ip_address,user_agent,device_fingerprint) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [s.id, s.organization_id, event_type, page||null, duration||null, ip||null, user_agent||null, device_fingerprint||null]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
