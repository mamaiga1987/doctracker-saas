const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { query } = require('../db');

// Route stub - à implémenter
router.get('/', requireAuth, async (req, res) => {
  res.json({ message: 'ai - disponible prochainement', data: [] });
});

module.exports = router;
