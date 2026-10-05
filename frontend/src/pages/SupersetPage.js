import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';

export default function SupersetPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [pgStatus, setPgStatus] = useState(null);
  const [customQuery, setCustomQuery] = useState('SELECT id, name, email FROM users LIMIT 100');

  const testConnection = async () => {
    try {
      const { data } = await api.get('/superset/test');
      setPgStatus(data);
      toast.success('Connexion PostgreSQL OK');
    } catch (err) {
      setPgStatus({ connected: false, error: err.response?.data?.error });
      toast.error('Erreur connexion PostgreSQL');
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/superset/users');
      setUsers(data);
      toast.success(`${data.length} utilisateurs chargés`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustom = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/superset/query', { sql: customQuery });
      setUsers(data.rows);
      toast.success(`${data.rowCount} lignes chargées`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur SQL');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    setSelected(users.map((_, i) => i));
  };

  const handleImport = async () => {
    if (selected.length === 0) { toast.error('Sélectionner au moins un membre'); return; }
    setImporting(true);
    try {
      const toImport = selected.map(i => ({
        ...users[i],
        group: assignments[i]?.group || 'moins_confiant',
        assignedVersion: assignments[i]?.version || 'A'
      }));
      const { data } = await api.post('/members/bulk-import', { members: toImport });
      toast.success(`✅ ${data.created} créés, ${data.skipped} ignorés`);
      if (data.errors.length > 0) toast.error(`⚠️ ${data.errors.length} erreurs`);
      setSelected([]);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur import');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>Import Superset / PostgreSQL</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--font-mono)', marginTop: 4 }}>
          Importer des membres depuis la table <code style={{ background: 'var(--bg-deep)', padding: '2px 6px', borderRadius: 4 }}>users</code> de votre base PostgreSQL
        </p>
      </div>

      {/* Connection test */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Connexion PostgreSQL</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://doctracker.monairbyte.eu'} · 51.77.192.239:5432 · db: n8n
            </div>
          </div>
          {pgStatus && (
            <span className={`pill ${pgStatus.connected ? 'pill-success' : 'pill-danger'}`}>
              {pgStatus.connected ? '✓ Connecté' : `✗ ${pgStatus.error}`}
            </span>
          )}
          <button className="btn btn-ghost" onClick={testConnection}>🔌 Tester</button>
        </div>
      </div>

      {/* Custom query */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Requête SQL personnalisée</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <textarea
            className="input"
            value={customQuery}
            onChange={e => setCustomQuery(e.target.value)}
            rows={3}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 12, resize: 'vertical' }}
          />
          <button className="btn btn-primary" onClick={fetchCustom} disabled={loading} style={{ flexShrink: 0 }}>
            ▶ Exécuter
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
          ⚠️ SELECT uniquement. Les colonnes attendues : <code className="mono">id, name, email</code> (+ optionnel: group_type, role)
        </div>
      </div>

      {/* Users table */}
      {users.length > 0 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 600 }}>{users.length} utilisateurs</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 13, marginLeft: 8 }}>· {selected.length} sélectionné{selected.length !== 1 ? 's' : ''}</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={selectAll}>Tout sélectionner</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelected([])}>Désélectionner</button>
            <button
              className="btn btn-primary"
              onClick={handleImport}
              disabled={selected.length === 0 || importing}
            >
              {importing ? '⏳ Import...' : `⬆ Importer ${selected.length > 0 ? `(${selected.length})` : ''}`}
            </button>
          </div>
          <div style={{ overflowX: 'auto', maxHeight: '50vh', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Groupe assigné</th>
                  <th>Version PDF</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={i} style={{ cursor: 'pointer' }} onClick={() => toggleSelect(i)}>
                    <td>
                      <input type="checkbox" checked={selected.includes(i)} onChange={() => toggleSelect(i)}
                        style={{ cursor: 'pointer', width: 16, height: 16 }} />
                    </td>
                    <td style={{ fontWeight: 600 }}>{u.name || u.username || '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{u.email || '—'}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <select
                        className="input"
                        style={{ width: 160, padding: '4px 10px', fontSize: 12 }}
                        value={assignments[i]?.group || 'moins_confiant'}
                        onChange={e => setAssignments(p => ({ ...p, [i]: { ...p[i], group: e.target.value } }))}
                      >
                        <option value="confiant">Confiant</option>
                        <option value="moins_confiant">Moins confiant</option>
                        <option value="pas_confiant">Pas confiant</option>
                      </select>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <select
                        className="input"
                        style={{ width: 120, padding: '4px 10px', fontSize: 12 }}
                        value={assignments[i]?.version || 'A'}
                        onChange={e => setAssignments(p => ({ ...p, [i]: { ...p[i], version: e.target.value } }))}
                      >
                        <option value="A">Version A</option>
                        <option value="B">Version B</option>
                        <option value="C">Version C</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {users.length === 0 && (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🗃️</div>
          <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Aucune donnée chargée</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Cliquez sur "Exécuter" pour charger les utilisateurs</div>
          <button className="btn btn-primary" onClick={fetchUsers} disabled={loading}>
            {loading ? 'Chargement...' : '📂 Charger les utilisateurs'}
          </button>
        </div>
      )}
    </div>
  );
}
