import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../utils/api';

export default function DevicesPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const { data: events } = await api.get('/track/events?limit=500');
      
      // Grouper par email → appareils distincts
      const byEmail = {};
      events.filter(e => e.event_type === 'open' && e.member_email).forEach(e => {
        const key = e.member_email;
        if (!byEmail[key]) {
          byEmail[key] = {
            email: e.member_email,
            name: e.member_name,
            devices: {},
            totalOpens: 0,
            lastOpen: e.created_at,
          };
        }
        // Fingerprint appareil = OS + browser + device_type
        const deviceKey = `${e.os || 'Unknown'}__${e.browser || 'Unknown'}__${e.device_type || 'unknown'}`;
        if (!byEmail[key].devices[deviceKey]) {
          byEmail[key].devices[deviceKey] = {
            os: e.os,
            browser: e.browser,
            deviceType: e.device_type,
            ips: new Set(),
            count: 0,
            firstSeen: e.created_at,
            lastSeen: e.created_at,
          };
        }
        byEmail[key].devices[deviceKey].ips.add(e.ip);
        byEmail[key].devices[deviceKey].count++;
        byEmail[key].totalOpens++;
        if (new Date(e.created_at) > new Date(byEmail[key].lastOpen)) {
          byEmail[key].lastOpen = e.created_at;
        }
      });

      // Convertir en tableau et trier par nb appareils
      const result = Object.values(byEmail).map(m => ({
        ...m,
        devices: Object.values(m.devices).map(d => ({ ...d, ips: Array.from(d.ips) })),
        deviceCount: Object.keys(m.devices).length,
      })).sort((a, b) => b.deviceCount - a.deviceCount);

      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const deviceIcon = (type) => type === 'mobile' ? '📱' : type === 'tablet' ? '📟' : '🖥️';

  return (
    <div style={{ padding: 16, background: '#f8f9fc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>Analyse Appareils</h1>
          <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>
            Détecte si un même email a été utilisé sur plusieurs appareils
          </p>
        </div>
        <button onClick={fetchData} style={{ padding: '8px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🔄</button>
      </div>

      {/* Alerte si multi-appareils détectés */}
      {data.filter(m => m.deviceCount > 1).length > 0 && (
        <div style={{ background: '#fff5f5', border: '1.5px solid #fca5a5', borderRadius: 14, padding: 16, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 14, marginBottom: 4 }}>
            🚨 {data.filter(m => m.deviceCount > 1).length} membre(s) avec plusieurs appareils détectés
          </div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            Ces membres ont ouvert le document depuis des appareils différents — possible partage du code OTP.
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>Chargement...</div>
      ) : data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, background: '#fff', borderRadius: 14, border: '1.5px solid #e8eaf6' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📱</div>
          <div style={{ color: '#6b7280', fontSize: 14 }}>Aucune donnée d'accès</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.map((m, i) => (
            <div key={i} style={{
              background: '#fff',
              border: `1.5px solid ${m.deviceCount > 1 ? '#fca5a5' : '#e8eaf6'}`,
              borderRadius: 14, padding: 16,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
            }}>
              {/* Header membre */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                  background: m.deviceCount > 1 ? '#fee2e2' : '#eef2ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
                }}>
                  {m.deviceCount > 1 ? '⚠️' : '✅'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{
                    fontSize: 22, fontWeight: 800,
                    color: m.deviceCount > 1 ? '#dc2626' : '#6366f1'
                  }}>{m.deviceCount}</div>
                  <div style={{ fontSize: 10, color: '#9ca3af' }}>appareil{m.deviceCount > 1 ? 's' : ''}</div>
                </div>
              </div>

              {/* Badge alerte multi-appareils */}
              {m.deviceCount > 1 && (
                <div style={{ background: '#fee2e2', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#dc2626', fontWeight: 600 }}>
                  🚨 Document ouvert depuis {m.deviceCount} appareils différents — possible partage du code OTP
                </div>
              )}

              {/* Liste des appareils */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {m.devices.map((d, j) => (
                  <div key={j} style={{
                    background: '#f9fafb', borderRadius: 10, padding: '10px 12px',
                    border: '1px solid #f3f4f6',
                    display: 'flex', alignItems: 'center', gap: 10
                  }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{deviceIcon(d.deviceType)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>
                        {d.os || 'OS inconnu'} · {d.browser || 'Navigateur inconnu'}
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {d.ips.map((ip, k) => (
                          <span key={k} style={{ fontFamily: 'monospace', background: '#e5e7eb', padding: '1px 6px', borderRadius: 4 }}>{ip}</span>
                        ))}
                      </div>
                      <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                        1er accès : {format(new Date(d.firstSeen), "d MMM HH:mm", { locale: fr })} · 
                        Dernier : {format(new Date(d.lastSeen), "d MMM HH:mm", { locale: fr })} · 
                        {d.count} ouverture{d.count > 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <span style={{
                        background: j === 0 ? '#d1fae5' : '#fee2e2',
                        color: j === 0 ? '#065f46' : '#dc2626',
                        borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 700
                      }}>
                        {j === 0 ? '1er appareil' : `Appareil ${j + 1}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Stats bas */}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <div style={{ flex: 1, background: '#f9fafb', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#6366f1' }}>{m.totalOpens}</div>
                  <div style={{ fontSize: 10, color: '#9ca3af' }}>Ouvertures totales</div>
                </div>
                <div style={{ flex: 1, background: '#f9fafb', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>
                    {format(new Date(m.lastOpen), 'dd/MM HH:mm')}
                  </div>
                  <div style={{ fontSize: 10, color: '#9ca3af' }}>Dernier accès</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
