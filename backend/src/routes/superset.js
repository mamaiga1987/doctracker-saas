const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');

router.get('/query', requireAuth, async (req, res) => res.json({ data: [] }));
router.get('/test', requireAuth, async (req, res) => res.json({ status: 'ok' }));
router.get('/users', requireAuth, async (req, res) => res.json([]));

module.exports = router;
