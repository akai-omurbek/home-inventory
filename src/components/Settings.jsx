// src/components/Settings.jsx
import { useState } from 'react';
import {
  addCategory, updateCategory, deleteCategory,
  addLocation, updateLocation, deleteLocation,
} from '../services/inventory.js';

export default function Settings({ categories, locations, onUpdate, onSignOut }) {
  return (
    <div className="settings-page">
      <ManageSection
        title="Categories"
        items={categories}
        onAdd={async name => { await addCategory(name); onUpdate(); }}
        onRename={async (item, name) => { await updateCategory({ ...item, name }); onUpdate(); }}
        onDelete={async item => { await deleteCategory(item.id); onUpdate(); }}
      />
      <ManageSection
        title="Locations"
        items={locations}
        onAdd={async name => { await addLocation({ name }); onUpdate(); }}
        onRename={async (item, name) => { await updateLocation({ ...item, name }); onUpdate(); }}
        onDelete={async item => { await deleteLocation(item.id); onUpdate(); }}
      />
      <div className="settings-section">
        <button className="btn btn-danger btn-full" onClick={onSignOut}>Sign out</button>
      </div>
    </div>
  );
}

function ManageSection({ title, items, onAdd, onRename, onDelete }) {
  const [newName, setNewName]   = useState('');
  const [adding, setAdding]     = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState('');

  async function handleAdd() {
    if (!newName.trim()) return;
    setBusy(true); setError('');
    try { await onAdd(newName.trim()); setNewName(''); setAdding(false); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function handleRename(item) {
    if (!editName.trim() || editName.trim() === item.name) { setEditingId(null); return; }
    setBusy(true); setError('');
    try { await onRename(item, editName.trim()); setEditingId(null); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.name}"? Items using it will show a blank ${title.toLowerCase().slice(0,-1)}.`)) return;
    setBusy(true); setError('');
    try { await onDelete(item); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditName(item.name);
  }

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <h2 className="settings-section-title">{title}</h2>
        <button className="btn btn-secondary btn-sm" onClick={() => setAdding(a => !a)}>
          {adding ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {adding && (
        <div className="settings-add-row">
          <input
            className="form-input"
            placeholder={`New ${title.toLowerCase().slice(0,-1)} name…`}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            autoFocus
          />
          <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={busy || !newName.trim()}>
            Add
          </button>
        </div>
      )}

      {error && <p className="settings-error">{error}</p>}

      <ul className="settings-list">
        {items.map(item => (
          <li key={item.id} className="settings-item">
            {editingId === item.id ? (
              <>
                <input
                  className="form-input"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRename(item); if (e.key === 'Escape') setEditingId(null); }}
                  autoFocus
                  style={{ flex: 1 }}
                />
                <button className="btn btn-primary btn-sm" onClick={() => handleRename(item)} disabled={busy}>Save</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
              </>
            ) : (
              <>
                <span className="settings-item-name">{item.name}</span>
                <button className="btn btn-secondary btn-sm btn-icon" onClick={() => startEdit(item)} aria-label={`Rename ${item.name}`} title="Rename">
                  <PencilIcon />
                </button>
                <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(item)} disabled={busy} aria-label={`Delete ${item.name}`} title="Delete">
                  <TrashIcon />
                </button>
              </>
            )}
          </li>
        ))}
        {items.length === 0 && (
          <li style={{ color: 'var(--text-3)', fontSize: '0.88rem', padding: '8px 0' }}>No {title.toLowerCase()} yet.</li>
        )}
      </ul>
    </div>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
    </svg>
  );
}
