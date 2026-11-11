# D3 Dynasty: Project Notes

D3 Dynasty is a Division III cross country coaching game in plain HTML, CSS and JS. It started as the **Website #2** class assignment. The rubric is at `../.claude/skills/custom-skills/Website2.md` and the design guidance at `../.claude/skills/custom-skills/SKILL.md`. `GRADING.md` points the grader to each rubric item. Its line numbers are only accurate on the `grading` branch.

## Branches and deployment
- **`grading`:** a frozen snapshot for the grader, served by GitHub Pages at https://maxsudz23.github.io/D3-Dynasty/. Commit to it only when the user explicitly asks for a specific fix there. Apply that fix alone (for example, check out `grading` in a separate git worktree and apply a patch), keep it within the rubric, and update the `GRADING.md` line numbers it shifts.
  - So far `grading` has two fixes on top of the original game: the favicon and the wheel freeze fix.
  - The user chose to leave the race-score leak fix off `grading`.
- **`main`:** all ongoing work. It deploys to a Cloudflare Worker named `d3-dynasty` at https://d3-dynasty.maxsudrzynski.workers.dev.
  - `wrangler.jsonc` serves the repo root as static assets with no build step.
  - `.assetsignore` keeps `.git`, the `.md` notes and the config files off the site.
  - The `name` in `wrangler.jsonc` must match the Worker's name in the dashboard.
  - Deploy with `npx wrangler deploy` (this machine is logged in). Whether pushes to `main` also auto-build from GitHub is unconfirmed, so deploy after pushing and check the live site.
- Commit and push only when the user asks.

## Hard constraints
`main` is no longer bound by the Website #2 rubric. Libraries and APIs are allowed if a feature needs them, but keep this framework:
- No build step and no ES modules. Scripts are classic `defer` scripts that hang off one `window.XC` namespace, so the page works from `file://`. Load order in `index.html` matters: engine files first (`util`, `storage`, `audio`, data, `athletes`, `race`, `course`, `training`, `api`, `season`), then UI, then `main.js`.
- No inline styles. Setting CSS custom properties from JS is fine. No `onclick` attributes, no `innerHTML`; build DOM with `XC.util.h()` and `XC.util.svg()`.
- The console must stay error-free, including on hosted pages. Hosted pages request a favicon (`favicon.svg` is linked in `index.html`), and `file://` never shows that error.
- APIs need graceful failure handling, and browser APIs need handling for denied permissions.

## Architecture
- **Engine** (pure, testable in node with `global.window = global`): `util.js`, `data/schools.js`, `data/logos.js`, `data/names.js`, `athletes.js`, `race.js`, `course.js`, `training.js`, `api.js`, `season.js`.
- **UI:** `ui/common.js` holds the theme, crest, portraits, chrome, toasts and confirm dialog.
  - `ui.crest(school)` draws the school's athletics logo on a white shield edged in its primary color when `XC.logos.pathFor(school)` has one, and the generated monogram otherwise. Custom schools (id `custom`) and any logo that fails to load get the monogram.
  - `ui.teamMark(team)` is the small mark beside a team name in the meet preview field, the live race panel, and both results tables. Teams with a logo get a 22×25 logo shield, and the rest get the two-color chip. Both take 28px, so names line up. `team.id` is the school id, or `'user'` for the player's school.
  - The results team-scores table is `grid--dense` (7px cell padding), and its name cell (`cell-team-name`) may wrap. Before that change, long names like Claremont-Mudd-Scripps pushed the table past its panel at 1440px.
  - It also has `ui.courseMap(course, programs)` (an SVG map that places labels to avoid collisions), `ui.fatigueMeter(f)`, and `ui.meter(fraction, label, cls)`.
- **Screen hooks:** each screen registers on `XC.screens[name]` with any of:
  - `title`, `render(root, params)`, `legend()`, `onKey(e)`, `back()`, `onSquadChange()`, `cleanup()`, `squadTabs`, `context`
  - `canChangeSquad()`: return false to block squad switching. The wheel uses it while spinning.
- **Screens:** `title`, `setup`, `hub`, `schedule`, `trophies`, `settings`, `roster`, `wheel`, `training`, `meet`, `race`, `results`, then the offseason screens.
- **Router:** `main.js` (`XC.go(name, params)`, `XC.refresh()`, `XC.setSquad()`). The global keys are Q/E for squad, Esc for back, M for mute and arrows to move focus between elements marked `[data-nav]`.
- **Legend items:** `{ key, label, action, keyboardOnly? }`. Set `keyboardOnly: true` on items that repeat an on-screen control (squad tabs, the sound toggle, "Enter: select focused"), so touch screens hide them.
- **Guard actions in the function itself:** keyboard shortcuts and legend buttons call screen methods directly and skip the disabled buttons, so every action must check its own preconditions. The wheel freeze came from this.
- **State:** `XC.state` is saved to localStorage key `d3dynasty.save.v1` (version 1; the pre-rename key `harriers27.dynasty.v1` is still read as a fallback). `XC.live` holds values that aren't saved, such as the latest race sims used for the animation.
  - `S.migrate(state)` runs on every load and fills in fields older saves lack: `homeCourse`, `training`, and athlete `fatigue`/`form`.
  - New saved fields must be added there.
- **Phases:** `preseason` (recruiting wheel) → `season` (`meetIndex` 0–5, each meet preceded by a workout day in `state.training`) → `recap` → `graduation` → `progression` → `cut` → `S.startNewSeason` → `preseason`. `S.runMeet` saves results before the race animation plays, so reloading can't reroll a race.

## Game rules (in `season.js`, `athletes.js`, `race.js`)
- Ratings are SPD, END, HIL, KCK, IQ, DUR and MNT. OVR weights END at 0.3, SPD at 0.2 and the others at 0.1 each, capped at 99. Potential grades A–D set offseason growth.
- The starting roster is 12 runners per squad, rated 50–90. The roster cap is 20 and the cut minimum is 5. Seniors graduate automatically.
- Reputation starts at 30 and is capped at 100. Recruit OVR tops out at `62 + 0.37 × rep` (min = max − 20). Each offseason, rep drops by 3, or by 5 above 80.
- The wheel has 10 segments: prospect ×4, walk-on ×2, transfer ×2, hidden gem and blue chip. Each squad gets 7 spins.
  - Spin and Spin all lock each other out through the `spinning` and `spinningAll` flags, however they're triggered.
  - Spin all stops if a spin can't start.
- Nationals qualifying: top 2 at regionals is automatic, 3rd gets an at-large bid, and 4th gets one if the team won an invitational. Otherwise, any runner finishing top-10 qualifies individually.
- Opponent strength is stored in `state.opp[sq][schoolId]` and drifts each season. Opponent rosters are seeded per school, season and squad, so they stay consistent within a season.
- **Race-day modifiers on effective rating (`race.js`):**
  - `+ form − max(0, fatigue − 20) × 0.12`.
  - Rival runners race at form +1, so a coach who never trains falls behind.
  - The hill rating's weight is `clamp(climbPerKm / 32, 0.03, 0.5)`, from the actual course. Flat, rolling and mud keep their SPD, END and DUR/MNT bonuses.
- **Race injury risk:** `(0.008 + (100 − DUR)/100 × 0.035) × (0.7 + (fatigue/40)²)`. Each race adds `12 + (100 − DUR) × 0.06` fatigue.
- **Race view:** before the gun the live panel shows "Scores post after the gun" and lists your runners in lineup order. The race is simulated before the animation, so sorting tied runners at the start line would leak the final order.

## Courses (`course.js`)
- **Venues:** each one has a seeded course from `C.generate(seed, terrain)`, cached through `C.layoutFor(course)`. The layout is a fixed 16:9 grid of 7×4 cells.
- **Loops (65%):** the outline of a random hole-free blob of grid cells, with jittered points and smoothing. Runners lap the loop.
  - Loop lengths are 2400–8400 m, chosen so start and finish never coincide.
  - Both races share one finish (`finishAt`), and each squad's start is backed off from it by its race distance.
- **Point-to-point (35%):** a self-avoiding walk across the grid, smoothed. The route is the men's 8K, and the women start 2K in at a shared finish.
- **Never crossing:** `C.isClear` rejects any route where two parts that aren't neighbors along the route come within `MIN_GAP` (0.95 of 9 units of map height) or cross. Failed attempts retry, and a wobbly oval is the fallback.
  - Clear routes are then scaled up to fill the frame, which only widens the gaps.
  - 600 generated courses had 0 crossings, at about 2 ms each.
- **Hills:** Gaussian bumps in an elevation field, scaled so `climbPerKm` lands in the terrain's range: flat 1–3, rolling 4.5–8, hilly 10–16, mud 1.5–4.5.
- **Race mapping helpers:** `C.span(layout, sq)`, `C.routeAt(layout, sq, progress)`, `C.pointAt(layout, frac)` and `C.lapsText`.
- **Where courses come from:** every school has a fixed home course from `S.venueFor`, seeded by school id: the same name, terrain and layout on every visit.
  - The user's own course is `state.homeCourse = { name, type, seed }`.
  - The nationals venue is seeded by its venue name.
  - Old saves' meets without `course.seed` derive one from the name and terrain.
- **Drawing:** the race canvas draws the generated route with direction arrows, hill shading and contours, separate start and finish lines, and split markers that merge when laps put them in the same spot. The meet preview shows the SVG map, layout, laps and climbing.

## Training (`training.js`, `ui/training.js`)
- **When:** one workout day before each meet. `T.GAP_WEEKS = [3, 2, 2, 4, 2, 1]` is the weeks before each meet.
  - Half the block's recovery happens before the workout and half after.
  - Starting a meet without a workout day runs `T.restBlock` instead.
- **Workout types and formats:** each is continuous or broken, with reps, work (minutes, meters or seconds), rest and pace.
  - Threshold: continuous tempo or cruise intervals.
  - VO2 max: track intervals or on/off floats.
  - Hills: long repeats, short sprints, or a hilly tempo loop.
  - Fartlek/cutdown: surges, a cutdown run, or a broken cutdown.
- **Dose:** `T.dose = load / capacity`.
  - Load is `work minutes × i² × type multiplier × density × strain multiplier`. Hills carry 1.5× load.
  - Capacity is `14.8 + (END−60)·0.1 + (DUR−60)·0.06 + (MNT−60)·0.03 + (year−1)·0.8`, clamped to 9–26.
  - Zones: Light ≤0.55, Moderate ≤0.85, On target ≤1.12, Overreach ≤1.4, then Too much.
- **Strain (time to exhaustion):** each pace has a time it can be held in one go.
  - Threshold: steady 120, threshold 55, 10K effort 32 minutes.
  - VO2 max: 5K pace 16, 3K pace 9, mile pace 4.5 minutes.
  - Hills: controlled 30, strong 12, all-out 5 minutes.
  - Fartlek: relaxed 70, moderate 40, aggressive 20 minutes.
  - Better END stretches the limit slightly.
  - `strain = work / tte × rest density`, and cost is multiplied by `1 + 1.2 × max(0, strain − 0.8)^1.3`.
  - The plan screen warns when strain is over 100%.
- **Dropping out:** a runner's breaking point is `1.15 + (MNT−60)·0.004 − max(0, day fatigue−25)·0.004` of their strain limit, clamped to 0.95–1.35. On the day it varies by a 6% spread (`T.BREAK_SD`).
  - `T.attempt(w, a, sq, day, rng?)` returns how much they finish: `limit / strain`, or less if a single rep is longer than they can hold. Without `rng` it's the expected outcome used by the previews.
  - A runner who drops out takes the dose of the part they finished, with the strain multiplier at their limit. Then `T.DNF` applies: stimulus ×0.5, +12 fatigue, −1 form, injury risk ×1.5.
  - `T.dose` is still the planned full-session dose. Previews, the group note, the run confirm and the report all use the attempt (`Won't finish`, `Dropped out during rep 2 of 12`).
  - `fitVolume` penalizes any candidate where a member is within two spreads of their breaking point, so suggestions and auto plans never produce dropouts.
- **Outcomes:**
  - Fatigue gain is `18 × dose^1.8`.
  - Benefit flattens above a dose of 1 and shrinks with fatigue.
  - Form becomes `0.5 × form + 1.4 × stimulus − 0.35`, clamped to −3..4.5.
  - Stat XP accumulates into whole rating points, scaled by potential.
  - Workout injury risk rises with dose² and fatigue².
  - A recovery run sheds 10 extra fatigue.
  - Recovery per week is `9 + DUR × 0.07` (+ training room level × 1.5).
- **Suggestions:** `T.recommend` aims for a target dose (1.08 normally, 0.92 in championship weeks, 0.5 for the 1-week taper, lower for tired runners).
  - It picks a workout type from the course's climb, the runners' weakest stats, taper and variety.
  - It then fits the volume so the middle runner hits the target without pushing anyone into overreach.
- **Auto plan:** `T.autoPlan` rests anyone at 65+ workout-day fatigue and splits the rest into up to three groups by readiness.
- **Plan state:** `state.training = { meetIndex, done, plans: { [sq]: { groups, assign } }, report }`. `assign[id]` is `{ mode: 'group', group }`, `{ mode: 'custom', workout }` or `{ mode: 'rest' }`.
- **Future hooks:** `T.advisorQuality(state)` reads `state.staff.trainingQuality` (assistant coaches), and staff suggestions carry `source: 'staff'`. `state.facilities.trainingRoom` and `state.facilities.track` add bonuses. `ROADMAP.md` covers the planned texts, assistant coaches and facilities.

## Mobile
- At 600px wide or less, and on touch screens, the legend bar becomes a row of real buttons. It holds the only Back control on several screens, so it must never be hidden.
- Touch screens (`hover: none` and `pointer: coarse`) hide keycap hints, `keyboardOnly` legend items and "Press Enter". The squad bumpers show ‹ › instead of Q/E.
- On short screens (max-height 500px, i.e. phones held sideways), the header tightens and the news ticker hides. The race canvas keeps at least 200px of height.
- `body` uses `100dvh`. Check new screens at 390×844 and 844×390 for horizontal overflow.

## Play tester feedback (addressed)
- **"Space then A on the wheel crashes it":** the shortcuts bypassed the disabled buttons, and Spin all looped without yielding a frame. The fix is on both branches.
- **"8×1K at 3K with 45″ rest should cook my guy more" and "40 min at 10K feels like a lot":** this led to the time-to-exhaustion strain model and the narrower capacity range. Both sessions are now "Too much" even for strong runners.
- **"The race shows the final score before the gun":** this led to the race-view placeholder. It's fixed on `main` only.

## Testing
No test files are in the repo. Re-create scripts like these in the scratchpad rather than adding dependencies; `puppeteer-core` drives the installed Chrome at `/Applications/Google Chrome.app`.
- **Engine (node):**
  - A 20-season headless run checks scoring, caps and graduation.
  - A course stress test generates 600 courses, checks crossings and clearance, climb ranges and spans, and renders a contact sheet.
  - A training balance sim plays many seasons under different coaching styles: auto plan, never train, 1.25×, 1.5× and 2× volume, and max for everyone. Last results:
    - Auto was best or tied.
    - Never training was worse.
    - 1.5× or more was clearly worse, with rising injuries.
    - Max for everyone injured so many runners the team couldn't score.
    - After dropouts were added (60 seasons, average place percentile, lower is better): auto 0.268, never 0.334, 1.5× 0.331, max for everyone 0.631. Everyone on 12×2000 m at mile pace scored 0.350, worse than never training. Auto plans had 0 dropouts.
  - Re-run it after changing any training number.
  - A dose table lists standard and tester sessions for an average and a strong runner.
- **Browser (puppeteer):**
  - A full season with workout days at 1440×900 and 390×844, checking console errors, overflow, reload and migration.
  - The wheel repro (Space then A, A then Space, and a squad tab click mid-spin).
  - The race panel before and after the gun.
  - Old-save migration: strip the new fields, then load and play a season.
  - The earlier checks: a run with both APIs blocked and geolocation denied, and overflow at 375px.
- Run the same checks against the live URLs after deploying. Add a `?v=` cache-buster to the URL; Cloudflare can briefly serve stale HTML right after a deploy.
- macOS has no `timeout`. Use `perl -e 'alarm N; exec @ARGV' node script.js` to cap a run that might hang.

## Known judgment calls
- 143 real D3 programs plus a custom-school builder. Colors are approximate.
- **Logos:** 71 programs use a real athletics logo from Wikimedia Commons in `img/logos/` (listed in `js/data/logos.js`, sources in `img/logos/SOURCES.md`). The other 72 keep generated monograms.
  - Every file is public domain on Commons (a logo too simple for copyright) but is still the school's trademark. The user accepted that risk for `main`; keep logos off `grading`.
  - Only athletics marks and bold athletic wordmarks were used. Thin university text logos, seals, and wordmarks wider than about 3:1 were skipped because they're unreadable in the 34px context-bar crest.
  - Commons rate-limits hard (HTTP 429). Batch API calls 50 titles at a time, and use the `thumburl` renders, which download more reliably than originals.
  - SVGs are the Commons originals. PNGs are about 256–320 px wide renders. `alma` is a PNG because its SVG is 1.2 MB.
  - A logo whose artwork hits the shield's narrowing bottom can be shrunk with `[ext, scale]` in `LOGOS` (Middlebury uses 0.84).
- Long dynasties can snowball toward 95+ team OVR. The stronger rep decay above 80 is the only brake, and in-season training adds about half an OVR point per season.
- One workout day stands for each training block. Gap weeks only change recovery.
- On a phone the workout screen is long (one card per runner). A collapsible runner list is a possible improvement.
