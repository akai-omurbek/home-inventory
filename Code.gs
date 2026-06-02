// ─────────────────────────────────────────────────────────────
//  Home Inventory — Google Apps Script backend
//  
//  Setup:
//  1. Paste this file into script.google.com (new project)
//  2. Fill in SPREADSHEET_ID and TOKEN below
//  3. Deploy → New deployment → Web app
//     Execute as: Me
//     Who has access: Anyone
//  4. Copy the web app URL into your React app's config.js
// ─────────────────────────────────────────────────────────────

const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID'; // from your Google Sheet URL
const TOKEN          = 'CHANGE_THIS_TO_A_LONG_RANDOM_PASSWORD'; // shared household password

const ITEM_COLS = ['id','name','category','location','quantity','condition','barcode','photoId','notes','addedBy','addedDate','updatedDate','status','awayReason'];
const CAT_COLS  = ['id','name'];
const LOC_COLS  = ['id','name','type','parentId','description'];

// ─── Entry points ─────────────────────────────────────────────

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.token !== TOKEN) return respond({ error: 'Unauthorized' });
    return dispatch(body.action, body.data || {});
  } catch(err) {
    return respond({ error: err.message });
  }
}

function doGet(e) {
  try {
    const p = e.parameter || {};
    if (p.token !== TOKEN) return respond({ error: 'Unauthorized' });
    return dispatch(p.action, p);
  } catch(err) {
    return respond({ error: err.message });
  }
}

function respond(data) {
  const out = ContentService.createTextOutput(JSON.stringify(data));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}

// ─── Router ───────────────────────────────────────────────────

function dispatch(action, data) {
  switch(action) {
    case 'ping':          return respond({ ok: true });
    case 'ensureSheets':  return respond({ ok: ensureSheets() });

    case 'getItems':      return respond({ items: readSheet('Items', ITEM_COLS) });
    case 'getCategories': return respond({ categories: readSheet('Categories', CAT_COLS) });
    case 'getLocations':  return respond({ locations: readSheet('Locations', LOC_COLS) });

    case 'addItem':       return respond({ item: appendRow('Items', ITEM_COLS, withMeta(data)) });
    case 'updateItem':    return respond({ item: updateRow('Items', ITEM_COLS, withUpdated(data)) });
    case 'deleteItem':    return respond({ ok: deleteRow('Items', data.id) });

    case 'addCategory':    return respond({ category: appendRow('Categories', CAT_COLS, { id: uid(), ...data }) });
    case 'updateCategory': return respond({ category: updateRow('Categories', CAT_COLS, data) });
    case 'deleteCategory': return respond({ ok: deleteRow('Categories', data.id) });

    case 'addLocation':    return respond({ location: appendRow('Locations', LOC_COLS, { id: uid(), type: 'room', parentId: '', description: '', ...data }) });
    case 'updateLocation': return respond({ location: updateRow('Locations', LOC_COLS, data) });
    case 'deleteLocation': return respond({ ok: deleteRow('Locations', data.id) });

    case 'uploadPhoto': return respond({ photoId: uploadPhoto(data.base64, data.mimeType, data.fileName) });
    case 'deletePhoto': return respond({ ok: deletePhoto(data.photoId) });

    default: return respond({ error: 'Unknown action: ' + action });
  }
}

// ─── Sheets helpers ───────────────────────────────────────────

function ss() { return SpreadsheetApp.openById(SPREADSHEET_ID); }

function readSheet(name, cols) {
  const sheet = ss().getSheetByName(name);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getRange(1, 1, sheet.getLastRow(), cols.length).getValues();
  return values.slice(1)
    .filter(row => row[0])
    .map(row => Object.fromEntries(cols.map((c, i) => [c, String(row[i] ?? '')])));
}

function appendRow(name, cols, obj) {
  ss().getSheetByName(name).appendRow(cols.map(c => obj[c] ?? ''));
  return obj;
}

function updateRow(name, cols, obj) {
  const sheet = ss().getSheetByName(name);
  const ids = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues().flat();
  const idx = ids.indexOf(obj.id);
  if (idx < 0) throw new Error('Row not found: ' + obj.id);
  sheet.getRange(idx + 1, 1, 1, cols.length).setValues([cols.map(c => obj[c] ?? '')]);
  return obj;
}

function deleteRow(name, id) {
  const sheet = ss().getSheetByName(name);
  const ids = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues().flat();
  const idx = ids.indexOf(id);
  if (idx < 0) return false;
  sheet.deleteRow(idx + 1);
  return true;
}

// ─── Drive helpers ────────────────────────────────────────────

function getPhotosFolder() {
  const folders = DriveApp.getFoldersByName('home-inventory-photos');
  return folders.hasNext() ? folders.next() : DriveApp.createFolder('home-inventory-photos');
}

function uploadPhoto(base64, mimeType, fileName) {
  const blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, fileName);
  const file = getPhotosFolder().createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getId();
}

function deletePhoto(photoId) {
  if (!photoId) return false;
  try { DriveApp.getFileById(photoId).setTrashed(true); return true; }
  catch(e) { return false; }
}

// ─── Spreadsheet bootstrap ────────────────────────────────────

function ensureSheets() {
  const spreadsheet = ss();
  [
    { name: 'Items',      cols: ITEM_COLS },
    { name: 'Categories', cols: CAT_COLS },
    { name: 'Locations',  cols: LOC_COLS },
  ].forEach(({ name, cols }) => {
    let sheet = spreadsheet.getSheetByName(name);
    if (!sheet) sheet = spreadsheet.insertSheet(name);
    if (!sheet.getRange('A1').getValue()) {
      sheet.getRange(1, 1, 1, cols.length).setValues([cols]);
    }
  });

  const cats = spreadsheet.getSheetByName('Categories');
  if (cats.getLastRow() <= 1) {
    cats.getRange(2, 1, 10, 2).setValues([
      ['cat-1','Clothing'],['cat-2','Tools & Hardware'],['cat-3','Electronics'],
      ['cat-4','Kitchen & Dining'],['cat-5','Books & Media'],['cat-6','Sports & Outdoor'],
      ['cat-7','Cleaning & Supplies'],['cat-8','Toys & Games'],['cat-9','Documents & Files'],['cat-10','Other'],
    ]);
  }

  const locs = spreadsheet.getSheetByName('Locations');
  if (locs.getLastRow() <= 1) {
    locs.getRange(2, 1, 9, 5).setValues([
      ['loc-1','Living Room','room','',''],['loc-2','Kitchen','room','',''],
      ['loc-3','Master Bedroom','room','',''],['loc-4','Bedroom 2','room','',''],
      ['loc-5','Bathroom','room','',''],['loc-6','Garage','room','',''],
      ['loc-7','Basement','room','',''],['loc-8','Attic','room','',''],
      ['loc-9','Storage Unit','room','',''],
    ]);
  }
  return true;
}

// ─── Utilities ────────────────────────────────────────────────

function uid() { return Utilities.getUuid(); }
function today() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function withMeta(data) { return { status: 'home', awayReason: '', ...data, id: uid(), addedDate: today(), updatedDate: today() }; }
function withUpdated(data) { return { ...data, updatedDate: today() }; }
