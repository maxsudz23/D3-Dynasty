# D3 Dynasty: Project Notes

D3 Dynasty is a Division III cross country coaching game in plain HTML, CSS and JS. It started as the **Website #2** class assignment. The rubric file was deleted on 2026-11-17. `GRADING.md` points the grader to each rubric item.

Project skills in `.claude/skills/` load automatically in this repo:
- **`frontend-design`:** the design guidance, copied from `../.claude/skills/custom-skills/SKILL.md`.
- **`modern-web-guidance`:** Chrome's guide catalog, used through `npx -y modern-web-guidance@latest search/retrieve` before HTML/CSS/client JS work, or `legacy-scan` for a modernization pass.

`.claude/` is in `.assetsignore`, so neither these files nor `settings.local.json` are served. Its line numbers are only accurate on the `grading` branch.

## Branches and deployment
- **`grading`:** a frozen snapshot for the grader, served by GitHub Pages at https://maxsudz23.github.io/D3-Dynasty/. Commit to it only when the user explicitly asks for a specific fix there. Apply that fix alone (for example, check out `grading` in a separate git worktree and apply a patch), keep it within the rubric, and update the `GRADING.md` line numbers it shifts.
  - So far `grading` has two fixes on top of the original game: the favicon and the wheel freeze fix.
  - The user chose to leave the race-score leak fix off `grading`.
- **`main`:** all ongoing work. It deploys to a Cloudflare Worker named `d3-dynasty`.
  - The public URL is https://d3dynasty.com, and https://www.d3dynasty.com serves the same site. The domain's DNS is on Cloudflare.
  - Both are attached as custom domains in the `routes` of `wrangler.jsonc`, so `npx wrangler deploy` keeps them attached. Don't remove those entries.
  - https://d3-dynasty.maxsudrzynski.workers.dev stays on (`workers_dev: true`). Wrangler turns it off by default when routes are set.
    - It's also the link that works on WashU eduroam for now. The domain was registered 2026-11-12, and the campus Palo Alto firewall answers DNS for newly registered domains with `sinkhole.paloaltonetworks.com`, which shows as ERR_CONNECTION_RESET. That should lift once the domain is past Palo Alto's ~30-day "newly registered" window (mid-December 2026), or sooner if Palo Alto recategorizes it or WashU IT allowlists it. Nothing in the site causes it.
  - `wrangler.jsonc` serves the repo root as static assets with no build step.
  - `.assetsignore` keeps `.git`, the `.md` notes, the config files, `scripts/` and `proto/` off the site.
  - The `name` in `wrangler.jsonc` must match the Worker's name in the dashboard.
  - Deploy with `npx wrangler deploy` (this machine is logged in). Whether pushes to `main` also auto-build from GitHub is unconfirmed, so deploy after pushing and check the live site.
- Commit and push only when the user asks.

## Hard constraints
`main` is no longer bound by the Website #2 rubric. Libraries and APIs are allowed if a feature needs them, but keep this framework:
- No build step and no ES modules. Scripts are classic `defer` scripts that hang off one `window.XC` namespace, so the page works from `file://`. Load order in `index.html` matters: engine files first (`util`, `storage`, `audio`, data, `athletes`, `looks`, `race`, `course`, `training`, `staff`, `texts`, `facilities`, `difficulty`, `scouting`, `api`, `season`), then UI, then `main.js`.
- No inline styles. Setting CSS custom properties from JS is fine. No `onclick` attributes, no `innerHTML`; build DOM with `XC.util.h()` and `XC.util.svg()`.
- The console must stay error-free, including on hosted pages. Hosted pages request a favicon (`favicon.svg` is linked in `index.html`), and `file://` never shows that error.
- APIs need graceful failure handling, and browser APIs need handling for denied permissions.

## Architecture
- **Engine** (pure, testable in node with `global.window = global`): `util.js`, `data/schools.js`, `data/logos.js`, `data/names.js`, `data/places.js`, `data/courses.js`, `athletes.js`, `looks.js`, `race.js`, `course.js`, `training.js`, `staff.js`, `texts.js`, `facilities.js`, `difficulty.js`, `scouting.js`, `api.js`, `season.js`.
- **UI:** `ui/common.js` holds the theme, crest, portraits, chrome, toasts and confirm dialog. `ui/avatar.js` draws runner looks (loaded right after `common.js`), and `ui/hub-art.js` draws the hub menu art (after `avatar.js`).
  - `ui.setTheme(primary, accent, school)` also sets `--team-logo` to the school's logo (absolute URL), or `none`. `body::before` draws it at 10% opacity over the background stripes. Schools without a logo and custom schools show nothing. Pass the school wherever a real school's theme is applied.
  - `ui.crest(school)` draws the school's athletics logo on a white shield edged in its primary color when `XC.logos.pathFor(school)` has one, and the generated monogram otherwise. Custom schools (id `custom`) and any logo that fails to load get the monogram.
  - `ui.teamMark(team)` is the small mark beside a team name in the meet preview field, the live race panel, and both results tables. Teams with a logo get a 22×25 logo shield, and the rest get the two-color chip. Both take 28px, so names line up. `team.id` is the school id, or `'user'` for the player's school.
  - The results team-scores table is `grid--dense` (7px cell padding), and its name cell (`cell-team-name`) may wrap. Before that change, long names like Claremont-Mudd-Scripps pushed the table past its panel at 1440px.
  - It also has `ui.courseMap(course, programs)` (an SVG map that places labels to avoid collisions), `ui.fatigueMeter(f)`, and `ui.meter(fraction, label, cls)`.
- **Screen hooks:** each screen registers on `XC.screens[name]` with any of:
  - `title`, `render(root, params)`, `legend()`, `onKey(e)`, `back()`, `onSquadChange()`, `cleanup()`, `squadTabs`, `context`
  - `canChangeSquad()`: return false to block squad switching. The wheel uses it while spinning.
- **Screens:** `title`, `setup`, `hub`, `schedule`, `trophies`, `settings`, `staff`, `facilities`, `texts`, `look`, `recruit`, `roster`, `wheel`, `training`, `meet`, `race`, `results`, then the offseason screens.
- **Router:** `main.js` (`XC.go(name, params)`, `XC.refresh()`, `XC.setSquad()`). The global keys are Q/E for squad, Esc for back, M for mute and arrows to move focus between elements marked `[data-nav]`.
  - **View transitions:** moving to a different screen runs inside `document.startViewTransition` (a 160 ms cross-fade of the page), so the new screen draws one frame after `XC.go` returns. It's instant for same-screen redraws (`XC.refresh`, squad changes), redirects from inside a `render`, reduced motion, and browsers without the API. Keys are ignored while a swap is pending, and a later `XC.go` cancels an earlier pending one.
  - Don't read the new screen's DOM right after `XC.go`. Browser test scripts should emulate `prefers-reduced-motion: reduce` (instant swaps) or wait about 300 ms.
  - When a screen's `render` redirects (`return XC.go('wheel')`), the outer `XC.go` stops there, so the redirect's legend and focus stay.
- **Modern web platform:** `U.clear` is `replaceChildren()`, API fetches time out with `AbortSignal.timeout`, and arrays are copied with `toSorted`/`toReversed`. The confirm dialog has `closedby="any"` (backdrop click cancels) plus a click fallback for Safari in `ui.confirm`. Checked with Chrome's `modern-web-guidance` (`npx -y modern-web-guidance@latest legacy-scan .`); its 2 remaining findings are intentional: the loading dots' `:nth-child` delays and `proto/`.
- **Legend items:** `{ key, label, action, keyboardOnly? }`. Set `keyboardOnly: true` on items that repeat an on-screen control (squad tabs, the sound toggle, "Enter: select focused"), so touch screens hide them.
- **Guard actions in the function itself:** keyboard shortcuts and legend buttons call screen methods directly and skip the disabled buttons, so every action must check its own preconditions. The wheel freeze came from this.
- **State:** `XC.state` is saved to localStorage key `d3dynasty.save.v1` (version 1; the pre-rename key `harriers27.dynasty.v1` is still read as a fallback). `XC.live` holds values that aren't saved, such as the latest race sims used for the animation.
  - `S.migrate(state)` runs on every load and fills in fields older saves lack: `homeCourse`, `training`, `staff` (via `XC.staff.ensure`), `facilities` and `funds` (via `XC.facilities.ensure`), `inbox`, `squad.plans` (also pruned of runners who left), athlete `fatigue`/`form`/`morale`, `look` for generated runners, prospects and graduates, and `difficulty`/`recruitMode` (old saves become Easy with the wheel).
  - New saved fields must be added there.
- **Phases:** `preseason` (recruiting wheel) → `season` (`meetIndex` 0–5, each meet preceded by a workout day in `state.training`) → `recap` → `graduation` → `progression` → `cut` → `S.startNewSeason` → `preseason`. `S.runMeet` saves results before the race animation plays, so reloading can't reroll a race.

## Game rules (in `season.js`, `athletes.js`, `race.js`)
- Ratings are SPD, END, HIL, KCK, IQ, DUR and MNT. OVR weights END at 0.3, SPD at 0.2 and the others at 0.1 each, capped at 99. Potential grades A–D set offseason growth.
- The starting roster is 12 runners per squad, rated 50–90. The roster cap is 20 and the cut minimum is 5. Seniors graduate automatically.
- **Real rosters (`js/data/rosters.js`):** WashU's 2026 men's and women's rosters, used with the team's permission. At the team's request, each squad includes its top 20 by season best plus anyone outside it who asked to be in. On the men's side that's Sun, Buckman, Donner, Fleck, Newkirk, Roach, Shadaksharappa, Crossland and Proffitt, for 28 men and 20 women. Charlie Glatz was taken out on 2026-11-14. The rest of the roster isn't in the game or the file, which is public on the site. They're listed in `HIDDEN_ROSTER.md` (not served), with a ready-made row each. Add someone back only if they want to be in the game. A new save as WashU starts with the real roster for each squad it fields, instead of a generated one, and skips the randomuser download.
  - Names, class years and hometowns come from washubears.com.
  - OVR comes from each runner's 2026 season-best mark, supplied by the team (men 8K, women 6K), through `S.ovrFromMark`. It uses the race model's seconds per point (6.73 for 8K, 5.2 for 6K), anchored so 24:20 (men) and 21:25 (women) are a 90, clamped 40–95.
  - That gives team OVRs of 86 (men) and 84 (women), against tier-1 opponents' average of 83. The 20th-best marks are 26:28.0 (men) and 23:46.7 (women).
  - The individual ratings around the OVR, and potential, are seeded by name, so every save gets the same team.
  - `realRoster` still supports rows with no mark (a seeded rating a little below the class average, 58/62/66/69, SD 4), but the current top-20 rows all have marks.
  - Real PRs aren't copied into `a.pr`, because the game's race times run on their own scale.
  - **Starting injuries:** `XC.rosters.washu.injuries` lists meets out at the start of a new save (a season is 6 meets); `realRoster` turns them into weeks with `S.weeksForMeets`. Rishi Shadaksharappa and Jackson Proffitt start out 6 meets (14.5 weeks), miss year one, and are back for season two.
    - Rishi's mark is his freshman (2025) 8K PR from TFRRS, 25:23.7 (81 OVR), not his 2026 time.
    - Jackson has no college mark. His high school 5K (15:28.4) is converted to an 8K by Riegel's formula (`t8 = t5 × 1.6^1.06`), 25:27.9, which is 80 OVR.
    - A season out also slows their first offseason growth (`A.progress` × 0.6 after 3+ missed meets).
  - **TFRRS ratings** (everyone past their first year): `XC.rosters.washu.tfrrs` holds each runner's TFRRS college bests: `xc` (8K men / 6K women PR), `m800`, `m1500`, `mile`, `m5000`, `m10000`. First-years haven't run college track, so they stay on their season best alone.
    - **OVR (`S.realOvr`):** 50% the 2026 season best, 30% the TFRRS XC PR, and 20% the best track 5000/10,000 converted to an XC equivalent (`t × (xc/d)^1.06 × 1.03`). Missing parts are dropped and the weights renormalized. The result goes through `S.ovrFromMark`.
    - **Speed and kick (`S.shapeFromTrack`):** SPD comes from the average 1500 equivalent of the 1500, mile × 0.928 and 800 × 2.05. Men are 90 at 3:54 (0.8 s per point), women 90 at 4:52 (1.15 s). KCK comes from the 800: men 88 at 1:56 (1.5 points per second), women 88 at 2:18 (1.3). END, then the other ratings, are then adjusted until OVR equals the target.
    - Rishi and Calvin keep the PR-based row marks they were given. Hand-set ratings (Freddie, Mateo) apply on top.
  - **Hand-set ratings:** `XC.rosters.washu.ratings` overrides generated ratings by name. For now that's Freddie van der Velden at SPD 85 and KCK 90, which makes him 78 OVR. Mateo Gros-Slovinsky is at SPD 85 and KCK 93. OVR is recomputed afterward. Each set is applied once per athlete, remembered in `a.setRatings`, at creation and in `S.migrate`, so existing saves get it and later training isn't undone.
  - **Photos:** headshots come from the washubears.com roster pages and are hosted in `img/roster/washu/m/*.webp` and `img/roster/washu/w/*.webp` (400×600, about 1.5 MB and 1.1 MB). They're mapped by name in `XC.rosters.washu.photos.M` and `.W`.
    - The site's image server makes the files: `<image>.jpg?width=400&height=600&mode=crop&format=webp&quality=85`. Match each headshot to its roster card, not its filename: Leah Sekulich's file is named "Lucy_Sekulich", Mackenzie Raue's has no `_HS_2026`, and Grace Todd's is from 2025.
    - Only runners in the game get one. Lukas Keane has no roster photo, so he gets the silhouette. All 20 women have one.
    - `S.migrate` fills in photos for real athletes in older saves.
    - `.portrait` uses `object-position: 50% 12%`, so the taller headshots crop to the face.
  - **Removing a runner:** delete their row, `tfrrs`, `photos` entry and headshot file, list them in `HIDDEN_ROSTER.md`, and add `U.hash('First Last')` to `XC.rosters.washu.removed[sq]`. `S.migrate` drops real athletes on that list from saves already in progress. It holds hashes so the served file doesn't name them.
  - Real athletes carry `a.real = true`, and `S.migrate` leaves their hometowns alone (it would otherwise swap any town missing from `data/places.js`).
  - The limit is `S.rosterCap(state, sq)`: the real roster size plus `S.REAL_ROSTER_ROOM` (5), stored in `state.rosterCap`. That makes 33 men and 25 women (saves started before a runner was removed keep their old, higher cap), so year one still has a recruiting class. Use `S.rosterCap`, never `S.ROSTER_CAP`, anywhere a limit is checked or shown.
  - To update the rosters, re-pull both roster pages, convert hometowns to "City, ST", and keep any site typos fixed (the site lists "Inclince Village" for Incline Village, NV).
- Reputation starts at 30 and is capped at 100. Recruit OVR tops out at `62 + 0.37 × rep` (min = max − 20). Each offseason, rep drops by 3, or by 5 above 80.
- The wheel has 10 segments: prospect ×4, walk-on ×2, transfer ×2, hidden gem and blue chip. Each squad gets 7 spins.
  - Spin and Spin all lock each other out through the `spinning` and `spinningAll` flags, however they're triggered.
  - Spin all stops if a spin can't start.
- Nationals qualifying: top 2 at regionals is automatic, 3rd gets an at-large bid, and 4th gets one if the team won an invitational. Otherwise, any runner finishing top-10 qualifies individually.
- Opponent strength is stored in `state.opp[sq][schoolId]` and drifts each season. Opponent rosters are seeded per school, season and squad, so they stay consistent within a season.
- **Race-day modifiers on effective rating (`race.js`):**
  - `+ form − max(0, fatigue − 20) × 0.12 + morale × 0.3`, and MNT counts as `MNT + morale × 2` for race-day variance and bad-day odds (`R.MORALE`).
  - Rival runners race at form +1, so a coach who never trains falls behind.
  - The hill rating's weight is `clamp(climbPerKm / 32, 0.03, 0.5)`, from the actual course. Flat, rolling and mud keep their SPD, END and DUR/MNT bonuses.
- **JV races (invitationals only):** `S.hasJV(meet)` is true for `type === 'invite'`.
  - **Your JV:** every healthy runner outside the top seven (`S.jvRunners`). A squad with no reserves skips its JV race.
  - **Opponents' JV:** seven seeded runners per field school, about 9 under its varsity strength (`S.oppJV`, keyed `school|squad|season|jv`).
  - **Running it:** both fields are set before either race. JV results live in `meet.jv[sq]` (marked `jv: true`), and `meet.results[sq]` stays varsity-only, so the hub and schedule are unchanged. The JV races are appended after the varsity races in the race view.
  - **Effects:** `applyToRoster(state, meet, sq, races)` applies fatigue, injury risk, race counts and PRs to JV racers too. Career best, wins, top 10, All-American, rep and invite wins are varsity-only. A JV team win makes a news line.
  - **Names:** `S.raceNames` builds them from the host's colors via `U.colorName` (Red, Maroon, Navy, Gold…), e.g. "Red Race" (varsity) and "Green Race" (JV). If both colors give the same name (NYU, Illinois Wesleyan, Dickinson, Kenyon), they fall back to "Varsity Race" and "JV Race".
  - **Screens:** the meet preview shows both names and how many will run JV. The results screen toggles between the two races, and JV shows no rep.
- **Race injury risk:** `(0.008 + (100 − DUR)/100 × 0.035) × (0.7 + (fatigue/40)²)`. Each race adds `12 + (100 − DUR) × 0.06` fatigue.
- **Injuries are in weeks** (`a.injury` = weeks until healthy; changed 2026-11-16 so short injuries don't cost two meets):
  - **Calendar:** a block's weeks pass in two halves: to workout day, then to race day. `T.openBlock(state, { heal: true })` (after a meet and at the season opener) heals the first half; `T.runDay`, `T.restBlock` and `S.runMeet` heal the rest (`T.heal(state, 'workout' | 'meet')`, tracked in `state.training.healedTo`). So during a block "now" is workout day until the workout runs, then race day. `T.weeksUntilMeet(state)` gives the weeks left.
  - **Who races:** `S.raceReady(state, a)` (healed by race day). Lineups, JV and individual qualifiers use it through `A.lineup(roster, 7, ready)`. Workout day uses `a.injury > 0` (hurt on that day means rehab). `S.meetsOut(state, a)` counts the meets an injury will miss.
  - **Lengths** (`T.rollInjury`): hamstring 1–2, Achilles 1–3, calf strain 2–3, IT band 1–3, shin splints 1–3, rolled ankle 1–2, hip flexor 2–3, stress reaction in the foot 4–7 weeks. Mileage overuse: stress reaction 4–6, shin splints 1–3, Achilles 1–2, plantar fasciitis 2–4. The flu is 1–2 weeks.
  - **Display:** `ui.weeksText`, `ui.meetsOutText` and `ui.injuryText` ("Injured, 3 wk, misses the next meet", "back by race day", "out for the season").
  - **Old saves:** `S.migrate` converts meet-count injuries to the weeks that miss the same meets (`state.injuryUnits = 'weeks'`) and places the save on the block calendar.
  - **Effect** (100 seasons of auto play): injuries average 2.6 weeks and miss 0.82 meets each (they used to miss 1–3); the flu misses 0.51 meets (it used to always miss one). Injured runners still count `career.missed` for each meet they sit out.
- **Race plans (`race.js`, meet preview):** the team plan (`squad.strategy`: hard, even or neg) applies to everyone. Any of the starting seven can get their own plan in `squad.plans[athleteId]`. A missing entry or `'team'` means they follow the team plan. Opponents only use team plans.
  - **Plans** (`R.PLANS`, effects in `R.planEffect`):
    - hard: `(END−75)×0.18`, with luck ×1.45.
    - even: `(IQ−72)×0.04`.
    - neg: `(KCK−72)×0.12 + (IQ−72)×0.06`, with luck ×0.85.
    - kick: `(KCK−74)×0.22 + (IQ−72)×0.04`.
    - hills: `(HIL−72) × hill weight × 0.5 + (END−72)×0.03`, minus 0.6 below 4 m/km of climb.
    - easy (hold back): −3.
  - **Pack** (`R.PACK`, `R.packAdjust`): with two or more pack runners, each one's rating moves 30% toward the pack average and gains `max(0, 1.8 − 0.12 × spread)`, where spread is the pack's rating range. Pack runners also share 60% of their race-day luck and their pace wobble, cut luck to ×0.8, and have a 40% lower bad-day chance. A lone pack runner runs even.
  - **Race costs** (`R.PLAN_COST`): hills give fatigue ×1.3 and injury ×1.15, hard gives fatigue ×1.1, and easy gives fatigue ×0.55 and injury ×0.5. `applyToRoster` applies these through `T.afterRace(a, mult)`.
  - **Preview:** each runner's row shows only their name, OVR, all seven ratings, fatigue and the plan dropdown. This is the user's choice: there's no expected-edge number and no risk, fatigue or pack warnings, and the plan notes only describe the tactic, so players work out the tradeoffs themselves. `R.planEdge` (the expected rating change against even pace) is still in `race.js` for the balance sim, but no screen shows it.
  - **Balance** (3,000 races per setup, 14 teams, flat, rolling and hilly):
    - The best plan per runner beat any single team plan by 0.6–1.5 team places.
    - A tight pack of three beat even pace, and packing all seven lost.
    - Hills won on hilly courses and lost on flat ones.
    - Holding back everyone cost about 3 places.
    - Re-run this after changing plan numbers.
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
- **Layout shape (generated and traced alike):** `layout.legs` holds stretches of trail (`{ id, pts, closed }`), drawn once each. `layout.race[sq]` is that squad's own path (`{ pts, at }`) strung through the legs in running order.
  - `C.racePoint(layout, sq, progress)` places runners, start and finish lines, and split markers.
  - A generated course has one leg, and its race paths come from `C.span`.
  - `C.lapsText`, `C.loopLabel` and `C.describe` read a traced course's labels from its data.
- **Real home courses (`data/courses.js`):** courses keyed by course id, with `homeOf[schoolId]`.
  - `C.layoutFor` builds a course with a `trace` through `C.fromTrace`. A course without one is generated, steered by its `kind` and `climbPerKm`.
  - **Traces:** points in the source map's pixel coordinates, drawn in running direction, with optional `rotate`. Each race is a list of leg segments `{ leg, from?, to?, laps?, reverse? }`, where from/to are leg fractions or `[x, y]` points on the leg. Traced routes may cross themselves; `C.isClear` only applies to generated ones. Smoothing moves a closed leg's first point, so `C.fromTrace` rotates each loop to start at the point nearest the traced first point. A segment's default `from` of 0 is then where the tracer put it.
  - Distances come from scaling each race's path to its race length, so a good trace has men's/women's path lengths near 8:6. The data check flags anything more than 12% off.
  - **Status by conference** (`ROADMAP.md`, Real home courses, has the per-course research notes):
    - **UAA** (shipped 2026-11-12, commit `64be998`): traced WashU (SIUE), Chicago (St. James Farm), Case (Squire Valleevue Farm), CMU (Youthtowne Fields), Rochester (Genesee Valley Park) and Brandeis (Highland Park, Attleboro).
    - **CCIW** (2026-11-16): Wheaton (IL) and North Central share the traced St. James Farm. Also traced: Augustana (Saukie Golf Course, high), Illinois Wesleyan (Maxwell Park, from the 2016 CCIW maps, medium) and Elmhurst (Eldridge Park, a 2K loop run 4 and 3 times, medium). North Park has its real venue but a generated layout (see below). Carthage and Millikin are left generated.
    - **NESCAC** (2026-11-12): traced Middlebury (golf course), Bowdoin (Pickard Field), Bates (Wainwright, South Portland), Wesleyan (Long Lane Farm) and Trinity (Wickham Park). Williams, Colby, Hamilton and Conn College have their real venue but a generated layout (see below).
    - Every other program is still generated.
  - Only names, facts, sources and our traced points ship. Never ship map images.
  - **Courses we couldn't find or make:** researched schools left on generated venues. Keep this list current, and revisit a school when a map turns up.

    | School | Conference | Why |
    |---|---|---|
    | NYU | UAA | No home meet in 2022–2026. It ran an invitational at Van Cortlandt Park until about 2008, but there's no college 8K/6K map. |
    | Emory | UAA | No regular home meet. It hosted the 2022 UAA Championships at Nash Farm Battlefield in Hampton, GA, but the map is gone: Emory's old site is in maintenance mode, and the web archive has only error pages. |
    | Amherst | NESCAC | Its on-campus course (fields and the Wildlife Sanctuary) is short and rarely used: the 2025 Little Three ran 6K/4K there. No map or 8K/6K format; Amherst hosted the 2023 NESCACs at UMass's course instead. |
    | Tufts | NESCAC | No home meet in 2022–2026. Its old Grafton farm course (1999–2008) has no map; Franklin Park in Boston is a regular venue but not Tufts's course. |
    | Carthage | CCIW | No home meet in 2022–2026 (schedule "home" flags are other schools' meets). Its men's time trial and several meets are at UW-Parkside's Wayne E. Dannehl course, which has full 8K/6K maps, but that's Parkside's course; using it is the user's call. |
    | Millikin | CCIW | The H.W. Wright Classic moves between South Shores Park and old Scovill Golf Course (now Scovill Park West) in Decatur, at 2 mi to 8K. No map of either; the 2026 meet page's course photo link is broken. |

  - **Venues found but not traced:** in `data/courses.js` with real name, terrain and sources but no `trace`, so the layout is generated. Trace them when a usable map turns up.

    | School | Venue | Why no trace |
    |---|---|---|
    | Williams | Mt. Greylock XC Loops, Williamstown MA | No map: the 2008 map images return 404 with no archive, and the team site is behind a Cloudflare challenge. |
    | Colby | Quarry Road Trails, Waterville ME | No race map or lap structure, so even loop or point-to-point is unknown. No home meet since a 2022 dual. |
    | Hamilton | Hamilton College XC Course, Clinton NY | The only maps (2014) predate the rebuild for the new baseball and softball fields. |
    | Conn College | Harkness Memorial State Park, Waterford CT | The map has no arrows, and its km labels conflict with Conn's turn-by-turn description. Conn's course-tour videos could settle the order. |
    | North Park | Schiller Woods, Schiller Park IL | The 2024–2025 opener (5K) has no map or description; flat is inferred from the floodplain setting. Its pre-2012 home course, Montrose Harbor, has 2011 CCIW 8K/6K maps but isn't used now. |
- **Where courses come from:** every school has a fixed home course from `S.venueFor`: its real course when `XC.courses.forSchool` has one, otherwise one seeded by school id, with the same name, terrain and layout on every visit.
  - The user's own course is `state.homeCourse = { name, type, seed, courseId?, kind?, custom? }`. New games start on the school's real course. `S.migrate` moves an old save's random home course onto the real one unless `homeCourse.custom` is set, which the Facilities course editor sets. A renamed real course keeps its `courseId` (and trace). `kind` ('loop' or 'point') is passed to `C.generate` for custom courses; generated courses without it are unchanged. Meets already on the schedule keep their stored course, except that course work updates home meets that haven't run.
  - The nationals venue is seeded by its venue name.
  - Old saves' meets without `course.seed` derive one from the name and terrain.
- **Drawing:** the race canvas draws every leg with direction arrows, hill shading and contours, separate start and finish lines, and split markers that merge when laps put them in the same spot. The meet preview shows the SVG map, layout, laps and climbing. Traced courses get a separate route row per squad.

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
- **Weekly mileage** (`T.MILEAGE`, set per runner on the workout screen):
  - **Storage:** each athlete's `a.miles` is a number, or missing for auto (`T.autoMileage`). It's saved with the roster and persists across blocks, so no migration is needed.
  - **Capacity:** `T.mileageCapacity(a) = 30 + (DUR−50) + (END−50)×0.55 + (year−1)×5`, clamped 30–120. Starting rosters land around 50–90, and a durable, fit senior can pass 100.
  - **Fatigue:** mileage changes weekly recovery against the old fixed recovery, which assumed 75% of capacity. `T.weeklyRecovery = recoveryPerWeek − 14 × (share^2.2 − 0.75^2.2)`, so more miles mean less net recovery, and it can go negative. Every block uses it: `T.dayFatigue`, the preview, `T.runDay` and `T.restBlock`. Injured runners count as usual (cross-training).
  - **Fitness:** `T.mileageShare` is 0 below 40% of capacity, 1 at 75% and about 1.44 at 100%, with diminishing returns. Each block it moves form by `share − 1` and adds XP per week: END 0.07, DUR 0.03, scaled by share, potential and day fatigue.
  - **Injury:** overuse risk per week is `0.03 × max(0, share − 0.85)^1.5 × (1 + (fatigue/40)²) × (1.45 − DUR/100)`, compounded over the block's weeks. It's added to the preview's injury risk.
  - **Conditioning:** `a.base` is the miles a week a runner has recently run. It's saved and migrated, and `T.baseOf` defaults to 75% of capacity.
    - Each week it closes 15% of the gap to the miles actually run (`T.condition`). Injured runners drift toward half their base.
    - `T.startSeason` keeps 60% of the distance from the usual share over the summer.
    - Trained capacity is `T.trainedCapacity = capacity × (0.775 + 0.3 × min(1.2, base/capacity))`: neutral at 75%, about +10% when built up to capacity, and 22.5% less when fully detrained. Fatigue, fitness and the 85% threshold all use trained capacity.
  - **Jump risk:** above 110% of conditioning, weekly risk adds `0.04 × (miles/base − 1.1)^1.5`, under the same fatigue and DUR factors. It applies even under capacity.
  - **Auto:** about 0.79 of trained capacity, ±0.003 per DUR point from 70 (clamped 0.70–0.86). It's cut by a quarter in a 1-week block, lowered above 35 fatigue, and never above `base × 1.15 + 5`.
  - **Conditioning sim** (100 seasons): ramping +10% a block up to 105% of capacity scored 0.305, the best; auto 0.307. Jumping straight to 105% scored 0.346 with twice the injuries. Doubling recent miles each block scored 0.634.
  - **Balance** (`t-mileage` sim, 100 seasons of auto workouts, place percentile, lower is better):
    - auto 0.307, 65% 0.320, 75% 0.309, 85% 0.304, 90% 0.312.
    - 50% and 100% of capacity both 0.361, 120% 0.478, zero miles 0.377.
    - 100 miles for everyone 0.547, with about 11 injuries a season.
    - Re-run this after changing mileage numbers.
- **Plan state:** `state.training = { meetIndex, done, plans: { [sq]: { groups, assign } }, report }`. `assign[id]` is `{ mode: 'group', group }`, `{ mode: 'custom', workout }` or `{ mode: 'rest' }`.
- **Facility hooks:** `state.facilities.trainingRoom` and `state.facilities.track` add bonuses (`T.recoveryPerWeek`, `T.sessionBonus`). `ROADMAP.md` covers real home courses and the 3D view.

## Difficulty (`difficulty.js`) and scouting recruiting (`scouting.js`, `ui/recruit.js`)
- **Choosing:** the setup screen has a Difficulty picker (Easy, Medium, Hard) with a short description, and on Medium a Recruiting choice (Wheel or Scouting). `S.newGame({ ..., difficulty, recruitMode })` saves `state.difficulty` and `state.recruitMode`. It's fixed for the dynasty and shown in Settings. Old saves are Easy, which is how the game played before.
- **What each level shows** (`D.shows(state, key)`; UI code checks these, never the level name):
  - `dosePct`: Easy only. Medium and Hard keep the zone labels ("On target") but no percentages: projections, group notes ("3 on target, 1 overreach"), the report, and the texts' workout hint.
  - `condition` (fatigue, form, morale, injury risk): Easy and Medium. Hard hides the fatigue meters and numbers, the FTG column, the meet preview's Form/Fatigue columns and worn-out notice, the runner-plan fatigue, the texts' fatigue and team-morale panel, and the roster card's fatigue/form/morale. Instead, on Hard every block up to two runners at 32+ fatigue text "my legs are dead" on top of the usual texts.
  - `autoPlan`: Easy and Medium. Hard has no Auto plan, Staff plan or head-coach Suggest (the functions and the A key check it too); "Staff suggestion" stays when an assistant is signed. `T.ensurePlans` uses `T.manualPlan` on Hard: one "Group A" on a standard threshold session and everyone on a recovery run.
  - `ovrInEmails`: Easy and Medium. Hard's recruit emails carry PRs only.
- **Recruit quality** (`D.range`, `D.ovrAt`): Easy keeps `S.repWindow` (a 20-point window that slides up with rep). Medium draws from 50 to `62 + 0.37 × rep` (cap 99), Hard from 48 to `60 + 0.37 × rep`, so reputation only raises the ceiling. Quantiles are skewed low (`q^1.6` Medium, `q^1.75` Hard). On the wheel each segment covers a band of quantiles (`D.wheelOvr`: blue chip 0.65–1, walk-on 0–0.35…).
  - Medium wheel at rep 100: average 66, 9% of recruits 85+ (about a coin flip for one elite recruit a year).
- **Hard's other costs:** offseason growth ×0.85 (`A.progress(a, rng, mult)`) and positive rep gains ×0.85.
- **Scouting** (Medium by choice, Hard always; `D.recruitMode`). The hub's preseason tile opens the Recruiting inbox (`XC.screens.recruit`); the wheel redirects there.
  - `SC.ensure(state, sq)` fills the inbox once per preseason: Medium 8 and Hard 6 emails, plus up to 4 more with a better scout (`SC.power` = 0.25 + 0.75 × best assistant's rating).
    - Quality: `D.ovrAt(state, q, SC.EXTRA_SKEW = 0.8)`, with q tilted up by scouting (`1 − (1 − U)^(1 + 0.3 × power)`). The pool is thinner at the top than the wheel's because the coach picks who to visit from the whole inbox.
    - 15% are transfers (year 2–3). Prospects use `A.create` and get a look, like wheel recruits, and live in `rec.prospects` with `p.scout = { interest, prs, school, major, variant, report, decision, otherSchool }`.
  - **PRs** (`SC.prsFor`): from `R.baseTime(ovr)` by Riegel-style conversions: 5K XC, 3200 and 1600 for high schoolers; 8K/6K XC, 5000 and 1500 for transfers. Speed shifts the 1600, endurance the 5K, with ±0.8% noise. An 80-OVR man runs about 4:29 / 9:32 / 15:49; a 51 about 4:57 / 10:38 / 17:55.
  - **Emails** are built in `ui/recruit.js` from the saved facts (subject by interest, three body variants, a transfer variant). Most A-potential recruits add a line about only running seriously for two years.
  - **Scouting reports** (`SC.scoutReport`; 2 plus 2 per signed assistant): potential, best and weakest rating, interest, and on Hard an OVR range `8 − 6.5 × scout quality` wide.
  - **Visits** (`SC.visit`; Medium 6, Hard 5 per squad; need an open roster spot): commit chance = interest + 0.08 × best assistant's rating, clamped 0.05–0.95. Interest = `0.62 + (rep/100 − (ovr − 50)/40) × 0.9` + facilities + noise (Hard −0.08). An 80-OVR recruit commits about 25% of visits at rep 30, 53% at rep 60 and 82% at rep 90. A no names the rival school they chose.
  - `S.finishRecruiting` adds committed recruits (dropping `p.scout`) as with the wheel.
- **Balance** (`diffsim`, 12 eight-season dynasties each, auto plans on every level standing in for good planning; average finish, team OVR after 8 years, rep):
  - Easy wheel 0.083, 95, 95.
  - Medium wheel 0.16, 83, 89; Medium scouting 0.15, 84, 91.
  - Hard scouting 0.33, 71.5, 59.
  - Re-run after changing recruit ranges, skews, visit odds or Hard's multipliers.

## Facilities and the fund (`facilities.js`, `ui/facilities.js`)
- **State:** `state.funds` (thousands of dollars; new games and migrated saves start at `F.START_FUNDS`, 60), `state.facilities = { trainingRoom, track, spectators, championship }`, and `state.lastPayout = { year, total, lines }`.
- **Payout:** `F.collect` runs in `S.beginOffseason` and adds `F.payout(entry)`: base 30, `0.4 × rep`, `1.5 ×` rep gained, and per squad conference title 15, regional title 15, national title 40 (or podium 20, or team at nationals 8), 3 per All-American. Capped at `F.PAYOUT_CAP` (180), shown as an "Athletic department limit" line. The recap previews it. Staff salaries stay on the separate staff budget.
- **Upgrades** (`F.ITEMS`, three levels each):
  - Training room 90/160/250: +1.5 fatigue recovered per week per level.
  - Track 80/140/220: VO2 max sessions +5% benefit per level.
  - Spectator areas 40/70/110: +0.4 rep per level for each squad's race at a home meet (`F.homeRep`, added in `S.runMeet`).
  - Championship grade, 250 once: you host the conference meet 50% of the time instead of 20% (`F.confHostChance` in `S.buildSchedule`).
- **Course editor:** rename for free (`F.rename`, 40 characters). New terrain, a new layout (fresh seed) or a fixed kind costs `F.COURSE_WORK` (25) via `F.build`, sets `custom`, and moves unrun home meets onto it. Schools with a real course can restore it the same way. The screen keeps a draft and previews it with `ui.courseMap` before you pay.
- **When:** everything is bought in `F.OPEN_PHASES` (graduation through preseason), the same window as staff hiring. Every action checks `F.blocker` itself.
- **Balance:**
  - `facsim` (8-season dynasties, 16 runs): payouts average about $85k in season 1, rising to the $180k cap by season 7. Buying the cheapest upgrade each offseason maxed spectators by about season 4, the track by about 7, and the training room in half the runs by season 8.
  - `facone` (200 first seasons, place percentile): none 0.260, training room 3 0.258, track 3 0.257, both 0.255 (fewer workout injuries, slightly more growth), spectators 3 adds about 1.7 rep a season.
  - Re-run both after changing facility numbers.

## Runner texts (`texts.js`, `ui/texts.js`)
- **When:** `T.openBlock` calls `XC.texts.roll`, so texts arrive as each workout block opens (season start and after every meet). `S.runMeet` calls `XC.texts.expire` first: unanswered texts expire and cost that runner 0.5 morale. `S.startNewSeason` clears the inbox.
- **State:** `state.inbox = [{ id, athleteId, squad, templateId, variant, vars, workout?, replied, note, expired? }]`. Each roll replaces the inbox, so it only holds the current block.
- **Rolling** (per squad, per block):
  - A 30% chance one healthy runner gets the flu (`a.illness = 'flu'`, 1–2 weeks) and texts about it. Illness is an injury with a label: `A.outWord(a)` gives "Sick" or "Injured", and `illness` clears when `injury` reaches 0 (in `applyToRoster`, a reply, or the offseason).
  - Then 1–3 texts in all (at most `X.MAX_PER_SQUAD`), one per runner, drawn by per-runner weights from `X.TEMPLATES`: tired (fatigue after the meet ≥ 25), request (their favorite workout type at 1.3× target dose, via `T.recommend(..., { type, push })`), PR, bad race (finished ≥ 2 places below their OVR rank on the team, or DNF), injured (uses `a.injuryWhat`, set when an injury happens), homesick (first-years, first three meets), midterms (meets 3–4).
  - About 12 texts per squad per season.
- **Replies:** 2–3 per template, each with `effects` (morale, fatigue, form, injury ±, cure, news, plan) and a `note`. `odds` roll outcomes; `miss` adds effects when no odds hit. `X.blocker` refuses replies that change a plan or cure once the workout day has run.
- **Promises:** a plan reply sets `state.training.promises[athleteId]` (`{ mode: 'rest' }` or `{ mode: 'custom', workout }`). `T.applyPromises` writes them into the plan, and `T.autoPlan` (so `T.ensurePlans`) applies them. The workout screen locks those rows (no menu, no editor), and assign, Suggest and Everyone rests skip them.
- **Morale:** `a.morale`, −5..5, saved and migrated. It keeps 70% of itself each block and resets to 0 in the offseason. Shown on the texts screen, the roster card and the workout row (when |morale| ≥ 1).
- **Screens:** a phone-style inbox per squad with a team-morale panel. The hub has a Texts tile with the unread count, and the workout-day tile and workout screen mention unread texts.
- **Balance** (`textsim`, 200 first seasons per style, place percentile): ignore every text 0.259, always the kindest reply 0.255, random 0.257, always the hardest 0.254. Kind replies rest runners (less training) but lift morale; hard ones keep them training at a morale cost. The stakes are deliberately small.

## Assistant coaches (`staff.js`, `ui/staff.js`)
- **State:** `state.staff = { coaches, pool, trainingQuality }`. One staff serves both squads. A coach is `{ id, first, last, specialty, rating, salary, years, since }`, plus `expiring` and `ask: { salary, years }` once their contract is up. `trainingQuality` is the best signed coach's rating / 100 (0 with none), kept current by `ST.update`. `T.advisorQuality` returns it.
- **Limits:** `ST.SLOTS` (2) assistants. Budget is `30 + 0.7 × rep` thousand dollars a season. Asking salary is `(8 + ((rating−40)/55)^1.6 × 52) × 0.92–1.08`, so about $15k at 55 and $37k at 78. Expiring coaches don't count toward slots or payroll until re-signed. If rep falls, payroll can sit over budget; that only blocks new hires.
- **Pool:** 6 candidates, at least one per specialty, rated 45 up to `ST.poolMax = min(95, 62 + 0.33 × rep)`.
- **When:** hiring, re-signing and letting go are open in `graduation`, `progression`, `cut` and `preseason` (`ST.isOpen`). Every action checks `ST.blocker` itself.
  - New games (and old saves, through `ST.ensure`) start with one assistant rated 52–60 on a one-year deal.
  - `ST.endSeason` (from `S.beginOffseason`): ratings move −1..+3, contracts tick down, a coach at 0 years becomes `expiring` with an ask at 95% of market, and a new pool arrives.
  - `ST.startSeason` (from `S.finishRecruiting`): expiring coaches who weren't re-signed leave.
- **Effects (`training.js`):**
  - Specialty: a session whose type matches a signed coach's specialty gets stimulus × `1 + 0.25 × rating/100` (`T.sessionBonus`, which also holds the track facility bonus).
  - Supervision: workout injury risk × `1 − 0.25 × best rating/100`, in previews and on the day.
  - Reads: `T.recommend(..., { staff: true })` and `T.autoPlan(..., { staff: true })` give the staff's read. Type picking adds 0.9 to the staff's specialties and uses the best coach's quality for the random-type chance; the dose error uses the specialist's quality + 0.08 (max 0.97), or the best coach's. Without `staff` the head coach's read is exact. Staff workouts carry `source: 'staff'` and `coach` (name); editing one clears `coach`.
- **Screens:** the hub's Staff tile, and the preseason tile shows openings or contracts up. The workout screen adds "Staff plan", "Staff suggestion" per group and "Staff" per runner when anyone is signed, and the editor notes the specialist's bonus.
- **Balance** (`season1` sim, 200 first seasons per setup, place percentile, lower is better):
  - No staff 0.263. Two 75-rated coaches with auto plans 0.256 and about 25% fewer workout injuries.
  - The staff's own plans: 0.249 with 90-rated coaches (better than the exact auto plan), 0.267 with 55-rated ones (worse than no staff). That's the intended tradeoff.
  - Re-run it after changing staff numbers.

## Title-screen "What's new" note
- `CHANGELOG` at the top of `js/ui/title.js` is newest first. The first entry shows in the title screen's bottom-right corner, or below the menu on narrow or short screens. The next five sit under a "Past updates" `<details>` toggle.
- With every user-facing release on `main`, add a new entry at the top (date plus one or two plain sentences) and keep the list to six.
- The title screen's `onKey` ignores Enter on the toggle's `<summary>`, so Enter opens it instead of starting a game.

## GroupMe announcements
- `node scripts/announce.js` prints the newest `CHANGELOG` entry as a GroupMe message (a dry run). Add `--send` to post it through the team's GroupMe bot.
- The bot ID is a secret. It lives in `~/.config/d3dynasty/groupme_bot_id` (mode 600) or the `GROUPME_BOT_ID` environment variable, never in the repo. `scripts/` is in `.assetsignore`, so the script isn't served.
- After deploying a user-facing change, show the user the dry-run message and post only once they approve it, unless they've said to post automatically. Notes-only commits get no announcement.

## Hub menu (`ui/hub.js`, `ui/hub-art.js`)
- **Layout:** a wall of blocks modeled on the Madden 16 main menu, in the game's own colors. `.hub-track` scrolls sideways and holds `.hub-grid`, a CSS grid laid out with `grid-template-areas`:
  - **Desktop:** 4 rows. Next up and the snapshot are tall blocks in the first two columns, so both sit in the first view; the depth chart and schedule are under them. Texts and facilities come next, then the trophy case over two small blocks (staff and settings).
  - **Phones (≤600px):** the same areas, one 84cqi column per view, with taller top rows so Next up's button fits.
  - **Short screens (≤560px tall):** 2 rows and 6 columns, showing only two Next up facts.
  - Columns are sized in `cqi` against the track (`container-type: inline-size`). The track fills the height between the header and the legend (`body[data-screen='hub']` is 100dvh, and `main.js` sets `data-screen` on `<body>` for every screen). The menu nav is `display: contents`, so its buttons are grid items.
- **Scrolling:** a vertical mouse wheel over the track scrolls it sideways until it reaches an end. Touch screens (`pointer: coarse`) snap to columns; desktop doesn't, because snapping fights the wheel. `overscroll-behavior-x: contain`. The edges fade where there's more to see: a mask driven by a scroll-driven animation, or `more-start`/`more-end` classes from an IntersectionObserver on 1px edge markers where `animation-timeline` isn't supported.
- **Keys:** arrow keys move to the nearest block in that direction from the blocks' on-screen boxes (`spatialMove`, following the `spatial-navigation` guide), then scroll it into view. At an edge the key does nothing instead of wrapping. D and S still open the depth chart and schedule; Enter starts Next up.
- **Blocks:** each menu block is a button with art on the right (`.art`, faded in from the left by a mask), its title top left and a note bottom left. At rest the art is dimmed and desaturated over a team-color wash; on hover or keyboard focus the block fills with `--team-ink` and the art goes full color.
- **Art (`XC.hubArt`):** each builder returns `{ el, enter?, leave? }`. `wireArt` calls `enter` on pointerenter or keyboard focus and `leave` once the block is neither hovered nor focused. Animations are CSS on `button.hub-tile:is(:hover, :focus-visible)`, inside `@media (prefers-reduced-motion: no-preference)`, so they restart each time and stay still with reduced motion.
  - Depth chart: a random rostered runner (photo or look), a different one on every hover, named in the note; the photo slowly zooms.
  - Schedule: a tear-off calendar showing the next meet's date. Each `animationiteration` of the top page advances a day; it resets on leave.
  - Texts: a phone with the unread count that lights up and buzzes, with bubbles and emoji floating off it. The bubbles come from the inbox's text types (`SNIPPETS`).
  - Facilities: a cartoon weight room (squat racks with team banners and loaded barbells, turf with yard lines) that pulses.
  - Trophy case: cups, medals on team ribbons and a plaque that glow, with a shine across the glass.
  - Staff: signed coaches, then the hiring pool, cycling every 1.1 s while hovered. Coaches get a seeded look (`coach|id`) in a quarter zip.
  - Settings: two meshing gears that turn.
- **Testing:** Puppeteer's clipped screenshots (with the default `captureBeyondViewport`) resize the page and leave hit-testing stale, so later mouse moves land on the wrong block. Pass `captureBeyondViewport: false`.

## Dark mode
- **Setting:** `settings.theme` is `'system'` (the default: follow the device), `'light'` or `'dark'`, saved with the other settings. `XC.storage.loadSettings` turns the old `dark` flag into a theme (on → `'dark'`, off → `'system'`).
  - `ui.applyTheme(theme)` sets `data-theme` on `<html>` to `light` or `dark`, resolving `'system'` with `ui.darkQuery` (`prefers-color-scheme: dark`). `ui/common.js` applies the saved theme as soon as it loads, so there's no flash. `main.js` (`watchTheme`) follows device changes while on `'system'` and theme changes saved in another tab (`storage` event).
  - **Header chip** ("Dark mode on/off", next to Sound and Announcer, `XC.settings.toggleDark`): flips what's on screen. Flipping to what the device already uses stores `'system'` instead of pinning it (the modern-web-guidance `dark-mode-toggle` rule), so a pinned theme only comes from a deliberate choice.
  - **Settings, Theme row:** System (shows the device's current scheme), Light, Dark (`XC.settings.setTheme`).
  - `index.html` has `<meta name="color-scheme" content="light dark">`.
- **How the CSS works:** `:root[data-theme='dark']` redefines tokens (`light-dark()` can't be used: `--paper` and `--ink-rgb` are RGB triplets).
  - `--ink`, `--ink-2` and `--ink-3` stay surface colors (header bars, dark cards). Text uses `--text-strong`, `--text-body`, `--text-muted` and `--text-faint`; never use `--ink` as a `color` in new CSS.
  - Light surfaces are `rgb(var(--paper) / alpha)` and `var(--paper-2)`; separators and dark-ink tints are `rgb(var(--ink-rgb) / alpha)`. Both flip in dark mode. Use these instead of literal `#FFFFFF` or `rgba(255, 255, 255, x)` for anything that should go dark.
  - Status text uses `--good-text` and `--bad-text` (lighter in dark mode); `--good` and `--bad` stay the badge backgrounds.
  - Team colors are set inline by `ui.setTheme`, which CSS can't override, so team-colored text goes through `--team-text` (`--team-ink` in light, `--team-hi-on-dark` in dark).
  - The course map, avatars' team tops and crests keep their own colors. A short "Dark mode touch-ups" block covers spots the tokens alone didn't fix (text bubbles, reply chips, color swatches).
- **Check:** screenshot every screen in both modes at 1440×900 and 390×844 after styling changes.

## Mobile
- At 600px wide or less, and on touch screens, the legend bar becomes a row of real buttons. It holds the only Back control on several screens, so it must never be hidden.
- Touch screens (`hover: none` and `pointer: coarse`) hide keycap hints, `keyboardOnly` legend items and "Press Enter". The squad bumpers show ‹ › instead of Q/E.
- On short screens (max-height 500px, i.e. phones held sideways), the header tightens and the news ticker hides. The race canvas keeps at least 200px of height.
- `body` uses `100dvh`. Check new screens at 390×844 and 844×390 for horizontal overflow.

## Play tester feedback (addressed)
- **"Space then A on the wheel crashes it":** the shortcuts bypassed the disabled buttons, and Spin all looped without yielding a frame. The fix is on both branches.
- **"8×1K at 3K with 45″ rest should cook my guy more" and "40 min at 10K feels like a lot":** this led to the time-to-exhaustion strain model and the narrower capacity range. Both sessions are now "Too much" even for strong runners.
- **"The race shows the final score before the gun":** this led to the race-view placeholder. It's fixed on `main` only.

## 3D race view prototype (`proto/`)
- **What it is:** a standalone page, `proto/runners-3d.html`, testing a 3D race view. It isn't part of the game: nothing in `index.html` or `js/` loads it, and deploys skip it.
  - Runners are built in code from primitives, with a coded run cycle and real UAA colors.
  - It races the real SIUE course: USGS lidar terrain, a USGS/NAIP aerial photo, trees planted from the photo, and WashU's trace placed on the ground by three landmarks. A made-up demo loop is also available.
- **Details:** `PROTOTYPE_3D.md` has the files, controls, data sources, the landmark fit, how to rebuild (`node proto/tools/build-siue.js`) and the known bugs. ROADMAP.md, "3D race view", has the plan for merging it into the game.
- **Known bugs, noted for later:**
  - Runners spin in circles at some sharp turns.
  - Traced legs that share ground draw overlapping trails. The user's fix: merge any stretch run more than once into a single trail.
- **Rules that still apply:** classic scripts only (Three.js r149 is saved in `proto/vendor/`), works from `file://`, and no Google imagery or tiles.
  - A real course's photo has to be a data URL, because WebGL won't use a `file://` image as a texture.

## Testing
No test files are in the repo. Re-create scripts like these in the scratchpad rather than adding dependencies; `puppeteer-core` drives the installed Chrome at `/Applications/Google Chrome.app`.
- **Engine (node):**
  - A 20-season headless run checks scoring, caps and graduation.
  - A course stress test generates 600 courses, checks crossings and clearance, climb ranges and spans, and renders a contact sheet.
  - A course data check: every `homeOf` entry points to a real school and course, every course has source URLs and a confidence level, traces reference real legs, stay in frame and have men's/women's lengths near 8:6. Generated courses still pass `C.isClear`.
  - A traced-course contact sheet renders `ui.courseMap` for each traced course in headless Chrome. Compare it by eye against the source map: shape, start and finish, laps, arrow direction.
  - After changing `course.js`, snapshot 300 generated layouts before and after. Seeds must still give the same routes, hills and climb, since saves rely on them.
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
- Run the same checks against the live URLs after deploying, mainly https://d3dynasty.com. Add a `?v=` cache-buster to the URL; Cloudflare can briefly serve stale HTML right after a deploy.
- macOS has no `timeout`. Use `perl -e 'alarm N; exec @ARGV' node script.js` to cap a run that might hang.

## Known judgment calls
- 143 real D3 programs plus a custom-school builder. Colors are approximate.
- **Hometowns (`data/places.js`):** randomuser.me pairs real city names with random states, so only names come from it. `XC.places.hometown(rng, school)` picks a real town: 4% international (mostly Canada and the British Isles), otherwise a state weighted by population × `0.06 + exp(−km/450)` from the school. `S.migrate` swaps any hometown that fails `XC.places.isReal` for a seeded pick.
- **Portraits:** `ui.portrait(a, size)` shows a real athlete's photo, a generated runner's look as an SVG avatar (`portrait--avatar`), or the silhouette for a real athlete with no photo (Lukas Keane). Sizes: `sm` 56, default 96, `lg` 132, `xl` 220. randomuser.me is asked for names only (`inc=name`). `S.migrate` clears old randomuser.me photo URLs from rosters, recruiting and graduates.
- **Looks (`looks.js`, `ui/avatar.js`, `ui/look.js`):** an original cartoon avatar style built from parts. Don't copy any existing game's avatar art.
  - **Version 2 (2026-11-16) is modeled on real headshots.** A research agent studied 100 public 2025–26 roster headshots: 5 men and 5 women from each of Middlebury, Chicago, Kenyon, Pomona-Pitzer, Vassar, UW-La Crosse, Johns Hopkins, North Central, Washington and Lee and SUNY Geneseo (10 conferences). It measured proportions (face landmarks plus hand measurements), sampled skin and hair pixels, and tallied hairstyles, facial hair, accessories, expressions and tops. Only aggregate numbers were kept, the photos were deleted, and no individual is described anywhere.
  - **What it found, and what the generator uses:**
    - Men: textured fringe crop 22%, side part 14%, curls on top with faded sides 14%, flow 12%, taper 10%, messy 10%, curly mop 6%, curtain part 6%, shag 4%, afro 2%. Buzz, crew, shaved and top knot are rare.
    - Women: 92% wear their hair down: long middle part about 52% (straight and wavy), side part 15%, shoulder length 12%, curls 10%, tucked behind an ear 6%. Ponytails and buns are 5% combined.
    - Big teeth smiles: men 64%, women 88% (the eyes squint into "smiling eyes"). No facial hair for 84% of men. Glasses 6% of men and 2% of women. A necklace on 44% of women and 12% of men, earrings on 16% of women. Head tilt on about 30% of women.
    - Skin reads warm and a little pink: the nine tones are measured cheek colors, weighted by the measured shares (men a little tanner). Hair colors are measured bases, nudged for a cartoon. Brows render darker than blond hair.
  - **Layout (100×100):** hairline y 24, eyes y 43.5 and 15.5 apart, brows y 38, nose base y 54, mouth y 60, chin y 74, face 40 wide. Neck by build: slim 22, medium 24.5, broad 27, with tendons, a chin shadow and collarbones. Shoulders run off the frame in a singlet (scoop neck and straps), quarter zip or tee. Long hair falls in front of the shoulders.
  - `a.look = { v: 2, skin, face, build, hair, hairColor, eyes, eyeColor, brows, nose, mouth, facial, glasses, marks, jewelry, gear, top, tilt }`, every value an option id in `XC.looks` (9 skin tones, 28 hairstyles, 13 hair colors, 5 face shapes, 3 builds, 6 eyes, 6 eye colors, 7 brows, 5 noses, 5 mouths, 5 facial hair, 5 glasses, 4 face details, 5 jewelry, 3 headwear, 3 tops, 3 tilts). Option weights are `M`/`W` per squad or `w` for both; every option is open to everyone in the editor.
  - `L.generate(id, sq)` is seeded by the athlete's id (`look2|id`), so a look never changes on its own.
  - `L.ensure(a, sq)` gives generated runners a look and never touches `a.real` athletes. It runs in `startingRoster`, `S.makeProspect` and `S.migrate`; graduates copy `look` and `real` into their snapshot.
    - Version 1 looks that nobody edited (they still equal `L.legacyGenerate(id, sq)`, an exact copy of the old generator) are replaced with version 2. Edited ones keep every choice and get seeded values for the new fields. Keep `legacyGenerate` until old saves no longer matter.
  - The top uses the team colors through the CSS classes `avatar__jersey`, `avatar__trim`, `avatar__trim-line`, `avatar__collar` and `avatar__zip`. Skin, hair and eye colors are SVG fill attributes.
  - **Drawing rules:**
    - Short styles build on the shared `crown()`: an outer outline, a hairline at y ≈ 24.5, and a `cap` (the outline drawn behind the head) so no background shows between hair and any face shape. Fringes and tufts must overlap the crown, or a strip of forehead shows.
    - Long styles use curtains from the part down past the chin, drawn after the top, plus a darker back layer. `ears` is 'both', 'left', 'right' or 'none'.
    - Hair layers get a 0.5 outline in the hair color to close seams. Texture strokes are darker; highlights (sun-lightened) are lighter.
    - Faded sides (taper, curls on top) and the buzz cut blend the hair color toward the skin.
    - Stubble is clipped to the face and the beard to the face scaled 1.15 (`clipPath` ids are unique per avatar). The beard's inner edge stays inside every face shape.
    - A faint sun flush on the cheeks and nose, scaled down on deeper skin so it never reads as a patch. "Rosy cheeks" is the stronger version.
    - Head tilt rotates the head and hair around (50, 82); the neck and top stay put.
  - When adding a hairstyle or face shape, render every hairstyle × face shape at 100px and at 200px and look for skin or background showing between hair and head.
  - The look editor (`XC.screens.look`, params `{ id, back }`) opens from the roster card's "Edit look" button, which real athletes don't get. Stepper rows and color swatches save on every change; "Surprise me" (R) rolls a random look and "Original look" restores the seeded one.
- **Logos:** 71 programs use a real athletics logo from Wikimedia Commons in `img/logos/` (listed in `js/data/logos.js`, sources in `img/logos/SOURCES.md`). The other 72 keep generated monograms.
  - Every file is public domain on Commons (a logo too simple for copyright) but is still the school's trademark. The user accepted that risk for `main`; keep logos off `grading`.
  - Only athletics marks and bold athletic wordmarks were used. Thin university text logos, seals, and wordmarks wider than about 3:1 were skipped because they're unreadable in the 34px context-bar crest.
  - Commons rate-limits hard (HTTP 429). Batch API calls 50 titles at a time, and use the `thumburl` renders, which download more reliably than originals.
  - SVGs are the Commons originals. PNGs are about 256–320 px wide renders. `alma` is a PNG because its SVG is 1.2 MB.
  - A logo whose artwork hits the shield's narrowing bottom can be shrunk with `[ext, scale]` in `LOGOS` (Middlebury uses 0.84).
- Long dynasties can snowball toward 95+ team OVR. The stronger rep decay above 80 is the only brake, and in-season training adds about half an OVR point per season.
- One workout day stands for each training block. Gap weeks only change recovery.
- On a phone the workout screen is long (one card per runner). A collapsible runner list is a possible improvement.
