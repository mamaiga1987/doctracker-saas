import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../utils/api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

function StatCard({ icon, label, value, sub, color, danger }) {
  return (
    <div style={{
      background: danger ? '#fff5f5' : '#fff',
      border: `1.5px solid ${danger ? '#fca5a5' : '#e8eaf6'}`,
      borderRadius: 14, padding: '14px 16px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
    }}>
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || '#6366f1', lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function EventRow({ e }) {
  const icons = { open: '📄', download: '🚨', unauthorized_access: '⛔', link_shared: '⚠️' };
  const labels = { open: 'a ouvert', download: 'a téléchargé', unauthorized_access: 'accès refusé', link_shared: 'lien partagé' };
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px', borderBottom: '1px solid #f3f4f6',
      background: e.event_type === 'download' ? '#fff5f5' : 'transparent'
    }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{icons[e.event_type] || '📋'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {e.member_name} <span style={{ color: '#6b7280', fontWeight: 400 }}>{labels[e.event_type] || e.event_type}</span>
        </div>
        <div style={{ fontSize: 10, color: '#9ca3af', display: 'flex', gap: 6, marginTop: 2 }}>
          {e.country && <span>{e.country === 'FR' ? '🇫🇷' : '🌍'} {e.city || e.country}</span>}
          {e.browser && <span>· {e.browser}</span>}
        </div>
      </div>
      <div style={{ fontSize: 10, color: '#9ca3af', flexShrink: 0 }}>
        {format(new Date(e.created_at), 'HH:mm')}
      </div>
    </div>
  );
}

function ReadingChart({ members }) {
  const getStatus = (m) => {
    const t = m.total_reading_time || 0;
    const opens = m.total_opens || 0;
    if (opens === 0 || t === 0) return { status: 'Non lu', col: '#6b7280', bg: '#f3f4f6', icon: '⚪', barWidth: 0, timeLabel: '—' };
    if (t < 30) return { status: 'Lecture rapide', col: '#dc2626', bg: '#fff5f5', icon: '🔴', barWidth: Math.min((t / 30) * 30, 30), timeLabel: t + 's' };
    if (t < 120) return { status: 'Lecture partielle', col: '#d97706', bg: '#fffbeb', icon: '🟡', barWidth: 30 + Math.min(((t - 30) / 90) * 35, 35), timeLabel: t < 60 ? t + 's' : Math.floor(t / 60) + 'min' + (t % 60 > 0 ? ' ' + (t % 60) + 's' : '') };
    return { status: 'Lecture complete', col: '#16a34a', bg: '#f0fdf4', icon: '✅ ', barWidth: 65 + Math.min((t / 600) * 35, 35), timeLabel: Math.floor(t / 60) + 'min' + (t % 60 > 0 ? ' ' + (t % 60) + 's' : '') };
  };

  return (
    <div style={{ background: '#fff', border: '1.5px solid #e8eaf6', borderRadius: 14, padding: 16, marginTop: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 800, color: '#111827', marginBottom: 4 }}>📊 Statut de lecture par membre</h2>
      <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>Basé sur le temps de lecture enregistré</p>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        {[{icon:'✅',label:'Lecture complète',col:'#16a34a'},{icon:'🟡',label:'Partielle',col:'#d97706'},{icon:'🔴',label:'Rapide',col:'#dc2626'},{icon:'⚪',label:'Non lu',col:'#6b7280'}].map((l,i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 12 }}>{l.icon}</span>
            <span style={{ fontSize: 11, color: l.col, fontWeight: 600 }}>{l.label}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {members.map((m, i) => {
          const { status, col, bg, icon, barWidth, timeLabel } = getStatus(m);
          return (
            <div key={i} style={{ background: bg, border: '1.5px solid ' + col + '44', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{m.name}</div>
                    <div style={{ fontSize: 10, color: '#6b7280' }}>{m.email}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: col }}>{timeLabel}</div>
                  <div style={{ fontSize: 10, color: col, fontWeight: 600 }}>{status}</div>
                </div>
              </div>
              <div style={{ background: '#e5e7eb', borderRadius: 999, height: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 999, background: col, width: barWidth + '%', transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 10, color: '#9ca3af' }}>{m.total_opens || 0} ouverture{(m.total_opens || 0) > 1 ? 's' : ''}</span>
                <span style={{ fontSize: 10, color: '#9ca3af' }}>
                  {m.last_open_at ? 'Dernier acces: ' + new Date(m.last_open_at).toLocaleDateString('fr-FR') : 'Jamais ouvert'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardHome() {
  const [stats, setStats] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [s, m] = await Promise.all([api.get('/track/stats'), api.get('/members')]);
      setStats(s.data); setMembers(m.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 15000);
    return () => clearInterval(t);
  }, [fetchData]);

  if (loading) return <div style={{ padding: 32, color: '#6b7280', fontSize: 14 }}>Chargement...</div>;

  const groupStats = [
    { name: 'Confiant', value: members.filter(m => m.grp === 'confiant').length },
    { name: 'Moins confiant', value: members.filter(m => m.grp === 'moins_confiant').length },
    { name: 'Pas confiant', value: members.filter(m => m.grp === 'pas_confiant').length },
  ];
  const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

  return (
    <div style={{ padding: 16, background: '#f8f9fc', minHeight: '100vh' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>Vue d'ensemble</h1>
        <p style={{ color: '#9ca3af', fontSize: 11, marginTop: 2 }}>
          Auto-refresh 15s · {format(new Date(), "d MMM yyyy HH:mm", { locale: fr })}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
        <StatCard icon="👥" label="Membres" value={stats?.totalMembers || 0} color="#6366f1" sub={`${stats?.membersOpened || 0} ont ouvert`} />
        <StatCard icon="📄" label="Ouvertures" value={stats?.totalOpens || 0} color="#10b981" sub={`${stats?.membersOpened || 0} distincts`} />
        <StatCard icon="⬇️" label="Téléchargements" value={stats?.totalDownloads || 0} color="#f59e0b" danger={stats?.totalDownloads > 0} />
        <StatCard icon="⛔" label="Accès refusés" value={stats?.totalUnauthorized || 0} color="#ef4444" danger={stats?.totalUnauthorized > 0} />
      </div>

      {/* Graphique groupes */}
      {members.length > 0 && (
        <div style={{ background: '#fff', border: '1.5px solid #e8eaf6', borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12 }}>👥 Répartition par groupe</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie data={groupStats} cx={55} cy={55} innerRadius={30} outerRadius={55} dataKey="value">
                  {groupStats.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {groupStats.map((g, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i], flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#374151' }}>{g.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{g.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Activité récente */}
      {stats?.recentEvents?.length > 0 && (
        <div style={{ background: '#fff', border: '1.5px solid #e8eaf6', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>⚡ Activité récente</h2>
          </div>
          {stats.recentEvents.slice(0, 8).map((e, i) => <EventRow key={i} e={e} />)}
        </div>
      )}

      {/* Résumé statut lecture */}
      {members.length > 0 && (() => {
        const complet = members.filter(m => (m.total_reading_time||0) >= 120).length;
        const partiel = members.filter(m => { const t=m.total_reading_time||0; return t>=30&&t<120; }).length;
        const rapide = members.filter(m => { const t=m.total_reading_time||0; return t>0&&t<30; }).length;
        const nonLu = members.filter(m => !m.total_reading_time||m.total_reading_time===0).length;
        return (
          <div style={{ background: '#fff', border: '1.5px solid #e8eaf6', borderRadius: 14, padding: 16, marginTop: 16, marginBottom: 8 }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: '#111827', marginBottom: 12 }}>📊 Statut de lecture — {members.length} membres</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
              {[
                { icon: '✅', label: 'Lecture complète', count: complet, color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
                { icon: '🟡', label: 'Partielle', count: partiel, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
                { icon: '🔴', label: 'Rapide', count: rapide, color: '#dc2626', bg: '#fff5f5', border: '#fca5a5' },
                { icon: '⚪', label: 'Non lu', count: nonLu, color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb' },
              ].map((s,i) => (
                <div key={i} style={{ background: s.bg, border: '1.5px solid ' + s.border, borderRadius: 12, padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22 }}>{s.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.count}</div>
                  <div style={{ fontSize: 10, color: s.color, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
                  <div style={{ fontSize: 9, color: '#9ca3af' }}>
                    {members.length > 0 ? Math.round(s.count/members.length*100) : 0}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Graphique lecture */}
      {members.length > 0 && <ReadingChart members={members} />}
    </div>
  );
}
