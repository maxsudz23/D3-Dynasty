# D3 Dynasty

A coaching game for NCAA Division III cross country. Pick one of 141 real D3 programs, or build your own, and try to turn it into a national power.

## How to play

1. **Choose a program.** The whole game takes on your school's colors. Coach the men's squad, the women's squad, or both, with 12 returning runners on each.
2. **Recruit.** Each preseason you spin a recruiting wheel 7 times per squad. It can land on a prospect, walk-on, transfer, hidden gem or blue chip. The better your reputation, the better your recruits.
3. **Race the season.** Set your top seven and run six meets, ending with regionals and nationals. You qualify for nationals by placing top 2 at regionals, sometimes 3rd or 4th, or through individual runners finishing in the top 10.
4. **Manage the offseason.** Seniors graduate, everyone else develops according to their potential grade, and you trim the roster back under the 20-runner cap.

Runners are rated on speed, endurance, hills, kick, race IQ, durability and mental toughness. Winning raises your reputation, but it decays every offseason, so a dynasty has to keep earning it.

## Running it

There's no build step. Open `index.html` in a browser, either directly from the file or from any static host such as GitHub Pages. Your dynasty saves automatically in the browser's local storage.

## Controls

| Key | Action |
| --- | --- |
| Arrow keys | Move between options |
| Enter | Select |
| Q / E | Switch squads (when coaching both) |
| Esc | Go back |
| M | Mute |

The mouse and touch work too.

## Built with

Plain HTML, CSS and JavaScript. Recruit names and portraits come from the [Random User API](https://randomuser.me), and race-day weather comes from [Open-Meteo](https://open-meteo.com). The game falls back to built-in data if either one is unavailable.

School colors are approximate, and crests are generated monograms rather than real logos.
