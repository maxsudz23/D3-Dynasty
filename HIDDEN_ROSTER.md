# Hidden WashU roster

These WashU runners are on the real 2026 roster but aren't in the game. At the team's request, the game only includes each squad's top 20 by season best (see `js/data/rosters.js`). Anyone here who wants to be in the game can be added back. Paste their row into the matching squad's list in `js/data/rosters.js`; nothing else needs to change.

This file isn't served on the site (`.assetsignore` skips `*.md`).

## Men (1)

| Name | Year | Hometown | 2026 season best | Row for `rosters.js` |
|---|---|---|---|---|
| Kaleb McElfish | Senior | Rancho Santa Margarita, CA | 27:03.1 | `['Kaleb', 'McElfish', 4, 'Rancho Santa Margarita, CA', '27:03.1'],` |

## Removed from the game

Taken out after being in the game. Add back only if they ask to be in it: paste the row, restore the `tfrrs` and `photos` entries (and the headshot file from git history), and take their hash out of `removed`.

| Name | Squad | Removed | Row for `rosters.js` | TFRRS |
|---|---|---|---|---|
| Charlie Glatz | Men | 2026-11-14 | `['Charlie', 'Glatz', 2, 'Ladue, MO', '26:14.0'],` | `'Charlie Glatz': { xc: '26:14.0' },` |

## Women (4)

| Name | Year | Hometown | 2026 season best | Row for `rosters.js` |
|---|---|---|---|---|
| Gianna Ezekwe | Sophomore | North Kansas City, MO | no mark | `['Gianna', 'Ezekwe', 2, 'North Kansas City, MO', null],` |
| Vivienne Larson | Senior | Eden Prairie, MN | no mark | `['Vivienne', 'Larson', 4, 'Eden Prairie, MN', null],` |
| Megan Raue | Sophomore | Bethesda, MD | no mark | `['Megan', 'Raue', 2, 'Bethesda, MD', null],` |
| Piper Stevens | First-year | Nicholasville, KY | 24:44.6 | `['Piper', 'Stevens', 1, 'Nicholasville, KY', '24:44.6'],` |
