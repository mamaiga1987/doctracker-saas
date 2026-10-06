const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../db');

// GET durée OTP globale
router.get('/otp-duration', requireAuth, async (req, res) => {
  try {
    const row = await query("SELECT value FROM dt_settings WHERE key='otp_duration_hours'");
    res.json({ hours: parseInt(row?.value || '24') });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST durée OTP globale
router.post('/otp-duration', requireAuth, async (req, res) => {
  try {
    const { hours } = req.body;
    if (!hours || hours < 1 || hours > 8760) return res.status(400).json({ error: 'Durée invalide (1-8760h)' });
    await query(
      "INSERT INTO dt_settings (key, value, updated_at) VALUES ('otp_duration_hours', $1, NOW()) ON CONFLICT (key) DO UPDATE SET value=$1, updated_at=NOW()",
      [String(hours)]
    );
    res.json({ success: true, hours });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET admin email
router.get('/admin-email', requireAuth, async (req, res) => {
  try {
    const row = await query("SELECT value FROM dt_settings WHERE key='admin_email'");
    res.json({ email: row?.value || '' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST admin email
router.post('/admin-email', requireAuth, async (req, res) => {
  try {
    const { email } = req.body;
    await query(
      "INSERT INTO dt_settings (key, value, updated_at) VALUES ('admin_email', $1, NOW()) ON CONFLICT (key) DO UPDATE SET value=$1, updated_at=NOW()",
      [email || '']
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET ai prompt
router.get('/ai-prompt', requireAuth, async (req, res) => {
  try {
    const row = await query("SELECT value FROM dt_settings WHERE key='ai_prompt'");
    res.json({ prompt: row?.value || '' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST ai prompt
router.post('/ai-prompt', requireAuth, async (req, res) => {
  try {
    const { prompt } = req.body;
    await query(
      "INSERT INTO dt_settings (key, value, updated_at) VALUES ('ai_prompt', $1, NOW()) ON CONFLICT (key) DO UPDATE SET value=$1, updated_at=NOW()",
      [prompt || '']
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET settings — stats globales
router.get('/', requireAuth, async (req, res) => {
  try {
    const members = await query('SELECT COUNT(*) as count FROM dt_members');
    const events = await query('SELECT COUNT(*) as count FROM dt_events');
    const downloads = await query('SELECT COUNT(*) as count FROM dt_events WHERE event_type=$1', ['download']);
    const unauthorized = await query('SELECT COUNT(*) as count FROM dt_events WHERE event_type=$1', ['unauthorized_access']);
    res.json({
      totalMembers: parseInt(members.count),
      totalEvents: parseInt(events.count),
      totalDownloads: parseInt(downloads.count),
      totalUnauthorized: parseInt(unauthorized.count),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Supprimer historique d'un membre
router.delete('/member-history/:id', requireAuth, async (req, res) => {
  try {
    await query('DELETE FROM dt_events WHERE member_id = $1', [req.params.id]);
    await query('UPDATE dt_members SET total_opens=0, first_open_at=NULL, last_open_at=NULL, has_downloaded=FALSE, has_shared_link=FALSE, unauthorized_attempts=0, device_fingerprint=NULL, link_used=FALSE, updated_at=NOW() WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Supprimer toutes les alertes
router.delete('/all-alerts', requireAuth, async (req, res) => {
  try {
    await query('DELETE FROM dt_alerts');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Supprimer tout l'historique
router.delete('/all-history', requireAuth, async (req, res) => {
  try {
    await query('DELETE FROM dt_events');
    await query('DELETE FROM dt_alerts');
    await query('UPDATE dt_members SET total_opens=0, first_open_at=NULL, last_open_at=NULL, has_downloaded=FALSE, has_shared_link=FALSE, unauthorized_attempts=0, device_fingerprint=NULL, link_used=FALSE, updated_at=NOW()');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Supprimer tous les membres
router.delete('/all-members', requireAuth, async (req, res) => {
  try {
    await query('DELETE FROM dt_members');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Changer mot de passe admin
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin2024!';
    if (currentPassword !== adminPassword) return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Nouveau mot de passe trop court' });
    process.env.ADMIN_PASSWORD = newPassword;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
