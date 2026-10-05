import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import api from '../utils/api';

export default function BehaviorPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    try {
      const { data } = await api.get('/track/events?limit=500');
      const behaviorEvents = data.filter(e =>
        e.event_type === 'view_progress' && e.metadata &&
        (e.metadata.clipboard || e.metadata.devtools || e.metadata.print ||
         e.metadata.focus_lost > 3 || e.metadata.screenshot)
      );
      setEvents(behaviorEvents);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const behaviors = [
    { key: 'clipboard', icon: '📋', label: 'Copier-coller', color: '#f59e0b', bg: '#fffbeb' },
    { key: 'devtools',  icon: '🔧', label: 'DevTools',     color: '#8b5cf6', bg: '#f5f3ff' },
    { key: 'print',     icon: '🖨️', label: 'Impression',   color: '#ef4444', bg: '#fff5f5' },
    { key: 'screenshot',icon: '📸', label: 'Capture écran',color: '#ec4899', bg: '#fdf2f8' },
    { key: 'focus_lost',icon: '👁️', label: 'Onglet quitté',color: '#6b7280', bg: '#f9fafb' },
  ];

  return (
    <div style={{ padding: 16, background: '#f8f9fc', minHeight: '100vh' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>Comportements suspects</h1>
        <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>
          Détection : copier-coller, DevTools, impression, perte de focus
        </p>
      </div>

      {/* Comment ça fonctionne */}
      <div style={{ background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: 14, padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e40af', marginBottom: 8 }}>ℹ️ Ce qui est détecté côté navigateur</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {behaviors.map(b => (
            <div key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 8, background: b.bg, borderRadius: 8, padding: '6px 10px' }}>
              <span style={{ fontSize: 16 }}>{b.icon}</span>
              <span style={{ fontSize: 12, color: b.color, fontWeight: 600 }}>{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Résumé */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
        {behaviors.slice(0, 4).map(b => {
          const count = events.filter(e => e.metadata?.[b.key]).length;
          return (
            <div key={b.key} style={{ background: count > 0 ? b.bg : '#fff', border: `1.5px solid ${count > 0 ? b.color + '44' : '#e8eaf6'}`, borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{b.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: count > 0 ? b.color : '#9ca3af' }}>{count}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>{b.label}</div>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>Chargement...</div>
      ) : events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, background: '#fff', borderRadius: 14, border: '1.5px solid #e8eaf6' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
          <div style={{ fontSize: 14, color: '#16a34a', fontWeight: 600 }}>Aucun comportement suspect détecté</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
            Le script de surveillance est actif sur chaque document ouvert
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {events.map(e => {
            const detectedBehaviors = behaviors.filter(b =>
              b.key === 'focus_lost' ? (e.metadata?.focus_lost > 3) : e.metadata?.[b.key]
            );
            return (
              <div key={e.id} style={{ background: '#fff', border: '1.5px solid #fca5a5', borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{e.member_name || e.member_email}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>
                      {format(new Date(e.created_at), 'dd/MM/yyyy HH:mm:ss')}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {detectedBehaviors.map(b => (
                        <span key={b.key} style={{ background: b.bg, color: b.color, borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700 }}>
                          {b.icon} {b.label}
                          {b.key === 'focus_lost' && ` (${e.metadata.focus_lost}x)`}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                      Suspect
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
