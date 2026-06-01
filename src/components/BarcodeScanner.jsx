// src/components/BarcodeScanner.jsx
import { useEffect, useRef, useState } from 'react';

export default function BarcodeScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const [error, setError] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [activeCamera, setActiveCamera] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const { BrowserMultiFormatReader, NotFoundException } = await import('@zxing/browser');
        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;

        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        if (cancelled) return;
        setCameras(devices);

        // Prefer rear camera on mobile
        const preferred = devices.find(d =>
          /back|rear|environment/i.test(d.label)
        ) ?? devices[0];

        if (!preferred) { setError('No camera found.'); return; }
        if (cancelled) return;
        setActiveCamera(preferred.deviceId);

        await reader.decodeFromVideoDevice(
          preferred.deviceId,
          videoRef.current,
          (result, err) => {
            if (result) {
              onScan(result.getText());
            }
            // NotFoundException just means "no barcode this frame" — ignore
          }
        );
      } catch (e) {
        if (!cancelled) setError(e.message || 'Camera access denied.');
      }
    }

    start();
    return () => {
      cancelled = true;
      try { readerRef.current?.reset(); } catch (_) {}
    };
  }, []);

  async function switchCamera(deviceId) {
    try {
      readerRef.current?.reset();
      setActiveCamera(deviceId);
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      await reader.decodeFromVideoDevice(deviceId, videoRef.current, (result) => {
        if (result) onScan(result.getText());
      });
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="scanner-wrap" role="dialog" aria-modal="true" aria-label="Barcode scanner">
      <button className="scanner-close" onClick={onClose} aria-label="Close scanner">✕</button>

      {error ? (
        <div style={{ color: '#fff', textAlign: 'center', padding: 24 }}>
          <p style={{ marginBottom: 12 }}>{error}</p>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      ) : (
        <>
          <video ref={videoRef} className="scanner-video" autoPlay muted playsInline />
          <p className="scanner-hint">Point the camera at a barcode or QR code</p>

          {cameras.length > 1 && (
            <div style={{ display: 'flex', gap: 8 }}>
              {cameras.map(cam => (
                <button
                  key={cam.deviceId}
                  className={`btn btn-sm ${cam.deviceId === activeCamera ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => switchCamera(cam.deviceId)}
                  style={{ color: cam.deviceId === activeCamera ? undefined : '#fff', borderColor: '#fff', background: cam.deviceId === activeCamera ? undefined : 'transparent' }}
                >
                  {cam.label.length > 20 ? cam.label.slice(0, 20) + '…' : cam.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
