import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';

export default function DocumentsPage() {
  const [docs, setDocs] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState({});
  const inputRefs = { A: useRef(), B: useRef(), C: useRef() };

  const fetchDocs = async () => {
    try {
      const { data } = await api.get('/documents');
      const map = {};
      data.forEach(d => { map[d.version] = d; });
      setDocs(map);
    } catch (err) {
      toast.error('Erreur chargement: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocs(); }, []);

  const handleUpload = async (version, file) => {
    if (!file) return;
    if (file.type !== 'application/pdf') { toast.error('Fichier PDF uniquement'); return; }
    setUploading(p => ({ ...p, [version]: true }));
    try {
      const fd = new FormData();
      fd.append('pdf', file);
      const { data } = await api.post(`/documents/upload/${version}`, fd);
      toast.success(`Version ${version} uploadée : ${data.original_name}`);
      await fetchDocs();
    } catch (err) {
      toast.error('Erreur: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(p => ({ ...p, [version]: false }));
    }
  };

  const handleDelete = async (version) => {
    if (!window.confirm(`Supprimer version ${version} ?`)) return;
    try {
      await api.delete(`/documents/${version}`);
      toast.success('Supprimé');
      await fetchDocs();
    } catch (err) {
      toast.error('Erreur suppression');
    }
  };

  const colors = { A: '#6366f1', B: '#10b981', C: '#f59e0b' };

  if (loading) return (
    <div style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>Chargement...</div>
  );

  return (
    <div style={{ padding: 16, background: '#f8f9fc', minHeight: '100vh' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>Documents PDF</h1>
        <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>
          Uploadez les 3 versions à distribuer à vos membres
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {['A', 'B', 'C'].map(version => {
          const doc = docs[version];
          const isUploading = uploading[version];
          const color = colors[version];

          return (
            <div key={version} style={{
              background: '#fff', borderRadius: 14,
              border: `1.5px solid ${doc ? color + '44' : '#e8eaf6'}`,
              padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
            }}>
              {/* Header version */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: color + '18', border: `2px solid ${color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 18, color, flexShrink: 0
                }}>{version}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>Version {version}</div>
                  <div style={{ fontSize: 12, color: doc ? '#10b981' : '#9ca3af', marginTop: 1 }}>
                    {doc ? `✓ ${doc.original_name}` : 'Aucun document uploadé'}
                  </div>
                </div>
                {doc && (
                  <span style={{
                    background: '#d1fae5', color: '#065f46', borderRadius: 999,
                    padding: '2px 10px', fontSize: 11, fontWeight: 700
                  }}>Actif</span>
                )}
              </div>

              {/* Infos fichier si existe */}
              {doc && (
                <div style={{
                  background: '#f9fafb', borderRadius: 8, padding: '10px 12px',
                  marginBottom: 12, border: '1px solid #f3f4f6'
                }}>
                  <div style={{ fontSize: 12, color: '#374151', fontWeight: 600, marginBottom: 2 }}>
                    📄 {doc.original_name}
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>
                    {doc.size ? (parseInt(doc.size) / 1024).toFixed(0) + ' KB' : ''} 
                    {doc.uploaded_at ? ` · ${new Date(doc.uploaded_at).toLocaleDateString('fr-FR')}` : ''}
                  </div>
                </div>
              )}

              {/* Zone drop si pas de doc */}
              {!doc && (
                <div
                  onClick={() => inputRefs[version].current?.click()}
                  style={{
                    border: `2px dashed ${color}66`, borderRadius: 10,
                    padding: '24px 16px', textAlign: 'center', marginBottom: 12,
                    cursor: 'pointer', background: color + '08'
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 6 }}>📁</div>
                  <div style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>
                    Appuyer pour choisir un PDF
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Maximum 50 MB</div>
                </div>
              )}

              {/* Boutons */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => inputRefs[version].current?.click()}
                  disabled={isUploading}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                    background: color, color: '#fff', fontWeight: 700, fontSize: 13,
                    cursor: isUploading ? 'not-allowed' : 'pointer', opacity: isUploading ? 0.6 : 1
                  }}
                >
                  {isUploading ? '⏳ Upload...' : doc ? '🔄 Remplacer' : `⬆ Uploader version ${version}`}
                </button>
                {doc && (
                  <button
                    onClick={() => handleDelete(version)}
                    style={{
                      padding: '10px 14px', borderRadius: 10,
                      background: '#fee2e2', color: '#dc2626',
                      border: '1px solid #fca5a5', fontWeight: 700, fontSize: 13, cursor: 'pointer'
                    }}
                  >🗑</button>
                )}
              </div>

              <input
                ref={inputRefs[version]}
                type="file" accept="application/pdf"
                style={{ display: 'none' }}
                onChange={e => { handleUpload(version, e.target.files?.[0]); e.target.value = ''; }}
              />
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div style={{ marginTop: 16, background: '#eff6ff', borderRadius: 12, padding: 14, border: '1px solid #bfdbfe' }}>
        <div style={{ fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
          ℹ️ Lien de tracking :{' '}
          <code style={{ fontSize: 11, background: '#dbeafe', padding: '1px 6px', borderRadius: 4 }}>
            https://doctracker.monairbyte.eu/api/track/view/[TOKEN]
          </code>
        </div>
      </div>
    </div>
  );
}
