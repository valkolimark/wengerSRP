import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { computeScore, isBonusArea } from '../lib/scoring.js';
import { addEntry } from '../lib/leaderboard.js';
import { play } from '../lib/sound.js';

export default function ResultsScreen({ session, result, onPlayAgain, onSaved }) {
  const { scenario, customerName, repName } = session;
  const score = useMemo(
    () => computeScore(scenario, result.checks, { timeRemaining: result.timeRemaining, ended: result.ended }),
    [scenario, result]
  );
  const [displayScore, setDisplayScore] = useState(0);
  const [saved, setSaved] = useState(false);
  const [savedRepName, setSavedRepName] = useState(repName);
  const [savedCustomerName, setSavedCustomerName] = useState(customerName);
  const [notes, setNotes] = useState('');
  const firedConfetti = useRef(false);

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

  function save() {
    if (saved) return;
    addEntry({
      repName: savedRepName.trim() || 'Sales Rep',
      customerName: savedCustomerName.trim() || 'Customer',
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
      notes: notes.trim(),
    });
    setSaved(true);
    onSaved?.();
  }

  const maxBarPossible = Math.max(...score.breakdown.map((b) => b.possible));

  return (
    <div className="min-h-screen bg-grid">
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        {/* Banner */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 14 }}
          className="text-center"
        >
          <div className="font-display text-8xl md:text-9xl tracking-widest bg-gradient-to-r from-magenta via-gold to-cyan bg-clip-text text-transparent">
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
                    {b.isBonus && <span className="text-xs text-magenta-glow font-bold">⭐</span>}
                    {b.perfect && <span className="text-xs text-gold font-bold">✨ PERFECT +10</span>}
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
              ✓ BEHAVIORS HIT ({hits.length})
            </div>
            {hits.length === 0 ? (
              <div className="text-white/40 italic text-sm">None — rough round.</div>
            ) : (
              <ul className="space-y-2">
                {hits.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-success mt-0.5">✓</span>
                    <div className="flex-1">
                      <div className="text-white">{h.behavior}</div>
                      <div className="text-xs text-white/40 flex items-center gap-1">
                        {h.area}
                        {h.bonus && <span className="text-magenta-glow">⭐</span>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-5 border-warning/30">
            <div className="font-display text-2xl tracking-wider mb-3 text-warning">
              ✗ BEHAVIORS MISSED ({misses.length})
            </div>
            {misses.length === 0 ? (
              <div className="text-success font-semibold">Clean sheet. That's the bar.</div>
            ) : (
              <ul className="space-y-2">
                {misses.map((m, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-warning/70 mt-0.5">✗</span>
                    <div className="flex-1">
                      <div className="text-white/80">{m.behavior}</div>
                      <div className="text-xs text-white/40 flex items-center gap-1">
                        {m.area}
                        {m.bonus && <span className="text-magenta-glow">⭐ bonus category</span>}
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
            ⭐ BONUS-CATEGORY COACHING
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

        {/* Save / play again */}
        <section className="card p-5 space-y-4">
          <div className="font-display text-2xl tracking-wider">SAVE TO LEADERBOARD</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={savedRepName}
              onChange={(e) => setSavedRepName(e.target.value)}
              placeholder="Sales Rep"
              disabled={saved}
              className="bg-navy-deep/60 border border-white/10 rounded-xl px-4 py-3 font-semibold disabled:opacity-60"
            />
            <input
              value={savedCustomerName}
              onChange={(e) => setSavedCustomerName(e.target.value)}
              placeholder="Customer"
              disabled={saved}
              className="bg-navy-deep/60 border border-white/10 rounded-xl px-4 py-3 font-semibold disabled:opacity-60"
            />
          </div>
          <div>
            <label className="text-xs tracking-[0.25em] text-white/50 font-semibold mb-1 block">
              MANAGER NOTES <span className="text-white/30 font-normal normal-case tracking-normal">— what to coach this rep on</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Strong on discovery but rushed past BANT. Follow up on Salesforce hygiene."
              disabled={saved}
              rows={3}
              className="w-full bg-navy-deep/60 border border-white/10 rounded-xl px-4 py-3 text-sm leading-relaxed disabled:opacity-60 resize-y"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={save}
              disabled={saved}
              className="btn-primary disabled:bg-success disabled:shadow-none"
            >
              {saved ? '✓ SAVED' : '💾 SAVE TO LEADERBOARD'}
            </button>
            <button onClick={onPlayAgain} className="btn-secondary text-2xl px-8 py-4">
              ↻ PLAY AGAIN
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
