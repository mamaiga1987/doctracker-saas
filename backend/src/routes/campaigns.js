const router  = require('express').Router();
const crypto  = require('crypto');
const { query }    = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { sendOTP }  = require('../utils/mailer');
const { processPDF } = require('../utils/watermark');
const path = require('path');
const fs   = require('fs');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

function generateOTP() { return Math.floor(100000 + Math.random() * 900000).toString(); }
function generatePIN() { return Math.floor(1000 + Math.random() * 9000).toString(); }

// ── POST /api/campaigns — Envoyer liens groupés ──────────────
router.post('/', requireAuth, requireRole('owner', 'admin', 'member'), async (req, res) => {
  const {
    document_id,
    recipient_ids,   // [] ou 'all'
    group_name,      // filtre optionnel
    subject,
    message,
    pdf_version = 'A',
    pin_custom,      // PIN personnalisé optionnel
  } = req.body;

  if (!document_id) return res.status(400).json({ error: 'document_id requis' });

  try {
    // Charger le document
    const { rows: docRows } = await query(
      'SELECT * FROM documents WHERE id = $1 AND organization_id = $2',
      [document_id, req.user.organization_id]
    );
    if (!docRows.length) return res.status(404).json({ error: 'Document introuvable' });
    const doc = docRows[0];

    // Charger les destinataires
    let sql = `SELECT * FROM recipients WHERE organization_id = $1 AND is_active = TRUE`;
    const params = [req.user.organization_id];
    if (Array.isArray(recipient_ids) && recipient_ids.length) {
      sql += ` AND id = ANY($2::uuid[])`;
      params.push(recipient_ids);
    } else if (group_name) {
      sql += ` AND group_name = $2`;
      params.push(group_name);
    }

    const { rows: recipients } = await query(sql, params);
    if (!recipients.length) return res.status(400).json({ error: 'Aucun destinataire trouvé' });

    // Créer la campagne
    const { rows: campRows } = await query(
      `INSERT INTO email_campaigns (organization_id, document_id, created_by, subject, message, recipient_count, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'sending') RETURNING id`,
      [req.user.organization_id, document_id, req.user.id, subject || `Document: ${doc.title}`, message || '', recipients.length]
    );
    const campaignId = campRows[0].id;

    // Traiter en arrière-plan
    const baseUrl = process.env.APP_URL || 'https://saas.doctracker.monairbyte.eu';
    let sentCount = 0;

    // Répondre immédiatement
    res.json({ 
      success: true, 
      campaign_id: campaignId, 
      recipient_count: recipients.length,
      message: 'Envoi en cours...'
    });

    // Traitement async
    for (const recipient of recipients) {
      try {
        const token  = crypto.randomBytes(32).toString('hex');
        const pin    = pin_custom || (doc.pin_enabled ? generatePIN() : null);
        const otp    = doc.otp_enabled ? generateOTP() : null;
        const secret = otp ? crypto.createHash('sha256').update(otp + token).digest('hex') : null;

        // Créer le share
        await query(
          `INSERT INTO document_shares
             (document_id, organization_id, recipient_id, recipient_email, recipient_name,
              token, pin, otp_secret, pdf_version, email_sent_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
           ON CONFLICT DO NOTHING`,
          [document_id, req.user.organization_id, recipient.id,
           recipient.email, recipient.name, token, pin, secret, pdf_version]
        );

        // Générer PDF personnalisé avec filigrane + QR
        const inputPath = path.join(UPLOAD_DIR, doc.storage_path);
        if (fs.existsSync(inputPath)) {
          await processPDF({
            inputPath,
            orgId:           req.user.organization_id,
            shareToken:      token,
            recipientName:   recipient.name,
            recipientEmail:  recipient.email,
            orgName:         req.user.org_name,
            version:         pdf_version,
            watermarkEnabled: doc.watermark_text ? true : false,
            qrCodeEnabled:   doc.qr_code_enabled,
            metadataEnabled: true,
            trackingBaseUrl: baseUrl,
          });
        }

        // Envoyer OTP par email
        if (otp) {
          await sendOTP({
            to:       recipient.email,
            name:     recipient.name || recipient.email,
            otp,
            docTitle: doc.title,
            orgName:  req.user.org_name,
            accessUrl: `${baseUrl}/view/${token}`,
            customMessage: message,
            pin,
          });
        }

        sentCount++;
      } catch (err) {
        console.error(`Erreur envoi à ${recipient.email}:`, err.message);
      }
    }

    // Mettre à jour la campagne
    await query(
      `UPDATE email_campaigns SET status = 'done', sent_count = $1, sent_at = NOW() WHERE id = $2`,
      [sentCount, campaignId]
    );

  } catch (err) {
    console.error('Campaign error:', err.message);
  }
});

// ── GET /api/campaigns ────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT ec.*, d.title AS doc_title
       FROM email_campaigns ec
       JOIN documents d ON d.id = ec.document_id
       WHERE ec.organization_id = $1
       ORDER BY ec.created_at DESC LIMIT 50`,
      [req.user.organization_id]
    );
    res.json({ campaigns: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
