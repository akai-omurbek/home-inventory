// src/components/QRLabelModal.jsx
import { useEffect, useRef, useState } from 'react';

export default function QRLabelModal({ locations, onClose }) {
  const [selected, setSelected] = useState(null);

  function handleOverlayClick(e) {
    if (e.target !== e.currentTarget) return;
    selected ? setSelected(null) : onClose();
  }

  return (
    <div className="detail-overlay" onClick={handleOverlayClick} role="dialog" aria-modal="true">
      <div className="detail-card">
        <div className="detail-body">
          {selected
            ? <QRDisplay location={selected} onBack={() => setSelected(null)} />
            : <LocationList locations={locations} onSelect={setSelected} onClose={onClose} />
          }
        </div>
      </div>
    </div>
  );
}

function LocationList({ locations, onSelect, onClose }) {
  return (
    <>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <h2 style={{ margin:0, fontSize:'1.1rem' }}>QR Labels</h2>
        <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
      </div>
      <p style={{ color:'var(--text-3)', fontSize:'0.85rem', marginBottom:16 }}>
        Tap a location to generate its QR label.
      </p>
      {locations.length === 0 && (
        <p style={{ color:'var(--text-3)', fontSize:'0.88rem' }}>No locations yet. Add them in Settings.</p>
      )}
      <ul style={{ listStyle:'none', padding:0, margin:0 }}>
        {locations.map(loc => (
          <li key={loc.id}
            onClick={() => onSelect(loc)}
            style={{ padding:'14px 0', borderBottom:'1px solid var(--border)', cursor:'pointer', display:'flex', alignItems:'center', gap:12 }}
          >
            <span style={{ fontSize:'1.4rem' }}>📦</span>
            <span style={{ fontWeight:500 }}>{loc.name}</span>
            <span style={{ marginLeft:'auto', color:'var(--text-3)', fontSize:'1.1rem' }}>›</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function QRDisplay({ location, onBack }) {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function generate() {
      const QRCode = (await import('qrcode')).default;
      const url = new URL(window.location.href);
      url.search = `?loc=${location.id}`;
      url.hash = '';
      await QRCode.toCanvas(canvasRef.current, url.toString(), {
        width: 240, margin: 2,
        color: { dark: '#000', light: '#fff' },
      });
      setReady(true);
    }
    generate();
  }, [location]);

  function handlePrint() {
    const dataUrl = canvasRef.current.toDataURL();
    const win = window.open('', '_blank', 'width=400,height=520');
    win.document.write(`<!DOCTYPE html><html><head>
      <title>${location.name} — QR Label</title>
      <style>
        body { display:flex; flex-direction:column; align-items:center; justify-content:center;
               height:100vh; margin:0; font-family:system-ui,sans-serif; background:#fff; }
        img  { width:240px; height:240px; }
        h2   { margin:16px 0 4px; font-size:1.2rem; text-align:center; }
        p    { margin:0; color:#666; font-size:0.85rem; }
      </style></head><body>
      <img src="${dataUrl}" alt="QR code" />
      <h2>${location.name}</h2>
      <p>Home Inventory</p>
      <script>window.onload = () => { window.print(); window.close(); }<\/script>
    </body></html>`);
    win.document.close();
  }

  return (
    <>
      <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ marginBottom:16 }}>← Back</button>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, padding:'16px 0' }}>
        <canvas ref={canvasRef} style={{ borderRadius:8, opacity: ready ? 1 : 0, transition:'opacity 0.2s' }} />
        <div style={{ fontSize:'1.1rem', fontWeight:600, textAlign:'center' }}>{location.name}</div>
        <div style={{ fontSize:'0.8rem', color:'var(--text-3)' }}>Home Inventory</div>
      </div>
      <button className="btn btn-primary btn-full" onClick={handlePrint} disabled={!ready} style={{ marginTop:8 }}>
        Print label
      </button>
    </>
  );
}
