import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

function formatTime(seconds) {
  const t = parseInt(seconds) || 0;
  if (t === 0) return '0s';
  if (t < 60) return t + 's';
  return Math.floor(t / 60) + 'min' + (t % 60 > 0 ? ' ' + (t % 60) + 's' : '');
}

function getHeatColor(time, max) {
  const ratio = max > 0 ? time / max : 0;
  if (ratio === 0) return { bg: '#f3f4f6', color: '#9ca3af', border: '#e5e7eb' };
  if (ratio < 0.25) return { bg: '#fef9c3', color: '#854d0e', border: '#fde047' };
  if (ratio < 0.5) return { bg: '#fed7aa', color: '#9a3412', border: '#fb923c' };
  if (ratio < 0.75) return { bg: '#fca5a5', color: '#991b1b', border: '#f87171' };
  return { bg: '#ef4444', color: '#fff', border: '#dc2626' };
}

export default function HeatmapPage() {
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [globalData, setGlobalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMember, setLoadingMember] = useState(false);
  const [view, setView] = useState('global');

  const fetchData = useCallback(async () => {
    try {
      const [membersRes, globalRes] = await Promise.all([
        api.get('/members'),
        api.get('/track/heatmap-global'),
      ]);
      setMembers(membersRes.data);
      setGlobalData(globalRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMemberHeatmap = async (member) => {
    if (selectedMember?.id === member.id) {
      setSelectedMember(null);
      setHeatmapData([]);
      return;
    }
    setSelectedMember(member);
    setHeatmapData([]);
    setLoadingMember(true);
    try {
      const { data } = await api.get('/track/heatmap/' + member.token);
      setHeatmapData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMember(false);
    }
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  const pageStats = {};
  globalData.forEach(d => {
    if (!pageStats[d.page_number]) {
      pageStats[d.page_number] = { totalTime: 0, totalVisits: 0, members: [] };
    }
    pageStats[d.page_number].totalTime += parseInt(d.total_time) || 0;
    pageStats[d.page_number].totalVisits += parseInt(d.total_visits) || 0;
    pageStats[d.page_number].members.push(d.member_name);
  });

  const maxTime = Math.max(...Object.values(pageStats).map(p => p.totalTime), 1);
  const pages = Object.keys(pageStats).sort((a, b) => a - b);

  return (
    <div style={{ padding: 16, background: '#f8f9fc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>🔥 Heatmap de lecture</h1>
          <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>Temps passé par page</p>
        </div>
        <button onClick={fetchData} style={{ padding: '8px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🔄</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setView('global')} style={{ padding: '8px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: view === 'global' ? 'none' : '1.5px solid #e5e7eb', background: view === 'global' ? '#6366f1' : '#fff', color: view === 'global' ? '#fff' : '#374151' }}>
          🌍 Vue globale
        </button>
        <button onClick={() => setView('members')} style={{ padding: '8px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: view === 'members' ? 'none' : '1.5px solid #e5e7eb', background: view === 'members' ? '#6366f1' : '#fff', color: view === 'members' ? '#fff' : '#374151' }}>
          👥 Par membre
        </button>
      </div>

      <div style={{ background: '#fff', border: '1.5px solid #e8eaf6', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Légende :</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[{bg:'#f3f4f6',label:'Non lu'},{bg:'#fef9c3',label:'Peu lu'},{bg:'#fed7aa',label:'Lu'},{bg:'#fca5a5',label:'Bien lu'},{bg:'#ef4444',label:'Très lu'}].map((l,i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, background: l.bg, border: '1px solid #e5e7eb' }} />
              <span style={{ fontSize: 11, color: '#6b7280' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Chargement...</div>
      ) : view === 'global' ? (
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12 }}>📊 Temps total par page (tous membres)</h2>
          {pages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, background: '#fff', borderRadius: 14, border: '1.5px solid #e8eaf6', color: '#9ca3af' }}>
              Aucune donnée — les membres doivent lire le document
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pages.map(page => {
                const stat = pageStats[page];
                const colors = getHeatColor(stat.totalTime, maxTime);
                const barWidth = Math.max((stat.totalTime / maxTime) * 100, 2);
                return (
                  <div key={page} style={{ background: colors.bg, border: '1.5px solid ' + colors.border, borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: colors.color === '#fff' ? '#fff' : '#111827' }}>📄 Page {page}</div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: colors.color === '#fff' ? '#fff' : '#374151' }}>{formatTime(stat.totalTime)}</div>
                        <div style={{ fontSize: 10, color: colors.color === '#fff' ? '#fecaca' : '#9ca3af' }}>{stat.totalVisits} visite{stat.totalVisits > 1 ? 's' : ''}</div>
                      </div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.1)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 999, background: colors.color === '#fff' ? '#fff' : '#6366f1', width: barWidth + '%', transition: 'width 0.5s ease' }} />
                    </div>
                    <div style={{ marginTop: 6, fontSize: 10, color: colors.color === '#fff' ? '#fecaca' : '#9ca3af' }}>
                      {[...new Set(stat.members)].join(', ')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12 }}>👥 Sélectionner un membre</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {members.map(m => (
              <div key={m.id}>
                <div onClick={() => fetchMemberHeatmap(m)} style={{ background: selectedMember?.id === m.id ? '#eef2ff' : '#fff', border: '1.5px solid ' + (selectedMember?.id === m.id ? '#6366f1' : '#e8eaf6'), borderRadius: selectedMember?.id === m.id ? '12px 12px 0 0' : 12, padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{m.email}</div>
                  </div>
                  <span style={{ fontSize: 16 }}>{selectedMember?.id === m.id ? '▲' : '▼'}</span>
                </div>
                {selectedMember?.id === m.id && (
                  <div style={{ background: '#f8f9fc', border: '1.5px solid #6366f1', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: 12 }}>
                    {loadingMember ? (
                      <div style={{ textAlign: 'center', padding: 20, color: '#6366f1', fontSize: 13 }}>Chargement...</div>
                    ) : heatmapData.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af', fontSize: 13 }}>Aucune donnée</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {(() => {
                          const maxT = Math.max(...heatmapData.map(d => d.time_spent), 1);
                          return heatmapData.map(d => {
                            const colors = getHeatColor(d.time_spent, maxT);
                            const barWidth = Math.max((d.time_spent / maxT) * 100, 2);
                            return (
                              <div key={d.page_number} style={{ background: colors.bg, border: '1.5px solid ' + colors.border, borderRadius: 10, padding: '10px 12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                  <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>📄 Page {d.page_number}</span>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{formatTime(d.time_spent)} · {d.visits} visite{d.visits > 1 ? 's' : ''}</span>
                                </div>
                                <div style={{ background: 'rgba(0,0,0,0.1)', borderRadius: 999, height: 6, overflow: 'hidden' }}>
                                  <div style={{ height: '100%', borderRadius: 999, background: '#6366f1', width: barWidth + '%' }} />
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
