import { useNavigate } from 'react-router-dom';

const plans = [
  {
    name: 'Free', price: '0', period: '/mois', color: '#6b7280',
    features: ['3 documents / mois', '1 utilisateur', 'OTP + PIN', 'Filigrane', 'Tracking basique'],
    cta: 'Commencer gratuitement', highlight: false,
  },
  {
    name: 'Pro', price: '29', period: '/mois', color: '#7c3aed',
    features: ['50 documents / mois', '5 utilisateurs', 'OTP + PIN', 'Filigrane personnalisé', 'Tracking temps réel', 'Alertes email', 'Géolocalisation'],
    cta: 'Démarrer le Pro', highlight: true,
  },
  {
    name: 'Business', price: '99', period: '/mois', color: '#059669',
    features: ['Documents illimités', 'Utilisateurs illimités', 'Tout Pro +', 'Branding custom', 'Accès API', 'Support prioritaire', 'Sous-domaine dédié'],
    cta: 'Contacter les ventes', highlight: false,
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      {/* ── HEADER ── */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🔒</span>
          <span style={styles.logoText}>DocTracker</span>
        </div>
        <nav style={styles.nav}>
          <a href="#features" style={styles.navLink}>Fonctionnalités</a>
          <a href="#pricing" style={styles.navLink}>Tarifs</a>
          <button onClick={() => navigate('/login')}  style={styles.btnOutline}>Connexion</button>
          <button onClick={() => navigate('/register')} style={styles.btnPrimary}>Essai gratuit</button>
        </nav>
      </header>

      {/* ── HERO ── */}
      <section style={styles.hero}>
        <div style={styles.heroBadge}>✨ Nouveau — Plateforme SaaS multi-équipes</div>
        <h1 style={styles.heroTitle}>
          Partagez vos PDFs<br />
          <span style={styles.heroAccent}>en toute sécurité</span>
        </h1>
        <p style={styles.heroSub}>
          OTP · PIN · Filigrane · Tracking temps réel · Alertes instantanées.<br />
          Sachez exactement qui ouvre vos documents, quand et depuis où.
        </p>
        <div style={styles.heroCtas}>
          <button onClick={() => navigate('/register')} style={styles.btnHero}>
            Créer mon espace gratuit →
          </button>
          <button onClick={() => navigate('/login')} style={styles.btnHeroSecondary}>
            Se connecter
          </button>
        </div>
        <div style={styles.heroStats}>
          <Stat value="100%" label="Sécurisé" />
          <Stat value="< 30s" label="Envoi d'un doc" />
          <Stat value="Temps réel" label="Tracking" />
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={styles.section}>
        <h2 style={styles.sectionTitle}>Tout ce dont vous avez besoin</h2>
        <p style={styles.sectionSub}>Protégez et tracez vos documents confidentiels sans effort</p>
        <div style={styles.featuresGrid}>
          <Feature icon="🔑" title="Double sécurité" desc="Chaque destinataire reçoit un OTP par email + doit saisir un PIN. Accès révocable à tout moment." />
          <Feature icon="💧" title="Filigrane dynamique" desc="Chaque page est marquée avec le nom et l'email du destinataire. Impossible de nier avoir partagé." />
          <Feature icon="📍" title="Géolocalisation" desc="Voyez depuis quel pays et ville chaque document est ouvert, en temps réel sur votre dashboard." />
          <Feature icon="🔔" title="Alertes instantanées" desc="Notification immédiate en cas d'accès suspect, mauvais PIN, ou ouverture depuis un pays inattendu." />
          <Feature icon="⚡" title="Temps réel" desc="Le dashboard se met à jour en live. Socket.io pour ne rien manquer." />
          <Feature icon="👥" title="Multi-utilisateurs" desc="Invitez votre équipe, attribuez des rôles Owner / Admin / Member. Chacun voit ses documents." />
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={styles.sectionDark}>
        <h2 style={{ ...styles.sectionTitle, color: '#f9fafb' }}>Tarifs simples et transparents</h2>
        <p style={{ ...styles.sectionSub, color: '#9ca3af' }}>Commencez gratuitement, évoluez selon vos besoins</p>
        <div style={styles.pricingGrid}>
          {plans.map(p => (
            <div key={p.name} style={{ ...styles.planCard, ...(p.highlight ? styles.planCardHighlight : {}) }}>
              {p.highlight && <div style={styles.planBadge}>⭐ Populaire</div>}
              <div style={{ ...styles.planName, color: p.color }}>{p.name}</div>
              <div style={styles.planPrice}>
                <span style={styles.planPriceNum}>{p.price}€</span>
                <span style={styles.planPricePeriod}>{p.period}</span>
              </div>
              <ul style={styles.planFeatures}>
                {p.features.map(f => (
                  <li key={f} style={styles.planFeature}><span style={{ color: p.color }}>✓</span> {f}</li>
                ))}
              </ul>
              <button
                onClick={() => navigate(p.name === 'Business' ? '/contact' : '/register')}
                style={{ ...styles.planCta, background: p.highlight ? p.color : 'transparent', borderColor: p.color, color: p.highlight ? '#fff' : p.color }}
              >
                {p.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={styles.footer}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🔒</span>
          <span style={{ ...styles.logoText, color: '#6b7280' }}>DocTracker</span>
        </div>
        <p style={{ color: '#9ca3af', fontSize: 13, margin: '8px 0 0' }}>
          © {new Date().getFullYear()} DocTracker · Partage sécurisé de documents
        </p>
      </footer>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div style={styles.stat}>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <div style={styles.featureCard}>
      <div style={styles.featureIcon}>{icon}</div>
      <h3 style={styles.featureTitle}>{title}</h3>
      <p style={styles.featureDesc}>{desc}</p>
    </div>
  );
}

const styles = {
  page:         { fontFamily: "'Inter', -apple-system, sans-serif", background: '#fff', minHeight: '100vh' },
  header:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 64px', height: 72, borderBottom: '1px solid #f3f4f6', position: 'sticky', top: 0, background: '#fff', zIndex: 100 },
  logo:         { display: 'flex', alignItems: 'center', gap: 8 },
  logoIcon:     { fontSize: 24 },
  logoText:     { fontSize: 20, fontWeight: 800, color: '#1a1a2e', letterSpacing: '-0.5px' },
  nav:          { display: 'flex', alignItems: 'center', gap: 24 },
  navLink:      { color: '#6b7280', textDecoration: 'none', fontSize: 14, fontWeight: 500 },
  btnOutline:   { border: '1.5px solid #e5e7eb', background: 'transparent', color: '#374151', padding: '8px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnPrimary:   { background: '#7c3aed', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },

  hero:         { textAlign: 'center', padding: '80px 32px 72px', background: 'linear-gradient(180deg,#faf8ff 0%,#fff 100%)' },
  heroBadge:    { display: 'inline-block', background: '#f3f0ff', color: '#7c3aed', padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, marginBottom: 24 },
  heroTitle:    { fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 900, color: '#1a1a2e', lineHeight: 1.1, margin: '0 0 20px', letterSpacing: '-1.5px' },
  heroAccent:   { background: 'linear-gradient(135deg,#7c3aed,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  heroSub:      { fontSize: 18, color: '#6b7280', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 36px' },
  heroCtas:     { display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 },
  btnHero:      { background: '#7c3aed', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: 'pointer' },
  btnHeroSecondary: { background: 'transparent', color: '#7c3aed', border: '2px solid #7c3aed', padding: '14px 32px', borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: 'pointer' },

  heroStats:    { display: 'flex', gap: 48, justifyContent: 'center', flexWrap: 'wrap' },
  stat:         { textAlign: 'center' },
  statValue:    { fontSize: 28, fontWeight: 900, color: '#7c3aed' },
  statLabel:    { fontSize: 13, color: '#9ca3af', marginTop: 4 },

  section:      { padding: '80px 64px', background: '#fff' },
  sectionDark:  { padding: '80px 64px', background: '#1a1a2e' },
  sectionTitle: { textAlign: 'center', fontSize: 36, fontWeight: 800, color: '#1a1a2e', margin: '0 0 12px', letterSpacing: '-0.5px' },
  sectionSub:   { textAlign: 'center', color: '#6b7280', fontSize: 16, marginBottom: 56 },

  featuresGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, maxWidth: 1100, margin: '0 auto' },
  featureCard:  { padding: 28, borderRadius: 12, border: '1px solid #f3f4f6', background: '#fafafa' },
  featureIcon:  { fontSize: 32, marginBottom: 14 },
  featureTitle: { fontSize: 18, fontWeight: 700, color: '#1a1a2e', margin: '0 0 8px' },
  featureDesc:  { color: '#6b7280', fontSize: 14, lineHeight: 1.7, margin: 0 },

  pricingGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, maxWidth: 960, margin: '0 auto' },
  planCard:     { background: '#111827', border: '1px solid #374151', borderRadius: 16, padding: 32, position: 'relative' },
  planCardHighlight: { border: '2px solid #7c3aed', boxShadow: '0 0 40px rgba(124,58,237,0.2)' },
  planBadge:    { position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#7c3aed', color: '#fff', padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' },
  planName:     { fontSize: 20, fontWeight: 800, marginBottom: 8 },
  planPrice:    { display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 },
  planPriceNum: { fontSize: 42, fontWeight: 900, color: '#f9fafb' },
  planPricePeriod: { color: '#9ca3af', fontSize: 14 },
  planFeatures: { listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10 },
  planFeature:  { color: '#d1d5db', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 },
  planCta:      { width: '100%', padding: '12px 0', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', border: '2px solid', transition: 'opacity 0.2s' },

  footer:       { padding: '40px 64px', borderTop: '1px solid #f3f4f6', textAlign: 'center' },
};
