import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getLeaderboard, clearLeaderboard, todayKey, getAllEntries, exportCsv } from '../lib/leaderboard.js';
import CoachingReport from './CoachingReport.jsx';

export default function Leaderboard({ refreshKey = 0, onCleared }) {
  const [showReport, setShowReport] = useState(false);
  const [open, setOpen] = useState(true);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set());
  const entries = getLeaderboard().slice(0, 5);
  const totalAcrossAllDays = getAllEntries().length;

  function toggleRow(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleClear() {
    if (!confirmingClear) {
      setConfirmingClear(true);
      setTimeout(() => setConfirmingClear(false), 4000);
      return;
    }
    clearLeaderboard();
    setConfirmingClear(false);
    onCleared?.();
  }

  return (
    <div className="card p-5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏆</span>
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
                    const isOpen = expanded.has(e.timestamp);
                    const hasDetails = (e.breakdown && e.breakdown.length) ||
                                       (e.hitBehaviors && e.hitBehaviors.length) ||
                                       (e.missedBehaviors && e.missedBehaviors.length) ||
                                       e.notes;
                    return (
                      <li
                        key={e.timestamp}
                        className="rounded-xl bg-white/5 border border-white/5 overflow-hidden"
                      >
                        <button
                          onClick={() => hasDetails && toggleRow(e.timestamp)}
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
                                            {b.area}{b.isBonus ? ' ⭐' : ''}{b.perfect ? ' ✨' : ''}
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
                                        ✓ HIT ({e.hitBehaviors.length})
                                      </div>
                                      <ul className="space-y-1">
                                        {e.hitBehaviors.map((h, j) => (
                                          <li key={j} className="text-xs text-white/85 leading-snug">
                                            <span className="text-success mr-1">✓</span>
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
                                        ✗ MISSED ({e.missedBehaviors.length})
                                      </div>
                                      <ul className="space-y-1">
                                        {e.missedBehaviors.map((m, j) => (
                                          <li key={j} className="text-xs text-white/75 leading-snug">
                                            <span className="text-warning mr-1">✗</span>
                                            {m.behavior}
                                            <span className="text-white/40"> · {m.area}{m.bonus ? ' ⭐' : ''}</span>
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

              <div className="mt-4 flex flex-wrap gap-2">
                {totalAcrossAllDays > 0 && (
                  <>
                    <button
                      onClick={() => setShowReport(true)}
                      className="text-xs font-semibold tracking-wide px-3 py-2 rounded-lg border bg-magenta/15 border-magenta/40 text-magenta-glow hover:bg-magenta/25"
                    >
                      📋 Coaching report
                    </button>
                    <button
                      onClick={() => exportCsv({ todayOnly: true })}
                      disabled={entries.length === 0}
                      className="text-xs font-semibold tracking-wide px-3 py-2 rounded-lg border bg-cyan/10 border-cyan/40 text-cyan hover:bg-cyan/20 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ⬇ Export today ({entries.length})
                    </button>
                    <button
                      onClick={() => exportCsv({ todayOnly: false })}
                      className="text-xs font-semibold tracking-wide px-3 py-2 rounded-lg border bg-gold/10 border-gold/40 text-gold hover:bg-gold/20"
                    >
                      ⬇ Export all ({totalAcrossAllDays})
                    </button>
                  </>
                )}
                {entries.length > 0 && (
                  <button
                    onClick={handleClear}
                    className={`text-xs font-semibold tracking-wide px-3 py-2 rounded-lg border transition-colors ml-auto ${
                      confirmingClear
                        ? 'bg-danger/20 border-danger/50 text-danger animate-pulseSoft'
                        : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
                    }`}
                  >
                    {confirmingClear ? 'CLICK AGAIN TO CONFIRM CLEAR' : 'Clear today'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReport && <CoachingReport onClose={() => setShowReport(false)} />}
      </AnimatePresence>
    </div>
  );
}
