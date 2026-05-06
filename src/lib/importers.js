// Best-effort parsers for CSV / Excel / PDF leaderboard imports.
// Each returns { rows, warnings } where each row is the normalized shape the
// /api/entries POST endpoint accepts. The admin UI shows the rows in a preview
// table so a human can fix anything that looks off before the bulk POST.

import { todayKey } from './leaderboard.js';
import { SCENARIOS } from './scenarios.js';
import { isBonusArea } from './scoring.js';

// Header synonyms — left side is the canonical key, right side is the list of
// header strings (lowercased) we accept from the file.
const HEADER_SYNONYMS = {
  date:               ['date', 'day', 'session date'],
  timestamp:          ['timestamp', 'time', 'datetime', 'when'],
  repName:            ['rep', 'rep name', 'sales rep', 'salesrep', 'player', 'name'],
  customerName:       ['customer', 'customer name', 'client', 'persona'],
  scenarioTitle:      ['scenario', 'scenario title', 'title', 'play'],
  scenarioCategory:   ['category', 'scenario category', 'cat'],
  score:              ['score', 'final score', 'points', 'total score'],
  behaviorsHit:       ['hits', 'behaviors hit', 'hit', 'behaviors_hit'],
  behaviorsTotal:     ['total', 'behaviors total', 'behaviors_total', 'out of', 'possible'],
  notes:              ['notes', 'manager notes', 'comments', 'note'],
  // Round-trip support for CSVs we exported ourselves: these columns list the
  // specific behaviors hit / missed as `behavior text [area]; behavior text [area]`.
  hitBehaviorsRaw:    ['hit_behaviors', 'behaviors hit list', 'hits list'],
  missedBehaviorsRaw: ['missed_behaviors', 'behaviors missed list', 'misses list'],
};

function normalizeHeader(raw) {
  const lower = String(raw || '').trim().toLowerCase();
  for (const [canonical, syns] of Object.entries(HEADER_SYNONYMS)) {
    if (syns.includes(lower)) return canonical;
  }
  return null;
}

function rowFromObject(obj) {
  const row = {
    date: '',
    timestamp: 0,
    repName: '',
    customerName: '',
    scenarioTitle: '',
    scenarioCategory: '',
    score: 0,
    behaviorsHit: 0,
    behaviorsTotal: 0,
    notes: '',
    hitBehaviorsRaw: '',
    missedBehaviorsRaw: '',
    // Populated downstream by expandWithScenario when the scenario is known.
    hitBehaviors: [],
    missedBehaviors: [],
    breakdown: [],
    scenarioMatched: false,
  };
  let matched = 0;

  for (const [rawKey, val] of Object.entries(obj)) {
    const key = normalizeHeader(rawKey);
    if (!key) continue;
    matched++;
    if (key === 'score' || key === 'behaviorsHit' || key === 'behaviorsTotal') {
      row[key] = Number(String(val).replace(/[^\d.-]/g, '')) || 0;
    } else if (key === 'timestamp') {
      const parsed = Date.parse(String(val));
      if (!Number.isNaN(parsed)) row.timestamp = parsed;
    } else {
      row[key] = String(val ?? '').trim();
    }
  }

  if (!row.timestamp && row.date) {
    const parsed = Date.parse(row.date);
    if (!Number.isNaN(parsed)) row.timestamp = parsed;
  }
  if (!row.timestamp) row.timestamp = Date.now();
  if (!row.date) {
    const d = new Date(row.timestamp);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    row.date = `${y}-${m}-${day}`;
  }

  return { row, matched };
}

// Looks up a scenario by title, tolerating case + whitespace differences.
function findScenario(title) {
  if (!title) return null;
  const t = String(title).trim();
  let s = SCENARIOS.find((sc) => sc.title === t);
  if (s) return s;
  const lower = t.toLowerCase();
  s = SCENARIOS.find((sc) => sc.title.toLowerCase() === lower);
  if (s) return s;
  const norm = lower.replace(/[^a-z0-9]/g, '');
  return SCENARIOS.find((sc) => sc.title.toLowerCase().replace(/[^a-z0-9]/g, '') === norm) || null;
}

// Parses "behavior text [area]; behavior text [area ⭐]" — the format the
// CSV export uses — into [{ behavior, area }] pairs.
function parseBehaviorList(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/;|\n|\|/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/^(.+?)\s*\[([^\]]+)\]\s*$/);
      if (m) {
        return {
          behavior: m[1].trim(),
          area: m[2].replace(/⭐/g, '').replace(/·\s*BONUS/i, '').trim(),
        };
      }
      return { behavior: s, area: '' };
    });
}

// Once the row's basic fields are extracted, find the matching scenario and
// populate hitBehaviors/missedBehaviors/breakdown. If the file carried a
// `hit_behaviors` column (e.g. an export round-trip), use those specifically;
// otherwise default to all-missed so an admin can open Edit and toggle.
export function expandWithScenario(row) {
  const scenario = findScenario(row.scenarioTitle);
  if (!scenario) {
    return { ...row, scenarioMatched: false };
  }

  const knownHits = parseBehaviorList(row.hitBehaviorsRaw);
  const hasSpecificHits = knownHits.length > 0;

  const hitBehaviors = [];
  const missedBehaviors = [];
  const breakdown = [];

  Object.entries(scenario.scorecard).forEach(([area, list]) => {
    let areaHits = 0;
    list.forEach((b) => {
      const matchedHit = hasSpecificHits && knownHits.some(
        (h) => h.behavior === b.behavior && (!h.area || h.area === area)
      );
      if (matchedHit) {
        areaHits += 1;
        hitBehaviors.push({ area, behavior: b.behavior });
      } else {
        missedBehaviors.push({
          area,
          behavior: b.behavior,
          bonus: isBonusArea(scenario, area),
        });
      }
    });
    breakdown.push({
      area,
      hits: areaHits,
      total: list.length,
      perfect: areaHits === list.length && list.length > 0,
      isBonus: isBonusArea(scenario, area),
    });
  });

  const totalBehaviors = hitBehaviors.length + missedBehaviors.length;

  return {
    ...row,
    scenarioMatched: true,
    scenarioCategory: row.scenarioCategory || scenario.category,
    hitBehaviors,
    missedBehaviors,
    breakdown,
    // If we got specific hits from the file, the count is authoritative.
    // Otherwise keep whatever number was in the import so the top-level score
    // and hit-count stay consistent with what the human typed.
    behaviorsHit: hasSpecificHits ? hitBehaviors.length : (row.behaviorsHit || 0),
    behaviorsTotal: totalBehaviors,
  };
}

// ---- CSV ---------------------------------------------------------------

export async function parseCsvFile(file) {
  const Papa = (await import('papaparse')).default;
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const warnings = [];
        const rows = [];
        result.data.forEach((obj, i) => {
          const { row, matched } = rowFromObject(obj);
          if (!matched) return;
          if (!row.repName && !row.scenarioTitle) {
            warnings.push(`Row ${i + 2}: skipped — no rep or scenario found`);
            return;
          }
          rows.push(expandWithScenario(row));
        });
        if (!rows.length) warnings.push('No usable rows found. Check the column headers — see the help text below.');
        appendMatchSummary(rows, warnings);
        resolve({ rows, warnings });
      },
      error: (err) => reject(err),
    });
  });
}

// ---- Excel -------------------------------------------------------------

export async function parseExcelFile(file) {
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return { rows: [], warnings: ['Workbook had no sheets.'] };
  const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const warnings = [];
  const rows = [];
  data.forEach((obj, i) => {
    const { row, matched } = rowFromObject(obj);
    if (!matched) return;
    if (!row.repName && !row.scenarioTitle) {
      warnings.push(`Row ${i + 2}: skipped — no rep or scenario found`);
      return;
    }
    rows.push(expandWithScenario(row));
  });
  if (!rows.length) warnings.push('No usable rows found. Make sure the first row of the sheet has column headers like rep, customer, scenario, score, hits, total.');
  appendMatchSummary(rows, warnings);
  return { rows, warnings };
}

// ---- PDF (best-effort) -------------------------------------------------

// PDF parsing is the messiest case. We pull text + position data per page and
// try to reconstruct rows by Y-coordinate. If the PDF was exported from the
// app's CSV (typed text, regular grid) this works well. Photographed/scanned
// PDFs need OCR, which we explicitly don't do — the warning calls that out.
export async function parsePdfFile(file) {
  const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;

  const allLines = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    // Group items by their Y position (rounded) to reconstruct lines.
    const byY = new Map();
    content.items.forEach((it) => {
      const y = Math.round(it.transform[5]);
      const x = it.transform[4];
      if (!byY.has(y)) byY.set(y, []);
      byY.get(y).push({ x, str: it.str });
    });
    Array.from(byY.entries())
      .sort((a, b) => b[0] - a[0]) // top to bottom (PDF y is from bottom)
      .forEach(([, items]) => {
        items.sort((a, b) => a.x - b.x);
        const line = items.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim();
        if (line) allLines.push(line);
      });
  }

  // Find a header-like line first.
  const headerIdx = allLines.findIndex((line) => {
    const lower = line.toLowerCase();
    return /\brep\b/.test(lower) && /\bscore\b/.test(lower);
  });

  const warnings = [];
  if (headerIdx < 0) {
    warnings.push("Couldn't find a header row in this PDF. The expected columns include rep, customer, scenario, score, hits, total. If the PDF is a scan/photo, this importer can't OCR it — please convert to CSV first.");
    return { rows: [], warnings };
  }

  // Best-effort: split the header line into column names and parse each
  // following line by greedy token matching.
  const headerCells = allLines[headerIdx].split(/\s{2,}|\t/).map((s) => s.trim()).filter(Boolean);
  const canonicalHeaders = headerCells.map(normalizeHeader);
  const dataLines = allLines.slice(headerIdx + 1);

  const rows = [];
  dataLines.forEach((line, i) => {
    const cells = line.split(/\s{2,}|\t/).map((s) => s.trim()).filter(Boolean);
    if (cells.length < 2) return;
    const obj = {};
    canonicalHeaders.forEach((key, idx) => {
      if (!key) return;
      obj[key] = cells[idx] ?? '';
    });
    if (!Object.keys(obj).length) {
      warnings.push(`Line ${i + 1}: couldn't map columns — skipping (${line.slice(0, 60)}…)`);
      return;
    }
    const { row, matched } = rowFromObject(obj);
    if (!matched) return;
    if (!row.repName && !row.scenarioTitle) return;
    rows.push(expandWithScenario(row));
  });

  if (!rows.length) {
    warnings.push("Found a header but couldn't parse any data rows. PDFs vary wildly — if this PDF was generated from a printed scorecard image, please convert it to CSV instead.");
  } else {
    warnings.unshift(`PDF parsing is best-effort — please review every row before importing. ${rows.length} row${rows.length === 1 ? '' : 's'} parsed.`);
  }

  appendMatchSummary(rows, warnings);
  return { rows, warnings };
}

function appendMatchSummary(rows, warnings) {
  if (!rows.length) return;
  const matched = rows.filter((r) => r.scenarioMatched).length;
  const unmatched = rows.length - matched;
  if (matched > 0) {
    const detail = rows.some((r) => r.scenarioMatched && r.hitBehaviors.length > 0)
      ? ' (specific hits detected from `hit_behaviors` column will populate the scorecard)'
      : ' (open *Edit* on each row after import to mark which behaviors were hit — they default to all-missed)';
    warnings.push(`${matched} row${matched === 1 ? '' : 's'} matched a scenario in the catalog and will have full hit/miss lists pre-populated${detail}.`);
  }
  if (unmatched > 0) {
    warnings.push(`${unmatched} row${unmatched === 1 ? '' : 's'} did not match any scenario in the current catalog. Those rows will save with no per-behavior data and won't be editable in the scorecard editor — fix the *SCENARIO* cell to match a real title before importing if you want full editing.`);
  }
}

// ---- Dispatcher --------------------------------------------------------

export async function parseImportFile(file) {
  if (!file) return { rows: [], warnings: ['No file selected.'] };
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.csv')) return parseCsvFile(file);
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return parseExcelFile(file);
  if (name.endsWith('.pdf')) return parsePdfFile(file);
  return { rows: [], warnings: [`Unsupported file type: ${file.name}. Use CSV, XLSX, or PDF.`] };
}

// Each row gets a deterministic ID derived from the file + row index so
// re-uploading the same file won't double-up (server has ON CONFLICT DO NOTHING).
export function makeImportId(filename, rowIdx) {
  const slug = String(filename || 'import')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return `import_${slug}_${rowIdx}`;
}

// Today's date as a fallback for rows missing a date.
export function defaultDate() {
  return todayKey();
}
