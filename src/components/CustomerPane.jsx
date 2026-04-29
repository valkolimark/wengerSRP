import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { metaFor } from '../lib/categoryStyles.js';

export default function CustomerPane({ scenario, customerName }) {
  const meta = metaFor(scenario.category);

  return (
    <aside className="h-full overflow-y-auto p-5 space-y-4 border-r border-white/10 bg-navy/50">
      <div className="text-xs tracking-[0.3em] text-white/40 font-semibold">CUSTOMER VIEW</div>

      {/* Persona card */}
      <div className={`card p-5 border-2 ${meta.color}`}>
        <div className="flex items-start gap-3">
          <div className="text-4xl">{meta.icon}</div>
          <div className="flex-1">
            <div className="text-xs tracking-widest opacity-70 font-semibold">PLAYING</div>
            <div className="font-display text-3xl tracking-wide leading-tight">{scenario.persona.name}</div>
            <div className="text-sm opacity-90">{scenario.persona.role}</div>
            <div className="text-sm opacity-70">{scenario.persona.organization}</div>
            <div className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-bold border ${meta.color}`}>
              {scenario.category}
            </div>
            {customerName && (
              <div className="mt-3 text-xs text-white/50">
                Performed by <span className="font-semibold text-white/80">{customerName}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Opening line */}
      <div className="card p-5 border-l-4 border-cyan">
        <div className="text-xs tracking-[0.25em] text-cyan font-semibold mb-2">YOUR OPENING LINE</div>
        <blockquote className="text-lg leading-relaxed text-white">
          <span className="text-cyan/60 text-3xl leading-none mr-1 align-top">“</span>
          {scenario.openingLine}
          <span className="text-cyan/60 text-3xl leading-none ml-1 align-bottom">”</span>
        </blockquote>
      </div>

      {/* What you know */}
      <div className="card p-5">
        <div className="text-xs tracking-[0.25em] text-gold font-semibold mb-2">WHAT YOU KNOW</div>
        <p className="text-sm leading-relaxed text-white/85">{scenario.customerContext}</p>
      </div>

      {/* Hidden info */}
      <div>
        <div className="text-xs tracking-[0.25em] text-magenta-glow font-semibold mb-2">HIDDEN INFO — REVEAL ONLY WHEN ASKED</div>
        <div className="space-y-2">
          {scenario.hiddenInfo.map((info, i) => (
            <HiddenCard key={i} info={info} />
          ))}
        </div>
      </div>
    </aside>
  );
}

function HiddenCard({ info }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen((o) => !o)}
      className={`w-full text-left card p-3 transition-all ${
        open ? 'border-magenta/60 bg-magenta/10' : 'hover:border-white/20'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl">{info.icon}</div>
        <div className="flex-1">
          <div className="text-xs tracking-widest text-white/50 font-semibold">IF ASKED ABOUT</div>
          <div className="font-display text-lg tracking-wide">{info.trigger}</div>
        </div>
        <div className="text-white/40 text-sm">{open ? '▴' : '▾'}</div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-2 text-sm leading-relaxed text-white/90 border-t border-white/10 mt-2">
              {info.reveal}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
