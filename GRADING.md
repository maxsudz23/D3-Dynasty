# D3 Dynasty: Grader's Guide

D3 Dynasty is a D3 cross country coaching game. You pick a real Division III program, recruit runners on a prize wheel, set a top-seven lineup and race six meets a season, all the way to nationals. Open `index.html` directly or through Live Server; no build step is needed.

## APIs (3 required, 6 used)

### Data APIs

| API | What it does in the game | Where to look | How it fails gracefully |
|---|---|---|---|
| **randomuser.me** | Names, hometowns and portrait photos for the starting roster and every recruit | `js/api.js:77` (`fetchPeople`), called from `js/ui/title.js:378` and `js/ui/wheel.js:82` | Falls back to local name lists and drawn silhouettes, then shows a toast saying photos are unavailable (`js/api.js:96`, `js/ui/wheel.js:88`). A broken photo URL also swaps to a silhouette (`js/ui/common.js:86`). |
| **Open-Meteo** | Live weather at the meet host's campus. Heat, rain and wind slow race times (`js/race.js`, `weatherSeconds`). | `js/api.js:146` (`fetchWeather`), called from `js/ui/meet.js:40` | Uses simulated autumn weather (`js/api.js:131`). The meet preview then says the conditions are simulated (`js/ui/meet.js:100`). |

Both API calls time out after 7 seconds through an `AbortController` (`js/api.js:11`).

### Browser APIs

| API | What it does | Where to look | Permission or support handling |
|---|---|---|---|
| **Geolocation** | The "Near me" button on the coach setup screen sorts schools by distance. Coordinates never leave the browser. | `js/ui/title.js:310` (`locate`) | Shows a separate message for permission denied, position unavailable and timeout (`js/ui/title.js:328`). Unsupported browsers also get a message. Search and the region filter still work either way. |
| **Web Audio** | Synthesized starting gun, wheel ticks and menu sounds (no audio files) | `js/audio.js:11–50` | Turns itself off if `AudioContext` is unsupported. Has a mute toggle. |
| **Speech Synthesis** | Optional race announcer | `js/audio.js:96` | The toggle is hidden when the browser doesn't support speech. |
| **Web Storage** | Autosaves the dynasty after every action; the title screen offers "Continue" | `js/storage.js` | Every call is wrapped in try/catch. If storage is blocked, the game warns the player and keeps running (`js/main.js:21`). |
| Canvas, Drag and Drop, ResizeObserver | Recruiting wheel, race animation, depth-chart reordering | `js/ui/wheel.js`, `js/ui/race-view.js`, `js/ui/roster.js:88` | |

**Quick test:** go offline in DevTools, or block `randomuser.me` and `open-meteo.com`, then start a new dynasty and open a meet preview. Deny location permission and click "Near me". The game keeps working in every case.

## Implementation

- **HTML:** `index.html` passes `html-validate`. It uses semantic regions (`header`, `main`, `nav`, `footer`, `dialog`), a skip link, an `aria-live` area for toasts, and alt text on portraits.
- **CSS:** everything is in `css/styles.css`, organized by section with design tokens at the top. There are no inline styles. The only exception: JavaScript sets CSS custom properties (team colors, meter fill) through `style.setProperty`, which counts as JS interaction. The stylesheet includes responsive breakpoints down to 375px and support for `prefers-reduced-motion`.
- **JavaScript:** there are no `onclick` attributes. All events use `addEventListener`, and DOM is built with a small helper (`js/util.js`, `U.h`) instead of `innerHTML`. A full simulated playthrough produced no console errors.

## Concept and design

- **Concept:** the APIs feed the game directly. Recruits come from randomuser.me, real weather changes race results, and geolocation helps you find a nearby program.
- **Visual design:** the style is an homage to old Madden menus: a fog-and-steel backdrop, dark header bars, a depth chart with a player banner card, keyboard-key prompts and a news ticker. The whole interface takes on the chosen school's colors (`js/ui/common.js:22`).
- **Usability:** every keyboard shortcut also has a clickable button, and the bottom bar always shows the controls for the current screen.

## File map

```
index.html            Page shell
css/styles.css        All styling
js/util.js            Random numbers, formatting, color math, DOM helper
js/api.js             randomuser.me + Open-Meteo with fallbacks
js/audio.js           Web Audio effects + Speech Synthesis announcer
js/storage.js         localStorage save/load
js/data/              D3 school list (141 programs) and name pools
js/athletes.js        Ratings, overall formula, growth
js/race.js            Race simulation + XC scoring
js/season.js          Schedule, fields, reputation, qualifying, offseason, recruiting
js/ui/*.js            One file per group of screens
js/main.js            Router, keyboard controls, startup
```
