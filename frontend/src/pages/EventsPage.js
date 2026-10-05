import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../utils/api';

const EVT = {
  open:                { label: 'Ouverture',     icon: '📄', bg: '#eff6ff', color: '#1e40af' },
  download:            { label: 'Téléchargement', icon: '🚨', bg: '#fff5f5', color: '#991b1b' },
  unauthorized_access: { label: 'Accès refusé',  icon: '⛔', bg: '#fff5f5', color: '#991b1b' },
  link_shared:         { label: 'Lien partagé',  icon: '⚠️', bg: '#fffbeb', color: '#92400e' },
  view_progress:       { label: 'Progression',   icon: '📊', bg: '#f0fdf4', color: '#166534' },
};

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 200 });
      if (filterType) params.set('eventType', filterType);
      const { data } = await api.get(`/track/events?${params}`);
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  return (
    <div style={{ padding: 16, background: '#f8f9fc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>Historique</h1>
          <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>{events.length} événement{events.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={fetchEvents} style={{ padding: '8px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>🔄</button>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => setFilterType('')} style={{ padding: '7px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: !filterType ? 'none' : '1.5px solid #e5e7eb', background: !filterType ? '#6366f1' : '#fff', color: !filterType ? '#fff' : '#374151' }}>
          Tous
        </button>
        {Object.entries(EVT).map(([val, { label, icon }]) => (
          <button key={val} onClick={() => setFilterType(val)} style={{ padding: '7px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: filterType === val ? 'none' : '1.5px solid #e5e7eb', background: filterType === val ? '#6366f1' : '#fff', color: filterType === val ? '#fff' : '#374151' }}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>Chargement...</div>
      ) : events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, background: '#fff', borderRadius: 14, border: '1.5px solid #e8eaf6' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
          <div style={{ fontSize: 14, color: '#6b7280' }}>Aucun événement</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {events.map(e => {
            const conf = EVT[e.event_type] || EVT.open;
            return (
              <div key={e.id} style={{
                background: e.event_type === 'download' ? '#fff5f5' : '#fff',
                border: `1.5px solid ${e.event_type === 'download' ? '#fca5a5' : '#e8eaf6'}`,
                borderRadius: 12, padding: 14,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* Icône type */}
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: conf.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    {conf.icon}
                  </div>

                  {/* Infos principales */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>
                        {e.member_name || e.member_email || 'Inconnu'}
                      </span>
                      <span style={{ background: conf.bg, color: conf.color, borderRadius: 6, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>
                        {conf.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
                      {e.member_email}
                    </div>

                    {/* Détails techniques */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {e.ip && (
                        <span style={{ background: '#f3f4f6', color: '#374151', borderRadius: 6, padding: '2px 7px', fontSize: 10, fontFamily: 'monospace' }}>
                          {e.ip}
                        </span>
                      )}
                      {(e.city || e.country) && (
                        <span style={{ background: '#f3f4f6', color: '#374151', borderRadius: 6, padding: '2px 7px', fontSize: 10 }}>
                          📍 {[e.city, e.country].filter(Boolean).join(', ')}
                        </span>
                      )}
                      {e.browser && (
                        <span style={{ background: '#f3f4f6', color: '#374151', borderRadius: 6, padding: '2px 7px', fontSize: 10 }}>
                          🌐 {e.browser}
                        </span>
                      )}
                      {e.device_type && (
                        <span style={{ background: '#f3f4f6', color: '#374151', borderRadius: 6, padding: '2px 7px', fontSize: 10 }}>
                          {e.device_type === 'mobile' ? '📱' : e.device_type === 'tablet' ? '📟' : '🖥️'} {e.device_type}
                        </span>
                      )}
                      {e.os && (
                        <span style={{ background: '#f3f4f6', color: '#374151', borderRadius: 6, padding: '2px 7px', fontSize: 10 }}>
                          {e.os}
                        </span>
                      )}
                      {e.access_email && (
                        <span style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 6, padding: '2px 7px', fontSize: 10, fontWeight: 600 }}>
                          ✉️ {e.access_email}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: '#374151', fontWeight: 600 }}>
                      {format(new Date(e.created_at), 'dd/MM/yy')}
                    </div>
                    <div style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'monospace' }}>
                      {format(new Date(e.created_at), 'HH:mm:ss')}
                    </div>
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
