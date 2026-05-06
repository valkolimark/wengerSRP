import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { computeScore, isBonusArea } from '../lib/scoring.js';
import { createEntry, updateEntry, getAdminPassword, localFallbackAdd } from '../lib/cloudLeaderboard.js';
import { play } from '../lib/sound.js';
import Logo from './Logo.jsx';

export default function ResultsScreen({ session, result, onPlayAgain, onSaved }) {
  const { scenario, customerName, repName } = session;
  const score = useMemo(
    () => computeScore(scenario, result.checks, { timeRemaining: result.timeRemaining, ended: result.ended }),
    [scenario, result]
  );
  const [displayScore, setDisplayScore] = useState(0);
  const [savedRepName, setSavedRepName] = useState(repName);
  const [savedCustomerName, setSavedCustomerName] = useState(customerName);
  const [editedNotes, setEditedNotes] = useState((result.notes || '').trim());
  const notes = editedNotes;
  const [entryId, setEntryId] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saving'); // 'saving' | 'saved' | 'local' | 'error'
  const [editStatus, setEditStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const firedConfetti = useRef(false);
  const autoSavedRef = useRef(false);
  const editTimerRef = useRef(null);

  // Count-up animation for the big score
  useEffect(() => {
    let raf;
    const startedAt = performance.now();
    const dur = 1400;
    const target = score.total;
    const animate = (t) => {
      const k = Math.min(1, (t - startedAt) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      setDisplayScore(Math.round(target * eased));
      if (k < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [score.total]);

  // Confetti + applause once on mount
  useEffect(() => {
    if (firedConfetti.current) return;
    firedConfetti.current = true;
    play('applause');
    const burst = (origin) =>
      confetti({
        particleCount: 120,
        spread: 90,
        startVelocity: 45,
        origin,
        colors: ['#FFD230', '#FF2D75', '#00E5FF', '#00E676'],
      });
    burst({ x: 0.2, y: 0.3 });
    setTimeout(() => burst({ x: 0.8, y: 0.3 }), 200);
    setTimeout(() => burst({ x: 0.5, y: 0.2 }), 400);
  }, []);

  // Hit / miss lists (computed first so they can be persisted with the entry)
  const hits = [];
  const misses = [];
  Object.entries(scenario.scorecard).forEach(([area, list]) => {
    const areaChecks = result.checks[area] || {};
    list.forEach((b, i) => {
      const item = { area, behavior: b.behavior, bonus: isBonusArea(scenario, area) };
      if (areaChecks[i]) hits.push(item);
      else misses.push(item);
    });
  });

  // Auto-save the round to the cloud the moment results render. The lobby names
  // are passed straight through — no manual SAVE click required.
  useEffect(() => {
    if (autoSavedRef.current) return;
    autoSavedRef.current = true;

    const payload = {
      repName: (repName || '').trim() || 'Sales Rep',
      customerName: (customerName || '').trim() || 'Customer',
      scenarioTitle: scenario.title,
      scenarioCategory: scenario.category,
      score: score.total,
      behaviorsHit: score.checkedCount,
      behaviorsTotal: score.totalBehaviors,
      breakdown: score.breakdown.map((b) => ({
        area: b.area,
        hits: b.hits,
        total: b.total,
        perfect: b.perfect,
        isBonus: b.isBonus,
      })),
      hitBehaviors: hits.map((h) => ({ area: h.area, behavior: h.behavior })),
      missedBehaviors: misses.map((m) => ({ area: m.area, behavior: m.behavior, bonus: m.bonus })),
      notes,
    };

    setSaveStatus('saving');
    createEntry(payload)
      .then((entry) => {
        setEntryId(entry.id);
        setSaveStatus('saved');
        onSaved?.();
      })
      .catch((err) => {
        console.warn('cloud save failed, falling back to local', err);
        // Don't lose the round — write to localStorage so today's entries
        // are recoverable even if the API is down.
        localFallbackAdd(payload);
        setSaveStatus('local');
        onSaved?.();
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Edits go straight to the server (admin only). For non-admins the inputs
  // are read-only — the lobby-entered names already saved on auto-save above.
  function patch(fields) {
    if (!entryId) return;
    if (!getAdminPassword()) return;
    if (editTimerRef.current) clearTimeout(editTimerRef.current);
    setEditStatus('saving');
    editTimerRef.current = setTimeout(() => {
      updateEntry(entryId, fields)
        .then(() => setEditStatus('saved'))
        .catch((err) => {
          console.warn('edit failed', err);
          setEditStatus('error');
        });
    }, 500);
  }

  const isAdmin = !!getAdminPassword();

  const maxBarPossible = Math.max(...score.breakdown.map((b) => b.possible));

  return (
    <div className="min-h-screen bg-grid">
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div className="flex justify-center">
          <Logo variant="dk" size="sm" dim />
        </div>
        {/* Banner */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 14 }}
          className="text-center"
        >
          <div
            className="font-display text-8xl md:text-9xl tracking-widest text-leaf"
            style={{
              backgroundImage: 'linear-gradient(90deg, #cb6918 0%, #87c440 50%, #5fb1e2 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            TIME!
          </div>
          <div className="text-white/60 text-lg mt-2">
            {repName} ran {scenario.title} as <span className="text-cyan">{scenario.persona.name}</span>
          </div>
        </motion.div>

        {/* Big score */}
        <div className="text-center">
          <div className="text-xs tracking-[0.4em] text-white/40 font-semibold mb-1">FINAL SCORE</div>
          <motion.div
            animate={{ textShadow: ['0 0 10px rgba(255,210,48,0.4)', '0 0 30px rgba(255,210,48,0.8)', '0 0 10px rgba(255,210,48,0.4)'] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="font-mono tabular-nums text-[140px] md:text-[180px] leading-none font-bold text-gold"
          >
            {displayScore}
          </motion.div>
          <div className="text-sm text-white/60 mt-2">
            {score.checkedCount}/{score.totalBehaviors} behaviors hit · base {score.baseTotal}
            {score.perfectBonusTotal > 0 && <> · perfect-bucket bonus +{score.perfectBonusTotal}</>}
            {score.speedBonus > 0 && <> · speed bonus +{score.speedBonus}</>}
          </div>
        </div>

        {/* Breakdown chart */}
        <section className="card p-6">
          <div className="font-display text-3xl tracking-wider mb-4">SCORE BREAKDOWN</div>
          <div className="space-y-3">
            {score.breakdown.map((b) => (
              <div key={b.area}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{b.area}</span>
                    {b.isBonus && <span className="text-[10px] text-magenta-glow font-bold tracking-wider">BONUS</span>}
                    {b.perfect && <span className="text-[10px] text-gold font-bold tracking-wider">PERFECT +10</span>}
                  </div>
                  <div className="font-mono tabular-nums text-white/70">
                    {b.points + b.perfectBonus} / {b.possible + 10}
                  </div>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${((b.points + b.perfectBonus) / (b.possible + 10)) * 100}%` }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className={`h-full rounded-full ${
                      b.perfect ? 'bg-gradient-to-r from-gold to-success' :
                      b.isBonus ? 'bg-gradient-to-r from-magenta to-cyan' :
                      'bg-cyan'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Hits and misses — the coaching moment */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="card p-5">
            <div className="font-display text-2xl tracking-wider mb-3 text-success">
              BEHAVIORS HIT ({hits.length})
            </div>
            {hits.length === 0 ? (
              <div className="text-white/40 italic text-sm">None — rough round.</div>
            ) : (
              <ul className="space-y-2">
                {hits.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-success mt-0.5 font-bold">+</span>
                    <div className="flex-1">
                      <div className="text-white">{h.behavior}</div>
                      <div className="text-xs text-white/40 flex items-center gap-1">
                        {h.area}
                        {h.bonus && <span className="text-magenta-glow font-bold tracking-wider">· BONUS</span>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-5 border-warning/30">
            <div className="font-display text-2xl tracking-wider mb-3 text-warning">
              BEHAVIORS MISSED ({misses.length})
            </div>
            {misses.length === 0 ? (
              <div className="text-success font-semibold">Clean sheet. That's the bar.</div>
            ) : (
              <ul className="space-y-2">
                {misses.map((m, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-warning/70 mt-0.5 font-bold">−</span>
                    <div className="flex-1">
                      <div className="text-white/80">{m.behavior}</div>
                      <div className="text-xs text-white/40 flex items-center gap-1">
                        {m.area}
                        {m.bonus && <span className="text-magenta-glow font-bold tracking-wider">· BONUS CATEGORY</span>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Bonus area summary */}
        <section className="card p-5 border-magenta/40">
          <div className="font-display text-2xl tracking-wider mb-3 text-magenta-glow">
            BONUS-CATEGORY COACHING
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {score.breakdown.filter((b) => b.isBonus).map((b) => (
              <div key={b.area} className={`p-3 rounded-xl border ${
                b.perfect ? 'border-gold bg-gold/10' :
                b.hits > 0 ? 'border-cyan/40 bg-cyan/5' :
                'border-warning/40 bg-warning/5'
              }`}>
                <div className="font-semibold">{b.area}</div>
                <div className="text-xs text-white/70 mt-1">
                  {b.perfect ? 'Nailed it. Repeat that next round.' :
                   b.hits > 0 ? `Got ${b.hits}/${b.total}. Push for the rest.` :
                   `Missed all ${b.total}. This is where reps are losing points — focus here.`}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Auto-saved entry — admin can edit in place, everyone else sees read-only */}
        <section className="card p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="font-display text-2xl tracking-wider">LEADERBOARD ENTRY</div>
            <SaveBadge status={saveStatus} editStatus={editStatus} isAdmin={isAdmin} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <LabeledField label="REP">
              <input
                value={savedRepName}
                onChange={(e) => {
                  const v = e.target.value;
                  setSavedRepName(v);
                  patch({ repName: v.trim() || 'Sales Rep' });
                }}
                placeholder="Sales Rep"
                disabled={!isAdmin}
                className="w-full bg-navy-deep/60 border border-white/10 rounded-xl px-4 py-3 font-semibold disabled:opacity-80 disabled:cursor-not-allowed"
              />
            </LabeledField>
            <LabeledField label="CUSTOMER">
              <input
                value={savedCustomerName}
                onChange={(e) => {
                  const v = e.target.value;
                  setSavedCustomerName(v);
                  patch({ customerName: v.trim() || 'Customer' });
                }}
                placeholder="Customer"
                disabled={!isAdmin}
                className="w-full bg-navy-deep/60 border border-white/10 rounded-xl px-4 py-3 font-semibold disabled:opacity-80 disabled:cursor-not-allowed"
              />
            </LabeledField>
          </div>

          <div>
            <div className="text-xs tracking-[0.25em] text-white/50 font-semibold mb-1">
              MANAGER NOTES <span className="text-white/30 font-normal normal-case tracking-normal">— captured during the round{isAdmin ? ', editable here' : ''}</span>
            </div>
            {isAdmin ? (
              <textarea
                value={editedNotes}
                onChange={(e) => {
                  const v = e.target.value;
                  setEditedNotes(v);
                  patch({ notes: v });
                }}
                rows={4}
                className="w-full bg-navy-deep/60 border border-white/10 rounded-xl px-4 py-3 text-sm leading-relaxed resize-y focus:outline-none focus:border-white/30"
              />
            ) : notes ? (
              <div className="bg-navy-deep/60 border border-white/10 rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-white/85">
                {notes}
              </div>
            ) : (
              <div className="bg-navy-deep/40 border border-white/5 rounded-xl px-4 py-3 text-sm italic text-white/40">
                No notes were captured on the scorecard during this round.
              </div>
            )}
          </div>

          {!isAdmin && (
            <div className="text-[11px] text-white/40 italic">
              Need to edit this entry? Open the admin section from the lobby.
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button onClick={onPlayAgain} className="btn-primary text-2xl px-8 py-4">
              PLAY AGAIN
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

function LabeledField({ label, children }) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.25em] text-white/50 font-semibold mb-1">{label}</div>
      {children}
    </div>
  );
}

function SaveBadge({ status, editStatus, isAdmin }) {
  let label;
  let cls;
  if (status === 'saving') {
    label = 'SAVING…';
    cls = 'bg-white/5 border-white/10 text-white/60';
  } else if (status === 'local') {
    label = 'SAVED LOCALLY (cloud unreachable)';
    cls = 'bg-warning/10 border-warning/40 text-warning';
  } else if (status === 'error') {
    label = 'SAVE FAILED';
    cls = 'bg-danger/10 border-danger/40 text-danger';
  } else {
    label = 'SAVED TO LEADERBOARD';
    cls = 'bg-success/10 border-success/40 text-success';
  }

  let editLabel = null;
  if (isAdmin && status === 'saved') {
    if (editStatus === 'saving') editLabel = 'edit saving…';
    else if (editStatus === 'saved') editLabel = 'edit saved';
    else if (editStatus === 'error') editLabel = 'edit failed';
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`text-[10px] font-bold tracking-[0.2em] px-3 py-1.5 rounded-full border ${cls}`}>
        {label}
      </span>
      {editLabel && (
        <span className="text-[10px] tracking-[0.2em] text-white/50">{editLabel}</span>
      )}
    </div>
  );
}
