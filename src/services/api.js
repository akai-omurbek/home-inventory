// src/services/api.js
// Talks to the Google Apps Script backend.
// Password is stored in sessionStorage so users only enter it once per browser session.

import { CONFIG } from '../config.js';

const SESSION_KEY = 'inv_pwd';

export function getStoredToken() { return localStorage.getItem(SESSION_KEY) || ''; }
export function saveToken(t)     { localStorage.setItem(SESSION_KEY, t); }
export function clearToken()     { localStorage.removeItem(SESSION_KEY); }
export function hasToken()       { return !!getStoredToken(); }

export async function call(action, data = {}, token = null) {
  const pwd = token ?? getStoredToken();
  const res = await fetch(CONFIG.SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({ token: pwd, action, data }),
  });
  if (!res.ok) throw new Error(`Network error: ${res.status}`);
  const json = await res.json();
  if (json.error === 'Unauthorized') { const e = new Error('UNAUTHORIZED'); e.code = 'UNAUTHORIZED'; throw e; }
  if (json.error) throw new Error(json.error);
  return json;
}
