# D3 Dynasty: Project Notes

D3 Dynasty is a Division III cross country coaching game in plain HTML, CSS and JS. It started as the **Website #2** class assignment. The rubric is at `../.claude/skills/custom-skills/Website2.md` and the design guidance at `../.claude/skills/custom-skills/SKILL.md`. `GRADING.md` points the grader to each rubric item. Its line numbers are only accurate on the `grading` branch.

## Branches and deployment
- **`grading`:** a frozen snapshot for the grader, served by GitHub Pages at https://maxsudz23.github.io/D3-Dynasty/. Commit to it only when the user explicitly asks for a specific fix there. Apply that fix alone (for example, check out `grading` in a separate git worktree and apply a patch), keep it within the rubric, and update the `GRADING.md` line numbers it shifts.
  - So far `grading` has two fixes on top of the original game: the favicon and the wheel freeze fix.
  - The user chose to leave the race-score leak fix off `grading`.
- **`main`:** all ongoing work. It deploys to a Cloudflare Worker named `d3-dynasty`.
  - The public URL is https://d3dynasty.com, and https://www.d3dynasty.com serves the same site. The domain's DNS is on Cloudflare.
  - Both are attached as custom domains in the `routes` of `wrangler.jsonc`, so `npx wrangler deploy` keeps them attached. Don't remove those entries.
  - https://d3-dynasty.maxsudrzynski.workers.dev stays on (`workers_dev: true`). Wrangler turns it off by default when routes are set.
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
- **Engine** (pure, testable in node with `global.window = global`): `util.js`, `data/schools.js`, `data/logos.js`, `data/names.js`, `data/places.js`, `data/courses.js`, `athletes.js`, `race.js`, `course.js`, `training.js`, `api.js`, `season.js`.
- **UI:** `ui/common.js` holds the theme, crest, portraits, chrome, toasts and confirm dialog.
  - `ui.setTheme(primary, accent, school)` also sets `--team-logo` to the school's logo (absolute URL), or `none`. `body::before` draws it at 10% opacity over the background stripes. Schools without a logo and custom schools show nothing. Pass the school wherever a real school's theme is applied.
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
  - `S.migrate(state)` runs on every load and fills in fields older saves lack: `homeCourse`, `training`, `squad.plans` (also pruned of runners who left), and athlete `fatigue`/`form`.
  - New saved fields must be added there.
- **Phases:** `preseason` (recruiting wheel) → `season` (`meetIndex` 0–5, each meet preceded by a workout day in `state.training`) → `recap` → `graduation` → `progression` → `cut` → `S.startNewSeason` → `preseason`. `S.runMeet` saves results before the race animation plays, so reloading can't reroll a race.

## Game rules (in `season.js`, `athletes.js`, `race.js`)
- Ratings are SPD, END, HIL, KCK, IQ, DUR and MNT. OVR weights END at 0.3, SPD at 0.2 and the others at 0.1 each, capped at 99. Potential grades A–D set offseason growth.
- The starting roster is 12 runners per squad, rated 50–90. The roster cap is 20 and the cut minimum is 5. Seniors graduate automatically.
- **Real rosters (`js/data/rosters.js`):** WashU's 2026 men's and women's rosters, used with the team's permission. At the team's request, each squad includes its top 20 by season best plus anyone outside it who asked to be in. On the men's side that's Sun, Buckman, Donner, Fleck, Newkirk, Roach, Shadaksharappa, Crossland and Proffitt, for 29 men and 20 women. The rest of the roster isn't in the game or the file, which is public on the site. They're listed in `HIDDEN_ROSTER.md` (not served), with a ready-made row each. Add someone back only if they want to be in the game. A new save as WashU starts with the real roster for each squad it fields, instead of a generated one, and skips the randomuser download.
  - Names, class years and hometowns come from washubears.com.
  - OVR comes from each runner's 2026 season-best mark, supplied by the team (men 8K, women 6K), through `S.ovrFromMark`. It uses the race model's seconds per point (6.73 for 8K, 5.2 for 6K), anchored so 24:20 (men) and 21:25 (women) are a 90, clamped 40–95.
  - That gives team OVRs of 86 (men) and 84 (women), against tier-1 opponents' average of 83. The 20th-best marks are 26:28.0 (men) and 23:46.7 (women).
  - The individual ratings around the OVR, and potential, are seeded by name, so every save gets the same team.
  - `realRoster` still supports rows with no mark (a seeded rating a little below the class average, 58/62/66/69, SD 4), but the current top-20 rows all have marks.
  - Real PRs aren't copied into `a.pr`, because the game's race times run on their own scale.
  - **Starting injuries:** `XC.rosters.washu.injuries` sets meets out at the start of a new save (a season is 6 meets). Rishi Shadaksharappa and Jackson Proffitt start out 6, miss year one, and are back for season two.
    - Rishi's mark is his freshman (2025) 8K PR from TFRRS, 25:23.7 (81 OVR), not his 2026 time.
    - Jackson has no college mark. His high school 5K (15:28.4) is converted to an 8K by Riegel's formula (`t8 = t5 × 1.6^1.06`), 25:27.9, which is 80 OVR.
    - A season out also slows their first offseason growth (`A.progress` × 0.6 after 3+ missed meets).
  - **TFRRS ratings** (everyone past their first year): `XC.rosters.washu.tfrrs` holds each runner's TFRRS college bests: `xc` (8K men / 6K women PR), `m800`, `m1500`, `mile`, `m5000`, `m10000`. First-years haven't run college track, so they stay on their season best alone.
    - **OVR (`S.realOvr`):** 50% the 2026 season best, 30% the TFRRS XC PR, and 20% the best track 5000/10,000 converted to an XC equivalent (`t × (xc/d)^1.06 × 1.03`). Missing parts are dropped and the weights renormalized. The result goes through `S.ovrFromMark`.
    - **Speed and kick (`S.shapeFromTrack`):** SPD comes from the average 1500 equivalent of the 1500, mile × 0.928 and 800 × 2.05. Men are 90 at 3:54 (0.8 s per point), women 90 at 4:52 (1.15 s). KCK comes from the 800: men 88 at 1:56 (1.5 points per second), women 88 at 2:18 (1.3). END, then the other ratings, are then adjusted until OVR equals the target.
    - Rishi and Calvin keep the PR-based row marks they were given. Hand-set ratings (Freddie, Mateo) apply on top.
  - **Hand-set ratings:** `XC.rosters.washu.ratings` overrides generated ratings by name. For now that's Freddie van der Velden at SPD 85 and KCK 90, which makes him 78 OVR. Mateo Gros-Slovinsky is at SPD 85 and KCK 93. OVR is recomputed afterward. Each set is applied once per athlete, remembered in `a.setRatings`, at creation and in `S.migrate`, so existing saves get it and later training isn't undone.
  - **Photos:** the men's headshots come from the washubears.com roster page and are hosted in `img/roster/washu/m/*.webp` (400×600, about 1.5 MB in all). They're mapped by name in `XC.rosters.washu.photos.M`.
    - Only runners in the game get one. Lukas Keane has no roster photo, so he keeps the sketch, and so do the women for now.
    - `S.migrate` fills in photos for real athletes in older saves.
    - `.portrait` uses `object-position: 50% 12%`, so the taller headshots crop to the face.
  - Real athletes carry `a.real = true`, and `S.migrate` leaves their hometowns alone (it would otherwise swap any town missing from `data/places.js`).
  - The limit is `S.rosterCap(state, sq)`: the real roster size plus `S.REAL_ROSTER_ROOM` (5), stored in `state.rosterCap`. That makes 34 men and 25 women, so year one still has a recruiting class. Use `S.rosterCap`, never `S.ROSTER_CAP`, anywhere a limit is checked or shown.
  - To update the rosters, re-pull both roster pages, convert hometowns to "City, ST", and keep any site typos fixed (the site lists "Inclince Village" for Incline Village, NV).
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
- **JV races (invitationals only):** `S.hasJV(meet)` is true for `type === 'invite'`.
  - **Your JV:** every healthy runner outside the top seven (`S.jvRunners`). A squad with no reserves skips its JV race.
  - **Opponents' JV:** seven seeded runners per field school, about 9 under its varsity strength (`S.oppJV`, keyed `school|squad|season|jv`).
  - **Running it:** both fields are set before either race. JV results live in `meet.jv[sq]` (marked `jv: true`), and `meet.results[sq]` stays varsity-only, so the hub and schedule are unchanged. The JV races are appended after the varsity races in the race view.
  - **Effects:** `applyToRoster(state, meet, sq, races)` applies fatigue, injury risk, race counts and PRs to JV racers too. Career best, wins, top 10, All-American, rep and invite wins are varsity-only. A JV team win makes a news line.
  - **Names:** `S.raceNames` builds them from the host's colors via `U.colorName` (Red, Maroon, Navy, Gold…), e.g. "Red Race" (varsity) and "Green Race" (JV). If both colors give the same name (NYU, Illinois Wesleyan, Dickinson, Kenyon), they fall back to "Varsity Race" and "JV Race".
  - **Screens:** the meet preview shows both names and how many will run JV. The results screen toggles between the two races, and JV shows no rep.
- **Race injury risk:** `(0.008 + (100 − DUR)/100 × 0.035) × (0.7 + (fatigue/40)²)`. Each race adds `12 + (100 − DUR) × 0.06` fatigue.
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
    - **Wheaton (IL) and North Central** (CCIW) share the traced St. James Farm.
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

  - **Venues found but not traced:** in `data/courses.js` with real name, terrain and sources but no `trace`, so the layout is generated. Trace them when a usable map turns up.

    | School | Venue | Why no trace |
    |---|---|---|
    | Williams | Mt. Greylock XC Loops, Williamstown MA | No map: the 2008 map images return 404 with no archive, and the team site is behind a Cloudflare challenge. |
    | Colby | Quarry Road Trails, Waterville ME | No race map or lap structure, so even loop or point-to-point is unknown. No home meet since a 2022 dual. |
    | Hamilton | Hamilton College XC Course, Clinton NY | The only maps (2014) predate the rebuild for the new baseball and softball fields. |
    | Conn College | Harkness Memorial State Park, Waterford CT | The map has no arrows, and its km labels conflict with Conn's turn-by-turn description. Conn's course-tour videos could settle the order. |
- **Where courses come from:** every school has a fixed home course from `S.venueFor`: its real course when `XC.courses.forSchool` has one, otherwise one seeded by school id, with the same name, terrain and layout on every visit.
  - The user's own course is `state.homeCourse = { name, type, seed, courseId? }`. New games start on the school's real course. `S.migrate` moves an old save's random home course onto the real one unless `homeCourse.custom` is set, which the planned course editor should set. Meets already on the schedule keep their stored course.
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
- **Future hooks:** `T.advisorQuality(state)` reads `state.staff.trainingQuality` (assistant coaches), and staff suggestions carry `source: 'staff'`. `state.facilities.trainingRoom` and `state.facilities.track` add bonuses. `ROADMAP.md` covers the planned texts, assistant coaches, facilities and real home courses.

## Title-screen "What's new" note
- `CHANGELOG` at the top of `js/ui/title.js` is newest first. The first entry shows in the title screen's bottom-right corner, or below the menu on narrow or short screens. The next five sit under a "Past updates" `<details>` toggle.
- With every user-facing release on `main`, add a new entry at the top (date plus one or two plain sentences) and keep the list to six.
- The title screen's `onKey` ignores Enter on the toggle's `<summary>`, so Enter opens it instead of starting a game.

## GroupMe announcements
- `node scripts/announce.js` prints the newest `CHANGELOG` entry as a GroupMe message (a dry run). Add `--send` to post it through the team's GroupMe bot.
- The bot ID is a secret. It lives in `~/.config/d3dynasty/groupme_bot_id` (mode 600) or the `GROUPME_BOT_ID` environment variable, never in the repo. `scripts/` is in `.assetsignore`, so the script isn't served.
- After deploying a user-facing change, show the user the dry-run message and post only once they approve it, unless they've said to post automatically. Notes-only commits get no announcement.

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
- **Hometowns (`data/places.js`):** randomuser.me pairs real city names with random states, so only names and photos come from it. `XC.places.hometown(rng, school)` picks a real town: 4% international (mostly Canada and the British Isles), otherwise a state weighted by population × `0.06 + exp(−km/450)` from the school. `S.migrate` swaps any hometown that fails `XC.places.isReal` for a seeded pick.
- **Logos:** 71 programs use a real athletics logo from Wikimedia Commons in `img/logos/` (listed in `js/data/logos.js`, sources in `img/logos/SOURCES.md`). The other 72 keep generated monograms.
  - Every file is public domain on Commons (a logo too simple for copyright) but is still the school's trademark. The user accepted that risk for `main`; keep logos off `grading`.
  - Only athletics marks and bold athletic wordmarks were used. Thin university text logos, seals, and wordmarks wider than about 3:1 were skipped because they're unreadable in the 34px context-bar crest.
  - Commons rate-limits hard (HTTP 429). Batch API calls 50 titles at a time, and use the `thumburl` renders, which download more reliably than originals.
  - SVGs are the Commons originals. PNGs are about 256–320 px wide renders. `alma` is a PNG because its SVG is 1.2 MB.
  - A logo whose artwork hits the shield's narrowing bottom can be shrunk with `[ext, scale]` in `LOGOS` (Middlebury uses 0.84).
- Long dynasties can snowball toward 95+ team OVR. The stronger rep decay above 80 is the only brake, and in-season training adds about half an OVR point per season.
- One workout day stands for each training block. Gap weeks only change recovery.
- On a phone the workout screen is long (one card per runner). A collapsible runner list is a possible improvement.
