const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { query } = require('../db');
const https = require('https');

function callClaude(prompt) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body)
      }
    }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        try { resolve(JSON.parse(d).content[0].text); }
        catch(e) { resolve('Erreur IA'); }
      });
    });
    req.on('error', () => resolve('Erreur réseau'));
    req.write(body);
    req.end();
  });
}

router.get('/', requireAuth, async (req, res) => {
  res.json({ status: 'ok', message: 'Centre IA disponible' });
});

router.post('/analyze/:memberId', requireAuth, async (req, res) => {
  try {
    const { rows: memberRows } = await query(
      'SELECT * FROM recipients WHERE id=$1 AND organization_id=$2',
      [req.params.memberId, req.user.organization_id]
    );
    if(!memberRows.length) return res.status(404).json({ error: 'Membre non trouvé' });
    const m = memberRows[0];

    const { rows: events } = await query(
      `SELECT * FROM tracking_events WHERE organization_id=$1 AND share_id IN
       (SELECT id FROM document_shares WHERE recipient_id=$2)
       ORDER BY created_at DESC LIMIT 30`,
      [req.user.organization_id, req.params.memberId]
    );

    const prompt = `Analyse le comportement de lecture de ce membre DocTracker:
Nom: ${m.name}, Email: ${m.email}
Nombre d'événements: ${events.length}
Derniers événements: ${JSON.stringify(events.slice(0,5))}
Donne une analyse courte (3-4 phrases) sur son engagement, risques éventuels et recommandations.`;

    const analysis = await callClaude(prompt);
    res.json({ analysis, member: m.name });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/summary', requireAuth, async (req, res) => {
  try {
    const { rows: docs } = await query('SELECT COUNT(*) as total FROM documents WHERE organization_id=$1', [req.user.organization_id]);
    const { rows: members } = await query('SELECT COUNT(*) as total FROM recipients WHERE organization_id=$1', [req.user.organization_id]);
    const { rows: events } = await query('SELECT COUNT(*) as total FROM tracking_events WHERE organization_id=$1', [req.user.organization_id]);

    const prompt = `Génère un résumé analytique pour cette organisation DocTracker:
- Documents: ${docs[0].total}
- Membres: ${members[0].total}  
- Événements de tracking: ${events[0].total}
Donne 3 insights clés et 2 recommandations en 5 phrases maximum.`;

    const summary = await callClaude(prompt);
    res.json({ summary });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
