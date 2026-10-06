const router  = require('express').Router();
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const { query }     = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { sendOTP, sendInvitation } = require('../utils/mailer');

const SALT_ROUNDS = 12;
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function makeToken(userId, orgId) {
  return jwt.sign(
    { userId, orgId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// ── POST /api/auth/register ──────────────────────────────────
// Crée une organisation + son premier utilisateur (owner)
router.post('/register', async (req, res) => {
  const { org_name, email, password, first_name, last_name } = req.body;

  if (!org_name || !email || !password) {
    return res.status(400).json({ error: 'org_name, email et password requis' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Mot de passe trop court (8 car. min)' });
  }

  try {
    // Vérifier email unique
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'Email déjà utilisé' });
    }

    const slug = slugify(org_name) + '-' + crypto.randomBytes(3).toString('hex');
    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Transaction : org + user
    const client = require('../db').getClient ? await require('../db').getClient() : null;
    const q = client ? (t, p) => client.query(t, p) : query;

    if (client) await client.query('BEGIN');

    const orgRes = await q(
      `INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id`,
      [org_name, slug]
    );
    const orgId = orgRes.rows[0].id;

    const userRes = await q(
      `INSERT INTO users (organization_id, email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5, 'owner') RETURNING id, email, first_name, last_name, role`,
      [orgId, email.toLowerCase(), hash, first_name || '', last_name || '']
    );

    if (client) {
      await client.query('COMMIT');
      client.release();
    }

    const user = userRes.rows[0];
    const token = makeToken(user.id, orgId);

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, role: user.role },
      organization: { id: orgId, name: org_name, slug, plan: 'free' }
    });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email et password requis' });

  try {
    const { rows } = await query(
      `SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name, u.role,
              u.organization_id,
              o.name AS org_name, o.slug AS org_slug, o.plan AS org_plan, o.alert_email, o.alert_on_open, o.alert_on_fail, o.alert_on_multi_device
       FROM users u
       JOIN organizations o ON o.id = u.organization_id
       WHERE u.email = $1 AND u.is_active = TRUE AND o.is_active = TRUE`,
      [email.toLowerCase()]
    );

    if (!rows.length) return res.status(401).json({ error: 'Identifiants incorrects' });

    const user = rows[0];
    const ok   = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Identifiants incorrects' });

    // Mettre à jour last_login
    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    const token = makeToken(user.id, user.organization_id);
    res.json({
      token,
      user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, role: user.role },
      organization: { id: user.organization_id, name: user.org_name, slug: user.org_slug, plan: user.org_plan }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  const u = req.user;
  res.json({
    user: { id: u.id, email: u.email, first_name: u.first_name, last_name: u.last_name, role: u.role },
    organization: {
      id: u.organization_id, name: u.org_name, slug: u.org_slug, plan: u.org_plan, alert_email: u.alert_email, alert_on_open: u.alert_on_open, alert_on_fail: u.alert_on_fail, alert_on_multi_device: u.alert_on_multi_device,
      limits: {
        max_docs_per_month: u.max_docs_per_month,
        max_users:          u.max_users,
        max_recipients:     u.max_recipients,
        watermark:          u.watermark,
        otp:                u.otp,
        custom_branding:    u.custom_branding,
        api_access:         u.api_access,
      }
    }
  });
});

// ── POST /api/auth/invite ─────────────────────────────────────
// Owner/Admin invite un nouveau membre
router.post('/invite', requireAuth, requireRole('owner', 'admin'), async (req, res) => {
  const { email, role = 'member' } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requis' });

  try {
    // Vérifier quota users
    const { rows: countRows } = await query(
      'SELECT COUNT(*) AS c FROM users WHERE organization_id = $1',
      [req.user.organization_id]
    );
    if (parseInt(countRows[0].c) >= req.user.max_users) {
      return res.status(402).json({ error: 'Quota utilisateurs atteint, passez au plan supérieur' });
    }

    const token  = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 7 * 24 * 3600 * 1000); // 7 jours

    await query(
      `INSERT INTO invitations (organization_id, invited_by, email, role, token, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [req.user.organization_id, req.user.id, email.toLowerCase(), role, token, expiry]
    );

    // Envoyer email d'invitation
    await sendInvitation({
      to: email,
      orgName: req.user.org_name,
      inviterName: `${req.user.first_name} ${req.user.last_name}`.trim(),
      token,
      baseUrl: process.env.APP_URL || 'https://doctracker.monairbyte.eu'
    });

    res.json({ success: true, message: 'Invitation envoyée' });
  } catch (err) {
    console.error('Invite error:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── POST /api/auth/accept-invite ─────────────────────────────
router.post('/accept-invite', async (req, res) => {
  const { token, password, first_name, last_name } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token et password requis' });

  try {
    const { rows } = await query(
      `SELECT * FROM invitations WHERE token = $1 AND accepted_at IS NULL AND expires_at > NOW()`,
      [token]
    );
    if (!rows.length) return res.status(400).json({ error: 'Invitation invalide ou expirée' });

    const inv  = rows[0];
    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    const userRes = await query(
      `INSERT INTO users (organization_id, email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, first_name, last_name, role`,
      [inv.organization_id, inv.email, hash, first_name || '', last_name || '', inv.role]
    );

    await query('UPDATE invitations SET accepted_at = NOW() WHERE id = $1', [inv.id]);

    const user  = userRes.rows[0];
    const token2 = makeToken(user.id, inv.organization_id);

    res.json({ token: token2, user });
  } catch (err) {
    console.error('Accept invite error:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;

// ── POST /api/auth/alert-settings ────────────────────────────
router.post('/alert-settings', requireAuth, requireRole('owner', 'admin'), async (req, res) => {
  const { alert_email, alert_on_open, alert_on_fail, alert_on_multi_device } = req.body;
  try {
    await query(
      `UPDATE organizations SET
         alert_email = $1,
         alert_on_open = $2,
         alert_on_fail = $3,
         alert_on_multi_device = $4
       WHERE id = $5`,
      [alert_email||null, alert_on_open!==false, alert_on_fail!==false, alert_on_multi_device!==false, req.user.organization_id]
    );
    res.json({ success: true });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

router.put('/change-password', requireAuth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const bcrypt = require('bcrypt');
    const { rows } = await query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if(!valid) return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    const hash = await bcrypt.hash(new_password, 10);
    await query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.user.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
