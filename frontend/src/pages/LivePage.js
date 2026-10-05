import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import api from '../utils/api';

function getReadingQuality(timeSpent, progress) {
  if (!timeSpent || timeSpent < 30) return { label: 'Non lu', color: '#dc2626', icon: '❌' };
  if (timeSpent < 60) return { label: 'Regardé', color: '#f59e0b', icon: '👀' };
  if (progress < 30) return { label: 'Partiel', color: '#f59e0b', icon: '⚡' };
  if (progress < 70) return { label: 'En cours', color: '#6366f1', icon: '📖' };
  return { label: 'Lu', color: '#10b981', icon: '✅' };
}

function formatDuration(seconds) {
  if (!seconds) return '0s';
  if (seconds < 60) return seconds + 's';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m + 'min ' + (s > 0 ? s + 's' : '');
}

export default function LivePage() {
  const [sessions, setSessions] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchData = useCallback(async () => {
    try {
      const [sessionsRes, eventsRes] = await Promise.all([
        api.get('/track/active-sessions'),
        api.get('/track/events?limit=10&type=open'),
      ]);
      setSessions(sessionsRes.data);
      setRecentEvents(eventsRes.data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div style={{ padding: 16, background: '#f8f9fc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>⚡ Session Live</h1>
          <p style={{ color: '#9ca3af', fontSize: 11, marginTop: 2 }}>
            Mis à jour: {format(lastUpdate, 'HH:mm:ss')} — rafraîchissement toutes les 5s
          </p>
        </div>
        <button onClick={fetchData} style={{ padding: '8px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🔄</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
        <div style={{ background: sessions.length > 0 ? '#f0fdf4' : '#fff', border: '1.5px solid ' + (sessions.length > 0 ? '#86efac' : '#e8eaf6'), borderRadius: 12, padding: '14px' }}>
          <div style={{ fontSize: 22 }}>👁️</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: sessions.length > 0 ? '#16a34a' : '#9ca3af' }}>{sessions.length}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>Lecteurs actifs</div>
        </div>
        <div style={{ background: '#fff', border: '1.5px solid #e8eaf6', borderRadius: 12, padding: '14px' }}>
          <div style={{ fontSize: 22 }}>📊</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#6366f1' }}>{recentEvents.length}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>Accès récents</div>
        </div>
      </div>

      {/* Indicateur */}
      <div style={{ background: '#fff', border: '1.5px solid #e8eaf6', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: sessions.length > 0 ? '#10b981' : '#9ca3af', boxShadow: sessions.length > 0 ? '0 0 0 3px #d1fae5' : 'none' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
          {sessions.length > 0 ? sessions.length + ' membre(s) en train de lire' : 'Aucune lecture en cours'}
        </span>
      </div>

      {/* Sessions actives */}
      {sessions.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 10 }}>📖 En cours de lecture</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sessions.map((s, i) => {
              const progress = s.progress || 0;
              const timeSpent = s.timeSpent || 0;
              return (
                <div key={i} style={{
                  background: '#fff',
                  border: '2px solid #6366f1',
                  borderRadius: 14,
                  padding: 16,
                  boxShadow: '0 2px 12px rgba(99,102,241,0.1)'
                }}>
                  {/* En-tête membre */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, color: '#fff', fontWeight: 800
                      }}>
                        {s.memberName?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{s.memberName}</div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>{s.memberEmail}</div>
                      </div>
                    </div>
                    <div style={{ background: '#eef2ff', color: '#4338ca', borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 700 }}>
                      🟢 Actif
                    </div>
                  </div>

                  {/* Page actuelle */}
                  <div style={{ background: '#f8f9fc', borderRadius: 10, padding: '10px 14px', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                        📄 Page {s.currentPage} sur {s.totalPages}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#6366f1' }}>{progress}%</span>
                    </div>
                    {/* Barre de progression */}
                    <div style={{ background: '#e5e7eb', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 999,
                        background: 'linear-gradient(90deg, #6366f1, #818cf8)',
                        width: progress + '%',
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>

                  {/* Infos */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 16 }}>⏱️</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>{formatDuration(timeSpent)}</div>
                      <div style={{ fontSize: 10, color: '#6b7280' }}>Durée</div>
                    </div>
                    <div style={{ background: '#eff6ff', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 16 }}>📍</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8' }}>{s.city || s.country || 'FR'}</div>
                      <div style={{ fontSize: 10, color: '#6b7280' }}>Lieu</div>
                    </div>
                    <div style={{ background: '#faf5ff', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 16 }}>📱</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#7e22ce' }}>{s.browser || 'Web'}</div>
                      <div style={{ fontSize: 10, color: '#6b7280' }}>Navigateur</div>
                    </div>
                  </div>

                  {/* Qualité de lecture */}
                  {(() => {
                    const q = getReadingQuality(s.timeSpent, s.progress);
                    return (
                      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ background: q.color + '22', color: q.color, borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                          {q.icon} {q.label}
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>
                          Dernière activité : {format(new Date(s.lastActivity), 'HH:mm:ss')}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Accès récents */}
      <div>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 10 }}>🕐 Accès récents</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recentEvents.map((e, i) => (
            <div key={i} style={{ background: '#fff', border: '1.5px solid #e8eaf6', borderRadius: 12, padding: 14, borderLeft: '4px solid #6366f1' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{e.member_name}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>{format(new Date(e.created_at), 'dd/MM HH:mm:ss')}</div>
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>{e.member_email}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {e.ip && <span style={{ background: '#f3f4f6', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontFamily: 'monospace' }}>{e.ip}</span>}
                {e.country && <span style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: 6, padding: '2px 8px', fontSize: 10 }}>{e.country === 'FR' ? '🇫🇷' : '🌍'} {e.city || e.country}</span>}
                {e.browser && <span style={{ background: '#f0fdf4', color: '#166534', borderRadius: 6, padding: '2px 8px', fontSize: 10 }}>🌐 {e.browser}</span>}
                {e.os && <span style={{ background: '#faf5ff', color: '#7e22ce', borderRadius: 6, padding: '2px 8px', fontSize: 10 }}>📱 {e.os}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
