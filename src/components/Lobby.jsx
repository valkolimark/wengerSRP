import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Footer from './Footer.jsx';
import Leaderboard from './Leaderboard.jsx';
import Logo from './Logo.jsx';
import { SCENARIOS, CATEGORIES, pickRandom } from '../lib/scenarios.js';
import { metaFor } from '../lib/categoryStyles.js';
import { play } from '../lib/sound.js';
import {
  getCustomerRoster,
  addToCustomerRoster,
  getRepRoster,
  addToRepRoster,
} from '../lib/roster.js';

const ROUND_LENGTHS = [3, 5, 7, 10];
const MAX_REPS = 3;

export default function Lobby({ onStart, leaderboardKey, onLeaderboardChange }) {
  const [customerName, setCustomerName] = useState('');
  const [repNames, setRepNames] = useState([]);
  const [customerVersion, setCustomerVersion] = useState(0);
  const [repVersion, setRepVersion] = useState(0);
  const customerRoster = useMemo(() => getCustomerRoster(), [customerVersion]);
  const repRoster = useMemo(() => getRepRoster(), [repVersion]);
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

  function addRep(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    setRepNames((prev) => {
      if (prev.includes(trimmed)) return prev;
      if (prev.length >= MAX_REPS) return prev;
      return [...prev, trimmed];
    });
  }

  function removeRep(name) {
    setRepNames((prev) => prev.filter((n) => n !== name));
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
          const repLabel = repNames.length ? repNames.join(' & ') : 'Sales Rep';
          onStart({
            scenario: chosen,
            customerName: customerName.trim() || 'Customer',
            repName: repLabel,
            repNames: repNames.length ? [...repNames] : [],
            roundSeconds: roundMinutes * 60,
          });
        }, 600);
      }
    }, 80);
  }

  return (
    <div className="min-h-screen flex flex-col bg-grid">
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 space-y-10">
        <header className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-10 border-b border-white/10 pb-8">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="shrink-0"
          >
            <Logo variant="dk" size="xl" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="md:border-l md:border-white/15 md:pl-10"
          >
            <h1
              className="font-display text-6xl md:text-8xl tracking-wider leading-none text-leaf"
              style={{
                backgroundImage: 'linear-gradient(90deg, #87c440 0%, #69aebd 50%, #5fb1e2 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              WENGER ROLE PLAY
            </h1>
            <p className="text-white/70 text-lg md:text-xl mt-3">
              Pick your scenario. Run the play. Win the room.
            </p>
          </motion.div>
        </header>

        {/* Player cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <CustomerCard
            value={customerName}
            onChange={setCustomerName}
            roster={customerRoster}
            onAdded={() => setCustomerVersion((v) => v + 1)}
          />
          <RepCard
            selected={repNames}
            onAdd={addRep}
            onRemove={removeRep}
            roster={repRoster}
            onRosterAdded={() => setRepVersion((v) => v + 1)}
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
                  {cat}
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
            {drawing ? 'DRAWING…' : 'DRAW SCENARIO'}
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

const ADD_NEW = '__ADD_NEW__';

function RosterDropdown({ value, onSelect, onAddNew, placeholder, options, addLabel = '＋ Add a new player…' }) {
  function handleChange(e) {
    const v = e.target.value;
    if (v === ADD_NEW) {
      onAddNew();
      return;
    }
    onSelect(v);
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      className="w-full bg-navy-deep/60 border border-white/10 rounded-xl px-4 py-3 text-lg font-semibold focus:outline-none focus:border-white/30 appearance-none cursor-pointer"
      style={{
        backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 20 20\' fill=\'%23ffffff80\'><path d=\'M5.25 7.5L10 12.25L14.75 7.5H5.25Z\'/></svg>")',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 0.85rem center',
        backgroundSize: '1.1rem',
        paddingRight: '2.5rem',
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((name) => (
        <option key={name} value={name}>{name}</option>
      ))}
      <option value={ADD_NEW}>{addLabel}</option>
    </select>
  );
}

function AddNewInput({ onCommit, onCancel, placeholder }) {
  const [name, setName] = useState('');
  function commit() {
    const trimmed = name.trim();
    if (!trimmed) {
      onCancel();
      return;
    }
    onCommit(trimmed);
  }
  return (
    <div className="flex gap-2">
      <input
        type="text"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') onCancel();
        }}
        placeholder={placeholder}
        className="flex-1 bg-navy-deep/60 border border-white/10 rounded-xl px-4 py-3 text-lg font-semibold focus:outline-none focus:border-white/30"
      />
      <button
        type="button"
        onClick={commit}
        className="px-4 py-2 rounded-xl bg-leaf/20 border border-leaf/50 text-leaf font-semibold hover:bg-leaf/30"
      >
        ADD
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white/60 hover:text-white"
      >
        ✕
      </button>
    </div>
  );
}

function CustomerCard({ value, onChange, roster, onAdded }) {
  const [adding, setAdding] = useState(false);

  function commitNew(name) {
    addToCustomerRoster(name);
    onChange(name);
    setAdding(false);
    onAdded?.();
  }

  return (
    <div className="card p-5 border-2 text-cyan border-cyan/40 shadow-glow-cyan">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg border flex items-center justify-center font-display text-2xl tracking-wide bg-cyan/15 text-cyan border-cyan/40">
          C
        </div>
        <div className="font-display text-xl tracking-wider opacity-90">CUSTOMER PLAYER</div>
      </div>

      {adding ? (
        <AddNewInput
          placeholder="Type the new customer name…"
          onCommit={commitNew}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <RosterDropdown
          value={value}
          onSelect={onChange}
          onAddNew={() => { onChange(''); setAdding(true); }}
          placeholder="Pick the customer player…"
          options={roster}
          addLabel="＋ Add a new customer…"
        />
      )}
    </div>
  );
}

function RepCard({ selected, onAdd, onRemove, roster, onRosterAdded }) {
  const [adding, setAdding] = useState(false);
  const atLimit = selected.length >= MAX_REPS;
  const available = roster.filter((name) => !selected.includes(name));

  function commitNew(name) {
    addToRepRoster(name);
    onAdd(name);
    setAdding(false);
    onRosterAdded?.();
  }

  function handleSelect(name) {
    if (!name) return;
    onAdd(name);
  }

  return (
    <div className="card p-5 border-2 text-leaf border-leaf/40 shadow-glow-gold">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg border flex items-center justify-center font-display text-2xl tracking-wide bg-leaf/15 text-leaf border-leaf/40">
            R
          </div>
          <div className="font-display text-xl tracking-wider opacity-90">SALES REP PLAYER(S)</div>
        </div>
        <div className="text-[10px] tracking-[0.2em] text-white/40 font-semibold">
          {selected.length}/{MAX_REPS}
        </div>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selected.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-leaf/15 border border-leaf/40 text-leaf text-sm font-semibold"
            >
              {name}
              <button
                type="button"
                onClick={() => onRemove(name)}
                className="text-leaf/70 hover:text-white text-base leading-none"
                aria-label={`Remove ${name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {adding ? (
        <AddNewInput
          placeholder="Type the new rep's name…"
          onCommit={commitNew}
          onCancel={() => setAdding(false)}
        />
      ) : atLimit ? (
        <div className="text-xs text-white/40 italic">
          Up to {MAX_REPS} reps can be scored together. Remove one to add another.
        </div>
      ) : (
        <RosterDropdown
          value=""
          onSelect={handleSelect}
          onAddNew={() => setAdding(true)}
          placeholder={selected.length ? 'Add another rep…' : 'Pick the sales rep player…'}
          options={available}
          addLabel="＋ Add a new rep…"
        />
      )}

      {selected.length > 1 && (
        <div className="text-[11px] text-white/50 mt-3 leading-relaxed">
          Reps are scored as a group. The round will be saved under
          <span className="text-leaf font-semibold"> {selected.join(' & ')}</span>.
        </div>
      )}
    </div>
  );
}
