const router = require('express').Router();
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');

// ── GET /api/analytics/overview ─────────────────────────────
router.get('/overview', requireAuth, async (req, res) => {
  const orgId = req.user.organization_id;
  try {
    const [docs, shares, events, alerts, recentEvents] = await Promise.all([
      // Total documents
      query(`SELECT COUNT(*) AS total,
                    SUM(CASE WHEN created_at >= date_trunc('month', NOW()) THEN 1 ELSE 0 END) AS this_month
             FROM documents WHERE organization_id = $1`, [orgId]),

      // Total shares
      query(`SELECT COUNT(*) AS total,
                    SUM(CASE WHEN revoked_at IS NULL THEN 1 ELSE 0 END) AS active
             FROM document_shares WHERE organization_id = $1`, [orgId]),

      // Total events 30 derniers jours
      query(`SELECT COUNT(*) AS total,
                    SUM(CASE WHEN event_type='opened'     THEN 1 ELSE 0 END) AS opens,
                    SUM(CASE WHEN event_type='downloaded' THEN 1 ELSE 0 END) AS downloads,
                    SUM(CASE WHEN event_type='unauthorized_access' THEN 1 ELSE 0 END) AS unauthorized
             FROM tracking_events
             WHERE organization_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`, [orgId]),

      // Alertes non lues
      query(`SELECT COUNT(*) AS unread,
                    SUM(CASE WHEN severity='critical' THEN 1 ELSE 0 END) AS critical
             FROM alerts WHERE organization_id = $1 AND is_read = FALSE`, [orgId]),

      // Derniers 10 événements
      query(`SELECT te.*, ds.recipient_email, ds.recipient_name, d.title AS doc_title
             FROM tracking_events te
             JOIN document_shares ds ON ds.id = te.share_id
             JOIN documents d ON d.id = ds.document_id
             WHERE te.organization_id = $1
             ORDER BY te.created_at DESC LIMIT 10`, [orgId]),
    ]);

    res.json({
      docs:   docs.rows[0],
      shares: shares.rows[0],
      events: events.rows[0],
      alerts: alerts.rows[0],
      recent_events: recentEvents.rows,
      quota: {
        used:  parseInt(docs.rows[0].this_month),
        max:   req.user.max_docs_per_month,
        plan:  req.user.org_plan,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/analytics/activity?days=30 ─────────────────────
router.get('/activity', requireAuth, async (req, res) => {
  const orgId = req.user.organization_id;
  const days  = Math.min(parseInt(req.query.days || '30'), 90);
  try {
    const { rows } = await query(
      `SELECT date_trunc('day', created_at) AS day,
              event_type,
              COUNT(*) AS count
       FROM tracking_events
       WHERE organization_id = $1
         AND created_at >= NOW() - ($2 || ' days')::INTERVAL
       GROUP BY 1, 2
       ORDER BY 1 ASC`,
      [orgId, days]
    );
    res.json({ activity: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/analytics/geo ───────────────────────────────────
router.get('/geo', requireAuth, async (req, res) => {
  const orgId = req.user.organization_id;
  try {
    const { rows } = await query(
      `SELECT country, city, COUNT(*) AS count
       FROM tracking_events
       WHERE organization_id = $1
         AND country != '' AND event_type = 'opened'
         AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY country, city
       ORDER BY count DESC LIMIT 20`,
      [orgId]
    );
    res.json({ geo: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/analytics/alerts ────────────────────────────────
router.get('/alerts', requireAuth, async (req, res) => {
  const orgId = req.user.organization_id;
  const { unread_only } = req.query;
  try {
    let sql = `
      SELECT a.*, ds.recipient_email, d.title AS doc_title
      FROM alerts a
      LEFT JOIN document_shares ds ON ds.id = a.share_id
      LEFT JOIN documents d ON d.id = ds.document_id
      WHERE a.organization_id = $1`;
    if (unread_only === 'true') sql += ` AND a.is_read = FALSE`;
    sql += ` ORDER BY a.created_at DESC LIMIT 50`;

    const { rows } = await query(sql, [orgId]);
    res.json({ alerts: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/analytics/alerts/:id/read ─────────────────────
router.patch('/alerts/:id/read', requireAuth, async (req, res) => {
  try {
    await query(
      'UPDATE alerts SET is_read = TRUE WHERE id = $1 AND organization_id = $2',
      [req.params.id, req.user.organization_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
