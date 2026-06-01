# 🏠 Home Inventory

A household item tracker with Google Sheets as the database and Google Drive for photos.
Runs as a static React app on GitHub Pages — no server, no monthly fees.

## Features

- **Search & filter** across all items instantly
- **Barcode / QR scanning** via phone camera
- **Photos** stored in your Google Drive
- **Locations** — rooms, boxes, shelves
- **Categories** — clothing, tools, electronics, etc.
- **Quantity & condition** tracking
- **Multi-user** — share the spreadsheet with your household; each person signs in with their own Google account
- All data lives in YOUR Google Drive (not a third-party service)

---

## Setup (one-time, ~15 min)

### Step 1 — Create a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click **Select a project → New Project** → name it "Home Inventory" → Create
3. In the left menu: **APIs & Services → Library**
4. Search and **Enable** each of these:
   - Google Sheets API
   - Google Drive API

### Step 2 — Create OAuth credentials

1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
2. Configure the consent screen first if prompted:
   - User type: **External**
   - App name: "Home Inventory"
   - Add yourself as a test user
3. Application type: **Web application**
4. Name: "Home Inventory"
5. **Authorized JavaScript origins** — add both:
   - `http://localhost:5173` (for local development)
   - `https://YOUR_GITHUB_USERNAME.github.io` (for the deployed app)
6. Click **Create** and copy the **Client ID**

### Step 3 — Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a blank spreadsheet
2. Name it "Home Inventory"
3. Add three sheets (tabs) named exactly:
   - `Items`
   - `Categories`
   - `Locations`
4. Share the spreadsheet with your household members (Editor access)
5. Copy the spreadsheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/THIS_IS_THE_ID/edit
   ```

### Step 4 — Configure the app

Edit `src/config.js`:

```js
export const CONFIG = {
  CLIENT_ID: 'your-client-id.apps.googleusercontent.com',
  SPREADSHEET_ID: 'your-spreadsheet-id',
};
```

### Step 5 — Deploy to GitHub Pages

1. Push this repo to GitHub
2. In your repo: **Settings → Pages → Source → GitHub Actions**
3. Push to `main` — the Action will build and deploy automatically
4. Update `vite.config.js` with your repo name:
   ```js
   base: '/your-repo-name/',
   ```
5. Your app will be live at `https://YOUR_USERNAME.github.io/your-repo-name/`

### Step 6 — Add your domain to Google Cloud

Back in Google Cloud → **Credentials → edit your OAuth client**:
- Add `https://YOUR_USERNAME.github.io/your-repo-name` to **Authorized JavaScript origins**

---

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:5173/home-inventory/` (or whatever your base path is).

---

## How it works

| Part | Technology |
|------|-----------|
| Frontend | React 18 + Vite |
| Hosting | GitHub Pages (free) |
| Auth | Google OAuth 2.0 via GIS library |
| Database | Google Sheets (Items / Categories / Locations tabs) |
| Photo storage | Google Drive folder `home-inventory-photos/` |
| Barcode scanning | `@zxing/browser` — works in any browser with camera access |

### Data model

**Items sheet** columns: `id, name, category, location, quantity, condition, barcode, photoId, notes, addedBy, addedDate, updatedDate`

**Categories sheet**: `id, name`

**Locations sheet**: `id, name, type, parentId, description`

The app seeds default categories and locations on first run. You can add more directly in the app or in the spreadsheet.

---

## Multi-user setup

1. The person who set up the Google Cloud project shares the spreadsheet (Editor) with other household members
2. Each member opens the app and signs in with their own Google account
3. The app uses their OAuth token to read/write the shared spreadsheet
4. Each item records `addedBy` (email) for accountability

> **Note:** Each user must approve the OAuth consent screen on first sign-in. If you're using a test app (not published to Google), add each email as a test user in the Google Cloud consent screen settings.

---

## Customising categories & locations

The easiest way is to edit the Categories and Locations sheets in Google Sheets directly.
Column formats must match exactly (see data model above). The app reloads data on each refresh.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Sign-in failed" | Check the Client ID in config.js and that your domain is in Authorized Origins |
| Spreadsheet not found | Check the SPREADSHEET_ID and that you've shared the sheet with your Google account |
| Camera won't open | HTTPS is required; localhost is fine, but must be deployed over HTTPS for barcode scanning |
| Photos not showing | Drive API needs `drive.file` scope; sign out and sign in again to re-grant permissions |
| 403 on Sheets | Check that Sheets API and Drive API are both enabled in your Google Cloud project |
