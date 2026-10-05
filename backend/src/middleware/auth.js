const jwt = require('jsonwebtoken');
const { query } = require('../db');

// ── Vérifie le JWT et injecte user + organization ────────────
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant' });
    }

    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Charger user + org en une query
    const { rows } = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role,
              u.organization_id,
              o.name  AS org_name, o.alert_email, o.alert_on_open, o.alert_on_fail, o.alert_on_multi_device,
              o.slug  AS org_slug,
              o.plan  AS org_plan,
              o.is_active AS org_active,
              pl.max_docs_per_month, pl.max_users, pl.max_recipients,
              pl.watermark, pl.otp, pl.custom_branding, pl.api_access
       FROM users u
       JOIN organizations o  ON o.id = u.organization_id
       JOIN plan_limits pl   ON pl.plan = o.plan
       WHERE u.id = $1 AND u.is_active = TRUE AND o.is_active = TRUE`,
      [payload.userId]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Utilisateur introuvable ou inactif' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expiré' });
    }
    return res.status(401).json({ error: 'Token invalide' });
  }
}

// ── Vérifie qu'un rôle minimum est requis ────────────────────
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Permission insuffisante' });
    }
    next();
  };
}

// ── Vérifie les quotas du plan avant upload ──────────────────
async function checkQuota(req, res, next) {
  try {
    const orgId = req.user.organization_id;

    // Compter les docs ce mois-ci
    const { rows } = await query(
      `SELECT COUNT(*) AS count FROM documents
       WHERE organization_id = $1
         AND created_at >= date_trunc('month', NOW())`,
      [orgId]
    );

    const used = parseInt(rows[0].count);
    const max  = req.user.max_docs_per_month;

    if (used >= max) {
      return res.status(402).json({
        error: 'Quota mensuel atteint',
        used,
        max,
        plan: req.user.org_plan,
        upgrade_url: '/settings/billing'
      });
    }

    req.quotaUsed = used;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAuth, requireRole, checkQuota };
