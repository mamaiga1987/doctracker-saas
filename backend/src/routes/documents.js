const router = require('express').Router();
const { requireAuth, requireRole, checkQuota } = require('../middleware/auth');
const { query } = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_DIR, req.user.organization_id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, crypto.randomBytes(16).toString('hex') + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if(file.mimetype !== 'application/pdf') return cb(new Error('PDF uniquement'));
    cb(null, true);
  }
});

// GET /documents
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM documents WHERE organization_id=$1 ORDER BY created_at DESC',
      [req.user.organization_id]
    );
    res.json({ documents: rows });
  } catch(e) { res.json({ documents: [] }); }
});

// POST /documents/upload/:version
router.post('/upload/:version', requireAuth, requireRole('owner','admin'), checkQuota, upload.single('pdf'), async (req, res) => {
  try {
    if(!req.file) return res.status(400).json({ error: 'Fichier requis' });
    const { title, description } = req.body;
    const version = req.params.version || 'A';
    const { rows } = await query(
      `INSERT INTO documents (organization_id, created_by, title, original_name, storage_path, file_size, status)
       VALUES ($1,$2,$3,$4,$5,$6,'active') RETURNING *`,
      [req.user.organization_id, req.user.id, title||req.file.originalname, req.file.originalname, req.file.path, req.file.size]
    );
    await query('UPDATE organizations SET docs_used=docs_used+1 WHERE id=$1', [req.user.organization_id]);
    res.json(rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// DELETE /documents/:version
router.delete('/:id', requireAuth, requireRole('owner','admin'), async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM documents WHERE id=$1 AND organization_id=$2', [req.params.id, req.user.organization_id]);
    if(!rows.length) return res.status(404).json({ error: 'Document non trouvé' });
    if(rows[0].storage_path && fs.existsSync(rows[0].storage_path)) {
      fs.unlinkSync(rows[0].storage_path);
    }
    await query('DELETE FROM documents WHERE id=$1 AND organization_id=$2', [req.params.id, req.user.organization_id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /documents/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM documents WHERE id=$1 AND organization_id=$2', [req.params.id, req.user.organization_id]);
    if(!rows.length) return res.status(404).json({ error: 'Document non trouvé' });
    res.json(rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
