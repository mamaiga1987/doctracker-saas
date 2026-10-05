import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const RISK_LEVEL = (score) => {
  if (score >= 85) return { label:'Critique', color:'#dc2626', bg:'#fef2f2' };
  if (score >= 60) return { label:'Élevé',    color:'#d97706', bg:'#fffbeb' };
  if (score >= 35) return { label:'Modéré',   color:'#2563eb', bg:'#eff6ff' };
  return               { label:'Faible',   color:'#059669', bg:'#f0fdf4' };
};

const EVENT_ICONS = {
  opened:'📖', downloaded:'⬇️', otp_verified:'✅',
  pin_entered:'🔑', unauthorized_access:'🚨', page_view:'👁️', pixel_view:'📧', suspicious_behavior:'⚠️',
};

const EVENT_LABELS = {
  opened:'Ouvert', downloaded:'Téléchargé', otp_verified:'OTP vérifié',
  pin_entered:'PIN entré', unauthorized_access:'Accès refusé', page_view:'Page vue',
  pixel_view:'Email ouvert', suspicious_behavior:'Comportement suspect',
};

// ── HISTORIQUE ───────────────────────────────────────────────
export function HistoryPage() {
  const { authFetch } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    authFetch('/analytics/overview')
      .then(d => setEvents(d.recent_events || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [authFetch]);

  const filtered = filter === 'all' ? events : events.filter(e => e.event_type === filter);

  return (
    <div style={s.page}>
      <h1 style={s.title}>📋 Historique</h1>

      <select style={s.filterSelect} value={filter} onChange={e => setFilter(e.target.value)}>
        <option value="all">Tous les événements</option>
        <option value="opened">Ouvertures</option>
        <option value="downloaded">Téléchargements</option>
        <option value="unauthorized_access">Accès refusés</option>
        <option value="suspicious_behavior">Comportements suspects</option>
      </select>

      {loading ? <div style={s.empty}>Chargement...</div> :
       filtered.length === 0 ? <div style={s.empty}>Aucun événement</div> : (
        <div style={s.list}>
          {filtered.map(ev => {
            const icon  = EVENT_ICONS[ev.event_type] || '●';
            const label = EVENT_LABELS[ev.event_type] || ev.event_type;
            const isAlert = ev.event_type === 'unauthorized_access' || ev.event_type === 'suspicious_behavior';
            return (
              <div key={ev.id} style={{...s.card, borderLeft: `3px solid ${isAlert?'#dc2626':'#e5e7eb'}`}}>
                <span style={{fontSize:24, flexShrink:0}}>{icon}</span>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap'}}>
                    <span style={{...s.badge, background: isAlert?'#fef2f2':'#f3f4f6', color: isAlert?'#dc2626':'#374151'}}>
                      {label}
                    </span>
                    {ev.doc_title && <span style={s.docChip}>📄 {ev.doc_title}</span>}
                  </div>
                  <div style={s.emailText}>{ev.recipient_email}</div>
                  <div style={s.metaRow}>
                    {ev.country && <span>📍 {ev.city || ev.country}</span>}
                    {ev.ip_address && <span style={{fontFamily:'monospace', fontSize:10}}>{ev.ip_address}</span>}
                    <span>{new Date(ev.created_at).toLocaleString('fr-FR', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── APPAREILS ────────────────────────────────────────────────
export function DevicesPage() {
  const { authFetch } = useAuth();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    authFetch('/track/dashboard/devices').then(d=>setDevices(d.devices||[])).catch(console.error).finally(()=>setLoading(false));
  }, [authFetch]);
  const ICONS = { Mobile:'📱', Desktop:'💻', Tablet:'📟' };
  return (
    <div style={s.page}>
      <h1 style={s.title}>📱 Appareils détectés</h1>
      {loading ? <div style={s.empty}>Chargement...</div> : devices.length===0 ? <div style={s.empty}>Aucun appareil détecté</div> : (
        <div style={s.list}>
          {devices.map(d => (
            <div key={d.id} style={{...s.card, borderLeft:`3px solid ${d.is_blocked?'#dc2626':'#e5e7eb'}`}}>
              <span style={{fontSize:28, flexShrink:0}}>{ICONS[d.device_type]||'💻'}</span>
              <div style={{flex:1, minWidth:0}}>
                <div style={s.emailText}>{d.recipient_email}</div>
                <div style={s.metaRow}>
                  <span>{d.browser}</span><span>·</span><span>{d.os}</span><span>·</span><span>{d.device_type}</span>
                </div>
                <div style={s.metaRow}>
                  <span style={{fontFamily:'monospace',fontSize:10}}>{d.fingerprint?.slice(0,16)}...</span>
                  <span>Vu: {new Date(d.last_seen).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
              {d.is_blocked && <span style={{...s.badge,background:'#fef2f2',color:'#dc2626',flexShrink:0}}>Bloqué</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SESSION LIVE ─────────────────────────────────────────────
export function LiveSessionPage() {
  const { authFetch } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(() => {
    authFetch('/track/dashboard/live').then(d=>setSessions(d.sessions||[])).catch(console.error).finally(()=>setLoading(false));
  }, [authFetch]);
  useEffect(() => { refresh(); const t=setInterval(refresh,15000); return ()=>clearInterval(t); }, [refresh]);
  return (
    <div style={s.page}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,gap:12}}>
        <h1 style={{...s.title,margin:0}}>⚡ Sessions Live</h1>
        <div style={{display:'flex',alignItems:'center',gap:6,background:'#f0fdf4',color:'#166534',padding:'6px 12px',borderRadius:20,fontSize:13,fontWeight:700}}>
          <span style={{width:8,height:8,background:'#22c55e',borderRadius:'50%',display:'inline-block'}}/>
          {sessions.length} connecté{sessions.length>1?'s':''}
        </div>
      </div>
      {loading ? <div style={s.empty}>Chargement...</div> : sessions.length===0 ? <div style={s.empty}>Aucune session active</div> : (
        <div style={s.list}>
          {sessions.map(sess => (
            <div key={sess.id} style={{...s.card,borderLeft:'3px solid #22c55e'}}>
              <span style={{fontSize:28}}>👤</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={s.emailText}>{sess.recipient_email}</div>
                <div style={s.metaRow}><span>📄 {sess.doc_title}</span><span>Page {sess.current_page}</span></div>
                <div style={s.metaRow}><span>📍 {sess.ip_address}</span><span>Depuis {Math.round((Date.now()-new Date(sess.started_at))/60000)} min</span></div>
              </div>
              <span style={{color:'#22c55e',fontWeight:700,fontSize:12,flexShrink:0}}>● En ligne</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── COMPORTEMENTS SUSPECTS ───────────────────────────────────
export function SuspiciousPage() {
  const { authFetch } = useAuth();
  const [behaviors, setBehaviors] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    authFetch('/track/dashboard/suspicious').then(d=>setBehaviors(d.behaviors||[])).catch(console.error).finally(()=>setLoading(false));
  }, [authFetch]);
  const LABELS = {rapid_scroll:'Défilement rapide',screenshot_attempt:'Tentative capture',devtools:'DevTools ouvert',copy_attempt:'Tentative copie',print_attempt:'Tentative impression',right_click:'Clic droit',tab_hidden:'Onglet masqué'};
  const ICONS2 = {rapid_scroll:'⚡',screenshot_attempt:'📸',devtools:'🔧',copy_attempt:'📋',print_attempt:'🖨️',right_click:'🖱️',tab_hidden:'👁️'};
  return (
    <div style={s.page}>
      <h1 style={s.title}>🔍 Comportements suspects</h1>
      {loading ? <div style={s.empty}>Chargement...</div> : behaviors.length===0 ? <div style={s.empty}>✅ Aucun comportement suspect</div> : (
        <div style={s.list}>
          {behaviors.map(b => {
            const sev=Math.min(b.severity,10);
            const color=sev>=7?'#dc2626':sev>=4?'#d97706':'#2563eb';
            return (
              <div key={b.id} style={{...s.card,borderLeft:`3px solid ${color}`}}>
                <span style={{fontSize:24,flexShrink:0}}>{ICONS2[b.behavior_type]||'⚠️'}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:700,color:'#1a1a2e',marginBottom:4}}>{LABELS[b.behavior_type]||b.behavior_type}</div>
                  <div style={s.metaRow}><span>{b.recipient_email}</span></div>
                  <div style={s.metaRow}><span>📄 {b.doc_title}</span><span>{new Date(b.detected_at).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</span></div>
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:20,fontWeight:900,color}}>{sev}</div>
                  <div style={{fontSize:10,color:'#9ca3af'}}>/10</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── SCORE DE RISQUE ──────────────────────────────────────────
export function RiskScorePage() {
  const { authFetch } = useAuth();
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    authFetch('/track/dashboard/risks').then(d=>setRisks(d.risks||[])).catch(console.error).finally(()=>setLoading(false));
  }, [authFetch]);
  return (
    <div style={s.page}>
      <h1 style={s.title}>🎯 Scores de risque</h1>
      <p style={s.sub}>0 = sûr · 100 = critique</p>
      {loading ? <div style={s.empty}>Chargement...</div> : risks.length===0 ? <div style={s.empty}>Aucun score calculé</div> : (
        <div style={s.list}>
          {risks.map(r => {
            const lv=RISK_LEVEL(r.score);
            return (
              <div key={r.share_id} style={{...s.card,background:lv.bg,borderLeft:`3px solid ${lv.color}`}}>
                <div style={{width:52,height:52,borderRadius:'50%',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 2px 8px rgba(0,0,0,.1)'}}>
                  <span style={{fontSize:20,fontWeight:900,color:lv.color}}>{r.score}</span>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={s.emailText}>{r.recipient_email}</div>
                  <div style={s.metaRow}><span>📄 {r.doc_title}</span></div>
                  <div style={{marginTop:6,height:5,background:'rgba(0,0,0,.1)',borderRadius:3}}>
                    <div style={{height:'100%',width:`${r.score}%`,background:lv.color,borderRadius:3}}/>
                  </div>
                  {r.factors && Object.keys(r.factors).length>0 && (
                    <div style={{marginTop:6,display:'flex',gap:4,flexWrap:'wrap'}}>
                      {Object.entries(r.factors).map(([k,v])=>(
                        <span key={k} style={{background:'rgba(0,0,0,.08)',padding:'2px 7px',borderRadius:10,fontSize:10,color:'#374151'}}>
                          {k.replace(/_/g,' ')}: +{v.points}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span style={{...s.badge,background:lv.color,color:'#fff',flexShrink:0}}>{lv.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── CARTE ────────────────────────────────────────────────────
export function MapPage() {
  const { authFetch } = useAuth();
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    authFetch('/track/dashboard/geo').then(d=>setPoints(d.points||[])).catch(console.error).finally(()=>setLoading(false));
  }, [authFetch]);

  useEffect(() => {
    if (loading||!points.length||mapInstance.current) return;
    const link=document.createElement('link'); link.rel='stylesheet'; link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(link);
    const script=document.createElement('script'); script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload=()=>{
      if (!mapRef.current||mapInstance.current) return;
      const L=window.L, map=L.map(mapRef.current,{center:[20,0],zoom:2}); mapInstance.current=map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);
      points.forEach(p=>{
        if (!p.latitude||!p.longitude) return;
        L.circleMarker([parseFloat(p.latitude),parseFloat(p.longitude)],{radius:Math.min(6+parseInt(p.count)*2,20),color:'#7c3aed',fillColor:'#7c3aed',fillOpacity:0.6,weight:2})
          .bindPopup(`<b>${p.city||''} ${p.country}</b><br>${p.count} ouverture(s)`).addTo(map);
      });
    };
    document.head.appendChild(script);
  }, [loading, points]);

  return (
    <div style={s.page}>
      <h1 style={s.title}>🗺️ Carte des connexions</h1>
      <p style={s.sub}>{points.length} zones (30 derniers jours)</p>
      {loading ? <div style={s.empty}>Chargement...</div> : (
        <>
          <div ref={mapRef} style={{height:300,borderRadius:12,overflow:'hidden',border:'1px solid #e5e7eb',marginBottom:14}}/>
          <div style={s.list}>
            {points.slice(0,10).map((p,i)=>(
              <div key={i} style={{...s.card,padding:'10px 14px'}}>
                <span style={{fontSize:20}}>📍</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700,color:'#1a1a2e'}}>{p.city||p.country}</div>
                  <div style={s.metaRow}><span>{p.country}</span><span>{p.count} connexion(s)</span></div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── ENVOYER LIENS ────────────────────────────────────────────
export function SendLinksPage() {
  const { authFetch } = useAuth();
  const [docs, setDocs]     = useState([]);
  const [members, setMembers] = useState([]);
  const [form, setForm]     = useState({ document_id:'', group_name:'', pdf_version:'A', subject:'', message:'', send_to:'group' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    authFetch('/documents').then(d=>setDocs(d.documents||[])).catch(console.error);
    authFetch('/members').then(d=>setMembers(d.members||[])).catch(console.error);
  }, [authFetch]);

  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));
  const GROUPS = ['Confiant','Moins confiant','Pas confiant'];

  const handleSend = async () => {
    if (!form.document_id) return alert('Sélectionnez un document');
    setLoading(true);
    try {
      const body = { document_id:form.document_id, pdf_version:form.pdf_version, subject:form.subject, message:form.message, ...(form.send_to==='group'?{group_name:form.group_name}:{}) };
      const data = await authFetch('/campaigns',{method:'POST',body:JSON.stringify(body)});
      setResult(data);
    } catch(err) { alert(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={s.page}>
      <h1 style={s.title}>📧 Envoyer des liens</h1>
      <div style={s.formCard}>
        {result ? (
          <div style={{textAlign:'center',padding:'24px 0'}}>
            <div style={{fontSize:48,marginBottom:12}}>✅</div>
            <h3 style={{margin:'0 0 8px',color:'#1a1a2e'}}>Envoi en cours !</h3>
            <p style={{color:'#6b7280',margin:'0 0 16px'}}>{result.recipient_count} destinataire(s)</p>
            <button style={s.btnFull} onClick={() => setResult(null)}>Nouvelle campagne</button>
          </div>
        ) : (
          <>
            <Field label="Document *">
              <select style={s.input} value={form.document_id} onChange={set('document_id')}>
                <option value="">-- Choisir --</option>
                {docs.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
            </Field>
            <Field label="Version PDF">
              <div style={{display:'flex',gap:8}}>
                {['A','B','C'].map(v=>(
                  <button key={v} onClick={()=>setForm(f=>({...f,pdf_version:v}))}
                    style={{flex:1,padding:'10px',border:`2px solid ${form.pdf_version===v?'#7c3aed':'#e5e7eb'}`,borderRadius:8,background:form.pdf_version===v?'#7c3aed':'transparent',color:form.pdf_version===v?'#fff':'#374151',fontWeight:700,cursor:'pointer',fontSize:14}}>
                    V{v}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Destinataires">
              <div style={{display:'flex',gap:8,marginBottom:8}}>
                {['group','all'].map(t=>(
                  <button key={t} onClick={()=>setForm(f=>({...f,send_to:t}))}
                    style={{flex:1,padding:'9px',border:`2px solid ${form.send_to===t?'#7c3aed':'#e5e7eb'}`,borderRadius:8,background:form.send_to===t?'#7c3aed':'transparent',color:form.send_to===t?'#fff':'#374151',fontWeight:600,cursor:'pointer',fontSize:13}}>
                    {t==='group'?'Par groupe':'Tous'}
                  </button>
                ))}
              </div>
              {form.send_to==='group'&&(
                <select style={s.input} value={form.group_name} onChange={set('group_name')}>
                  <option value="">-- Tous les groupes --</option>
                  {GROUPS.map(g=><option key={g} value={g}>{g} ({members.filter(m=>m.group_name===g).length})</option>)}
                </select>
              )}
            </Field>
            <Field label="Objet email">
              <input style={s.input} placeholder="Document confidentiel — votre accès" value={form.subject} onChange={set('subject')}/>
            </Field>
            <Field label="Message personnalisé">
              <textarea style={{...s.input,height:90,resize:'vertical'}} placeholder="Bonjour,&#10;Veuillez trouver votre lien d'accès..." value={form.message} onChange={set('message')}/>
            </Field>
            <div style={{background:'#f3f0ff',borderRadius:8,padding:'10px 12px',fontSize:12,color:'#7c3aed',marginBottom:14}}>
              💡 Chaque destinataire reçoit un lien unique + OTP par email
            </div>
            <button style={s.btnFull} onClick={handleSend} disabled={loading}>
              {loading?'Envoi en cours...':'Envoyer les liens →'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{marginBottom:14}}>
      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>{label}</label>
      {children}
    </div>
  );
}

const s = {
  page:        { padding:16, maxWidth:900, margin:'0 auto' },
  title:       { fontSize:22, fontWeight:800, color:'#1a1a2e', margin:'0 0 8px' },
  sub:         { color:'#9ca3af', fontSize:13, margin:'0 0 14px' },
  empty:       { textAlign:'center', color:'#9ca3af', padding:'48px 0', fontSize:14 },
  filterSelect:{ width:'100%', padding:'10px 14px', border:'1.5px solid #e5e7eb', borderRadius:8, fontSize:15, color:'#374151', outline:'none', marginBottom:14, background:'#fff' },
  list:        { display:'flex', flexDirection:'column', gap:10 },
  card:        { background:'#fff', borderRadius:12, padding:'12px 14px', display:'flex', alignItems:'flex-start', gap:12, border:'1px solid #f3f4f6', boxShadow:'0 1px 3px rgba(0,0,0,.04)' },
  badge:       { background:'#f3f4f6', color:'#374151', padding:'3px 8px', borderRadius:8, fontSize:11, fontWeight:700, whiteSpace:'nowrap' },
  docChip:     { background:'#f0f9ff', color:'#0369a1', padding:'3px 8px', borderRadius:8, fontSize:11, fontWeight:600 },
  emailText:   { fontSize:13, fontWeight:700, color:'#1a1a2e', marginBottom:4, wordBreak:'break-word' },
  metaRow:     { display:'flex', gap:8, flexWrap:'wrap', fontSize:11, color:'#6b7280', marginBottom:2 },
  formCard:    { background:'#fff', borderRadius:14, padding:18, border:'1px solid #f3f4f6' },
  input:       { width:'100%', padding:'11px 14px', border:'1.5px solid #e5e7eb', borderRadius:8, fontSize:16, color:'#1a1a2e', outline:'none', boxSizing:'border-box', fontFamily:'inherit' },
  btnFull:     { width:'100%', padding:14, background:'#7c3aed', color:'#fff', border:'none', borderRadius:10, fontSize:15, fontWeight:700, cursor:'pointer' },
};
