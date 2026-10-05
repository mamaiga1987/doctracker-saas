const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../db');

router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM organizations WHERE id=$1', [req.user.organization_id]);
    res.json(rows[0] || {});
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    const { name, alert_email, alert_on_open, alert_on_fail, alert_on_multi_device } = req.body;
    const { rows } = await query(
      `UPDATE organizations SET name=$1, alert_email=$2, alert_on_open=$3, alert_on_fail=$4, alert_on_multi_device=$5
       WHERE id=$6 RETURNING *`,
      [name, alert_email, alert_on_open||false, alert_on_fail||false, alert_on_multi_device||false, req.user.organization_id]
    );
    res.json(rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/admin-email', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    const { email } = req.body;
    const { rows } = await query('UPDATE organizations SET alert_email=$1 WHERE id=$2 RETURNING *', [email, req.user.organization_id]);
    res.json(rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/otp-duration', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    const { duration } = req.body;
    await query('UPDATE organizations SET otp_duration=$1 WHERE id=$2', [duration||'1h', req.user.organization_id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/all-alerts', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    const { alert_on_open, alert_on_fail, alert_on_multi_device } = req.body;
    await query(
      'UPDATE organizations SET alert_on_open=$1, alert_on_fail=$2, alert_on_multi_device=$3 WHERE id=$4',
      [alert_on_open||false, alert_on_fail||false, alert_on_multi_device||false, req.user.organization_id]
    );
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/ai-prompt', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    const { prompt } = req.body;
    await query('UPDATE organizations SET ai_prompt=$1 WHERE id=$2', [prompt, req.user.organization_id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/all-members', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM recipients WHERE organization_id=$1 ORDER BY name', [req.user.organization_id]);
    res.json(rows);
  } catch(e) { res.json([]); }
});

router.get('/all-history', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT te.*, r.name as member_name, d.title FROM tracking_events te
       LEFT JOIN document_shares ds ON ds.id = te.share_id
       LEFT JOIN recipients r ON r.id = ds.recipient_id
       LEFT JOIN documents d ON d.id = ds.document_id
       WHERE te.organization_id=$1 ORDER BY te.created_at DESC LIMIT 500`,
      [req.user.organization_id]
    );
    res.json(rows);
  } catch(e) { res.json([]); }
});

router.put('/change-password', requireAuth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const bcrypt = require('bcrypt');
    const { rows } = await query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if(!valid) return res.status(401).json({ error: 'Mot de passe incorrect' });
    const hash = await bcrypt.hash(new_password, 10);
    await query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.user.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
