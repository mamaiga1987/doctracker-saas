const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../db');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.post('/csv', requireAuth, requireRole('owner','admin'), upload.single('file'), async (req, res) => {
  try {
    if(!req.file) return res.status(400).json({ error: 'Fichier CSV requis' });
    const csv = req.file.buffer.toString('utf8');
    const lines = csv.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g,''));
    const results = { success: 0, errors: [] };

    for(let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map(v => v.trim().replace(/"/g,''));
      const row = {};
      headers.forEach((h, idx) => row[h] = vals[idx] || '');
      const name = row.name || row.nom || row.prenom + ' ' + row.nom || '';
      const email = row.email || '';
      if(!name.trim()) continue;
      try {
        await query(
          'INSERT INTO recipients (name, email, organization_id) VALUES ($1,$2,$3) ON CONFLICT (email, organization_id) DO UPDATE SET name=EXCLUDED.name',
          [name.trim(), email.trim() || null, req.user.organization_id]
        );
        results.success++;
      } catch(e) { results.errors.push({ line: i+1, error: e.message }); }
    }
    res.json(results);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/template', requireAuth, (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=template_membres.csv');
  res.send('name,email,phone\nJean Dupont,jean.dupont@email.com,0612345678\n');
});

module.exports = router;
