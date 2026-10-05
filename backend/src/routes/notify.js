const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
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
      'SELECT * FROM document_shares WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 100',
      [req.user.organization_id]
    );
    res.json(rows);
  } catch(e) { res.json([]); }
});

router.post('/send', requireAuth, async (req, res) => {
  try {
    const { member_ids, document_id, message } = req.body;
    const orgId = req.user.organization_id;
    const doc = await query('SELECT * FROM documents WHERE id=$1 AND organization_id=$2', [document_id, orgId]);
    if(!doc.rows.length) return res.status(404).json({ error: 'Document non trouvé' });
    const results = [];
    const transporter = getTransporter();
    for(const memberId of member_ids) {
      const member = await query('SELECT * FROM recipients WHERE id=$1 AND organization_id=$2', [memberId, orgId]);
      if(!member.rows.length) continue;
      const m = member.rows[0];
      const crypto = require('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
      await query(
        'INSERT INTO document_shares (document_id, member_id, organization_id, token, expires_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
        [document_id, memberId, orgId, token, expiresAt]
      );
      const viewUrl = `${process.env.APP_URL || 'https://saas.doctracker.monairbyte.eu'}/view/${token}`;
      if(m.email) {
        try {
          await transporter.sendMail({
            from: process.env.SMTP_FROM || 'DocTracker',
            to: m.email,
            subject: `📄 ${doc.rows[0].title || doc.rows[0].original_name}`,
            html: `<p>Bonjour ${m.name},</p><p>${message || 'Veuillez consulter ce document.'}</p><p><a href="${viewUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Voir le document</a></p>`
          });
        } catch(mailErr) { console.log('Email erreur:', mailErr.message); }
      }
      results.push({ member: m.name, email: m.email, token, viewUrl });
    }
    res.json({ success: true, sent: results.length, results });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/send-otp', requireAuth, async (req, res) => {
  try {
    const { member_id } = req.body;
    const orgId = req.user.organization_id;
    const member = await query('SELECT * FROM recipients WHERE id=$1 AND organization_id=$2', [member_id, orgId]);
    if(!member.rows.length) return res.status(404).json({ error: 'Membre non trouvé' });
    const m = member.rows[0];
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 3600 * 1000);
    await query('UPDATE recipients SET otp_code=$1, otp_expires=$2 WHERE id=$3', [otp, expiresAt, member_id]);
    if(m.email) {
      const transporter = getTransporter();
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'DocTracker',
        to: m.email,
        subject: `🔐 Votre code d'accès : ${otp}`,
        html: `<p>Bonjour ${m.name},</p><p>Code : <strong style="font-size:24px">${otp}</strong></p><p>Expire dans 1 heure.</p>`
      });
    }
    res.json({ success: true, otp });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
