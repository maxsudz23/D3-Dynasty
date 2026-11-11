# D3 Dynasty: Project Notes

This is a D3 cross country coaching game in plain HTML, CSS and JS for the **Website #2** class assignment. The rubric is at `../.claude/skills/custom-skills/Website2.md` and the design guidance at `../.claude/skills/custom-skills/SKILL.md`. `GRADING.md` points the grader to each rubric item, so update its line numbers when you move code.

## Hard constraints (from the rubric)
- No build step and no ES modules. Scripts are classic `defer` scripts that hang off one `window.XC` namespace, so the page works from `file://`. Load order in `index.html` matters.
- No inline styles. Setting CSS custom properties from JS is fine. No `onclick` attributes, no `innerHTML`; build DOM with `XC.util.h()` and `XC.util.svg()`.
- The console must stay error-free. APIs need graceful failure handling, and browser APIs need handling for denied permissions.

## Architecture
- **Engine** (pure, testable in node with `global.window = global`): `util.js`, `data/schools.js`, `data/names.js`, `athletes.js`, `race.js`, `api.js`, `season.js`.
- **UI:** `ui/common.js` holds the theme, crest, portraits, chrome, toasts and confirm dialog. Each screen registers on `XC.screens[name]` with `{ title, render(root, params), legend(), onKey(e), back(), onSquadChange(), cleanup(), squadTabs, context }`.
- **Router:** `main.js` (`XC.go(name, params)`, `XC.refresh()`, `XC.setSquad()`). The global keys are Q/E for squad, Esc for back, M for mute and arrows to move focus between elements marked `[data-nav]`.
- **State:** `XC.state` is saved to localStorage key `d3dynasty.save.v1` (version 1; the pre-rename key `harriers27.dynasty.v1` is still read as a fallback). `XC.live` holds values that aren't saved, such as the latest race sims used for the animation.
- **Phases:** `preseason` (recruiting wheel) → `season` (`meetIndex` 0–5) → `recap` → `graduation` → `progression` → `cut` → `S.startNewSeason` → `preseason`. `S.runMeet` saves results before the race animation plays, so reloading can't reroll a race.

## Game rules (in `season.js`, `athletes.js`, `race.js`)
- Ratings are SPD, END, HIL, KCK, IQ, DUR and MNT. OVR weights END at 0.3, SPD at 0.2 and the others at 0.1 each, capped at 99. Potential grades A–D set offseason growth.
- The starting roster is 12 runners per squad, rated 50–90. The roster cap is 20 and the cut minimum is 5. Seniors graduate automatically.
- Reputation starts at 30 and is capped at 100. Recruit OVR tops out at `62 + 0.37 × rep` (min = max − 20). Each offseason, rep drops by 3, or by 5 above 80.
- The wheel has 10 segments: prospect ×4, walk-on ×2, transfer ×2, hidden gem and blue chip. Each squad gets 7 spins.
- Nationals qualifying: top 2 at regionals is automatic, 3rd gets an at-large bid, and 4th gets one if the team won an invitational. Otherwise, any runner finishing top-10 qualifies individually.
- Opponent strength is stored in `state.opp[sq][schoolId]` and drifts each season. Opponent rosters are seeded per school, season and squad, so they stay consistent within a season.

## Testing
No test files are in the repo. Previous sessions used scratchpad scripts:
- A node script that runs 20 seasons headlessly to check scoring, caps and graduation.
- `puppeteer-core` driving the installed Chrome (`/Applications/Google Chrome.app`) through a full playthrough, a run with both APIs blocked and geolocation denied, and a check for horizontal overflow at 375px.

Re-create similar scripts in the scratchpad rather than adding dependencies to this project.

## Known judgment calls
- 141 real D3 programs plus a custom-school builder. Colors are approximate, and crests are generated monograms (no real logos).
- Long dynasties can snowball toward 95+ team OVR. The stronger rep decay above 80 is the only brake.

## Deployment
- `grading` is a frozen snapshot for the grader, served by GitHub Pages. Don't commit to it.
- `main` deploys to Cloudflare through `wrangler.jsonc`, which serves the repo root as static assets with no build step. `.assetsignore` keeps `.git`, the `.md` notes and the config files from being served. The `name` in `wrangler.jsonc` must match the Worker's name in the Cloudflare dashboard.
