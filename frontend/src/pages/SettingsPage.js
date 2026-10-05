import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';

function Section({ title, icon, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e8eaf6', overflow: 'hidden', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{title}</h2>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

function OtpDurationSection() {
  const [hours, setHours] = useState(24);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/settings/otp-duration').then(({ data }) => {
      setHours(data.hours || 24);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      await api.post('/settings/otp-duration', { hours: parseInt(hours) });
      toast.success('Durée OTP mise à jour : ' + hours + 'h');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { toast.error('Erreur'); }
  };

  const presets = [
    { label: '1h', value: 1 },
    { label: '6h', value: 6 },
    { label: '12h', value: 12 },
    { label: '24h', value: 24 },
    { label: '48h', value: 48 },
    { label: '72h', value: 72 },
    { label: '7 jours', value: 168 },
  ];

  if (loading) return <div style={{ color: '#9ca3af', fontSize: 12 }}>Chargement...</div>;

  return (
    <div>
      <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
        Durée de validité du code OTP envoyé par email. S'applique à tous les membres sauf ceux avec une durée personnalisée.
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {presets.map(p => (
          <button key={p.value} onClick={() => setHours(p.value)}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid ' + (hours === p.value ? '#6366f1' : '#e5e7eb'),
              background: hours === p.value ? '#eef2ff' : '#fff', color: hours === p.value ? '#4338ca' : '#374151',
              fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            {p.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <input type="number" value={hours} onChange={e => setHours(parseInt(e.target.value))}
          min={1} max={8760}
          style={{ width: 80, padding: '10px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, textAlign: 'center', outline: 'none' }} />
        <span style={{ fontSize: 13, color: '#6b7280' }}>heures</span>
      </div>
      <button onClick={handleSave}
        style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none',
          background: saved ? '#10b981' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
          color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
        {saved ? '✅ Sauvegardé !' : '💾 Sauvegarder'}
      </button>
    </div>
  );
}

function AdminEmailSection() {
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/settings/ai-prompt').then(() => {}).catch(() => {});
    api.get('/settings/admin-email').then(({ data }) => {
      setEmail(data.email || '');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      await api.post('/settings/admin-email', { email });
      toast.success('Email de notification sauvegardé');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { toast.error('Erreur'); }
  };

  if (loading) return <div style={{ color: '#9ca3af', fontSize: 12 }}>Chargement...</div>;

  return (
    <div>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)}
        placeholder="votre@email.com"
        style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', color: '#111827', boxSizing: 'border-box', marginBottom: 10 }} />
      <button onClick={handleSave}
        style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: saved ? '#10b981' : 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
        {saved ? '✅ Sauvegardé !' : '💾 Sauvegarder'}
      </button>
      <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 6 }}>
        Vous recevrez un email à chaque ouverture de document par un membre.
      </div>
    </div>
  );
}

function AIPromptSection() {
  const [prompt, setPrompt] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/settings/ai-prompt').then(({ data }) => {
      setPrompt(data.prompt || '');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      await api.post('/settings/ai-prompt', { prompt });
      toast.success('Prompt IA sauvegardé');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { toast.error('Erreur sauvegarde'); }
  };

  const handleReset = async () => {
    setPrompt('');
    await api.post('/settings/ai-prompt', { prompt: '' });
    toast.success('Prompt réinitialisé — utilise le prompt par défaut');
  };

  if (loading) return <div style={{ color: '#9ca3af', fontSize: 12 }}>Chargement...</div>;

  return (
    <div>
      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder="Ex: Tu es un expert juridique analysant des membres d'une association de locataires. Concentre-toi sur les comportements suspects comme le partage de liens ou les téléchargements non autorisés..."
        rows={6}
        style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 12, outline: 'none', color: '#111827', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box', background: prompt ? '#fff' : '#f9fafb' }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button onClick={handleSave}
          style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: saved ? '#10b981' : 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          {saved ? '✅ Sauvegardé !' : '💾 Sauvegarder le prompt'}
        </button>
        <button onClick={handleReset}
          style={{ padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer', color: '#6b7280' }}>
          🔄 Défaut
        </button>
      </div>
      <div style={{ marginTop: 8, fontSize: 10, color: '#9ca3af' }}>
        💡 Laissez vide pour utiliser le prompt par défaut (expert cybersécurité documentaire)
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminPassword, setAdminPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [membersRes, statsRes] = await Promise.all([
        api.get('/members'),
        api.get('/settings'),
      ]);
      setMembers(membersRes.data);
      setStats(statsRes.data);
    } catch (err) {
      toast.error('Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRevoke = async (id, name, current) => {
    if (!window.confirm((current ? 'Révoquer' : 'Rétablir') + ' ' + name + ' ?')) return;
    try {
      await api.post('/members/' + id + '/revoke', { revoke: current });
      toast.success(current ? 'Accès révoqué' : 'Accès rétabli');
      fetchData();
    } catch { toast.error('Erreur'); }
  };

  const handleResetOTP = async (id, name) => {
    if (!window.confirm('Réinitialiser l OTP de ' + name + ' ?')) return;
    try {
      await api.post('/members/' + id + '/reset-device');
      toast.success('OTP réinitialisé');
      fetchData();
    } catch { toast.error('Erreur'); }
  };

  const handleChangePassword = async () => {
    if (!adminPassword || !newPassword) { toast.error('Remplissez les deux champs'); return; }
    if (newPassword.length < 6) { toast.error('Min. 6 caractères'); return; }
    try {
      setSavingPwd(true);
      await api.post('/auth/change-password', { currentPassword: adminPassword, newPassword });
      toast.success('Mot de passe changé');
      setAdminPassword(''); setNewPassword('');
    } catch { toast.error('Mot de passe actuel incorrect'); }
    finally { setSavingPwd(false); }
  };

  const handleClearAllHistory = async () => {
    if (confirmDelete !== 'SUPPRIMER') { toast.error('Tapez SUPPRIMER pour confirmer'); return; }
    try {
      await api.delete('/settings/all-history');
      toast.success('Historique supprimé');
      setConfirmDelete('');
      fetchData();
    } catch { toast.error('Erreur'); }
  };

  const handleClearAllMembers = async () => {
    if (!window.confirm('Supprimer TOUS les membres ? Cette action est irréversible.')) return;
    try {
      await api.delete('/settings/all-members');
      toast.success('Membres supprimés');
      fetchData();
    } catch { toast.error('Erreur'); }
  };

  const handleRegenAll = async () => {
    if (!window.confirm('Régénérer les liens de TOUS les membres ?')) return;
    try {
      await api.post('/members/regenerate-all');
      toast.success('Liens régénérés');
      fetchData();
    } catch { toast.error('Erreur'); }
  };

  const handleClearAlerts = async () => {
    try {
      await api.delete('/settings/all-alerts');
      toast.success('Alertes supprimées');
    } catch { toast.error('Erreur'); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8f9fc' }}>
      <div style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 14 }}>Chargement...</div>
    </div>
  );

  const statItems = [
    { label: 'Membres', value: stats?.totalMembers || 0, icon: '👥' },
    { label: 'Événements', value: stats?.totalEvents || 0, icon: '📋' },
    { label: 'Téléchargements', value: stats?.totalDownloads || 0, icon: '⬇️', danger: stats?.totalDownloads > 0 },
    { label: 'Accès refusés', value: stats?.totalUnauthorized || 0, icon: '⛔', danger: stats?.totalUnauthorized > 0 },
  ];

  return (
    <div style={{ padding: 16, background: '#f8f9fc', minHeight: '100vh' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>Paramètres</h1>
        <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>Gérez les accès, données et configuration</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
        {statItems.map((s, i) => (
          <div key={i} style={{ background: s.danger ? '#fff5f5' : '#fff', border: '1.5px solid ' + (s.danger ? '#fca5a5' : '#e8eaf6'), borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ fontSize: 20 }}>{s.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.danger ? '#dc2626' : '#6366f1' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Accès membres */}
      <Section title="Accès membres" icon="🔐">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {members.map(m => (
            <div key={m.id} style={{ background: '#f9fafb', borderRadius: 10, padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{m.name}</div>
                <div style={{ fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  <span style={{ background: m.access_allowed === false ? '#fee2e2' : '#d1fae5', color: m.access_allowed === false ? '#dc2626' : '#065f46', borderRadius: 999, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>
                    {m.access_allowed === false ? 'Révoqué' : 'Actif'}
                  </span>
                  <span style={{ background: '#e0e7ff', color: '#3730a3', borderRadius: 999, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>v{m.version}</span>
                  <span style={{ background: '#f3f4f6', color: '#374151', borderRadius: 999, padding: '1px 8px', fontSize: 10 }}>{m.total_opens} ouv.</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button onClick={() => handleRevoke(m.id, m.name, m.access_allowed !== false)} style={{ padding: '5px 10px', borderRadius: 7, border: '1.5px solid #fca5a5', background: '#fff5f5', fontSize: 10, fontWeight: 700, cursor: 'pointer', color: '#dc2626' }}>
                  {m.access_allowed === false ? 'Rétablir' : 'Révoquer'}
                </button>
                <button onClick={() => handleResetOTP(m.id, m.name)} style={{ padding: '5px 10px', borderRadius: 7, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 10, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
                  Reset OTP
                </button>
              </div>
            </div>
          ))}
        </div>
        <button onClick={handleRegenAll} style={{ width: '100%', marginTop: 12, padding: '10px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', color: '#374151' }}>
          🔄 Régénérer tous les liens
        </button>
      </Section>

      {/* Téléchargement global */}
      <Section title="Téléchargement PDF — Global" icon="⬇️">
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>
          Autoriser ou bloquer le téléchargement pour <strong>tous les membres</strong> en une seule action.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button onClick={async () => {
            if (!window.confirm('Autoriser le téléchargement pour TOUS ?')) return;
            try { await api.post('/members/global/set-download', { allow: true }); toast.success('Téléchargement autorisé pour tous'); }
            catch { toast.error('Erreur'); }
          }} style={{ padding: '11px 8px', borderRadius: 10, border: '1.5px solid #fcd34d', background: '#fffbeb', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#d97706' }}>
            ✅ Autoriser tous
          </button>
          <button onClick={async () => {
            if (!window.confirm('Bloquer le téléchargement pour TOUS ?')) return;
            try { await api.post('/members/global/set-download', { allow: false }); toast.success('Téléchargement bloqué pour tous'); }
            catch { toast.error('Erreur'); }
          }} style={{ padding: '11px 8px', borderRadius: 10, border: '1.5px solid #fca5a5', background: '#fff5f5', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#dc2626' }}>
            🚫 Bloquer tous
          </button>
        </div>
      </Section>

      {/* PIN global */}
      <Section title="PIN — Envoi global" icon="🔑">
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
          Générer un PIN unique pour <strong>chaque membre actif</strong> et l'envoyer par email automatiquement.
        </p>
        <div style={{ background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 12, color: '#1e40af' }}>
          Chaque membre recevra un PIN different. Les anciens PINs seront remplaces.
        </div>
        <button onClick={async () => {
          if (!window.confirm('Envoyer un PIN a tous les membres actifs ?')) return;
          try {
            toast.loading('Envoi en cours...', { id: 'pins' });
            const { data } = await api.post('/members/global/send-pins');
            toast.success(data.sent + ' PINs envoyes sur ' + data.total + ' membres', { id: 'pins', duration: 6000 });
          } catch { toast.error('Erreur', { id: 'pins' }); }
        }} style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          Generer et envoyer les PINs par email
        </button>
      </Section>

      {/* Durée OTP globale */}
      <Section title="Durée de validité OTP" icon="⏰">
        <OtpDurationSection />
      </Section>

      {/* Email notifications */}
      <Section title="Email de notifications" icon="📧">
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
          Adresse email qui recevra les alertes quand un membre ouvre le document.
        </p>
        <AdminEmailSection />
      </Section>

      {/* Mot de passe admin */}
      <Section title="Mot de passe admin" icon="🔑">
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Mot de passe actuel</label>
          <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="••••••••"
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', color: '#111827', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Nouveau mot de passe</label>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 6 caractères"
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', color: '#111827', boxSizing: 'border-box' }} />
        </div>
        <button onClick={handleChangePassword} disabled={savingPwd} style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          {savingPwd ? 'Enregistrement...' : '💾 Changer le mot de passe'}
        </button>
      </Section>

      {/* Prompt IA */}
      <Section title="Prompt IA personnalisé" icon="🤖">
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
          Définissez le contexte de vos analyses IA. Ce prompt sera utilisé pour toutes les analyses comportementales.
        </p>
        <div style={{ background: '#f8f9fc', border: '1.5px solid #e8eaf6', borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 11, color: '#6b7280' }}>
          <strong>Exemple :</strong> "Tu es un expert juridique analysant des membres d'une association de locataires. Sois strict sur les partages de liens et les téléchargements non autorisés."
        </div>
        <AIPromptSection />
      </Section>

      {/* Suppression de données */}
      <Section title="Suppression de données" icon="🗑">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={handleClearAlerts} style={{ padding: '11px', borderRadius: 10, border: '1.5px solid #fcd34d', background: '#fffbeb', fontWeight: 600, fontSize: 13, cursor: 'pointer', color: '#92400e' }}>
            🔔 Supprimer toutes les alertes
          </button>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#dc2626', marginBottom: 5 }}>
              Supprimer tout l'historique des événements
            </label>
            <input value={confirmDelete} onChange={e => setConfirmDelete(e.target.value)} placeholder="Tapez SUPPRIMER pour confirmer"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #fca5a5', fontSize: 13, outline: 'none', marginBottom: 8, color: '#111827', boxSizing: 'border-box' }} />
            <button onClick={handleClearAllHistory} style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              🗑 Supprimer tout l'historique
            </button>
          </div>
          <button onClick={handleClearAllMembers} style={{ padding: '11px', borderRadius: 10, border: '1.5px solid #fca5a5', background: '#fff5f5', fontWeight: 600, fontSize: 13, cursor: 'pointer', color: '#dc2626' }}>
            👥 Supprimer tous les membres
          </button>
        </div>
      </Section>
    </div>
  );
}
