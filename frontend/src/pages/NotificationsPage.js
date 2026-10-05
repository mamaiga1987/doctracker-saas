import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications || []);
      setUnread(data.unread || 0);
    } catch (err) {
      toast.error('Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleReadAll = async () => {
    try {
      await api.post('/notifications/read-all');
      setUnread(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success('Toutes les notifications marquées comme lues');
    } catch { toast.error('Erreur'); }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Supprimer toutes les notifications ?')) return;
    try {
      await api.delete('/notifications/all');
      setNotifications([]);
      setUnread(0);
      toast.success('Notifications supprimées');
    } catch { toast.error('Erreur'); }
  };

  const typeConfig = {
    open: { icon: '📄', label: 'Document ouvert', color: '#6366f1', bg: '#eef2ff' },
    download: { icon: '⬇️', label: 'Téléchargement', color: '#dc2626', bg: '#fee2e2' },
    unauthorized_access: { icon: '⛔', label: 'Accès refusé', color: '#ef4444', bg: '#fff5f5' },
    link_shared: { icon: '🔗', label: 'Lien partagé', color: '#f59e0b', bg: '#fffbeb' },
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
      <div style={{ color: '#6366f1' }}>Chargement...</div>
    </div>
  );

  return (
    <div style={{ padding: 16, background: '#f8f9fc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>
            🔔 Notifications
            {unread > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: 999, padding: '2px 8px', fontSize: 12, marginLeft: 8 }}>{unread}</span>}
          </h1>
          <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>Alertes en temps réel sur les accès</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {unread > 0 && (
            <button onClick={handleReadAll} style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid #6366f1', background: '#eef2ff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#4338ca' }}>
              ✓ Tout lire
            </button>
          )}
          <button onClick={handleDeleteAll} style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid #fca5a5', background: '#fff5f5', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#dc2626' }}>
            🗑 Vider
          </button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 16, border: '1.5px solid #e8eaf6' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔔</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#374151' }}>Aucune notification</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Les alertes apparaîtront ici quand un membre ouvrira le document</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notifications.map((n, i) => {
            const config = typeConfig[n.type] || { icon: '📋', label: n.type, color: '#6b7280', bg: '#f9fafb' };
            const data = typeof n.data === 'string' ? JSON.parse(n.data) : (n.data || {});
            return (
              <div key={i} style={{
                background: n.read ? '#fff' : config.bg,
                border: '1.5px solid ' + (n.read ? '#e8eaf6' : config.color + '44'),
                borderRadius: 14, padding: 14,
                borderLeft: '4px solid ' + config.color
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{config.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 4 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: config.color }}>{config.label}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af' }}>
                        {format(new Date(n.created_at), 'dd/MM HH:mm:ss', { locale: fr })}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: '#111827', fontWeight: 600, marginTop: 2 }}>{n.member_name}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{n.member_email}</div>
                    {data && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                        {data.browser && <span style={{ background: '#eef2ff', color: '#4338ca', borderRadius: 6, padding: '1px 6px', fontSize: 10 }}>🌐 {data.browser}</span>}
                        {data.os && <span style={{ background: '#f0fdf4', color: '#166534', borderRadius: 6, padding: '1px 6px', fontSize: 10 }}>📱 {data.os}</span>}
                        {data.ip && <span style={{ background: '#f3f4f6', color: '#374151', borderRadius: 6, padding: '1px 6px', fontSize: 10, fontFamily: 'monospace' }}>{data.ip}</span>}
                        {(data.city || data.country) && <span style={{ background: '#fffbeb', color: '#92400e', borderRadius: 6, padding: '1px 6px', fontSize: 10 }}>📍 {data.city || data.country}</span>}
                      </div>
                    )}
                  </div>
                  {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: config.color, flexShrink: 0, marginTop: 4 }} />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
