// Aggregates leaderboard entries into a per-rep coaching report.
// Identifies weak categories, most-frequently-missed behaviors, and surfaces manager notes.

import { getAllEntries } from './leaderboard.js';

const MIN_ROUNDS_FOR_TREND = 2;

function emptyRep(name) {
  return {
    name,
    rounds: 0,
    totalScore: 0,
    avgScore: 0,
    bestScore: 0,
    bestRound: null,
    scenariosPlayed: new Set(),
    categoryStats: {},          // area -> { hits, total, isBonus, perfectCount, roundsWithArea }
    missedBehaviorCounts: {},   // "behavior [area]" -> { count, area, behavior, bonus }
    hitBehaviorCounts: {},      // same shape
    notes: [],                  // [{ date, scenario, note, score }]
    history: [],                // raw entries for trend math
  };
}

export function buildCoachingReports({ entries } = {}) {
  const all = entries || getAllEntries();
  const byRep = new Map();

  all.forEach((entry) => {
    const name = (entry.repName || 'Unknown').trim() || 'Unknown';
    if (!byRep.has(name)) byRep.set(name, emptyRep(name));
    const rep = byRep.get(name);

    rep.rounds += 1;
    rep.totalScore += Number(entry.score || 0);
    if ((entry.score || 0) > rep.bestScore) {
      rep.bestScore = entry.score || 0;
      rep.bestRound = entry.scenarioTitle || '';
    }
    if (entry.scenarioTitle) rep.scenariosPlayed.add(entry.scenarioTitle);

    (entry.breakdown || []).forEach((b) => {
      if (!rep.categoryStats[b.area]) {
        rep.categoryStats[b.area] = { hits: 0, total: 0, isBonus: !!b.isBonus, perfectCount: 0, roundsWithArea: 0 };
      }
      const c = rep.categoryStats[b.area];
      c.hits += b.hits || 0;
      c.total += b.total || 0;
      c.roundsWithArea += 1;
      if (b.perfect) c.perfectCount += 1;
      if (b.isBonus) c.isBonus = true;
    });

    (entry.missedBehaviors || []).forEach((m) => {
      const key = `${m.behavior} [${m.area}]`;
      if (!rep.missedBehaviorCounts[key]) {
        rep.missedBehaviorCounts[key] = { count: 0, area: m.area, behavior: m.behavior, bonus: !!m.bonus };
      }
      rep.missedBehaviorCounts[key].count += 1;
    });

    (entry.hitBehaviors || []).forEach((h) => {
      const key = `${h.behavior} [${h.area}]`;
      if (!rep.hitBehaviorCounts[key]) {
        rep.hitBehaviorCounts[key] = { count: 0, area: h.area, behavior: h.behavior };
      }
      rep.hitBehaviorCounts[key].count += 1;
    });

    if (entry.notes) {
      rep.notes.push({
        date: entry.date,
        scenario: entry.scenarioTitle,
        score: entry.score,
        note: entry.notes,
      });
    }

    rep.history.push(entry);
  });

  const reports = [];
  byRep.forEach((rep) => {
    rep.avgScore = rep.rounds ? Math.round(rep.totalScore / rep.rounds) : 0;

    // Hit rate per category, ranked
    const categoryRanked = Object.entries(rep.categoryStats)
      .map(([area, c]) => ({
        area,
        hits: c.hits,
        total: c.total,
        rate: c.total ? c.hits / c.total : 0,
        isBonus: c.isBonus,
        perfectCount: c.perfectCount,
        roundsWithArea: c.roundsWithArea,
      }))
      .sort((a, b) => a.rate - b.rate);

    const weakCategories = categoryRanked.filter((c) => c.rate < 0.6).slice(0, 5);
    const weakBonus = categoryRanked.filter((c) => c.isBonus && c.rate < 0.7);
    const strengths = [...categoryRanked].reverse().filter((c) => c.rate >= 0.7).slice(0, 4);

    const topMissed = Object.values(rep.missedBehaviorCounts)
      .sort((a, b) => b.count - a.count || (b.bonus - a.bonus))
      .slice(0, 7);

    // Trend: average score, first half of rounds vs second half
    let trend = null;
    if (rep.history.length >= MIN_ROUNDS_FOR_TREND) {
      const sorted = [...rep.history].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      const half = Math.floor(sorted.length / 2);
      const firstHalf = sorted.slice(0, half || 1);
      const secondHalf = sorted.slice(half);
      const avg = (xs) => xs.reduce((s, e) => s + (e.score || 0), 0) / xs.length;
      const a = avg(firstHalf);
      const b = avg(secondHalf);
      trend = {
        first: Math.round(a),
        second: Math.round(b),
        delta: Math.round(b - a),
      };
    }

    // Build action items text
    const actionItems = [];
    weakBonus.forEach((c) => {
      actionItems.push({
        priority: 'HIGH',
        text: `Drill ${c.area} — bonus category, only hit ${c.hits} of ${c.total} (${Math.round(c.rate * 100)}%) across rounds.`,
      });
    });
    topMissed.slice(0, 3).forEach((m) => {
      actionItems.push({
        priority: m.bonus ? 'HIGH' : 'MEDIUM',
        text: `Practice: "${m.behavior}" — missed in ${m.count} round${m.count === 1 ? '' : 's'}${m.bonus ? ' (bonus area)' : ''}.`,
      });
    });
    weakCategories.filter((c) => !c.isBonus).slice(0, 2).forEach((c) => {
      actionItems.push({
        priority: 'MEDIUM',
        text: `Improve ${c.area} fundamentals — hit rate ${Math.round(c.rate * 100)}%.`,
      });
    });
    if (rep.notes.length) {
      actionItems.push({
        priority: 'NOTE',
        text: `Review ${rep.notes.length} manager note${rep.notes.length === 1 ? '' : 's'} below.`,
      });
    }

    reports.push({
      ...rep,
      scenariosPlayed: Array.from(rep.scenariosPlayed),
      categoryRanked,
      weakCategories,
      weakBonus,
      strengths,
      topMissed,
      trend,
      actionItems,
    });
  });

  return reports.sort((a, b) => b.rounds - a.rounds || b.avgScore - a.avgScore);
}

export function reportToMarkdown(reports, { generatedAt = new Date() } = {}) {
  const lines = [];
  lines.push(`# Wenger Role Play — Coaching Report`);
  lines.push(`Generated ${generatedAt.toLocaleString()} · ${reports.length} rep${reports.length === 1 ? '' : 's'}`);
  lines.push('');

  reports.forEach((r) => {
    lines.push(`---`);
    lines.push(`## ${r.name}`);
    lines.push(`**${r.rounds} round${r.rounds === 1 ? '' : 's'}** · avg ${r.avgScore} · best ${r.bestScore}${r.bestRound ? ` (${r.bestRound})` : ''}`);
    if (r.trend) {
      const arrow = r.trend.delta > 0 ? '▲' : r.trend.delta < 0 ? '▼' : '–';
      lines.push(`Trend: ${r.trend.first} → ${r.trend.second} (${arrow} ${r.trend.delta >= 0 ? '+' : ''}${r.trend.delta})`);
    }
    lines.push('');

    lines.push(`### What to work on`);
    if (r.actionItems.length === 0) {
      lines.push('- No major gaps. Keep doing what you\'re doing.');
    } else {
      r.actionItems.forEach((a) => lines.push(`- **[${a.priority}]** ${a.text}`));
    }
    lines.push('');

    if (r.strengths.length) {
      lines.push(`### Strengths`);
      r.strengths.forEach((c) => {
        lines.push(`- ${c.area}: ${c.hits}/${c.total} (${Math.round(c.rate * 100)}%)${c.isBonus ? ' ⭐' : ''}`);
      });
      lines.push('');
    }

    if (r.weakCategories.length) {
      lines.push(`### Weak categories`);
      r.weakCategories.forEach((c) => {
        lines.push(`- ${c.area}: ${c.hits}/${c.total} (${Math.round(c.rate * 100)}%)${c.isBonus ? ' ⭐ BONUS' : ''}`);
      });
      lines.push('');
    }

    if (r.topMissed.length) {
      lines.push(`### Most-frequently-missed behaviors`);
      r.topMissed.forEach((m) => {
        lines.push(`- (×${m.count})${m.bonus ? ' ⭐' : ''} ${m.behavior} — *${m.area}*`);
      });
      lines.push('');
    }

    if (r.notes.length) {
      lines.push(`### Manager notes`);
      r.notes.forEach((n) => {
        lines.push(`- *${n.date || ''} · ${n.scenario || ''} · score ${n.score ?? ''}* — ${n.note}`);
      });
      lines.push('');
    }

    if (r.scenariosPlayed.length) {
      lines.push(`### Scenarios played`);
      lines.push(r.scenariosPlayed.map((s) => `- ${s}`).join('\n'));
      lines.push('');
    }
  });

  return lines.join('\n');
}

export function downloadMarkdown(reports) {
  const md = reportToMarkdown(reports);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wenger-role-play-coaching-report-${Date.now()}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
