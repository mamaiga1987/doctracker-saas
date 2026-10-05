import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export function AlertsPage() {
  const { authFetch } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    authFetch('/analytics/alerts').then(d => setAlerts(d.alerts||[])).catch(console.error).finally(() => setLoading(false));
  }, [authFetch]);
  const markRead = async (id) => {
    try { await authFetch(`/analytics/alerts/${id}/read`,{method:'PATCH'}); setAlerts(a=>a.map(x=>x.id===id?{...x,is_read:true}:x)); } catch(e){}
  };
  const SEV = { critical:{color:'#dc2626',bg:'#fef2f2',icon:'🚨'}, warning:{color:'#d97706',bg:'#fffbeb',icon:'⚠️'}, info:{color:'#2563eb',bg:'#eff6ff',icon:'ℹ️'} };
  return (
    <div style={p.page}>
      <h1 style={p.title}>🔔 Alertes</h1>
      {loading ? <div style={p.empty}>Chargement...</div> : alerts.length===0 ? <div style={p.empty}>✅ Aucune alerte</div> : (
        <div style={p.list}>
          {alerts.map(a => { const sv=SEV[a.severity]||SEV.info; return (
            <div key={a.id} style={{...p.card, borderLeft:`4px solid ${sv.color}`, opacity:a.is_read?0.6:1}}>
              <div style={{fontSize:28,flexShrink:0}}>{sv.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={p.cardTitle}>{a.message}</div>
                <div style={p.cardMeta}>
                  {a.doc_title&&<span>📄 {a.doc_title}</span>}
                  {a.recipient_email&&<span>👤 {a.recipient_email}</span>}
                  <span>{new Date(a.created_at).toLocaleString('fr-FR')}</span>
                </div>
              </div>
              {!a.is_read&&<button style={p.smallBtn} onClick={()=>markRead(a.id)}>Lu ✓</button>}
            </div>
          );})}
        </div>
      )}
    </div>
  );
}

export function EventsPage() {
  const { authFetch } = useAuth();
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    authFetch('/analytics/overview').then(d=>setRecent(d.recent_events||[])).catch(console.error).finally(()=>setLoading(false));
  }, [authFetch]);
  const ICONS = {opened:'📖',downloaded:'⬇️',otp_verified:'✅',pin_entered:'🔑',unauthorized_access:'🚨',page_view:'👁️'};
  return (
    <div style={p.page}>
      <h1 style={p.title}>📍 Événements</h1>
      {loading ? <div style={p.empty}>Chargement...</div> : recent.length===0 ? <div style={p.empty}>Aucun événement</div> : (
        <div style={p.list}>
          {recent.map(ev => (
            <div key={ev.id} style={p.card}>
              <span style={{fontSize:22,flexShrink:0}}>{ICONS[ev.event_type]||'●'}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={p.cardTitle}>{ev.recipient_email}</div>
                <div style={p.cardMeta}>
                  <span style={{fontWeight:700}}>{ev.event_type}</span>
                  {ev.doc_title&&<span>· {ev.doc_title}</span>}
                </div>
                <div style={p.cardMeta}>
                  {ev.country&&<span>📍 {ev.city||ev.country}</span>}
                  <span>{new Date(ev.created_at).toLocaleString('fr-FR')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function copyToClipboard(text) {
  // Méthode compatible mobile
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  try { document.execCommand('copy'); alert('✅ Lien copié !'); } catch(e) { alert('Lien: ' + text); }
  document.body.removeChild(ta);
}

export function SharesPage() {
  const { authFetch } = useAuth();
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    authFetch('/shares').then(d=>setShares(d.shares||[])).catch(console.error).finally(()=>setLoading(false));
  }, [authFetch]);

  const revoke = async (id) => {
    if (!window.confirm('Révoquer ce lien ?')) return;
    try { await authFetch(`/shares/${id}`,{method:'DELETE'}); setShares(s=>s.filter(x=>x.id!==id)); } catch(e){alert(e.message);}
  };

  const handleCopy = (id, url) => {
    copyToClipboard(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div style={p.page}>
      <h1 style={p.title}>🔗 Liens partagés</h1>
      <p style={p.sub}>{shares.length} lien{shares.length>1?'s':''}</p>
      {loading ? <div style={p.empty}>Chargement...</div> : shares.length===0 ? <div style={p.empty}>Aucun lien partagé</div> : (
        <div style={p.list}>
          {shares.map(sh => {
            const url = `${window.location.origin}/view/${sh.token}`;
            return (
            <div key={sh.id} style={{...p.card, flexDirection:'column', alignItems:'stretch', opacity:sh.revoked_at?0.5:1}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                <span style={{fontSize:24}}>🔗</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={p.cardTitle}>{sh.recipient_email}</div>
                  <div style={p.cardMeta}>
                    {sh.doc_title && <span>📄 {sh.doc_title}</span>}
                    <span>👁️ {sh.access_count} ouverture(s)</span>
                    <span style={{color:sh.revoked_at?'#dc2626':'#059669', fontWeight:700}}>
                      {sh.revoked_at?'● Révoqué':'● Actif'}
                    </span>
                  </div>
                  {sh.last_access_at && <div style={{fontSize:10,color:'#9ca3af',marginTop:2}}>Dernier accès: {new Date(sh.last_access_at).toLocaleString('fr-FR')}</div>}
                </div>
              </div>
              <div style={{background:'#f8f9fb',borderRadius:8,padding:'8px 12px',fontSize:11,fontFamily:'monospace',color:'#6b7280',wordBreak:'break-all',marginBottom:8}}>
                {url.slice(0,50)}...
              </div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <button style={{flex:1,...p.smallBtn, background: copied===sh.id?'#f0fdf4':'#f3f4f6', color: copied===sh.id?'#059669':'#374151'}}
                  onClick={()=>handleCopy(sh.id, url)}>
                  {copied===sh.id ? '✅ Copié !' : '📋 Copier le lien'}
                </button>
                <a href={url} target="_blank" rel="noreferrer" style={{flex:1,...p.smallBtn, textDecoration:'none', textAlign:'center', display:'flex', alignItems:'center', justifyContent:'center'}}>
                  🔗 Ouvrir
                </a>
                {!sh.revoked_at && <button style={{flex:1,...p.smallBtn,color:'#dc2626'}} onClick={()=>revoke(sh.id)}>🚫 Révoquer</button>}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function TeamPage() {
  const { authFetch, user, organization } = useAuth();
  const [invite, setInvite] = useState({email:'',role:'member'});
  const [msg, setMsg] = useState('');
  const handleInvite = async () => {
    if (!invite.email) return;
    try { await authFetch('/auth/invite',{method:'POST',body:JSON.stringify(invite)}); setMsg('✅ Invitation envoyée à '+invite.email); setInvite({email:'',role:'member'}); }
    catch(err) { setMsg('❌ '+err.message); }
  };
  return (
    <div style={{padding:16,maxWidth:600,margin:'0 auto',boxSizing:'border-box'}}>
      <h1 style={{fontSize:22,fontWeight:800,color:'#1a1a2e',margin:'0 0 16px'}}>🧑‍🤝‍🧑 Équipe</h1>
      <div style={{background:'#fff',borderRadius:14,padding:16,marginBottom:14,border:'1px solid #f3f4f6'}}>
        <h3 style={{fontSize:15,fontWeight:700,color:'#1a1a2e',margin:'0 0 14px'}}>Inviter un membre</h3>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <input style={{width:'100%',padding:'11px 14px',border:'1.5px solid #e5e7eb',borderRadius:8,fontSize:16,outline:'none',boxSizing:'border-box'}}
            type="email" placeholder="email@exemple.com" value={invite.email} onChange={e=>setInvite(i=>({...i,email:e.target.value}))} />
          <select style={{width:'100%',padding:'11px 14px',border:'1.5px solid #e5e7eb',borderRadius:8,fontSize:15,outline:'none',boxSizing:'border-box',background:'#fff'}}
            value={invite.role} onChange={e=>setInvite(i=>({...i,role:e.target.value}))}>
            <option value="member">Membre</option>
            <option value="admin">Admin</option>
          </select>
          <button style={{width:'100%',padding:13,background:'#7c3aed',color:'#fff',border:'none',borderRadius:9,fontSize:15,fontWeight:700,cursor:'pointer'}}
            onClick={handleInvite}>Envoyer l'invitation</button>
        </div>
        {msg&&<div style={{marginTop:10,fontSize:13,color:msg.startsWith('✅')?'#059669':'#dc2626'}}>{msg}</div>}
        <div style={{marginTop:8,fontSize:12,color:'#9ca3af'}}>Plan {organization?.plan} — max {organization?.limits?.max_users} utilisateur(s)</div>
      </div>
      <div style={{background:'#fff',borderRadius:14,padding:16,border:'1px solid #f3f4f6'}}>
        <h3 style={{fontSize:15,fontWeight:700,color:'#1a1a2e',margin:'0 0 14px'}}>Membres de {organization?.name}</h3>
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0'}}>
          <div style={{width:36,height:36,background:'#ede9fe',color:'#7c3aed',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:14,flexShrink:0}}>{user?.email?.[0]?.toUpperCase()}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:600,color:'#1a1a2e',display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
              {user?.first_name} {user?.last_name}
              <span style={{background:'#ede9fe',color:'#7c3aed',fontSize:10,fontWeight:700,padding:'1px 7px',borderRadius:10}}>vous</span>
            </div>
            <div style={{fontSize:12,color:'#9ca3af',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.email}</div>
          </div>
          <span style={{fontSize:12,fontWeight:700,color:'#7c3aed',flexShrink:0}}>{user?.role}</span>
        </div>
      </div>
    </div>
  );
}

const p = {
  page:        { padding:16, maxWidth:800, margin:'0 auto' },
  title:       { fontSize:22, fontWeight:800, color:'#1a1a2e', margin:'0 0 8px' },
  sub:         { color:'#9ca3af', fontSize:13, margin:'0 0 16px' },
  empty:       { textAlign:'center', color:'#9ca3af', padding:'48px 0', fontSize:14 },
  list:        { display:'flex', flexDirection:'column', gap:10 },
  card:        { background:'#fff', borderRadius:12, padding:'14px 16px', display:'flex', alignItems:'flex-start', gap:12, border:'1px solid #f3f4f6', boxShadow:'0 1px 3px rgba(0,0,0,.04)' },
  cardTitle:   { fontSize:14, fontWeight:700, color:'#1a1a2e', marginBottom:4, wordBreak:'break-word' },
  cardMeta:    { display:'flex', gap:8, flexWrap:'wrap', fontSize:11, color:'#6b7280', marginBottom:2 },
  smallBtn:    { background:'#f3f4f6', border:'1px solid #e5e7eb', padding:'7px 12px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', color:'#374151' },
  section:     { background:'#fff', borderRadius:12, padding:'16px', marginBottom:12, border:'1px solid #f3f4f6' },
  sectionTitle:{ fontSize:15, fontWeight:700, color:'#1a1a2e', margin:'0 0 14px' },
  input:       { width:'100%', padding:'11px 14px', border:'1.5px solid #e5e7eb', borderRadius:8, fontSize:16, color:'#1a1a2e', outline:'none', boxSizing:'border-box', fontFamily:'inherit' },
  btnFull:     { width:'100%', padding:13, background:'#7c3aed', color:'#fff', border:'none', borderRadius:9, fontSize:14, fontWeight:700, cursor:'pointer' },
};
