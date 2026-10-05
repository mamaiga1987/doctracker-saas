const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { query } = require('../db');

router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT ls.*, m.name as member_name, d.title as doc_title, d.original_name
       FROM live_sessions ls
       LEFT JOIN recipients m ON m.id = ls.member_id
       LEFT JOIN documents d ON d.id = ls.document_id
       WHERE ls.organization_id=$1 AND ls.ended_at IS NULL
       ORDER BY ls.started_at DESC`,
      [req.user.organization_id]
    );
    res.json(rows);
  } catch(e) { res.json([]); }
});

module.exports = router;
