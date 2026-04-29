import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { buildCoachingReports, downloadMarkdown } from '../lib/report.js';
import Logo from './Logo.jsx';

const ALL = '__ALL__';

const PRIORITY_STYLE = {
  HIGH:   'bg-magenta/15 border-magenta/40 text-magenta-glow',
  MEDIUM: 'bg-warning/15 border-warning/40 text-warning',
  NOTE:   'bg-cyan/10 border-cyan/40 text-cyan',
};

export default function CoachingReport({ onClose }) {
  const reports = useMemo(() => buildCoachingReports(), []);
  const [printSelection, setPrintSelection] = useState(ALL);

  // Reports actually rendered into the print-only view, filtered by the picker.
  const printReports = useMemo(() => {
    if (printSelection === ALL) return reports;
    return reports.filter((r) => r.name === printSelection);
  }, [reports, printSelection]);

  function handlePrint(targetName) {
    if (targetName !== undefined) setPrintSelection(targetName);
    // Defer print one tick so the filtered render commits first
    setTimeout(() => window.print(), 0);
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="coaching-report-root fixed inset-0 z-40 bg-navy-deep backdrop-blur-sm overflow-y-auto"
    >
      {/* On-screen rich dark version */}
      <div className="coaching-report-screen max-w-5xl mx-auto px-6 py-10">
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
          <div className="flex gap-2 items-center flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-[10px] tracking-[0.25em] text-white/50 font-semibold">PRINT FOR</label>
              <select
                value={printSelection}
                onChange={(e) => setPrintSelection(e.target.value)}
                disabled={reports.length === 0}
                className="bg-navy-deep/60 border border-white/15 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:border-white/40 cursor-pointer appearance-none disabled:opacity-50"
                style={{
                  backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 20 20\' fill=\'%23ffffff80\'><path d=\'M5.25 7.5L10 12.25L14.75 7.5H5.25Z\'/></svg>")',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.6rem center',
                  backgroundSize: '0.9rem',
                  paddingRight: '2rem',
                }}
              >
                <option value={ALL}>All players ({reports.length})</option>
                {reports.map((r) => (
                  <option key={r.name} value={r.name}>{r.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => handlePrint()}
              disabled={printReports.length === 0}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              PRINT / SAVE PDF
            </button>
            <button
              onClick={() => downloadMarkdown(printReports)}
              className="btn-secondary disabled:opacity-50"
              disabled={printReports.length === 0}
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
      </div>

      {/* Clean print-only version — light paper, Wenger accents */}
      <div className="coaching-report-print">
        <header className="cr-print-header">
          <img src="/images/logos/logo-lt.png" alt="Wenger Corporation" className="cr-print-logo" />
          <div>
            <h1 className="cr-print-title">Wenger Role Play — Coaching Report</h1>
            <div className="cr-print-meta">
              {new Date().toLocaleString()} ·{' '}
              {printSelection === ALL
                ? `All players (${printReports.length} rep${printReports.length === 1 ? '' : 's'})`
                : printSelection}
            </div>
          </div>
        </header>

        {printReports.length === 0 ? (
          <p>No saved rounds yet for this selection.</p>
        ) : (
          printReports.map((r) => <PrintRep key={r.name} rep={r} />)
        )}

        <footer className="cr-print-footer">
          Wenger Role Play · Coaching Report · {new Date().toLocaleDateString()}
        </footer>
      </div>

      <style>{`
        /* On-screen — show rich version, hide print version */
        .coaching-report-print { display: none; }

        @media print {
          /* Generous margins so nothing prints to the edge of the paper */
          @page { margin: 0.85in 0.75in; size: letter; }
          @page :first { margin-top: 0.85in; }

          /* Hide everything except the print version */
          #root { display: none !important; }
          .coaching-report-screen { display: none !important; }
          .coaching-report-print { display: block !important; }
          .print\\:hidden { display: none !important; }

          /* Reset overlay positioning */
          .coaching-report-root {
            position: static !important;
            inset: auto !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            background: white !important;
            backdrop-filter: none !important;
            opacity: 1 !important;
            transform: none !important;
          }

          /* Cancel framer-motion residue */
          .coaching-report-root [style*="opacity"],
          .coaching-report-root [style*="transform"] {
            opacity: 1 !important;
            transform: none !important;
          }

          html, body {
            background: white !important;
            color: #1e1e1e !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Print stylesheet — clean, paper-friendly Wenger branded layout */
          .coaching-report-print {
            font-family: 'Inter', system-ui, sans-serif;
            color: #1e1e1e;
            background: white;
            font-size: 10.5pt;
            line-height: 1.45;
            /* Belt-and-suspenders padding in case @page margins are ignored */
            padding: 4pt 6pt;
            box-sizing: border-box;
          }

          .cr-print-header {
            display: flex;
            align-items: center;
            gap: 16pt;
            border-bottom: 2pt solid #003658;
            padding-bottom: 10pt;
            margin-bottom: 14pt;
          }
          .cr-print-logo {
            height: 40pt;
            width: auto;
          }
          .cr-print-title {
            font-family: 'Bebas Neue', 'Anton', sans-serif;
            font-size: 22pt;
            font-weight: 400;
            letter-spacing: 0.05em;
            color: #003658;
            margin: 0;
            line-height: 1.05;
          }
          .cr-print-meta {
            font-size: 9pt;
            color: #626366;
            margin-top: 2pt;
          }

          .cr-print-rep {
            page-break-inside: auto;
            break-inside: auto;
            margin-bottom: 18pt;
          }
          .cr-print-rep + .cr-print-rep {
            page-break-before: always;
            break-before: page;
            padding-top: 0;
          }

          .cr-rep-header {
            border-left: 4pt solid #87c440;
            padding-left: 10pt;
            margin-bottom: 10pt;
            page-break-after: avoid;
            break-after: avoid;
          }
          .cr-rep-name {
            font-family: 'Bebas Neue', 'Anton', sans-serif;
            font-size: 20pt;
            color: #003658;
            margin: 0;
            letter-spacing: 0.04em;
            line-height: 1.05;
          }
          .cr-rep-summary {
            font-size: 10pt;
            color: #626366;
            margin-top: 2pt;
          }
          .cr-rep-summary strong { color: #006254; font-weight: 700; }

          .cr-section {
            margin-top: 12pt;
            page-break-inside: auto;
            break-inside: auto;
          }
          .cr-section-title {
            font-family: 'Bebas Neue', 'Anton', sans-serif;
            font-size: 12pt;
            color: #003658;
            margin: 0 0 5pt 0;
            letter-spacing: 0.06em;
            border-bottom: 1pt solid #bbbdc0;
            padding-bottom: 2pt;
            page-break-after: avoid;
            break-after: avoid;
          }

          .cr-action-list, .cr-list {
            list-style: none;
            padding: 0;
            margin: 0;
          }
          .cr-action-list li {
            padding: 4pt 0 4pt 70pt;
            position: relative;
            page-break-inside: avoid;
            break-inside: avoid;
            margin-bottom: 2pt;
          }
          .cr-priority {
            position: absolute;
            left: 0;
            top: 4pt;
            font-family: 'Bebas Neue', sans-serif;
            font-size: 9pt;
            letter-spacing: 0.1em;
            font-weight: 700;
            padding: 1pt 6pt;
            border-radius: 2pt;
            min-width: 50pt;
            text-align: center;
          }
          .cr-priority-HIGH   { background: #cb6918; color: white; }
          .cr-priority-MEDIUM { background: #69aebd; color: white; }
          .cr-priority-NOTE   { background: #003658; color: white; }

          .cr-cat-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10pt;
          }
          .cr-cat-table tr { page-break-inside: avoid; break-inside: avoid; }
          .cr-cat-table td { padding: 3pt 4pt; vertical-align: middle; border-bottom: 0.5pt solid #e5e7eb; }
          .cr-cat-name { font-weight: 600; color: #003658; }
          .cr-cat-flag {
            display: inline-block;
            font-size: 7.5pt;
            font-weight: 700;
            letter-spacing: 0.08em;
            margin-left: 4pt;
            padding: 0.5pt 4pt;
            border-radius: 2pt;
            vertical-align: 1pt;
          }
          .cr-flag-bonus { background: #cb6918; color: white; }
          .cr-flag-perfect { background: #87c440; color: white; }
          .cr-cat-bar-cell { width: 35%; }
          .cr-cat-bar {
            height: 6pt;
            background: #e5e7eb;
            border-radius: 2pt;
            overflow: hidden;
          }
          .cr-cat-bar-fill { height: 100%; }
          .cr-cat-bar-fill.high { background: #006254; }
          .cr-cat-bar-fill.mid  { background: #69aebd; }
          .cr-cat-bar-fill.low  { background: #cb6918; }
          .cr-cat-pct { text-align: right; font-weight: 600; color: #003658; width: 18%; white-space: nowrap; }

          .cr-list li {
            padding: 2pt 0 2pt 18pt;
            position: relative;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .cr-list li::before {
            content: "";
            position: absolute;
            left: 4pt;
            top: 7pt;
            width: 4pt;
            height: 4pt;
            background: #87c440;
            border-radius: 50%;
          }
          .cr-list .cr-count {
            display: inline-block;
            background: #003658;
            color: white;
            font-weight: 700;
            font-size: 8pt;
            padding: 0.5pt 4pt;
            border-radius: 2pt;
            margin-right: 4pt;
          }
          .cr-list .cr-area {
            color: #626366;
            font-size: 9pt;
          }
          .cr-list .cr-area-bonus {
            color: #cb6918;
            font-weight: 600;
          }

          .cr-strengths {
            display: block;
          }
          .cr-strengths li {
            display: inline-block;
            background: #e8f5d9;
            color: #006254;
            border: 0.5pt solid #87c440;
            padding: 2pt 7pt;
            margin: 0 4pt 4pt 0;
            border-radius: 10pt;
            font-size: 9pt;
            font-weight: 600;
          }
          .cr-strengths li::before { display: none; }

          .cr-note {
            background: #f4f6f8;
            border-left: 3pt solid #69aebd;
            padding: 6pt 9pt;
            margin-bottom: 5pt;
            font-size: 10pt;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .cr-note-meta {
            font-size: 8.5pt;
            color: #626366;
            margin-bottom: 2pt;
          }
          .cr-note-meta strong { color: #003658; }

          .cr-trend {
            display: inline-block;
            margin-left: 12pt;
            font-size: 9.5pt;
            font-weight: 600;
            padding: 1pt 6pt;
            border-radius: 2pt;
          }
          .cr-trend-up   { background: #e8f5d9; color: #006254; }
          .cr-trend-down { background: #fbe7d8; color: #cb6918; }
          .cr-trend-flat { background: #eef0f2; color: #626366; }

          .cr-scenarios {
            font-size: 9pt;
            color: #626366;
            margin-top: 8pt;
            font-style: italic;
          }

          .cr-print-footer {
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

function PrintRep({ rep }) {
  const trendArrow = rep.trend ? (rep.trend.delta > 0 ? '▲' : rep.trend.delta < 0 ? '▼' : '–') : '';
  const trendCls = rep.trend ? (rep.trend.delta > 0 ? 'cr-trend-up' : rep.trend.delta < 0 ? 'cr-trend-down' : 'cr-trend-flat') : '';
  return (
    <article className="cr-print-rep">
      <header className="cr-rep-header">
        <h2 className="cr-rep-name">{rep.name}</h2>
        <div className="cr-rep-summary">
          {rep.rounds} round{rep.rounds === 1 ? '' : 's'} · avg <strong>{rep.avgScore}</strong> · best <strong>{rep.bestScore}</strong>
          {rep.bestRound ? ` (${rep.bestRound})` : ''}
          {rep.trend && (
            <span className={`cr-trend ${trendCls}`}>
              Trend {rep.trend.first} → {rep.trend.second} {trendArrow} {rep.trend.delta >= 0 ? '+' : ''}{rep.trend.delta}
            </span>
          )}
        </div>
      </header>

      {rep.actionItems.length > 0 && (
        <section className="cr-section">
          <h3 className="cr-section-title">What to Work On</h3>
          <ul className="cr-action-list">
            {rep.actionItems.map((a, i) => (
              <li key={i}>
                <span className={`cr-priority cr-priority-${a.priority}`}>{a.priority}</span>
                {a.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      {rep.categoryRanked.length > 0 && (
        <section className="cr-section">
          <h3 className="cr-section-title">Category Hit Rates</h3>
          <table className="cr-cat-table">
            <tbody>
              {rep.categoryRanked.map((c) => {
                const barCls = c.rate >= 0.8 ? 'high' : c.rate >= 0.5 ? 'mid' : 'low';
                return (
                  <tr key={c.area}>
                    <td>
                      <span className="cr-cat-name">{c.area}</span>
                      {c.isBonus && <span className="cr-cat-flag cr-flag-bonus">BONUS</span>}
                      {c.perfectCount > 0 && <span className="cr-cat-flag cr-flag-perfect">PERFECT ×{c.perfectCount}</span>}
                    </td>
                    <td className="cr-cat-bar-cell">
                      <div className="cr-cat-bar"><div className={`cr-cat-bar-fill ${barCls}`} style={{ width: `${c.rate * 100}%` }} /></div>
                    </td>
                    <td className="cr-cat-pct">{c.hits}/{c.total} · {Math.round(c.rate * 100)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {rep.topMissed.length > 0 && (
        <section className="cr-section">
          <h3 className="cr-section-title">Most-Frequently-Missed Behaviors</h3>
          <ul className="cr-list">
            {rep.topMissed.map((m, i) => (
              <li key={i}>
                <span className="cr-count">×{m.count}</span>
                {m.behavior}
                <span className={`cr-area ${m.bonus ? 'cr-area-bonus' : ''}`}> · {m.area}{m.bonus ? ' (bonus)' : ''}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {rep.strengths.length > 0 && (
        <section className="cr-section">
          <h3 className="cr-section-title">Strengths</h3>
          <ul className="cr-list cr-strengths">
            {rep.strengths.map((c) => (
              <li key={c.area}>
                {c.area} · {Math.round(c.rate * 100)}%{c.isBonus ? ' (bonus)' : ''}
              </li>
            ))}
          </ul>
        </section>
      )}

      {rep.notes.length > 0 && (
        <section className="cr-section">
          <h3 className="cr-section-title">Manager Notes</h3>
          {rep.notes.map((n, i) => (
            <div key={i} className="cr-note">
              <div className="cr-note-meta">
                <strong>{n.scenario || ''}</strong> · {n.date || ''} · score {n.score ?? ''}
              </div>
              <div>{n.note}</div>
            </div>
          ))}
        </section>
      )}

      {rep.scenariosPlayed.length > 0 && (
        <div className="cr-scenarios">
          Scenarios played: {rep.scenariosPlayed.join(' · ')}
        </div>
      )}
    </article>
  );
}

function RepCard({ rep }) {
  return (
    <article className="card p-6 space-y-5">
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
