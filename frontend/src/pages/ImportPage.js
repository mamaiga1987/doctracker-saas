import React, { useState, useRef } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function ImportPage() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();

  const handleFile = (f) => {
    if (f && f.name.endsWith('.csv')) {
      setFile(f);
      setResult(null);
    } else {
      toast.error('Fichier CSV uniquement (.csv)');
    }
  };

  const handleImport = async () => {
    if (!file) { toast.error('Sélectionnez un fichier CSV'); return; }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('csv', file);
      const { data } = await api.post('/import/members', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(data);
      if (data.imported > 0) toast.success(data.imported + ' membre(s) importé(s) !');
      else toast.error('Aucun nouveau membre importé');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur import');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplate = async () => {
    const { data } = await api.get('/import/template', { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modele-import-membres.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 16, background: '#f8f9fc', minHeight: '100vh' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>📥 Import membres</h1>
        <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>Importez plusieurs membres depuis un fichier CSV</p>
      </div>

      {/* Modèle CSV */}
      <div style={{ background: '#eef2ff', border: '1.5px solid #c7d2fe', borderRadius: 14, padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#4338ca', marginBottom: 6 }}>📋 Format CSV attendu</div>
        <code style={{ fontSize: 11, color: '#374151', display: 'block', background: '#fff', borderRadius: 8, padding: 10, lineHeight: 1.6 }}>
          nom,email,groupe,version<br/>
          Jean Dupont,jean@email.com,confiant,A<br/>
          Marie Martin,marie@email.com,moins_confiant,A<br/>
          Pierre Durand,pierre@email.com,,
        </code>
        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>
          ✅ <strong>nom</strong> et <strong>email</strong> obligatoires<br/>
          Groupe optionnel: <strong>confiant</strong>, <strong>moins_confiant</strong>, <strong>pas_confiant</strong> (défaut: moins_confiant)<br/>
          Version optionnelle: <strong>A</strong>, <strong>B</strong>, <strong>C</strong> (défaut: A)
        </div>
        <button onClick={handleTemplate} style={{ marginTop: 10, padding: '8px 14px', borderRadius: 8, border: '1.5px solid #6366f1', background: '#fff', color: '#4338ca', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          ⬇️ Télécharger le modèle CSV
        </button>
      </div>

      {/* Zone upload */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => inputRef.current.click()}
        style={{
          border: '2px dashed ' + (dragOver ? '#6366f1' : '#c7d2fe'),
          borderRadius: 16, padding: 32, textAlign: 'center',
          background: dragOver ? '#eef2ff' : '#fff',
          cursor: 'pointer', marginBottom: 16, transition: 'all 0.2s'
        }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>📂</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>
          {file ? '✅ ' + file.name : 'Glissez votre fichier CSV ici'}
        </div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
          {file ? (file.size / 1024).toFixed(1) + ' KB' : 'ou cliquez pour sélectionner'}
        </div>
        <input ref={inputRef} type="file" accept=".csv" style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])} />
      </div>

      {/* Bouton import */}
      <button onClick={handleImport} disabled={loading || !file}
        style={{
          width: '100%', padding: '14px', borderRadius: 12, border: 'none',
          background: loading || !file ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
          color: '#fff', fontWeight: 800, fontSize: 15, cursor: loading || !file ? 'not-allowed' : 'pointer',
          marginBottom: 16
        }}>
        {loading ? '⏳ Import en cours...' : '📥 Importer les membres'}
      </button>

      {/* Résultats */}
      {result && (
        <div style={{ background: '#fff', borderRadius: 14, padding: 16, border: '1.5px solid #e8eaf6' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#111827', marginBottom: 12 }}>📊 Résultat de l'import</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
            <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#16a34a' }}>{result.imported}</div>
              <div style={{ fontSize: 11, color: '#166534' }}>Importés</div>
            </div>
            <div style={{ background: '#fffbeb', borderRadius: 10, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#d97706' }}>{result.skipped}</div>
              <div style={{ fontSize: 11, color: '#92400e' }}>Déjà existants</div>
            </div>
            <div style={{ background: result.errors.length > 0 ? '#fff5f5' : '#f9fafb', borderRadius: 10, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: result.errors.length > 0 ? '#dc2626' : '#6b7280' }}>{result.errors.length}</div>
              <div style={{ fontSize: 11, color: result.errors.length > 0 ? '#dc2626' : '#9ca3af' }}>Erreurs</div>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div style={{ background: '#fff5f5', borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>Lignes en erreur :</div>
              {result.errors.map((e, i) => (
                <div key={i} style={{ fontSize: 11, color: '#374151', padding: '3px 0' }}>
                  ❌ {e.row} — {e.error}
                </div>
              ))}
            </div>
          )}
          {result.imported > 0 && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
              Les membres importés peuvent maintenant recevoir leurs liens depuis la page Membres.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
