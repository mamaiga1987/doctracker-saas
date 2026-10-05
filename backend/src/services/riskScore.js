const { query } = require('../db');

// ── Calcul du score de risque (0-100) ────────────────────────
// Plus le score est élevé, plus le comportement est suspect
async function computeRiskScore(shareId, organizationId) {
  const factors = {};
  let score = 0;

  try {
    // 1. Tentatives d'accès non autorisé
    const { rows: unauth } = await query(
      `SELECT COUNT(*) AS c FROM tracking_events
       WHERE share_id = $1 AND event_type = 'unauthorized_access'`,
      [shareId]
    );
    const unauthCount = parseInt(unauth[0].c);
    if (unauthCount > 0) {
      const pts = Math.min(unauthCount * 15, 40);
      score += pts;
      factors.unauthorized_attempts = { count: unauthCount, points: pts };
    }

    // 2. Comportements suspects
    const { rows: suspicious } = await query(
      `SELECT behavior_type, COUNT(*) AS c, SUM(severity) AS sev
       FROM suspicious_behaviors WHERE share_id = $1
       GROUP BY behavior_type`,
      [shareId]
    );
    if (suspicious.length > 0) {
      const pts = Math.min(suspicious.reduce((a, s) => a + parseInt(s.sev), 0) * 2, 30);
      score += pts;
      factors.suspicious_behaviors = {
        types: suspicious.map(s => s.behavior_type),
        points: pts
      };
    }

    // 3. Multi-appareils (>1 appareil = suspect)
    const { rows: devices } = await query(
      `SELECT COUNT(DISTINCT fingerprint) AS c FROM devices WHERE share_id = $1`,
      [shareId]
    );
    const deviceCount = parseInt(devices[0].c);
    if (deviceCount > 1) {
      const pts = Math.min((deviceCount - 1) * 10, 20);
      score += pts;
      factors.multiple_devices = { count: deviceCount, points: pts };
    }

    // 4. Géolocalisation multiple (pays différents)
    const { rows: geos } = await query(
      `SELECT COUNT(DISTINCT country) AS c FROM tracking_events
       WHERE share_id = $1 AND country != '' AND event_type = 'opened'`,
      [shareId]
    );
    const geoCount = parseInt(geos[0].c);
    if (geoCount > 1) {
      const pts = Math.min((geoCount - 1) * 8, 15);
      score += pts;
      factors.multiple_countries = { count: geoCount, points: pts };
    }

    // 5. Téléchargement alors que non autorisé
    const { rows: dl } = await query(
      `SELECT COUNT(*) AS c FROM tracking_events te
       JOIN document_shares ds ON ds.id = te.share_id
       WHERE te.share_id = $1 AND te.event_type = 'downloaded' AND ds.download_allowed = FALSE`,
      [shareId]
    );
    if (parseInt(dl[0].c) > 0) {
      score += 25;
      factors.unauthorized_download = { count: parseInt(dl[0].c), points: 25 };
    }

    // Plafonner à 100
    score = Math.min(score, 100);

    // Sauvegarder
    await query(
      `INSERT INTO risk_scores (share_id, organization_id, score, factors)
       VALUES ($1, $2, $3, $4)`,
      [shareId, organizationId, score, JSON.stringify(factors)]
    );

    // Mettre à jour le risk_score du recipient
    await query(
      `UPDATE recipients r SET risk_score = $1
       FROM document_shares ds
       WHERE ds.id = $2 AND r.id = ds.recipient_id`,
      [score, shareId]
    );

    // Créer une alerte si score critique
    if (score >= 70) {
      await query(
        `INSERT INTO alerts (organization_id, share_id, severity, type, message)
         SELECT $1, $2, $3, 'risk_score', 'Score de risque élevé (' || $4 || '/100) — ' || recipient_email
         FROM document_shares WHERE id = $2`,
        [organizationId, shareId, score >= 85 ? 'critical' : 'warning', score]
      );
    }

    return { score, factors };
  } catch (err) {
    console.error('Risk score error:', err.message);
    return { score: 0, factors: {} };
  }
}

// ── Niveau de risque textuel ──────────────────────────────────
function riskLevel(score) {
  if (score >= 85) return { label: 'Critique',  color: '#dc2626', bg: '#fef2f2' };
  if (score >= 60) return { label: 'Élevé',     color: '#d97706', bg: '#fffbeb' };
  if (score >= 35) return { label: 'Modéré',    color: '#2563eb', bg: '#eff6ff' };
  return              { label: 'Faible',     color: '#059669', bg: '#f0fdf4' };
}

module.exports = { computeRiskScore, riskLevel };
