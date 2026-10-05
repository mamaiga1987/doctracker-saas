import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';

export default function MapPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const fetchEvents = useCallback(async () => {
    try {
      const { data } = await api.get('/track/events?limit=500');
      setEvents(data.filter(e => e.lat && e.lon));
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Initialiser la carte Leaflet
  useEffect(() => {
    if (loading || !mapRef.current) return;

    // Charger Leaflet dynamiquement
    if (!window.L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => initMap();
      document.head.appendChild(script);
    } else {
      initMap();
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [loading, events, filter]);

  function initMap() {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    if (!mapRef.current || !window.L) return;

    const L = window.L;
    const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false }).setView([46.5, 2.5], 5);
    mapInstanceRef.current = map;

    // Fond de carte OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(map);

    // Grouper par localisation
    const locations = {};
    const filtered = events.filter(e => {
      if (filter === 'fr') return e.country === 'FR' || !e.country;
      if (filter === 'abroad') return e.country && e.country !== 'FR';
      if (filter === 'suspect') return e.event_type === 'unauthorized_access' || (e.country && e.country !== 'FR');
      return true;
    });

    filtered.forEach(e => {
      const key = `${parseFloat(e.lat).toFixed(2)}_${parseFloat(e.lon).toFixed(2)}`;
      if (!locations[key]) {
        locations[key] = { lat: parseFloat(e.lat), lon: parseFloat(e.lon), events: [], city: e.city, country: e.country };
      }
      locations[key].events.push(e);
    });

    Object.values(locations).forEach(loc => {
      const hasUnauth = loc.events.some(e => e.event_type === 'unauthorized_access');
      const isAbroad = loc.country && loc.country !== 'FR';
      const isSuspect = hasUnauth || isAbroad;
      const count = loc.events.length;
      const members = [...new Set(loc.events.map(e => e.member_email).filter(Boolean))];

      const color = isSuspect ? '#ef4444' : '#6366f1';
      const size = Math.max(24, Math.min(50, 24 + count * 3));

      const icon = L.divIcon({
        html: `<div style="
          width:${size}px;height:${size}px;border-radius:50%;
          background:${color};border:3px solid #fff;
          display:flex;align-items:center;justify-content:center;
          color:#fff;font-weight:800;font-size:${size > 35 ? 13 : 11}px;
          box-shadow:0 2px 8px rgba(0,0,0,0.3);
          ${isSuspect ? 'animation:blink 1.5s infinite;' : ''}
        ">${count}</div>
        <style>@keyframes blink{0%,100%{opacity:1}50%{opacity:0.6}}</style>`,
        className: '',
        iconSize: [size, size],
        iconAnchor: [size/2, size/2],
      });

      const countryFlags = { FR: '🇫🇷', GB: '🇬🇧', DE: '🇩🇪', ES: '🇪🇸', MA: '🇲🇦', SN: '🇸🇳', US: '🇺🇸' };
      const flag = countryFlags[loc.country] || '🌍';

      const popup = `
        <div style="font-family:-apple-system,sans-serif;min-width:180px">
          <div style="font-weight:700;font-size:14px;margin-bottom:6px">
            ${flag} ${loc.city || loc.country || 'Inconnu'}
          </div>
          <div style="font-size:12px;color:#6b7280;margin-bottom:6px">${count} accès</div>
          ${isSuspect ? '<div style="background:#fee2e2;color:#dc2626;border-radius:6px;padding:4px 8px;font-size:11px;font-weight:600;margin-bottom:6px">⛔ Suspect</div>' : ''}
          <div style="font-size:11px;color:#374151">
            ${members.map(m => `<div>✉️ ${m}</div>`).join('')}
          </div>
        </div>
      `;

      L.marker([loc.lat, loc.lon], { icon }).addTo(map).bindPopup(popup);
    });

    // Ajuster la vue si des marqueurs existent
    if (Object.keys(locations).length > 0) {
      const lats = Object.values(locations).map(l => l.lat);
      const lons = Object.values(locations).map(l => l.lon);
      map.fitBounds([[Math.min(...lats)-1, Math.min(...lons)-1], [Math.max(...lats)+1, Math.max(...lons)+1]]);
    }
  }

  // Grouper pour stats
  const locationList = {};
  events.forEach(e => {
    const key = e.city || e.country || e.ip || 'Inconnu';
    if (!locationList[key]) locationList[key] = { city: e.city, country: e.country, ip: e.ip, events: [], members: new Set(), hasUnauth: false };
    locationList[key].events.push(e);
    if (e.member_email) locationList[key].members.add(e.member_email);
    if (e.event_type === 'unauthorized_access') locationList[key].hasUnauth = true;
  });
  const locs = Object.values(locationList);
  const isFrance = l => l.country === 'FR' || !l.country;
  const isAbroad = l => l.country && l.country !== 'FR';

  return (
    <div style={{ padding: 16, background: '#f8f9fc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>Carte des connexions</h1>
          <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>{events.length} accès géolocalisés</p>
        </div>
        <button onClick={fetchEvents} style={{ padding: '8px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🔄</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
        <div style={{ background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ fontSize: 22 }}>🇫🇷</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#1e40af' }}>{locs.filter(isFrance).length}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>Localisations France</div>
        </div>
        <div style={{ background: locs.filter(isAbroad).length > 0 ? '#fff5f5' : '#f9fafb', border: `1.5px solid ${locs.filter(isAbroad).length > 0 ? '#fca5a5' : '#e5e7eb'}`, borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ fontSize: 22 }}>🌍</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: locs.filter(isAbroad).length > 0 ? '#dc2626' : '#9ca3af' }}>{locs.filter(isAbroad).length}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>Pays étrangers</div>
        </div>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {[
          { val: 'all', label: 'Tout' },
          { val: 'fr', label: '🇫🇷 France' },
          { val: 'abroad', label: '🌍 Étranger' },
          { val: 'suspect', label: '🚨 Suspects' },
        ].map(f => (
          <button key={f.val} onClick={() => setFilter(f.val)} style={{ padding: '7px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: filter === f.val ? 'none' : '1.5px solid #e5e7eb', background: filter === f.val ? '#6366f1' : '#fff', color: filter === f.val ? '#fff' : '#374151' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Carte Leaflet */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e8eaf6', overflow: 'hidden', marginBottom: 16, position: 'relative', zIndex: 0 }}>
        {loading ? (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>Chargement...</div>
        ) : (
          <div ref={mapRef} style={{ height: 320, width: '100%' }} />
        )}
      </div>

      {/* Légende */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b7280' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#6366f1' }} /> Accès normal
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b7280' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} /> Suspect
        </div>
      </div>

      {/* Liste */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {locs.sort((a,b) => b.events.length - a.events.length).map((l, i) => {
          const isSuspect = l.hasUnauth || isAbroad(l);
          const countryFlags = { FR: '🇫🇷', GB: '🇬🇧', DE: '🇩🇪', ES: '🇪🇸', MA: '🇲🇦', SN: '🇸🇳', US: '🇺🇸' };
          return (
            <div key={i} style={{ background: isSuspect ? '#fff5f5' : '#fff', border: `1.5px solid ${isSuspect ? '#fca5a5' : '#e8eaf6'}`, borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 28 }}>{countryFlags[l.country] || (isSuspect ? '🚨' : '📍')}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{l.city || l.country || l.ip || 'Inconnu'}</div>
                  {l.ip && <div style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'monospace' }}>{l.ip}</div>}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                    {[...l.members].map((m, j) => (
                      <span key={j} style={{ background: '#eef2ff', color: '#4338ca', borderRadius: 6, padding: '1px 6px', fontSize: 10 }}>{m}</span>
                    ))}
                  </div>
                  {isSuspect && <div style={{ marginTop: 4, fontSize: 11, color: '#dc2626', fontWeight: 600 }}>
                    {l.hasUnauth ? '⛔ Tentative non autorisée' : '🌍 Connexion étrangère'}
                  </div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: isSuspect ? '#dc2626' : '#6366f1' }}>{l.events.length}</div>
                  <div style={{ fontSize: 10, color: '#9ca3af' }}>accès</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
