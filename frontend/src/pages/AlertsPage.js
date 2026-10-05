import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import api from '../utils/api';

const SEV = {
  danger:  { icon: '🚨', bg: '#fff5f5', border: '#fca5a5', labelBg: '#fee2e2', labelColor: '#991b1b' },
  warning: { icon: '⚠️', bg: '#fffbeb', border: '#fcd34d', labelBg: '#fef3c7', labelColor: '#92400e' },
  info:    { icon: '📄', bg: '#eff6ff', border: '#93c5fd', labelBg: '#dbeafe', labelColor: '#1e40af' },
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchAlerts = useCallback(async () => {
    try {
      const { data } = await api.get('/alerts?limit=200');
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Erreur chargement alertes');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const markRead = async (id) => {
    try {
      await api.put(`/alerts/${id}/read`);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
    } catch { toast.error('Erreur'); }
  };

  const markAllRead = async () => {
    try {
      await api.put('/alerts/read-all');
      setAlerts(prev => prev.map(a => ({ ...a, read: true })));
      toast.success('Toutes marquées comme lues');
    } catch { toast.error('Erreur'); }
  };

  const deleteAlert = async (id) => {
    try {
      await api.delete(`/alerts/${id}`);
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch { toast.error('Erreur suppression'); }
  };

  const filtered = filter ? alerts.filter(a => a.severity === filter) : alerts;
  const unread = alerts.filter(a => !a.read).length;

  return (
    <div style={{ padding: 16, background: '#f8f9fc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: 10 }}>
            Alertes
            {unread > 0 && (
              <span style={{ background: '#ef4444', color: '#fff', borderRadius: 999, padding: '1px 10px', fontSize: 13, fontWeight: 700 }}>
                {unread}
              </span>
            )}
          </h1>
          <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>{alerts.length} alerte{alerts.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {unread > 0 && (
            <button onClick={markAllRead} style={{ padding: '8px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
              ✓ Tout lu
            </button>
          )}
          <button onClick={fetchAlerts} style={{ padding: '8px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
            🔄
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { val: '', label: 'Tout', count: alerts.length },
          { val: 'danger',  label: '🚨 Critique', count: alerts.filter(a => a.severity === 'danger').length },
          { val: 'warning', label: '⚠️ Avert.',   count: alerts.filter(a => a.severity === 'warning').length },
          { val: 'info',    label: 'ℹ️ Info',      count: alerts.filter(a => a.severity === 'info').length },
        ].map(({ val, label, count }) => (
          <button key={val} onClick={() => setFilter(val)} style={{
            padding: '7px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: filter === val ? 'none' : '1.5px solid #e5e7eb',
            background: filter === val ? '#6366f1' : '#fff',
            color: filter === val ? '#fff' : '#374151'
          }}>
            {label} {count > 0 && <span style={{ marginLeft: 4, opacity: 0.8 }}>({count})</span>}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, background: '#fff', borderRadius: 14, border: '1.5px solid #e8eaf6' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
          <div style={{ fontSize: 14, color: '#6b7280', fontWeight: 600 }}>Aucune alerte</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(alert => {
            const conf = SEV[alert.severity] || SEV.info;
            return (
              <div key={alert.id} style={{
                background: conf.bg,
                border: `1.5px solid ${conf.border}`,
                borderRadius: 14, padding: 16,
                opacity: alert.read ? 0.6 : 1,
                transition: 'opacity 0.2s'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{conf.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{alert.message}</span>
                      {!alert.read && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366f1', display: 'inline-block', flexShrink: 0 }} />}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
                      {format(new Date(alert.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                      {alert.member_email && ` · ${alert.member_email}`}
                    </div>
                    {alert.details && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {alert.details.ip      && <span style={{ background: conf.labelBg, color: conf.labelColor, borderRadius: 6, padding: '2px 8px', fontSize: 10, fontFamily: 'monospace', fontWeight: 600 }}>IP: {alert.details.ip}</span>}
                        {alert.details.city    && <span style={{ background: conf.labelBg, color: conf.labelColor, borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>📍 {alert.details.city || alert.details.country}</span>}
                        {alert.details.browser && <span style={{ background: conf.labelBg, color: conf.labelColor, borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>🌐 {alert.details.browser}</span>}
                        {alert.details.os      && <span style={{ background: conf.labelBg, color: conf.labelColor, borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>{alert.details.os}</span>}
                        {alert.details.accessEmail && <span style={{ background: conf.labelBg, color: conf.labelColor, borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>✉️ {alert.details.accessEmail}</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {!alert.read && (
                    <button onClick={() => markRead(alert.id)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: `1px solid ${conf.border}`, background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
                      ✓ Marquer lu
                    </button>
                  )}
                  <button onClick={() => deleteAlert(alert.id)} style={{ flex: alert.read ? 1 : 0, padding: '7px 14px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fff5f5', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#dc2626' }}>
                    🗑 Supprimer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
