import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Logo from './Logo.jsx';
import {
  fetchEntries,
  updateEntry,
  deleteEntry,
  adminLogin,
  getAdminPassword,
  clearAdminPassword,
} from '../lib/cloudLeaderboard.js';
import { exportCsvFromEntries } from '../lib/leaderboard.js';
import { SCENARIOS } from '../lib/scenarios.js';
import { computeScore, isBonusArea, pointsForBehavior } from '../lib/scoring.js';
import AdminBulkImport from './AdminBulkImport.jsx';
import CoachingReport from './CoachingReport.jsx';
import EntryDetail from './EntryDetail.jsx';

function fmtDateTime(ts) {
  try {
    return new Date(Number(ts)).toLocaleString();
  } catch {
    return '';
  }
}

export default function Admin({ onExit }) {
  const [authed, setAuthed] = useState(!!getAdminPassword());
  return authed
    ? <AdminConsole onLogout={() => { clearAdminPassword(); setAuthed(false); }} onExit={onExit} />
    : <AdminLogin onAuthed={() => setAuthed(true)} onExit={onExit} />;
}

function AdminLogin({ onAuthed, onExit }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e?.preventDefault();
    if (!password) return;
    setBusy(true);
    setError('');
    try {
      const ok = await adminLogin(password);
      if (ok) onAuthed();
      else setError('Wrong password.');
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-grid p-6">
      <form onSubmit={submit} className="card p-8 w-full max-w-md space-y-5">
        <div className="flex items-center gap-3">
          <Logo variant="dk" size="sm" />
          <div>
            <div className="font-display text-3xl tracking-wider">ADMIN</div>
            <div className="text-xs text-white/50">Cross-device leaderboard control</div>
          </div>
        </div>

        <label className="block">
          <div className="text-[10px] tracking-[0.25em] text-white/50 font-semibold mb-1">PASSWORD</div>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-navy-deep/60 border border-white/15 rounded-xl px-4 py-3 font-semibold focus:outline-none focus:border-white/40"
          />
        </label>

        {error && <div className="text-warning text-sm">{error}</div>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy || !password}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'CHECKING…' : 'SIGN IN'}
          </button>
          <button
            type="button"
            onClick={onExit}
            className="btn-secondary"
          >
            BACK
          </button>
        </div>
      </form>
    </div>
  );
}

function AdminConsole({ onLogout, onExit }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showImport, setShowImport] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [sortBy, setSortBy] = useState(null); // { column, dir } | null — null = grouped-by-date default

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchEntries()
      .then((rows) => { if (!cancelled) setEntries(rows); })
      .catch((e) => { if (!cancelled) setErr(e.message || 'Load failed.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const filtered = useMemo(() => {
    if (!filter) return entries;
    const needle = filter.toLowerCase();
    return entries.filter((e) => {
      const hay = `${e.repName} ${e.customerName} ${e.scenarioTitle} ${e.scenarioCategory} ${e.notes || ''}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [entries, filter]);

  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((e) => {
      const d = e.date || 'unknown';
      if (!map.has(d)) map.set(d, []);
      map.get(d).push(e);
    });
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, rows]) => [date, rows.sort((a, b) => b.timestamp - a.timestamp)]);
  }, [filtered]);

  const flatSorted = useMemo(() => {
    if (!sortBy) return null;
    const { column, dir } = sortBy;
    const valueOf = (e) => {
      switch (column) {
        case 'time':     return e.timestamp || 0;
        case 'rep':      return (e.repName || '').toLowerCase();
        case 'customer': return (e.customerName || '').toLowerCase();
        case 'scenario': return (e.scenarioTitle || '').toLowerCase();
        case 'score':    return e.score || 0;
        case 'hits':     return e.behaviorsHit || 0;
        default:         return 0;
      }
    };
    return [...filtered].sort((a, b) => {
      const av = valueOf(a);
      const bv = valueOf(b);
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortBy]);

  function clickSort(column) {
    setSortBy((prev) => {
      if (!prev || prev.column !== column) {
        // First click on a numeric column starts at desc (highest first), text starts asc.
        const isNumeric = column === 'score' || column === 'hits' || column === 'time';
        return { column, dir: isNumeric ? 'desc' : 'asc' };
      }
      return { column, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
    });
  }

  function clearSort() { setSortBy(null); }

  async function handleDelete(entry) {
    if (!confirm(`Delete ${entry.repName} · ${entry.scenarioTitle}? This can't be undone.`)) return;
    try {
      await deleteEntry(entry.id);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      alert(`Delete failed: ${e.message}`);
    }
  }

  function startEdit(entry) {
    // Reconstruct the check tree by matching the entry's hitBehaviors against
    // the canonical scorecard for that scenario. If the scenario isn't in the
    // current catalog (renamed/imported row) we still let admins edit the
    // top-level fields, just without the per-behavior toggles.
    const scenario = SCENARIOS.find((s) => s.title === entry.scenarioTitle);
    const checks = {};
    if (scenario) {
      const hits = entry.hitBehaviors || [];
      Object.entries(scenario.scorecard).forEach(([area, list]) => {
        checks[area] = {};
        list.forEach((b, i) => {
          const wasHit = hits.some((h) => h.area === area && h.behavior === b.behavior);
          if (wasHit) checks[area][i] = true;
        });
      });
    }
    setEditing({
      id: entry.id,
      repName: entry.repName || '',
      customerName: entry.customerName || '',
      score: entry.score ?? 0,
      originalScore: entry.score ?? 0,
      behaviorsHit: entry.behaviorsHit ?? 0,
      behaviorsTotal: entry.behaviorsTotal ?? 0,
      notes: entry.notes || '',
      scenario,
      checks,
      scoreOverridden: false,
    });
  }

  function recomputeFromChecks(nextChecks, prev) {
    if (!prev.scenario) return { ...prev, checks: nextChecks };
    const computed = computeScore(prev.scenario, nextChecks);
    return {
      ...prev,
      checks: nextChecks,
      // Auto-fill score/hits unless the admin has manually overridden the score.
      score: prev.scoreOverridden ? prev.score : computed.total,
      behaviorsHit: computed.checkedCount,
      behaviorsTotal: computed.totalBehaviors,
    };
  }

  function toggleEditCheck(area, idx) {
    setEditing((prev) => {
      const areaChecks = { ...(prev.checks[area] || {}) };
      if (areaChecks[idx]) delete areaChecks[idx];
      else areaChecks[idx] = true;
      const nextChecks = { ...prev.checks, [area]: areaChecks };
      return recomputeFromChecks(nextChecks, prev);
    });
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      const patch = {
        repName: editing.repName,
        customerName: editing.customerName,
        score: Number(editing.score) || 0,
        behaviorsHit: Number(editing.behaviorsHit) || 0,
        behaviorsTotal: Number(editing.behaviorsTotal) || 0,
        notes: editing.notes,
      };
      if (editing.scenario) {
        const computed = computeScore(editing.scenario, editing.checks);
        patch.breakdown = computed.breakdown.map((b) => ({
          area: b.area,
          hits: b.hits,
          total: b.total,
          perfect: b.perfect,
          isBonus: b.isBonus,
        }));
        const hitBehaviors = [];
        const missedBehaviors = [];
        Object.entries(editing.scenario.scorecard).forEach(([area, list]) => {
          list.forEach((b, i) => {
            if (editing.checks[area]?.[i]) {
              hitBehaviors.push({ area, behavior: b.behavior });
            } else {
              missedBehaviors.push({
                area,
                behavior: b.behavior,
                bonus: isBonusArea(editing.scenario, area),
              });
            }
          });
        });
        patch.hitBehaviors = hitBehaviors;
        patch.missedBehaviors = missedBehaviors;
      }
      await updateEntry(editing.id, patch);
      setEditing(null);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      alert(`Save failed: ${e.message}`);
    }
  }

  return (
    <div className="min-h-screen bg-grid">
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <header className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Logo variant="dk" size="sm" />
            <div className="border-l border-white/15 pl-4">
              <div
                className="font-display text-4xl tracking-wider text-leaf"
                style={{
                  backgroundImage: 'linear-gradient(90deg, #87c440 0%, #69aebd 50%, #5fb1e2 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                ADMIN CONSOLE
              </div>
              <div className="text-xs text-white/50 mt-1">
                {entries.length} entries across {grouped.length} day{grouped.length === 1 ? '' : 's'}
              </div>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter rep, customer, scenario…"
              className="bg-navy-deep/60 border border-white/15 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-white/40 w-64"
            />
            <button
              onClick={() => setShowReport(true)}
              disabled={entries.length === 0}
              className="text-xs font-semibold tracking-wide px-3 py-2 rounded-lg border bg-leaf/15 border-leaf/40 text-leaf hover:bg-leaf/25 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Coaching report
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="text-xs font-semibold tracking-wide px-3 py-2 rounded-lg border bg-magenta/15 border-magenta/40 text-magenta-glow hover:bg-magenta/25"
            >
              Bulk import
            </button>
            <button
              onClick={() => exportCsvFromEntries(entries, { filename: `wenger-admin-export-${Date.now()}.csv` })}
              className="text-xs font-semibold tracking-wide px-3 py-2 rounded-lg border bg-leaf/10 border-leaf/40 text-leaf hover:bg-leaf/20"
            >
              Export all
            </button>
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="text-xs font-semibold tracking-wide px-3 py-2 rounded-lg border bg-cyan/10 border-cyan/40 text-cyan hover:bg-cyan/20"
            >
              Refresh
            </button>
            <button
              onClick={onLogout}
              className="text-xs font-semibold tracking-wide px-3 py-2 rounded-lg border bg-white/5 border-white/15 text-white/60 hover:text-white"
            >
              Sign out
            </button>
            <button
              onClick={onExit}
              className="text-xs font-semibold tracking-wide px-3 py-2 rounded-lg border bg-magenta/15 border-magenta/40 text-magenta-glow hover:bg-magenta/25"
            >
              Back to lobby
            </button>
          </div>
        </header>

        {loading && <div className="card p-6 text-white/60">Loading entries…</div>}
        {err && <div className="card p-6 text-warning">{err}</div>}

        {!loading && !err && filtered.length === 0 && (
          <div className="card p-10 text-center text-white/60">
            No entries yet.
          </div>
        )}

        {sortBy && filtered.length > 0 && (
          <section className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-display text-2xl tracking-wider">
                SORTED BY {sortBy.column.toUpperCase()} <span className="text-white/40">{sortBy.dir === 'asc' ? '▲' : '▼'}</span>
              </div>
              <button
                onClick={clearSort}
                className="text-xs font-semibold tracking-wide px-3 py-1.5 rounded-lg border bg-white/5 border-white/15 text-white/60 hover:text-white"
              >
                ✕ clear sort (back to date groups)
              </button>
            </div>
            <EntriesTable
              rows={flatSorted}
              showDate
              sortBy={sortBy}
              onSort={clickSort}
              onView={setViewing}
              onEdit={startEdit}
              onDelete={handleDelete}
            />
          </section>
        )}

        {!sortBy && grouped.map(([date, rows]) => (
          <section key={date} className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-display text-2xl tracking-wider">{date}</div>
              <div className="text-xs text-white/50">{rows.length} round{rows.length === 1 ? '' : 's'}</div>
            </div>
            <EntriesTable
              rows={rows}
              showDate={false}
              sortBy={sortBy}
              onSort={clickSort}
              onView={setViewing}
              onEdit={startEdit}
              onDelete={handleDelete}
            />
          </section>
        ))}
      </main>

      {showImport && (
        <AdminBulkImport
          onClose={() => setShowImport(false)}
          onImported={() => setRefreshKey((k) => k + 1)}
        />
      )}

      {showReport && (
        <CoachingReport
          entries={entries}
          onClose={() => setShowReport(false)}
        />
      )}

      {viewing && (
        <EntryDetail
          entry={viewing}
          onClose={() => setViewing(null)}
        />
      )}

      {editing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-40 bg-navy-deep/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto"
          onClick={() => setEditing(null)}
        >
          <div
            className="card p-6 w-full max-w-4xl space-y-4 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="font-display text-2xl tracking-wider">EDIT ENTRY</div>
              {editing.scenario && (
                <div className="text-xs text-white/60">
                  <span className="text-leaf font-semibold">{editing.scenario.title}</span>
                  <span className="text-white/40"> · {editing.scenario.category}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="REP">
                <input
                  value={editing.repName}
                  onChange={(e) => setEditing({ ...editing, repName: e.target.value })}
                  className="adminInput"
                />
              </Field>
              <Field label="CUSTOMER">
                <input
                  value={editing.customerName}
                  onChange={(e) => setEditing({ ...editing, customerName: e.target.value })}
                  className="adminInput"
                />
              </Field>
              <Field label={`SCORE${editing.scenario ? ' (auto-recalculates)' : ''}`}>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={editing.score}
                    onChange={(e) => setEditing({ ...editing, score: e.target.value, scoreOverridden: true })}
                    className="adminInput"
                  />
                  {editing.scenario && editing.scoreOverridden && (
                    <button
                      onClick={() => setEditing((prev) => recomputeFromChecks(prev.checks, { ...prev, scoreOverridden: false }))}
                      className="text-[10px] tracking-wider px-2 rounded-lg border bg-white/5 border-white/15 text-white/60 hover:text-white whitespace-nowrap"
                      title="Recompute from checks"
                    >
                      ↻ RECALC
                    </button>
                  )}
                </div>
              </Field>
              <Field label="BEHAVIORS HIT / TOTAL">
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={editing.behaviorsHit}
                    onChange={(e) => setEditing({ ...editing, behaviorsHit: e.target.value })}
                    className="adminInput w-1/2"
                    disabled={!!editing.scenario}
                    title={editing.scenario ? 'Auto-managed by the checks below' : ''}
                  />
                  <input
                    type="number"
                    value={editing.behaviorsTotal}
                    onChange={(e) => setEditing({ ...editing, behaviorsTotal: e.target.value })}
                    className="adminInput w-1/2"
                    disabled={!!editing.scenario}
                    title={editing.scenario ? 'Auto-managed by the checks below' : ''}
                  />
                </div>
              </Field>
            </div>
            <Field label="NOTES">
              <textarea
                value={editing.notes}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                rows={3}
                className="adminInput"
              />
            </Field>

            {editing.scenario ? (
              <ScorecardEditor
                scenario={editing.scenario}
                checks={editing.checks}
                onToggle={toggleEditCheck}
              />
            ) : (
              <div className="rounded-xl border border-warning/40 bg-warning/5 p-3 text-xs text-white/80">
                The scenario for this entry (<span className="font-semibold">{editing.scenarioTitle || 'unknown'}</span>) isn't in the current scenario catalog, so per-behavior editing is unavailable. You can still edit the top-level fields above.
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
              <div className="text-xs text-white/50">
                {editing.scenario && (
                  <>Original score <span className="font-mono text-white/70">{editing.originalScore}</span> · current <span className="font-mono text-gold">{editing.score}</span></>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(null)} className="btn-secondary">CANCEL</button>
                <button onClick={saveEdit} className="btn-primary">SAVE</button>
              </div>
            </div>
          </div>

          <style>{`
            .adminInput {
              width: 100%;
              background: rgba(2, 12, 24, 0.6);
              border: 1px solid rgba(255,255,255,0.15);
              border-radius: 0.75rem;
              padding: 0.6rem 0.85rem;
              font-weight: 600;
              color: white;
            }
            .adminInput:focus { outline: none; border-color: rgba(255,255,255,0.4); }
          `}</style>
        </motion.div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-[10px] tracking-[0.25em] text-white/50 font-semibold mb-1">{label}</div>
      {children}
    </label>
  );
}

function SortHeader({ column, label, sortBy, onSort, align = 'left' }) {
  const active = sortBy && sortBy.column === column;
  const arrow = active ? (sortBy.dir === 'asc' ? '▲' : '▼') : '↕';
  const alignCls = align === 'right' ? 'text-right justify-end' : 'text-left';
  return (
    <th className={`py-2 pr-3 ${alignCls}`}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`inline-flex items-center gap-1 ${active ? 'text-cyan' : 'text-white/50 hover:text-white'}`}
      >
        {label}
        <span className={`text-[9px] ${active ? 'opacity-100' : 'opacity-40'}`}>{arrow}</span>
      </button>
    </th>
  );
}

function EntriesTable({ rows, showDate, sortBy, onSort, onView, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] tracking-[0.25em] font-semibold border-b border-white/10">
            {showDate && <SortHeader column="time" label="DATE / TIME" sortBy={sortBy} onSort={onSort} />}
            {!showDate && <SortHeader column="time" label="TIME" sortBy={sortBy} onSort={onSort} />}
            <SortHeader column="rep" label="REP" sortBy={sortBy} onSort={onSort} />
            <SortHeader column="customer" label="CUSTOMER" sortBy={sortBy} onSort={onSort} />
            <SortHeader column="scenario" label="SCENARIO" sortBy={sortBy} onSort={onSort} />
            <SortHeader column="score" label="SCORE" sortBy={sortBy} onSort={onSort} align="right" />
            <SortHeader column="hits" label="HITS" sortBy={sortBy} onSort={onSort} align="right" />
            <th className="text-right py-2 pr-3 w-32 text-white/50">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id} className="border-b border-white/5 hover:bg-white/5">
              <td className="py-2 pr-3 text-xs text-white/60 whitespace-nowrap">{fmtDateTime(e.timestamp)}</td>
              <td className="py-2 pr-3 font-semibold">{e.repName}</td>
              <td className="py-2 pr-3">{e.customerName}</td>
              <td className="py-2 pr-3 text-white/80">{e.scenarioTitle}</td>
              <td className="py-2 pr-3 text-right font-mono tabular-nums text-gold font-bold">{e.score}</td>
              <td className="py-2 pr-3 text-right text-xs text-white/60">{e.behaviorsHit}/{e.behaviorsTotal}</td>
              <td className="py-2 pr-3 text-right whitespace-nowrap">
                <button
                  onClick={() => onView(e)}
                  className="text-xs font-semibold px-2 py-1 rounded-lg border bg-leaf/10 border-leaf/40 text-leaf hover:bg-leaf/20 mr-1"
                >
                  View
                </button>
                <button
                  onClick={() => onEdit(e)}
                  className="text-xs font-semibold px-2 py-1 rounded-lg border bg-cyan/10 border-cyan/40 text-cyan hover:bg-cyan/20 mr-1"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(e)}
                  className="text-xs font-semibold px-2 py-1 rounded-lg border bg-danger/10 border-danger/40 text-danger hover:bg-danger/20"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScorecardEditor({ scenario, checks, onToggle }) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.25em] text-white/50 font-semibold mb-2">
        SCORECARD — toggle to recalculate the score
      </div>
      <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
        {Object.entries(scenario.scorecard).map(([area, behaviors]) => {
          const areaChecks = checks[area] || {};
          const hits = behaviors.reduce((n, _, i) => n + (areaChecks[i] ? 1 : 0), 0);
          const isPerfect = hits === behaviors.length && behaviors.length > 0;
          const bonus = isBonusArea(scenario, area);
          return (
            <div
              key={area}
              className={`rounded-xl border overflow-hidden ${
                isPerfect ? 'border-gold/50' : bonus ? 'border-magenta/30' : 'border-white/10'
              }`}
            >
              <div className={`px-3 py-2 flex items-center justify-between text-sm ${
                isPerfect ? 'bg-gold/10' : bonus ? 'bg-magenta/10' : 'bg-white/5'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="font-display tracking-wider">{area.toUpperCase()}</span>
                  {bonus && <span className="text-[9px] font-bold text-magenta-glow tracking-wider">BONUS 1.5×</span>}
                  {isPerfect && <span className="text-[9px] font-bold text-gold tracking-wider">PERFECT +10</span>}
                </div>
                <div className="text-xs text-white/60 tabular-nums">{hits}/{behaviors.length}</div>
              </div>
              <ul className="divide-y divide-white/5">
                {behaviors.map((b, i) => {
                  const checked = !!areaChecks[i];
                  const pts = pointsForBehavior(scenario, area, b.points);
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => onToggle(area, i)}
                        className={`w-full text-left px-3 py-2 flex items-center gap-3 text-sm transition-colors ${
                          checked ? 'bg-success/10' : 'hover:bg-white/5'
                        }`}
                      >
                        <span className={`flex items-center justify-center w-6 h-6 rounded-md border-2 shrink-0 ${
                          checked ? 'bg-success border-success text-navy-deep' :
                          bonus ? 'border-magenta/50 bg-magenta/5' : 'border-white/30 bg-white/5'
                        }`}>
                          {checked ? <span className="font-bold leading-none">+</span> : null}
                        </span>
                        <span className={`flex-1 ${checked ? 'text-white' : 'text-white/80'}`}>
                          {b.behavior}
                        </span>
                        <span className={`font-mono tabular-nums font-bold ${
                          checked ? 'text-gold' : bonus ? 'text-magenta-glow' : 'text-white/40'
                        }`}>
                          +{pts}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
