const express = require('express');
const router = express.Router();
const { query } = require('../db');
const PDFDocument = require('pdfkit');

function formatTime(seconds) {
  const t = parseInt(seconds) || 0;
  if (t === 0) return '0s';
  if (t < 60) return t + 's';
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (h > 0) return h + 'h ' + m + 'm ' + s + 's';
  return m + 'min ' + (s > 0 ? s + 's' : '');
}

router.get('/member/:memberId', async (req, res) => {
  const jwt = require('jsonwebtoken');
  const token = req.query.token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Non autorise' });
  try { jwt.verify(token, process.env.JWT_SECRET || 'ChangeThisJWTSecret2024!'); }
  catch { return res.status(401).json({ error: 'Token invalide' }); }

  try {
    const { memberId } = req.params;
    const memberRes = await query('SELECT * FROM dt_members WHERE id = $1 AND organization_id = $2', [memberId]);
    const member = memberRes.rows[0];
    if (!member) return res.status(404).json({ error: 'Membre non trouve' });

    const events = await query(
      'SELECT * FROM dt_events WHERE member_id = $1 ORDER BY created_at DESC LIMIT 15',
      [memberId]
    );
    const heatmap = await query(
      'SELECT * FROM dt_page_heatmap WHERE member_id = $1 ORDER BY page_number',
      [memberId]
    );
    const allMembers = await query('SELECT total_reading_time FROM dt_members WHERE total_reading_time >= 60');
    const avgTime = allMembers.length > 0
      ? Math.round(allMembers.reduce((s, m) => s + (m.total_reading_time || 0), 0) / allMembers.length)
      : 0;

    const doc = new PDFDocument({ margin: 50, size: 'A4', autoFirstPage: true, bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="rapport-' + member.name.replace(/[^a-zA-Z0-9]/g, '-') + '.pdf"');
    doc.pipe(res);

    const W = 495; // largeur utile
    const PURPLE = '#4f46e5';
    const DARK = '#1e1b4b';
    const GRAY = '#6b7280';
    const LIGHT = '#f9fafb';

    // === PAGE 1 ===

    // Header bande
    doc.rect(50, 50, W, 70).fill(DARK);
    doc.fillColor('#fff').fontSize(20).font('Helvetica-Bold')
       .text('DocTracker AI - Rapport Forensic', 65, 65);
    doc.fillColor('#a5b4fc').fontSize(10).font('Helvetica')
       .text('Analyse comportementale - CONFIDENTIEL', 65, 90);
    doc.fillColor('#fff').fontSize(9)
       .text(new Date().toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' }), 65, 105);

    let y = 140;

    // Section infos membre
    doc.fillColor(DARK).fontSize(13).font('Helvetica-Bold').text('Informations du membre', 50, y);
    doc.moveTo(50, y + 18).lineTo(545, y + 18).strokeColor('#e5e7eb').lineWidth(1).stroke();
    y += 28;

    const riskScore = member.risk_score || 0;
    const riskLabel = riskScore >= 75 ? 'CRITIQUE' : riskScore >= 50 ? 'ELEVE' : riskScore >= 25 ? 'MOYEN' : 'FAIBLE';
    const riskColor = riskScore >= 75 ? '#dc2626' : riskScore >= 50 ? '#ea580c' : riskScore >= 25 ? '#d97706' : '#16a34a';

    const infos = [
      ['Nom', member.name || '-'],
      ['Email', member.email || '-'],
      ['Groupe', member.grp || '-'],
      ['Version document', 'v' + (member.version || 'A')],
      ['Ouvertures totales', String(member.total_opens || 0)],
      ['Temps de lecture', formatTime(member.total_reading_time || 0)],
      ['Telechargement', member.has_downloaded ? 'OUI' : 'NON'],
      ['Score de risque IA', riskScore + '/100 - ' + riskLabel],
    ];

    infos.forEach(([label, value], i) => {
      if (i % 2 === 0) doc.rect(50, y, W, 20).fill(LIGHT);
      doc.fillColor(GRAY).fontSize(9).font('Helvetica').text(label, 60, y + 6);
      doc.fillColor('#111827').fontSize(9).font('Helvetica-Bold').text(value, 200, y + 6);
      y += 20;
    });

    y += 15;

    // Barre score risque
    doc.fillColor(DARK).fontSize(12).font('Helvetica-Bold').text('Score de risque IA', 50, y);
    y += 18;
    doc.rect(50, y, W, 16).fill('#e5e7eb');
    const barW = Math.round(W * riskScore / 100);
    if (barW > 0) doc.rect(50, y, barW, 16).fill(riskColor);
    doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold')
       .text(riskScore + '/100 - ' + riskLabel, 60, y + 4);
    y += 35;

    // Comparaison comportementale
    if (avgTime > 0) {
      const memberTime = member.total_reading_time || 0;
      const ratio = (memberTime / avgTime).toFixed(1);
      const faster = memberTime < avgTime;
      doc.fillColor(DARK).fontSize(12).font('Helvetica-Bold').text('Comparaison comportementale', 50, y);
      y += 18;
      doc.rect(50, y, W, 45).fill('#eef2ff');
      doc.fillColor(faster ? '#dc2626' : '#16a34a').fontSize(11).font('Helvetica-Bold')
         .text(member.name + ' lit ' + ratio + 'x ' + (faster ? 'plus vite' : 'plus lentement') + ' que la moyenne', 60, y + 8);
      doc.fillColor(PURPLE).fontSize(9).font('Helvetica')
         .text('Temps: ' + formatTime(memberTime) + '  |  Moyenne groupe: ' + formatTime(avgTime), 60, y + 26);
      y += 60;
    }

    // Heatmap
    if (heatmap.length > 0) {
      doc.fillColor(DARK).fontSize(12).font('Helvetica-Bold').text('Heatmap de lecture par page', 50, y);
      y += 18;
      const maxT = Math.max(...heatmap.map(h => h.time_spent), 1);

      heatmap.forEach(h => {
        if (y > 720) { doc.addPage(); y = 50; }
        const ratio = h.time_spent / maxT;
        const barColor = ratio > 0.75 ? '#ef4444' : ratio > 0.5 ? '#f97316' : ratio > 0.25 ? '#fbbf24' : '#d1d5db';
        const bw = Math.max(Math.round(300 * ratio), 2);
        doc.fillColor(LIGHT).rect(50, y, W, 18).fill();
        doc.fillColor(GRAY).fontSize(9).font('Helvetica').text('Page ' + h.page_number, 55, y + 5);
        doc.rect(110, y + 4, 300, 10).fill('#e5e7eb');
        doc.rect(110, y + 4, bw, 10).fill(barColor);
        doc.fillColor('#374151').fontSize(9).text(formatTime(h.time_spent) + ' - ' + h.visits + 'v', 420, y + 5);
        y += 20;
      });
      y += 10;
    }

    // Timeline
    if (events.length > 0) {
      if (y > 650) { doc.addPage(); y = 50; }
      doc.fillColor(DARK).fontSize(12).font('Helvetica-Bold').text('Timeline forensic', 50, y);
      y += 18;

      const evLabels = {
        open: 'Document ouvert',
        download: 'Telechargement',
        unauthorized_access: 'Acces refuse',
        view_progress: 'Page consultee',
        link_shared: 'Lien partage',
      };

      events.forEach(e => {
        if (y > 730) { doc.addPage(); y = 50; }
        const isDanger = e.event_type === 'download' || e.event_type === 'unauthorized_access';
        doc.rect(50, y, W, 30).fill(isDanger ? '#fff5f5' : LIGHT);
        const label = evLabels[e.event_type] || e.event_type;
        const date = new Date(e.created_at).toLocaleDateString('fr-FR') + ' ' +
                     new Date(e.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        doc.fillColor(isDanger ? '#dc2626' : '#374151').fontSize(9).font('Helvetica-Bold').text(label, 58, y + 5);
        doc.fillColor(GRAY).fontSize(8).font('Helvetica').text(date, 58, y + 17);
        const details = [e.browser, e.os, e.ip, e.country].filter(Boolean).join(' - ');
        doc.fillColor('#9ca3af').fontSize(8).text(details, 200, y + 11);
        y += 32;
      });
    }

    // Footer simple sur la dernière page
    doc.fillColor(GRAY).fontSize(8).font('Helvetica')
       .text('DocTracker AI - AirByte - CONFIDENTIEL | Powered by AirByte AI', 50, y + 20, { align: 'center', width: W });

    doc.end();

  } catch (err) {
    console.error('Report error:', err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

module.exports = router;
