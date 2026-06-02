// src/components/ItemList.jsx
import { useState, useMemo, lazy, Suspense } from 'react';
import { getPhotoUrl } from '../services/inventory.js';
const QRLabelModal = lazy(() => import('./QRLabelModal.jsx'));

const COND_CLASS = { New:'cond-new', Good:'cond-good', Fair:'cond-fair', Poor:'cond-poor' };

function sortItems(items, order) {
  return [...items].sort((a, b) => {
    if (order === 'za')     return b.name.localeCompare(a.name);
    if (order === 'newest') return (b.addedDate||'').localeCompare(a.addedDate||'');
    if (order === 'oldest') return (a.addedDate||'').localeCompare(b.addedDate||'');
    return a.name.localeCompare(b.name);
  });
}

// ─── Item card ────────────────────────────────────────────────
function ItemCard({ item, categories, locations, onClick }) {
  const catName = categories.find(c => c.id === item.category)?.name ?? '';
  const locName = locations.find(l => l.id === item.location)?.name ?? '';
  const photoUrl = getPhotoUrl(item.photoId); // synchronous — just constructs Drive URL
  const isAway  = item.status === 'away';

  return (
    <div className={`item-card ${isAway?'item-away':''}`} onClick={onClick}
      role="button" tabIndex={0} onKeyDown={e => e.key==='Enter' && onClick()}>
      <div style={{ position:'relative' }}>
        {photoUrl
          ? <img className="card-photo" src={photoUrl} alt={item.name} loading="lazy" />
          : <div className="card-photo-placeholder"><PhotoIcon /></div>
        }
        {isAway && (
          <div className="away-overlay">
            <span className="away-label">Away</span>
            {item.awayReason && <span className="away-sub">{item.awayReason}</span>}
          </div>
        )}
      </div>
      <div className="card-body">
        <div className="card-name">{item.name}</div>
        <div className="card-meta">
          {catName && <span className="card-cat"><TagIcon /> {catName}</span>}
          {locName && <span><PinIcon /> {locName}</span>}
        </div>
      </div>
      <div className="card-footer">
        <span className="card-qty">Qty: {item.quantity || 1}</span>
        {item.condition && <span className={`card-condition ${COND_CLASS[item.condition]??''}`}>{item.condition}</span>}
      </div>
    </div>
  );
}

// ─── Group section ────────────────────────────────────────────
function GroupSection({ title, items, categories, locations, onItemClick }) {
  return (
    <div className="group-section">
      <div className="group-header">
        <span className="group-name">{title}</span>
        <span className="group-count">{items.length}</span>
      </div>
      <div className="items-grid">
        {items.map(item => (
          <ItemCard key={item.id} item={item} categories={categories} locations={locations}
            onClick={() => onItemClick(item)} />
        ))}
      </div>
    </div>
  );
}

// ─── Item detail modal ────────────────────────────────────────
function ItemDetail({ item: init, categories, locations, onEdit, onDelete, onClose, onUpdateItem }) {
  const [item, setItem]             = useState(init);
  const [deleting, setDeleting]     = useState(false);
  const [qty, setQty]               = useState(parseInt(init.quantity) || 1);
  const [qtyBusy, setQtyBusy]       = useState(false);
  const [showAwayInput, setShowAwayInput] = useState(false);
  const [awayReason, setAwayReason] = useState('');
  const [statusBusy, setStatusBusy] = useState(false);

  const catName  = categories.find(c => c.id === item.category)?.name ?? item.category;
  const locName  = locations.find(l => l.id === item.location)?.name ?? item.location;
  const isAway   = item.status === 'away';
  const photoUrl = getPhotoUrl(item.photoId);

  async function changeQty(delta) {
    const next = Math.max(0, qty + delta);
    setQty(next); setQtyBusy(true);
    try { const u = await onUpdateItem({ ...item, quantity: String(next) }); if (u) setItem(u); }
    finally { setQtyBusy(false); }
  }

  async function markAway() {
    setStatusBusy(true);
    try {
      const u = await onUpdateItem({ ...item, status:'away', awayReason: awayReason.trim() });
      if (u) { setItem(u); setShowAwayInput(false); }
    } finally { setStatusBusy(false); }
  }

  async function markReturned() {
    setStatusBusy(true);
    try { const u = await onUpdateItem({ ...item, status:'home', awayReason:'' }); if (u) setItem(u); }
    finally { setStatusBusy(false); }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    setDeleting(true); await onDelete(item); onClose();
  }

  return (
    <div className="detail-overlay" onClick={e => e.target===e.currentTarget && onClose()} role="dialog" aria-modal="true">
      <div className="detail-card">
        {photoUrl
          ? <img className="detail-photo" src={photoUrl} alt={item.name} />
          : <div className="detail-photo-placeholder"><PhotoIcon size={40} /></div>
        }
        {isAway && <div className="away-banner">⚠ Away{item.awayReason ? ` — ${item.awayReason}` : ''}</div>}
        <div className="detail-body">
          <div className="detail-name">{item.name}</div>
          <DetailRow label="Category" value={catName} />
          <DetailRow label="Location"  value={locName} />
          <div className="detail-row">
            <span>Quantity</span>
            <div className="qty-control">
              <button className="qty-btn" onClick={() => changeQty(-1)} disabled={qtyBusy||qty<=0}>−</button>
              <span className="qty-value">{qty}</span>
              <button className="qty-btn" onClick={() => changeQty(1)} disabled={qtyBusy}>+</button>
            </div>
          </div>
          <DetailRow label="Condition" value={item.condition} />
          {item.barcode && <DetailRow label="Barcode" value={item.barcode} />}
          {item.notes   && <DetailRow label="Notes"   value={item.notes} />}
          <DetailRow label="Added by"  value={`${item.addedBy||'—'} on ${item.addedDate||'—'}`} />

          <div className="detail-away-section">
            {showAwayInput ? (
              <div className="away-input-row">
                <input className="form-input" value={awayReason} autoFocus
                  onChange={e => setAwayReason(e.target.value)}
                  placeholder="e.g. Borrowed by John, At repair shop…"
                  onKeyDown={e => e.key==='Enter' && markAway()} />
                <div style={{ display:'flex', gap:8, marginTop:8 }}>
                  <button className="btn btn-primary btn-sm" onClick={markAway} disabled={statusBusy}>Mark as away</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowAwayInput(false)}>Cancel</button>
                </div>
              </div>
            ) : isAway ? (
              <button className="btn btn-secondary btn-full" onClick={markReturned} disabled={statusBusy}>✓ Mark as returned</button>
            ) : (
              <button className="btn btn-secondary btn-full" onClick={() => { setAwayReason(''); setShowAwayInput(true); }}
                style={{ borderColor:'var(--warning)', color:'var(--warning)' }}>Mark as away</button>
            )}
          </div>

          <div className="detail-actions">
            <button className="btn btn-secondary" onClick={() => { onClose(); onEdit(item); }}>Edit</button>
            <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>{deleting?'Deleting…':'Delete'}</button>
            <button className="btn btn-secondary" style={{ marginLeft:'auto' }} onClick={onClose}>Close</button>
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
      <span style={{ fontWeight:500, textAlign:'right', maxWidth:'55%' }}>{value||'—'}</span>
    </div>
  );
}

// ─── Main ItemList ────────────────────────────────────────────
export default function ItemList({ items, categories, locations, onAdd, onEdit, onDelete,
  onRefresh, onUpdateItem, onSettings, loading, initialLocFilter }) {
  const [search, setSearch]       = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [locFilter, setLocFilter] = useState(initialLocFilter ?? '');
  const [showQR, setShowQR]       = useState(false);
  const [viewMode, setViewMode]   = useState(initialLocFilter ? 'location' : 'grid');
  const [showFilters, setShowFilters] = useState(false);
  const [sortOrder, setSortOrder] = useState('az');
  const [selectedItem, setSelectedItem] = useState(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let result = items.filter(item => {
      if (viewMode === 'away') return item.status === 'away';
      if (catFilter && item.category !== catFilter) return false;
      if (locFilter && item.location !== locFilter) return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || item.barcode?.includes(q) || item.notes?.toLowerCase().includes(q);
    });
    return sortItems(result, sortOrder);
  }, [items, search, catFilter, locFilter, sortOrder, viewMode]);

  const awayCount = useMemo(() => items.filter(i => i.status === 'away').length, [items]);

  function renderItems() {
    if (filtered.length === 0) return (
      <div className="empty-state">
        <PhotoIcon size={48} />
        <h3>{viewMode==='away' ? 'Nothing away right now' : items.length===0 ? 'No items yet' : 'Nothing matches'}</h3>
        <p>{viewMode==='away' ? 'Items marked as away will appear here.' : items.length===0 ? 'Tap + to add your first item.' : 'Try a different search or filter.'}</p>
      </div>
    );

    if (viewMode === 'category') {
      const grouped = categories.map(cat => ({ cat, items: filtered.filter(i => i.category===cat.id) })).filter(g => g.items.length>0);
      const other   = filtered.filter(i => !categories.find(c => c.id===i.category));
      return <>
        {grouped.map(({ cat, items: gi }) => <GroupSection key={cat.id} title={cat.name} items={gi} categories={categories} locations={locations} onItemClick={setSelectedItem} />)}
        {other.length > 0 && <GroupSection title="Uncategorised" items={other} categories={categories} locations={locations} onItemClick={setSelectedItem} />}
      </>;
    }

    if (viewMode === 'location') {
      const grouped = locations.map(loc => ({ loc, items: filtered.filter(i => i.location===loc.id) })).filter(g => g.items.length>0);
      const other   = filtered.filter(i => !locations.find(l => l.id===i.location));
      return <>
        {grouped.map(({ loc, items: gi }) => <GroupSection key={loc.id} title={loc.name} items={gi} categories={categories} locations={locations} onItemClick={setSelectedItem} />)}
        {other.length > 0 && <GroupSection title="No location" items={other} categories={categories} locations={locations} onItemClick={setSelectedItem} />}
      </>;
    }

    return <div className="items-grid">{filtered.map(item => <ItemCard key={item.id} item={item} categories={categories} locations={locations} onClick={() => setSelectedItem(item)} />)}</div>;
  }

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <span style={{ fontSize:'1.3rem' }}>🏠</span>
          <h1>Home Inventory</h1>
          <span className="header-sub">{items.length} items</span>
          <button className="btn btn-icon btn-secondary btn-sm" onClick={onRefresh} disabled={loading} aria-label="Refresh"><RefreshIcon /></button>
          <button className="btn btn-icon btn-secondary btn-sm" onClick={() => setShowQR(true)} aria-label="QR Labels"><QRIcon /></button>
          <button className="btn btn-icon btn-secondary btn-sm" onClick={onSettings} aria-label="Settings"><GearIcon /></button>
        </div>
      </header>

      <div className="search-bar">
        <div className="search-bar-inner">
          <div className="search-input-wrap">
            <SearchIcon />
            <input className="search-input" placeholder="Search by name, barcode, notes…"
              value={search} onChange={e => setSearch(e.target.value)} aria-label="Search" />
          </div>
          {viewMode === 'grid' && (
            <button className={`filter-btn ${showFilters?'active':''}`} onClick={() => setShowFilters(f=>!f)}>
              Filter {(catFilter||locFilter)?'●':''}
            </button>
          )}
        </div>
      </div>

      {showFilters && viewMode==='grid' && (
        <div className="filter-row">
          <button className={`chip ${!catFilter&&!locFilter?'active':''}`} onClick={() => { setCatFilter(''); setLocFilter(''); }}>All</button>
          <span style={{ alignSelf:'center', fontSize:'0.75rem', color:'var(--text-3)', flexShrink:0 }}>Cat</span>
          {categories.map(c => <button key={c.id} className={`chip ${catFilter===c.id?'active':''}`} onClick={() => setCatFilter(f=>f===c.id?'':c.id)}>{c.name}</button>)}
          <span style={{ alignSelf:'center', fontSize:'0.75rem', color:'var(--text-3)', flexShrink:0 }}>Loc</span>
          {locations.map(l => <button key={l.id} className={`chip ${locFilter===l.id?'active':''}`} onClick={() => setLocFilter(f=>f===l.id?'':l.id)}>{l.name}</button>)}
        </div>
      )}

      <div className="view-toolbar">
        <div className="view-tabs">
          {[{key:'grid',label:'Grid'},{key:'category',label:'Category'},{key:'location',label:'Location'},{key:'away',label:`Away${awayCount>0?` (${awayCount})`:''}`}].map(({key,label}) => (
            <button key={key} className={`view-tab ${viewMode===key?'active':''}`}
              onClick={() => { setViewMode(key); setShowFilters(false); setCatFilter(''); setLocFilter(''); }}>{label}</button>
          ))}
        </div>
        <select className="sort-select" value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
          <option value="az">A → Z</option>
          <option value="za">Z → A</option>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
      </div>

      <div className="page">
        {loading ? <div className="loading"><div className="spinner" /></div> : renderItems()}
      </div>

      <button className="fab" onClick={onAdd} aria-label="Add new item">+</button>

      {selectedItem && (
        <ItemDetail item={selectedItem} categories={categories} locations={locations}
          onEdit={item => { setSelectedItem(null); onEdit(item); }}
          onDelete={async item => { await onDelete(item); setSelectedItem(null); }}
          onClose={() => setSelectedItem(null)} onUpdateItem={onUpdateItem} />
      )}

      {showQR && (
        <Suspense fallback={null}>
          <QRLabelModal locations={locations} onClose={() => setShowQR(false)} />
        </Suspense>
      )}
    </>
  );
}

function PhotoIcon({ size=32 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>; }
function TagIcon()  { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><circle cx="7" cy="7" r="1"/></svg>; }
function PinIcon()  { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>; }
function RefreshIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15"/></svg>; }
function GearIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06-.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>; }
function SearchIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-3)',pointerEvents:'none'}} aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>; }
function QRIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/><path d="M14 18h3M18 14v3M21 21h-3v-3"/></svg>; }
