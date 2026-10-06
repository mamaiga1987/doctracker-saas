const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../db');

router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM recipients WHERE organization_id=$1 ORDER BY name', [req.user.organization_id]);
    res.json({ members: rows });
  } catch(e) { res.json({ members: [] }); }
});

router.post('/', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    const { name, email, phone, group_name, notes } = req.body;
    const { rows } = await query(
      'INSERT INTO recipients (name,email,phone,group_name,notes,organization_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [name, email||null, phone||null, group_name||null, notes||null, req.user.organization_id]
    );
    res.json(rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    const { name, email, phone, group_name, notes } = req.body;
    const { rows } = await query(
      'UPDATE recipients SET name=$1,email=$2,phone=$3,group_name=$4,notes=$5 WHERE id=$6 AND organization_id=$7 RETURNING *',
      [name, email||null, phone||null, group_name||null, notes||null, req.params.id, req.user.organization_id]
    );
    res.json(rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    await query('DELETE FROM recipients WHERE id=$1 AND organization_id=$2', [req.params.id, req.user.organization_id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/set-pin', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    await query('UPDATE recipients SET pin_code=$1 WHERE id=$2 AND organization_id=$3', [req.body.pin||null, req.params.id, req.user.organization_id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/set-otp-duration', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    await query('UPDATE recipients SET otp_duration=$1 WHERE id=$2 AND organization_id=$3', [req.body.hours ? req.body.hours+'h' : null, req.params.id, req.user.organization_id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id/set-download', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    await query('UPDATE recipients SET download_blocked=$1 WHERE id=$2 AND organization_id=$3', [req.body.blocked, req.params.id, req.user.organization_id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/reset-device', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    await query('UPDATE recipients SET device_fingerprint=NULL WHERE id=$1 AND organization_id=$2', [req.params.id, req.user.organization_id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/revoke', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    await query('UPDATE recipients SET is_active=false WHERE id=$1 AND organization_id=$2', [req.params.id, req.user.organization_id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/restore', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    await query('UPDATE recipients SET is_active=true WHERE id=$1 AND organization_id=$2', [req.params.id, req.user.organization_id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id/shares', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT ds.*,d.title,d.original_name FROM document_shares ds
       LEFT JOIN documents d ON d.id=ds.document_id
       WHERE ds.recipient_id=$1 AND ds.organization_id=$2 ORDER BY ds.created_at DESC`,
      [req.params.id, req.user.organization_id]
    );
    res.json(rows);
  } catch(e) { res.json([]); }
});

router.get('/risks/all', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT r.*,rec.name,rec.email FROM risk_scores r
       LEFT JOIN recipients rec ON rec.id=r.recipient_id
       WHERE r.organization_id=$1 ORDER BY r.score DESC`,
      [req.user.organization_id]
    );
    res.json(rows);
  } catch(e) { res.json([]); }
});

router.post('/bulk-import', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    let success = 0;
    for(const m of req.body.members||[]) {
      try {
        await query(
          'INSERT INTO recipients (name,email,phone,organization_id) VALUES ($1,$2,$3,$4) ON CONFLICT (email,organization_id) DO UPDATE SET name=EXCLUDED.name',
          [m.name, m.email, m.phone||null, req.user.organization_id]
        );
        success++;
      } catch(e) {}
    }
    res.json({ success: true, imported: success });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/global/send-pins', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM recipients WHERE organization_id=$1 AND pin_code IS NOT NULL AND email IS NOT NULL', [req.user.organization_id]);
    const nodemailer = require('nodemailer');
    const t = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT||587), secure: false, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
    let sent = 0;
    for(const m of rows) {
      try { await t.sendMail({ from: process.env.SMTP_FROM||'DocTracker', to: m.email, subject: '🔐 Votre PIN DocTracker', html: `<p>Bonjour ${m.name},</p><p>PIN: <strong>${m.pin_code}</strong></p>` }); sent++; } catch(e) {}
    }
    res.json({ success: true, sent });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/global/set-download', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    await query('UPDATE recipients SET download_blocked=$1 WHERE organization_id=$2', [req.body.blocked, req.user.organization_id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/regenerate-all', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    const crypto = require('crypto');
    const { rows } = await query('SELECT id FROM document_shares WHERE organization_id=$1', [req.user.organization_id]);
    for(const r of rows) await query('UPDATE document_shares SET token=$1 WHERE id=$2', [crypto.randomBytes(32).toString('hex'), r.id]);
    res.json({ success: true, updated: rows.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/send-pin-email', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM recipients WHERE id=$1 AND organization_id=$2', [req.params.id, req.user.organization_id]);
    if(!rows.length || !rows[0].pin_code) return res.status(400).json({ error: 'Pas de PIN' });
    const m = rows[0];
    const nodemailer = require('nodemailer');
    const t = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT||587), secure: false, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
    await t.sendMail({ from: process.env.SMTP_FROM||'DocTracker', to: m.email, subject: '🔐 Votre PIN DocTracker', html: `<p>Bonjour ${m.name},</p><p>PIN: <strong style="font-size:28px">${m.pin_code}</strong></p>` });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

// ── POST /api/members/:id/regenerate-token ───────────────────
router.post('/:id/regenerate-token', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    await query(
      `UPDATE document_shares SET token=$1 WHERE recipient_id=$2 AND organization_id=$3`,
      [token, req.params.id, req.user.organization_id]
    );
    const viewUrl = `${process.env.APP_URL || 'https://saas.doctracker.monairbyte.eu'}/view/${token}`;
    res.json({ success: true, token, viewUrl });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
