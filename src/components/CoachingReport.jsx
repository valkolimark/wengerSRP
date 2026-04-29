import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { buildCoachingReports, downloadMarkdown } from '../lib/report.js';
import Logo from './Logo.jsx';

const PRIORITY_STYLE = {
  HIGH:   'bg-magenta/15 border-magenta/40 text-magenta-glow',
  MEDIUM: 'bg-warning/15 border-warning/40 text-warning',
  NOTE:   'bg-cyan/10 border-cyan/40 text-cyan',
};

export default function CoachingReport({ onClose }) {
  const reports = useMemo(() => buildCoachingReports(), []);

  function handlePrint() {
    window.print();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="coaching-report-root fixed inset-0 z-40 bg-navy-deep backdrop-blur-sm overflow-y-auto"
    >
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header — visible on screen and in print */}
        <header className="flex items-center justify-between mb-6 gap-4 flex-wrap border-b border-white/15 pb-5">
          <div className="flex items-center gap-4">
            <Logo variant="dk" size="md" />
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
                COACHING REPORT
              </div>
              <div className="text-xs text-white/50 mt-1 tracking-wide">
                Wenger Role Play · {new Date().toLocaleString()} · {reports.length} rep{reports.length === 1 ? '' : 's'}
              </div>
            </div>
          </div>
          <div className="flex gap-2 print:hidden">
            <button onClick={handlePrint} className="btn-secondary">PRINT / SAVE PDF</button>
            <button
              onClick={() => downloadMarkdown(reports)}
              className="btn-secondary"
              disabled={reports.length === 0}
            >
              MARKDOWN
            </button>
            <button
              onClick={onClose}
              className="font-display tracking-wider text-lg px-5 py-3 rounded-xl bg-magenta text-white shadow-glow-magenta hover:scale-105 active:scale-95"
            >
              CLOSE
            </button>
          </div>
        </header>

        {reports.length === 0 ? (
          <div className="card p-10 text-center text-white/60">
            No saved rounds yet. Save some rounds to the leaderboard, then come back here.
          </div>
        ) : (
          <div className="space-y-6">
            {reports.map((r) => <RepCard key={r.name} rep={r} />)}
          </div>
        )}

        {/* Print footer — only appears in PDF/print */}
        <footer className="hidden print:block text-[10px] text-white/50 tracking-[0.25em] text-center pt-6 mt-6 border-t border-white/15">
          WENGER ROLE PLAY · COACHING REPORT · {new Date().toLocaleDateString()}
        </footer>
      </div>

      {/* Print styling — preserves the on-screen dark Wenger theme in PDF/print output */}
      <style>{`
        @media print {
          /* Tell every browser we want exact backgrounds and colors in print */
          html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          @page { margin: 0.45in; size: letter; }

          /* Force the dark page background to render on paper */
          html, body {
            background: #001f36 !important;
            color: #F5F8FF !important;
          }
          body {
            background:
              radial-gradient(circle at 15% 10%, rgba(105, 174, 189, 0.18), transparent 45%),
              radial-gradient(circle at 85% 90%, rgba(95, 177, 226, 0.18), transparent 45%),
              linear-gradient(180deg, #001f36 0%, #003658 100%) !important;
          }

          /* The fullscreen overlay loses its fixed positioning in print so the
             page can flow naturally across multiple sheets. */
          .coaching-report-root {
            position: static !important;
            inset: auto !important;
            overflow: visible !important;
            background: transparent !important;
            backdrop-filter: none !important;
          }

          /* Every card prints as a solid panel and avoids splitting across pages
             so a rep's section stays together when possible. */
          .card,
          article.card { break-inside: avoid; page-break-inside: avoid; }

          /* Each rep on its own page if they're long. */
          article.card + article.card { break-before: page; page-break-before: always; }

          /* Hide interactive chrome cleanly */
          .print\\:hidden { display: none !important; }

          /* Disable framer-motion animations to keep print stable */
          [data-framer-motion], .motion-safe\\:animate-pulseSoft { animation: none !important; }
        }
      `}</style>
    </motion.div>
  );
}

function RepCard({ rep }) {
  return (
    <article className="card p-6 space-y-5 print:break-inside-avoid">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="font-display text-3xl tracking-wide">{rep.name}</div>
          <div className="text-sm text-white/60">
            {rep.rounds} round{rep.rounds === 1 ? '' : 's'} · avg <span className="text-gold font-bold">{rep.avgScore}</span> · best <span className="text-gold font-bold">{rep.bestScore}</span>
            {rep.bestRound && <span className="text-white/40"> ({rep.bestRound})</span>}
          </div>
        </div>
        {rep.trend && (
          <div className={`text-right ${
            rep.trend.delta > 0 ? 'text-success' : rep.trend.delta < 0 ? 'text-warning' : 'text-white/60'
          }`}>
            <div className="text-[10px] tracking-[0.3em] text-white/50 font-semibold">TREND</div>
            <div className="font-mono tabular-nums text-lg">
              {rep.trend.first} → {rep.trend.second}
              <span className="ml-2">{rep.trend.delta > 0 ? '▲' : rep.trend.delta < 0 ? '▼' : '–'} {rep.trend.delta >= 0 ? '+' : ''}{rep.trend.delta}</span>
            </div>
          </div>
        )}
      </header>

      {/* Action items */}
      <section>
        <div className="font-display text-xl tracking-wider mb-2">WHAT TO WORK ON</div>
        {rep.actionItems.length === 0 ? (
          <div className="text-success">No major gaps. Keep doing what you're doing.</div>
        ) : (
          <ul className="space-y-2">
            {rep.actionItems.map((a, i) => (
              <li key={i} className={`p-3 rounded-xl border text-sm ${PRIORITY_STYLE[a.priority] || 'bg-white/5 border-white/10'}`}>
                <span className="font-bold text-xs mr-2 tracking-wider">{a.priority}</span>
                <span className="text-white/90">{a.text}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Category grid */}
      {rep.categoryRanked.length > 0 && (
        <section>
          <div className="font-display text-xl tracking-wider mb-2">CATEGORY HIT RATES</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {rep.categoryRanked.map((c) => (
              <div key={c.area} className="text-sm">
                <div className="flex items-center justify-between mb-0.5">
                  <span>
                    {c.area}
                    {c.isBonus && <span className="ml-1 text-magenta-glow text-[10px] font-bold tracking-wider">·BONUS</span>}
                    {c.perfectCount > 0 && <span className="ml-1 text-gold text-[10px] font-bold tracking-wider">·PERFECT ×{c.perfectCount}</span>}
                  </span>
                  <span className="font-mono tabular-nums text-white/70 text-xs">
                    {c.hits}/{c.total} · {Math.round(c.rate * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      c.rate >= 0.8 ? 'bg-success' :
                      c.rate >= 0.5 ? 'bg-cyan' :
                      'bg-warning'
                    }`}
                    style={{ width: `${c.rate * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Top missed */}
      {rep.topMissed.length > 0 && (
        <section>
          <div className="font-display text-xl tracking-wider mb-2">MOST-FREQUENTLY-MISSED BEHAVIORS</div>
          <ul className="space-y-1.5">
            {rep.topMissed.map((m, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className={`font-mono tabular-nums text-xs px-1.5 py-0.5 rounded ${
                  m.bonus ? 'bg-magenta/20 text-magenta-glow' : 'bg-white/10 text-white/70'
                }`}>
                  ×{m.count}
                </span>
                <div className="flex-1">
                  <div className="text-white">{m.behavior}</div>
                  <div className="text-xs text-white/50">{m.area}{m.bonus ? ' · BONUS' : ''}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Strengths */}
      {rep.strengths.length > 0 && (
        <section>
          <div className="font-display text-xl tracking-wider mb-2 text-success">STRENGTHS</div>
          <div className="flex flex-wrap gap-2">
            {rep.strengths.map((c) => (
              <span key={c.area} className="text-xs px-3 py-1.5 rounded-full bg-success/15 border border-success/40 text-success font-semibold">
                {c.area} · {Math.round(c.rate * 100)}%{c.isBonus ? ' · BONUS' : ''}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Manager notes */}
      {rep.notes.length > 0 && (
        <section>
          <div className="font-display text-xl tracking-wider mb-2 text-cyan">MANAGER NOTES</div>
          <ul className="space-y-2">
            {rep.notes.map((n, i) => (
              <li key={i} className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm">
                <div className="text-xs text-white/50 mb-1">
                  {n.date} · {n.scenario} · score <span className="text-gold">{n.score}</span>
                </div>
                <div className="text-white/90 whitespace-pre-wrap">{n.note}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Scenarios played */}
      {rep.scenariosPlayed.length > 0 && (
        <section>
          <div className="text-[10px] tracking-[0.25em] text-white/40 font-semibold mb-1">SCENARIOS PLAYED</div>
          <div className="text-xs text-white/60">{rep.scenariosPlayed.join(' · ')}</div>
        </section>
      )}
    </article>
  );
}
