import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const GROUP_COLORS = {
  'Confiant':       { color:'#059669', bg:'#dcfce7', border:'#86efac' },
  'Moins confiant': { color:'#d97706', bg:'#fef3c7', border:'#fcd34d' },
  'Pas confiant':   { color:'#dc2626', bg:'#fee2e2', border:'#fca5a5' },
};

export default function SendLinksPage() {
  const { authFetch } = useAuth();
  const [docs, setDocs]       = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('A');
  const [message, setMessage] = useState('');
  const [search, setSearch]   = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const [sending, setSending]   = useState(new Set());
  const [sent, setSent]         = useState(new Set());
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      authFetch('/documents').then(d => setDocs(d.documents || [])),
      authFetch('/members').then(d => setMembers(d.members || [])),
    ]).finally(() => setLoading(false));
  }, [authFetch]);

  // Membres filtrés
  const filtered = members.filter(m => {
    const matchGroup  = groupFilter === 'all' || m.group_name === groupFilter;
    const matchSearch = !search || m.name?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase());
    return matchGroup && matchSearch && m.is_active !== false;
  });

  const groupCounts = {
    'Confiant':       members.filter(m=>m.group_name==='Confiant').length,
    'Moins confiant': members.filter(m=>m.group_name==='Moins confiant').length,
    'Pas confiant':   members.filter(m=>m.group_name==='Pas confiant').length,
  };

  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const selectAll   = () => setSelected(new Set(filtered.map(m => m.id)));
  const deselectAll = () => setSelected(new Set());
  const selectGroup = (group) => {
    const ids = members.filter(m=>m.group_name===group).map(m=>m.id);
    setSelected(new Set(ids));
  };

  // Envoyer à un seul membre
  const sendToOne = async (member) => {
    if (!selectedDoc) return alert('Sélectionnez un document d\'abord');
    setSending(prev => new Set(prev).add(member.id));
    try {
      await authFetch('/shares', {
        method: 'POST',
        body: JSON.stringify({
          document_id:    selectedDoc,
          recipients:     [{ email: member.email, name: member.name || member.email }],
          custom_message: message,
        }),
      });
      setSent(prev => new Set(prev).add(member.id));
    } catch(err) { alert(err.message); }
    finally { setSending(prev => { const n=new Set(prev); n.delete(member.id); return n; }); }
  };

  // Envoyer à tous les sélectionnés
  const sendToSelected = async () => {
    if (!selectedDoc) return alert('Sélectionnez un document');
    if (!selected.size) return alert('Sélectionnez au moins un membre');
    const targets = members.filter(m => selected.has(m.id));
    for (const member of targets) {
      await sendToOne(member);
    }
  };

  const selectedDoc_obj = docs.find(d => d.id === selectedDoc);

  if (loading) return <div style={s.loading}>Chargement...</div>;

  return (
    <div style={s.page}>
      <h1 style={s.title}>🛰️ Envoyer les liens</h1>
      <p style={s.sub}>Envoyez à chaque membre son lien personnel par email</p>

      {/* ── Sélection document ── */}
      <div style={s.section}>
        <div style={s.sectionTitle}>📄 Document à envoyer</div>
        <select style={s.input} value={selectedDoc} onChange={e => setSelectedDoc(e.target.value)}>
          <option value="">-- Sélectionnez un document --</option>
          {docs.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
        </select>
        {selectedDoc && (
          <div style={{marginTop:10}}>
            <div style={s.label}>Version PDF</div>
            <div style={{display:'flex', gap:8, marginTop:6}}>
              {['A','B','C'].map(v => (
                <button key={v} onClick={() => setSelectedVersion(v)}
                  style={{flex:1, padding:'10px', border:`2px solid ${selectedVersion===v?'#7c3aed':'#e5e7eb'}`, borderRadius:8, background:selectedVersion===v?'#7c3aed':'transparent', color:selectedVersion===v?'#fff':'#374151', fontWeight:700, cursor:'pointer', fontSize:14}}>
                  Version {v}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Message personnalisé ── */}
      <div style={s.section}>
        <div style={s.sectionTitle}>💬 Message personnalisé (optionnel)</div>
        <textarea
          style={{...s.input, height:100, resize:'vertical', marginTop:8}}
          placeholder={"Ex: Veuillez trouver ci-joint le procès-verbal de l'Assemblée Générale du 5 mai 2026. Ce document est strictement confidentiel..."}
          value={message}
          onChange={e => setMessage(e.target.value)}
        />
        <div style={{fontSize:11, color:'#9ca3af', marginTop:4}}>Ce message apparaîtra dans le corps de l'email en plus du lien de tracking.</div>
      </div>

      {/* ── Sélection membres ── */}
      <div style={s.section}>
        {/* Recherche + filtre groupe */}
        <div style={{display:'flex', gap:8, marginBottom:12}}>
          <input style={{...s.input, flex:1}} placeholder="🔍 Rechercher..." value={search} onChange={e=>setSearch(e.target.value)} />
          <select style={{...s.input, width:'auto', flexShrink:0}} value={groupFilter} onChange={e=>setGroupFilter(e.target.value)}>
            <option value="all">Tous les groupes</option>
            <option value="Confiant">Confiant</option>
            <option value="Moins confiant">Moins confiant</option>
            <option value="Pas confiant">Pas confiant</option>
          </select>
        </div>

        {/* Tout sélectionner / Désélectionner */}
        <div style={{display:'flex', gap:8, marginBottom:10, flexWrap:'wrap'}}>
          <button style={s.selBtn} onClick={selectAll}>✓ Tout sélectionner ({filtered.length})</button>
          <button style={{...s.selBtn, background:'transparent', color:'#6b7280'}} onClick={deselectAll}>✗ Désélectionner</button>
        </div>

        {/* Boutons par groupe */}
        <div style={{display:'flex', gap:8, marginBottom:10, flexWrap:'wrap'}}>
          {Object.entries(GROUP_COLORS).map(([group, gc]) => (
            <button key={group} onClick={() => selectGroup(group)}
              style={{padding:'6px 14px', borderRadius:20, border:`2px solid ${gc.border}`, background:gc.bg, color:gc.color, fontWeight:700, fontSize:12, cursor:'pointer'}}>
              {group} ({groupCounts[group]})
            </button>
          ))}
        </div>

        {selected.size > 0 && (
          <div style={{fontSize:13, color:'#7c3aed', fontWeight:700, marginBottom:8}}>
            {selected.size} membre{selected.size>1?'s':''} sélectionné{selected.size>1?'s':''}
          </div>
        )}

        {/* Bouton envoyer groupé */}
        {selected.size > 1 && (
          <button style={{...s.btnFull, marginBottom:14}} onClick={sendToSelected}>
            📧 Envoyer à {selected.size} membres sélectionnés →
          </button>
        )}
      </div>

      {/* ── Liste membres ── */}
      {filtered.length === 0 ? (
        <div style={s.empty}>Aucun membre trouvé</div>
      ) : (
        <div style={s.list}>
          {filtered.map(member => {
            const gc      = GROUP_COLORS[member.group_name] || GROUP_COLORS['Confiant'];
            const isSent  = sent.has(member.id);
            const isSending = sending.has(member.id);
            const isSelected = selected.has(member.id);
            return (
              <div key={member.id} style={{...s.memberCard, background: isSelected?'#f5f3ff':'#fff', borderColor: isSelected?'#7c3aed':'#f3f4f6'}}>
                {/* Checkbox */}
                <div onClick={() => toggleSelect(member.id)} style={{width:22, height:22, border:`2px solid ${isSelected?'#7c3aed':'#d1d5db'}`, borderRadius:6, background:isSelected?'#7c3aed':'transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0}}>
                  {isSelected && <span style={{color:'#fff', fontSize:14, fontWeight:900}}>✓</span>}
                </div>

                {/* Infos membre */}
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:14, fontWeight:700, color:'#1a1a2e', marginBottom:3}}>{member.name || member.email}</div>
                  <div style={{display:'flex', gap:6, flexWrap:'wrap', alignItems:'center', marginBottom:2}}>
                    <span style={{...s.groupTag, background:gc.bg, color:gc.color, borderColor:gc.border}}>{member.group_name}</span>
                    {selectedVersion && <span style={{background:'#f3f4f6', color:'#374151', fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:8}}>v{selectedVersion}</span>}
                  </div>
                  <div style={{fontSize:11, color:'#9ca3af', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{member.email}</div>
                </div>

                {/* Statut + bouton */}
                <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0}}>
                  {isSent && <span style={{fontSize:11, color:'#059669', fontWeight:700}}>✓ Envoyé</span>}
                  <button
                    onClick={() => sendToOne(member)}
                    disabled={isSending || isSent}
                    style={{background:isSent?'#f0fdf4':isSending?'#f3f4f6':'#7c3aed', color:isSent?'#059669':isSending?'#9ca3af':'#fff', border:`1px solid ${isSent?'#86efac':'transparent'}`, padding:'8px 14px', borderRadius:8, fontSize:12, fontWeight:700, cursor:isSent||isSending?'default':'pointer', whiteSpace:'nowrap'}}>
                    {isSending ? '...' : isSent ? '✓ Envoyé' : '🛰️ Envoyer'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const s = {
  page:      { padding:16, maxWidth:800, margin:'0 auto' },
  loading:   { padding:64, textAlign:'center', color:'#6b7280' },
  title:     { fontSize:22, fontWeight:800, color:'#1a1a2e', margin:'0 0 4px' },
  sub:       { color:'#9ca3af', fontSize:13, margin:'0 0 16px' },
  section:   { background:'#fff', borderRadius:14, padding:'16px', marginBottom:14, border:'1px solid #f3f4f6', boxShadow:'0 1px 3px rgba(0,0,0,.04)' },
  sectionTitle:{ fontSize:14, fontWeight:700, color:'#1a1a2e', marginBottom:10 },
  label:     { fontSize:13, fontWeight:600, color:'#374151' },
  input:     { width:'100%', padding:'11px 14px', border:'1.5px solid #e5e7eb', borderRadius:8, fontSize:15, color:'#1a1a2e', outline:'none', boxSizing:'border-box', fontFamily:'inherit', background:'#fff' },
  selBtn:    { background:'#1a1a2e', color:'#fff', border:'2px solid #1a1a2e', padding:'7px 14px', borderRadius:20, fontSize:12, fontWeight:700, cursor:'pointer' },
  btnFull:   { width:'100%', padding:13, background:'#7c3aed', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer' },
  empty:     { textAlign:'center', color:'#9ca3af', padding:'48px 0', fontSize:14 },
  list:      { display:'flex', flexDirection:'column', gap:8 },
  memberCard:{ background:'#fff', borderRadius:12, padding:'12px 14px', display:'flex', alignItems:'center', gap:12, border:'1.5px solid #f3f4f6', transition:'all 0.15s' },
  groupTag:  { fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:10, border:'1.5px solid' },
};
