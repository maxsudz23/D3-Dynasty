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

  // opts.kind ('loop' or 'point') and opts.climbPerKm steer a venue whose
  // real layout we know something about but haven't traced.
  C.generate = function (seed, terrain = 'rolling', opts = {}) {
    const rng = U.mulberry32(seed >>> 0);
    const coin = rng();
    const closed = opts.kind === 'loop' || opts.kind === 'point' ? opts.kind === 'loop' : coin < 0.65;
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
    const drawnPerKm = U.randFloat(range[0], range[1], rng);
    const targetPerKm = opts.climbPerKm || drawnPerKm;
    const hills = buildHills(pts, terrain, rng);
    const rawElev = pts.map(([x, y]) => elevAt(hills, x, y));
    const rawClimb = climbOf(rawElev, isClosed) || 1;
    const scale = (targetPerKm * (lenM / 1000)) / rawClimb;
    hills.forEach((hl) => { hl.h *= scale; });
    const elev = rawElev.map((e) => U.round(e * scale, 2));
    const climbM = climbOf(elev, isClosed);

    const layout = {
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
    // The same shape a traced course has: one leg, and each race's path
    // along it from C.span.
    const leg = makeLeg('main', pts, isClosed);
    layout.legs = [publicLeg(leg)];
    layout.race = {};
    Object.keys(XC.race.DIST).forEach((sq) => {
      const s = C.span(layout, sq);
      layout.race[sq] = publicPath(walk(leg, s.start, isClosed ? s.length : 1 - s.start));
    });
    return layout;
  };

  /* ---------- Legs and race paths ---------- */

  // A leg is one stretch of trail, open or a closed loop, in generation
  // space. A race path strings pieces of legs together in running order.
  function makeLeg(id, pts, closed) {
    const { cum, total } = arcLengths(pts, closed);
    return { id, pts, closed, cum, total };
  }

  const publicLeg = (leg) => ({ id: leg.id, closed: leg.closed, pts: leg.pts.map(([x, y]) => [x / W, y / H]) });

  function publicPath(pts) {
    const { cum, total } = arcLengths(pts, false);
    return { pts: pts.map(([x, y]) => [x / W, y / H]), at: cum.map((c) => c / (total || 1)) };
  }

  // Point at fraction f of a leg. Loops wrap.
  function legPoint(leg, f) {
    const { pts, cum, total } = leg;
    const n = pts.length;
    const target = (leg.closed ? ((f % 1) + 1) % 1 : U.clamp(f, 0, 1)) * total;
    if (target >= cum[n - 1]) {
      if (!leg.closed) return pts[n - 1];
      const t = (target - cum[n - 1]) / (total - cum[n - 1] || 1);
      return [pts[n - 1][0] + (pts[0][0] - pts[n - 1][0]) * t, pts[n - 1][1] + (pts[0][1] - pts[n - 1][1]) * t];
    }
    let lo = 0;
    let hi = n - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] <= target) lo = mid;
      else hi = mid;
    }
    const t = (target - cum[lo]) / (cum[hi] - cum[lo] || 1);
    return [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * t, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * t];
  }

  // Run d of a leg's length (negative runs it backward) from fraction f0.
  function walk(leg, f0, d) {
    const n = Math.max(1, Math.ceil((Math.abs(d) * leg.total) / STEP));
    const out = [];
    for (let i = 0; i <= n; i++) out.push(legPoint(leg, f0 + (d * i) / n));
    return out;
  }

  function nearestFrac(leg, p) {
    let best = 0;
    let bestD = Infinity;
    leg.pts.forEach((q, i) => {
      const d = dist(p, q);
      if (d < bestD) { bestD = d; best = i; }
    });
    return leg.cum[best] / leg.total;
  }

  // One piece of a race path: { leg, from?, to?, laps?, reverse? }. from and
  // to are leg fractions or [x, y] points on the leg. On a loop, laps adds
  // whole laps, and from === to with no laps means one full lap.
  function segmentPts(leg, seg, toLeg) {
    const frac = (v, dflt) => (v === undefined ? dflt : Array.isArray(v) ? nearestFrac(leg, toLeg(v)) : v);
    const dir = seg.reverse ? -1 : 1;
    if (!leg.closed) {
      const f0 = frac(seg.from, seg.reverse ? 1 : 0);
      return walk(leg, f0, frac(seg.to, seg.reverse ? 0 : 1) - f0);
    }
    const f0 = frac(seg.from, 0);
    const f1 = frac(seg.to, f0);
    let d = (((dir * (f1 - f0)) % 1) + 1) % 1;
    if (d > 0.995) d = 0;
    d += seg.laps !== undefined ? seg.laps : d < 0.005 ? 1 : 0;
    return walk(leg, f0, dir * d);
  }

  /* ---------- Traced courses ---------- */

  // Build a layout from a course traced off its published map (see
  // js/data/courses.js). Points are in the tracer's own coordinates, y down;
  // they're rotated, centered and scaled to fill the frame.
  C.fromTrace = function (def, seed = 1) {
    const tr = def.trace;
    const rng = U.mulberry32(seed >>> 0);
    const rot = ((tr.rotate || 0) * Math.PI) / 180;
    const spin = ([x, y]) => [x * Math.cos(rot) - y * Math.sin(rot), x * Math.sin(rot) + y * Math.cos(rot)];
    const legDefs = Object.entries(tr.legs);
    const all = legDefs.flatMap(([, l]) => l.pts.map(spin));
    const xs = all.map((p) => p[0]);
    const ys = all.map((p) => p[1]);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const w = Math.max(...xs) - minX || 1;
    const hgt = Math.max(...ys) - minY || 1;
    const s = Math.min((W - 2 * MARGIN) / w, (H - 2 * MARGIN) / hgt);
    const toLeg = (p) => {
      const [x, y] = spin(p);
      return [W / 2 + (x - minX - w / 2) * s, H / 2 + (y - minY - hgt / 2) * s];
    };

    const legs = {};
    legDefs.forEach(([id, l]) => {
      const raw = l.pts.map(toLeg);
      const smooth = l.smooth === false ? raw : chaikin(raw, !!l.closed, 2);
      let pts = resample(smooth, !!l.closed, STEP);
      // Smoothing moves a loop's first point; start the loop at the point
      // nearest the traced one, so fraction 0 is where the tracer put it.
      if (l.closed) {
        let best = 0;
        pts.forEach((p, i) => { if (dist(p, raw[0]) < dist(pts[best], raw[0])) best = i; });
        pts = pts.slice(best).concat(pts.slice(0, best));
      }
      legs[id] = makeLeg(id, pts, !!l.closed);
    });

    const paths = {};
    Object.keys(XC.race.DIST).forEach((sq) => {
      const r = tr.races[sq];
      if (!r) return;
      const pts = [];
      r.path.forEach((seg) => {
        const piece = segmentPts(legs[seg.leg], seg, toLeg);
        pts.push(...(pts.length ? piece.slice(1) : piece));
      });
      paths[sq] = pts;
    });

    // Hills: traced positions where the map shows them, otherwise drawn
    // around the route. Heights scale so the climb matches the course.
    const legPts = Object.values(legs).flatMap((l) => l.pts);
    const hills = tr.hills
      ? tr.hills.map((hl) => {
        const [x, y] = toLeg([hl.x, hl.y]);
        return { x, y, rx: (hl.rx || hl.r) * s, ry: (hl.ry || hl.r) * s, h: hl.h || 1 };
      })
      : buildHills(legPts, def.type, rng);
    const range = (C.TERRAIN[def.type] || C.TERRAIN.rolling).climbPerKm;
    const targetPerKm = def.climbPerKm || U.randFloat(range[0], range[1], rng);
    const main = paths.M ? 'M' : Object.keys(paths)[0];
    const mainM = XC.race.DIST[main].meters;
    const rawClimb = climbOf(paths[main].map(([x, y]) => elevAt(hills, x, y)), false) || 1;
    const scale = (targetPerKm * (mainM / 1000)) / rawClimb;
    hills.forEach((hl) => { hl.h *= scale; });
    const climbM = targetPerKm * (mainM / 1000);

    const race = {};
    Object.keys(paths).forEach((sq) => { race[sq] = publicPath(paths[sq]); });
    return {
      seed,
      terrain: def.type,
      traced: true,
      kind: def.kind || 'loop',
      closed: def.kind !== 'point',
      legs: Object.values(legs).map(publicLeg),
      race,
      hills: hills.map((hl) => ({ x: hl.x / W, y: hl.y / H, rx: hl.rx / W, ry: hl.ry / H, h: hl.h })),
      climbM: U.round(climbM, 1),
      climbPerKm: U.round(targetPerKm, 1),
      labels: {
        layout: tr.layoutLabel || (def.kind === 'point' ? 'Point to point' : 'Lapped loop'),
        describe: tr.describe || null,
        races: Object.fromEntries(Object.keys(paths).map((sq) => [sq, tr.races[sq].label || null]))
      },
      // Each race path's length in frame units, to check a trace against
      // the real distances.
      pathUnits: Object.fromEntries(Object.keys(paths).map((sq) => [sq, arcLengths(paths[sq], false).total]))
    };
  };

  const cache = new Map();

  // course: { name, type, seed?, courseId? }. Old saves have no seed, so
  // derive one. A courseId with a trace in XC.courses builds the real route;
  // one without a trace is generated but steered by what's known about it.
  C.layoutFor = function (course) {
    const seed = course.seed !== undefined ? course.seed : U.hash(`${course.name}|${course.type}`);
    const def = course.courseId && XC.courses ? XC.courses.byId(course.courseId) : null;
    const key = def ? `${course.courseId}|${seed}` : `${seed}|${course.type}`;
    if (!cache.has(key)) {
      if (cache.size > 40) cache.clear();
      let layout;
      if (def && def.trace) layout = C.fromTrace(def, seed);
      else if (def) layout = C.generate(seed, def.type, { kind: def.kind, climbPerKm: def.climbPerKm });
      else layout = C.generate(seed, course.type);
      cache.set(key, layout);
    }
    return cache.get(key);
  };

  /* ---------- Race mapping ---------- */

  // Normalized [x, y] for race progress p (0..1) of a squad's race.
  C.racePoint = function (layout, sq, p) {
    const { pts, at } = layout.race[sq];
    const f = U.clamp(p, 0, 1);
    let lo = 0;
    let hi = at.length - 1;
    if (f >= at[hi]) return pts[hi];
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (at[mid] <= f) lo = mid;
      else hi = mid;
    }
    const t = (f - at[lo]) / (at[hi] - at[lo] || 1);
    return [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * t, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * t];
  };

  // Generated courses only: where a squad's race starts and how much of the
  // route it covers. Loops share one finish line; point-to-point routes
  // share the finish and the shorter race starts further along.
  C.span = function (layout, sq) {
    const D = XC.race.DIST[sq].meters;
    if (layout.closed) {
      const start = (((layout.finishAt * layout.lenM - D) % layout.lenM) + layout.lenM) % layout.lenM;
      return { start: start / layout.lenM, length: D / layout.lenM, laps: D / layout.lenM };
    }
    return { start: (layout.lenM - D) / layout.lenM, length: D / layout.lenM, laps: null };
  };

  C.lapsText = function (layout, sq) {
    if (layout.traced) return layout.labels.races[sq] || 'Traced from the course map';
    const s = C.span(layout, sq);
    if (!layout.closed) return 'Point to point';
    if (s.laps <= 1.05) return s.laps >= 0.95 ? 'One lap' : `${Math.round(s.laps * 100)}% of one lap`;
    return `${U.round(s.laps, 1)} laps`;
  };

  C.loopLabel = function (layout) {
    if (layout.traced) return layout.labels.layout;
    return layout.closed ? `${U.round(layout.lenM / 1000, 2)} km loop` : 'Point to point';
  };

  C.describe = function (layout) {
    const shape = layout.traced
      ? layout.labels.describe || layout.labels.layout
      : layout.closed
        ? layout.lenM >= 8000 ? 'One big loop through the grounds' : 'A lapped loop. Spectators see you every lap'
        : 'Point to point. Every stretch is new ground';
    return `${shape}, about ${Math.round(layout.climbPerKm)} m of climbing per kilometer.`;
  };

  XC.course = C;
})(window.XC = window.XC || {});
