import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../utils/api';
import toast from 'react-hot-toast';

const LEVEL_CONFIG = {
  faible:   { label: 'Faible',    bg: '#f0fdf4', border: '#86efac', color: '#16a34a', bar: '#22c55e', icon: '🟢' },
  moyen:    { label: 'Moyen',     bg: '#fffbeb', border: '#fcd34d', color: '#d97706', bar: '#f59e0b', icon: '🟡' },
  'élevé':  { label: 'Élevé',    bg: '#fff7ed', border: '#fdba74', color: '#ea580c', bar: '#f97316', icon: '🟠' },
  critique: { label: 'Critique',  bg: '#fff5f5', border: '#fca5a5', color: '#dc2626', bar: '#ef4444', icon: '🔴' },
};

function RiskBar({ score, level }) {
  const conf = LEVEL_CONFIG[level] || LEVEL_CONFIG.faible;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: '#6b7280' }}>Score de risque</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: conf.color }}>{score}/100</span>
      </div>
      <div style={{ height: 8, background: '#f3f4f6', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: conf.bar, borderRadius: 999, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

export default function RiskPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [memberRisk, setMemberRisk] = useState({});

  const fetchData = useCallback(async () => {
    try {
      const { data } = await api.get('/members/risks/all');
      setMembers(data);
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const recalculateAll = async () => {
    setRecalculating(true);
    try {
      const { data: all } = await api.get('/members');
      for (const m of all) {
        await api.get(`/members/${m.id}/risk`);
      }
      await fetchData();
      toast.success('Scores recalculés');
    } catch { toast.error('Erreur'); }
    finally { setRecalculating(false); }
  };

  const loadMemberRisk = async (id) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (memberRisk[id]) return;
    try {
      const { data } = await api.get(`/members/${id}/risk`);
      setMemberRisk(p => ({ ...p, [id]: data }));
    } catch {}
  };

  const critiques = members.filter(m => m.risk_level === 'critique').length;
  const élevés    = members.filter(m => m.risk_level === 'élevé').length;

  return (
    <div style={{ padding: 16, background: '#f8f9fc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>Score de Risque</h1>
          <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>Analyse automatique du comportement de chaque membre</p>
        </div>
        <button onClick={recalculateAll} disabled={recalculating} style={{ padding: '8px 14px', borderRadius: 10, border: '1.5px solid #6366f1', background: '#eef2ff', color: '#4338ca', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          {recalculating ? '⏳ Calcul...' : '🔄 Recalculer'}
        </button>
      </div>

      {/* Résumé */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
        {Object.entries(LEVEL_CONFIG).map(([level, conf]) => (
          <div key={level} style={{ background: conf.bg, border: `1.5px solid ${conf.border}`, borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{conf.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: conf.color }}>
              {members.filter(m => m.risk_level === level).length}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{conf.label}</div>
          </div>
        ))}
      </div>

      {/* Alerte critique */}
      {(critiques > 0 || élevés > 0) && (
        <div style={{ background: '#fff5f5', border: '1.5px solid #fca5a5', borderRadius: 14, padding: 14, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 14 }}>
            🚨 {critiques} critique(s) · {élevés} élevé(s) détecté(s)
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
            Vérifiez immédiatement les membres en rouge ci-dessous.
          </div>
        </div>
      )}

      {/* Règles de calcul */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e8eaf6', padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 10 }}>📊 Règles de calcul</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {[
            { label: 'Téléchargement', pts: '+60' },
            { label: 'Lien partagé', pts: '+50' },
            { label: 'Pays étranger', pts: '+40' },
            { label: 'Email inconnu', pts: '+35' },
            { label: 'Plusieurs appareils', pts: '+30' },
            { label: 'Plusieurs IPs', pts: '+25' },
            { label: 'Tentative impression', pts: '+25' },
            { label: 'Tentative copier', pts: '+20' },
            { label: 'DevTools ouverts', pts: '+15' },
            { label: 'Nombreuses ouvertures', pts: '+15' },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', background: '#f9fafb', borderRadius: 6, padding: '5px 8px' }}>
              <span style={{ fontSize: 11, color: '#374151' }}>{r.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626' }}>{r.pts}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Liste membres */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>Chargement...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {members.map(m => {
            const level = m.risk_level || 'faible';
            const conf = LEVEL_CONFIG[level] || LEVEL_CONFIG.faible;
            const isExpanded = expanded === m.id;
            const risk = memberRisk[m.id];

            return (
              <div key={m.id} style={{ background: conf.bg, border: `1.5px solid ${conf.border}`, borderRadius: 14, overflow: 'hidden' }}>
                <div onClick={() => loadMemberRisk(m.id)} style={{ padding: 16, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 28, flexShrink: 0 }}>{conf.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{m.name}</span>
                        <span style={{ background: conf.border, color: conf.color, borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 800 }}>
                          {conf.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{m.email}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: conf.color }}>{m.risk_score || 0}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af' }}>/ 100</div>
                    </div>
                  </div>
                  <RiskBar score={m.risk_score || 0} level={level} />
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    {m.has_downloaded && <span style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 6, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>⬇ Téléchargé</span>}
                    {m.has_shared_link && <span style={{ background: '#fef3c7', color: '#d97706', borderRadius: 6, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>⚠ Lien partagé</span>}
                    {m.unauthorized_attempts > 0 && <span style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 6, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>⛔ {m.unauthorized_attempts} refus</span>}
                    <span style={{ background: '#e0e7ff', color: '#3730a3', borderRadius: 6, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>{m.total_opens} ouvertures</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
                    {isExpanded ? '▲ Réduire' : '▼ Voir le détail des facteurs de risque'}
                  </div>
                </div>

                {/* Détail facteurs */}
                {isExpanded && (
                  <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${conf.border}` }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '12px 0 8px' }}>Facteurs de risque détectés</div>
                    {!risk ? (
                      <div style={{ color: '#9ca3af', fontSize: 12 }}>Chargement...</div>
                    ) : risk.triggers.length === 0 ? (
                      <div style={{ color: '#16a34a', fontSize: 12 }}>✅ Aucun facteur de risque détecté</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {risk.triggers.map((t, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderRadius: 8, padding: '8px 10px', border: '1px solid #f3f4f6' }}>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{t.label}</div>
                              {t.detail && <div style={{ fontSize: 11, color: '#9ca3af' }}>{t.detail}</div>}
                            </div>
                            <span style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 800 }}>+{t.points}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
