const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../db');
const nodemailer = require('nodemailer');

const getTransporter = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || 587),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT ds.*,d.title,d.original_name,r.name as recipient_name FROM document_shares ds LEFT JOIN documents d ON d.id=ds.document_id LEFT JOIN recipients r ON r.id=ds.recipient_id WHERE ds.organization_id=$1 ORDER BY ds.created_at DESC LIMIT 50',
      [req.user.organization_id]
    );
    res.json(rows);
  } catch(e) { res.json([]); }
});

router.post('/send-bulk', requireAuth, async (req, res) => {
  try {
    const { member_ids, customMessage } = req.body;
    const transporter = getTransporter();
    let sent = 0;
    for(const memberId of member_ids||[]) {
      const { rows } = await query('SELECT * FROM recipients WHERE id=$1 AND organization_id=$2', [memberId, req.user.organization_id]);
      if(!rows.length || !rows[0].email) continue;
      const m = rows[0];
      const share = await query('SELECT ds.*,d.title,d.original_name FROM document_shares ds LEFT JOIN documents d ON d.id=ds.document_id WHERE ds.recipient_id=$1 AND ds.organization_id=$2 ORDER BY ds.created_at DESC LIMIT 1', [memberId, req.user.organization_id]);
      const viewUrl = share.rows.length ? `${process.env.APP_URL||'https://saas.doctracker.monairbyte.eu'}/view/${share.rows[0].token}` : '#';
      const docTitle = share.rows.length ? (share.rows[0].title||share.rows[0].original_name) : 'Document';
      try {
        await transporter.sendMail({ from: process.env.SMTP_FROM||'DocTracker', to: m.email, subject: `📄 ${docTitle}`, html: `<p>Bonjour ${m.name},</p>${customMessage?`<p>${customMessage}</p>`:''}<p><a href="${viewUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">📄 Accéder au document</a></p>` });
        sent++;
      } catch(e) {}
    }
    res.json({ success: true, sent });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/send-link/:memberId', requireAuth, async (req, res) => {
  try {
    const { customMessage } = req.body;
    const { rows } = await query('SELECT * FROM recipients WHERE id=$1 AND organization_id=$2', [req.params.memberId, req.user.organization_id]);
    if(!rows.length || !rows[0].email) return res.status(400).json({ error: 'Pas d\'email' });
    const m = rows[0];
    const share = await query('SELECT ds.*,d.title,d.original_name FROM document_shares ds LEFT JOIN documents d ON d.id=ds.document_id WHERE ds.recipient_id=$1 AND ds.organization_id=$2 ORDER BY ds.created_at DESC LIMIT 1', [req.params.memberId, req.user.organization_id]);
    const viewUrl = share.rows.length ? `${process.env.APP_URL||'https://saas.doctracker.monairbyte.eu'}/view/${share.rows[0].token}` : '#';
    const docTitle = share.rows.length ? (share.rows[0].title||share.rows[0].original_name) : 'Document';
    const transporter = getTransporter();
    await transporter.sendMail({ from: process.env.SMTP_FROM||'DocTracker', to: m.email, subject: `📄 ${docTitle}`, html: `<p>Bonjour ${m.name},</p>${customMessage?`<p>${customMessage}</p>`:''}<p><a href="${viewUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">📄 Accéder au document</a></p>` });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/send-otp', requireAuth, async (req, res) => {
  try {
    const { member_id } = req.body;
    const { rows } = await query('SELECT * FROM recipients WHERE id=$1 AND organization_id=$2', [member_id, req.user.organization_id]);
    if(!rows.length || !rows[0].email) return res.status(400).json({ error: 'Membre introuvable' });
    const m = rows[0];
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await query('UPDATE recipients SET otp_code=$1, otp_expires=$2 WHERE id=$3', [otp, new Date(Date.now()+3600000), member_id]);
    const transporter = getTransporter();
    await transporter.sendMail({ from: process.env.SMTP_FROM||'DocTracker', to: m.email, subject: `🔐 Code OTP: ${otp}`, html: `<p>Bonjour ${m.name},</p><p>Code OTP: <strong style="font-size:28px">${otp}</strong></p><p>Expire dans 1 heure.</p>` });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
