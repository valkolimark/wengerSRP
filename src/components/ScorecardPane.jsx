import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import Timer from './Timer.jsx';
import { computeScore, isBonusArea, pointsForBehavior } from '../lib/scoring.js';
import { play } from '../lib/sound.js';

export default function ScorecardPane({
  scenario,
  checks,
  onToggle,
  notes,
  onNotesChange,
  roundSeconds,
  roundEpoch = 0,
  paused,
  onPause,
  onReset,
  onEnd,
  onExpire,
  onTimeTick,
  repName,
}) {
  const score = useMemo(() => computeScore(scenario, checks), [scenario, checks]);

  function handleToggle(area, idx) {
    const current = checks[area]?.[idx] || false;
    onToggle(area, idx, !current);
    if (!current) {
      // checking on
      const bonus = isBonusArea(scenario, area);
      play(bonus ? 'bonus' : 'check');
      if (bonus) {
        confetti({
          particleCount: 24,
          spread: 50,
          startVelocity: 25,
          origin: { x: 0.7, y: 0.4 },
          colors: ['#FFD230', '#FF2D75', '#00E5FF'],
          ticks: 60,
        });
      }
    }
  }

  return (
    <section className="h-full flex flex-col bg-navy-deep/60 relative">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 p-5 border-b border-white/10 bg-navy/40">
        <div>
          <div className="text-xs tracking-[0.3em] text-white/40 font-semibold mb-1">TIME</div>
          <Timer
            key={roundEpoch}
            totalSeconds={roundSeconds}
            paused={paused}
            onExpire={onExpire}
            onTick={onTimeTick}
          />
        </div>
        <div className="text-right">
          <div className="text-xs tracking-[0.3em] text-white/40 font-semibold mb-1">SCORE</div>
          <motion.div
            key={score.total}
            initial={{ scale: 1.25 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            className="font-mono tabular-nums text-6xl md:text-7xl font-bold text-gold leading-none"
          >
            {score.total}
          </motion.div>
          {repName && (
            <div className="text-xs text-white/50 mt-1">{repName}</div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={onPause} className="btn-secondary">
            {paused ? 'RESUME' : 'PAUSE'}
          </button>
          <button onClick={onReset} className="btn-secondary">RESET</button>
          <button
            onClick={onEnd}
            className="font-display tracking-wider text-lg px-5 py-3 rounded-xl bg-magenta text-white shadow-glow-magenta hover:scale-105 active:scale-95 transition-transform"
          >
            END ROUND
          </button>
        </div>
      </div>

      {/* Pause overlay */}
      <AnimatePresence>
        {paused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onPause}
            className="absolute inset-0 z-30 bg-navy-deep/85 flex items-center justify-center backdrop-blur-sm cursor-pointer"
          >
            <div className="text-center">
              <div className="font-display text-9xl tracking-widest text-warning animate-pulseSoft">PAUSED</div>
              <div className="text-white/60 mt-3">Click anywhere to resume.</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable scorecard */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {Object.entries(scenario.scorecard).map(([area, behaviors]) => {
          const areaChecks = checks[area] || {};
          const hits = behaviors.reduce((n, _, i) => n + (areaChecks[i] ? 1 : 0), 0);
          const isPerfect = hits === behaviors.length && behaviors.length > 0;
          const isBonus = isBonusArea(scenario, area);

          return (
            <motion.div
              key={area}
              animate={isPerfect ? { boxShadow: '0 0 28px rgba(255, 210, 48, 0.65)' } : { boxShadow: '0 0 0 rgba(0,0,0,0)' }}
              className={`card overflow-hidden ${isPerfect ? 'border-gold' : ''}`}
            >
              <div className={`px-4 py-3 flex items-center justify-between ${
                isPerfect ? 'bg-gold/15' : isBonus ? 'bg-magenta/10' : 'bg-white/5'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="font-display text-xl tracking-wider">{area.toUpperCase()}</span>
                  {isBonus && (
                    <span className="text-xs font-bold text-magenta-glow bg-magenta/20 border border-magenta/40 rounded-full px-2 py-0.5 tracking-wider">
                      BONUS 1.5×
                    </span>
                  )}
                  {isPerfect && (
                    <span className="text-xs font-bold text-gold bg-gold/20 border border-gold/40 rounded-full px-2 py-0.5 animate-pulseSoft tracking-wider">
                      PERFECT BUCKET +10
                    </span>
                  )}
                </div>
                <div className="text-sm text-white/60 tabular-nums">
                  {hits}/{behaviors.length}
                </div>
              </div>

              <ul className="divide-y divide-white/5">
                {behaviors.map((b, i) => {
                  const checked = !!areaChecks[i];
                  const pts = pointsForBehavior(scenario, area, b.points);
                  return (
                    <li key={i}>
                      <button
                        onClick={() => handleToggle(area, i)}
                        className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                          checked ? 'bg-success/10' : 'hover:bg-white/5'
                        }`}
                      >
                        <CheckMark checked={checked} bonus={isBonus} />
                        <span className={`flex-1 text-sm md:text-base ${checked ? 'text-white' : 'text-white/80'}`}>
                          {b.behavior}
                        </span>
                        <span className={`font-mono tabular-nums font-bold text-base md:text-lg ${
                          checked ? 'text-gold' : isBonus ? 'text-magenta-glow' : 'text-white/40'
                        }`}>
                          +{pts}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          );
        })}

        {/* Manager notes — written live during the round */}
        <div className="card p-4 border-bou/30">
          <label className="text-xs tracking-[0.25em] text-white/50 font-semibold mb-2 block">
            MANAGER NOTES <span className="text-white/30 font-normal normal-case tracking-normal">— jot down coaching points as the round runs</span>
          </label>
          <textarea
            value={notes ?? ''}
            onChange={(e) => onNotesChange?.(e.target.value)}
            placeholder="Strong on discovery but rushed past BANT. Follow up on Salesforce hygiene."
            rows={4}
            className="w-full bg-navy-deep/60 border border-white/10 rounded-xl px-4 py-3 text-sm leading-relaxed resize-y focus:outline-none focus:border-white/30"
          />
        </div>

        <div className="text-center text-xs text-white/40 pt-2 pb-6">
          {score.checkedCount} of {score.totalBehaviors} behaviors checked · base {score.baseTotal} + bucket {score.perfectBonusTotal}
        </div>
      </div>
    </section>
  );
}

function CheckMark({ checked, bonus }) {
  return (
    <motion.span
      animate={checked ? { scale: [1, 1.35, 1] } : { scale: 1 }}
      transition={{ duration: 0.35 }}
      className={`flex items-center justify-center w-7 h-7 rounded-md border-2 shrink-0 ${
        checked
          ? 'bg-success border-success text-navy-deep'
          : bonus
            ? 'border-magenta/50 bg-magenta/5'
            : 'border-white/30 bg-white/5'
      }`}
    >
      {checked ? <span className="font-bold leading-none">+</span> : null}
    </motion.span>
  );
}
