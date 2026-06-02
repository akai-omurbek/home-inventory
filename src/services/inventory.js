// src/services/inventory.js
import { call } from './api.js';

// ─── Bootstrap ────────────────────────────────────────────────
export async function ensureSheets() { await call('ensureSheets'); }

// ─── Items ────────────────────────────────────────────────────
export async function getItems()       { const r = await call('getItems');  return r.items ?? []; }
export async function addItem(item)    { const r = await call('addItem', item);   return r.item; }
export async function updateItem(item) { const r = await call('updateItem', item); return r.item; }
export async function deleteItem(id)   { await call('deleteItem', { id }); }

// ─── Categories ───────────────────────────────────────────────
export async function getCategories()       { const r = await call('getCategories'); return r.categories ?? []; }
export async function addCategory(name)     { const r = await call('addCategory', { name }); return r.category; }
export async function updateCategory(cat)   { const r = await call('updateCategory', cat); return r.category; }
export async function deleteCategory(id)    { await call('deleteCategory', { id }); }

// ─── Locations ────────────────────────────────────────────────
export async function getLocations()        { const r = await call('getLocations'); return r.locations ?? []; }
export async function addLocation(loc)      { const r = await call('addLocation', loc); return r.location; }
export async function updateLocation(loc)   { const r = await call('updateLocation', loc); return r.location; }
export async function deleteLocation(id)    { await call('deleteLocation', { id }); }

// ─── Photos ───────────────────────────────────────────────────

// Photos are stored in Drive with public-link access.
// We construct the URL directly — no API fetch needed to display them.
export function getPhotoUrl(photoId) {
  if (!photoId) return null;
  return `https://drive.google.com/uc?export=view&id=${photoId}`;
}

// Compress image to max 1200px / 0.82 quality before uploading
async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      const MAX = 1200;
      const ratio = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        const reader = new FileReader();
        reader.onload = e => resolve({ base64: e.target.result.split(',')[1], mimeType: 'image/jpeg' });
        reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.82);
    };
    img.onerror = reject;
    img.src = objUrl;
  });
}

export async function uploadPhoto(file, itemId) {
  const { base64, mimeType } = await compressImage(file);
  const r = await call('uploadPhoto', { base64, mimeType, fileName: `${itemId}-${Date.now()}.jpg` });
  return r.photoId;
}

export async function deletePhoto(photoId) {
  if (!photoId) return;
  await call('deletePhoto', { photoId });
}
