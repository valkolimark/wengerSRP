# Wenger Role Play

A two-player sales training game for in-person sales meetings. One rep plays the customer, one plays the sales rep, the manager scores live behaviors against a checklist, and the room watches it on a projector.

Built for projection on a screen — laptop drives it, manager controls the scorecard.

---

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173.

To build for production:

```bash
npm run build
npm run preview
```

---

## Deploy to Vercel

This is a static Vite app. Two ways:

**Option 1 — Vercel CLI:**
```bash
npm i -g vercel
vercel
```
Accept the defaults. Vercel auto-detects Vite.

**Option 2 — GitHub:**
Push the repo to GitHub, then in Vercel's dashboard click "Import Project". Framework preset: **Vite**. Build command `npm run build`, output `dist`. Done.

Same flow works on Netlify (preset: Vite, build: `npm run build`, publish: `dist`).

---

## How the game works

1. **Lobby** — Enter both player names, pick scenario categories you want in the pool, choose a round length, hit `DRAW SCENARIO`.
2. **Game** — The left pane is for the customer player (their persona, their opening line, their hidden info that they only reveal when asked). The right pane is the manager's scorecard — fat checkboxes, running score, timer.
3. **Results** — Confetti, count-up score, breakdown chart, a hit/miss list, and a coaching summary highlighting what was missed in the bonus categories. Save to the session leaderboard.

Bonus categories (BANT, Timeline, Opportunity Expansion, Closing & Next Steps) score at 1.5×. Hitting every behavior in a skill area earns a +10 Perfect Bucket bonus. Ending early with at least 70% of behaviors checked earns a +15 Speed Bonus.

The leaderboard lives in `localStorage`, keyed by date. Each meeting starts a fresh board.

---

## Adding new scenarios

This is the whole point of the file-based scenario system: **drop a JSON file into `src/data/scenarios/` and it appears in the app on the next reload.** No code changes needed.

Schema:

```json
{
  "id": "tsm-02",
  "category": "TSM",
  "title": "Short title shown on cards and leaderboard",
  "persona": {
    "name": "Customer name",
    "role": "Job title",
    "organization": "Where they work"
  },
  "openingLine": "The literal first thing the customer says when the call starts.",
  "customerContext": "What the customer player has in their head — context they're playing with but don't blurt out.",
  "hiddenInfo": [
    { "trigger": "BUDGET", "icon": "💰", "reveal": "Only share this if the rep asks about money." },
    { "trigger": "TIMELINE", "icon": "⏱️", "reveal": "Only share this if the rep asks about dates." }
  ],
  "scorecard": {
    "Discovery & Qualification": [
      { "behavior": "Asked about X", "points": 5 }
    ],
    "BANT": [
      { "behavior": "Identified decision makers", "points": 5 }
    ]
  },
  "bonusCategories": ["BANT", "Timeline Awareness", "Opportunity Expansion", "Closing & Next Steps"]
}
```

**Fields:**
- `id` — unique short string, used internally.
- `category` — one of: `Architect`, `GC/CM`, `TSM`, `Tech Director`, `Facilities`, `Athletic Director`. New categories will appear in the lobby filter automatically once a scenario uses them, but the persona icon and color come from `src/lib/categoryStyles.js` (add an entry there if you want non-default styling).
- `openingLine` — what the customer literally says to start the role-play.
- `customerContext` — playable context for the customer rep.
- `hiddenInfo` — array of trigger/reveal pairs. The customer player should only reveal each item if the sales rep asks the matching kind of question. This is the discovery-skill-builder.
- `scorecard` — object mapping skill area → array of `{ behavior, points }`. Skill area names can be anything; the bonus multiplier applies to whatever names you list in `bonusCategories`.
- `bonusCategories` — skill areas that earn the 1.5× multiplier and a ⭐. Typically the manager's identified weak spots.

**Tips:**
- Keep behaviors *observable* ("asked about X", "discussed Y"), not internal.
- Aim for 12–18 total behaviors so a 5-minute round feels tight.
- Make bonus categories the things you actually want to drive change on.

---

## Swapping in real audio files

The game uses the Web Audio API to synthesize arcade sound effects out of the box, so it works with zero asset setup. To swap in real MP3s, drop them into `public/sounds/` with these exact names:

- `check.mp3` — fired when a behavior is checked
- `bonus.mp3` — when a bonus-category behavior is checked
- `tick.mp3` — final 10 seconds, once per second
- `buzzer.mp3` — round end
- `draw.mp3` — slot-machine draw
- `applause.mp3` — results screen
- `whoosh.mp3` — screen transitions

If a file is missing or fails to load, the synthesized fallback plays. There's a mute toggle in the top-right corner because not every meeting wants audio.

---

## Project structure

```
src/
  App.jsx                       — top-level state machine (lobby/game/results)
  main.jsx                      — entry
  index.css                     — Tailwind + a few custom classes
  components/
    Lobby.jsx                   — home screen, name inputs, draw button
    GameScreen.jsx              — split-screen container
    CustomerPane.jsx            — left pane: persona, opening line, hidden info
    ScorecardPane.jsx           — right pane: timer, score, scorecard
    Timer.jsx                   — count-down with warning + critical states
    ResultsScreen.jsx           — confetti, breakdown, coaching, save
    Leaderboard.jsx             — collapsible top-5 list
    MuteToggle.jsx              — top-right audio toggle
    Footer.jsx                  — version + randomized tagline
  lib/
    sound.js                    — sound engine (real MP3 + Web Audio fallback)
    scoring.js                  — points math, perfect bucket, speed bonus
    leaderboard.js              — localStorage-backed leaderboard, per-day
    scenarios.js                — auto-loads everything in /data/scenarios
    categoryStyles.js           — icon + color per category
  data/scenarios/               — one JSON file per scenario
public/
  sounds/                       — drop real MP3s here to override synth (optional)
```

---

## Customizing the look

- Color palette is in `tailwind.config.js` — change `magenta`, `cyan`, `gold`, etc., and the whole UI follows.
- Taglines in the footer live in `src/components/Footer.jsx`.
- Persona icons / category colors in `src/lib/categoryStyles.js`.

---

## License

Internal training tool. Not for redistribution.
