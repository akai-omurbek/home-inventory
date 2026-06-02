// src/services/google.js
// Low-level wrappers around Google Identity Services, Sheets API v4, Drive API v3.

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

class GoogleService {
  constructor() {
    this.tokenClient = null;
    this.accessToken = null;
    this.tokenExpiry = 0;
    this.userProfile = null;
    this._listeners = [];
    this._pendingResolve = null;
    this._pendingReject = null;
  }

  // ─── Init & Auth ──────────────────────────────────────────────

  async init(clientId) {
    this.clientId = clientId;
    // Wait for the GIS script tag to load
    await new Promise((resolve) => {
      if (window.google?.accounts?.oauth2) { resolve(); return; }
      const interval = setInterval(() => {
        if (window.google?.accounts?.oauth2) { clearInterval(interval); resolve(); }
      }, 100);
    });

    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: async (response) => {
        if (response.error) {
          this._pendingReject?.(new Error(response.error));
          this._pendingResolve = null;
          this._pendingReject = null;
          return;
        }
        this.accessToken = response.access_token;
        this.tokenExpiry = Date.now() + response.expires_in * 1000;
        // Fetch user profile
        try {
          const me = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${this.accessToken}` },
          }).then(r => r.json());
          this.userProfile = me;
        } catch (_) { /* non-fatal */ }
        this._pendingResolve?.();
        this._pendingResolve = null;
        this._pendingReject = null;
        this._notify({ signedIn: true, user: this.userProfile });
      },
    });
  }

  signIn() {
    return new Promise((resolve, reject) => {
      this._pendingResolve = resolve;
      this._pendingReject = reject;
      this.tokenClient.requestAccessToken({ prompt: '' });
    });
  }

  signOut() {
    if (this.accessToken) {
      window.google.accounts.oauth2.revoke(this.accessToken, () => {});
    }
    this.accessToken = null;
    this.tokenExpiry = 0;
    this.userProfile = null;
    this._notify({ signedIn: false });
  }

  isSignedIn() {
    return !!this.accessToken && Date.now() < this.tokenExpiry - 30_000;
  }

  async ensureToken() {
    if (!this.isSignedIn()) await this.signIn();
    return this.accessToken;
  }

  on(fn) { this._listeners.push(fn); }
  off(fn) { this._listeners = this._listeners.filter(l => l !== fn); }
  _notify(event) { this._listeners.forEach(l => l(event)); }

  // ─── Sheets helpers ────────────────────────────────────────────

  async _sheetsRequest(path, method = 'GET', body = null) {
    const token = await this.ensureToken();
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Sheets API error: ${res.status}`);
    }
    return res.status === 204 ? null : res.json();
  }

  async sheetsGetValues(spreadsheetId, range) {
    return this._sheetsRequest(`${spreadsheetId}/values/${encodeURIComponent(range)}`);
  }

  async sheetsAppend(spreadsheetId, range, values) {
    return this._sheetsRequest(
      `${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
      'POST',
      { values }
    );
  }

  async sheetsUpdate(spreadsheetId, range, values) {
    return this._sheetsRequest(
      `${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      'PUT',
      { values }
    );
  }

  async sheetsGetMeta(spreadsheetId) {
    return this._sheetsRequest(`${spreadsheetId}?fields=sheets.properties`);
  }

  async sheetsDeleteRow(spreadsheetId, sheetId, rowIndex) {
    return this._sheetsRequest(`${spreadsheetId}:batchUpdate`, 'POST', {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex,
            endIndex: rowIndex + 1,
          },
        },
      }],
    });
  }

  // ─── Drive helpers ────────────────────────────────────────────

  async _driveRequest(path, options = {}) {
    const token = await this.ensureToken();
    const { method = 'GET', body, isUpload = false } = options;
    const base = isUpload
      ? 'https://www.googleapis.com/upload/drive/v3'
      : 'https://www.googleapis.com/drive/v3';

    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body && !isUpload ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body } : {}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Drive API error: ${res.status}`);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  async driveFindOrCreateFolder(name, parentId = null) {
    const token = await this.ensureToken();
    const q = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentId ? ` and '${parentId}' in parents` : ''}`;
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    if (data.files?.length > 0) return data.files[0].id;

    // Create it
    const created = await this._driveRequest('/files', {
      method: 'POST',
      body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: parentId ? [parentId] : [] }),
    });
    return created.id;
  }

  async driveUpload(file, parentFolderId, fileName) {
    const token = await this.ensureToken();
    const metadata = { name: fileName, parents: [parentFolderId] };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
      { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }
    );
    if (!res.ok) throw new Error(`Photo upload failed: ${res.statusText}`);
    return res.json(); // { id }
  }

  async driveGetPhotoBlob(fileId) {
    const token = await this.ensureToken();
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }

  async driveDelete(fileId) {
    const token = await this.ensureToken();
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}

export const googleService = new GoogleService();
