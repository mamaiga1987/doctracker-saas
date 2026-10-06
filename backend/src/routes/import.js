const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { query, queryOne } = require('../db');
const crypto = require('crypto');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

function parseCSV(buffer) {
  const text = buffer.toString('utf-8');
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  if (lines.length < 2) throw new Error('Fichier CSV vide ou invalide');
  
  const headers = lines[0].split(/[,;]/).map(h => h.trim().toLowerCase()
    .replace(/é|è|ê/g, 'e').replace(/à/g, 'a').replace(/ù/g, 'u'));
  
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(/[,;]/).map(v => v.trim().replace(/^"|"$/g, ''));
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    rows.push(row);
  }
  return rows;
}

// POST /api/import/members — importer membres depuis CSV
router.post('/members', requireAuth, upload.single('csv'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Fichier CSV requis' });
    
    const rows = parseCSV(req.file.buffer);
    const results = { success: 0, skipped: 0, errors: [] };
    const baseUrl = process.env.BASE_URL || 'https://doctracker.monairbyte.eu';

    for (const row of rows) {
      const name = row.nom || row.name || row.prenom_nom || '';
      const email = row.email || row.mail || row.courriel || '';
      const grp = row.groupe || row.group || row.grp || 'moins_confiant';
      const version = (row.version || 'A').toUpperCase();
      const pin = row.pin || row.pin_code || null;
      const otpHours = row.otp_heures || row.otp_hours || null;

      if (!name || !email) {
        results.errors.push({ row: name || email || '?', error: 'Nom ou email manquant' });
        continue;
      }

      // Vérifier si email déjà existant
      const existing = await query('SELECT id FROM dt_members WHERE email=$1', [email.toLowerCase()]);
      if (existing) {
        results.skipped++;
        continue;
      }

      // Valider version
      const validVersion = ['A','B','C'].includes(version) ? version : 'A';
      const validGroup = ['confiant','moins_confiant','pas_confiant'].includes(grp) ? grp : 'moins_confiant';

      const token = generateToken();
      const trackingLink = baseUrl + '/api/track/view/' + token;

      await query(
        `INSERT INTO dt_members (name, email, grp, version, token, tracking_link,
         pin_code, otp_duration_hours, allow_download, is_active, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,false,true,NOW(),NOW())`,
        [name, email.toLowerCase(), validGroup, validVersion, token, trackingLink,
         pin || null, otpHours ? parseInt(otpHours) : null]
      );
      results.success++;
    }

    res.json({
      success: true,
      imported: results.success,
      skipped: results.skipped,
      errors: results.errors,
      total: rows.length
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/import/template — télécharger modèle CSV
router.get('/template', requireAuth, (req, res) => {
  const csv = 'nom,email,groupe,version\n' +
    'Jean Dupont,jean.dupont@email.com,confiant,A\n' +
    'Marie Martin,marie.martin@email.com,moins_confiant,A\n' +
    'Pierre Durand,pierre.durand@email.com,,\n';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="modele-import-membres.csv"');
  res.send(csv);
});

module.exports = router;
