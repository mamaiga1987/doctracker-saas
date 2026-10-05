import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

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

function getRiskLevel(score) {
  if (score >= 75) return { label: 'Critique', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' };
  if (score >= 50) return { label: 'Élevé', color: '#ea580c', bg: '#fff7ed', border: '#fdba74' };
  if (score >= 25) return { label: 'Moyen', color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
  return { label: 'Faible', color: '#16a34a', bg: '#f0fdf4', border: '#86efac' };
}

function RiskGauge({ score }) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? '#dc2626' : score >= 50 ? '#ea580c' : score >= 25 ? '#d97706' : '#16a34a';
  const r = getRiskLevel(score);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: 130, height: 130 }}>
        <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="65" cy="65" r="54" fill="none" stroke="#f3f4f6" strokeWidth="12" />
          <circle cx="65" cy="65" r="54" fill="none" stroke={color} strokeWidth="12"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 30, fontWeight: 900, color }}>{score}</div>
          <div style={{ fontSize: 10, color: '#9ca3af' }}>/100</div>
        </div>
      </div>
      <div style={{ background: r.bg, color: r.color, border: '1.5px solid ' + r.border, borderRadius: 999, padding: '4px 16px', fontSize: 13, fontWeight: 800 }}>
        {r.label}
      </div>
    </div>
  );
}

function MiniChart({ data, color }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  const w = 100, h = 40;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(' ');
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points={`0,${h} ${points} ${w},${h}`} fill={color} opacity="0.1" />
    </svg>
  );
}

export default function AICenterPage() {
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState(null);
  const [heatmaps, setHeatmaps] = useState({});
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState({});
  const [selectedMember, setSelectedMember] = useState(null);
  const [detections, setDetections] = useState([]);
  const [avgReadingTime, setAvgReadingTime] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const [membersRes, statsRes, eventsRes] = await Promise.all([
        api.get('/members'),
        api.get('/settings'),
        api.get('/track/events?limit=50'),
      ]);
      setMembers(membersRes.data);
      setStats(statsRes.data);
      setEvents(eventsRes.data || []);
      if (membersRes.data.length > 0) setSelectedMember(membersRes.data[0]);

      // Calculer moyenne uniquement sur membres ayant lu (> 30s pour exclure les survols)
      const times = membersRes.data.map(m => m.total_reading_time || 0).filter(t => t > 30);
      const avg = times.length > 0 ? Math.round(times.reduce((a,b)=>a+b,0)/times.length) : 0;
      setAvgReadingTime(avg);

      const heatmapData = {};
      for (const m of membersRes.data) {
        try {
          const { data } = await api.get('/track/heatmap/' + m.token);
          heatmapData[m.id] = data;
        } catch (e) {}
      }
      setHeatmaps(heatmapData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const analyzeWithAI = async (member) => {
    if (!member) return;
    setAnalyzing(true);
    try {
      const { data } = await api.post('/ai/analyze/' + member.id);
      if (data.success) {
        setAiAnalysis(prev => ({ ...prev, [member.id]: data.analysis }));
        setMembers(prev => prev.map(m => m.id === member.id ? { ...m, risk_score: data.analysis.score_ia } : m));
        // Ajouter aux détections récentes
        const r = getRiskLevel(data.analysis.score_ia);
        setDetections(prev => [{
          niveau: r.label,
          color: r.color,
          bg: r.bg,
          border: r.border,
          message: 'Analyse IA complétée pour ' + member.name,
          detail: data.analysis.resume?.substring(0, 60) + '...',
          time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        }, ...prev].slice(0, 5));
      }
    } catch (err) {
      console.error('AI Error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const totalReadingTime = members.reduce((sum, m) => sum + (m.total_reading_time || 0), 0);
  const riskMembers = members.filter(m => (m.risk_score || 0) >= 25);
  const memberHeatmap = selectedMember ? (heatmaps[selectedMember.id] || []) : [];
  const maxHeatTime = Math.max(...memberHeatmap.map(h => h.time_spent), 1);
  const memberEvents = selectedMember ? events.filter(e => e.member_id === selectedMember.id).slice(0, 8) : [];
  const currentAnalysis = selectedMember ? aiAnalysis[selectedMember.id] : null;

  const getHeatColor = (time, max) => {
    const r = max > 0 ? time / max : 0;
    if (r === 0) return { bg: '#e5e7eb', color: '#9ca3af' };
    if (r < 0.25) return { bg: '#fef08a', color: '#854d0e' };
    if (r < 0.5) return { bg: '#fb923c', color: '#fff' };
    if (r < 0.75) return { bg: '#f87171', color: '#fff' };
    return { bg: '#ef4444', color: '#fff' };
  };

  const eventIcons = {
    open: { icon: '📄', label: 'Document ouvert', color: '#6366f1' },
    download: { icon: '⬇️', label: 'Téléchargement', color: '#dc2626' },
    unauthorized_access: { icon: '🔒', label: 'Accès refusé', color: '#ef4444' },
    view_progress: { icon: '📖', label: 'Page consultée', color: '#10b981' },
    link_shared: { icon: '🔗', label: 'Lien partagé', color: '#f59e0b' },
  };

  // Données graphiques simulées basées sur les vrais events
  const hourlyActivity = Array.from({ length: 24 }, (_, h) =>
    events.filter(e => new Date(e.created_at).getHours() === h).length
  );
  const readingTrend = [2, 4, 3, 6, 5, 8, 7, 9, 6, 8, 10, 7];

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'linear-gradient(135deg, #1e1b4b, #312e81)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🤖</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>AI Center</div>
        <div style={{ fontSize: 13, color: '#a5b4fc', marginTop: 8 }}>Chargement des données...</div>
      </div>
    </div>
  );

  return (
    <div style={{ background: 'linear-gradient(135deg, #f8f9fc 0%, #eef2ff 100%)', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4f46e5 100%)', padding: '16px 20px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 4px 24px rgba(79,70,229,0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🤖</div>
              <div>
                <h1 style={{ fontSize: 18, fontWeight: 900, color: '#fff', margin: 0 }}>AI Center</h1>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: 0 }}>Analyse intelligente et surveillance comportementale</p>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 999, padding: '4px 12px' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
              <span style={{ fontSize: 11, color: '#6ee7b7', fontWeight: 600 }}>Opérationnel</span>
            </div>
            <button onClick={() => selectedMember && analyzeWithAI(selectedMember)} disabled={analyzing}
              style={{ background: analyzing ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: analyzing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}>
              {analyzing ? <><span>⏳</span> Analyse en cours...</> : <><span>✨</span> Analyser avec l'IA</>}
            </button>
            {selectedMember && (
              <button onClick={async (e) => {
                e.stopPropagation();
                try {
                  const token = localStorage.getItem('dt_token');
                  const url = 'https://doctracker.monairbyte.eu/api/report/member/' + selectedMember.id + '?token=' + token + '&t=' + Date.now();
                  const response = await fetch(url);
                  const blob = await response.blob();
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = 'rapport-' + selectedMember.name.replace(/\s+/g,'-') + '.pdf';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(link.href);
                } catch(e) { alert('Erreur: ' + e.message); }
              }} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 12, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                📄 Exporter rapport
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '16px' }}>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { icon: '👥', label: 'Membres analysés', value: members.length, color: '#6366f1', sub: 'actifs' },
            { icon: '⚠️', label: 'Risques détectés', value: riskMembers.length, color: '#ea580c', danger: riskMembers.length > 0, sub: 'à risque' },
            { icon: '⬇️', label: 'Téléchargements', value: stats?.totalDownloads || 0, color: '#dc2626', danger: (stats?.totalDownloads || 0) > 0 },
            { icon: '⏱️', label: 'Temps moy. lecture', value: formatTime(avgReadingTime), color: '#10b981' },
            { icon: '🔒', label: 'Accès refusés', value: stats?.totalUnauthorized || 0, color: '#f59e0b', danger: (stats?.totalUnauthorized || 0) > 0 },
            { icon: '📊', label: 'Total événements', value: stats?.totalEvents || 0, color: '#8b5cf6' },
          ].map((kpi, i) => (
            <div key={i} style={{ background: kpi.danger ? 'linear-gradient(135deg, #fff5f5, #fee2e2)' : '#fff', border: '1.5px solid ' + (kpi.danger ? '#fca5a5' : '#e8eaf6'), borderRadius: 14, padding: '12px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{kpi.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
              <div style={{ fontSize: 10, color: '#374151', fontWeight: 600, marginTop: 2 }}>{kpi.label}</div>
              {kpi.sub && <div style={{ fontSize: 9, color: '#9ca3af' }}>{kpi.sub}</div>}
            </div>
          ))}
        </div>

        {/* Membres à risque - Tableau */}
        <div style={{ background: '#fff', borderRadius: 20, padding: 18, marginBottom: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.06)', border: '1.5px solid #e8eaf6' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🎯</span>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: '#111827', margin: 0 }}>Membres à risque</h2>
              {riskMembers.length > 0 && <span style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{riskMembers.length}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {members.map(m => {
              const risk = getRiskLevel(m.risk_score || 0);
              const isSelected = selectedMember?.id === m.id;
              const mEvents = events.filter(e => e.member_id === m.id);
              const suspectActivity = mEvents.filter(e => ['download', 'unauthorized_access', 'link_shared'].includes(e.event_type));
              const devices = [...new Set(mEvents.map(e => e.os).filter(Boolean))];
              return (
                <div key={m.id} onClick={() => setSelectedMember(m)}
                  style={{ background: isSelected ? 'linear-gradient(135deg, #eef2ff, #e0e7ff)' : '#f9fafb', border: '1.5px solid ' + (isSelected ? '#6366f1' : '#e8eaf6'), borderRadius: 14, padding: 12, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#fff', fontWeight: 800, flexShrink: 0 }}>
                      {m.name?.charAt(0) || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{m.name}</div>
                      <div style={{ fontSize: 10, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
                    </div>
                    <div style={{ background: risk.bg, color: risk.color, border: '1px solid ' + risk.border, borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      {risk.label}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                    <div style={{ background: '#fff', borderRadius: 8, padding: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#6366f1' }}>{m.risk_score || 0}</div>
                      <div style={{ fontSize: 9, color: '#9ca3af' }}>Score IA</div>
                    </div>
                    <div style={{ background: '#fff', borderRadius: 8, padding: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{devices[0] || '—'}</div>
                      <div style={{ fontSize: 9, color: '#9ca3af' }}>Appareil</div>
                    </div>
                    <div style={{ background: suspectActivity.length > 0 ? '#fff5f5' : '#fff', borderRadius: 8, padding: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: suspectActivity.length > 0 ? '#dc2626' : '#10b981' }}>{suspectActivity.length}</div>
                      <div style={{ fontSize: 9, color: '#9ca3af' }}>Suspect</div>
                    </div>
                    <div style={{ background: '#fff', borderRadius: 8, padding: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{formatTime(m.total_reading_time || 0)}</div>
                      <div style={{ fontSize: 9, color: '#9ca3af' }}>Lecture</div>
                    </div>
                  </div>
                  {suspectActivity.length > 0 && (
                    <div style={{ marginTop: 8, background: '#fff5f5', borderRadius: 8, padding: '6px 10px', fontSize: 10, color: '#dc2626', fontWeight: 600 }}>
                      ⚠️ {suspectActivity.map(e => eventIcons[e.event_type]?.label || e.event_type).join(', ')}
                    </div>
                  )}
                  <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button onClick={(e) => { e.stopPropagation(); analyzeWithAI(m); }}
                      style={{ background: '#eef2ff', color: '#4338ca', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                      ✨ Analyser
                    </button>
                    {(m.risk_score || 0) >= 50 && (
                      <button style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                        🚫 Révoquer
                      </button>
                    )}
                    <button style={{ background: '#f0fdf4', color: '#166534', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                      👁️ Surveiller
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedMember && (
          <>
            {/* Analyse IA + Score */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 16 }}>

              {/* Analyse comportementale IA */}
              <div style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)', borderRadius: 20, padding: 18, boxShadow: '0 8px 32px rgba(99,102,241,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>🤖</span>
                    <h2 style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: 0 }}>Analyse comportementale IA</h2>
                  </div>
                  {currentAnalysis && <span style={{ color: '#a5b4fc', fontSize: 10 }}>✓ Générée maintenant</span>}
                </div>

                {!currentAnalysis ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 16 }}>
                      Cliquez sur "Analyser avec l'IA" pour obtenir une analyse complète du comportement de {selectedMember.name}
                    </p>
                    <button onClick={() => analyzeWithAI(selectedMember)} disabled={analyzing}
                      style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      {analyzing ? '⏳ Analyse...' : '✨ Lancer l\'analyse IA'}
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* Résumé */}
                    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 14, marginBottom: 12, backdropFilter: 'blur(10px)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc', marginBottom: 6 }}>📋 Résumé IA</div>
                      <p style={{ color: '#e0e7ff', fontSize: 12, lineHeight: 1.7, margin: 0 }}>{currentAnalysis.resume}</p>
                    </div>

                    {/* Détails */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 12 }}>
                      {[
                        { label: 'Multi-appareils', value: currentAnalysis.details?.multi_appareils || 0, icon: '📱' },
                        { label: 'Lecture anormale', value: currentAnalysis.details?.lecture_anormale || 'Non', icon: '📖' },
                        { label: 'Partage du lien', value: currentAnalysis.details?.partage_lien || 'Non', icon: '🔗' },
                        { label: 'Tentatives PIN', value: currentAnalysis.details?.tentatives_pin || 0, icon: '🔒' },
                      ].map((d, i) => (
                        <div key={i} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14 }}>{d.icon}</span>
                          <div>
                            <div style={{ fontSize: 11, color: '#e0e7ff', fontWeight: 700 }}>{d.value}</div>
                            <div style={{ fontSize: 9, color: '#a5b4fc' }}>{d.label}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Comportements suspects */}
                    {currentAnalysis.comportements_suspects?.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#fca5a5', marginBottom: 6 }}>⚠️ Comportements suspects</div>
                        {currentAnalysis.comportements_suspects.map((c, i) => (
                          <div key={i} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '6px 10px', marginBottom: 4, fontSize: 11, color: '#fecaca', display: 'flex', gap: 6 }}>
                            <span>•</span><span>{c}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Recommandations */}
                    {currentAnalysis.recommandations?.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#86efac', marginBottom: 6 }}>✅ Recommandations IA</div>
                        {currentAnalysis.recommandations.map((r, i) => (
                          <div key={i} style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '6px 10px', marginBottom: 4, fontSize: 11, color: '#d1fae5', display: 'flex', gap: 6 }}>
                            <span>→</span><span>{r}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Score de risque */}
              <div style={{ background: '#fff', borderRadius: 20, padding: 18, boxShadow: '0 4px 16px rgba(0,0,0,0.06)', border: '1.5px solid #e8eaf6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <span style={{ fontSize: 18 }}>🎯</span>
                  <h2 style={{ fontSize: 15, fontWeight: 800, color: '#111827', margin: 0 }}>Score de risque IA</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                  <RiskGauge score={currentAnalysis?.score_ia || selectedMember.risk_score || 0} />
                  <div style={{ width: '100%' }}>
                    {[
                      { label: 'Comportement anormal', value: '+25', color: '#ef4444', icon: '🔴' },
                      { label: 'Appareils multiples', value: '+20', color: '#f97316', icon: '🟠' },
                      { label: 'Tentatives PIN', value: '+10', color: '#f59e0b', icon: '🟡' },
                      { label: 'Téléchargements', value: '+7', color: '#eab308', icon: '🟡' },
                    ].map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', background: '#f9fafb', borderRadius: 8, marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 10 }}>{item.icon}</span>
                          <span style={{ fontSize: 11, color: '#374151' }}>{item.label}</span>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 800, color: item.color }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Heatmap */}
            <div style={{ background: '#fff', borderRadius: 20, padding: 18, marginBottom: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.06)', border: '1.5px solid #e8eaf6' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>🔥</span>
                  <h2 style={{ fontSize: 15, fontWeight: 800, color: '#111827', margin: 0 }}>Heatmap de lecture</h2>
                </div>
                <span style={{ fontSize: 11, color: '#6b7280', background: '#f3f4f6', borderRadius: 8, padding: '3px 8px' }}>{selectedMember.name}</span>
              </div>
              {memberHeatmap.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}>Aucune donnée de lecture</div>
              ) : (
                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    {memberHeatmap.map(h => {
                      const { bg, color } = getHeatColor(h.time_spent, maxHeatTime);
                      const t = h.time_spent;
                      const label = t < 60 ? t + 's' : Math.floor(t/60) + 'm' + (t%60>0?t%60+'s':'');
                      return (
                        <div key={h.page_number} style={{ background: bg, borderRadius: 12, padding: '10px 14px', textAlign: 'center', minWidth: 56, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>P.{h.page_number}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: color === '#fff' ? '#fff' : '#374151' }}>{label}</div>
                          <div style={{ fontSize: 9, color: color === '#fff' ? 'rgba(255,255,255,0.7)' : '#6b7280' }}>{h.visits}v</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {[{bg:'#ef4444',label:'Très lu'},{bg:'#f87171',label:'Bien lu'},{bg:'#fb923c',label:'Lu'},{bg:'#fef08a',label:'Peu lu'},{bg:'#e5e7eb',label:'Non lu'}].map((l,i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: l.bg }} />
                        <span style={{ fontSize: 10, color: '#6b7280' }}>{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Timeline forensic */}
            <div style={{ background: '#fff', borderRadius: 20, padding: 18, marginBottom: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.06)', border: '1.5px solid #e8eaf6' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>🔍</span>
                  <h2 style={{ fontSize: 15, fontWeight: 800, color: '#111827', margin: 0 }}>Timeline forensic</h2>
                </div>
                <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 600 }}>{memberEvents.length} événements</span>
              </div>
              {memberEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}>Aucun événement</div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 19, top: 0, bottom: 0, width: 2, background: 'linear-gradient(to bottom, #6366f1, #e8eaf6)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {memberEvents.map((e, i) => {
                      const ev = eventIcons[e.event_type] || { icon: '📋', label: e.event_type, color: '#6b7280' };
                      const time = new Date(e.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                      const date = new Date(e.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                      return (
                        <div key={i} style={{ display: 'flex', gap: 12, paddingLeft: 8 }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: ev.color + '22', border: '2px solid ' + ev.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0, zIndex: 1, background: '#fff' }}>
                            {ev.icon}
                          </div>
                          <div style={{ background: '#f9fafb', borderRadius: 10, padding: '8px 12px', flex: 1, border: '1px solid #f3f4f6' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                              <span style={{ fontWeight: 700, fontSize: 12, color: ev.color }}>{ev.label}</span>
                              <span style={{ fontSize: 10, color: '#9ca3af' }}>{date} {time}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                              {e.browser && <span style={{ background: '#eef2ff', color: '#4338ca', borderRadius: 6, padding: '1px 6px', fontSize: 9 }}>🌐 {e.browser}</span>}
                              {e.os && <span style={{ background: '#f0fdf4', color: '#166534', borderRadius: 6, padding: '1px 6px', fontSize: 9 }}>📱 {e.os}</span>}
                              {e.ip && <span style={{ background: '#f3f4f6', color: '#374151', borderRadius: 6, padding: '1px 6px', fontSize: 9, fontFamily: 'monospace' }}>{e.ip}</span>}
                              {e.country && <span style={{ background: '#fffbeb', color: '#92400e', borderRadius: 6, padding: '1px 6px', fontSize: 9 }}>📍 {e.city || e.country}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Comparaison comportementale */}
        {selectedMember && avgReadingTime > 0 && (
          <div style={{ background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)', borderRadius: 20, padding: 18, marginBottom: 16, border: '1.5px solid #c7d2fe' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 18 }}>📊</span>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: '#1e1b4b', margin: 0 }}>Comparaison comportementale</h2>
            </div>
            {(() => {
              const memberTime = selectedMember.total_reading_time || 0;
              const ratio = avgReadingTime > 0 ? (memberTime / avgReadingTime).toFixed(1) : 0;
              const faster = memberTime < avgReadingTime;
              const color = faster ? '#dc2626' : '#16a34a';
              const icon = faster ? '🔴' : '✅';
              return (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <span style={{ fontSize: 36 }}>{icon}</span>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 900, color }}>
                        {selectedMember.name} lit {ratio}x {faster ? 'plus vite' : 'plus lentement'} que la moyenne
                      </div>
                      <div style={{ fontSize: 12, color: '#6366f1', marginTop: 4 }}>
                        {selectedMember.name}: {formatTime(memberTime)} | Moyenne membres ayant lu: {formatTime(avgReadingTime)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                    <div style={{ background: '#fff', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, fontWeight: 600 }}>{selectedMember.name}</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: '#6366f1' }}>{formatTime(memberTime)}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af' }}>Temps de lecture</div>
                      <div style={{ background: '#e5e7eb', borderRadius: 999, height: 6, marginTop: 8 }}>
                        <div style={{ background: '#6366f1', borderRadius: 999, height: '100%', width: Math.min((memberTime / (avgReadingTime * 2)) * 100, 100) + '%' }} />
                      </div>
                    </div>
                    <div style={{ background: '#fff', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, fontWeight: 600 }}>Moyenne du groupe</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: '#9ca3af' }}>{formatTime(avgReadingTime)}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af' }}>Membres ayant lu</div>
                      <div style={{ background: '#e5e7eb', borderRadius: 999, height: 6, marginTop: 8 }}>
                        <div style={{ background: '#9ca3af', borderRadius: 999, height: '100%', width: '50%' }} />
                      </div>
                    </div>
                  </div>
                  {faster && memberTime < 30 && (
                    <div style={{ marginTop: 10, background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#dc2626', fontWeight: 600 }}>
                      ⚠️ Lecture anormalement rapide — document probablement non lu
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Analytics globales */}
        <div style={{ background: '#fff', borderRadius: 20, padding: 18, marginBottom: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.06)', border: '1.5px solid #e8eaf6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>📊</span>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: '#111827', margin: 0 }}>Analytics globales</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {/* Temps de lecture */}
            <div style={{ background: '#f9fafb', borderRadius: 14, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 4 }}>⏱️ Temps de lecture</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#6366f1', marginBottom: 8 }}>{formatTime(totalReadingTime)}</div>
              <MiniChart data={readingTrend} color="#6366f1" />
            </div>
            {/* Activité par heure */}
            <div style={{ background: '#f9fafb', borderRadius: 14, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 2 }}>📈 Activité par heure</div>
              <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4 }}>
                {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} — {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#10b981', marginBottom: 8 }}>{events.length} events</div>
              <MiniChart data={hourlyActivity.slice(6, 22)} color="#10b981" />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 9, color: '#9ca3af' }}>06h</span>
                <span style={{ fontSize: 9, color: '#9ca3af' }}>14h</span>
                <span style={{ fontSize: 9, color: '#9ca3af' }}>22h</span>
              </div>
            </div>
            {/* Appareils */}
            <div style={{ background: '#f9fafb', borderRadius: 14, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8 }}>📱 Appareils utilisés</div>
              {(() => {
                const osCounts = {};
                events.forEach(e => { if (e.os) osCounts[e.os] = (osCounts[e.os] || 0) + 1; });
                const total = Object.values(osCounts).reduce((a, b) => a + b, 0) || 1;
                return Object.entries(osCounts).slice(0, 3).map(([os, count], i) => (
                  <div key={i} style={{ marginBottom: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 10, color: '#374151' }}>{os}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#6366f1' }}>{Math.round(count/total*100)}%</span>
                    </div>
                    <div style={{ background: '#e5e7eb', borderRadius: 999, height: 4 }}>
                      <div style={{ background: '#6366f1', borderRadius: 999, height: '100%', width: Math.round(count/total*100) + '%' }} />
                    </div>
                  </div>
                ));
              })()}
            </div>
            {/* Téléchargements */}
            <div style={{ background: (stats?.totalDownloads || 0) > 0 ? '#fff5f5' : '#f9fafb', borderRadius: 14, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 4 }}>⬇️ Téléchargements</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: (stats?.totalDownloads || 0) > 0 ? '#dc2626' : '#10b981', marginBottom: 8 }}>
                {stats?.totalDownloads || 0}
              </div>
              <MiniChart data={[0, 0, stats?.totalDownloads || 0, 0, 0]} color="#dc2626" />
            </div>
          </div>
        </div>

        {/* Détections IA récentes */}
        {detections.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 20, padding: 18, marginBottom: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.06)', border: '1.5px solid #e8eaf6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 18 }}>🔔</span>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: '#111827', margin: 0 }}>Détections IA récentes</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {detections.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f9fafb', borderRadius: 12, padding: '10px 12px', border: '1px solid ' + d.border }}>
                  <span style={{ background: d.bg, color: d.color, borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{d.niveau}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{d.message}</div>
                    <div style={{ fontSize: 10, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.detail}</div>
                  </div>
                  <span style={{ fontSize: 10, color: '#9ca3af', flexShrink: 0 }}>{d.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '16px 0', borderTop: '1px solid #e8eaf6' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 14 }}>✨</span>
            <span style={{ fontSize: 12, fontWeight: 700, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Powered by AirByte AI</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <span style={{ fontSize: 10, color: '#9ca3af' }}>DocTracker v1.0</span>
            <span style={{ fontSize: 10, color: '#9ca3af' }}>•</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
              <span style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>Serveur opérationnel</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
