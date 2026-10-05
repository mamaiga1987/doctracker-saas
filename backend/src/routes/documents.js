const router   = require('express').Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const crypto   = require('crypto');
const { PDFDocument, rgb, StandardFonts, degrees } = require('pdf-lib');
const { query }     = require('../db');
const { requireAuth, requireRole, checkQuota } = require('../middleware/auth');

// ── Stockage local (dossier par organisation) ────────────────
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_DIR, req.user.organization_id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = crypto.randomBytes(16).toString('hex') + ext;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Seuls les fichiers PDF sont acceptés'));
    }
    cb(null, true);
  }
});

// ── Utilitaire : ajouter filigrane ───────────────────────────
async function addWatermark(inputPath, outputPath, watermarkText) {
  const pdfBytes  = fs.readFileSync(inputPath);
  const pdfDoc    = await PDFDocument.load(pdfBytes);
  const font      = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages     = pdfDoc.getPages();

  for (const page of pages) {
    const { width, height } = page.getSize();
    const fontSize = Math.min(width, height) * 0.045;

    // Filigrane diagonal répété (3x3 grille)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        page.drawText(watermarkText, {
          x:        (width / 3)  * col + width / 6,
          y:        (height / 3) * row + height / 6,
          size:     fontSize,
          font,
          color:    rgb(0.5, 0.5, 0.5),
          opacity:  0.18,
          rotate:   degrees(-35),
        });
      }
    }
  }

  const out = await pdfDoc.save();
  fs.writeFileSync(outputPath, out);
}

// ── GET /api/documents ───────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT d.*,
              u.first_name || ' ' || u.last_name AS created_by_name,
              (SELECT COUNT(*) FROM document_shares ds WHERE ds.document_id = d.id) AS share_count,
              (SELECT COUNT(*) FROM document_shares ds
               JOIN tracking_events te ON te.share_id = ds.id
               WHERE ds.document_id = d.id) AS event_count
       FROM documents d
       LEFT JOIN users u ON u.id = d.created_by
       WHERE d.organization_id = $1
       ORDER BY d.created_at DESC`,
      [req.user.organization_id]
    );
    res.json({ documents: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/documents ──────────────────────────────────────
router.post('/', requireAuth, requireRole('owner', 'admin', 'member'), checkQuota,
  upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Fichier PDF requis' });

    const {
      title,
      watermark_text,
      pin_enabled    = 'true',
      otp_enabled    = 'true',
      download_allowed = 'false',
      expires_at
    } = req.body;

    const orgId    = req.user.organization_id;
    const filePath = req.file.path;

    // Filigrane si plan le permet
    let finalPath = filePath;
    if (req.user.watermark && watermark_text) {
      const watermarkedPath = filePath.replace('.pdf', '_wm.pdf');
      await addWatermark(filePath, watermarkedPath, watermark_text);
      finalPath = watermarkedPath;
    }

    // Compter pages
    const pdfBytes = fs.readFileSync(finalPath);
    const pdfDoc   = await PDFDocument.load(pdfBytes);
    const pageCount = pdfDoc.getPageCount();

    // Storage path relatif
    const storagePath = path.relative(UPLOAD_DIR, finalPath);

    const { rows } = await query(
      `INSERT INTO documents
         (organization_id, created_by, title, original_name, storage_path,
          file_size, page_count, watermark_text,
          pin_enabled, otp_enabled, download_allowed, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        orgId,
        req.user.id,
        title || req.file.originalname,
        req.file.originalname,
        storagePath,
        req.file.size,
        pageCount,
        watermark_text || null,
        pin_enabled    === 'true',
        otp_enabled    === 'true',
        download_allowed === 'true',
        expires_at || null
      ]
    );

    // Incrémenter docs_used
    await query(
      'UPDATE organizations SET docs_used = docs_used + 1 WHERE id = $1',
      [orgId]
    );

    res.status(201).json({ document: rows[0] });
  } catch (err) {
    console.error('Upload error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/documents/:id ────────────────────────────────
router.delete('/:id', requireAuth, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM documents WHERE id = $1 AND organization_id = $2',
      [req.params.id, req.user.organization_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Document introuvable' });

    // Supprimer fichier
    const fullPath = path.join(UPLOAD_DIR, rows[0].storage_path);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

    await query('DELETE FROM documents WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// ── PUT /api/documents/:id ────────────────────────────────────
router.put('/:id', requireAuth, requireRole('owner', 'admin'), async (req, res) => {
  const { title, watermark_text, pin_enabled, otp_enabled, download_allowed, expires_at } = req.body;
  try {
    const { rows } = await query(
      `UPDATE documents SET
         title            = COALESCE($1, title),
         watermark_text   = $2,
         pin_enabled      = COALESCE($3, pin_enabled),
         otp_enabled      = COALESCE($4, otp_enabled),
         download_allowed = COALESCE($5, download_allowed),
         expires_at       = $6,
         updated_at       = NOW()
       WHERE id = $7 AND organization_id = $8
       RETURNING *`,
      [title, watermark_text||null, pin_enabled, otp_enabled, download_allowed,
       expires_at||null, req.params.id, req.user.organization_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Document introuvable' });
    res.json({ document: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
