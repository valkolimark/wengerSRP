// Wenger sales team roster. Names typed into the lobby are also persisted to
// localStorage so any "Add new..." entry shows up in future meetings.

const DEFAULT_ROSTER = [
  'Austin Wheless',
  'Aaron Francl',
  'Jason Berkey',
  'Chris Storjohann',
  'Brandon Booth',
  'Brenda Houglum',
  'Ryan Anderson',
  'Carissa Shimko',
  'Jeremy DuBois',
  'Beth Newton',
  'Brian Parido',
  'Cole Nasman',
  'Mike Stermer',
  'Joey Resendez',
  'Michael Ferch',
  'Lisa Lewis',
  'Jeff Frost',
  'Mary Redd',
  'Jason Madigan',
  'Julie Webber',
  'Linda Leng',
  'Doug Tripp',
  'Katelyn Payne',
  'Chris Thompson',
  'Gianna Cainzos',
  'Mary Steidler',
  'Lance Landgren',
  'Adam Martin',
  'Tim Pounds',
  'Christian Dasher',
  'Trevor Dougherty',
  'Ashley Betz White',
  'Tam Trutwin',
  'Anna Squire',
  'Tyler Shank',
  'Jessica Wrightsel',
  'Joni Mullen',
];

const STORAGE_KEY = 'wenger-roster:custom';

function loadCustom() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustom(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function getRoster() {
  const custom = loadCustom();
  const seen = new Set();
  const out = [];
  [...DEFAULT_ROSTER, ...custom].forEach((name) => {
    const key = name.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(name.trim());
  });
  return out.sort((a, b) => a.localeCompare(b));
}

export function addToRoster(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return;
  const lower = trimmed.toLowerCase();
  const existsInDefault = DEFAULT_ROSTER.some((n) => n.toLowerCase() === lower);
  if (existsInDefault) return;
  const custom = loadCustom();
  if (custom.some((n) => n.toLowerCase() === lower)) return;
  custom.push(trimmed);
  saveCustom(custom);
}
