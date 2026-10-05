import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || '/api';
const STEPS = { loading: 0, pin: 1, otp: 2, viewer: 3, error: 99 };

export default function ViewerPage() {
  const { token } = useParams();
  const [step, setStep]       = useState(STEPS.loading);
  const [info, setInfo]       = useState(null);
  const [pin, setPin]         = useState('');
  const [otp, setOtp]         = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/track/${token}/info`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setInfo(data); setStep(STEPS.error); return; }
        setInfo(data);
        if (data.pin_required)      setStep(STEPS.pin);
        else if (data.otp_required) setStep(STEPS.otp);
        else                        setStep(STEPS.viewer);
      })
      .catch(() => setStep(STEPS.error));
  }, [token]);

  // Quand on arrive sur viewer, rediriger vers pdfviewer.html
  useEffect(() => {
    if (step !== STEPS.viewer) return;
    fetch(`${API}/track/${token}/event`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ event_type:'opened' })
    }).catch(()=>{});
    // Redirection vers la page HTML qui utilise PDF.js directement
    const title = encodeURIComponent(info?.doc_title || 'Document');
    window.location.href = `/pdfviewer.html?token=${token}&title=${title}`;
  }, [step, token, info]);

  const verifyPin = async () => {
    setLoading(true); setError('');
    try {
      const r = await fetch(`${API}/track/${token}/verify-pin`, {
        method:'POST', headers:{'Content-Type':'application/json'},
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
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ otp }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error); return; }
      setStep(STEPS.viewer);
    } finally { setLoading(false); }
  };

  return (
    <div style={s.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @media print{body{display:none!important}}`}</style>

      <div style={s.topBar}>
        <div style={s.logo}>🔒 DocTracker</div>
        {info?.org_name && <div style={s.org}>par <strong>{info.org_name}</strong></div>}
      </div>

      {step === STEPS.loading && (
        <div style={s.center}><div style={s.spinner}/><p style={{color:'#9ca3af',marginTop:12}}>Vérification...</p></div>
      )}

      {step === STEPS.error && (
        <div style={s.center}>
          <div style={{fontSize:56,marginBottom:16}}>❌</div>
          <h2 style={{color:'#f9fafb',margin:'0 0 8px',textAlign:'center'}}>{info?.error||'Lien invalide'}</h2>
          <p style={{color:'#9ca3af',textAlign:'center'}}>Ce lien est introuvable, révoqué ou expiré.</p>
        </div>
      )}

      {step === STEPS.viewer && (
        <div style={s.center}><div style={s.spinner}/><p style={{color:'#9ca3af',marginTop:12}}>Ouverture du document...</p></div>
      )}

      {(step === STEPS.pin || step === STEPS.otp) && (
        <div style={s.authBox}>
          <div style={{fontSize:56,marginBottom:16}}>🔐</div>
          <h2 style={s.authTitle}>{info?.doc_title}</h2>
          <p style={s.authOrg}>{info?.org_name}</p>
          {step === STEPS.pin && (
            <>
              <p style={s.authDesc}>Saisissez le code PIN reçu par email</p>
              <input style={s.codeInput} type="number" inputMode="numeric"
                placeholder="0000" value={pin}
                onChange={e=>setPin(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&verifyPin()} autoFocus />
            </>
          )}
          {step === STEPS.otp && (
            <>
              <p style={s.authDesc}>Saisissez le code OTP reçu par email</p>
              <input style={s.codeInput} type="number" inputMode="numeric"
                placeholder="000000" value={otp}
                onChange={e=>setOtp(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&verifyOTP()} autoFocus />
            </>
          )}
          {error && <div style={s.errorBox}>❌ {error}</div>}
          <button style={s.btn} onClick={step===STEPS.pin?verifyPin:verifyOTP} disabled={loading}>
            {loading?'Vérification...':'Accéder au document →'}
          </button>
        </div>
      )}
    </div>
  );
}

const s = {
  page:      { minHeight:'100dvh', background:'#0f0f1a', display:'flex', flexDirection:'column', fontFamily:'system-ui,-apple-system,sans-serif' },
  topBar:    { display:'flex', alignItems:'center', gap:8, padding:'12px 16px', background:'#1a1a2e', borderBottom:'1px solid #2d2d4e' },
  logo:      { color:'#fff', fontWeight:800, fontSize:15, flexShrink:0 },
  org:       { color:'#9ca3af', fontSize:12, flex:1, textAlign:'center' },
  center:    { flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24 },
  spinner:   { width:36, height:36, border:'3px solid #2d2d4e', borderTop:'3px solid #7c3aed', borderRadius:'50%', animation:'spin 0.8s linear infinite' },
  authBox:   { flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, maxWidth:400, margin:'0 auto', width:'100%' },
  authTitle: { fontSize:20, fontWeight:800, color:'#f9fafb', margin:'0 0 4px', textAlign:'center' },
  authOrg:   { color:'#6b7280', fontSize:13, margin:'0 0 20px' },
  authDesc:  { color:'#9ca3af', fontSize:14, marginBottom:14, textAlign:'center' },
  codeInput: { textAlign:'center', fontSize:28, fontWeight:800, letterSpacing:8, padding:'14px', border:'2px solid #7c3aed', borderRadius:12, width:'100%', maxWidth:240, fontFamily:'monospace', outline:'none', background:'#111827', color:'#f9fafb', marginBottom:14, boxSizing:'border-box' },
  errorBox:  { background:'rgba(220,38,38,0.15)', color:'#fca5a5', border:'1px solid rgba(220,38,38,0.3)', borderRadius:8, padding:'10px 16px', fontSize:13, marginBottom:12, width:'100%', maxWidth:300, textAlign:'center', boxSizing:'border-box' },
  btn:       { background:'#7c3aed', color:'#fff', border:'none', padding:'14px 32px', borderRadius:10, fontSize:15, fontWeight:700, cursor:'pointer', width:'100%', maxWidth:280 },
};
