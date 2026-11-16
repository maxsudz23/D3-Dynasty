# D3 Dynasty roadmap

Planned features that build on the workout system. The hooks they need are already in the code, noted below.

## Text messages from runners

A phone-style inbox screen (`XC.screens.texts`) where runners message the coach between meets.

- **Triggers:** Each workout block, roll a few texts from runners whose state suggests one.
  - High fatigue: "legs are dead, can I go easy?"
  - Recent injury or illness: "I have the flu and can't run this week."
  - A runner asks for a specific workout: "I was thinking about doing [WORKOUT] this week, thoughts?"
  - A PR or a bad race.
  - Homesickness, class load, and so on.
- **Template table:** Each template lists conditions, message text with `{name}` / `{workout}` slots, and 2–4 coach replies.
- **Reply effects:** Each reply has small effects:
  - fatigue ±
  - a morale stat (new, feeds MNT on race day)
  - injury days
  - forcing that runner's plan for the block (rest, or the workout they asked about)
  - a news line
- **State:** `state.inbox = [{ id, athleteId, templateId, vars, replied: null }]`. Unanswered texts expire when the meet runs.
- **Illness:** It works like an injury with a separate label. "Flu" sets `injury` to 1 and blocks training.

## Assistant coaches

Shipped 2026-11-16 (`js/staff.js`, `js/ui/staff.js`). CLAUDE.md, "Assistant coaches", has the rules. Possible follow-ups:

- A real budget once Facilities and budget lands: staff pay could come out of the same pot.
- Coaches who outgrow the program leaving for bigger jobs (poaching).
- Separate staffs per squad.

## Facilities and budget

- **Funding:** The school pays out each offseason based on results (rep change, titles). That money upgrades three facilities.
  - **Training room:** better recovery.
  - **Track:** better interval sessions.
  - **Home course:** customization and upgrades.
- **Hooks already in place:**
  - `T.recoveryPerWeek` adds `state.facilities.trainingRoom × 1.5` fatigue shed per week.
  - Interval (VO2) workouts gain `state.facilities.track × 5%` more benefit.
  - `state.homeCourse = { name, type, seed }` is the user's course, used for every home meet.
- **Home course editor:** Rename it, pick terrain, and reroll the layout (new seed). Also choose loop vs point-to-point by rerolling until `XC.course.generate(seed).kind` matches. Upgrades could add spectator areas (a home-meet rep bonus) or a "championship grade" course that makes hosting the conference meet more likely.

## Real home courses

### Progress report (2026-11-12)

**Shipped:** the engine plus the UAA pilot. It went to `main` in commit `64be998` and is live on d3dynasty.com. Browser checks against the live site passed for all eight UAA schools at 1440×900, 390×844 and 844×390, with no console errors and no overflow.

**Built:**
- **Data:** `js/data/courses.js` holds courses keyed by course id, with `homeOf[schoolId]`. Each course has sources, a confidence level and notes.
- **Engine:** `C.fromTrace` builds a course from hand-traced legs, and each race strings its own path through them. Generated courses use the same shape and are unchanged: 300 seeds gave the same routes, hills and climb before and after.
- **Wiring:** `S.venueFor`, new games and `S.migrate` use a school's real course. An old save moves onto it from the next season's schedule, unless `homeCourse.custom` is set.
- **UI:** the meet preview map and the race canvas draw every leg, separate starts and finishes, and arrows in running direction. The preview gives each race's route its own row.

**Courses traced:** Wheaton (IL) and North Central also host on St. James Farm (Wheaton's Gil Dodds Invitational; North Central's CCIW Championships), so they share Chicago's course.

| School | Course | Confidence | Source map | M/W length vs 8K/6K |
|---|---|---|---|---|
| WashU | SIUE Cross Country Course, Edwardsville IL | high | WashU's 2025 UAA 8K/6K maps (same as SIUE's) | −0.3% |
| Rochester | Genesee Valley Park, Rochester NY | high | UR's 2021 UAA map | 0.0% |
| Case | Squire Valleevue Farm, Hunting Valley OH | high | CWRU's 2023 UAA 8K/6K maps | 0.0% |
| CMU | Youthtowne Fields, Clinton PA | medium | 2026 Horizon League 8K/6K maps | +2.0% |
| Brandeis | Highland Park, Attleboro MA | medium | Brandeis's 2024 UAA lap-by-lap maps | −0.1% |
| Chicago | St. James Farm, Warrenville IL | medium | 2012 CCIW men's map (same loop as the 2026 UAA map) | −0.7% |

- **Why medium:**
  - CMU moved its invitational to Robert Morris's course in 2025, and CMU's own layout there isn't published.
  - Brandeis and Chicago each hosted only a UAA Championships, 30–35 miles from campus.
  - Chicago's running direction and lap count are read from mile markers.
- **Climb:** only Youthtowne publishes one (about 9 m/km, from its elevation profile). The others use their terrain's range.
- **Hills:** none are traced yet. They're generated around the route, except at Genesee Valley Park, a floodplain with none.
- **Left generated:**
  - **NYU:** no home meet in 2022–2026. It ran an invitational at Van Cortlandt Park until about 2008, but there's no college 8K/6K map.
  - **Emory:** no regular home meet. It hosted the 2022 UAA Championships at Nash Farm Battlefield in Hampton, GA, but that map is gone (Emory's old site is in maintenance mode, and the web archive has only error pages).
  - Revisit both if a map turns up.

**NESCAC (2026-11-12):**
- **Traced:** Middlebury (golf course, high), Bowdoin (Pickard Field, high), Bates (Wainwright, medium), Wesleyan (Long Lane Farm, high) and Trinity (Wickham Park, high). M/W lengths are within 2.5% of 8K/6K, except Wickham (−4.3%, a hand-drawn sketch) and Wesleyan (−9.5%, a schematic not drawn to scale).
- **Venue only, generated layout:** Williams (Mt. Greylock, no map), Colby (Quarry Road, no race map), Hamilton (2014 map predates a rebuild) and Conn College (Harkness, map conflicts with the written description).
- **Not found:** Amherst and Tufts. CLAUDE.md has the reasons, in "Courses we couldn't find or make".
- **Judgment calls:**
  - Bates has no fixed home course, so it uses Wainwright, its 2026 venue. Pineland Farms, its traditional hilly course, has no map.
  - Trinity's home meet is a 5K, so its trace follows the 2021 NESCAC 8K/6K maps.
- **Engine fix:** smoothed loops now start at the traced first point. Before, a race ending at a loop's start could finish a few meters off.

**CCIW (2026-11-16):**
- **Traced:** Augustana (Saukie Golf Course, high, from Augustana's 2021 8K/6K maps, which match the 2026 Midwest Regional manual), Illinois Wesleyan (Maxwell Park, medium) and Elmhurst (Eldridge Park, medium). M/W lengths are within 1.7% of 8K/6K. Saukie and Maxwell Park are turned 90° to fill the frame.
- **Shared:** Wheaton (IL) and North Central stay on St. James Farm.
- **Venue only:** North Park (Schiller Woods, no map).
- **Left generated:** Carthage (no home meet; UW-Parkside's Dannehl course is the obvious substitute if wanted) and Millikin (two alternating venues, no maps).
- **Judgment calls:**
  - IWU's own meet is a 3 mi / 2 mi opener, so its trace follows the 2016 CCIW Championships maps, as Trinity's does.
  - Elmhurst's Earlybird ran 6K/4K (three and two laps of a 2K loop, last held 2022). The game runs four and three laps from the same 2009 map.
  - Elmhurst and North Park also each hosted a CCIW Championships at St. James Farm (2022, 2024), but their own venues were used instead.
- **Cost:** two research agents in parallel, about 10 minutes and 350K tokens together.

**What the pilot taught:**
- Most D3 "home" courses are off campus, and several schools only ever hosted a conference meet. Record the honest situation in `notes` and use medium confidence.
- Conference championship pages, especially "UAA Championships" host pages, are the best source of official 8K/6K maps.
- Read the route order from arrows, lap colors and mile or km markers, and check it against the marker spacing before tracing. Zoom in on junctions, since crops at double resolution settled every ambiguous one.
- The men's/women's length check catches misread lap counts: a wrong lap count shows up as 15% or more off.
- CMU's women race 5K at their own invitational, and WashU's home opener is a 5K. The game races 8K/6K everywhere, so traces follow the championship maps.
- **Cost:** one research agent covered four schools in about 20 minutes and 230K tokens. Tracing took a few map crops per course.

**What's left:**
- The other 135 programs, one conference at a time, in the same steps: research agents, view and trace each map, the data check, the contact sheet, and a browser season.
- Real regional and nationals venues to replace `XC.names.nationalVenues`.
- Traced hill positions where maps have elevation profiles.
- Set `homeCourse.custom` once the home course editor exists.

Replace the invented venue names with the real courses each school races on, so a meet at a school's home course carries that course's real name, terrain and character.

- **Research first (most of the work):** For each of the 143 programs, find the course it actually hosts on. Do the most thorough search possible when this starts, and record a source for every entry.
  - Where to look: each school's athletics site (cross country page, home meet and invitational pages, facilities pages), meet listings and results on TFRRS and DirectAthletics (which name the venue), conference and NCAA championship host announcements, and local news.
  - What to record per course: official name, location (park, golf course, campus farm, etc.), approximate terrain (flat, rolling, hilly, mud-prone), loop vs point-to-point if known, notable features ("the big hill at 6K"), and the source URLs.
  - Several schools may share one venue (a public park or a conference's usual course), so key the data by course, not by school.
  - Mark confidence. A course that can't be verified isn't entered, and that school keeps a generated venue. Never invent a "real" course.
- **Read the course maps (for an accurate layout):** Most hosts publish a course map, as an image or PDF on the meet page, in the meet information packet, or on the athletics facilities page. Find the map for each course, and for each race distance if they differ (men's 8K, women's 6K). View it and trace the layout.
  - Trace the route as an ordered list of points in our own coordinates, normalized to the course frame, following the map's shape: turns, straights, loops and out-and-backs.
  - Record where each race starts and finishes, how many laps it runs and which parts each race repeats, and where shared sections or the two races' routes differ.
  - Record the km or mile markers shown on the map, so the split markers land where the real ones are.
  - Record hills and elevation from the map's elevation profile, contour shading or notes ("the big hill at 6K"). Where the map has none, use satellite terrain or the course description, and note which source was used.
  - Check the trace against the official distance: the scaled route length should match 8K and 6K (or the listed distances).
  - Keep the map's URL as a source. Ship only our traced points, never the map image itself.
  - If no usable map exists, record that and fall back to a layout generated from the course's described terrain and kind.
- **Data:** a new `js/data/courses.js`.
  - `courses: { [courseId]: { name, city, type, kind?, climbPerKm?, route?, races?, hills?, notes, sources, mapSource? } }`
  - `route`: the traced points. `races`: start, finish, laps and km marks per squad. `hills`: positions and sizes along the route.
  - `homeOf: { [schoolId]: courseId }`
  - Store names, facts and our own traced routes only. Don't ship map images.
- **Game wiring:**
  - `S.venueFor` checks `homeOf` first and falls back to today's generated venue.
  - Courses with a traced `route` get a hand-authored layout. `course.js` needs a path that takes the traced points instead of `C.generate`. Then it runs the same smoothing, fit to the 16:9 frame and `C.isClear` crossing check (a real route that crosses itself, such as a figure-eight, needs a way to allow that crossing), builds elevation from `hills`, and maps each race's start, finish and laps from `races`.
  - Courses without a traced route stay generated, seeded by the course id, with `type`, `kind` (loop or point-to-point) and the climb range steered by the research.
  - When the player picks a real school, `S.newGame` starts `state.homeCourse` from that school's real course instead of a random one. The planned home course editor (see Facilities) can still rename or reroll it.
  - Championships: conference meets would use real host courses (the host's home course), and regionals and nationals could use real championship venues where the research finds them, replacing `XC.names.nationalVenues`.
- **Saves:** meets already scheduled keep the course stored in `state.schedule`, so changes apply from the next season's schedule. Decide then whether `S.migrate` should swap an existing save's random `homeCourse` for the school's real one (probably only if the player never customized it).
- **Testing:**
  - Check that every `homeOf` entry points to an existing course and every course has at least one source.
  - For traced courses, render each one beside its source map for a side-by-side check of shape, start and finish, and laps, and check that the route length matches the race distance.
  - Check that the course stress test still passes for the generated ones.

## 3D race view

An optional 3D view of the race animation, beside the current 2D canvas. A working prototype is in `proto/`. `PROTOTYPE_3D.md` has its full context: files, how it works, data sources and known bugs.

- **Idea:** the race is already decided before the animation plays (`S.runMeet`), so 3D is only a second renderer of the same replay. Results, saves and course seeds don't change.
- **Runners:** made in code from primitives with a coded run cycle (no model files to license or load), in each school's colors. Your runners get a marker, and the camera follows your top runner.
- **Courses:**
  - **Real courses:** USGS 3DEP lidar heights, a USGS/NAIP aerial photo draped over them, trees planted where the photo shows canopy, and the traced route placed on the ground by matching three landmarks between the course map and the photo. All the data is public domain. No Google imagery or tiles: their terms forbid storing them and require a paid key.
  - **Generated venues:** keep their procedural hills (`C.generate`), drawn as 3D terrain.
  - SIUE is done in the prototype.
- **Cameras:** chase, broadcast, aerial, close-up and course overview.
- **Library:** Three.js r149 saved in the repo, which is the newest release that still ships a classic script build. That fits the no-build, no-modules, `file://` rules.
- **To fix before merging:**
  - Runners spin in circles at some sharp turns. Ease their heading instead of snapping it to the route segment, and keep lane offsets inside the turn radius.
  - Trails overlap where legs share ground. Wherever a stretch is run more than once, merge it into one trail, so ribbons and flags are drawn once and every lap follows the same centerline.
- **Merging steps:**
  1. Fix the two bugs above.
  2. Drive runner positions from the real race results instead of the prototype's own pack sim.
  3. Add a 2D/3D toggle on the race screen, keeping 2D as the default on phones and the fallback without WebGL.
  4. Release the WebGL context in `cleanup()`.
  5. Build terrain data for the other traced courses.
  6. Measure frame rate on real hardware with a full JV invitational field, and merge meshes or add level of detail if needed.
