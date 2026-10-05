import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || '/api';
const STEPS = { loading: 0, pin: 1, otp: 2, viewer: 3, error: 99 };

export default function ViewerPageV2() {
  const { token } = useParams();
  const [step, setStep]   = useState(STEPS.loading);
  const [info, setInfo]   = useState(null);
  const [pin, setPin]     = useState('');
  const [otp, setOtp]     = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const iframeRef = useRef(null);

  // Fingerprint basique
  const fingerprint = useRef(
    btoa([navigator.userAgent, screen.width, screen.height, navigator.language].join('|'))
      .replace(/[^a-zA-Z0-9]/g, '').slice(0, 32)
  );

  useEffect(() => {
    fetch(`${API}/track/${token}/info`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setInfo(data); setStep(STEPS.error); return; }
        setInfo(data);
        if (data.pin_required)       setStep(STEPS.pin);
        else if (data.otp_required)  setStep(STEPS.otp);
        else                         setStep(STEPS.viewer);
      })
      .catch(() => setStep(STEPS.error));
  }, [token]);

  // ── Sécurité anti-extract ──────────────────────────────────
  useEffect(() => {
    if (step !== STEPS.viewer) return;

    const trackSuspicious = (type, severity = 3) => {
      fetch(`${API}/track/${token}/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'suspicious_behavior',
          behavior_type: type,
          severity,
          fingerprint: fingerprint.current,
        })
      }).catch(() => {});
    };

    // Blocage clic droit
    const noContext = e => { e.preventDefault(); trackSuspicious('right_click', 2); };
    // Blocage copier
    const noCopy    = e => { e.preventDefault(); trackSuspicious('copy_attempt', 4); };
    // Blocage impression
    const noPrint   = () => { trackSuspicious('print_attempt', 5); };
    // Détection DevTools (basique)
    let devtoolsCheck = setInterval(() => {
      const threshold = 160;
      if (window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold) {
        trackSuspicious('devtools', 6);
      }
    }, 3000);
    // Détection screenshot (heuristique visibilité)
    const onVisibility = () => {
      if (document.hidden) trackSuspicious('tab_hidden', 1);
    };

    document.addEventListener('contextmenu', noContext);
    document.addEventListener('copy',        noCopy);
    window.addEventListener('beforeprint',   noPrint);
    document.addEventListener('visibilitychange', onVisibility);

    // Session ping toutes les 30s
    const pingInterval = setInterval(() => {
      fetch(`${API}/track/${token}/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: 'session_ping', fingerprint: fingerprint.current })
      }).catch(() => {});
    }, 30000);

    // CSS anti-sélection
    document.body.style.userSelect    = 'none';
    document.body.style.webkitUserSelect = 'none';

    return () => {
      document.removeEventListener('contextmenu', noContext);
      document.removeEventListener('copy',        noCopy);
      window.removeEventListener('beforeprint',   noPrint);
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(devtoolsCheck);
      clearInterval(pingInterval);
      document.body.style.userSelect = '';
    };
  }, [step, token]);

  const verifyPin = async () => {
    setLoading(true); setError('');
    try {
      const r = await fetch(`${API}/track/${token}/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error); return; }
      if (info.otp_required) setStep(STEPS.otp);
      else setStep(STEPS.viewer);
    } finally { setLoading(false); }
  };

  const verifyOTP = async () => {
    setLoading(true); setError('');
    try {
      const r = await fetch(`${API}/track/${token}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp, fingerprint: fingerprint.current }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error); return; }
      setStep(STEPS.viewer);
    } finally { setLoading(false); }
  };

  const pdfUrl = `${API}/track/${token}/pdf`;

  return (
    <div style={s.page}>
      {/* Anti-print overlay */}
      <style>{`
        @media print { body { display: none !important; } }
        * { -webkit-touch-callout: none; }
        iframe { pointer-events: auto; }
      `}</style>

      <div style={s.topBar}>
        <div style={s.logo}>🔒 DocTracker</div>
        {info?.org_name && <div style={s.orgName}>partagé par <strong>{info.org_name}</strong></div>}
        {step === STEPS.viewer && (
          <div style={s.securityBadge}>🛡️ Document sécurisé</div>
        )}
      </div>

      {step === STEPS.loading && (
        <div style={s.center}><div style={s.spinner} />Vérification...</div>
      )}

      {step === STEPS.error && (
        <div style={s.center}>
          <div style={{fontSize:56, marginBottom:16}}>❌</div>
          <h2 style={{color:'#1a1a2e', margin:'0 0 8px'}}>{info?.error || 'Lien invalide'}</h2>
          <p style={{color:'#9ca3af'}}>Ce lien est introuvable, révoqué ou expiré.</p>
        </div>
      )}

      {(step === STEPS.pin || step === STEPS.otp) && (
        <div style={s.authBox}>
          <div style={{fontSize:64, marginBottom:16}}>🔐</div>
          <h2 style={s.authTitle}>{info?.doc_title}</h2>
          <p style={s.authOrg}>{info?.org_name}</p>

          {step === STEPS.pin && (
            <>
              <p style={s.authDesc}>Saisissez le code PIN fourni par l'expéditeur</p>
              <input style={s.codeInput} type="password" placeholder="••••" maxLength={8}
                value={pin} onChange={e => setPin(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && verifyPin()} autoFocus />
            </>
          )}

          {step === STEPS.otp && (
            <>
              <p style={s.authDesc}>Saisissez le code à 6 chiffres reçu par email</p>
              <input style={s.codeInput} type="text" placeholder="••••••" maxLength={6}
                value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,''))}
                onKeyDown={e => e.key === 'Enter' && verifyOTP()} autoFocus />
            </>
          )}

          {error && <div style={s.errorBox}>❌ {error}</div>}
          <button style={s.btn} onClick={step === STEPS.pin ? verifyPin : verifyOTP} disabled={loading}>
            {loading ? 'Vérification...' : 'Accéder au document →'}
          </button>
        </div>
      )}

      {step === STEPS.viewer && (
        <div style={s.viewer}>
          <div style={s.viewerBar}>
            <div style={s.viewerTitle}>📄 {info?.doc_title}</div>
            <div style={s.viewerMeta}>
              {info?.page_count && <span>📑 {info.page_count} pages</span>}
              {!info?.download_allowed && <span style={s.noDownload}>⬇️ Téléchargement désactivé</span>}
            </div>
          </div>

          {/* Protection overlay - empêche interaction directe */}
          <div style={s.viewerWrap}>
            <div style={s.protectionOverlay} onContextMenu={e => e.preventDefault()} />
            <iframe
              ref={iframeRef}
              src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH&zoom=page-fit`}
              style={s.iframe}
              title={info?.doc_title}
              sandbox="allow-scripts allow-same-origin"
              onLoad={() => {
                // Track scroll dans le PDF
                fetch(`${API}/track/${token}/event`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ event_type: 'opened', fingerprint: fingerprint.current })
                }).catch(() => {});
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page:           { minHeight:'100vh', background:'#0f0f1a', display:'flex', flexDirection:'column', fontFamily:"'Inter', -apple-system, sans-serif", userSelect:'none' },
  topBar:         { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 24px', background:'#1a1a2e', borderBottom:'1px solid #2d2d4e' },
  logo:           { color:'#fff', fontWeight:800, fontSize:16 },
  orgName:        { color:'#9ca3af', fontSize:13 },
  securityBadge:  { background:'rgba(124,58,237,0.2)', color:'#a78bfa', padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600 },
  center:         { flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, color:'#6b7280' },
  spinner:        { width:36, height:36, border:'3px solid #2d2d4e', borderTop:'3px solid #7c3aed', borderRadius:'50%', animation:'spin 0.8s linear infinite' },
  authBox:        { flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, maxWidth:440, margin:'0 auto', width:'100%' },
  authTitle:      { fontSize:22, fontWeight:800, color:'#f9fafb', margin:'0 0 4px', textAlign:'center' },
  authOrg:        { color:'#6b7280', fontSize:14, margin:'0 0 28px' },
  authDesc:       { color:'#9ca3af', fontSize:14, marginBottom:16, textAlign:'center' },
  codeInput:      { textAlign:'center', fontSize:32, fontWeight:800, letterSpacing:10, padding:'16px 20px', border:'2px solid #7c3aed', borderRadius:12, width:220, fontFamily:'monospace', outline:'none', background:'#111827', color:'#f9fafb', marginBottom:12, boxSizing:'border-box' },
  errorBox:       { background:'rgba(220,38,38,0.1)', color:'#fca5a5', border:'1px solid rgba(220,38,38,0.3)', borderRadius:8, padding:'10px 16px', fontSize:13, marginBottom:12 },
  btn:            { background:'#7c3aed', color:'#fff', border:'none', padding:'14px 36px', borderRadius:10, fontSize:15, fontWeight:700, cursor:'pointer' },
  viewer:         { flex:1, display:'flex', flexDirection:'column' },
  viewerBar:      { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 20px', background:'#1a1a2e', borderBottom:'1px solid #2d2d4e' },
  viewerTitle:    { fontSize:14, fontWeight:600, color:'#f9fafb' },
  viewerMeta:     { display:'flex', gap:16, fontSize:12, color:'#6b7280' },
  noDownload:     { color:'#dc2626' },
  viewerWrap:     { flex:1, position:'relative' },
  protectionOverlay: { position:'absolute', top:0, left:0, right:0, bottom:0, zIndex:10, background:'transparent' },
  iframe:         { width:'100%', height:'100%', minHeight:'calc(100vh - 100px)', border:'none', display:'block', position:'relative', zIndex:1 },
};
