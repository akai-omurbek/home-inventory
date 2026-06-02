// src/App.jsx
import { useState, useEffect, useCallback } from 'react';
import { call, hasToken, saveToken, clearToken, getStoredToken } from './services/api.js';

const CACHE_KEY = 'inv_data_cache';
function readCache() {
  try { return JSON.parse(sessionStorage.getItem(CACHE_KEY)); } catch { return null; }
}
function writeCache(items, categories, locations) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ items, categories, locations })); } catch {}
}
import { ensureSheets, getItems, getCategories, getLocations,
  addItem, updateItem, deleteItem, deletePhoto } from './services/inventory.js';
import Login from './components/Login.jsx';
import ItemList from './components/ItemList.jsx';
import ItemForm from './components/ItemForm.jsx';
import Settings from './components/Settings.jsx';

export default function App() {
  const [authed, setAuthed]         = useState(false);
  const [authChecking, setAuthChecking] = useState(true); // checking sessionStorage on load
  const [view, setView]             = useState('list');
  const [editTarget, setEditTarget] = useState(null);
  const [items, setItems]           = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations]   = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [toast, setToast]           = useState(null);

  // On load, check if there's a saved session
  useEffect(() => {
    if (hasToken()) {
      // Validate saved token with a quick ping
      call('ping').then(() => {
        setAuthed(true);
        setAuthChecking(false);
      }).catch(() => {
        clearToken();
        setAuthChecking(false);
      });
    } else {
      setAuthChecking(false);
    }
  }, []);

  const loadData = useCallback(async ({ skipCache = false, silent = false } = {}) => {
    if (!skipCache) {
      const cached = readCache();
      if (cached) {
        setItems(cached.items); setCategories(cached.categories); setLocations(cached.locations);
        loadData({ skipCache: true, silent: true }); // background refresh
        return;
      }
    }
    if (!silent) setDataLoading(true);
    try {
      await ensureSheets();
      const [i, c, l] = await Promise.all([getItems(), getCategories(), getLocations()]);
      setItems(i); setCategories(c); setLocations(l);
      writeCache(i, c, l);
    } catch (e) {
      if (!silent) {
        if (e.code === 'UNAUTHORIZED') { clearToken(); setAuthed(false); return; }
        showToast('Failed to load: ' + e.message);
      }
    } finally { if (!silent) setDataLoading(false); }
  }, []);

  useEffect(() => { if (authed) loadData(); }, [authed, loadData]);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  async function handleLogin(password) {
    // Validate by calling ping — throws UNAUTHORIZED if wrong
    await call('ping', {}, password);
    saveToken(password);
    setAuthed(true);
  }

  function handleSignOut() { clearToken(); sessionStorage.removeItem(CACHE_KEY); setAuthed(false); setView('list'); setItems([]); setCategories([]); setLocations([]); }

  async function handleSave(formData) {
    if (editTarget) {
      const updated = await updateItem({ ...editTarget, ...formData });
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
      showToast('Item updated');
    } else {
      const created = await addItem(formData);
      setItems(prev => [created, ...prev]);
      showToast('Item added');
    }
    setView('list'); setEditTarget(null);
  }

  async function handleDelete(item) {
    try {
      await deleteItem(item.id);
      if (item.photoId) await deletePhoto(item.photoId).catch(() => {});
      setItems(prev => prev.filter(i => i.id !== item.id));
      showToast('Item deleted');
    } catch (e) { showToast('Delete failed: ' + e.message); }
  }

  async function handleUpdateItem(item) {
    try {
      const updated = await updateItem(item);
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
      return updated;
    } catch (e) { showToast('Update failed: ' + e.message); }
  }

  async function handleSettingsUpdate() {
    const [c, l] = await Promise.all([getCategories(), getLocations()]);
    setCategories(c); setLocations(l);
    showToast('Saved');
  }

  if (authChecking) return <div className="loading"><div className="spinner" /></div>;
  if (!authed) return <Login onSignIn={handleLogin} />;

  return (
    <div className="app">
      {view === 'list' && (
        <ItemList
          items={items} categories={categories} locations={locations} loading={dataLoading}
          onAdd={() => { setEditTarget(null); setView('add'); }}
          onEdit={item => { setEditTarget(item); setView('edit'); }}
          onDelete={handleDelete} onRefresh={() => loadData({ skipCache: true })}
          onUpdateItem={handleUpdateItem} onSettings={() => setView('settings')}
        />
      )}

      {(view === 'add' || view === 'edit') && (
        <>
          <header className="header">
            <div className="header-inner">
              <button className="btn btn-icon btn-secondary btn-sm"
                onClick={() => { setView('list'); setEditTarget(null); }} aria-label="Back">
                <BackIcon />
              </button>
              <h1>{view === 'edit' ? 'Edit item' : 'Add item'}</h1>
            </div>
          </header>
          <ItemForm item={editTarget} categories={categories} locations={locations}
            onSave={handleSave} onCancel={() => { setView('list'); setEditTarget(null); }} />
        </>
      )}

      {view === 'settings' && (
        <>
          <header className="header">
            <div className="header-inner">
              <button className="btn btn-icon btn-secondary btn-sm"
                onClick={() => setView('list')} aria-label="Back"><BackIcon /></button>
              <h1>Settings</h1>
            </div>
          </header>
          <Settings categories={categories} locations={locations}
            onUpdate={handleSettingsUpdate} onSignOut={handleSignOut} />
        </>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function BackIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>;
}
