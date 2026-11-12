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

- **Pool:** Generated coaches, each with:
  - `trainingQuality` (0–1)
  - a specialty (threshold, VO2, hills, fartlek)
  - salary and contract years
  - Sign current staff or prospects from a hiring screen in the offseason.
- **Hook already in place:** `XC.training.advisorQuality(state)` reads `state.staff.trainingQuality`. `T.recommend` uses it to add error to the target dose and sometimes pick the wrong workout type. Recommendations from staff carry `source: 'staff'`, and the workout report already appends "This was the staff's suggestion" when one of them ends in an injury or a badly overcooked runner.
- **To build:**
  - `state.staff = { coaches: [...], trainingQuality }`, where quality is the best coach's rating plus a specialty bonus for matching workout types.
  - A "Staff suggestion" button beside "Suggest", so the head coach's exact read and the staff's read are different choices.

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

**Status (Nov 2026): the engine is built, and the UAA pilot is traced.** `js/data/courses.js`, `C.fromTrace`, the season wiring and save migration are done (see CLAUDE.md, Courses).
- **Traced so far:** six UAA courses: WashU (SIUE), Chicago (St. James Farm), Case (Squire Valleevue Farm), CMU (Youthtowne Fields), Rochester (Genesee Valley Park) and Brandeis (Highland Park, Attleboro).
- **Left generated:**
  - **NYU:** no home meet in 2022–2026. It ran an invitational at Van Cortlandt Park until about 2008, but there's no college 8K/6K map.
  - **Emory:** no regular home meet. It hosted the 2022 UAA Championships at Nash Farm Battlefield in Hampton, GA, but that map is gone (Emory's old site is in maintenance mode, and the web archive has only error pages).
  - Revisit both if a map turns up.
- **What the pilot taught:**
  - Most D3 "home" courses are off campus, and several schools only ever hosted a conference meet. Record the honest situation in `notes` and use medium confidence.
  - Conference championship pages, especially "UAA Championships" host pages, are the best source of official 8K/6K maps.
  - Read the route order from arrows, lap colors and mile or km markers, and check it against the marker spacing before tracing.
  - CMU's women race 5K at their own invitational, and WashU's home opener is a 5K. The game races 8K/6K everywhere, so traces follow the championship maps.
- **Next:** one conference at a time, in the same steps: research agents, view and trace each map, the data check, the contact sheet, and a browser season. Real nationals and regional venues are still to do.


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
