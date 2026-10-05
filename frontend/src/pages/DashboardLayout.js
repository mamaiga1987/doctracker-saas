import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useSocketEvent } from '../context/SocketContext';
import api from '../utils/api';

const navItems = [
  { to: '/',          label: 'Dashboard',       icon: '⬛', exact: true },
  { to: '/members',   label: 'Membres',         icon: '👥' },
  { to: '/documents', label: 'Documents PDF',   icon: '📄' },
  { to: '/alerts',    label: 'Alertes',         icon: '🔔' },
  { to: '/events',    label: 'Historique',      icon: '📋' },
  { to: '/superset',  label: 'Import Superset', icon: '🗃️' },
  { to: '/devices',   label: 'Appareils',      icon: '📱' },
  { to: '/notify',    label: 'Envoyer liens',   icon: '📧' },
  { to: '/risk',      label: 'Score de risque',  icon: '🎯' },
  { to: '/map',       label: 'Carte',            icon: '🗺️' },
  { to: '/live',      label: 'Session Live',     icon: '⚡' },
  { to: '/heatmap',   label: 'Heatmap lecture',  icon: '🔥' },
  { to: '/ai-center', label: 'Centre IA',        icon: '🤖' },
  { to: '/notifications', label: 'Notifications',    icon: '🔔' },
  { to: '/sessions',      label: 'Sessions',         icon: '📋' },
  { to: '/import',        label: 'Import membres',    icon: '📥' },
  { to: '/behavior',  label: 'Comportements',    icon: '🔍' },
  { to: '/settings',  label: 'Paramètres',     icon: '⚙️' },
];

export default function DashboardLayout() {
  const { token, logout, user, organization } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const fetchUnread = useCallback(async () => {
    try { const { data } = await api.get('/alerts/unread-count'); setUnreadAlerts(data.count); } catch {}
  }, []);

  useEffect(() => { fetchUnread(); }, [fetchUnread]);

  const handleSocketEvent = useCallback((eventName, data) => {
    const msgs = {
      document_opened:     `📄 ${data.member?.name} a ouvert son document`,
      download_detected:   `🚨 TÉLÉCHARGEMENT : ${data.member?.name}`,
      unauthorized_access: `⛔ Accès non autorisé depuis ${data.ip}`,
      link_shared:         `⚠️ Lien partagé : ${data.member?.name}`,
    };
    if (eventName === 'download_detected') toast.error(msgs[eventName], { duration: 8000 });
    else if (['unauthorized_access','link_shared'].includes(eventName)) toast.error(msgs[eventName], { duration: 6000 });
    else if (msgs[eventName]) toast.success(msgs[eventName]);
    if (eventName === 'new_alert') {
      setUnreadAlerts(c => c + 1);
      if ('Notification' in window && Notification.permission === 'granted') new Notification('DocTracker', { body: data.message });
    }
  }, []);

  useSocketEvent('dashboard', handleSocketEvent);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  }, []);

  const currentPage = navItems.find(n => n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to));

  return (
    <div style={{ background: 'var(--bg-void)', minHeight: '100vh' }}>
      <div className="mobile-topbar">
        <button onClick={() => setSidebarOpen(o => !o)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 22, cursor: 'pointer', padding: 4 }}>
          {sidebarOpen ? '✕' : '☰'}
        </button>
        <span style={{ fontSize: 15, fontWeight: 800 }}>📡 {currentPage?.label || 'DocTracker'}</span>
        {unreadAlerts > 0 && <span style={{ marginLeft: 'auto', background: 'var(--danger)', color: 'white', borderRadius: 999, padding: '1px 8px', fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{unreadAlerts}</span>}
      </div>

      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>📡</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>DocTracker</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>AirByte v1.0</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '12px 10px' }}>
          {navItems.map(({ to, label, icon, exact }) => (
            <NavLink key={to} to={to} end={exact} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, marginBottom: 2,
              fontSize: 13, fontWeight: 600, textDecoration: 'none', transition: 'all 0.15s',
              background: isActive ? 'var(--accent-glow)' : 'transparent',
              color: isActive ? 'var(--accent-bright)' : 'var(--text-secondary)',
              border: isActive ? '1px solid var(--border-glow)' : '1px solid transparent',
            })}>
              <span style={{ fontSize: 15 }}>{icon}</span>
              <span>{label}</span>
              {label === 'Alertes' && unreadAlerts > 0 && (
                <span style={{ marginLeft: 'auto', background: 'var(--danger)', color: 'white', borderRadius: 999, padding: '1px 7px', fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{unreadAlerts}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
          <div style={{ padding: '8px 12px', marginBottom: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{user?.first_name} {user?.last_name}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>{user?.email}</div>
            <div style={{ fontSize: 10, color: '#6366f1', marginTop: 2 }}>🏢 {organization?.name}</div>
            <div style={{ fontSize: 10, color: '#f59e0b', marginTop: 1 }}>Plan: {organization?.plan}</div>
          </div>
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 12 }} onClick={() => { logout(); navigate('/login'); }}>← Déconnexion</button>
        </div>
      </aside>

      <main className="main-content"><Outlet context={{ onAlertRead: fetchUnread }} /></main>
    </div>
  );
}
