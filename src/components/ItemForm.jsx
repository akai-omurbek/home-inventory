// src/components/ItemForm.jsx
import { useState, useRef } from 'react';
import BarcodeScanner from './BarcodeScanner.jsx';
import { uploadPhoto } from '../services/inventory.js';

const CONDITIONS = ['New', 'Good', 'Fair', 'Poor'];

export default function ItemForm({ item, categories, locations, onSave, onCancel }) {
  const isEdit = !!item?.id;

  const [form, setForm] = useState({
    name:      item?.name ?? '',
    category:  item?.category ?? (categories[0]?.id ?? ''),
    location:  item?.location ?? (locations[0]?.id ?? ''),
    quantity:  item?.quantity ?? '1',
    condition: item?.condition ?? 'Good',
    barcode:   item?.barcode ?? '',
    notes:     item?.notes ?? '',
    photoId:   item?.photoId ?? '',
  });

  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [newCat, setNewCat] = useState('');
  const [newLoc, setNewLoc] = useState('');
  const fileInputRef = useRef(null);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function handlePhotoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    set('photoId', ''); // will be uploaded on save
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      let photoId = form.photoId;
      if (photoFile) {
        const tempId = item?.id ?? `item-${Date.now()}`;
        photoId = await uploadPhoto(photoFile, tempId);
      }
      await onSave({ ...form, name: form.name.trim(), photoId });
    } catch (e) {
      setError(e.message || 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function removePhoto() {
    setPhotoFile(null);
    setPhotoPreview(null);
    set('photoId', '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const catName = id => categories.find(c => c.id === id)?.name ?? id;
  const locName = id => locations.find(l => l.id === id)?.name ?? id;

  return (
    <>
      {showScanner && (
        <BarcodeScanner
          onScan={code => { set('barcode', code); setShowScanner(false); }}
          onClose={() => setShowScanner(false)}
        />
      )}

      <div className="form-page">
        <h2 style={{ marginBottom: 20, fontSize: '1.1rem' }}>
          {isEdit ? 'Edit item' : 'Add item'}
        </h2>

        {/* Photo */}
        <div className="form-section">
          <label className="form-label">Photo</label>
          {photoPreview ? (
            <div className="photo-preview">
              <img src={photoPreview} alt="Preview" />
              <button className="photo-remove" onClick={removePhoto} aria-label="Remove photo">✕</button>
            </div>
          ) : (
            <div
              className="photo-upload-area"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
              role="button" tabIndex={0}
            >
              <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
              <div>Tap to add a photo</div>
              <div style={{ fontSize: '0.78rem', marginTop: 4, opacity: 0.7 }}>JPG, PNG, WEBP</div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file" accept="image/*" capture="environment"
            style={{ display: 'none' }}
            onChange={handlePhotoSelect}
          />
        </div>

        {/* Name */}
        <div className="form-section">
          <label className="form-label">Name *</label>
          <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Winter jacket, Black & Decker drill…" />
        </div>

        {/* Category */}
        <div className="form-section">
          <label className="form-label">Category</label>
          <select className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Location */}
        <div className="form-section">
          <label className="form-label">Location</label>
          <select className="form-select" value={form.location} onChange={e => set('location', e.target.value)}>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>

        {/* Quantity & Condition */}
        <div className="form-row form-section">
          <div>
            <label className="form-label">Quantity</label>
            <input
              className="form-input" type="number" min="0" value={form.quantity}
              onChange={e => set('quantity', e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">Condition</label>
            <select className="form-select" value={form.condition} onChange={e => set('condition', e.target.value)}>
              {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Barcode */}
        <div className="form-section">
          <label className="form-label">Barcode / Serial</label>
          <div className="input-with-btn">
            <input
              className="form-input" value={form.barcode}
              onChange={e => set('barcode', e.target.value)}
              placeholder="Scan or type manually"
            />
            <button
              className="btn btn-secondary"
              onClick={() => setShowScanner(true)}
              title="Scan with camera"
              type="button"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M3 9V5a2 2 0 012-2h4M15 3h4a2 2 0 012 2v4M21 15v4a2 2 0 01-2 2h-4M9 21H5a2 2 0 01-2-2v-4"/>
                <line x1="8" y1="12" x2="8" y2="12.01"/>
                <line x1="12" y1="9" x2="12" y2="15"/>
                <line x1="16" y1="12" x2="16" y2="12.01"/>
              </svg>
              Scan
            </button>
          </div>
        </div>

        {/* Notes */}
        <div className="form-section">
          <label className="form-label">Notes</label>
          <textarea
            className="form-textarea" value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Size, colour, purchase date, where to buy replacements…"
          />
        </div>

        {error && (
          <div style={{ color: 'var(--danger)', fontSize: '0.88rem', padding: '8px 0' }}>{error}</div>
        )}
      </div>

      <div className="form-actions">
        <button className="btn btn-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add item'}
        </button>
      </div>
    </>
  );
}
