/* Course generator. Every venue gets a seeded, randomly drawn route that
   never crosses itself: either a loop that runners lap (start and finish
   sit on the loop) or a point-to-point route that wanders the grounds to a
   shared finish. Hills come from an elevation field, so the climb the race
   sim uses is the climb the map shows. Pure: no DOM. */
(function (XC) {
  'use strict';

  const U = XC.util;
  const C = {};

  // Generation space has the race canvas's 16:9 shape so clearance checks
  // hold once the course is scaled onto the screen.
  const W = 16;
  const H = 9;
  const MARGIN = 0.9;
  const COLS = 7;
  const ROWS = 4;
  const CW = (W - 2 * MARGIN) / COLS;
  const CH = (H - 2 * MARGIN) / ROWS;
  const STEP = 0.14;
  // Closest two parts of the trail may come unless they are neighbors along
  // the route. About a tenth of the map's height.
  const MIN_GAP = 0.95;

  C.TERRAIN = {
    flat: { climbPerKm: [1, 3] },
    rolling: { climbPerKm: [4.5, 8] },
    hilly: { climbPerKm: [10, 16] },
    mud: { climbPerKm: [1.5, 4.5] }
  };
  C.TERRAIN_WEIGHTS = { flat: 3, rolling: 4, hilly: 3, mud: 2 };
  // Loop lengths in meters. None divides 6K or 8K evenly, so start and
  // finish lines land in different spots.
  const LOOP_METERS = [2400, 2600, 2750, 3100, 3300, 4200, 5000, 8400];
  const POINT_METERS = 8000;

  /* ---------- Geometry helpers ---------- */

  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  function pointSegDist(p, a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy || 1e-9;
    const t = U.clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2, 0, 1);
    return Math.hypot(p[0] - (a[0] + dx * t), p[1] - (a[1] + dy * t));
  }

  function cross(o, a, b) {
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  }

  function segsIntersect(a, b, c, d) {
    const d1 = cross(c, d, a);
    const d2 = cross(c, d, b);
    const d3 = cross(a, b, c);
    const d4 = cross(a, b, d);
    return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
  }

  function segDist(a, b, c, d) {
    if (segsIntersect(a, b, c, d)) return 0;
    return Math.min(pointSegDist(a, c, d), pointSegDist(b, c, d), pointSegDist(c, a, b), pointSegDist(d, a, b));
  }

  // Corner cutting. Keeps endpoints on open paths.
  function chaikin(pts, closed, iters) {
    let p = pts;
    for (let it = 0; it < iters; it++) {
      const out = [];
      const n = p.length;
      if (!closed) out.push(p[0]);
      const lim = closed ? n : n - 1;
      for (let i = 0; i < lim; i++) {
        const a = p[i];
        const b = p[(i + 1) % n];
        out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
        out.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
      }
      if (!closed) out.push(p[n - 1]);
      p = out;
    }
    return p;
  }

  // Even spacing along the route, so arc length maps cleanly to meters.
  function resample(pts, closed, step) {
    const src = closed ? pts.concat([pts[0]]) : pts;
    const out = [src[0]];
    let carry = 0;
    for (let i = 1; i < src.length; i++) {
      const a = src[i - 1];
      const b = src[i];
      const len = dist(a, b);
      let t = step - carry;
      while (t <= len) {
        out.push([a[0] + ((b[0] - a[0]) * t) / len, a[1] + ((b[1] - a[1]) * t) / len]);
        t += step;
      }
      carry = len - (t - step);
    }
    if (closed) {
      if (dist(out[out.length - 1], out[0]) < step * 0.5) out.pop();
    } else if (dist(out[out.length - 1], src[src.length - 1]) > step * 0.25) {
      out.push(src[src.length - 1]);
    }
    return out;
  }

  function arcLengths(pts, closed) {
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i - 1], pts[i]));
    const total = cum[cum.length - 1] + (closed ? dist(pts[pts.length - 1], pts[0]) : 0);
    return { cum, total };
  }

  // True when no two parts of the route touch or cross, except stretches
  // that are next to each other along the route itself.
  C.isClear = function (pts, closed, gap = MIN_GAP) {
    const { cum, total } = arcLengths(pts, closed);
    const n = pts.length;
    const segs = closed ? n : n - 1;
    const skip = gap * 3;
    for (let i = 0; i < segs; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      if (a[0] < 0.3 || a[0] > W - 0.3 || a[1] < 0.3 || a[1] > H - 0.3) return false;
      for (let j = i + 2; j < segs; j++) {
        let sep = cum[j] - cum[i];
        if (closed) sep = Math.min(sep, total - sep);
        if (sep < skip) continue;
        if (segDist(a, b, pts[j], pts[(j + 1) % n]) < gap) return false;
      }
    }
    return true;
  };

  const toSpace = (i, j) => [MARGIN + i * CW, MARGIN + j * CH];

  /* ---------- Loop: boundary of a random hole-free blob of grid cells ---------- */

  function holeFree(cells) {
    const has = (c, r) => cells.has(r * COLS + c);
    // A pinch where two cells meet only at a corner makes the boundary touch itself.
    for (let i = 0; i <= COLS; i++) {
      for (let j = 0; j <= ROWS; j++) {
        const a = has(i - 1, j - 1);
        const b = has(i, j - 1);
        const c = has(i - 1, j);
        const d = has(i, j);
        if ((a && d && !b && !c) || (b && c && !a && !d)) return false;
      }
    }
    // Every empty cell must reach the outside, or the blob has a hole.
    const seen = new Set();
    const stack = [[-1, -1]];
    const k = (c, r) => `${c},${r}`;
    seen.add(k(-1, -1));
    while (stack.length) {
      const [c, r] = stack.pop();
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dc, dr]) => {
        const nc = c + dc;
        const nr = r + dr;
        if (nc < -1 || nc > COLS || nr < -1 || nr > ROWS) return;
        if (has(nc, nr) || seen.has(k(nc, nr))) return;
        seen.add(k(nc, nr));
        stack.push([nc, nr]);
      });
    }
    const outside = (COLS + 2) * (ROWS + 2) - cells.size;
    return seen.size === outside;
  }

  function blobCells(rng) {
    const target = U.randInt(7, 16, rng);
    const cells = new Set([U.randInt(1, COLS - 2, rng) + U.randInt(1, ROWS - 2, rng) * COLS]);
    let guard = 0;
    while (cells.size < target && guard++ < 500) {
      const frontier = [];
      cells.forEach((key) => {
        const c = key % COLS;
        const r = Math.floor(key / COLS);
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dc, dr]) => {
          const nc = c + dc;
          const nr = r + dr;
          if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && !cells.has(nr * COLS + nc)) frontier.push(nr * COLS + nc);
        });
      });
      if (!frontier.length) break;
      const add = U.pick(frontier, rng);
      cells.add(add);
      if (!holeFree(cells)) cells.delete(add);
    }
    return cells;
  }

  // Walk the blob's outline as one closed ring of grid corners.
  function outline(cells) {
    const has = (c, r) => c >= 0 && c < COLS && r >= 0 && r < ROWS && cells.has(r * COLS + c);
    const next = new Map();
    cells.forEach((key) => {
      const c = key % COLS;
      const r = Math.floor(key / COLS);
      if (!has(c, r - 1)) next.set(`${c},${r}`, [c + 1, r]);
      if (!has(c + 1, r)) next.set(`${c + 1},${r}`, [c + 1, r + 1]);
      if (!has(c, r + 1)) next.set(`${c + 1},${r + 1}`, [c, r + 1]);
      if (!has(c - 1, r)) next.set(`${c},${r + 1}`, [c, r]);
    });
    const [firstKey] = next.keys();
    const ring = [];
    let cur = firstKey;
    let guard = 0;
    do {
      const [i, j] = cur.split(',').map(Number);
      ring.push([i, j]);
      const n = next.get(cur);
      cur = `${n[0]},${n[1]}`;
    } while (cur !== firstKey && guard++ < 500);
    return ring;
  }

  function blobLoop(rng) {
    const ring = outline(blobCells(rng));
    if (ring.length < 8) return null;
    const pts = ring.map(([i, j]) => {
      const [x, y] = toSpace(i, j);
      return [x + U.randFloat(-0.3, 0.3, rng) * CW, y + U.randFloat(-0.3, 0.3, rng) * CH];
    });
    return chaikin(pts, true, 3);
  }

  // Fallback loop: a wobbly oval is star-shaped, so it can never cross itself.
  function ovalLoop(rng) {
    const harmonics = [2, 3, 4, 5].map((k) => ({ k, a: U.randFloat(0, 0.22 / k * 2, rng), p: rng() * Math.PI * 2 }));
    const n = 72;
    const raw = [];
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2;
      const r = 1 + harmonics.reduce((s, hm) => s + hm.a * Math.cos(hm.k * t + hm.p), 0);
      raw.push([Math.cos(t) * r, Math.sin(t) * r]);
    }
    const xs = raw.map((p) => p[0]);
    const ys = raw.map((p) => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return raw.map(([x, y]) => [
      MARGIN + ((x - minX) / (maxX - minX)) * (W - 2 * MARGIN),
      MARGIN + ((y - minY) / (maxY - minY)) * (H - 2 * MARGIN)
    ]);
  }

  /* ---------- Point to point: a self-avoiding walk across the grounds ---------- */

  function walkCells(rng) {
    const want = U.randInt(11, 18, rng);
    const edge = U.pick([
      () => [0, U.randInt(0, ROWS - 1, rng)],
      () => [COLS - 1, U.randInt(0, ROWS - 1, rng)],
      () => [U.randInt(0, COLS - 1, rng), 0],
      () => [U.randInt(0, COLS - 1, rng), ROWS - 1]
    ], rng)();
    const path = [edge];
    const seen = new Set([edge.join(',')]);
    let calls = 0;
    let best = path.slice();
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    function dfs(lastDir) {
      if (path.length > best.length) best = path.slice();
      if (path.length >= want) return true;
      if (calls++ > 4000) return false;
      const [c, r] = path[path.length - 1];
      // Lean toward running straight so the route has long stretches.
      let order = U.shuffle(dirs, rng);
      if (lastDir && rng() < 0.45) order = [lastDir].concat(order.filter((d) => d !== lastDir));
      for (const d of order) {
        const nc = c + d[0];
        const nr = r + d[1];
        const key = `${nc},${nr}`;
        if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS || seen.has(key)) continue;
        seen.add(key);
        path.push([nc, nr]);
        if (dfs(d)) return true;
        path.pop();
        seen.delete(key);
      }
      return false;
    }
    dfs(null);
    return best;
  }

  function walkPath(rng) {
    const cells = walkCells(rng);
    if (cells.length < 9) return null;
    const pts = cells.map(([c, r]) => {
      const [x, y] = toSpace(c + 0.5, r + 0.5);
      return [x + U.randFloat(-0.28, 0.28, rng) * CW, y + U.randFloat(-0.28, 0.28, rng) * CH];
    });
    return chaikin(pts, false, 3);
  }

  // Center the route and grow it to fill the grounds. Scaling up only
  // widens the gaps, so a clear route stays clear.
  function fitToFrame(pts, closed) {
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const s = U.clamp(Math.min((W - 2 * MARGIN) / (maxX - minX || 1), (H - 2 * MARGIN) / (maxY - minY || 1)), 1, 1.8);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const moved = pts.map(([x, y]) => [W / 2 + (x - cx) * s, H / 2 + (y - cy) * s]);
    return resample(moved, closed, STEP);
  }

  /* ---------- Elevation ---------- */

  function buildHills(pts, terrain, rng) {
    const count = terrain === 'hilly' ? U.randInt(3, 5, rng) : terrain === 'rolling' ? U.randInt(3, 5, rng) : U.randInt(1, 3, rng);
    const hills = [];
    for (let i = 0; i < count; i++) {
      const anchor = U.pick(pts, rng);
      hills.push({
        x: U.clamp(anchor[0] + U.randFloat(-1.4, 1.4, rng), 0.5, W - 0.5),
        y: U.clamp(anchor[1] + U.randFloat(-1, 1, rng), 0.5, H - 0.5),
        rx: U.randFloat(1.1, 2.6, rng),
        ry: U.randFloat(0.8, 1.8, rng),
        h: U.randFloat(0.5, 1, rng)
      });
    }
    return hills;
  }

  const elevAt = (hills, x, y) => hills.reduce((s, hl) => s + hl.h * Math.exp(-(((x - hl.x) / hl.rx) ** 2 + ((y - hl.y) / hl.ry) ** 2)), 0);

  function climbOf(elev, closed) {
    let up = 0;
    for (let i = 1; i < elev.length; i++) up += Math.max(0, elev[i] - elev[i - 1]);
    if (closed) up += Math.max(0, elev[0] - elev[elev.length - 1]);
    return up;
  }

  /* ---------- Build ---------- */

  C.generate = function (seed, terrain = 'rolling') {
    const rng = U.mulberry32(seed >>> 0);
    const closed = rng() < 0.65;
    let pts = null;
    for (let attempt = 0; attempt < 40 && !pts; attempt++) {
      const raw = closed ? blobLoop(rng) : walkPath(rng);
      if (!raw) continue;
      const even = resample(raw, closed, STEP);
      if (C.isClear(even, closed)) pts = fitToFrame(even, closed);
    }
    let isClosed = closed;
    if (!pts) {
      isClosed = true;
      pts = resample(ovalLoop(rng), true, STEP);
    }

    const lenM = isClosed ? U.pick(LOOP_METERS, rng) : POINT_METERS;
    const { cum, total } = arcLengths(pts, isClosed);

    // Scale hill heights so the climb lands in the terrain's range.
    const range = (C.TERRAIN[terrain] || C.TERRAIN.rolling).climbPerKm;
    const targetPerKm = U.randFloat(range[0], range[1], rng);
    const hills = buildHills(pts, terrain, rng);
    const rawElev = pts.map(([x, y]) => elevAt(hills, x, y));
    const rawClimb = climbOf(rawElev, isClosed) || 1;
    const scale = (targetPerKm * (lenM / 1000)) / rawClimb;
    hills.forEach((hl) => { hl.h *= scale; });
    const elev = rawElev.map((e) => U.round(e * scale, 2));
    const climbM = climbOf(elev, isClosed);

    return {
      seed,
      terrain,
      kind: isClosed ? 'loop' : 'point',
      closed: isClosed,
      // Normalized 0..1 coordinates; the renderer scales them to its canvas.
      pts: pts.map(([x, y]) => [x / W, y / H]),
      // Fraction of the route's length at each point.
      at: cum.map((c) => c / total),
      lenM,
      finishAt: isClosed ? U.randFloat(0.05, 0.95, rng) : 1,
      hills: hills.map((hl) => ({ x: hl.x / W, y: hl.y / H, rx: hl.rx / W, ry: hl.ry / H, h: hl.h })),
      elev,
      climbM: U.round(climbM, 1),
      climbPerKm: U.round(climbM / (lenM / 1000), 1)
    };
  };

  const cache = new Map();

  // course: { name, type, seed? }. Old saves have no seed, so derive one.
  C.layoutFor = function (course) {
    const seed = course.seed !== undefined ? course.seed : U.hash(`${course.name}|${course.type}`);
    const key = `${seed}|${course.type}`;
    if (!cache.has(key)) {
      if (cache.size > 40) cache.clear();
      cache.set(key, C.generate(seed, course.type));
    }
    return cache.get(key);
  };

  /* ---------- Race mapping ---------- */

  // Where a squad's race starts and how much of the route it covers. Loops
  // share one finish line; point-to-point routes share the finish and the
  // shorter race starts further along.
  C.span = function (layout, sq) {
    const D = XC.race.DIST[sq].meters;
    if (layout.closed) {
      const start = (((layout.finishAt * layout.lenM - D) % layout.lenM) + layout.lenM) % layout.lenM;
      return { start: start / layout.lenM, length: D / layout.lenM, laps: D / layout.lenM };
    }
    return { start: (layout.lenM - D) / layout.lenM, length: D / layout.lenM, laps: null };
  };

  // Route fraction for race progress p (0..1).
  C.routeAt = function (layout, sq, p) {
    const s = C.span(layout, sq);
    const f = s.start + U.clamp(p, 0, 1) * s.length;
    return layout.closed ? f % 1 : Math.min(1, f);
  };

  // Normalized [x, y] at a route fraction.
  C.pointAt = function (layout, frac) {
    const at = layout.at;
    const pts = layout.pts;
    const f = layout.closed ? ((frac % 1) + 1) % 1 : U.clamp(frac, 0, 1);
    let lo = 0;
    let hi = at.length - 1;
    if (f >= at[hi]) {
      if (!layout.closed) return pts[hi];
      const t = (f - at[hi]) / (1 - at[hi] || 1);
      return [pts[hi][0] + (pts[0][0] - pts[hi][0]) * t, pts[hi][1] + (pts[0][1] - pts[hi][1]) * t];
    }
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (at[mid] <= f) lo = mid;
      else hi = mid;
    }
    const t = (f - at[lo]) / (at[hi] - at[lo] || 1);
    return [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * t, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * t];
  };

  C.lapsText = function (layout, sq) {
    const s = C.span(layout, sq);
    if (!layout.closed) return 'Point to point';
    if (s.laps <= 1.05) return s.laps >= 0.95 ? 'One lap' : `${Math.round(s.laps * 100)}% of one lap`;
    return `${U.round(s.laps, 1)} laps`;
  };

  C.loopLabel = (layout) => (layout.closed ? `${U.round(layout.lenM / 1000, 2)} km loop` : 'Point to point');

  C.describe = function (layout) {
    const shape = layout.closed
      ? layout.lenM >= 8000 ? 'One big loop through the grounds' : 'A lapped loop. Spectators see you every lap'
      : 'Point to point. Every stretch is new ground';
    return `${shape}, about ${Math.round(layout.climbPerKm)} m of climbing per kilometer.`;
  };

  XC.course = C;
})(window.XC = window.XC || {});
