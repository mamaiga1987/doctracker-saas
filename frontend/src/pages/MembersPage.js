import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../utils/api';

const GROUP_CONFIG = {
  confiant:       { label: 'Confiant',       bg: '#d1fae5', color: '#065f46' },
  moins_confiant: { label: 'Moins confiant', bg: '#fef3c7', color: '#92400e' },
  pas_confiant:   { label: 'Pas confiant',   bg: '#fee2e2', color: '#991b1b' },
};

function MemberModal({ member, onClose, onSave }) {
  const [form, setForm] = useState(member ? {
    name: member.name, email: member.email,
    group: member.grp, assignedVersion: member.version
  } : { name: '', email: '', group: 'moins_confiant', assignedVersion: 'A' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (member?.id) await api.put('/members/' + member.id, form);
      else await api.post('/members', form);
      toast.success(member?.id ? 'Membre mis à jour' : 'Membre créé');
      onSave();
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
    finally { setLoading(false); }
  };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
    }}>
      <div style={{ background: '#fff', width: '100%', maxWidth: 520, borderRadius: '20px 20px 0 0', padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#111827' }}>{member?.id ? 'Modifier' : 'Ajouter un membre'}</h2>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: 999, width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          {[{k:'name',l:'Nom complet',t:'text',p:'Jean Dupont'},{k:'email',l:'Email',t:'email',p:'jean@exemple.com'}].map(({k,l,t,p}) => (
            <div key={k} style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{l}</label>
              <input type={t} value={form[k] || ''} placeholder={p} required onChange={e => setForm(f => ({...f,[k]:e.target.value}))}
                style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', color: '#111827' }} />
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Groupe</label>
              <select value={form.group} onChange={e => setForm(f => ({...f,group:e.target.value}))}
                style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, background: '#fff', color: '#111827' }}>
                <option value="confiant">Confiant</option>
                <option value="moins_confiant">Moins confiant</option>
                <option value="pas_confiant">Pas confiant</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Version PDF</label>
              <select value={form.assignedVersion} onChange={e => setForm(f => ({...f,assignedVersion:e.target.value}))}
                style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, background: '#fff', color: '#111827' }}>
                <option value="A">Version A</option>
                <option value="B">Version B</option>
                <option value="C">Version C</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: '#374151' }}>Annuler</button>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}

function getReadingStatus(totalReadingTime, totalOpens) {
  const t = totalReadingTime || 0;
  if (totalOpens === 0 || t === 0) return { label: 'Non lu', icon: '⚪', bg: '#f3f4f6', color: '#6b7280' };
  if (t < 30) return { label: 'Lecture rapide', icon: '🔴', bg: '#fff5f5', color: '#dc2626' };
  if (t < 120) return { label: 'Lecture partielle', icon: '🟡', bg: '#fffbeb', color: '#d97706' };
  return { label: 'Lecture complète', icon: '✅', bg: '#f0fdf4', color: '#16a34a' };
}

function MemberCard({ m, onEdit, onDelete, onCopy, onRegen, onPin, onDownload, onReset, onOtpDuration }) {
  const grp = GROUP_CONFIG[m.grp] || { label: m.grp, bg: '#f3f4f6', color: '#374151' };
  const reading = getReadingStatus(m.total_reading_time, m.total_opens);
  const t = m.total_reading_time || 0;
  const timeLabel = t === 0 ? '—' : t < 60 ? t + 's' : Math.floor(t/60) + 'min' + (t%60>0?' '+t%60+'s':'');

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #e8eaf6', padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff', fontWeight: 800, flexShrink: 0 }}>
          {m.name?.charAt(0) || '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{m.name}</div>
          <div style={{ fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
            <span style={{ background: grp.bg, color: grp.color, borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>{grp.label}</span>
            <span style={{ background: '#eef2ff', color: '#4338ca', borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>v{m.version}</span>
            {m.pin_code && <span style={{ background: '#eef2ff', color: '#4338ca', borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>🔑 PIN</span>}
            <span style={{ background: reading.bg, color: reading.color, borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>{reading.icon} {reading.label}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#6366f1' }}>{m.total_opens || 0}</div>
          <div style={{ fontSize: 10, color: '#9ca3af' }}>Ouvertures</div>
        </div>
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: m.has_downloaded ? '#ef4444' : '#10b981' }}>{m.has_downloaded ? '⚠️ OUI' : '✓ NON'}</div>
          <div style={{ fontSize: 10, color: '#9ca3af' }}>Téléchargé</div>
        </div>
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>{timeLabel}</div>
          <div style={{ fontSize: 10, color: '#9ca3af' }}>Temps lecture</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <button onClick={() => onCopy(m.tracking_link)} style={{ padding: '9px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
          📋 Copier lien
        </button>
        <button onClick={() => onEdit(m)} style={{ padding: '9px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
          ✏️ Éditer
        </button>
        <button onClick={() => onPin(m.id, m.name, m.pin_code)} style={{ padding: '9px', borderRadius: 10, border: '1.5px solid ' + (m.pin_code ? '#6366f1' : '#e5e7eb'), background: m.pin_code ? '#eef2ff' : '#f9fafb', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: m.pin_code ? '#4338ca' : '#374151' }}>
          {m.pin_code ? '🔑 PIN actif ✓' : '🔑 Définir PIN'}
        </button>
        <button onClick={() => onOtpDuration(m.id, m.name, m.otp_duration_hours)} style={{ padding: '9px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#f9fafb', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
          ⏰ OTP: {m.otp_duration_hours ? m.otp_duration_hours+'h' : 'Global'}
        </button>
        <button onClick={() => onDownload(m.id, m.name, m.allow_download)} style={{ padding: '9px', borderRadius: 10, border: '1.5px solid ' + (m.allow_download ? '#f59e0b' : '#e5e7eb'), background: m.allow_download ? '#fffbeb' : '#f9fafb', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: m.allow_download ? '#d97706' : '#374151' }}>
          {m.allow_download ? '⬇️ DL autorisé' : '🚫 DL bloqué'}
        </button>
        <button onClick={() => onReset(m.id, m.name)} style={{ padding: '9px', borderRadius: 10, border: '1.5px solid #f59e0b', background: '#fffbeb', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#d97706' }}>
          📱 Reset appareil
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button onClick={() => onRegen(m.id, m.name)} style={{ padding: '9px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
          🔄 Nouveau lien
        </button>
        <button onClick={() => onDelete(m.id, m.name)} style={{ padding: '9px', borderRadius: 10, border: '1.5px solid #fca5a5', background: '#fff5f5', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#dc2626' }}>
          🗑 Supprimer
        </button>
      </div>
    </div>
  );
}

export default function MembersPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterReading, setFilterReading] = useState('');
  const [pinModal, setPinModal] = useState(null);
  const [otpModal, setOtpModal] = useState(null);
  const [otpHours, setOtpHours] = useState('');
  const [newPin, setNewPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editMember, setEditMember] = useState(null);

  const fetchMembers = useCallback(async () => {
    try { const { data } = await api.get('/members'); setMembers(data); }
    catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleDelete = async (id, name) => {
    if (!window.confirm('Supprimer ' + name + ' ?')) return;
    try { await api.delete('/members/' + id); toast.success('Supprimé'); fetchMembers(); }
    catch { toast.error('Erreur suppression'); }
  };

  const handleOtpDuration = (id, name, currentHours) => {
    setOtpModal({ id, name, currentHours });
    setOtpHours(currentHours || '');
  };

  const handleOtpSave = async () => {
    const hours = otpHours === '' ? null : parseInt(otpHours);
    if (hours !== null && (isNaN(hours) || hours < 1)) { toast.error('Durée invalide'); return; }
    try {
      await api.post('/members/' + otpModal.id + '/set-otp-duration', { hours });
      toast.success(hours ? 'OTP: ' + hours + 'h pour ' + otpModal.name : 'OTP global restauré');
      setOtpModal(null);
      fetchMembers();
    } catch { toast.error('Erreur'); }
  };

  const handleResetDevice = async (id, name) => {
    if (!window.confirm('Réinitialiser l\'appareil de ' + name + ' ?\nLa prochaine connexion enregistrera un nouvel appareil.')) return;
    try {
      await api.post('/members/' + id + '/reset-device');
      toast.success('Appareil réinitialisé pour ' + name);
      fetchMembers();
    } catch { toast.error('Erreur'); }
  };

  const handleRegen = async (id, name) => {
    if (!window.confirm('Régénérer le lien de ' + name + ' ?')) return;
    try {
      const { data } = await api.post('/members/' + id + '/regenerate-token');
      await navigator.clipboard.writeText(data.trackingLink).catch(() => {});
      toast.success('Nouveau lien généré et copié !');
      fetchMembers();
    } catch { toast.error('Erreur'); }
  };

  const handleCopy = async (link) => {
    if (!link) { toast.error('Pas de lien disponible'); return; }
    try { await navigator.clipboard.writeText(link); toast.success('Lien copié !'); }
    catch { toast.error('Impossible de copier'); }
  };

  const handleDownload = async (id, name, currentAllow) => {
    const action = currentAllow
      ? window.confirm('Désactiver le téléchargement pour ' + name + ' ?')
      : window.confirm('Autoriser le téléchargement pour ' + name + ' ?');
    if (!action) return;
    try {
      await api.post('/members/' + id + '/set-download', { allow: !currentAllow });
      toast.success(currentAllow ? 'Téléchargement désactivé' : 'Téléchargement autorisé pour ' + name);
      fetchMembers();
    } catch { toast.error('Erreur'); }
  };

  const handlePin = (id, name, currentPin) => {
    setPinModal({ id, name, currentPin });
    setNewPin('');
    setShowPin(false);
  };

  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    return (!q || m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q))
        && (!filterGroup || m.grp === filterGroup);
  });

  const handlePinSave = async () => {
    if (!newPin && !pinModal?.currentPin) { toast.error('Saisissez un PIN'); return; }
    if (newPin && newPin.length < 4) { toast.error('PIN trop court (min 4 chiffres)'); return; }
    try {
      await api.post('/members/' + pinModal.id + '/set-pin', { pin: newPin || pinModal.currentPin });
      toast.success('PIN mis à jour pour ' + pinModal.name);
      setPinModal(null);
      fetchMembers();
    } catch { toast.error('Erreur'); }
  };

  const handlePinDelete = async () => {
    if (!window.confirm('Supprimer le PIN de ' + pinModal.name + ' ?')) return;
    try {
      await api.post('/members/' + pinModal.id + '/set-pin', { pin: null });
      toast.success('PIN supprimé');
      setPinModal(null);
      fetchMembers();
    } catch { toast.error('Erreur'); }
  };

  const handlePinSendEmail = async () => {
    try {
      await api.post('/members/' + pinModal.id + '/send-pin-email');
      toast.success('PIN envoyé par email a ' + pinModal.name);
    } catch { toast.error('Erreur envoi email'); }
  };

  return (
    <div style={{ padding: 16, background: '#f8f9fc', minHeight: '100vh' }}>
      {showModal && (
        <MemberModal
          member={editMember}
          onClose={() => { setShowModal(false); setEditMember(null); }}
          onSave={() => { setShowModal(false); setEditMember(null); fetchMembers(); }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>Membres</h1>
          <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>{members.length} membre{members.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setEditMember(null); setShowModal(true); }} style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          + Ajouter
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Rechercher..."
          style={{ flex: 1, minWidth: 140, padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', background: '#fff', color: '#111827' }} />
        <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)}
          style={{ padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 12, background: '#fff', color: '#111827', cursor: 'pointer' }}>
          <option value="">Tous</option>
          <option value="confiant">Confiant</option>
          <option value="moins_confiant">Moins confiant</option>
          <option value="pas_confiant">Pas confiant</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, background: '#fff', borderRadius: 14, border: '1.5px solid #e8eaf6' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>👥</div>
          Aucun membre trouvé
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(m => (
            <MemberCard key={m.id} m={m}
              onEdit={m => { setEditMember(m); setShowModal(true); }}
              onDelete={handleDelete}
              onCopy={handleCopy}
              onRegen={handleRegen}
              onPin={handlePin}
              onDownload={handleDownload}
              onReset={handleResetDevice}
              onOtpDuration={handleOtpDuration}
            />
          ))}
        </div>
      )}

      {/* Modal OTP Duration */}
      {otpModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 480, boxShadow: '0 -4px 32px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#111827', margin: 0 }}>⏰ Durée OTP — {otpModal.name}</h2>
              <button onClick={() => setOtpModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
            </div>

            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
              Durée actuelle : <strong>{otpModal.currentHours ? otpModal.currentHours + 'h' : 'Global (paramètre général)'}</strong>
            </p>

            {/* Boutons preset */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {[1, 6, 12, 24, 48, 72, 168].map(h => (
                <button key={h} onClick={() => setOtpHours(String(h))}
                  style={{ padding: '6px 12px', borderRadius: 8,
                    border: '1.5px solid ' + (otpHours === String(h) ? '#6366f1' : '#e5e7eb'),
                    background: otpHours === String(h) ? '#eef2ff' : '#fff',
                    color: otpHours === String(h) ? '#4338ca' : '#374151',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {h < 24 ? h+'h' : h === 168 ? '7j' : (h/24)+'j'}
                </button>
              ))}
            </div>

            {/* Champ personnalisé */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
              <input type="number" value={otpHours} onChange={e => setOtpHours(e.target.value)}
                placeholder="Ex: 36" min={1}
                style={{ flex: 1, padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 15, textAlign: 'center', outline: 'none' }} />
              <span style={{ fontSize: 13, color: '#6b7280' }}>heures</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={handleOtpSave}
                style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                💾 Sauvegarder
              </button>
              <button onClick={() => { setOtpHours(''); handleOtpSave(); }}
                style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#f9fafb', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                🔄 Utiliser durée globale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal PIN */}
      {pinModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 480, boxShadow: '0 -4px 32px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#111827', margin: 0 }}>🔑 PIN — {pinModal.name}</h2>
              <button onClick={() => setPinModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
            </div>

            {pinModal.currentPin && (
              <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#166534', fontWeight: 600, marginBottom: 4 }}>PIN actuel</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 24, fontWeight: 900, letterSpacing: 8, color: '#15803d', fontFamily: 'monospace' }}>
                    {showPin ? pinModal.currentPin : '••••'}
                  </span>
                  <button onClick={() => setShowPin(s => !s)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>
                    {showPin ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                {pinModal.currentPin ? 'Nouveau PIN (laisser vide pour garder actuel)' : 'Définir un PIN'}
              </label>
              <input type="number" value={newPin} onChange={e => setNewPin(e.target.value)}
                placeholder="Ex: 1234" maxLength={10}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 20, outline: 'none', textAlign: 'center', letterSpacing: 8, fontFamily: 'monospace', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={handlePinSave}
                style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                💾 Sauvegarder le PIN
              </button>
              <button onClick={handlePinSendEmail}
                style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1.5px solid #6366f1', background: '#eef2ff', color: '#4338ca', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                📧 Envoyer le PIN par email
              </button>
              {pinModal.currentPin && (
                <button onClick={handlePinDelete}
                  style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1.5px solid #fca5a5', background: '#fff5f5', color: '#dc2626', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  🗑 Supprimer le PIN
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
