import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { todayKey, exportCsvFromEntries } from '../lib/leaderboard.js';
import { fetchEntries, migrateLocalToCloudOnce, backupLocalToFileOnce } from '../lib/cloudLeaderboard.js';
import CoachingReport from './CoachingReport.jsx';

export default function Leaderboard({ refreshKey = 0, onCleared }) {
  const [showReport, setShowReport] = useState(false);
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState(() => new Set());
  const [allEntries, setAllEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [migrationStatus, setMigrationStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    // First-load (per device, gated by flags):
    // (a) Save a local CSV backup of every entry on this device — belt-and-
    //     suspenders so nothing is at risk of being lost even if the cloud
    //     migration or DB itself goes sideways later.
    // (b) Push every localStorage entry up to the cloud so today's local
    //     rounds aren't stranded on this device.
    const backup = backupLocalToFileOnce();

    migrateLocalToCloudOnce()
      .then((result) => {
        if (!cancelled) {
          const parts = [];
          if (backup && !backup.skipped && backup.count > 0) {
            parts.push(`Saved a CSV backup of ${backup.count} round${backup.count === 1 ? '' : 's'} to your downloads (${backup.filename}).`);
          }
          if (result && !result.skipped) {
            if (result.failed > 0) {
              parts.push(
                `Migrated ${result.migrated} local round${result.migrated === 1 ? '' : 's'} to the cloud — ` +
                `${result.failed} failed and will retry on the next load. ` +
                `Don't clear this device's storage yet.`
              );
            } else if (result.migrated > 0) {
              parts.push(`Migrated ${result.migrated} local round${result.migrated === 1 ? '' : 's'} to the cloud.`);
            }
          }
          if (parts.length) setMigrationStatus(parts.join(' '));
        }
        return fetchEntries();
      })
      .then((entries) => {
        if (!cancelled) setAllEntries(entries);
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('cloud leaderboard fetch failed', err);
          setLoadError(err.message || 'Could not load the cloud leaderboard.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [refreshKey]);

  const today = todayKey();
  const todaysEntries = allEntries
    .filter((e) => e.date === today)
    .sort((a, b) => b.score - a.score);
  const entries = todaysEntries.slice(0, 5);
  const totalAcrossAllDays = allEntries.length;

  function toggleRow(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="card p-5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-leaf/15 border border-leaf/40 flex items-center justify-center font-display text-xl tracking-wider text-leaf">LB</div>
          <div className="text-left">
            <div className="font-display text-2xl tracking-wider">SESSION LEADERBOARD</div>
            <div className="text-xs text-white/50">{todayKey()} · {entries.length} {entries.length === 1 ? 'round' : 'rounds'}</div>
          </div>
        </div>
        <div className="text-white/60 text-sm">{open ? '▲' : '▼'}</div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key={refreshKey}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="pt-4">
              {entries.length === 0 ? (
                <div className="text-white/50 italic text-sm">No rounds yet — draw a scenario to get on the board.</div>
              ) : (
                <ol className="space-y-2">
                  {entries.map((e, i) => {
                    const isOpen = expanded.has(e.id);
                    const hasDetails = (e.breakdown && e.breakdown.length) ||
                                       (e.hitBehaviors && e.hitBehaviors.length) ||
                                       (e.missedBehaviors && e.missedBehaviors.length) ||
                                       e.notes;
                    return (
                      <li
                        key={e.id}
                        className="rounded-xl bg-white/5 border border-white/5 overflow-hidden"
                      >
                        <button
                          onClick={() => hasDetails && toggleRow(e.id)}
                          className={`w-full flex items-center gap-3 p-3 text-left ${hasDetails ? 'hover:bg-white/5' : 'cursor-default'}`}
                        >
                          <div className={`font-display text-2xl w-8 text-center ${
                            i === 0 ? 'text-gold' : i === 1 ? 'text-cyan' : i === 2 ? 'text-magenta-glow' : 'text-white/60'
                          }`}>
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate">
                              {e.repName} <span className="text-white/40 font-normal">vs.</span> {e.customerName}
                            </div>
                            <div className="text-xs text-white/50 truncate">{e.scenarioTitle}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-2xl font-bold text-gold tabular-nums">{e.score}</div>
                            <div className="text-[10px] text-white/40">{e.behaviorsHit}/{e.behaviorsTotal} hit</div>
                          </div>
                          {hasDetails && (
                            <div className="text-white/40 text-xs ml-1 w-4 text-center">{isOpen ? '▴' : '▾'}</div>
                          )}
                        </button>

                        <AnimatePresence initial={false}>
                          {isOpen && hasDetails && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden border-t border-white/10"
                            >
                              <div className="p-4 space-y-4 bg-navy-deep/40">
                                {e.breakdown && e.breakdown.length > 0 && (
                                  <div>
                                    <div className="text-[10px] tracking-[0.25em] text-white/50 font-semibold mb-2">PER-CATEGORY</div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                      {e.breakdown.map((b) => (
                                        <div
                                          key={b.area}
                                          className={`text-xs p-2 rounded-lg border flex items-center justify-between gap-2 ${
                                            b.perfect ? 'border-gold/40 bg-gold/10 text-gold' :
                                            b.hits === 0 ? 'border-warning/30 bg-warning/5 text-warning/90' :
                                            b.isBonus ? 'border-magenta/30 bg-magenta/5 text-magenta-glow' :
                                            'border-white/10 bg-white/5 text-white/80'
                                          }`}
                                        >
                                          <span className="truncate">
                                            {b.area}
                                            {b.isBonus && <span className="ml-1 text-[10px] font-bold tracking-wider opacity-80">·BONUS</span>}
                                            {b.perfect && <span className="ml-1 text-[10px] font-bold tracking-wider opacity-80">·PERFECT</span>}
                                          </span>
                                          <span className="font-mono tabular-nums shrink-0">{b.hits}/{b.total}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {e.hitBehaviors && e.hitBehaviors.length > 0 && (
                                    <div>
                                      <div className="text-[10px] tracking-[0.25em] text-success font-semibold mb-1">
                                        HIT ({e.hitBehaviors.length})
                                      </div>
                                      <ul className="space-y-1">
                                        {e.hitBehaviors.map((h, j) => (
                                          <li key={j} className="text-xs text-white/85 leading-snug">
                                            <span className="text-success mr-1 font-bold">+</span>
                                            {h.behavior}
                                            <span className="text-white/40"> · {h.area}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {e.missedBehaviors && e.missedBehaviors.length > 0 && (
                                    <div>
                                      <div className="text-[10px] tracking-[0.25em] text-warning font-semibold mb-1">
                                        MISSED ({e.missedBehaviors.length})
                                      </div>
                                      <ul className="space-y-1">
                                        {e.missedBehaviors.map((m, j) => (
                                          <li key={j} className="text-xs text-white/75 leading-snug">
                                            <span className="text-warning mr-1 font-bold">−</span>
                                            {m.behavior}
                                            <span className="text-white/40"> · {m.area}{m.bonus ? ' · BONUS' : ''}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>

                                {e.notes && (
                                  <div>
                                    <div className="text-[10px] tracking-[0.25em] text-cyan font-semibold mb-1">MANAGER NOTES</div>
                                    <div className="text-sm text-white/85 leading-relaxed whitespace-pre-wrap bg-white/5 rounded-lg p-3 border border-white/10">
                                      {e.notes}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </li>
                    );
                  })}
                </ol>
              )}

              {loading && (
                <div className="text-xs text-white/50 italic mt-3">Loading cloud leaderboard…</div>
              )}
              {loadError && (
                <div className="text-xs text-warning mt-3">
                  Couldn't reach the cloud leaderboard ({loadError}). Showing what's saved on this device.
                </div>
              )}
              {migrationStatus && (
                <div className={`text-xs mt-3 ${/failed/.test(migrationStatus) ? 'text-warning font-semibold' : 'text-success'}`}>
                  {migrationStatus}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {totalAcrossAllDays > 0 && (
                  <>
                    <button
                      onClick={() => setShowReport(true)}
                      className="text-xs font-semibold tracking-wide px-3 py-2 rounded-lg border bg-magenta/15 border-magenta/40 text-magenta-glow hover:bg-magenta/25"
                    >
                      Coaching report
                    </button>
                    <button
                      onClick={() => exportCsvFromEntries(todaysEntries.map((e) => ({ ...e, date: today })), { filename: `wenger-role-play-${today}-${Date.now()}.csv` })}
                      disabled={todaysEntries.length === 0}
                      className="text-xs font-semibold tracking-wide px-3 py-2 rounded-lg border bg-cyan/10 border-cyan/40 text-cyan hover:bg-cyan/20 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Export today ({todaysEntries.length})
                    </button>
                    <button
                      onClick={() => exportCsvFromEntries(allEntries, { filename: `wenger-role-play-all-${Date.now()}.csv` })}
                      className="text-xs font-semibold tracking-wide px-3 py-2 rounded-lg border bg-leaf/10 border-leaf/40 text-leaf hover:bg-leaf/20"
                    >
                      Export all ({totalAcrossAllDays})
                    </button>
                  </>
                )}
                <a
                  href="#/admin"
                  className="text-xs font-semibold tracking-wide px-3 py-2 rounded-lg border bg-white/5 border-white/10 text-white/60 hover:text-white ml-auto"
                >
                  Admin
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReport && <CoachingReport entries={allEntries} onClose={() => setShowReport(false)} />}
      </AnimatePresence>
    </div>
  );
}
