// Talks to /api/entries on Vercel. Falls back to localStorage if the API is
// unreachable so the app stays usable in dev without a Postgres binding.

import {
  todayKey,
  getAllEntries as getAllLocalEntries,
  addEntry as addLocalEntry,
  exportCsvFromEntries,
} from './leaderboard.js';

const API_BASE = '/api/entries';
const MIGRATION_FLAG = 'wenger-cloud-migrated:v1';
const BACKUP_FLAG = 'wenger-local-backup:v1';
const ADMIN_KEY = 'wenger-admin-password';

export function getAdminPassword() {
  try { return sessionStorage.getItem(ADMIN_KEY) || ''; } catch { return ''; }
}

export function setAdminPassword(pw) {
  try {
    if (pw) sessionStorage.setItem(ADMIN_KEY, pw);
    else sessionStorage.removeItem(ADMIN_KEY);
  } catch {
    /* ignore */
  }
}

export function clearAdminPassword() {
  setAdminPassword('');
}

async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function fetchEntries({ date } = {}) {
  const url = date ? `${API_BASE}?date=${encodeURIComponent(date)}` : API_BASE;
  const data = await jsonFetch(url);
  return data.entries || [];
}

export async function createEntry(entry) {
  const data = await jsonFetch(API_BASE, {
    method: 'POST',
    body: JSON.stringify(entry),
  });
  return data.entry;
}

export async function updateEntry(id, patch) {
  const password = getAdminPassword();
  const data = await jsonFetch(`${API_BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'x-admin-password': password },
    body: JSON.stringify(patch),
  });
  return data.entry;
}

export async function deleteEntry(id) {
  const password = getAdminPassword();
  await jsonFetch(`${API_BASE}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { 'x-admin-password': password },
  });
}

export async function adminLogin(password) {
  const data = await jsonFetch('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
  if (data.ok) setAdminPassword(password);
  return data.ok === true;
}

// Triggers a one-time CSV download containing every entry currently in this
// device's localStorage. Runs once per device (gated by BACKUP_FLAG). Purpose:
// give the user a permanent file copy of their data BEFORE we touch anything,
// so even a worst-case migration failure or cloud wipe is recoverable.
export function backupLocalToFileOnce() {
  try {
    if (localStorage.getItem(BACKUP_FLAG) === '1') return { skipped: true, count: 0 };
  } catch {
    return { skipped: true, count: 0 };
  }

  const local = getAllLocalEntries();
  if (!local.length) {
    try { localStorage.setItem(BACKUP_FLAG, '1'); } catch { /* ignore */ }
    return { skipped: false, count: 0 };
  }

  const filename = `wenger-local-backup-${todayKey()}-${Date.now()}.csv`;
  try {
    exportCsvFromEntries(local, { filename });
    localStorage.setItem(BACKUP_FLAG, '1');
    return { skipped: false, count: local.length, filename };
  } catch (err) {
    console.warn('local backup failed', err);
    // Don't set the flag — give it another shot on the next load.
    return { skipped: false, count: 0, error: err.message };
  }
}

// One-shot per device: push every localStorage entry up to the cloud. Only
// marks the device as fully migrated when every entry succeeded, so transient
// failures get retried on the next lobby load (deterministic IDs + the API's
// ON CONFLICT DO NOTHING make retries idempotent — succeeded entries won't
// double-up). localStorage is preserved either way as a last-resort backup.
export async function migrateLocalToCloudOnce() {
  try {
    if (localStorage.getItem(MIGRATION_FLAG) === '1') return { migrated: 0, skipped: true };
  } catch {
    return { migrated: 0, skipped: true };
  }

  const local = getAllLocalEntries();
  if (!local.length) {
    try { localStorage.setItem(MIGRATION_FLAG, '1'); } catch { /* ignore */ }
    return { migrated: 0, skipped: false };
  }

  let migrated = 0;
  let failed = 0;
  for (const entry of local) {
    try {
      await createEntry({
        id: `migrated_${entry.timestamp}_${(entry.repName || '').replace(/\s+/g, '_')}`,
        timestamp: entry.timestamp,
        date: entry.date || todayKey(),
        repName: entry.repName,
        customerName: entry.customerName,
        scenarioTitle: entry.scenarioTitle,
        scenarioCategory: entry.scenarioCategory,
        score: entry.score,
        behaviorsHit: entry.behaviorsHit,
        behaviorsTotal: entry.behaviorsTotal,
        breakdown: entry.breakdown || [],
        hitBehaviors: entry.hitBehaviors || [],
        missedBehaviors: entry.missedBehaviors || [],
        notes: entry.notes || '',
      });
      migrated++;
    } catch (err) {
      failed++;
      console.warn('migration failed for entry', entry.timestamp, err.message);
    }
  }

  // Only set the "done" flag when every entry made it. Otherwise the next
  // load tries again — failed entries stay in localStorage, succeeded entries
  // get deduped server-side, and we don't lose any data.
  if (failed === 0) {
    try { localStorage.setItem(MIGRATION_FLAG, '1'); } catch { /* ignore */ }
  }
  return { migrated, failed, skipped: false };
}

// Used as an offline fallback so the app doesn't break in dev without Postgres.
export function localFallbackAdd(entry) {
  return addLocalEntry(entry);
}
