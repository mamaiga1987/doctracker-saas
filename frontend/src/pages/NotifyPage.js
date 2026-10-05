import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const GROUP_CONFIG = {
  confiant:       { label: 'Confiant',       bg: '#d1fae5', color: '#065f46' },
  moins_confiant: { label: 'Moins confiant', bg: '#fef3c7', color: '#92400e' },
  pas_confiant:   { label: 'Pas confiant',   bg: '#fee2e2', color: '#991b1b' },
};

export default function NotifyPage() {
  const [members, setMembers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sentResults, setSentResults] = useState(null);
  const [filterGroup, setFilterGroup] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    try {
      const { data } = await api.get('/members');
      setMembers(data);
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    return (!q || m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q))
        && (!filterGroup || m.grp === filterGroup);
  });

  const toggleSelect = (id) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const selectAll = () => setSelected(filtered.map(m => m.id));
  const selectNone = () => setSelected([]);
  const selectGroup = (grp) => setSelected(filtered.filter(m => m.grp === grp).map(m => m.id));

  const handleSend = async () => {
    if (selected.length === 0) { toast.error('Sélectionnez au moins un membre'); return; }
    if (!window.confirm(`Envoyer le lien à ${selected.length} membre(s) ?`)) return;
    setSending(true);
    setSentResults(null);
    try {
      const { data } = await api.post('/notify/send-bulk', {
        memberIds: selected,
        customMessage: customMessage.trim()
      });
      setSentResults(data);
      if (data.failed.length === 0) {
        toast.success(`✅ ${data.sent} email(s) envoyé(s) avec succès !`);
      } else {
        toast.success(`${data.sent} envoyés, ${data.failed.length} échecs`);
      }
      setSelected([]);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur envoi');
    } finally { setSending(false); }
  };

  const handleSendOne = async (member) => {
    setSending(true);
    try {
      await api.post(`/notify/send-link/${member.id}`, { customMessage: customMessage.trim() });
      toast.success(`Email envoyé à ${member.email}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    } finally { setSending(false); }
  };

  return (
    <div style={{ padding: 16, background: '#f8f9fc', minHeight: '100vh' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>Envoyer les liens</h1>
        <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>
          Envoyez à chaque membre son lien personnel par email
        </p>
      </div>

      {/* Message personnalisé */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e8eaf6', padding: 16, marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
          💬 Message personnalisé (optionnel)
        </label>
        <textarea
          value={customMessage}
          onChange={e => setCustomMessage(e.target.value)}
          placeholder="Ex: Veuillez trouver ci-joint le procès-verbal de l'Assemblée Générale du 5 mai 2026. Ce document est strictement confidentiel..."
          rows={3}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', resize: 'vertical', color: '#111827', fontFamily: 'inherit' }}
        />
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
          Ce message apparaîtra dans le corps de l'email en plus du lien de tracking.
        </div>
      </div>

      {/* Filtres et sélection */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e8eaf6', padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Rechercher..."
            style={{ flex: 1, minWidth: 140, padding: '9px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', color: '#111827' }} />
          <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)}
            style={{ padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 12, background: '#fff', color: '#111827', cursor: 'pointer' }}>
            <option value="">Tous les groupes</option>
            <option value="confiant">Confiant</option>
            <option value="moins_confiant">Moins confiant</option>
            <option value="pas_confiant">Pas confiant</option>
          </select>
        </div>

        {/* Boutons sélection rapide */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          <button onClick={selectAll} style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid #6366f1', background: '#eef2ff', color: '#4338ca', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            ✓ Tout sélectionner ({filtered.length})
          </button>
          <button onClick={selectNone} style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            ✗ Désélectionner
          </button>
          {['confiant','moins_confiant','pas_confiant'].map(grp => {
            const count = filtered.filter(m => m.grp === grp).length;
            if (count === 0) return null;
            const conf = GROUP_CONFIG[grp];
            return (
              <button key={grp} onClick={() => selectGroup(grp)} style={{ padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${conf.color}44`, background: conf.bg, color: conf.color, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {conf.label} ({count})
              </button>
            );
          })}
        </div>

        <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 600 }}>
          {selected.length} membre(s) sélectionné(s)
        </div>
      </div>

      {/* Liste membres */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e8eaf6', overflow: 'hidden', marginBottom: 16 }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>Chargement...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>Aucun membre</div>
        ) : filtered.map((m, i) => {
          const isSelected = selected.includes(m.id);
          const grp = GROUP_CONFIG[m.grp] || GROUP_CONFIG.moins_confiant;
          return (
            <div key={m.id} onClick={() => toggleSelect(m.id)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
              borderBottom: i < filtered.length - 1 ? '1px solid #f3f4f6' : 'none',
              cursor: 'pointer',
              background: isSelected ? '#eef2ff' : 'transparent',
              transition: 'background 0.15s'
            }}>
              {/* Checkbox */}
              <div style={{
                width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                background: isSelected ? '#6366f1' : '#fff',
                border: `2px solid ${isSelected ? '#6366f1' : '#d1d5db'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, color: '#fff', fontWeight: 700
              }}>
                {isSelected && '✓'}
              </div>

              {/* Infos membre */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{m.name}</span>
                  <span style={{ background: grp.bg, color: grp.color, borderRadius: 999, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{grp.label}</span>
                  <span style={{ background: '#e0e7ff', color: '#3730a3', borderRadius: 999, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>v{m.version}</span>
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.email}
                </div>
              </div>

              {/* Statut + bouton individuel */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {m.total_opens > 0 && (
                  <span style={{ background: '#d1fae5', color: '#065f46', borderRadius: 999, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>
                    ✓ Ouvert
                  </span>
                )}
                <button
                  onClick={e => { e.stopPropagation(); handleSendOne(m); }}
                  disabled={sending}
                  style={{ padding: '5px 10px', borderRadius: 8, border: '1.5px solid #6366f1', background: '#eef2ff', color: '#4338ca', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  📧 Envoyer
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Résultats envoi */}
      {sentResults && (
        <div style={{ background: sentResults.failed.length > 0 ? '#fffbeb' : '#f0fdf4', border: `1.5px solid ${sentResults.failed.length > 0 ? '#fcd34d' : '#86efac'}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 8 }}>
            Résultats de l'envoi
          </div>
          <div style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>
            ✅ {sentResults.sent} email(s) envoyé(s) avec succès sur {sentResults.total}
          </div>
          {sentResults.failed.length > 0 && (
            <div>
              <div style={{ fontSize: 13, color: '#dc2626', marginBottom: 4 }}>❌ {sentResults.failed.length} échec(s) :</div>
              {sentResults.failed.map((f, i) => (
                <div key={i} style={{ fontSize: 12, color: '#6b7280', marginLeft: 16 }}>• {f.email} — {f.error}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bouton envoi groupé */}
      <button
        onClick={handleSend}
        disabled={sending || selected.length === 0}
        style={{
          width: '100%', padding: '14px', borderRadius: 12, border: 'none',
          background: selected.length === 0 ? '#e5e7eb' : '#6366f1',
          color: selected.length === 0 ? '#9ca3af' : '#fff',
          fontWeight: 700, fontSize: 15, cursor: selected.length === 0 ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s'
        }}
      >
        {sending ? '⏳ Envoi en cours...' : `📧 Envoyer à ${selected.length} membre(s) sélectionné(s)`}
      </button>
    </div>
  );
}
