// Two separate rosters: customer-side and sales-rep-side. Names typed into
// either lobby field via "Add a new..." are persisted to localStorage so they
// show up in future meetings.

const DEFAULT_REP_ROSTER = [
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

const DEFAULT_CUSTOMER_ROSTER = [
  'Brooke',
  'Theresa',
  'Cris',
  'Zach',
  'Greg',
  'Tricia',
  'Neil',
  'Nolan',
  'Jackie',
];

const REP_STORAGE_KEY = 'wenger-roster:custom';
const CUSTOMER_STORAGE_KEY = 'wenger-roster:customer';

function loadCustom(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustom(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

function buildRoster(defaults, custom) {
  const seen = new Set();
  const out = [];
  [...defaults, ...custom].forEach((name) => {
    const key = name.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(name.trim());
  });
  return out.sort((a, b) => a.localeCompare(b));
}

function addCustom(defaults, key, name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return;
  const lower = trimmed.toLowerCase();
  if (defaults.some((n) => n.toLowerCase() === lower)) return;
  const custom = loadCustom(key);
  if (custom.some((n) => n.toLowerCase() === lower)) return;
  custom.push(trimmed);
  saveCustom(key, custom);
}

export function getRepRoster() {
  return buildRoster(DEFAULT_REP_ROSTER, loadCustom(REP_STORAGE_KEY));
}

export function addToRepRoster(name) {
  addCustom(DEFAULT_REP_ROSTER, REP_STORAGE_KEY, name);
}

export function getCustomerRoster() {
  return buildRoster(DEFAULT_CUSTOMER_ROSTER, loadCustom(CUSTOMER_STORAGE_KEY));
}

export function addToCustomerRoster(name) {
  addCustom(DEFAULT_CUSTOMER_ROSTER, CUSTOMER_STORAGE_KEY, name);
}
