// src/components/ItemList.jsx
import { useState, useEffect, useMemo } from 'react';
import { getPhotoUrl, deletePhoto } from '../services/inventory.js';

const COND_CLASS = { New: 'cond-new', Good: 'cond-good', Fair: 'cond-fair', Poor: 'cond-poor' };

// ─── Photo cache (object URLs, keyed by photoId) ──────────────
const photoCache = new Map();
async function cachedPhoto(photoId) {
  if (!photoId) return null;
  if (photoCache.has(photoId)) return photoCache.get(photoId);
  const url = await getPhotoUrl(photoId);
  if (url) photoCache.set(photoId, url);
  return url;
}

// ─── ItemCard ─────────────────────────────────────────────────
function ItemCard({ item, categories, locations, onClick }) {
  const [photoUrl, setPhotoUrl] = useState(null);
  const catName = categories.find(c => c.id === item.category)?.name ?? item.category;
  const locName = locations.find(l => l.id === item.location)?.name ?? item.location;

  useEffect(() => {
    if (!item.photoId) return;
    cachedPhoto(item.photoId).then(setPhotoUrl);
  }, [item.photoId]);

  return (
    <div className="item-card" onClick={onClick} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onClick()}>
      {photoUrl
        ? <img className="card-photo" src={photoUrl} alt={item.name} loading="lazy" />
        : <div className="card-photo-placeholder"><PhotoIcon /></div>
      }
      <div className="card-body">
        <div className="card-name">{item.name}</div>
        <div className="card-meta">
          {catName && <span className="card-cat"><TagIcon /> {catName}</span>}
          {locName && <span><PinIcon /> {locName}</span>}
        </div>
      </div>
      <div className="card-footer">
        <span className="card-qty">Qty: {item.quantity || 1}</span>
        {item.condition && (
          <span className={`card-condition ${COND_CLASS[item.condition] ?? ''}`}>{item.condition}</span>
        )}
      </div>
    </div>
  );
}

// ─── Item detail modal ────────────────────────────────────────
function ItemDetail({ item, categories, locations, onEdit, onDelete, onClose }) {
  const [photoUrl, setPhotoUrl] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const catName = categories.find(c => c.id === item.category)?.name ?? item.category;
  const locName = locations.find(l => l.id === item.location)?.name ?? item.location;

  useEffect(() => {
    cachedPhoto(item.photoId).then(setPhotoUrl);
  }, [item.photoId]);

  async function handleDelete() {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    setDeleting(true);
    await onDelete(item);
    onClose();
  }

  function closeOnBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="detail-overlay" onClick={closeOnBackdrop} role="dialog" aria-modal="true">
      <div className="detail-card">
        {photoUrl
          ? <img className="detail-photo" src={photoUrl} alt={item.name} />
          : <div className="detail-photo-placeholder"><PhotoIcon size={40} /></div>
        }
        <div className="detail-body">
          <div className="detail-name">{item.name}</div>
          <DetailRow label="Category" value={catName} />
          <DetailRow label="Location" value={locName} />
          <DetailRow label="Quantity" value={item.quantity || '1'} />
          <DetailRow label="Condition" value={item.condition} />
          {item.barcode && <DetailRow label="Barcode" value={item.barcode} />}
          {item.notes && <DetailRow label="Notes" value={item.notes} />}
          <DetailRow label="Added by" value={`${item.addedBy || '—'} on ${item.addedDate || '—'}`} />
          <div className="detail-actions">
            <button className="btn btn-secondary" onClick={() => { onClose(); onEdit(item); }}>Edit</button>
            <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
            <button className="btn btn-secondary" style={{ marginLeft: 'auto' }} onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: '55%' }}>{value || '—'}</span>
    </div>
  );
}

// ─── Main ItemList ────────────────────────────────────────────
export default function ItemList({ items, categories, locations, onAdd, onEdit, onDelete, onRefresh, loading }) {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [locFilter, setLocFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter(item => {
      if (catFilter && item.category !== catFilter) return false;
      if (locFilter && item.location !== locFilter) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.barcode?.includes(q) ||
        item.notes?.toLowerCase().includes(q)
      );
    });
  }, [items, search, catFilter, locFilter]);

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <span style={{ fontSize: '1.3rem' }}>🏠</span>
          <h1>Home Inventory</h1>
          <span className="header-sub">{items.length} items</span>
          <button
            className="btn btn-icon btn-secondary btn-sm"
            onClick={onRefresh}
            title="Refresh"
            disabled={loading}
            aria-label="Refresh"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 4v6h6M23 20v-6h-6"/>
              <path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Search bar */}
      <div className="search-bar">
        <div className="search-bar-inner">
          <div className="search-input-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="search-input"
              placeholder="Search by name, barcode, notes…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search items"
            />
          </div>
          <button
            className={`filter-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(f => !f)}
          >
            Filter {(catFilter || locFilter) ? '●' : ''}
          </button>
        </div>
      </div>

      {/* Filter chips */}
      {showFilters && (
        <div className="filter-row" role="group" aria-label="Filter by category or location">
          <button className={`chip ${!catFilter && !locFilter ? 'active' : ''}`}
            onClick={() => { setCatFilter(''); setLocFilter(''); }}>All</button>
          <span style={{ alignSelf: 'center', fontSize: '0.75rem', color: 'var(--text-3)', flexShrink: 0 }}>Category</span>
          {categories.map(c => (
            <button key={c.id} className={`chip ${catFilter === c.id ? 'active' : ''}`}
              onClick={() => setCatFilter(f => f === c.id ? '' : c.id)}>{c.name}</button>
          ))}
          <span style={{ alignSelf: 'center', fontSize: '0.75rem', color: 'var(--text-3)', flexShrink: 0 }}>Location</span>
          {locations.map(l => (
            <button key={l.id} className={`chip ${locFilter === l.id ? 'active' : ''}`}
              onClick={() => setLocFilter(f => f === l.id ? '' : l.id)}>{l.name}</button>
          ))}
        </div>
      )}

      {/* Items */}
      <div className="page">
        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <PhotoIcon size={48} />
            <h3>{items.length === 0 ? 'No items yet' : 'Nothing matches'}</h3>
            <p>{items.length === 0 ? 'Tap + to add your first item.' : 'Try a different search or filter.'}</p>
          </div>
        ) : (
          <div className="items-grid">
            {filtered.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                categories={categories}
                locations={locations}
                onClick={() => setSelectedItem(item)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add FAB */}
      <button className="fab" onClick={onAdd} aria-label="Add new item">+</button>

      {/* Item detail modal */}
      {selectedItem && (
        <ItemDetail
          item={selectedItem}
          categories={categories}
          locations={locations}
          onEdit={item => { setSelectedItem(null); onEdit(item); }}
          onDelete={async item => { photoCache.delete(item.photoId); await onDelete(item); }}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </>
  );
}

// ─── Icons ────────────────────────────────────────────────────
function PhotoIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <path d="M21 15l-5-5L5 21"/>
    </svg>
  );
}
function TagIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
      <circle cx="7" cy="7" r="1"/>
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );
}
