// src/App.jsx
import { useState, useEffect, useCallback } from 'react';
import { googleService } from './services/google.js';
import { ensureSheets, getItems, getCategories, getLocations, addItem, updateItem, deleteItem, deletePhoto } from './services/inventory.js';
import { CONFIG } from './config.js';
import Login from './components/Login.jsx';
import ItemList from './components/ItemList.jsx';
import ItemForm from './components/ItemForm.jsx';
import Settings from './components/Settings.jsx';

export default function App() {
  const [ready, setReady]         = useState(false);
  const [signedIn, setSignedIn]   = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [view, setView]           = useState('list'); // 'list' | 'add' | 'edit' | 'settings'
  const [editTarget, setEditTarget] = useState(null);

  const [items, setItems]           = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations]   = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [toast, setToast]           = useState(null);

  useEffect(() => {
    googleService.init(CONFIG.CLIENT_ID).then(() => setReady(true));
    googleService.on(event => {
      if (event.signedIn === true)  { setSignedIn(true); setAuthLoading(false); }
      if (event.signedIn === false) { setSignedIn(false); setItems([]); setCategories([]); setLocations([]); }
    });
  }, []);

  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      await ensureSheets();
      const [i, c, l] = await Promise.all([getItems(), getCategories(), getLocations()]);
      setItems(i); setCategories(c); setLocations(l);
    } catch (e) {
      showToast('Failed to load data: ' + e.message);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => { if (signedIn) loadData(); }, [signedIn, loadData]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSignIn() {
    setAuthLoading(true);
    try { await googleService.signIn(); }
    catch (e) { setAuthLoading(false); showToast('Sign-in failed: ' + e.message); }
  }

  function handleSignOut() {
    googleService.signOut();
    setView('list');
  }

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

  async function handleUpdateQuantity(item, qty) {
    try {
      const updated = await updateItem({ ...item, quantity: String(qty) });
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
    } catch (e) { showToast('Update failed: ' + e.message); }
  }

  async function handleSettingsUpdate() {
    const [c, l] = await Promise.all([getCategories(), getLocations()]);
    setCategories(c); setLocations(l);
    showToast('Saved');
  }

  if (!ready) return <div className="loading"><div className="spinner" /></div>;
  if (!signedIn) return <Login onSignIn={handleSignIn} loading={authLoading} />;

  return (
    <div className="app">
      {view === 'list' && (
        <ItemList
          items={items} categories={categories} locations={locations}
          loading={dataLoading}
          onAdd={() => { setEditTarget(null); setView('add'); }}
          onEdit={item => { setEditTarget(item); setView('edit'); }}
          onDelete={handleDelete}
          onRefresh={loadData}
          onUpdateQuantity={handleUpdateQuantity}
          onSettings={() => setView('settings')}
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
          <ItemForm
            item={editTarget} categories={categories} locations={locations}
            onSave={handleSave}
            onCancel={() => { setView('list'); setEditTarget(null); }}
          />
        </>
      )}

      {view === 'settings' && (
        <>
          <header className="header">
            <div className="header-inner">
              <button className="btn btn-icon btn-secondary btn-sm"
                onClick={() => setView('list')} aria-label="Back">
                <BackIcon />
              </button>
              <h1>Settings</h1>
            </div>
          </header>
          <Settings
            categories={categories} locations={locations}
            onUpdate={handleSettingsUpdate}
            onSignOut={handleSignOut}
          />
        </>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5M12 19l-7-7 7-7"/>
    </svg>
  );
}
