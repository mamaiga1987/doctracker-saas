const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { query } = require('../db');

router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT DISTINCT ON (device_fingerprint)
         device_fingerprint, user_agent, ip_address,
         MAX(created_at) as last_seen, COUNT(*) as event_count
       FROM tracking_events
       WHERE organization_id=$1 AND device_fingerprint IS NOT NULL
       GROUP BY device_fingerprint, user_agent, ip_address
       ORDER BY device_fingerprint, last_seen DESC`,
      [req.user.organization_id]
    );
    res.json(rows);
  } catch(e) { res.json([]); }
});

module.exports = router;
