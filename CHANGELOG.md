# Changelog

All notable changes to **Wenger Role Play** are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.1] - 2026-04-29

### Fixed
- **Mute toggle no longer overlaps the game-screen control cluster.** Moved the SOUND ON / SOUND OFF button from `top-4 right-4` to `bottom-4 right-4` so it stays out of the way of the Pause / Reset / End Round buttons during a live round. Still pinned and reachable on every screen.
- **Gradient titles render reliably across the app.** Replaced Tailwind utility-class gradients (`bg-gradient-to-r from-leaf via-bou to-cyan ...`) with inline `background-image` + `background-clip: text` styles using literal hex stops. The Tailwind gradient utilities were not always emitting their CSS for the custom palette tokens, which made the **WENGER ROLE PLAY** lobby title, the **TIME!** results banner, and the **COACHING REPORT** header invisible. Each title also has a fallback solid `text-leaf` color so it remains visible on browsers that don't support `-webkit-background-clip: text`.

## [1.2.0] - 2026-04-29

### Changed
- **Adopted the official Wenger Corporation color palette** in `tailwind.config.js`. New named tokens: `navy` (`#003658`), `navy-deep`, `bou` (`#69aebd`), `leaf` (`#87c440`), `cadet`, `pool`, `wenger-gray`, `burnt-orange`, `cyan` (Wenger Cyan `#5fb1e2`), `green`, `gray-75`, `black`. Semantic aliases (`magenta` → Burnt Orange, `gold` → Leaf, `success` → Leaf, `warning` → Burnt Orange) keep existing class names brand-correct.
- Lobby title gradient now uses Leaf → Bou → Wenger Cyan instead of placeholder colors.
- Background radial gradients, scrollbar, and `theme-color` meta-tag updated to Navy / Bou / Cyan.
- **Lobby header redesigned as a horizontal lockup**: large logo on the left, divider, then the `WENGER ROLE PLAY` title and tagline on the right.

### Removed
- **All emoji glyphs** from the user interface. Replaced with letter glyphs (e.g. category badges `A`, `G`, `T`, `D`, `F`), tracked-out labels (`BONUS`, `PERFECT`, `PERFECT BUCKET +10`), and `+` / `−` markers for hits and misses. Affects the Lobby, Customer pane, Scorecard, Results screen, Leaderboard rows, Coaching Report, mute toggle, CSV summary column, and the Markdown report.
- Stripped now-unused `icon` fields from every scenario JSON file.

### Added
- New `glow-bou` shadow utility for primary-accent buttons.

## [1.1.0] - 2026-04-29

### Changed
- **Renamed and rebranded** from *Wenger Sales Showdown* to **Wenger Role Play**.
- Updated package name (`wenger-role-play`), browser tab title, favicon, footer label, CSV / Markdown export filenames, and all in-app copy.

### Added
- Wenger Corporation logos (`logo-dk.png` for the dark app theme, `logo-lt.png` for the printed coaching report) shipped from `public/images/logos/`.
- New shared `Logo` component (`src/components/Logo.jsx`) with `dk`/`lt` variants and `xs`/`sm`/`md`/`lg`/`xl` sizes.
- Logo placements (prominent but understated):
  - Lobby header — large dimmed dark-theme lockup above the title.
  - Game screen — extra-small mark in the customer-pane header.
  - Results screen — small mark above the *TIME!* banner.
  - Coaching report — medium mark in the on-screen toolbar; light-theme variant in the print-only header for clean output on white paper.

## [1.0.0] - 2026-04-29

Initial release. Two-player sales training game built for in-person sales meetings.

### Added

#### Game flow
- **Lobby screen** with bold scoreboard styling: dual player-name inputs, multi-select scenario category filters, 3 / 5 / 7 / 10 minute round-length picker, and a slot-machine "Draw Scenario" animation that locks in a random scenario from the filtered pool.
- **Live game screen** in a 40 / 60 split: customer pane on the left (persona, opening line, what-you-know, hidden-info reveal cards), manager scorecard on the right (timer, running score, fat tappable behavior rows grouped by skill area).
- **Results screen** with a "TIME!" banner, count-up final score, per-skill-area breakdown bar chart, hits-vs-misses lists, and a bonus-category coaching summary highlighting where the rep is leaving points on the table.
- **Pause / Reset / End Round** controls. Pause overlay is click-anywhere-to-resume.
- Five sample scenarios across **Architect, GC/CM, TSM (Greg Hanbaum's music casework donation), Tech Director, and Facilities** categories — each with realistic hidden-info gating.

#### Scoring
- Base points per checked behavior, configurable per scenario.
- **Bonus-category multiplier** (1.5×) for skill areas listed in the scenario's `bonusCategories` (BANT, Timeline, Opportunity Expansion, Closing & Next Steps by default).
- **Perfect Bucket bonus** (+10) for hitting every behavior in a skill area.
- **Speed bonus** (+15) for ending early with at least 70 % of behaviors checked.

#### Persistence and reporting
- **Per-day localStorage leaderboard** keyed by date, top-5 displayed on the lobby with expandable per-category drilldown showing hits, misses, and notes for each round.
- **Manager notes field** on the results screen, saved with each round.
- **Per-round breakdown** persisted with each entry: hit behaviors, missed behaviors, and per-skill-area hit / total counts (with bonus and perfect-bucket flags).
- **CSV export** — two buttons on the leaderboard:
  - *Export today* — current session only.
  - *Export all* — every saved entry across every date.
  - Columns include date, time, players, scenario, score, per-category hit/total, full hit and missed behavior lists, and manager notes.
- **Coaching report generator** — aggregates every saved round per rep across all dates and produces a per-person report with:
  - Round count, average score, best score and which scenario.
  - First-half vs. second-half score trend.
  - Prioritized "what to work on" action items (HIGH / MEDIUM / NOTE).
  - Category hit-rate bars (highlighting bonus and perfect-bucket counts).
  - Top 7 most-frequently-missed behaviors.
  - Strengths chips for any category at 70 %+ hit rate.
  - All saved manager notes with date / scenario / score context.
  - List of unique scenarios played.
- Coaching report has **🖨 Print / Save PDF** (with print-only CSS converting the dark theme to clean black-on-white) and **⬇ Markdown export**.

#### Data model
- **File-based scenario system** — every JSON file in `src/data/scenarios/` is auto-loaded at build time via `import.meta.glob`. Drop in a new file and it appears in the lobby with no code changes.
- Scenario schema documented in `README.md`.

#### Audio
- **Web Audio API synth** that generates all sound effects on the fly:
  - All voices are **sine waves through a master 4.2 kHz lowpass filter** for a soft, chime-like character.
  - Notes are locked to a **C major pentatonic scale** so every interval is consonant.
  - `check`, `bonus`, `tick`, `buzzer`, `draw`, `applause`, `whoosh` events.
  - Soft envelopes — gentle attack, long exponential decay tails. Designed to be easy on the ears for a meeting room context.
- **Real MP3 override** — drop matching files into `public/sounds/` and they take precedence over the synth.
- **Mute toggle** in the top-right corner.

#### Visual / UX
- Custom Tailwind palette: deep navy background, magenta / cyan / gold accents, success green / warning amber for state.
- Bebas Neue / Anton display font for scoreboard headers, Inter for body, JetBrains Mono for numerics.
- Framer Motion animations: scenario-draw spin, score count-up, perfect-bucket gold-glow border, paused overlay fade, screen transitions.
- `canvas-confetti` celebrations: short bursts when a bonus behavior is checked, full-screen burst on round end.
- Timer turns amber under 60 seconds and red-pulsing under 30 seconds with a soft tick on each of the final 10 seconds.
- Randomized footer tagline ("Hit the buckets. Win the room." / "BANT or bust." / etc.) and version number.

#### Tooling
- React 18 + Vite 5 + Tailwind 3 + Framer Motion 11 + canvas-confetti 1.
- No backend; all state lives in the browser.
- Production build: ~334 KB JS / ~108 KB gzipped.
- `README.md` with setup, deploy-to-Vercel steps, scenario authoring guide, and audio override instructions.

[Unreleased]: https://github.com/valkolimark/wengerSRP/compare/v1.2.1...HEAD
[1.2.1]: https://github.com/valkolimark/wengerSRP/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/valkolimark/wengerSRP/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/valkolimark/wengerSRP/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/valkolimark/wengerSRP/releases/tag/v1.0.0
