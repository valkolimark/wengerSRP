import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import Logo from './Logo.jsx';

function fmtDateTime(ts) {
  try { return new Date(Number(ts)).toLocaleString(); } catch { return ''; }
}

export default function EntryDetail({ entry, onClose }) {
  if (!entry || typeof document === 'undefined') return null;

  const breakdown = entry.breakdown || [];
  const hits = entry.hitBehaviors || [];
  const misses = entry.missedBehaviors || [];
  const bonusBreakdown = breakdown.filter((b) => b.isBonus);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="entry-detail-root fixed inset-0 z-50 bg-navy-deep/90 backdrop-blur-sm overflow-y-auto"
    >
      {/* On-screen view */}
      <div className="entry-detail-screen max-w-5xl mx-auto p-6 my-6">
        <header className="card p-5 mb-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Logo variant="dk" size="sm" />
            <div className="border-l border-white/15 pl-4">
              <div className="font-display text-3xl tracking-wider text-leaf">ROUND DETAIL</div>
              <div className="text-xs text-white/50 mt-1">
                {fmtDateTime(entry.timestamp)} · {entry.scenarioCategory || 'Uncategorized'}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTimeout(() => window.print(), 0)}
              className="btn-secondary"
            >
              PRINT / SAVE PDF
            </button>
            <button
              onClick={onClose}
              className="font-display tracking-wider text-lg px-5 py-3 rounded-xl bg-magenta text-white shadow-glow-magenta hover:scale-105 active:scale-95"
            >
              CLOSE
            </button>
          </div>
        </header>

        <div className="card p-6 space-y-6">
          {/* Headline */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Stat label="REP" value={entry.repName || '—'} accent="text-leaf" />
            <Stat label="CUSTOMER" value={entry.customerName || '—'} accent="text-cyan" />
            <Stat label="SCENARIO" value={entry.scenarioTitle || '—'} accent="text-white" />
          </section>

          {/* Big score */}
          <section className="text-center py-4 border-y border-white/10">
            <div className="text-xs tracking-[0.4em] text-white/40 font-semibold mb-1">FINAL SCORE</div>
            <div className="font-mono tabular-nums text-7xl md:text-8xl leading-none font-bold text-gold">
              {entry.score ?? 0}
            </div>
            <div className="text-sm text-white/60 mt-2">
              {entry.behaviorsHit ?? 0}/{entry.behaviorsTotal ?? 0} behaviors hit
            </div>
          </section>

          {/* Breakdown */}
          {breakdown.length > 0 && (
            <section>
              <div className="font-display text-2xl tracking-wider mb-3">SCORE BREAKDOWN</div>
              <div className="space-y-2">
                {breakdown.map((b) => {
                  const pct = b.total > 0 ? (b.hits / b.total) * 100 : 0;
                  return (
                    <div key={b.area}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{b.area}</span>
                          {b.isBonus && <span className="text-[10px] text-magenta-glow font-bold tracking-wider">BONUS</span>}
                          {b.perfect && <span className="text-[10px] text-gold font-bold tracking-wider">PERFECT</span>}
                        </div>
                        <div className="font-mono tabular-nums text-white/70">
                          {b.hits} / {b.total}
                        </div>
                      </div>
                      <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            b.perfect ? 'bg-gradient-to-r from-gold to-success' :
                            b.isBonus ? 'bg-gradient-to-r from-magenta to-cyan' :
                            'bg-cyan'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Hits and misses */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-success/30 bg-success/5 p-4">
              <div className="font-display text-xl tracking-wider mb-2 text-success">
                BEHAVIORS HIT ({hits.length})
              </div>
              {hits.length === 0 ? (
                <div className="text-white/50 italic text-sm">None.</div>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {hits.map((h, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-success mt-0.5 font-bold">+</span>
                      <div>
                        <div className="text-white">{h.behavior}</div>
                        <div className="text-xs text-white/50">{h.area}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
              <div className="font-display text-xl tracking-wider mb-2 text-warning">
                BEHAVIORS MISSED ({misses.length})
              </div>
              {misses.length === 0 ? (
                <div className="text-success font-semibold">Clean sheet.</div>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {misses.map((m, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-warning/70 mt-0.5 font-bold">−</span>
                      <div>
                        <div className="text-white/85">{m.behavior}</div>
                        <div className="text-xs text-white/50">
                          {m.area}{m.bonus ? ' · BONUS' : ''}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Bonus coaching */}
          {bonusBreakdown.length > 0 && (
            <section>
              <div className="font-display text-xl tracking-wider mb-3 text-magenta-glow">
                BONUS-CATEGORY COACHING
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {bonusBreakdown.map((b) => (
                  <div
                    key={b.area}
                    className={`p-3 rounded-xl border ${
                      b.perfect ? 'border-gold bg-gold/10' :
                      b.hits > 0 ? 'border-cyan/40 bg-cyan/5' :
                      'border-warning/40 bg-warning/5'
                    }`}
                  >
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
          )}

          {/* Notes */}
          <section>
            <div className="font-display text-xl tracking-wider mb-2 text-cyan">MANAGER NOTES</div>
            {entry.notes ? (
              <div className="bg-navy-deep/60 border border-white/10 rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap text-white/90">
                {entry.notes}
              </div>
            ) : (
              <div className="bg-navy-deep/40 border border-white/5 rounded-xl p-4 text-sm italic text-white/40">
                No notes were captured for this round.
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Print-only clean view */}
      <div className="entry-detail-print">
        <header className="ed-print-header">
          <img src="/images/logos/logo-lt.png" alt="Wenger Corporation" className="ed-print-logo" />
          <div>
            <h1 className="ed-print-title">Wenger Role Play — Round Detail</h1>
            <div className="ed-print-meta">
              {fmtDateTime(entry.timestamp)} · {entry.scenarioCategory || ''}
            </div>
          </div>
        </header>

        <section className="ed-print-summary">
          <table className="ed-print-grid">
            <tbody>
              <tr><th>Rep</th><td>{entry.repName || '—'}</td></tr>
              <tr><th>Customer</th><td>{entry.customerName || '—'}</td></tr>
              <tr><th>Scenario</th><td>{entry.scenarioTitle || '—'}</td></tr>
              <tr><th>Score</th><td><strong>{entry.score ?? 0}</strong> ({entry.behaviorsHit ?? 0}/{entry.behaviorsTotal ?? 0} behaviors hit)</td></tr>
            </tbody>
          </table>
        </section>

        {breakdown.length > 0 && (
          <section className="ed-print-section">
            <h2 className="ed-print-section-title">Score Breakdown</h2>
            <table className="ed-print-cat-table">
              <tbody>
                {breakdown.map((b) => {
                  const pct = b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0;
                  const barCls = pct >= 80 ? 'high' : pct >= 50 ? 'mid' : 'low';
                  return (
                    <tr key={b.area}>
                      <td className="ed-cat-name">
                        {b.area}
                        {b.isBonus && <span className="ed-flag ed-flag-bonus">BONUS</span>}
                        {b.perfect && <span className="ed-flag ed-flag-perfect">PERFECT</span>}
                      </td>
                      <td className="ed-cat-bar-cell">
                        <div className="ed-cat-bar"><div className={`ed-cat-bar-fill ${barCls}`} style={{ width: `${pct}%` }} /></div>
                      </td>
                      <td className="ed-cat-pct">{b.hits}/{b.total} · {pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

        <section className="ed-print-twocol">
          {hits.length > 0 && (
            <div>
              <h2 className="ed-print-section-title">Behaviors Hit ({hits.length})</h2>
              <ul className="ed-list">
                {hits.map((h, i) => (
                  <li key={i}><strong>{h.behavior}</strong><span className="ed-area"> · {h.area}</span></li>
                ))}
              </ul>
            </div>
          )}
          {misses.length > 0 && (
            <div>
              <h2 className="ed-print-section-title">Behaviors Missed ({misses.length})</h2>
              <ul className="ed-list">
                {misses.map((m, i) => (
                  <li key={i}><strong>{m.behavior}</strong><span className="ed-area"> · {m.area}{m.bonus ? ' (bonus)' : ''}</span></li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {entry.notes && (
          <section className="ed-print-section">
            <h2 className="ed-print-section-title">Manager Notes</h2>
            <div className="ed-print-notes">{entry.notes}</div>
          </section>
        )}

        <footer className="ed-print-footer">
          Wenger Role Play · Round Detail · {new Date().toLocaleDateString()}
        </footer>
      </div>

      <style>{`
        .entry-detail-print { display: none; }

        @media print {
          /* Generous margins on all sides so nothing prints to the edge. */
          @page { margin: 1in 1in 1in 1in; size: letter; }
          @page :first { margin-top: 1in; }

          #root { display: none !important; }
          .entry-detail-screen { display: none !important; }
          .entry-detail-print { display: block !important; }

          .entry-detail-root {
            position: static !important;
            inset: auto !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            background: white !important;
            backdrop-filter: none !important;
            opacity: 1 !important;
            transform: none !important;
          }

          /* Cancel framer-motion residue */
          .entry-detail-root [style*="opacity"],
          .entry-detail-root [style*="transform"] {
            opacity: 1 !important;
            transform: none !important;
          }

          html, body {
            background: white !important;
            color: #1e1e1e !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .entry-detail-print {
            font-family: 'Inter', system-ui, sans-serif;
            color: #1e1e1e;
            background: white;
            font-size: 10.5pt;
            line-height: 1.45;
            /* Belt-and-suspenders inner padding so content stays inside the page margin. */
            padding: 6pt 10pt;
            box-sizing: border-box;
            max-width: 100%;
          }

          .ed-print-header {
            display: flex;
            align-items: center;
            gap: 16pt;
            border-bottom: 2pt solid #003658;
            padding-bottom: 10pt;
            margin-bottom: 14pt;
          }
          .ed-print-logo { height: 40pt; width: auto; }
          .ed-print-title {
            font-family: 'Bebas Neue', 'Anton', sans-serif;
            font-size: 22pt;
            color: #003658;
            margin: 0;
            letter-spacing: 0.05em;
          }
          .ed-print-meta { font-size: 9pt; color: #626366; margin-top: 2pt; }

          .ed-print-summary { margin-bottom: 14pt; }
          .ed-print-grid {
            width: 100%;
            border-collapse: collapse;
            font-size: 10.5pt;
          }
          .ed-print-grid th {
            text-align: left;
            color: #003658;
            font-family: 'Bebas Neue', sans-serif;
            font-size: 10pt;
            letter-spacing: 0.06em;
            padding: 4pt 10pt 4pt 0;
            width: 80pt;
            vertical-align: top;
          }
          .ed-print-grid td { padding: 4pt 0; }
          .ed-print-grid strong { color: #003658; }

          .ed-print-section { margin-top: 14pt; }
          .ed-print-section-title {
            font-family: 'Bebas Neue', 'Anton', sans-serif;
            font-size: 13pt;
            color: #003658;
            margin: 0 0 6pt 0;
            letter-spacing: 0.06em;
            border-bottom: 1pt solid #bbbdc0;
            padding-bottom: 2pt;
          }

          .ed-print-cat-table { width: 100%; border-collapse: collapse; font-size: 10pt; }
          .ed-print-cat-table tr { page-break-inside: avoid; }
          .ed-print-cat-table td { padding: 3pt 4pt; vertical-align: middle; border-bottom: 0.5pt solid #e5e7eb; }
          .ed-cat-name { font-weight: 600; color: #003658; }
          .ed-flag {
            display: inline-block;
            font-size: 7.5pt;
            font-weight: 700;
            letter-spacing: 0.08em;
            margin-left: 4pt;
            padding: 0.5pt 4pt;
            border-radius: 2pt;
            color: white;
            vertical-align: 1pt;
          }
          .ed-flag-bonus { background: #cb6918; }
          .ed-flag-perfect { background: #87c440; }
          .ed-cat-bar-cell { width: 35%; }
          .ed-cat-bar {
            height: 6pt;
            background: #e5e7eb;
            border-radius: 2pt;
            overflow: hidden;
          }
          .ed-cat-bar-fill { height: 100%; }
          .ed-cat-bar-fill.high { background: #006254; }
          .ed-cat-bar-fill.mid  { background: #69aebd; }
          .ed-cat-bar-fill.low  { background: #cb6918; }
          .ed-cat-pct { text-align: right; font-weight: 600; color: #003658; width: 18%; white-space: nowrap; }

          .ed-print-twocol {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 18pt;
            margin-top: 14pt;
          }
          .ed-list {
            list-style: none;
            padding: 0;
            margin: 0;
          }
          .ed-list li {
            padding: 3pt 0 3pt 12pt;
            position: relative;
            page-break-inside: avoid;
            font-size: 10pt;
          }
          .ed-list li::before {
            content: "";
            position: absolute;
            left: 0; top: 9pt;
            width: 4pt; height: 4pt;
            background: #87c440;
            border-radius: 50%;
          }
          .ed-area { color: #626366; font-size: 9pt; }

          .ed-print-notes {
            background: #f4f6f8;
            border-left: 3pt solid #69aebd;
            padding: 8pt 10pt;
            font-size: 10pt;
            white-space: pre-wrap;
          }

          .ed-print-footer {
            margin-top: 24pt;
            padding-top: 8pt;
            border-top: 1pt solid #bbbdc0;
            font-size: 8.5pt;
            color: #626366;
            text-align: center;
            letter-spacing: 0.15em;
            text-transform: uppercase;
          }
        }
      `}</style>
    </motion.div>,
    document.body
  );
}

function Stat({ label, value, accent }) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.25em] text-white/50 font-semibold mb-1">{label}</div>
      <div className={`font-display text-2xl tracking-wide ${accent}`}>{value}</div>
    </div>
  );
}
