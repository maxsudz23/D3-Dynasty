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
