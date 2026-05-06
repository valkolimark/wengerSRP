import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { parseImportFile, makeImportId, expandWithScenario } from '../lib/importers.js';
import { createEntry } from '../lib/cloudLeaderboard.js';

const STAGE = {
  PICK: 'pick',
  PARSING: 'parsing',
  PREVIEW: 'preview',
  IMPORTING: 'importing',
  DONE: 'done',
};

export default function AdminBulkImport({ onClose, onImported }) {
  const [stage, setStage] = useState(STAGE.PICK);
  const [filename, setFilename] = useState('');
  const [rows, setRows] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [skip, setSkip] = useState(() => new Set());
  const [progress, setProgress] = useState({ done: 0, total: 0, errors: [] });
  const [parseError, setParseError] = useState('');
  const fileInputRef = useRef();

  async function handleFile(file) {
    if (!file) return;
    setFilename(file.name);
    setStage(STAGE.PARSING);
    setParseError('');
    try {
      const { rows: parsed, warnings: w } = await parseImportFile(file);
      setRows(parsed);
      setWarnings(w || []);
      setSkip(new Set());
      setStage(STAGE.PREVIEW);
    } catch (err) {
      console.error('parse failed', err);
      setParseError(err.message || 'Could not parse this file.');
      setStage(STAGE.PICK);
    }
  }

  function updateRow(idx, field, value) {
    setRows((prev) => {
      const next = [...prev];
      const updated = { ...next[idx], [field]: value };
      // Re-evaluate the scorecard structure when the SCENARIO cell changes so
      // a typo fix instantly flips the ⚠ to ✓ and refills hit/miss arrays.
      next[idx] = field === 'scenarioTitle' ? expandWithScenario(updated) : updated;
      return next;
    });
  }

  function toggleSkip(idx) {
    setSkip((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }

  async function runImport() {
    const queued = rows
      .map((r, idx) => ({ r, idx }))
      .filter(({ idx }) => !skip.has(idx));

    if (!queued.length) return;
    setStage(STAGE.IMPORTING);
    setProgress({ done: 0, total: queued.length, errors: [] });

    let done = 0;
    const errors = [];
    for (const { r, idx } of queued) {
      try {
        await createEntry({
          ...r,
          id: makeImportId(filename, idx),
          score: Number(r.score) || 0,
          behaviorsHit: Number(r.behaviorsHit) || 0,
          behaviorsTotal: Number(r.behaviorsTotal) || 0,
          breakdown: r.breakdown || [],
          hitBehaviors: r.hitBehaviors || [],
          missedBehaviors: r.missedBehaviors || [],
        });
      } catch (err) {
        errors.push(`Row ${idx + 1} (${r.repName || '?'}): ${err.message}`);
      }
      done += 1;
      setProgress({ done, total: queued.length, errors });
    }

    setStage(STAGE.DONE);
    onImported?.();
  }

  function reset() {
    setStage(STAGE.PICK);
    setRows([]);
    setWarnings([]);
    setSkip(new Set());
    setFilename('');
    setProgress({ done: 0, total: 0, errors: [] });
    setParseError('');
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-navy-deep/85 backdrop-blur-sm overflow-y-auto"
    >
      <div className="max-w-5xl mx-auto p-6 my-10 card relative">
        <header className="flex items-center justify-between mb-4">
          <div>
            <div className="font-display text-3xl tracking-wider">BULK IMPORT</div>
            <div className="text-xs text-white/50 mt-1">
              CSV, Excel (.xlsx/.xls), or PDF · rows are previewed before they're saved
            </div>
          </div>
          <button onClick={onClose} className="btn-secondary">CLOSE</button>
        </header>

        {stage === STAGE.PICK && (
          <PickStage
            onPick={handleFile}
            error={parseError}
            inputRef={fileInputRef}
          />
        )}

        {stage === STAGE.PARSING && (
          <div className="card p-10 text-center text-white/70">
            Parsing {filename}…
          </div>
        )}

        {stage === STAGE.PREVIEW && (
          <PreviewStage
            rows={rows}
            warnings={warnings}
            skip={skip}
            filename={filename}
            onUpdate={updateRow}
            onToggleSkip={toggleSkip}
            onCancel={reset}
            onConfirm={runImport}
          />
        )}

        {stage === STAGE.IMPORTING && (
          <ImportingStage progress={progress} />
        )}

        {stage === STAGE.DONE && (
          <DoneStage progress={progress} onAnother={reset} onClose={onClose} />
        )}
      </div>
    </motion.div>
  );
}

function PickStage({ onPick, error, inputRef }) {
  function onChange(e) {
    const file = e.target.files?.[0];
    if (file) onPick(file);
  }
  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl border-2 border-dashed border-white/15 bg-white/5 p-12 text-center cursor-pointer hover:border-white/30"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file) onPick(file);
        }}
      >
        <div className="font-display text-2xl tracking-wider">DROP A FILE HERE</div>
        <div className="text-white/60 text-sm mt-2">or click to choose · CSV, XLSX, XLS, or PDF</div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.pdf"
          className="hidden"
          onChange={onChange}
        />
      </div>

      {error && (
        <div className="text-warning text-sm">{error}</div>
      )}

      <div className="text-xs text-white/50 leading-relaxed space-y-1">
        <div className="text-white/70 font-semibold tracking-wide">Accepted columns (any order, case-insensitive):</div>
        <div><span className="text-cyan font-mono">date</span>, <span className="text-cyan font-mono">rep</span> (or <span className="font-mono">sales rep</span>, <span className="font-mono">name</span>), <span className="text-cyan font-mono">customer</span>, <span className="text-cyan font-mono">scenario</span>, <span className="text-cyan font-mono">category</span>, <span className="text-cyan font-mono">score</span>, <span className="text-cyan font-mono">hits</span> (or <span className="font-mono">behaviors hit</span>), <span className="text-cyan font-mono">total</span>, <span className="text-cyan font-mono">notes</span></div>
        <div className="text-white/40">Missing columns are filled with sensible defaults. PDFs work best when they were exported (not scanned/photographed) — typed-text PDFs parse cleanly, scans don't.</div>
      </div>
    </div>
  );
}

function PreviewStage({ rows, warnings, skip, filename, onUpdate, onToggleSkip, onCancel, onConfirm }) {
  const importing = rows.length - skip.size;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-sm">
          <span className="font-semibold">{filename}</span>
          <span className="text-white/50"> · {rows.length} row{rows.length === 1 ? '' : 's'} parsed</span>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-secondary">CHOOSE ANOTHER FILE</button>
          <button
            onClick={onConfirm}
            disabled={importing === 0}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            IMPORT {importing} ROW{importing === 1 ? '' : 'S'}
          </button>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="rounded-xl border border-warning/40 bg-warning/5 p-4 space-y-1">
          <div className="text-xs tracking-[0.25em] font-semibold text-warning">PARSER WARNINGS</div>
          <ul className="text-xs text-white/80 list-disc list-inside space-y-0.5">
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-xs">
            <thead className="bg-white/5">
              <tr>
                <th className="text-left p-2 w-10"></th>
                <th className="text-left p-2 w-8" title="Scenario matched in catalog → full hit/miss list pre-populated for editing">✓</th>
                <th className="text-left p-2">DATE</th>
                <th className="text-left p-2">REP</th>
                <th className="text-left p-2">CUSTOMER</th>
                <th className="text-left p-2">SCENARIO</th>
                <th className="text-left p-2">CATEGORY</th>
                <th className="text-right p-2">SCORE</th>
                <th className="text-right p-2">HITS</th>
                <th className="text-right p-2">TOTAL</th>
                <th className="text-left p-2">NOTES</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const skipped = skip.has(idx);
                return (
                  <tr key={idx} className={`border-t border-white/5 ${skipped ? 'opacity-40' : ''}`}>
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={!skipped}
                        onChange={() => onToggleSkip(idx)}
                        title={skipped ? 'Include this row' : 'Skip this row'}
                      />
                    </td>
                    <td
                      className={`p-2 text-center font-bold ${r.scenarioMatched ? 'text-success' : 'text-warning'}`}
                      title={r.scenarioMatched
                        ? 'Scenario matched — hit/miss list pre-populated, fully editable'
                        : 'Scenario not in current catalog — per-behavior editing won\'t be available'}
                    >
                      {r.scenarioMatched ? '✓' : '⚠'}
                    </td>
                    <Cell value={r.date} onChange={(v) => onUpdate(idx, 'date', v)} />
                    <Cell value={r.repName} onChange={(v) => onUpdate(idx, 'repName', v)} />
                    <Cell value={r.customerName} onChange={(v) => onUpdate(idx, 'customerName', v)} />
                    <Cell value={r.scenarioTitle} onChange={(v) => onUpdate(idx, 'scenarioTitle', v)} />
                    <Cell value={r.scenarioCategory} onChange={(v) => onUpdate(idx, 'scenarioCategory', v)} />
                    <NumCell value={r.score} onChange={(v) => onUpdate(idx, 'score', v)} />
                    <NumCell value={r.behaviorsHit} onChange={(v) => onUpdate(idx, 'behaviorsHit', v)} />
                    <NumCell value={r.behaviorsTotal} onChange={(v) => onUpdate(idx, 'behaviorsTotal', v)} />
                    <Cell value={r.notes} onChange={(v) => onUpdate(idx, 'notes', v)} wide />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Cell({ value, onChange, wide }) {
  return (
    <td className="p-1">
      <input
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={`bg-navy-deep/40 border border-white/10 rounded px-2 py-1 ${wide ? 'w-64' : 'w-32'} focus:outline-none focus:border-white/30`}
      />
    </td>
  );
}

function NumCell({ value, onChange }) {
  return (
    <td className="p-1">
      <input
        type="number"
        value={value ?? 0}
        onChange={(e) => onChange(e.target.value)}
        className="bg-navy-deep/40 border border-white/10 rounded px-2 py-1 w-20 text-right font-mono focus:outline-none focus:border-white/30"
      />
    </td>
  );
}

function ImportingStage({ progress }) {
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <div className="space-y-4">
      <div className="text-sm text-white/70">
        Importing {progress.done} of {progress.total}…
      </div>
      <div className="h-3 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full bg-cyan transition-all" style={{ width: `${pct}%` }} />
      </div>
      {progress.errors.length > 0 && (
        <div className="text-xs text-warning space-y-1">
          {progress.errors.map((e, i) => <div key={i}>{e}</div>)}
        </div>
      )}
    </div>
  );
}

function DoneStage({ progress, onAnother, onClose }) {
  const succeeded = progress.done - progress.errors.length;
  return (
    <div className="space-y-4">
      <div className="card p-6">
        <div className="font-display text-2xl tracking-wider mb-1 text-success">IMPORT COMPLETE</div>
        <div className="text-sm text-white/70">
          {succeeded} of {progress.total} row{progress.total === 1 ? '' : 's'} saved to the leaderboard.
        </div>
        {progress.errors.length > 0 && (
          <div className="mt-4 rounded-lg border border-warning/40 bg-warning/5 p-3 text-xs text-white/80 space-y-1">
            <div className="text-warning font-semibold tracking-wide">ERRORS</div>
            {progress.errors.map((e, i) => <div key={i}>{e}</div>)}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={onAnother} className="btn-secondary">IMPORT ANOTHER FILE</button>
        <button onClick={onClose} className="btn-primary">DONE</button>
      </div>
    </div>
  );
}
