// Auto-loads every JSON file in /src/data/scenarios at build time.
// To add a new scenario: drop a properly-shaped .json file into that folder.

const modules = import.meta.glob('../data/scenarios/*.json', { eager: true });

export const SCENARIOS = Object.values(modules)
  .map((m) => m.default ?? m)
  .sort((a, b) => a.id.localeCompare(b.id));

export const CATEGORIES = Array.from(
  new Set(SCENARIOS.map((s) => s.category))
).sort();

export function pickRandom(scenarios) {
  if (!scenarios.length) return null;
  return scenarios[Math.floor(Math.random() * scenarios.length)];
}
