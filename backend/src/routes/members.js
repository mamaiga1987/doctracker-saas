const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../db');

const TABLE = 'recipients';

// GET /members
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM ${TABLE} WHERE organization_id=$1 ORDER BY name`, [req.user.organization_id]);
    res.json({ members: rows });
  } catch(e) { res.json({ members: [] }); }
});

// POST /members
router.post('/', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    const { name, email, phone, group_name, notes } = req.body;
    const { rows } = await query(
      `INSERT INTO ${TABLE} (name, email, phone, group_name, notes, organization_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, email, phone||null, group_name||null, notes||null, req.user.organization_id]
    );
    res.json(rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /members/:id
router.put('/:id', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    const { name, email, phone, group_name, notes } = req.body;
    const { rows } = await query(
      `UPDATE ${TABLE} SET name=$1, email=$2, phone=$3, group_name=$4, notes=$5 WHERE id=$6 AND organization_id=$7 RETURNING *`,
      [name, email, phone||null, group_name||null, notes||null, req.params.id, req.user.organization_id]
    );
    res.json(rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// DELETE /members/:id
router.delete('/:id', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    await query(`DELETE FROM ${TABLE} WHERE id=$1 AND organization_id=$2`, [req.params.id, req.user.organization_id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /members/:id/set-pin
router.post('/:id/set-pin', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    await query(`UPDATE ${TABLE} SET pin_code=$1 WHERE id=$2 AND organization_id=$3`, [req.body.pin||null, req.params.id, req.user.organization_id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /members/:id/pin
router.put('/:id/pin', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    await query(`UPDATE ${TABLE} SET pin_code=$1 WHERE id=$2 AND organization_id=$3`, [req.body.pin||null, req.params.id, req.user.organization_id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /members/:id/send-pin-email
router.post('/:id/send-pin-email', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM ${TABLE} WHERE id=$1 AND organization_id=$2`, [req.params.id, req.user.organization_id]);
    if(!rows.length) return res.status(404).json({ error: 'Membre non trouvé' });
    const m = rows[0];
    if(!m.pin_code) return res.status(400).json({ error: 'Aucun PIN défini' });
    const nodemailer = require('nodemailer');
    const t = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT||587), secure: false, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
    await t.sendMail({ from: process.env.SMTP_FROM||'DocTracker', to: m.email, subject: '🔐 Votre PIN DocTracker', html: `<p>Bonjour ${m.name},</p><p>PIN : <strong style="font-size:28px">${m.pin_code}</strong></p>` });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /members/:id/set-download
router.put('/:id/set-download', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    await query(`UPDATE ${TABLE} SET download_blocked=$1 WHERE id=$2 AND organization_id=$3`, [req.body.blocked, req.params.id, req.user.organization_id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /members/:id/block-download
router.put('/:id/block-download', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    await query(`UPDATE ${TABLE} SET download_blocked=$1 WHERE id=$2 AND organization_id=$3`, [req.body.blocked, req.params.id, req.user.organization_id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /members/:id/set-otp-duration
router.put('/:id/set-otp-duration', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    await query(`UPDATE ${TABLE} SET otp_duration=$1 WHERE id=$1 AND organization_id=$2`, [req.body.duration||'1h', req.params.id, req.user.organization_id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /members/:id/reset-device
router.post('/:id/reset-device', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    await query(`UPDATE ${TABLE} SET device_fingerprint=NULL WHERE id=$1 AND organization_id=$2`, [req.params.id, req.user.organization_id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /members/:id/revoke
router.post('/:id/revoke', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    await query(`UPDATE ${TABLE} SET is_active=false WHERE id=$1 AND organization_id=$2`, [req.params.id, req.user.organization_id]);
    await query(`UPDATE document_shares SET is_active=false WHERE recipient_id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /members/:id/restore
router.post('/:id/restore', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    await query(`UPDATE ${TABLE} SET is_active=true WHERE id=$1 AND organization_id=$2`, [req.params.id, req.user.organization_id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /members/:id/regenerate-token
router.post('/:id/regenerate-token', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    await query(`UPDATE document_shares SET token=$1 WHERE recipient_id=$2`, [token, req.params.id]);
    res.json({ success: true, token });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /members/:id/shares
router.get('/:id/shares', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT ds.*, d.title, d.original_name FROM document_shares ds
       LEFT JOIN documents d ON d.id = ds.document_id
       WHERE ds.recipient_id=$1 AND ds.organization_id=$2 ORDER BY ds.created_at DESC`,
      [req.params.id, req.user.organization_id]
    );
    res.json(rows);
  } catch(e) { res.json([]); }
});

// GET /members/risks/all
router.get('/risks/all', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT r.*, rec.name, rec.email FROM risk_scores r
       LEFT JOIN recipients rec ON rec.id = r.recipient_id
       WHERE r.organization_id=$1 ORDER BY r.score DESC`,
      [req.user.organization_id]
    );
    res.json(rows);
  } catch(e) { res.json([]); }
});

// POST /members/bulk-import
router.post('/bulk-import', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    const { members } = req.body;
    let success = 0;
    for(const m of members||[]) {
      try {
        await query(
          `INSERT INTO ${TABLE} (name, email, phone, organization_id) VALUES ($1,$2,$3,$4) ON CONFLICT (email, organization_id) DO UPDATE SET name=EXCLUDED.name`,
          [m.name, m.email, m.phone||null, req.user.organization_id]
        );
        success++;
      } catch(e) {}
    }
    res.json({ success: true, imported: success });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /members/global/send-pins
router.post('/global/send-pins', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM ${TABLE} WHERE organization_id=$1 AND pin_code IS NOT NULL AND email IS NOT NULL`, [req.user.organization_id]);
    const nodemailer = require('nodemailer');
    const t = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT||587), secure: false, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
    let sent = 0;
    for(const m of rows) {
      try {
        await t.sendMail({ from: process.env.SMTP_FROM||'DocTracker', to: m.email, subject: '🔐 Votre PIN DocTracker', html: `<p>Bonjour ${m.name},</p><p>PIN : <strong style="font-size:28px">${m.pin_code}</strong></p>` });
        sent++;
      } catch(e) {}
    }
    res.json({ success: true, sent });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /members/global/set-download
router.put('/global/set-download', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    await query(`UPDATE ${TABLE} SET download_blocked=$1 WHERE organization_id=$2`, [req.body.blocked, req.user.organization_id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /members/regenerate-all
router.post('/regenerate-all', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    const crypto = require('crypto');
    const { rows } = await query(`SELECT id FROM document_shares WHERE organization_id=$1`, [req.user.organization_id]);
    for(const r of rows) {
      await query(`UPDATE document_shares SET token=$1 WHERE id=$2`, [crypto.randomBytes(32).toString('hex'), r.id]);
    }
    res.json({ success: true, updated: rows.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

// ── POST /api/members/:id/set-otp-duration ───────────────────
router.post('/:id/set-otp-duration', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    const { hours } = req.body;
    await query(
      `UPDATE recipients SET otp_duration=$1 WHERE id=$2 AND organization_id=$3`,
      [hours ? hours + 'h' : null, req.params.id, req.user.organization_id]
    );
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
