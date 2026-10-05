import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ── Styles partagés ──────────────────────────────────────────
const s = {
  page:    { minHeight: '100vh', background: 'linear-gradient(135deg,#1a1a2e 0%,#16213e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card:    { background: '#fff', borderRadius: 20, padding: '48px 40px', width: '100%', maxWidth: 440, boxShadow: '0 24px 64px rgba(0,0,0,0.25)' },
  logo:    { textAlign: 'center', fontSize: 28, fontWeight: 900, color: '#1a1a2e', marginBottom: 8, letterSpacing: '-0.5px' },
  sub:     { textAlign: 'center', color: '#9ca3af', fontSize: 14, marginBottom: 36 },
  label:   { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input:   { width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, color: '#1a1a2e', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  row:     { marginBottom: 18 },
  grid2:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  btn:     { width: '100%', padding: '13px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 8 },
  error:   { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 },
  link:    { textAlign: 'center', marginTop: 20, color: '#9ca3af', fontSize: 13 },
  linkA:   { color: '#7c3aed', textDecoration: 'none', fontWeight: 600 },
};

// ── REGISTER ────────────────────────────────────────────────
export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ orgName: '', email: '', password: '', firstName: '', lastName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.orgName || !form.email || !form.password) {
      return setError('Tous les champs obligatoires sont requis');
    }
    setLoading(true);
    setError('');
    try {
      await register(form.orgName, form.email, form.password, form.firstName, form.lastName);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>🔒 DocTracker</div>
        <div style={s.sub}>Créez votre espace en 30 secondes</div>
        {error && <div style={s.error}>{error}</div>}

        <div style={s.row}>
          <label style={s.label}>Nom de votre organisation *</label>
          <input style={s.input} placeholder="Ex: Acme Corp" value={form.orgName} onChange={set('orgName')} />
        </div>
        <div style={{ ...s.row, ...s.grid2 }}>
          <div>
            <label style={s.label}>Prénom</label>
            <input style={s.input} placeholder="Jean" value={form.firstName} onChange={set('firstName')} />
          </div>
          <div>
            <label style={s.label}>Nom</label>
            <input style={s.input} placeholder="Dupont" value={form.lastName} onChange={set('lastName')} />
          </div>
        </div>
        <div style={s.row}>
          <label style={s.label}>Email *</label>
          <input style={s.input} type="email" placeholder="jean@acme.com" value={form.email} onChange={set('email')} />
        </div>
        <div style={s.row}>
          <label style={s.label}>Mot de passe * <span style={{ color: '#9ca3af', fontWeight: 400 }}>(8 caractères min)</span></label>
          <input style={s.input} type="password" placeholder="••••••••" value={form.password} onChange={set('password')} />
        </div>

        <button style={s.btn} onClick={handleSubmit} disabled={loading}>
          {loading ? 'Création...' : 'Créer mon espace gratuit →'}
        </button>
        <div style={s.link}>
          Déjà un compte ? <Link to="/login" style={s.linkA}>Se connecter</Link>
        </div>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: '#d1d5db' }}>
          Plan Free · 3 docs/mois · Sans carte bancaire
        </div>
      </div>
    </div>
  );
}

// ── LOGIN ────────────────────────────────────────────────────
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>🔒 DocTracker</div>
        <div style={s.sub}>Accédez à votre espace</div>
        {error && <div style={s.error}>{error}</div>}

        <div style={s.row}>
          <label style={s.label}>Email</label>
          <input style={s.input} type="email" placeholder="jean@acme.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        </div>
        <div style={s.row}>
          <label style={s.label}>Mot de passe</label>
          <input style={s.input} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        </div>

        <button style={s.btn} onClick={handleSubmit} disabled={loading}>
          {loading ? 'Connexion...' : 'Se connecter →'}
        </button>
        <div style={s.link}>
          Pas encore de compte ? <Link to="/register" style={s.linkA}>Créer un espace gratuit</Link>
        </div>
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Link to="/" style={{ color: '#9ca3af', fontSize: 12, textDecoration: 'none' }}>← Retour à l'accueil</Link>
        </div>
      </div>
    </div>
  );
}
