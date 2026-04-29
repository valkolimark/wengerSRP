// Leaderboard persistence. Keyed by date so each meeting starts fresh,
// but historical days remain inspectable in localStorage if you want them.

const PREFIX = 'wenger-leaderboard:';

export function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function load(date = todayKey()) {
  try {
    const raw = localStorage.getItem(PREFIX + date);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(entries, date = todayKey()) {
  try {
    localStorage.setItem(PREFIX + date, JSON.stringify(entries));
  } catch {
    /* ignore quota errors */
  }
}

export function getLeaderboard(date = todayKey()) {
  return load(date).sort((a, b) => b.score - a.score);
}

export function addEntry(entry, date = todayKey()) {
  const list = load(date);
  list.push({ ...entry, timestamp: Date.now() });
  save(list, date);
  return getLeaderboard(date);
}

export function clearLeaderboard(date = todayKey()) {
  try {
    localStorage.removeItem(PREFIX + date);
  } catch {
    /* ignore */
  }
}

export function getAllEntries() {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(PREFIX)) continue;
      const date = key.slice(PREFIX.length);
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      list.forEach((e) => out.push({ ...e, date }));
    }
  } catch {
    /* ignore */
  }
  return out.sort((a, b) => b.timestamp - a.timestamp);
}

function csvEscape(value) {
  if (value == null) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportCsv({ todayOnly = false } = {}) {
  const rows = todayOnly
    ? getLeaderboard().map((e) => ({ ...e, date: todayKey() }))
    : getAllEntries();

  // Collect every skill area seen across all rows so each gets its own column.
  const areaSet = new Set();
  rows.forEach((r) => {
    (r.breakdown || []).forEach((b) => areaSet.add(b.area));
  });
  const areas = Array.from(areaSet);

  const baseHeaders = [
    'date', 'time', 'rep', 'customer', 'scenario', 'category',
    'score', 'behaviors_hit', 'behaviors_total',
  ];
  const areaHeaders = areas.map((a) => `cat_${a.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`);
  const tailHeaders = ['hit_behaviors', 'missed_behaviors', 'breakdown_summary', 'notes'];
  const headers = [...baseHeaders, ...areaHeaders, ...tailHeaders];
  const lines = [headers.join(',')];

  rows.forEach((r) => {
    const t = r.timestamp ? new Date(r.timestamp) : null;
    const areaLookup = {};
    (r.breakdown || []).forEach((b) => { areaLookup[b.area] = b; });

    const areaCols = areas.map((a) => {
      const b = areaLookup[a];
      if (!b) return '';
      const flags = [];
      if (b.perfect) flags.push('PERFECT');
      if (b.isBonus) flags.push('BONUS');
      const flagSuffix = flags.length ? ` (${flags.join(',')})` : '';
      return csvEscape(`${b.hits}/${b.total}${flagSuffix}`);
    });

    const hitText = (r.hitBehaviors || []).map((h) => `${h.behavior} [${h.area}]`).join('; ');
    const missText = (r.missedBehaviors || []).map((m) => `${m.behavior} [${m.area}${m.bonus ? ' ⭐' : ''}]`).join('; ');
    const summary = (r.breakdown || []).map((b) => `${b.area}: ${b.hits}/${b.total}${b.perfect ? ' ✨' : ''}`).join('; ');

    lines.push([
      csvEscape(r.date || ''),
      csvEscape(t ? t.toLocaleTimeString() : ''),
      csvEscape(r.repName || ''),
      csvEscape(r.customerName || ''),
      csvEscape(r.scenarioTitle || ''),
      csvEscape(r.scenarioCategory || ''),
      csvEscape(r.score ?? ''),
      csvEscape(r.behaviorsHit ?? ''),
      csvEscape(r.behaviorsTotal ?? ''),
      ...areaCols,
      csvEscape(hitText),
      csvEscape(missText),
      csvEscape(summary),
      csvEscape(r.notes || ''),
    ].join(','));
  });

  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wenger-showdown-${todayOnly ? todayKey() : 'all'}-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return rows.length;
}
