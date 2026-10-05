import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../utils/api';

function formatTime(seconds) {
  const t = parseInt(seconds) || 0;
  if (t === 0) return '0s';
  if (t < 60) return t + 's';
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (h > 0) return h + 'h ' + m + 'm';
  return m + 'min' + (s > 0 ? ' ' + s + 's' : '');
}

function getQualityBadge(quality, progress, totalTime) {
  const t = parseInt(totalTime) || 0;
  const p = parseInt(progress) || 0;
  if (t === 0) return { label: 'Non lu', color: '#6b7280', bg: '#f3f4f6', icon: '⚪' };
  if (t < 30) return { label: 'Très rapide', color: '#dc2626', bg: '#fff5f5', icon: '🔴' };
  if (p < 50) return { label: 'Partielle', color: '#d97706', bg: '#fffbeb', icon: '🟡' };
  if (p >= 80) return { label: 'Complète', color: '#16a34a', bg: '#f0fdf4', icon: '✅' };
  return { label: 'Moyenne', color: '#6366f1', bg: '#eef2ff', icon: '📖' };
}

function HeatmapBar({ pages }) {
  if (!pages || pages.length === 0) return <div style={{ color: '#9ca3af', fontSize: 11 }}>Aucune donnée page</div>;
  const max = Math.max(...pages.map(p => p.time_spent), 1);
  const getColor = (t) => {
    const r = t / max;
    if (r === 0) return '#e5e7eb';
    if (r < 0.25) return '#fef08a';
    if (r < 0.5) return '#fb923c';
    if (r < 0.75) return '#f87171';
    return '#ef4444';
  };
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
      {pages.map(p => (
        <div key={p.page_number} style={{ background: getColor(p.time_spent), borderRadius: 6, padding: '4px 8px', textAlign: 'center', minWidth: 36 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#111827' }}>P.{p.page_number}</div>
          <div style={{ fontSize: 9, color: '#374151' }}>{formatTime(p.time_spent)}</div>
        </div>
      ))}
    </div>
  );
}

export default function SessionsPage() {
  const [summaries, setSummaries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedSession, setExpandedSession] = useState(null);

  const fetchSummary = useCallback(async () => {
    try {
      const { data } = await api.get('/sessions/summary');
      setSummaries(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  const fetchDetail = useCallback(async (id) => {
    setLoadingDetail(true);
    setDetail(null);
    setExpandedSession(null);
    try {
      const { data } = await api.get('/sessions/member/' + id);
      setDetail(data);
    } catch (err) { console.error(err); }
    finally { setLoadingDetail(false); }
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { if (selected) fetchDetail(selected); }, [selected, fetchDetail]);

  const filtered = summaries.filter(s =>
    !search || s.member.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.member.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: 16, background: '#f8f9fc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>📋 Sessions & Activité</h1>
          <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>Historique détaillé par membre</p>
        </div>
        <button onClick={fetchSummary} style={{ padding: '8px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🔄</button>
      </div>

      {/* Barre de recherche */}
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="🔍 Rechercher un membre..."
        style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', background: '#fff', color: '#111827', boxSizing: 'border-box', marginBottom: 14 }} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#6366f1' }}>Chargement...</div>
      ) : (
        <div>
          {/* Liste membres */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {filtered.map(s => (
              <div key={s.member.id}>
                <div onClick={() => setSelected(selected === s.member.id ? null : s.member.id)}
                  style={{ background: selected === s.member.id ? '#eef2ff' : '#fff', border: '1.5px solid ' + (selected === s.member.id ? '#6366f1' : '#e8eaf6'), borderRadius: selected === s.member.id ? '14px 14px 0 0' : 14, padding: 14, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff', fontWeight: 800, flexShrink: 0 }}>
                      {s.member.name?.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{s.member.name}</div>
                      <div style={{ fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.member.email}</div>
                    </div>
                    <span style={{ fontSize: 18, color: '#6366f1' }}>{selected === s.member.id ? '▲' : '▼'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginTop: 10 }}>
                    {[
                      { icon: '🔗', label: 'Clics', value: s.stats.totalClics },
                      { icon: '🔐', label: 'OTP', value: s.stats.totalOtpAttempts },
                      { icon: '🔑', label: 'PIN', value: s.stats.totalPinSessions },
                      { icon: '⏱️', label: 'Temps', value: formatTime(s.stats.tempsTotal) },
                    ].map((stat, i) => (
                      <div key={i} style={{ background: '#f9fafb', borderRadius: 8, padding: '6px', textAlign: 'center' }}>
                        <div style={{ fontSize: 14 }}>{stat.icon}</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#6366f1' }}>{stat.value}</div>
                        <div style={{ fontSize: 9, color: '#9ca3af' }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Détail membre */}
                {selected === s.member.id && (
                  <div style={{ background: '#f8f9fc', border: '1.5px solid #6366f1', borderTop: 'none', borderRadius: '0 0 14px 14px', padding: 14 }}>
                    {loadingDetail ? (
                      <div style={{ textAlign: 'center', padding: 20, color: '#6366f1' }}>Chargement...</div>
                    ) : detail ? (
                      <div>
                        {/* Sessions de lecture */}
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
                            📖 Sessions de lecture ({detail.readingSessions?.length || 0})
                          </div>
                          {!detail.readingSessions || detail.readingSessions.length === 0 ? (
                            <div style={{ background: '#fff', borderRadius: 10, padding: 12, textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>
                              Aucune session enregistrée — les nouvelles lectures seront tracées automatiquement
                            </div>
                          ) : (
                            detail.readingSessions.map((session, i) => {
                              const q = getQualityBadge(session.reading_quality, session.progress, session.total_time);
                              const isExpanded = expandedSession === session.id;
                              return (
                                <div key={session.id} style={{ background: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, border: '1.5px solid #e8eaf6' }}>
                                  <div onClick={() => setExpandedSession(isExpanded ? null : session.id)} style={{ cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontWeight: 800, fontSize: 13, color: '#6366f1' }}>Session #{detail.readingSessions.length - i}</span>
                                        <span style={{ background: q.bg, color: q.color, borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>{q.icon} {q.label}</span>
                                        {session.document_name && <span style={{ background: '#f0fdf4', color: '#166534', borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>📄 {session.document_name}</span>}
                                      </div>
                                      <span style={{ fontSize: 18, color: '#9ca3af' }}>{isExpanded ? '▲' : '▼'}</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                                      <div style={{ background: '#f9fafb', borderRadius: 8, padding: '6px', textAlign: 'center' }}>
                                        <div style={{ fontSize: 12, fontWeight: 800, color: '#374151' }}>{formatTime(session.total_time)}</div>
                                        <div style={{ fontSize: 9, color: '#9ca3af' }}>Durée</div>
                                      </div>
                                      <div style={{ background: '#f9fafb', borderRadius: 8, padding: '6px', textAlign: 'center' }}>
                                        <div style={{ fontSize: 12, fontWeight: 800, color: '#374151' }}>{session.progress || 0}%</div>
                                        <div style={{ fontSize: 9, color: '#9ca3af' }}>Progression</div>
                                      </div>
                                      <div style={{ background: '#f9fafb', borderRadius: 8, padding: '6px', textAlign: 'center' }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{session.browser || '—'}</div>
                                        <div style={{ fontSize: 9, color: '#9ca3af' }}>Navigateur</div>
                                      </div>
                                    </div>
                                    <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 6 }}>
                                      🕐 {session.started_at ? format(new Date(session.started_at), 'dd/MM/yyyy à HH:mm', { locale: fr }) : '—'}
                                      {session.ip && <span style={{ marginLeft: 8, fontFamily: 'monospace' }}>📍 {session.city || session.country || session.ip}</span>}
                                    </div>
                                  </div>
                                  {isExpanded && (
                                    <div style={{ marginTop: 10, borderTop: '1px solid #f3f4f6', paddingTop: 10 }}>
                                      <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6 }}>⏱️ Temps par page :</div>
                                      <HeatmapBar pages={session.pages} />
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* OTP */}
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 8 }}>🔐 Codes OTP ({detail.otpHistory?.length || 0})</div>
                          {detail.otpHistory?.slice(0,5).map((o, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderRadius: 8, padding: '8px 12px', marginBottom: 4 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 800, letterSpacing: 4, color: '#374151' }}>{o.code}</span>
                                <span style={{ background: o.used ? '#d1fae5' : '#fef3c7', color: o.used ? '#065f46' : '#92400e', borderRadius: 999, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>
                                  {o.used ? '✓ Utilisé' : '⏳ Non utilisé'}
                                </span>
                              </div>
                              <span style={{ fontSize: 10, color: '#9ca3af' }}>{format(new Date(o.created_at), 'dd/MM HH:mm', { locale: fr })}</span>
                            </div>
                          ))}
                        </div>

                        {/* Suspects */}
                        {detail.suspicious?.length > 0 && (
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>⚠️ Événements suspects ({detail.suspicious.length})</div>
                            {detail.suspicious.map((e, i) => (
                              <div key={i} style={{ background: '#fff5f5', borderRadius: 8, padding: '8px 12px', marginBottom: 4, borderLeft: '3px solid #ef4444' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626' }}>
                                    {e.event_type === 'download' ? '⬇️ Téléchargement' : e.event_type === 'unauthorized_access' ? '🔒 Accès refusé' : '🔗 Lien partagé'}
                                  </span>
                                  <span style={{ fontSize: 10, color: '#9ca3af' }}>{format(new Date(e.created_at), 'dd/MM HH:mm', { locale: fr })}</span>
                                </div>
                                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{e.ip} — {e.browser}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, background: '#fff', borderRadius: 14, border: '1.5px solid #e8eaf6', color: '#9ca3af' }}>
              Aucun membre trouvé
            </div>
          )}
        </div>
      )}
    </div>
  );
}
