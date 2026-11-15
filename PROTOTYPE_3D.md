# 3D race view prototype

A standalone page testing a 3D race view before anything goes into the game. It lives in `proto/`, which `.assetsignore` keeps off the deployed site. Nothing in `index.html` or `js/` loads it.

Open `proto/runners-3d.html` in Chrome. It has to stay inside the repo, because it loads `../js/util.js` and `../js/data/schools.js` for team colors. Status as of 2026-11-14: the user liked the look; two known bugs are listed below.

## Files

| File | What it is |
|---|---|
| `proto/runners-3d.html` | The page: classic `defer` scripts, no modules, works from `file://`. |
| `proto/runners-3d.js` | Everything: course, runner model, run cycle, field sim, cameras, HUD. |
| `proto/runners-3d.css` | HUD styles. |
| `proto/vendor/three.min.js` | Three.js r149 (MIT), the last release with a classic `build/three.min.js` and no deprecation warning. r150–r159 warn in the console, and r160+ is modules only. |
| `proto/siue/course-data.js` | Generated: `XC.realCourse` with SIUE heights, aerial photo and route (1.4 MB). |
| `proto/tools/build-siue.js` | Rebuilds `course-data.js`. Downloads into `proto/tools/cache/` (gitignored). The last run reproduced the committed file byte for byte. |
| `proto/tools/shots.js`, `sheet.js` | Headless Chrome stills and contact sheets for checking by eye. Need `puppeteer-core` through `NODE_PATH`; they aren't a repo dependency. |

## Controls and URL options

- Keys 1–5 or the HUD buttons pick the camera:
  - **Chase:** behind your best-placed runner.
  - **Broadcast:** side-on to the lead pack.
  - **Aerial:** orbiting above the pack.
  - **Close-up:** a three-quarter view of your runner.
  - **Overview:** the whole course, circling.
- Space pauses. The rate button cycles 1×, 2×, 4×, 8× and 0.25×. HUD buttons switch men/women and SIUE/demo loop.
- URL options: `?cam=`, `&t=SECONDS` (pre-simulates to that time), `&paused=1`, `&squad=W`, `&course=demo`, `&solo=1` (hide everyone but the followed runner), `&hud=0`.
- The page sets `window.__protoReady` once the photo and trees are in, which is what `shots.js` waits for.

## Runners

- **Model:** a jointed hierarchy of capsules, spheres and boxes: pelvis, hips, knees, ankles, torso, shoulders, elbows, head.
  - The singlet uses the school's primary color, with a sash in the accent color.
  - Shorts are the accent color if it's dark, otherwise the primary darkened.
  - Every runner wears a white bib.
  - Skin, hair and shoe colors are seeded. Women are scaled 0.93, and 70% get a ponytail.
  - Geometries are shared, and materials are cached by color.
- **Run cycle (`legPose`, `pose`):** phase φ, where 0 is the thigh vertical and moving forward and π/2 is the thigh fully forward.
  - Hip: `−(0.2 + 0.6·amp·sin φ)`.
  - Knee: folds hardest mid-swing, with a bump centered at φ = 6.0, plus a small stance bend.
  - Arms swing with the opposite leg. Torso and pelvis counter-twist. Lean is 0.13 rad, plus more uphill.
  - `amp` scales with speed. Stride length is `1.5 + 0.28 × speed/5.6` m per step.
- **Feet on the ground (`hipLift`):** sagittal-plane kinematics put the heel and toe of each foot on ground sloped by the local grade. The hip sits high enough for the lower foot, plus a small flight bump between steps. That stopped the shoes sinking into the ground.
- **Field:** 7 UAA teams × 7 runners, with WashU as "you" and a yellow marker overhead.
  - Speed is `5.55 × ability × (1 − grade × 2.6)`.
  - A runner blocked within 1.6 m in the same lane eases off and steers sideways.
  - None of this is the game's race sim. In the game, `S.runMeet` results would drive positions.

## The real course (SIUE)

- **Terrain:** USGS 3DEP lidar bare-earth heights, a 257×257 grid over 1500 × 1911 m, stored as base64 Uint16 centimeters above the lowest point. The relief is 36.5 m.
- **Photo:** a 2048² JPEG from the USGS National Map imagery service (NAIP), embedded as a data URL.
  - It has to be a data URL: WebGL refuses a plain `file://` image as a texture, because it counts as cross-origin.
  - A tiling grass "detail" texture is multiplied into the ground shader every 4 m through `onBeforeCompile`, because the photo smears up close.
- **Data used:**
  - The 3DEP server squares any lat/lon box in degrees, so the box in the script is the one it actually returned.
  - The DEM comes back as raw float32 plus a 1-bit validity mask. Only the first 257² floats are read.
  - USDA's own NAIP server (`gis.apfo.usda.gov`) is blocked on WashU eduroam (connection reset); the USGS services work.
- **Placing the trace:** the traced legs in `js/data/courses.js` are in pixels of WashU's 8K map. Three landmarks matched between that map and the photo give a similarity fit of 0.639 m per map pixel and −1.55°, with residuals of 9–18 m.
  - University Dr was realigned after the map was drawn, so the out-and-back return and the finish leg are moved 18 m WSW by hand (`SHIFT` in the build script).
  - The script ports `segmentPts` and smoothing from `js/course.js` to build each race path in meters. Men: 7,830 m. Women: 5,900 m. Both are within 2% of 8K and 6K, which is a good sign the placement is right.
- **Trees:** about 18,700 instanced crowns and trunks.
  - A tree goes on a jittered 6.5 m grid point where the photo is green-dominant, textured (luminance SD ≥ 6.5) and dark (L ≤ 104).
  - Each crown is colored from its photo pixel.
  - Trees are kept 8+ m from a trail and only within about 400 m of one.
  - Crowns reach down to 2–5 m so the woods read as a solid edge.
- **Trail:** a faint translucent ribbon over every traced leg, red/yellow flags every 18 m, a chalk start line and a FINISH arch at the race path's end. The race restarts once everyone has finished.

## Known problems (not fixed yet)

1. **Runners spin in circles at some turns.**
   - Each runner faces the direction of the 1 m route segment under them, so a hairpin flips their heading within a step.
   - A runner offset toward the inside of a turn tighter than their lane offset gets a point that moves backward, so they turn around.
   - Fix ideas:
     - Ease the heading toward the travel direction instead of snapping it.
     - Compute the lane offset from smoothed normals.
     - Squeeze runners toward the centerline at tight turns, limiting the lane offset to the turn radius.
     - Face runners along their actual frame-to-frame movement.
2. **Trails overlap in odd ways.**
   - The traced legs are drawn separately, and some share ground: the start and finish legs over the loop, and the out-and-back beside University Dr. Their ribbons and flags stack.
   - The user's fix: wherever the course is run more than once, merge the paths into a single trail. Build one trail network from the legs, snap segments that run within a few meters of each other onto one centerline, then draw ribbons and flags once per network edge. Race paths should then follow the merged centerline, so laps share exactly the same ground.

## Other limits

- The ground under the forest is the canopy photo seen from above, so it looks dark.
- Trees are generic round crowns. There is no understory.
- Performance on a real GPU is unmeasured; screenshots come from SwiftShader. If it stutters: merge each runner's meshes, add level of detail, or thin the trees.
- Only SIUE has real terrain. Other traced courses need their own landmarks, extent and build run. Generated venues would keep procedural hills.
- The runners look like wooden posing dolls: no faces, block shoes.

## Merging into the game later

See ROADMAP.md, "3D race view", for the plan. Constraints to keep:
- No build step, no ES modules, classic scripts under `window.XC`, works from `file://`. That's why Three.js r149 is a local file.
- Release WebGL contexts in the race screen's `cleanup()`.
- Keep the 2D canvas as the fallback when WebGL or the library is missing, and default to it on phones.
- The console must stay error-free.
- Keep the attribution for USGS and NAIP data, and never ship Google imagery or tiles.
