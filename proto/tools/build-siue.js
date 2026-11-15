/* Builds proto/siue/course-data.js for the 3D prototype: USGS lidar ground
   heights, the USGS/NAIP aerial photo, and the traced SIUE route placed in
   ground meters. See PROTOTYPE_3D.md.

   node proto/tools/build-siue.js [cacheDir]

   Downloads go to cacheDir (default proto/tools/cache, gitignored) and are
   reused on later runs. Both services are public domain. On WashU eduroam,
   gis.apfo.usda.gov (USDA's own NAIP server) is blocked; the USGS services
   used here work. */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

global.window = global;
const ROOT = path.resolve(__dirname, '../..') + '/';
['js/util.js', 'js/data/courses.js'].forEach((f) => require(ROOT + f));

const CACHE = path.resolve(process.argv[2] || path.join(__dirname, 'cache'));
const OUT = ROOT + 'proto/siue/course-data.js';

/* ---------- Area ---------- */

// lon/lat box. The 3DEP server squares any box in degrees, so this is the
// extent it actually returned; the photo is requested for the same box.
const EXTENT = [-90.001999, 38.800749, -89.984707, 38.818041];
const W = 1500; // meters east-west (0.017292° of longitude at 38.81°N)
const H = 1911; // meters north-south (0.017292° of latitude)
const PHOTO_PX = 2048; // square in degrees, so ~0.73 m × 0.93 m per pixel
const GRID = 257; // height samples per side (~5.9 m × 7.5 m)

/* ---------- Placing the trace ---------- */

// Landmarks: [pixel on WashU's 8K map (1763×1364), pixel on the 2048 photo].
// A similarity fit (scale, rotation, shift) maps the trace onto the ground:
// 0.639 m per map pixel, -1.55°, residuals 9-18 m.
const CONTROL = [
  [[595, 738], [802, 970]], // small building by the 4M mark, west of the tree line
  [[1700, 1330], [1791, 1354]], // hairpin at the end of the University Dr straight
  [[1210, 740], [1357, 986]] // path below the start field meets the road
];
// The out-and-back return and the finish run beside University Dr, which was
// realigned after the map was drawn. These map points move ~18 m WSW, off
// the new road.
const SHIFT = new Set(['1710,1320', '1600,1180', '1450,980', '1300,800', '1250,755', '1180,670', '1115,600']);
const NUDGE = [-0.76 * 18, 0.65 * 18];

/* ---------- Downloads ---------- */

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'course-builder/0.1' } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => (res.statusCode === 200 ? resolve(Buffer.concat(chunks)) : reject(new Error(`HTTP ${res.statusCode} for ${url}`))));
    }).on('error', reject);
  });
}

async function cached(name, url, minBytes) {
  const file = path.join(CACHE, name);
  if (fs.existsSync(file) && fs.statSync(file).size >= minBytes) return fs.readFileSync(file);
  fs.mkdirSync(CACHE, { recursive: true });
  for (let i = 1; ; i++) {
    try {
      const buf = await get(url);
      if (buf.length < minBytes) throw new Error(`${name}: only ${buf.length} bytes`);
      fs.writeFileSync(file, buf);
      return buf;
    } catch (err) {
      if (i >= 4) throw err; // the 3DEP server returns the odd 502
      console.log(`retrying ${name}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 3000 * i));
    }
  }
}

/* ---------- Geometry (same rules as js/course.js) ---------- */

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function fitSimilarity(pairs) {
  const toM = ([x, y]) => [(x / PHOTO_PX) * W, (y / PHOTO_PX) * H];
  const src = pairs.map((p) => p[0]);
  const dst = pairs.map((p) => toM(p[1]));
  const n = src.length;
  const mean = (a) => [a.reduce((s, p) => s + p[0], 0) / n, a.reduce((s, p) => s + p[1], 0) / n];
  const ms = mean(src);
  const md = mean(dst);
  let re = 0;
  let im = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const a = [src[i][0] - ms[0], src[i][1] - ms[1]];
    const b = [dst[i][0] - md[0], dst[i][1] - md[1]];
    re += a[0] * b[0] + a[1] * b[1];
    im += a[0] * b[1] - a[1] * b[0];
    den += a[0] ** 2 + a[1] ** 2;
  }
  const A = re / den;
  const B = im / den;
  const T = ([x, y]) => [A * (x - ms[0]) - B * (y - ms[1]) + md[0], B * (x - ms[0]) + A * (y - ms[1]) + md[1]];
  const resid = src.map((p, i) => dist(T(p), dst[i]).toFixed(1));
  console.log(`fit: ${Math.hypot(A, B).toFixed(4)} m/px, ${(Math.atan2(B, A) * 180 / Math.PI).toFixed(2)}°, residuals ${resid.join(' ')} m`);
  return T;
}

function chaikin(pts, closed, n) {
  let p = pts;
  for (let k = 0; k < n; k++) {
    const out = closed ? [] : [p[0]];
    const m = closed ? p.length : p.length - 1;
    for (let i = 0; i < m; i++) {
      const a = p[i];
      const b = p[(i + 1) % p.length];
      out.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
    }
    if (!closed) out.push(p[p.length - 1]);
    p = out;
  }
  return p;
}

function makeLeg(pts, closed) {
  const ring = closed ? pts.concat([pts[0]]) : pts;
  const cum = [0];
  for (let i = 1; i < ring.length; i++) cum.push(cum[i - 1] + dist(ring[i - 1], ring[i]));
  return { pts: ring, cum, total: cum[cum.length - 1], closed };
}

function legPoint(leg, f) {
  f = leg.closed ? ((f % 1) + 1) % 1 : Math.min(1, Math.max(0, f));
  const target = f * leg.total;
  let lo = 0;
  let hi = leg.cum.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (leg.cum[mid] <= target) lo = mid; else hi = mid;
  }
  const t = (target - leg.cum[lo]) / (leg.cum[hi] - leg.cum[lo] || 1);
  return [leg.pts[lo][0] + (leg.pts[hi][0] - leg.pts[lo][0]) * t, leg.pts[lo][1] + (leg.pts[hi][1] - leg.pts[lo][1]) * t];
}

const STEP = 2;
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

function segmentPts(leg, seg, T) {
  const frac = (v, dflt) => (v === undefined ? dflt : Array.isArray(v) ? nearestFrac(leg, T(v)) : v);
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

/* ---------- Build ---------- */

(async () => {
  const def = XC.courses.byId('siue');
  const fitT = fitSimilarity(CONTROL);
  const T = ([x, y]) => {
    let p = fitT([x, y]);
    if (SHIFT.has(`${x},${y}`)) p = [p[0] + NUDGE[0], p[1] + NUDGE[1]];
    return p;
  };

  const legs = {};
  Object.entries(def.trace.legs).forEach(([id, l]) => {
    const raw = l.pts.map(T);
    let pts = chaikin(raw, !!l.closed, 2);
    if (l.closed) {
      let best = 0;
      pts.forEach((p, i) => { if (dist(p, raw[0]) < dist(pts[best], raw[0])) best = i; });
      pts = pts.slice(best).concat(pts.slice(0, best));
    }
    legs[id] = makeLeg(pts, !!l.closed);
  });
  const races = {};
  Object.entries(def.trace.races).forEach(([sq, r]) => {
    const pts = [];
    r.path.forEach((seg) => {
      const piece = segmentPts(legs[seg.leg], seg, T);
      pts.push(...(pts.length ? piece.slice(1) : piece));
    });
    races[sq] = pts;
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += dist(pts[i - 1], pts[i]);
    console.log(`${sq} path: ${Math.round(len)} m`);
  });

  const box = EXTENT.join(',');
  const dem = await cached('dem.bin',
    `https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=${box}&bboxSR=4326&imageSR=4326&size=${GRID},${GRID}&format=bsq&pixelType=F32&interpolation=RSP_BilinearInterpolation&f=image`,
    GRID * GRID * 4);
  const photo = await cached('ortho.jpg',
    `https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/export?bbox=${box}&bboxSR=4326&imageSR=4326&size=${PHOTO_PX},${PHOTO_PX}&format=jpg&f=image`,
    100000);

  // Raw little-endian float32s, north row first; a 1-bit validity mask follows.
  const elev = new Float32Array(GRID * GRID);
  for (let i = 0; i < elev.length; i++) elev[i] = dem.readFloatLE(i * 4);
  let min = Infinity;
  let max = -Infinity;
  elev.forEach((v) => { min = Math.min(min, v); max = Math.max(max, v); });
  const cm = new Uint16Array(elev.length);
  elev.forEach((v, i) => { cm[i] = Math.round((v - min) * 100); });

  const r1 = (p) => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10];
  const data = {
    name: def.name,
    place: `${def.city}, ${def.state}`,
    extent: EXTENT.join(','),
    widthM: W,
    heightM: H,
    grid: GRID,
    baseElev: Math.round(min * 100) / 100,
    heightsCm: Buffer.from(cm.buffer).toString('base64'),
    legs: Object.fromEntries(Object.entries(legs).map(([id, l]) => [id, { closed: l.closed, pts: (l.closed ? l.pts.slice(0, -1) : l.pts).map(r1) }])),
    races: Object.fromEntries(Object.entries(races).map(([sq, p]) => [sq, p.map(r1)])),
    credits: 'Elevation: USGS 3D Elevation Program. Imagery: USGS The National Map (USDA NAIP). Both public domain.',
    // A data URL: WebGL can't use a plain file:// image as a texture.
    photo: 'data:image/jpeg;base64,' + photo.toString('base64')
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT,
    '/* Generated by the prototype build script: SIUE terrain, aerial photo and\n   the traced route in ground meters. Sources are public domain. */\n' +
    '(function (XC) {\n  \'use strict\';\n  XC.realCourse = ' + JSON.stringify(data) + ';\n})(window.XC = window.XC || {});\n');
  console.log(`wrote ${path.relative(ROOT, OUT)}: ${(fs.statSync(OUT).size / 1e6).toFixed(2)} MB, ground ${min.toFixed(1)}-${max.toFixed(1)} m`);
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
