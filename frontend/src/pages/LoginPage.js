import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username) { toast.error('Saisissez votre nom d\'utilisateur'); return; }
    setLoading(true);
    try {
      await login(password, username);
      navigate('/');
    } catch {
      toast.error('Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 50%, #1a0533 0%, #0a0a1a 40%, #050510 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, position: 'relative', overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
    }}>
      {/* Effets lumineux */}
      <div style={{ position: 'absolute', top: '10%', left: '5%', width: 300, height: 300, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: 250, height: 250, borderRadius: '50%', background: 'rgba(139,92,246,0.08)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 500, borderRadius: '50%', background: 'rgba(79,70,229,0.05)', filter: 'blur(100px)', pointerEvents: 'none' }} />

      {/* Bouclier décoratif gauche */}
      <div style={{ position: 'absolute', left: -40, top: '50%', transform: 'translateY(-50%)', opacity: 0.15, fontSize: 200, pointerEvents: 'none', userSelect: 'none' }}>🛡️</div>

      {/* Carte principale */}
      <div style={{
        width: '100%', maxWidth: 440, position: 'relative', zIndex: 1,
        background: 'linear-gradient(145deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)',
        backdropFilter: 'blur(30px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 28, padding: '40px 32px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 22,
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 42, margin: '0 auto 16px',
            boxShadow: '0 12px 40px rgba(124,58,237,0.5)'
          }}>📡</div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 30, fontWeight: 900, color: '#fff' }}>Doc</span>
            <span style={{ fontSize: 30, fontWeight: 900, color: '#7c3aed' }}>Tracker</span>
            <span style={{ fontSize: 18, color: '#7c3aed' }}>✓</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '0 0 20px', letterSpacing: 1 }}>Secure Document Monitoring Platform</p>

          {/* Séparateur */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(124,58,237,0.3)', border: '1px solid rgba(124,58,237,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🔒</div>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>Bienvenue</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0 }}>Connectez-vous pour accéder à votre espace sécurisé</p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit}>
          {/* Champ username */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>
              Nom d'utilisateur
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'rgba(255,255,255,0.3)' }}>👤</div>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                required
                autoFocus
                style={{
                  width: '100%', padding: '14px 14px 14px 44px',
                  borderRadius: 12, fontSize: 14,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#fff', outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.6)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
              />
            </div>
          </div>

          {/* Champ password */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>
              Mot de passe
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'rgba(255,255,255,0.3)' }}>🔑</div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••"
                required
                style={{
                  width: '100%', padding: '14px 48px 14px 44px',
                  borderRadius: 12, fontSize: 14,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#fff', outline: 'none', boxSizing: 'border-box',
                  letterSpacing: showPassword ? 0 : 4,
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.6)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
              />
              <button type="button" onClick={() => setShowPassword(s => !s)} style={{
                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 16,
                color: 'rgba(255,255,255,0.4)', padding: 0
              }}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Se souvenir + mot de passe oublié */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <div onClick={() => setRemember(r => !r)} style={{
                width: 18, height: 18, borderRadius: 5,
                background: remember ? '#7c3aed' : 'rgba(255,255,255,0.08)',
                border: '1px solid ' + (remember ? '#7c3aed' : 'rgba(255,255,255,0.2)'),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, cursor: 'pointer', transition: 'all 0.2s'
              }}>
                {remember && <span style={{ color: '#fff' }}>✓</span>}
              </div>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Se souvenir de moi</span>
            </label>
            <span style={{ fontSize: 12, color: '#7c3aed', cursor: 'pointer', fontWeight: 600 }}>Mot de passe oublié ?</span>
          </div>

          {/* Bouton connexion */}
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '15px',
            borderRadius: 14, border: 'none',
            background: loading ? 'rgba(124,58,237,0.4)' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            color: '#fff', fontWeight: 800, fontSize: 15,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 8px 24px rgba(124,58,237,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'all 0.2s'
          }}>
            {loading ? '⏳ Connexion en cours...' : <>Accéder au dashboard <span style={{ fontSize: 18 }}>→</span></>}
          </button>

          {/* Accès restreint */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>🛡️ Accès restreint — Administrateurs uniquement</span>
          </div>
        </form>
      </div>

      {/* RGPD footer */}
      <div style={{
        position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 999, padding: '8px 20px',
        display: 'flex', alignItems: 'center', gap: 8
      }}>
        <span style={{ fontSize: 14 }}>🔐</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: 0.5 }}>Conforme RGPD</span>
      </div>
    </div>
  );
}
// build-1780225514
