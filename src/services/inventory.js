// src/services/inventory.js
import { googleService } from './google.js';
import { CONFIG } from '../config.js';

// Added status + awayReason columns (M, N) — existing rows just get '' for these
const ITEM_COLS = ['id','name','category','location','quantity','condition','barcode','photoId','notes','addedBy','addedDate','updatedDate','status','awayReason'];
const CAT_COLS  = ['id','name'];
const LOC_COLS  = ['id','name','type','parentId','description'];

function rowsToObjects(values = [], cols) {
  if (values.length < 2) return [];
  return values.slice(1)
    .filter(row => row[0])
    .map(row => Object.fromEntries(cols.map((c, i) => [c, row[i] ?? ''])));
}
function objectToRow(obj, cols) { return cols.map(c => obj[c] ?? ''); }
function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }
function today() { return new Date().toISOString().split('T')[0]; }

let _sheetIds = null;
async function getSheetIds() {
  if (_sheetIds) return _sheetIds;
  const meta = await googleService.sheetsGetMeta(CONFIG.SPREADSHEET_ID);
  _sheetIds = {};
  for (const s of meta.sheets ?? []) _sheetIds[s.properties.title] = s.properties.sheetId;
  return _sheetIds;
}

export async function ensureSheets() {
  const check = await googleService.sheetsGetValues(CONFIG.SPREADSHEET_ID, 'Items!A1').catch(() => null);
  if (check?.values) return;
  await googleService.sheetsUpdate(CONFIG.SPREADSHEET_ID, 'Items!A1:N1',      [ITEM_COLS]);
  await googleService.sheetsUpdate(CONFIG.SPREADSHEET_ID, 'Categories!A1:B1', [CAT_COLS]);
  await googleService.sheetsUpdate(CONFIG.SPREADSHEET_ID, 'Locations!A1:E1',  [LOC_COLS]);
  await googleService.sheetsAppend(CONFIG.SPREADSHEET_ID, 'Categories!A:B', [
    ['cat-1','Clothing'],['cat-2','Tools & Hardware'],['cat-3','Electronics'],
    ['cat-4','Kitchen & Dining'],['cat-5','Books & Media'],['cat-6','Sports & Outdoor'],
    ['cat-7','Cleaning & Supplies'],['cat-8','Toys & Games'],['cat-9','Documents & Files'],['cat-10','Other'],
  ]);
  await googleService.sheetsAppend(CONFIG.SPREADSHEET_ID, 'Locations!A:E', [
    ['loc-1','Living Room','room','',''],['loc-2','Kitchen','room','',''],
    ['loc-3','Master Bedroom','room','',''],['loc-4','Bedroom 2','room','',''],
    ['loc-5','Bathroom','room','',''],['loc-6','Garage','room','',''],
    ['loc-7','Basement','room','',''],['loc-8','Attic','room','',''],['loc-9','Storage Unit','room','',''],
  ]);
}

export async function getItems() {
  const data = await googleService.sheetsGetValues(CONFIG.SPREADSHEET_ID, 'Items!A:N');
  return rowsToObjects(data.values, ITEM_COLS);
}

export async function addItem(item) {
  const newItem = { status: 'home', awayReason: '', ...item, id: `item-${uid()}`,
    addedBy: googleService.userProfile?.email ?? '', addedDate: today(), updatedDate: today() };
  await googleService.sheetsAppend(CONFIG.SPREADSHEET_ID, 'Items!A:N', [objectToRow(newItem, ITEM_COLS)]);
  return newItem;
}

export async function updateItem(item) {
  const data = await googleService.sheetsGetValues(CONFIG.SPREADSHEET_ID, 'Items!A:A');
  const rowIdx = (data.values ?? []).findIndex(r => r[0] === item.id);
  if (rowIdx < 0) throw new Error(`Item ${item.id} not found`);
  const updated = { status: 'home', awayReason: '', ...item, updatedDate: today() };
  const rowNum = rowIdx + 1;
  await googleService.sheetsUpdate(CONFIG.SPREADSHEET_ID, `Items!A${rowNum}:N${rowNum}`, [objectToRow(updated, ITEM_COLS)]);
  return updated;
}

export async function deleteItem(itemId) {
  const data = await googleService.sheetsGetValues(CONFIG.SPREADSHEET_ID, 'Items!A:A');
  const rowIdx = (data.values ?? []).findIndex(r => r[0] === itemId);
  if (rowIdx < 0) return;
  const ids = await getSheetIds();
  await googleService.sheetsDeleteRow(CONFIG.SPREADSHEET_ID, ids['Items'] ?? 0, rowIdx);
}

export async function getCategories() {
  const data = await googleService.sheetsGetValues(CONFIG.SPREADSHEET_ID, 'Categories!A:B');
  return rowsToObjects(data.values, CAT_COLS);
}
export async function addCategory(name) {
  const cat = { id: `cat-${uid()}`, name };
  await googleService.sheetsAppend(CONFIG.SPREADSHEET_ID, 'Categories!A:B', [objectToRow(cat, CAT_COLS)]);
  return cat;
}
export async function updateCategory(cat) {
  const data = await googleService.sheetsGetValues(CONFIG.SPREADSHEET_ID, 'Categories!A:A');
  const rowIdx = (data.values ?? []).findIndex(r => r[0] === cat.id);
  if (rowIdx < 0) throw new Error('Category not found');
  await googleService.sheetsUpdate(CONFIG.SPREADSHEET_ID, `Categories!A${rowIdx+1}:B${rowIdx+1}`, [objectToRow(cat, CAT_COLS)]);
  return cat;
}
export async function deleteCategory(catId) {
  const data = await googleService.sheetsGetValues(CONFIG.SPREADSHEET_ID, 'Categories!A:A');
  const rowIdx = (data.values ?? []).findIndex(r => r[0] === catId);
  if (rowIdx < 0) return;
  const ids = await getSheetIds();
  await googleService.sheetsDeleteRow(CONFIG.SPREADSHEET_ID, ids['Categories'] ?? 1, rowIdx);
}

export async function getLocations() {
  const data = await googleService.sheetsGetValues(CONFIG.SPREADSHEET_ID, 'Locations!A:E');
  return rowsToObjects(data.values, LOC_COLS);
}
export async function addLocation(location) {
  const loc = { id: `loc-${uid()}`, type: 'room', parentId: '', description: '', ...location };
  await googleService.sheetsAppend(CONFIG.SPREADSHEET_ID, 'Locations!A:E', [objectToRow(loc, LOC_COLS)]);
  return loc;
}
export async function updateLocation(loc) {
  const data = await googleService.sheetsGetValues(CONFIG.SPREADSHEET_ID, 'Locations!A:A');
  const rowIdx = (data.values ?? []).findIndex(r => r[0] === loc.id);
  if (rowIdx < 0) throw new Error('Location not found');
  await googleService.sheetsUpdate(CONFIG.SPREADSHEET_ID, `Locations!A${rowIdx+1}:E${rowIdx+1}`, [objectToRow(loc, LOC_COLS)]);
  return loc;
}
export async function deleteLocation(locId) {
  const data = await googleService.sheetsGetValues(CONFIG.SPREADSHEET_ID, 'Locations!A:A');
  const rowIdx = (data.values ?? []).findIndex(r => r[0] === locId);
  if (rowIdx < 0) return;
  const ids = await getSheetIds();
  await googleService.sheetsDeleteRow(CONFIG.SPREADSHEET_ID, ids['Locations'] ?? 2, rowIdx);
}

let _photosFolder = null;
async function getPhotosFolder() {
  if (_photosFolder) return _photosFolder;
  _photosFolder = CONFIG.PHOTOS_FOLDER_ID
    ? CONFIG.PHOTOS_FOLDER_ID
    : await googleService.driveFindOrCreateFolder('home-inventory-photos');
  return _photosFolder;
}
export async function uploadPhoto(file, itemId) {
  const folder = await getPhotosFolder();
  const ext = file.name.split('.').pop() || 'jpg';
  const result = await googleService.driveUpload(file, folder, `${itemId}-${Date.now()}.${ext}`);
  return result.id;
}
export async function getPhotoUrl(photoId) {
  if (!photoId) return null;
  return googleService.driveGetPhotoBlob(photoId);
}
export async function deletePhoto(photoId) {
  if (!photoId) return;
  await googleService.driveDelete(photoId);
}
