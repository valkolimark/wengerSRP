import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Footer from './Footer.jsx';
import Leaderboard from './Leaderboard.jsx';
import Logo from './Logo.jsx';
import { SCENARIOS, CATEGORIES, pickRandom } from '../lib/scenarios.js';
import { metaFor } from '../lib/categoryStyles.js';
import { play } from '../lib/sound.js';

const ROUND_LENGTHS = [3, 5, 7, 10];

export default function Lobby({ onStart, leaderboardKey, onLeaderboardChange }) {
  const [customerName, setCustomerName] = useState('');
  const [repName, setRepName] = useState('');
  const [selectedCategories, setSelectedCategories] = useState(() => new Set(CATEGORIES));
  const [roundMinutes, setRoundMinutes] = useState(5);
  const [drawing, setDrawing] = useState(false);
  const [spinTitle, setSpinTitle] = useState('');
  const spinTimer = useRef(null);

  const filteredScenarios = useMemo(
    () => SCENARIOS.filter((s) => selectedCategories.has(s.category)),
    [selectedCategories]
  );

  useEffect(() => () => clearInterval(spinTimer.current), []);

  function toggleCategory(cat) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      // never let them deselect everything
      if (next.size === 0) return prev;
      return next;
    });
  }

  function handleDraw() {
    if (drawing) return;
    if (!filteredScenarios.length) return;
    play('draw');
    setDrawing(true);

    const startedAt = Date.now();
    const spinDuration = 1800;
    spinTimer.current = setInterval(() => {
      const random = pickRandom(filteredScenarios);
      setSpinTitle(random?.title || '');
      if (Date.now() - startedAt >= spinDuration) {
        clearInterval(spinTimer.current);
        const chosen = pickRandom(filteredScenarios);
        setSpinTitle(chosen.title);
        setTimeout(() => {
          play('whoosh');
          onStart({
            scenario: chosen,
            customerName: customerName.trim() || 'Customer',
            repName: repName.trim() || 'Sales Rep',
            roundSeconds: roundMinutes * 60,
          });
        }, 600);
      }
    }, 80);
  }

  return (
    <div className="min-h-screen flex flex-col bg-grid">
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 space-y-10">
        <header className="text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center"
          >
            <Logo variant="dk" size="lg" dim />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="font-display text-7xl md:text-8xl tracking-wider leading-none"
          >
            <span className="bg-gradient-to-r from-magenta via-gold to-cyan bg-clip-text text-transparent">
              WENGER ROLE PLAY
            </span>
          </motion.h1>
          <p className="text-white/70 text-lg md:text-xl">
            Pick your scenario. Run the play. Win the room.
          </p>
        </header>

        {/* Player cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <PlayerCard
            label="CUSTOMER PLAYER"
            icon="🎯"
            placeholder="Who's playing the customer?"
            value={customerName}
            onChange={setCustomerName}
            accent="text-cyan border-cyan/40 shadow-glow-cyan"
          />
          <PlayerCard
            label="SALES REP PLAYER"
            icon="🎤"
            placeholder="Who's making the call?"
            value={repName}
            onChange={setRepName}
            accent="text-magenta-glow border-magenta/40 shadow-glow-magenta"
          />
        </section>

        {/* Category filter */}
        <section className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-display text-2xl tracking-wider">SCENARIO CATEGORIES</div>
            <div className="text-xs text-white/50">{filteredScenarios.length} in pool</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const active = selectedCategories.has(cat);
              const meta = metaFor(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`chip ${active ? meta.color : 'bg-white/5 text-white/40 border-white/10'}`}
                >
                  <span className="mr-1.5">{meta.icon}</span>{cat}
                </button>
              );
            })}
          </div>
        </section>

        {/* Round length */}
        <section className="card p-5">
          <div className="font-display text-2xl tracking-wider mb-3">ROUND LENGTH</div>
          <div className="flex flex-wrap gap-2">
            {ROUND_LENGTHS.map((m) => (
              <button
                key={m}
                onClick={() => setRoundMinutes(m)}
                className={`px-5 py-3 rounded-xl font-display text-2xl tracking-wider border transition-all ${
                  roundMinutes === m
                    ? 'bg-cyan/20 border-cyan text-cyan shadow-glow-cyan'
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                }`}
              >
                {m} MIN
              </button>
            ))}
          </div>
        </section>

        {/* Draw button */}
        <section className="text-center">
          <motion.button
            onClick={handleDraw}
            disabled={drawing || filteredScenarios.length === 0}
            whileHover={!drawing ? { scale: 1.04 } : {}}
            whileTap={!drawing ? { scale: 0.96 } : {}}
            className="btn-primary text-3xl px-12 py-6 disabled:hover:scale-100"
          >
            {drawing ? 'DRAWING…' : '🎲  DRAW SCENARIO'}
          </motion.button>

          <AnimatePresence>
            {drawing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-5 text-cyan font-display text-2xl tracking-wider h-8"
              >
                {spinTitle}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <Leaderboard refreshKey={leaderboardKey} onCleared={onLeaderboardChange} />
      </main>
      <Footer />
    </div>
  );
}

function PlayerCard({ label, icon, placeholder, value, onChange, accent }) {
  return (
    <div className={`card p-5 border-2 ${accent}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="text-3xl">{icon}</div>
        <div className="font-display text-xl tracking-wider opacity-90">{label}</div>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-navy-deep/60 border border-white/10 rounded-xl px-4 py-3 text-lg font-semibold focus:outline-none focus:border-white/30"
      />
    </div>
  );
}
