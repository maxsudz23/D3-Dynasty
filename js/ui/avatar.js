/* Draws a runner's look (XC.looks) as an SVG avatar on a 100×100 frame.
   The layout follows measurements of 100 real D3 team headshots: hairline
   y 24, eyes y 43.5 and 15.5 apart, nose base y 54, mouth y 60, chin y 74,
   a face 40 wide, a neck sized by build, and shoulders running off the
   frame. The top uses the team colors through CSS classes; skin, hair and
   eye colors are fill attributes. */
(function (XC) {
  'use strict';

  const U = XC.util;
  const L = XC.looks;
  const ui = XC.ui;
  const s = U.svg;

  const shade = (hex, t) => U.mixHex(hex, '#000000', t);
  const tint = (hex, t) => U.mixHex(hex, '#FFFFFF', t);
  const p = (d, attrs) => s('path', Object.assign({ d }, attrs));
  const n = (v) => U.round(v, 2);
  const mirror = (d) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (m, x, y) => `${n(100 - Number(x))} ${y}`);

  const EYE_Y = 43.5;
  const EYE_X = [42.25, 57.75];
  const INK = '#231A16';
  const GOLD = '#C9A55C';

  /* ---------- Faces (hairline y 24, chin y 74, widest at the cheekbones) ---------- */

  const HEAD = {
    oval: 'M30 44 C30 27 39 17.5 50 17.5 C61 17.5 70 27 70 44 C70 56 67 64 61 69.5 C57 73 53.5 74 50 74 C46.5 74 43 73 39 69.5 C33 64 30 56 30 44 Z',
    round: 'M28.5 45 C28.5 27 38.5 17.5 50 17.5 C61.5 17.5 71.5 27 71.5 45 C71.5 58 66.5 66.5 59.5 70.3 C55.8 72.3 52.6 72.8 50 72.8 C47.4 72.8 44.2 72.3 40.5 70.3 C33.5 66.5 28.5 58 28.5 45 Z',
    long: 'M31 43 C31 26 39.5 16.5 50 16.5 C60.5 16.5 69 26 69 43 C69 57 66.5 66 61 71.5 C57.5 75 53.5 76 50 76 C46.5 76 42.5 75 39 71.5 C33.5 66 31 57 31 43 Z',
    square: 'M30 43 C30 27 39 17.5 50 17.5 C61 17.5 70 27 70 43 L70 57.5 C70 64 66.5 70 59.5 72.6 C56 73.8 52.8 74 50 74 C47.2 74 44 73.8 40.5 72.6 C33.5 70 30 64 30 57.5 Z',
    heart: 'M29.5 42 C29.5 26 39 17.5 50 17.5 C61 17.5 70.5 26 70.5 42 C70.5 54 66.5 62 60.5 67.8 C56.5 71.8 53 74 50 74 C47 74 43.5 71.8 39.5 67.8 C33.5 62 29.5 54 29.5 42 Z'
  };
  const headShape = (face, fill) => p(HEAD[face] || HEAD.oval, { fill });

  const NECK = { slim: 22, medium: 24.5, athletic: 27 };

  /* ---------- Hair ----------
     Every style returns { back, front, cap?, color?, ears? }: back is drawn
     behind the head, front over it, and cap (its outer outline, behind the
     head) fills any gap between front hair and any face shape. ears:
     'both' (default), 'left', 'right' or 'none' for hair falling over them. */

  // The shared crown: hair over the skull, with a hairline at y `line`.
  function crown({ top = 14, L: left = 28.5, R: right = 71.5, side = 45, line = 24.5, temple = 35 } = {}) {
    const outer = `M${left} ${side} C${left - 1} ${top + 9} 38.5 ${top} 50 ${top} C61.5 ${top} ${right + 1} ${top + 9} ${right} ${side}`;
    const inner = ` L${right - 1.6} ${side} C${right - 2} ${temple} 66.5 ${line + 3.5} 60 ${line + 1} C55 ${line - 0.5} 45 ${line - 0.5} 40 ${line + 1} C33.5 ${line + 3.5} ${left + 2} ${temple} ${left + 1.6} ${side} Z`;
    return { outer, cap: `${outer} Z`, front: outer + inner };
  }
  const strokes = (list, color, width = 0.7, opacity = 0.55) => list.map((d) => p(d, { fill: 'none', stroke: color, 'stroke-width': String(width), 'stroke-opacity': String(opacity), 'stroke-linecap': 'round' }));
  // Texture lines (darker) and sun-lightened highlights (lighter).
  const texture = (c, list) => strokes(list, shade(c, 0.35));
  const shine = (c, list) => strokes(list, tint(c, 0.28), 0.8, 0.6);
  // Curls along an arc, varying a little in size so they don't look stamped.
  function curls(cx, cy, rx, ry, from, to, count, r, fill, outline) {
    const out = [];
    for (let i = 0; i <= count; i++) {
      const t = (from + ((to - from) * i) / count) * (Math.PI / 180);
      const size = r * (1 + 0.14 * Math.sin(i * 2.3 + cx));
      out.push(s('circle', { cx: n(cx + rx * Math.cos(t)), cy: n(cy + ry * Math.sin(t) + Math.cos(i * 1.7) * 0.6), r: n(size), fill, stroke: outline, 'stroke-width': '0.5' }));
    }
    return out;
  }

  // Long hair: curtains from a part down past the chin, in front of the
  // shoulders (drawn over the top). `end` is where they stop.
  function curtainLeft(part = 50, end = 100) {
    const tip = end >= 99 ? `C24.5 ${end - 6} 24.5 ${end - 3} 25.5 ${end} L36 ${end} C34.8 ${end - 7} 34 ${end - 15} 33.6 ${end - 24}`
      : `C26.4 ${end - 6} 26 ${end - 3} 26 ${end} L35.5 ${end} C34.6 ${end - 5} 34 ${end - 13} 33.6 ${end - 22}`;
    return `M${part} 15 C40 15 29 22 28.3 38 C27.8 52 27 66 25.8 ${Math.min(78, end - 10)} ${tip} C33.2 64 32.6 52 33.2 42 C34 32 40.5 23.5 ${part} 18 Z`;
  }
  const LONG_BACK = (end) => `M26 44 C24 20 37 11.5 50 11.5 C63 11.5 76 20 74 44 L75.5 ${end} L24.5 ${end} Z`;

  function longHair(c, { end = 100, waves = false, braids = false } = {}) {
    const back = [p(LONG_BACK(end), { fill: shade(c, 0.12) })];
    const left = curtainLeft(50, end);
    const front = [p(left, { fill: c }), p(mirror(left), { fill: c }),
      p('M50 18 L50 13.5', { fill: 'none', stroke: shade(c, 0.35), 'stroke-width': '0.7' })];
    if (waves) {
      front.push(...texture(c, ['M30.5 50 Q28.5 56 30.5 62 Q32.5 68 30 74', 'M69.5 50 Q71.5 56 69.5 62 Q67.5 68 70 74', 'M29 80 Q27 86 29.5 92', 'M71 80 Q73 86 70.5 92']));
      // Sun-lightened ends.
      front.push(...shine(c, ['M27.5 84 Q26.5 90 28 96', 'M72.5 84 Q73.5 90 72 96', 'M32 86 Q31 92 32.5 98', 'M68 86 Q69 92 67.5 98']));
    } else {
      front.push(...texture(c, ['M31 30 Q29.5 45 30 60', 'M69 30 Q70.5 45 70 60', 'M29 66 L27.5 88', 'M71 66 L72.5 88']));
      front.push(...shine(c, ['M44 18.5 Q36 22 33 30', 'M56 18.5 Q64 22 67 30']));
    }
    if (braids) {
      for (const x0 of [27.5, 30.5, 69.5, 72.5]) {
        const d = [];
        for (let y = 44; y < end - 2; y += 4) d.push(`M${x0 - 1.4} ${y} L${x0 + 1.4} ${y + 2}`);
        front.push(...strokes(d, shade(c, 0.45), 0.8, 0.8));
      }
    }
    return { back, front, ears: 'none' };
  }

  const fadeOf = (c, skin) => U.mixHex(c, skin, 0.45);

  const HAIR = {
    bald: () => ({ back: [], front: [] }),

    buzz: (c, skin) => {
      const k = crown({ top: 16.5, line: 25, side: 44 });
      const fill = U.mixHex(c, skin, 0.3);
      return { cap: k.cap, color: fill, back: [], front: [p(k.front, { fill })] };
    },

    crew: (c) => {
      const k = crown({ top: 14.5, line: 25 });
      return { cap: k.cap, back: [], front: [p(k.front, { fill: c })].concat(texture(c, ['M42 19 L43.5 23.5', 'M50 17.5 L50.5 22.5', 'M58 19 L57 23.5'])) };
    },

    // The most common men's cut: a textured crop with a ragged forward fringe.
    fringe: (c) => {
      const k = crown({ top: 13.5, line: 24.5 });
      const fringeD = 'M33 33.5 C35 24.5 42 21.5 50 21.5 C58 21.5 65 24.5 67 33.5 L65.2 31.6 L63.6 34 L61.2 31 L59 33.6 L56.6 30.6 L54.2 33.4 L51.6 30.2 L49.2 33.4 L46.6 30.4 L44.2 33.6 L41.8 30.8 L39.4 33.8 L37.2 31.4 L35.2 33.8 Z';
      return {
        cap: k.cap,
        back: [],
        front: [p(k.front, { fill: c }), p(fringeD, { fill: c })]
          .concat(texture(c, ['M40 18 Q43.5 22 45 27', 'M50 15.5 Q52.5 20 53 26', 'M59 18 Q61.5 22 62 27.5', 'M35 25 Q37 28 37.5 31']))
          .concat(shine(c, ['M44 16 Q48 15 52 16.5']))
      };
    },

    sidepart: (c) => {
      const k = crown({ top: 13 });
      const front = `${k.outer} L69.9 45 C69.5 35 67 29 61 26.5 C54 25.5 46 27 41.5 23.5 C38 28 32.5 33 30.1 45 Z`;
      return {
        cap: k.cap,
        back: [],
        front: [p(front, { fill: c }), p('M41.5 23.5 C42.5 19 44.5 15.8 47 14', { fill: 'none', stroke: shade(c, 0.4), 'stroke-width': '0.8' })]
          .concat(texture(c, ['M46 17 Q56 17.5 64 24', 'M44 21 Q54 21.5 62 27']))
          .concat(shine(c, ['M50 15 Q58 15.5 64 20']))
      };
    },

    // Curls on top, faded sides.
    curlytop: (c, skin) => {
      const k = crown({ top: 19.5, line: 26, side: 44 });
      const out = shade(c, 0.3);
      return {
        cap: k.cap,
        color: fadeOf(c, skin),
        back: [],
        front: [p(k.front, { fill: fadeOf(c, skin) })]
          .concat(curls(50, 21, 15, 6.5, 190, 350, 6, 4.6, c, out))
          .concat(curls(50, 17, 9, 3.5, 200, 340, 3, 4.4, c, out))
          .concat([0, 1, 2, 3, 4].map((i) => s('circle', { cx: String(39 + i * 5.5), cy: i % 2 ? '24.5' : '26', r: '3.6', fill: c, stroke: out, 'stroke-width': '0.5' })))
      };
    },

    // Medium length, swept back, flipping out behind the ears.
    flow: (c) => {
      const k = crown({ top: 12.5, line: 23.5, L: 28, R: 72 });
      const wing = 'M28.6 44 C27.5 50 28 55 30.5 58.5 C31 54 31 49 31.8 45 Z';
      return {
        cap: k.cap,
        back: [p('M27 46 C24.5 22 37 12 50 12 C63 12 75.5 22 73 46 C73.5 52 75.5 57 72.5 60.5 C70 58 68.5 55.5 68 52 L32 52 C31.5 55.5 30 58 27.5 60.5 C24.5 57 26.5 52 27 46 Z', { fill: shade(c, 0.1) })],
        front: [p(k.front, { fill: c }), p(wing, { fill: c }), p(mirror(wing), { fill: c })]
          .concat(texture(c, ['M38 25 Q42 17 52 15', 'M45 24 Q49 17 59 16', 'M55 24.5 Q60 19 67 22']))
          .concat(shine(c, ['M40 20 Q46 15 54 14.5']))
      };
    },

    // A short crop with a taper fade at the sides.
    taper: (c, skin) => {
      const k = crown({ top: 17, line: 25.5, side: 44 });
      const topD = 'M31.5 36 C31 23.5 39.5 14.5 50 14.5 C60.5 14.5 69 23.5 68.5 36 C66 30 62 26.5 50 26 C38 26.5 34 30 31.5 36 Z';
      return {
        cap: k.cap,
        color: fadeOf(c, skin),
        back: [],
        front: [p(k.front, { fill: fadeOf(c, skin) }), p(topD, { fill: c })]
          .concat(texture(c, ['M42 18 L44 24', 'M50 16.5 L51 23', 'M58 18 L56.5 24']))
      };
    },

    messy: (c) => {
      const k = crown({ top: 14.5, line: 25 });
      const spikes = 'M31 30 L29 22 L35 24 L35.5 15.5 L41 19.5 L44 11.5 L48.5 17.5 L53 10.5 L56 17 L61.5 12.5 L62.5 20 L68.5 18.5 L67 25 L71 27.5 L69 32 C66 25 58 21 50 21 C42 21 34 25 31 30 Z';
      const tufts = 'M37.5 27 L39.5 31.5 L42 27.5 L44.5 32 L47 27.5 L49.5 31.5 L52 27.5 L54.5 32 L57 27.5 L59.5 31 L62 27 C58 22.5 42 22.5 37.5 27 Z';
      return { cap: k.cap, back: [], front: [p(k.front, { fill: c }), p(spikes, { fill: c }), p(tufts, { fill: c })].concat(texture(c, ['M42 18 L45 25', 'M53 14 L52.5 22', 'M61 17 L58.5 24'])) };
    },

    curlymop: (c) => {
      const out = shade(c, 0.3);
      const k = crown({ top: 12, line: 25, L: 27, R: 73, side: 50 });
      return {
        cap: k.cap,
        ears: 'none',
        back: curls(50, 34, 23, 18, 160, 380, 12, 5.2, c, out),
        front: [p(k.front, { fill: c })]
          .concat(curls(50, 24, 20, 10, 185, 355, 8, 5, c, out))
          .concat([0, 1, 2, 3, 4, 5].map((i) => s('circle', { cx: String(36 + i * 5.6), cy: i % 2 ? '28' : '29.5', r: '3.8', fill: c, stroke: out, 'stroke-width': '0.5' })))
          .concat(curls(50, 44, 21.5, 10, 160, 200, 2, 4, c, out), curls(50, 44, 21.5, 10, -20, 20, 2, 4, c, out))
      };
    },

    // Middle-part curtains framing the forehead.
    curtain: (c) => {
      const k = crown({ top: 13.5 });
      const front = `${k.outer} L69.9 46 C69.5 39 67.5 34 63.5 32 C58.5 30.5 53.5 27.5 50 22.5 C46.5 27.5 41.5 30.5 36.5 32 C32.5 34 30.5 39 30.1 46 Z`;
      return {
        cap: k.cap,
        back: [],
        front: [p(front, { fill: c }), p('M50 22.5 C50 18.5 50.5 16 51.5 13.6', { fill: 'none', stroke: shade(c, 0.4), 'stroke-width': '0.7' })]
          .concat(texture(c, ['M47 23 Q40 26 35 33', 'M53 23 Q60 26 65 33', 'M44 16 Q37 20 33 28', 'M56 16 Q63 20 67 28']))
          .concat(shine(c, ['M46 15.5 Q40 17.5 36 22']))
      };
    },

    // Heavy fringe, longer over the ears and at the back.
    shag: (c) => {
      const k = crown({ top: 12, L: 27.5, R: 72.5, side: 52 });
      const front = `${k.outer} L70.5 52 C70 45 68.5 40.5 66.5 37.5 L64.8 39 L62.8 35.4 L60.2 38 L57.8 34.8 L55.2 37.4 L52.6 34.2 L50 36.8 L47.4 34.2 L44.8 37.4 L42.2 34.8 L39.8 38 L37.2 35.4 L35.2 39 L33.5 37.5 C31.5 40.5 30 45 29.5 52 Z`;
      return {
        cap: k.cap,
        ears: 'none',
        back: [p('M26 48 C24 22 37 11.5 50 11.5 C63 11.5 76 22 74 48 C74.5 54 75.5 59 72.5 62 C70 59 68.5 57 68 54 L32 54 C31.5 57 30 59 27.5 62 C24.5 59 25.5 54 26 48 Z', { fill: shade(c, 0.1) })],
        front: [p(front, { fill: c })].concat(texture(c, ['M40 17 Q43 25 43 33', 'M50 15 Q51 25 50 34', 'M60 17 Q57 25 57 33', 'M30 42 Q29.5 49 31 55', 'M70 42 Q70.5 49 69 55']))
      };
    },

    afro: (c) => {
      const k = crown({ top: 14, line: 25.5 });
      return {
        cap: k.cap,
        back: [s('circle', { cx: '50', cy: '33', r: '26.5', fill: c })],
        front: [p(k.front, { fill: c })].concat(strokes(['M34 17 l0.01 0', 'M42 11 l0.01 0', 'M58 11 l0.01 0', 'M66 17 l0.01 0', 'M50 9 l0.01 0', 'M28 27 l0.01 0', 'M72 27 l0.01 0'], tint(c, 0.25), 1.6, 0.5))
      };
    },

    curlyshort: (c) => {
      const k = crown({ top: 16, line: 25.5 });
      return { cap: k.cap, back: [], front: [p(k.front, { fill: c })].concat(curls(50, 23, 18, 8, 185, 355, 8, 4.3, c, shade(c, 0.3))) };
    },

    manbun: (c) => {
      const k = crown({ top: 15, line: 24 });
      return {
        cap: k.cap,
        back: [s('circle', { cx: '50', cy: '10.5', r: '6.5', fill: c })],
        front: [p(k.front, { fill: c }), s('rect', { x: '46.5', y: '14.5', width: '7', height: '2.4', rx: '1', fill: shade(c, 0.35) })]
          .concat(texture(c, ['M38 30 Q42 20 50 16', 'M62 30 Q58 20 50 16']))
      };
    },

    long: (c) => longHair(c),
    longwave: (c) => longHair(c, { waves: true }),
    braids: (c) => longHair(c, { braids: true }),
    bob: (c) => longHair(c, { end: 84 }),

    longside: (c) => {
      const right = 'M42 15 C55 13.5 71 20 71.7 38 C72.2 52 73 66 74.2 78 C75.5 88 75.5 94 74.5 100 L64 100 C65.2 93 66 85 66.4 76 C66.8 64 67.4 52 66.8 42 C66 34 61 28.5 52 26.5 C47 25.5 43.5 23 42 19.5 Z';
      const left = 'M42 15 C35 16 29 23 28.3 38 C27.8 52 27 66 25.8 78 C24.5 88 24.5 94 25.5 100 L36 100 C34.8 93 34 85 33.6 76 C33.2 64 32.6 52 33.2 42 C33.8 33 37.5 24.5 42 19.5 Z';
      return {
        ears: 'none',
        back: [p(LONG_BACK(100), { fill: shade(c, 0.12) })],
        front: [p(left, { fill: c }), p(right, { fill: c }), p('M42 19.5 L41.6 14.5', { fill: 'none', stroke: shade(c, 0.35), 'stroke-width': '0.7' })]
          .concat(texture(c, ['M47 18 Q60 19 66 30', 'M45 22 Q57 24 64 33', 'M69 50 L71 80']))
          .concat(shine(c, ['M48 16 Q58 16 64 22']))
      };
    },

    // Long, middle part, the left side tucked behind the ear.
    tucked: (c) => {
      const left = curtainLeft(50, 100);
      const tuck = 'M50 15 C40 15 30.5 21 30 34 C29.6 39 30.4 42 32 44 C33 36 37 27 44 22 C46 20 48 18.5 50 18 Z';
      const behind = 'M29.5 44 C27.5 56 27 68 26 80 C25.5 88 26 95 27 100 L33 100 C31.5 92 31 84 31.5 74 C32 62 32 52 31 44 Z';
      return {
        ears: 'left',
        back: [p(LONG_BACK(100), { fill: shade(c, 0.12) }), p(behind, { fill: c })],
        front: [p(tuck, { fill: c }), p(mirror(left), { fill: c }), p('M50 18 L50 13.5', { fill: 'none', stroke: shade(c, 0.35), 'stroke-width': '0.7' })]
          .concat(texture(c, ['M69 30 Q70.5 45 70 60', 'M71 66 L72.5 88', 'M44 19 Q36 23 32 34']))
          .concat(shine(c, ['M56 18.5 Q64 22 67 30']))
      };
    },

    bangs: (c) => {
      const base = longHair(c);
      base.front.push(p('M32 35 C32 24.5 40 18.5 50 18.5 C60 18.5 68 24.5 68 35 Q59 33 50 33.8 Q41 33 32 35 Z', { fill: c }));
      base.front.push(...texture(c, ['M40 26 L39 33', 'M46 25 L45.5 33.5', 'M54 25 L54.5 33.5', 'M60 26 L61 33']));
      return base;
    },

    halfup: (c) => {
      const base = longHair(c);
      base.back.push(s('circle', { cx: '50', cy: '12', r: '5', fill: shade(c, 0.05) }));
      base.front.push(...texture(c, ['M33 32 Q40 22 49 15', 'M67 32 Q60 22 51 15']));
      base.front.push(s('rect', { x: '46.8', y: '15.6', width: '6.4', height: '2', rx: '0.9', fill: '#3D3D3D' }));
      return base;
    },

    curlylong: (c) => {
      const out = shade(c, 0.28);
      const k = crown({ top: 13, L: 27.5, R: 72.5, side: 48 });
      return {
        cap: k.cap,
        ears: 'none',
        back: [p('M23 44 C21 19 36 10.5 50 10.5 C64 10.5 79 19 77 44 L80 96 L20 96 Z', { fill: shade(c, 0.12) })]
          .concat(curls(50, 56, 29, 38, 100, 160, 5, 6.5, c, out), curls(50, 56, 29, 38, 20, 80, 5, 6.5, c, out)),
        front: [p(k.front, { fill: c })]
          .concat(curls(50, 26, 21, 11, 190, 350, 7, 5, c, out))
          .concat(curls(28.5, 62, 2, 22, 270, 450, 5, 4.6, c, out), curls(71.5, 62, 2, 22, 270, 450, 5, 4.6, c, out))
      };
    },

    ponytail: (c) => {
      const k = crown({ top: 14, line: 24 });
      return {
        cap: k.cap,
        back: [p('M62 18 C76 15.5 82 30 79 48 C77 60 74 70 70 78 C72 64 72 50 67 38 Z', { fill: c })],
        front: [p(k.front, { fill: c }), s('rect', { x: '63', y: '16.5', width: '5', height: '3', rx: '1.2', fill: shade(c, 0.35), transform: 'rotate(-30 65.5 18)' })]
          .concat(texture(c, ['M37 31 Q44 21 62 18', 'M41 33 Q49 24 63 20']))
          .concat(shine(c, ['M40 23 Q47 17 56 16']))
      };
    },

    bun: (c) => {
      const k = crown({ top: 14, line: 24 });
      return {
        cap: k.cap,
        back: [s('circle', { cx: '50', cy: '10.5', r: '7.5', fill: c })],
        front: [p(k.front, { fill: c })].concat(texture(c, ['M37 31 Q42 20 49 15', 'M63 31 Q58 20 51 15', 'M46 8 Q50 12 54 8']))
      };
    },

    pixie: (c) => {
      const k = crown({ top: 13.5, line: 24 });
      const sweep = 'M30 40 C30 27 40 22 52 24 C60 25.5 66 29 69 34 C64 32 58 31.5 52 33 C44 35 37 38 32 44 Z';
      return { cap: k.cap, back: [], front: [p(k.front, { fill: c }), p(sweep, { fill: c })].concat(texture(c, ['M38 27 Q48 25 60 29', 'M36 33 Q46 30 56 31.5'])) };
    },

    puffs: (c) => {
      const k = crown({ top: 15, line: 24 });
      return {
        cap: k.cap,
        back: [s('circle', { cx: '31', cy: '17', r: '9.5', fill: c }), s('circle', { cx: '69', cy: '17', r: '9.5', fill: c })],
        front: [p(k.front, { fill: c }), p('M50 15.5 L50 24', { fill: 'none', stroke: shade(c, 0.35), 'stroke-width': '0.7' })]
      };
    }
  };

  /* ---------- Features ---------- */

  // Almond-type eyes with iris and highlight. A big smile lifts the lower
  // lids ("smiling eyes"), as in most real team photos.
  function eyes(style, eyeColor, skin, smiling) {
    const lash = { fill: 'none', stroke: INK, 'stroke-width': '0.95', 'stroke-linecap': 'round' };
    const lidLine = { fill: 'none', stroke: shade(skin, 0.25), 'stroke-width': '0.6', 'stroke-linecap': 'round' };
    // [half width, height above, height below]: a touch bigger than life so
    // the eyes still read at 56px.
    const shapes = { almond: [3.8, 3.2, 2.5], round: [3.6, 3.6, 3.2], narrow: [3.8, 2.4, 1.8], sleepy: [3.8, 2.8, 2.4], wide: [3.9, 3.9, 3.4] };
    return EYE_X.flatMap((x) => {
      const y = EYE_Y;
      if (style === 'happy') return [p(`M${x - 3.4} ${y + 0.6} Q${x} ${y - 3} ${x + 3.4} ${y + 0.6}`, Object.assign({}, lash, { 'stroke-width': '1.2' }))];
      const [w, up, down] = shapes[style] || shapes.almond;
      const outline = `M${x - w} ${y} Q${x} ${y - up} ${x + w} ${y} Q${x} ${y + down} ${x - w} ${y} Z`;
      const iris = Math.min(up, down + 0.6) * 0.62 + 0.4;
      const out = [
        p(outline, { fill: '#FBF8F4' }),
        s('circle', { cx: String(x), cy: n(y - 0.15), r: n(iris), fill: eyeColor }),
        s('circle', { cx: String(x), cy: n(y - 0.15), r: n(iris * 0.48), fill: INK }),
        s('circle', { cx: n(x + iris * 0.4), cy: n(y - iris * 0.45), r: '0.5', fill: '#FFFFFF' }),
        p(`M${x - w - 0.2} ${y + 0.1} Q${x} ${y - up - 0.2} ${x + w + 0.2} ${y + 0.1}`, lash)
      ];
      if (style === 'sleepy') out.push(p(`M${x - w - 0.3} ${y - 0.3} Q${x} ${y - up - 0.6} ${x + w + 0.3} ${y - 0.3} Q${x} ${y - up * 0.55} ${x - w - 0.3} ${y - 0.3} Z`, { fill: shade(skin, 0.06) }));
      if (smiling) {
        out.push(p(`M${x - w - 0.4} ${y + 1.4} Q${x} ${y + 0.2} ${x + w + 0.4} ${y + 1.4} L${x + w + 0.4} ${y + down + 0.8} L${x - w - 0.4} ${y + down + 0.8} Z`, { fill: skin }));
        out.push(p(`M${x - w + 0.4} ${y + 1.9} Q${x} ${y + 0.9} ${x + w - 0.4} ${y + 1.9}`, lidLine));
      }
      // A soft crease above the lid.
      out.push(p(`M${x - w + 0.6} ${y - up - 0.9} Q${x} ${y - up - 2} ${x + w - 0.4} ${y - up - 0.9}`, lidLine));
      return out;
    });
  }

  // Tapered brows: thick at the inner end, thin at the tail.
  function brows(style, color) {
    const spec = {
      flat: { arch: 0.6, tin: 1.7, tout: 1.0, yin: 38.2, yout: 37.9 },
      angled: { arch: 0.5, tin: 1.8, tout: 1.1, yin: 38.9, yout: 37.2 },
      thick: { arch: 0.8, tin: 2.5, tout: 1.6, yin: 38.2, yout: 37.8 },
      soft: { arch: 1.7, tin: 1.5, tout: 0.6, yin: 38.3, yout: 38.4 },
      arched: { arch: 2.3, tin: 1.4, tout: 0.8, yin: 38.4, yout: 38 },
      thin: { arch: 1.6, tin: 0.8, tout: 0.5, yin: 38.3, yout: 38 },
      raised: { arch: 2.2, tin: 1.4, tout: 0.9, yin: 36.8, yout: 36.4 }
    }[style] || { arch: 0.6, tin: 1.7, tout: 1.0, yin: 38.2, yout: 37.9 };
    const one = (xIn, xOut) => {
      const xm = (xIn + xOut) / 2;
      const ym = (spec.yin + spec.yout) / 2 - spec.arch;
      return p(`M${xIn} ${spec.yin} Q${n(xm)} ${n(ym)} ${xOut} ${spec.yout} L${xOut} ${n(spec.yout + spec.tout)} Q${n(xm)} ${n(ym + (spec.tin + spec.tout) / 2)} ${xIn} ${n(spec.yin + spec.tin)} Z`, { fill: color });
    };
    return [one(46.6, 37.4), one(53.4, 62.6)];
  }

  function nose(style, skin) {
    const dark = shade(skin, 0.3);
    const line = { fill: 'none', stroke: dark, 'stroke-width': '1', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
    const bridge = p('M48.2 45 Q47.8 50 46.9 52.4', { fill: 'none', stroke: dark, 'stroke-width': '0.8', 'stroke-opacity': '0.35', 'stroke-linecap': 'round' });
    switch (style) {
      case 'long': return [bridge, p('M48.6 44.5 Q48.1 50 47 52.6', line), p('M46.6 53.2 Q48.2 55 50 54.6 Q51.8 55 53.4 53.2', line)];
      case 'wide': return [bridge, p('M45.6 52.8 Q47.5 55.6 50 55 Q52.5 55.6 54.4 52.8', line), s('circle', { cx: '47.6', cy: '54', r: '0.65', fill: dark }), s('circle', { cx: '52.4', cy: '54', r: '0.65', fill: dark })];
      case 'small': return [s('circle', { cx: '48.8', cy: '53.8', r: '0.65', fill: dark }), s('circle', { cx: '51.2', cy: '53.8', r: '0.65', fill: dark }), p('M48.2 52.6 Q50 53.6 51.8 52.6', Object.assign({}, line, { 'stroke-opacity': '0.5' }))];
      case 'pointy': return [p('M49.6 45 L47.2 53 Q49 54.8 51.6 54', line)];
      default: return [bridge, p('M46.8 53 Q48.2 55 50 54.6 Q51.8 55 53.2 53', line)];
    }
  }

  function mouth(style, skin) {
    const lip = U.mixHex(skin, '#A4473F', 0.45);
    const inside = '#5A2420';
    const line = { fill: 'none', stroke: lip, 'stroke-width': '1.4', 'stroke-linecap': 'round' };
    const corners = { fill: 'none', stroke: shade(skin, 0.22), 'stroke-width': '0.6', 'stroke-linecap': 'round' };
    switch (style) {
      case 'grin': return [
        p('M42.3 58.4 Q50 67.2 57.7 58.4 Q50 60 42.3 58.4 Z', { fill: inside }),
        p('M43.3 58.8 Q50 60.4 56.7 58.8 L56.1 60.5 Q50 62.2 43.9 60.5 Z', { fill: '#FFFFFF' }),
        p('M45.5 63.6 Q50 65.6 54.5 63.6', Object.assign({}, line, { 'stroke-width': '0.9', 'stroke-opacity': '0.6' })),
        p('M41.2 57.2 Q41.6 58.8 42.8 59.4', corners), p('M58.8 57.2 Q58.4 58.8 57.2 59.4', corners)];
      case 'neutral': return [p('M44.6 60 Q50 61 55.4 60', line), p('M45.5 61.3 Q50 63.2 54.5 61.3 Q50 62.2 45.5 61.3 Z', { fill: lip, 'fill-opacity': '0.5' })];
      case 'smirk': return [p('M44.6 60.6 Q51 61.6 56.2 58.4', line)];
      case 'open': return [s('ellipse', { cx: '50', cy: '60.5', rx: '3', ry: '2.4', fill: inside })];
      default: return [p('M43 58.8 Q50 64 57 58.8', line), p('M45.8 62 Q50 63.6 54.2 62', Object.assign({}, line, { 'stroke-width': '0.8', 'stroke-opacity': '0.45' })), p('M42 57.8 Q42.3 59 43.2 59.4', corners), p('M58 57.8 Q57.7 59 56.8 59.4', corners)];
    }
  }

  function facialHair(style, color) {
    const beardPath = 'M29.5 44 C29.5 58 34 68 41 72.5 C45 75.5 47.5 76.5 50 76.5 C52.5 76.5 55 75.5 59 72.5 C66 68 70.5 58 70.5 44 L67 44 C67 53 66 58 62 61 Q57.5 63.5 55 62.6 Q50 64.6 45 62.6 Q42.5 63.5 38 61 C34 58 33 53 33 44 Z';
    const stache = p('M43 57.6 Q46.6 54.8 50 56.1 Q53.4 54.8 57 57.6 Q50 56.7 43 57.6 Z', { fill: color });
    switch (style) {
      case 'stubble': return { clip: 'face', under: [p(beardPath, { fill: color, 'fill-opacity': '0.15' }), p('M43 57.5 Q50 54.8 57 57.5 Q50 56.6 43 57.5 Z', { fill: color, 'fill-opacity': '0.22' })], over: [] };
      case 'mustache': return { under: [], over: [stache] };
      case 'goatee': return { under: [p('M46 65.6 Q50 70.4 54 65.6 Q50 67.2 46 65.6 Z', { fill: color })], over: [stache] };
      case 'beard': return { clip: 'beard', under: [p(beardPath, { fill: color })], over: [stache] };
      default: return { under: [], over: [] };
    }
  }

  function glasses(style) {
    const frame = { fill: 'none', stroke: '#2B2B2E', 'stroke-width': '1' };
    const arms = [p('M37.6 42.8 L30.5 42', frame), p('M62.4 42.8 L69.5 42', frame)];
    const bridge = p('M46.8 43.2 Q50 42 53.2 43.2', frame);
    switch (style) {
      case 'round': return [s('circle', Object.assign({ cx: '42.25', cy: '43.6', r: '4.6' }, frame)), s('circle', Object.assign({ cx: '57.75', cy: '43.6', r: '4.6' }, frame)), bridge].concat(arms);
      case 'square': return [s('rect', Object.assign({ x: '37.2', y: '39.8', width: '10.2', height: '7.4', rx: '1.4' }, frame)), s('rect', Object.assign({ x: '52.6', y: '39.8', width: '10.2', height: '7.4', rx: '1.4' }, frame)), bridge].concat(arms);
      case 'clear': {
        const thin = { fill: '#FFFFFF', 'fill-opacity': '0.08', stroke: '#B7A27A', 'stroke-width': '0.8' };
        return [s('rect', Object.assign({ x: '37.2', y: '39.8', width: '10.2', height: '7.6', rx: '2.6' }, thin)), s('rect', Object.assign({ x: '52.6', y: '39.8', width: '10.2', height: '7.6', rx: '2.6' }, thin)),
          p('M47.4 43.2 Q50 42.2 52.6 43.2', { fill: 'none', stroke: '#B7A27A', 'stroke-width': '0.8' })];
      }
      case 'sport': return [p('M34 40.5 Q50 37 66 40.5 L65.2 46.5 Q58.5 49.5 52 46.2 L48 46.2 Q41.5 49.5 34.8 46.5 Z', { fill: '#1F262F' }), p('M37 41.5 Q43 40 47 41', { fill: 'none', stroke: '#8FB4D8', 'stroke-width': '0.7', 'stroke-opacity': '0.7' })];
      default: return [];
    }
  }

  // Sun flush on the nose and cheeks for everyone; marks on top of it.
  function skinDetail(style, skin) {
    // Fainter on deeper skin, where a pink overlay reads as a patch.
    const k = U.clamp(U.luminance(skin) * 1.6, 0.25, 1);
    const flush = (o) => [
      s('ellipse', { cx: '37', cy: '51.5', rx: '5', ry: '3', fill: '#E0786A', 'fill-opacity': n(o * k) }),
      s('ellipse', { cx: '63', cy: '51.5', rx: '5', ry: '3', fill: '#E0786A', 'fill-opacity': n(o * k) }),
      s('ellipse', { cx: '50', cy: '52.6', rx: '2.4', ry: '1.6', fill: '#E0786A', 'fill-opacity': n(o * k * 0.8) })];
    const out = flush(style === 'blush' ? 0.26 : 0.07);
    if (style === 'freckles') {
      [[36.5, 49.5], [39, 51], [35.5, 52.2], [38.2, 53.4], [41, 49.8], [63.5, 49.5], [61, 51], [64.5, 52.2], [61.8, 53.4], [59, 49.8], [48.6, 48.6], [51.4, 48.6]]
        .forEach(([x, y]) => out.push(s('circle', { cx: String(x), cy: String(y), r: '0.55', fill: shade(skin, 0.32) })));
    }
    if (style === 'mole') out.push(s('circle', { cx: '59.2', cy: '58.4', r: '0.7', fill: shade(skin, 0.5) }));
    return out;
  }

  function gear(style) {
    switch (style) {
      case 'headband': return [p('M28.3 30.5 Q50 22.5 71.7 30.5 L71.7 35.5 Q50 27.5 28.3 35.5 Z', { class: 'avatar__trim' })];
      case 'visor': return [p('M28.3 30 Q50 23 71.7 30 L71.7 34 Q50 27 28.3 34 Z', { class: 'avatar__jersey' }), p('M25 33.5 Q50 24.5 75 33.5 Q77 37 73 38 Q50 30.5 27 38 Q23 37 25 33.5 Z', { class: 'avatar__jersey' }), p('M27 37.6 Q50 30.2 73 37.6', { fill: 'none', class: 'avatar__trim-line' })];
      default: return [];
    }
  }

  function ears(which, skin) {
    if (which === 'none') return [];
    const one = (x, inner) => [s('ellipse', { cx: String(x), cy: '47.5', rx: '3.5', ry: '5.6', fill: skin }), s('ellipse', { cx: String(inner), cy: '47.5', rx: '1.6', ry: '3.2', fill: shade(skin, 0.12) })];
    return []
      .concat(which === 'both' || which === 'left' ? one(30, 30.6) : [])
      .concat(which === 'both' || which === 'right' ? one(70, 69.4) : []);
  }

  function earrings(which, jewelry) {
    if (which === 'none' || !['studs', 'hoops', 'both'].includes(jewelry)) return [];
    const at = [];
    if (which === 'both' || which === 'left') at.push(29.6);
    if (which === 'both' || which === 'right') at.push(70.4);
    return at.map((x) => (jewelry === 'hoops'
      ? s('circle', { cx: String(x), cy: '54.6', r: '1.7', fill: 'none', stroke: GOLD, 'stroke-width': '0.6' })
      : s('circle', { cx: String(x), cy: '53.2', r: '0.85', fill: GOLD })));
  }

  // Neck (with tendons and a shadow under the chin), shoulders and top.
  function body(lk, skin) {
    const w = NECK[lk.build] || NECK.medium;
    const half = w / 2;
    const neck = shade(skin, 0.06);
    const line = { fill: 'none', stroke: shade(skin, 0.2), 'stroke-width': '0.8', 'stroke-opacity': '0.35', 'stroke-linecap': 'round' };
    const out = [
      p(`M${50 - half} 60 L${50 - half} 84 Q${50 - half - 1} 88.5 ${50 - half - 7} 90.5 L${50 + half + 7} 90.5 Q${50 + half + 1} 88.5 ${50 + half} 84 L${50 + half} 60 Z`, { fill: neck }),
      p(`M${n(50 - half + 3.5)} 72 Q${n(50 - 3)} 82 48 90`, line),
      p(`M${n(50 + half - 3.5)} 72 Q${n(50 + 3)} 82 52 90`, line),
      p('M40 66 Q50 79 60 66 L60 73 Q50 83 40 73 Z', { fill: shade(skin, 0.2), 'fill-opacity': '0.5' }),
      // Shoulders run off the frame, as in tight team headshots.
      p('M-6 100 C0 93 14 90 28 89 Q50 86.5 72 89 C86 90 100 93 106 100 Z', { fill: neck }),
      p('M35.5 92.2 Q41.5 90.6 47 92.6', line),
      p('M64.5 92.2 Q58.5 90.6 53 92.6', line)
    ];
    if (lk.top === 'tee') {
      out.push(p('M-6 100 C0 93.5 14 90.5 28 89.6 Q50 96.5 72 89.6 C86 90.5 100 93.5 106 100 Z', { class: 'avatar__jersey' }));
      out.push(p('M36.5 89.4 Q50 96.4 63.5 89.4', { fill: 'none', class: 'avatar__trim-line' }));
    } else if (lk.top === 'zip') {
      out.push(p('M-6 100 C0 93.5 14 90.5 28 89.6 L38 88 Q50 92 62 88 L72 89.6 C86 90.5 100 93.5 106 100 Z', { class: 'avatar__jersey' }));
      out.push(p(`M${50 - half - 1.5} 83 L${50 - half - 2} 89.5 Q50 94 ${50 + half + 2} 89.5 L${50 + half + 1.5} 83 Q50 86.5 ${50 - half - 1.5} 83 Z`, { class: 'avatar__jersey avatar__collar' }));
      out.push(p('M50 86.5 L50 100', { fill: 'none', class: 'avatar__trim-line avatar__zip' }));
    } else {
      const strap = lk.build === 'slim' ? 2.5 : 1;
      out.push(p(`M14 100 L${22 + strap} 89.4 L${30 + strap * 0.3} 89 Q50 104 ${70 - strap * 0.3} 89 L${78 - strap} 89.4 L86 100 Z`, { class: 'avatar__jersey' }));
      out.push(p(`M${30 + strap * 0.3} 89 Q50 104 ${70 - strap * 0.3} 89`, { fill: 'none', class: 'avatar__trim-line' }));
    }
    if (lk.jewelry === 'chain' || lk.jewelry === 'both') {
      out.push(p(`M${50 - half + 1} 82 Q50 ${lk.top === 'singlet' ? 92.5 : 89} ${50 + half - 1} 82`, { fill: 'none', stroke: GOLD, 'stroke-width': '0.55' }));
      if (lk.top === 'singlet') out.push(s('circle', { cx: '50', cy: '89.8', r: '0.9', fill: GOLD }));
    }
    return out;
  }

  /* ---------- Avatar ---------- */

  let clipCount = 0;

  // look: an a.look; label: accessible name; sizeClass: portrait size class.
  ui.avatar = function (look, label, sizeClass = '') {
    const lk = L.normalize(look);
    const skin = L.option('skin', lk.skin).hex;
    const hair = L.option('hairColor', lk.hairColor).hex;
    const hairStyle = (HAIR[lk.hair] || HAIR.fringe)(hair, skin);
    const hairColor = hairStyle.color || hair;
    const earSide = hairStyle.ears || 'both';
    const face = facialHair(lk.facial, shade(hair, 0.1));
    // Brows read darker than light hair.
    const browColor = U.luminance(hair) > 0.25 ? U.mixHex(hair, '#3A2A21', 0.45) : shade(hair, 0.15);
    const tilt = L.option('tilt', lk.tilt).deg || 0;
    const turn = tilt ? { transform: `rotate(${tilt} 50 82)` } : null;

    // Clip paths for facial hair: the face itself, and the face a little larger.
    const id = `avatar-clip-${++clipCount}`;
    const bigger = headShape(lk.face, '#000000');
    bigger.setAttribute('transform', 'translate(50 49) scale(1.15) translate(-50 -49)');
    const defs = s('defs', null,
      s('clipPath', { id: `${id}-face` }, headShape(lk.face, '#000000')),
      s('clipPath', { id: `${id}-beard` }, bigger));
    const facialUnder = face.clip ? s('g', { 'clip-path': `url(#${id}-${face.clip})` }, face.under) : face.under;
    // A thin outline in the hair color closes seams where hair shapes meet.
    const seam = (kids) => s('g', { stroke: hairColor, 'stroke-width': '0.5', 'stroke-linejoin': 'round' }, kids);

    return s('svg', { class: `portrait portrait--avatar ${sizeClass}`.trim(), viewBox: '0 0 100 100', role: 'img', 'aria-label': label },
      defs,
      s('g', turn,
        hairStyle.cap ? p(hairStyle.cap, { fill: hairColor }) : null,
        seam(hairStyle.back),
        ears(earSide, skin)),
      body(lk, skin),
      s('g', turn,
        headShape(lk.face, skin),
        lk.build === 'athletic' ? strokes(['M33.5 53 Q35 59 38 62.5', 'M66.5 53 Q65 59 62 62.5'], shade(skin, 0.14), 1.1, 0.35) : null,
        skinDetail(lk.marks, skin),
        facialUnder,
        nose(lk.nose, skin),
        mouth(lk.mouth, skin),
        face.over,
        eyes(lk.eyes, L.option('eyeColor', lk.eyeColor).hex, skin, lk.mouth === 'grin'),
        brows(lk.brows, browColor),
        seam(hairStyle.front),
        earrings(earSide, lk.jewelry),
        glasses(lk.glasses),
        gear(lk.gear)));
  };
})(window.XC = window.XC || {});
