const router  = require('express').Router();
const crypto  = require('crypto');
const path    = require('path');
const fs      = require('fs');
const { query } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { sendAccessEmail } = require('../services/email');
const { processPDF } = require('../services/pdf');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

function generateOTP() { return Math.floor(100000 + Math.random() * 900000).toString(); }
function generatePIN() { return Math.floor(1000 + Math.random() * 9000).toString(); }

router.get('/', requireAuth, async (req, res) => {
  const { document_id } = req.query;
  try {
    let sql = `SELECT ds.*, d.title AS doc_title,
      (SELECT COUNT(*) FROM tracking_events te WHERE te.share_id = ds.id) AS event_count
      FROM document_shares ds
      LEFT JOIN documents d ON d.id = ds.document_id
      WHERE ds.organization_id = $1 AND ds.revoked_at IS NULL`;
    const params = [req.user.organization_id];
    if (document_id) { sql += ` AND ds.document_id = $2`; params.push(document_id); }
    sql += ` ORDER BY ds.created_at DESC`;
    const { rows } = await query(sql, params);
    res.json({ shares: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireAuth, requireRole('owner', 'admin', 'member'), async (req, res) => {
  const { document_id, recipients, recipient_email, recipient_name, custom_message } = req.body;
  if (!document_id) return res.status(400).json({ error: 'document_id requis' });

  let recipientList = [];
  if (Array.isArray(recipients) && recipients.length) {
    recipientList = recipients;
  } else if (recipient_email) {
    recipientList = [{ email: recipient_email, name: recipient_name || '' }];
  } else {
    return res.status(400).json({ error: 'Au moins un destinataire requis' });
  }

  try {
    const { rows: docRows } = await query(
      'SELECT * FROM documents WHERE id = $1 AND organization_id = $2',
      [document_id, req.user.organization_id]
    );
    if (!docRows.length) return res.status(404).json({ error: 'Document introuvable' });
    const doc = docRows[0];
    const baseUrl = process.env.APP_URL || 'https://saas.doctracker.monairbyte.eu';
    const results = [], errors = [];

    for (const recip of recipientList) {
      if (!recip.email) continue;
      try {
        const rRes = await query(
          `INSERT INTO recipients (organization_id, email, name)
           VALUES ($1, $2, $3)
           ON CONFLICT (email, organization_id) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [req.user.organization_id, recip.email.toLowerCase(), recip.name || '']
        );
        const recipientId = rRes.rows[0].id;
        const token  = crypto.randomBytes(32).toString('hex');
        const pin    = recip.pin || (doc.pin_enabled ? generatePIN() : null);
        const otp    = doc.otp_enabled ? generateOTP() : null;
        const secret = otp ? crypto.createHash('sha256').update(otp + token).digest('hex') : null;

        await query(
          `INSERT INTO document_shares
           (document_id, organization_id, recipient_id, recipient_email, recipient_name, token, pin, otp_secret)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [document_id, req.user.organization_id, recipientId,
           recip.email.toLowerCase(), recip.name || '', token, pin, secret]
        );

        const accessUrl = `${baseUrl}/view/${token}`;

        // ── Générer PDF personnalisé avec filigrane + QR code ──
        const inputPath = path.join(UPLOAD_DIR, doc.storage_path);
        if (fs.existsSync(inputPath)) {
          processPDF({
            inputPath,
            orgId:           req.user.organization_id,
            shareToken:      token,
            recipientName:   recip.name || recip.email,
            recipientEmail:  recip.email,
            orgName:         req.user.org_name,
            version:         'A',
            watermarkEnabled: true,
            qrCodeEnabled:   true,
            metadataEnabled: true,
            trackingBaseUrl: baseUrl,
          }).then(personalizedPath => {
            // Mettre à jour storage_path dans la base
            const relPath = path.relative(UPLOAD_DIR, personalizedPath);
            query(
              `UPDATE document_shares SET device_fingerprint = $1 WHERE token = $2`,
              [relPath, token]
            ).catch(()=>{});
          }).catch(e => console.warn('PDF processing error:', e.message));
        }

        // ── Envoyer email OTP + PIN ──
        try {
          await sendAccessEmail({
            to: recip.email, name: recip.name || recip.email,
            otp, pin, docTitle: doc.title,
            orgName: req.user.org_name,
            accessUrl, customMessage: custom_message || '',
          });
        } catch (emailErr) {
          console.warn(`Email non envoye a ${recip.email}:`, emailErr.message);
        }

        results.push({ email: recip.email, name: recip.name, token, access_url: accessUrl, pin, otp_sent: !!otp, success: true });
      } catch (err) {
        errors.push({ email: recip.email, error: err.message });
      }
    }

    if (results.length > 0) {
      await query('UPDATE organizations SET docs_used = docs_used + 1 WHERE id = $1', [req.user.organization_id]);
    }

    if (recipientList.length === 1) {
      const r = results[0];
      res.status(201).json({ share: { token: r?.token }, access_url: r?.access_url, pin: r?.pin, success: r?.success });
    } else {
      res.status(201).json({ success: true, sent: results.length, errors: errors.length, results });
    }
  } catch (err) {
    console.error('Share error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAuth, requireRole('owner', 'admin'), async (req, res) => {
  try {
    await query(`UPDATE document_shares SET revoked_at = NOW() WHERE id = $1 AND organization_id = $2`,
      [req.params.id, req.user.organization_id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
