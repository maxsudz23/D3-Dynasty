/* Draws a runner's look (XC.looks) as an SVG avatar: head and shoulders
   in a team singlet, on a 100×100 frame. The singlet uses the team colors
   through CSS classes; skin and hair colors are fill attributes. */
(function (XC) {
  'use strict';

  const U = XC.util;
  const L = XC.looks;
  const ui = XC.ui;
  const s = U.svg;

  const shade = (hex, t) => U.mixHex(hex, '#000000', t);
  const tint = (hex, t) => U.mixHex(hex, '#FFFFFF', t);
  const p = (d, attrs) => s('path', Object.assign({ d }, attrs));

  /* ---------- Head shapes (centered on x 50, temples at about 27 and 73) ---------- */

  const HEAD = {
    oval: (fill) => s('ellipse', { cx: '50', cy: '48', rx: '22.5', ry: '25.5', fill }),
    round: (fill) => s('ellipse', { cx: '50', cy: '49', rx: '23.5', ry: '23.5', fill }),
    long: (fill) => s('ellipse', { cx: '50', cy: '48', rx: '21', ry: '27', fill }),
    square: (fill) => p('M27.5 35 Q27.5 23 40 22.5 L60 22.5 Q72.5 23 72.5 35 L72.5 57 Q72.5 72 58 74 L42 74 Q27.5 72 27.5 57 Z', { fill }),
    heart: (fill) => p('M27 41 Q26.5 22.5 50 22.5 Q73.5 22.5 73 41 Q73 58 61 68 Q54 74 50 74 Q46 74 39 68 Q27 58 27 41 Z', { fill })
  };

  /* ---------- Hair: back layer (behind the head) and front layer ---------- */

  const SLEEK = 'M26.5 46 C24.5 24 36 15.5 50 15.5 C64 15.5 75.5 24 73.5 46 C72 33 63 25.5 50 25 C37 25.5 28 33 26.5 46 Z';
  function curls(cx, cy, rx, ry, from, to, n, r, fill) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = (from + ((to - from) * i) / n) * (Math.PI / 180);
      out.push(s('circle', { cx: U.round(cx + rx * Math.cos(t), 2), cy: U.round(cy + ry * Math.sin(t), 2), r: String(r), fill }));
    }
    return out;
  }

  const HAIR = {
    bald: () => ({ back: [], front: [] }),
    buzz: (c) => ({
      back: [],
      front: [p('M27.5 41 C26.5 25 38 18.5 50 18.5 C62 18.5 73.5 25 72.5 41 C69.5 32 62 27.5 50 27.5 C38 27.5 30.5 32 27.5 41 Z', { fill: c, 'fill-opacity': '0.78' })]
    }),
    crew: (c) => ({
      back: [],
      front: [p('M26.5 43 C24.5 23 37 15 50 15 C63 15 75.5 23 73.5 43 C71 33 64.5 28.5 57 28 C52 30 46 30 41 28 C35 28.5 29.5 33 26.5 43 Z', { fill: c })]
    }),
    sidepart: (c) => ({
      back: [],
      front: [p('M26 45 C23 21 36 13 52 13 C67 13 77.5 22 74 45 C73 33 69 27.5 62 25.5 C55 30.5 42 31 32 34 C29 37 27 41 26 45 Z', { fill: c }),
        p('M52 14 C55 20 60 24 62 25.5', { fill: 'none', stroke: shade(c, 0.35), 'stroke-width': '0.8' })]
    }),
    messy: (c) => ({
      back: [],
      front: [p('M26 43 L23.5 30 L31 32 L29.5 19.5 L38 25 L41.5 13 L48 21 L54 11 L58.5 21 L65.5 14.5 L66.5 25.5 L75 23 L71.5 31.5 L77 34 L74 43 C70.5 34.5 62 30 50 30 C38 30 30 34.5 26 43 Z', { fill: c })]
    }),
    curlyshort: (c) => ({
      back: [],
      front: [p('M27 42 C26 26 37 18 50 18 C63 18 74 26 73 42 C68 33 60 30 50 30 C40 30 32 33 27 42 Z', { fill: c })]
        .concat(curls(50, 30, 21.5, 13.5, 185, 355, 9, 5.6, c))
    }),
    afro: (c) => ({
      back: [s('circle', { cx: '50', cy: '35', r: '31', fill: c })],
      front: [p('M26.5 42 C25 23 37 17.5 50 17.5 C63 17.5 75 23 73.5 42 C68 33 60 30.5 50 30.5 C40 30.5 32 33 26.5 42 Z', { fill: c })]
    }),
    manbun: (c) => ({
      back: [s('circle', { cx: '50', cy: '13.5', r: '7.5', fill: c })],
      front: [p(SLEEK, { fill: c })]
    }),
    pixie: (c) => ({
      back: [],
      front: [p('M26 47 C22.5 22 38 13.5 52 14.5 C66 15.5 77.5 25 74 43 C70.5 34 62 30.5 54 32.5 C46 35 38 40.5 30.5 42.5 C28.5 43.5 27 45 26 47 Z', { fill: c })]
    }),
    ponytail: (c) => ({
      back: [p('M64 22 C80 17 88 33 83 52 C80.5 63 76.5 71 72 75 C75 61 75.5 46 68.5 34 Z', { fill: c })],
      front: [p(SLEEK, { fill: c }), s('rect', { x: '64', y: '20', width: '5', height: '6', rx: '1.5', fill: shade(c, 0.3), transform: 'rotate(-35 66.5 23)' })]
    }),
    bun: (c) => ({
      back: [s('circle', { cx: '50', cy: '13', r: '9.5', fill: c })],
      front: [p(SLEEK, { fill: c })]
    }),
    long: (c) => ({
      back: [p('M23.5 44 C21.5 21 36 11.5 50 11.5 C64 11.5 78.5 21 76.5 44 L78.5 87 C70.5 91 62.5 85 62.5 74 L37.5 74 C37.5 85 29.5 91 21.5 87 Z', { fill: c })],
      front: [p('M26 52 C23.5 24 36 13.5 50 13.5 C64 13.5 76.5 24 74 52 C72.5 36.5 62.5 25.5 50 23.5 C37.5 25.5 27.5 36.5 26 52 Z', { fill: c })]
    }),
    bob: (c) => ({
      back: [p('M22.5 46 C20.5 21 35.5 12.5 50 12.5 C64.5 12.5 79.5 21 77.5 46 L77.5 69 L66 69 L66 62 L34 62 L34 69 L22.5 69 Z', { fill: c })],
      front: [p('M26.5 44 C25.5 22 38 14.5 50 14.5 C62 14.5 74.5 22 73.5 44 L73 38.5 C66 37 59 36 50 36 C41 36 34 37 27 38.5 Z', { fill: c })]
    }),
    braids: (c) => {
      const braid = (x) => [0, 1, 2, 3, 4, 5].map((i) => s('ellipse', { cx: String(x), cy: String(58 + i * 6), rx: '3.6', ry: '3.4', fill: i % 2 ? shade(c, 0.18) : c }));
      return { back: braid(26).concat(braid(74)), front: [p(SLEEK, { fill: c })] };
    },
    curlylong: (c) => ({
      back: [p('M22 46 C20 20 36 11 50 11 C64 11 80 20 78 46 L80 80 L20 80 Z', { fill: c })]
        .concat(curls(50, 52, 30, 30, 95, 265, 7, 7, c), curls(50, 52, 30, 30, -85, 85, 7, 7, c)),
      front: curls(50, 29, 22, 12, 185, 355, 8, 6, c).concat([p('M27 46 C26 27 37 19 50 19 C63 19 74 27 73 46 C70 34 61 29 50 29 C39 29 30 34 27 46 Z', { fill: c })])
    }),
    puffs: (c) => ({
      back: [s('circle', { cx: '28', cy: '21', r: '11', fill: c }), s('circle', { cx: '72', cy: '21', r: '11', fill: c })],
      front: [p(SLEEK, { fill: c })]
    })
  };

  /* ---------- Features ---------- */

  const EYE_X = [41, 59];
  const INK = '#231A16';
  function eyes(style) {
    return EYE_X.flatMap((x) => {
      switch (style) {
        case 'almond': return [s('ellipse', { cx: String(x), cy: '49', rx: '3.3', ry: '2', fill: INK }), s('circle', { cx: String(x + 1), cy: '48.4', r: '0.6', fill: '#FFFFFF' })];
        case 'narrow': return [s('ellipse', { cx: String(x), cy: '49', rx: '3.1', ry: '1.1', fill: INK })];
        case 'wide': return [s('ellipse', { cx: String(x), cy: '49', rx: '3.6', ry: '2.9', fill: '#FFFFFF' }), s('circle', { cx: String(x), cy: '49.3', r: '1.9', fill: INK }), s('circle', { cx: String(x + 0.7), cy: '48.5', r: '0.6', fill: '#FFFFFF' })];
        case 'sleepy': return [p(`M${x - 3.2} 48.6 Q${x} 52 ${x + 3.2} 48.6 Z`, { fill: INK })];
        case 'happy': return [p(`M${x - 3.2} 50 Q${x} 46.2 ${x + 3.2} 50`, { fill: 'none', stroke: INK, 'stroke-width': '1.5', 'stroke-linecap': 'round' })];
        default: return [s('circle', { cx: String(x), cy: '49', r: '2.5', fill: INK }), s('circle', { cx: String(x + 0.8), cy: '48.2', r: '0.7', fill: '#FFFFFF' })];
      }
    });
  }

  function brows(style, color) {
    const width = style === 'thick' ? 2.8 : style === 'thin' ? 0.9 : 1.6;
    const lift = style === 'raised' ? -2.2 : 0;
    const a = { fill: 'none', stroke: color, 'stroke-width': String(width), 'stroke-linecap': 'round' };
    const y = 42 + lift;
    switch (style) {
      case 'angled': return [p(`M37 ${y - 1} L45 ${y + 1}`, a), p(`M55 ${y + 1} L63 ${y - 1}`, a)];
      case 'arched': case 'thin': case 'raised': return [p(`M37 ${y + 1} Q41 ${y - 2.2} 45 ${y}`, a), p(`M55 ${y} Q59 ${y - 2.2} 63 ${y + 1}`, a)];
      default: return [p(`M37 ${y} L45 ${y}`, a), p(`M55 ${y} L63 ${y}`, a)];
    }
  }

  function nose(style, skin) {
    const line = { fill: 'none', stroke: shade(skin, 0.32), 'stroke-width': '1.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
    switch (style) {
      case 'long': return [p('M50.5 50.5 L48.5 57 Q50 58.6 52 57.6', line)];
      case 'wide': return [p('M45.5 56.5 Q50 60.5 54.5 56.5', line), s('circle', { cx: '47.8', cy: '57.4', r: '0.6', fill: shade(skin, 0.4) }), s('circle', { cx: '52.2', cy: '57.4', r: '0.6', fill: shade(skin, 0.4) })];
      case 'small': return [s('circle', { cx: '48.7', cy: '57', r: '0.7', fill: shade(skin, 0.38) }), s('circle', { cx: '51.3', cy: '57', r: '0.7', fill: shade(skin, 0.38) })];
      case 'pointy': return [p('M50.5 51 L47.5 57.5 L51.5 57.5', line)];
      default: return [p('M47.8 56.8 Q50 59.2 52.2 56.8', line)];
    }
  }

  function mouth(style, skin) {
    const lip = U.mixHex(skin, '#7A2E2A', 0.55);
    const inside = '#5A2420';
    const line = { fill: 'none', stroke: lip, 'stroke-width': '1.5', 'stroke-linecap': 'round' };
    switch (style) {
      case 'grin': return [p('M43.5 62.5 Q50 70.5 56.5 62.5 Z', { fill: inside }), p('M44.6 63 L55.4 63 Q54.8 64.8 50 64.8 Q45.2 64.8 44.6 63 Z', { fill: '#FFFFFF' })];
      case 'neutral': return [p('M45.5 64 L54.5 64', line)];
      case 'smirk': return [p('M45 64.2 Q51 65.6 56 62', line)];
      case 'open': return [s('ellipse', { cx: '50', cy: '64.5', rx: '3', ry: '2.5', fill: inside })];
      default: return [p('M44.5 63 Q50 67.8 55.5 63', line)];
    }
  }

  function facialHair(style, color) {
    const beardPath = 'M27.5 49 Q27 76 50 78.5 Q73 76 72.5 49 Q71 61 63 66 Q57 68.5 50 68.5 Q43 68.5 37 66 Q29 61 27.5 49 Z';
    const stache = p('M42.5 62 Q46 58.6 50 60.2 Q54 58.6 57.5 62 Q50 61 42.5 62 Z', { fill: color });
    switch (style) {
      case 'stubble': return { under: [p(beardPath, { fill: color, 'fill-opacity': '0.22' }), p('M42.5 61.8 Q50 58.8 57.5 61.8 Q50 60.8 42.5 61.8 Z', { fill: color, 'fill-opacity': '0.25' })], over: [] };
      case 'mustache': return { under: [], over: [stache] };
      case 'goatee': return { under: [p('M44.5 67 Q50 73 55.5 67 Q50 69.5 44.5 67 Z', { fill: color })], over: [stache] };
      case 'beard': return { under: [p(beardPath, { fill: color })], over: [stache] };
      default: return { under: [], over: [] };
    }
  }

  function glasses(style) {
    const frame = { fill: 'none', stroke: '#22262C', 'stroke-width': '1.3' };
    const arms = [p('M35.5 48 L28 47', frame), p('M64.5 48 L72 47', frame)];
    switch (style) {
      case 'round': return [s('circle', Object.assign({ cx: '41', cy: '49', r: '5' }, frame)), s('circle', Object.assign({ cx: '59', cy: '49', r: '5' }, frame)), p('M46 48.5 Q50 46.5 54 48.5', frame)].concat(arms);
      case 'square': return [s('rect', Object.assign({ x: '35', y: '45', width: '12', height: '8', rx: '1.6' }, frame)), s('rect', Object.assign({ x: '53', y: '45', width: '12', height: '8', rx: '1.6' }, frame)), p('M47 48.5 L53 48.5', frame)].concat(arms);
      case 'sport': return [p('M32.5 46 Q50 42.5 67.5 46 L66.5 52 Q59 55.5 52 51.5 L48 51.5 Q41 55.5 33.5 52 Z', { fill: '#1F262F' }), p('M36 47 Q42 45.5 46 46.5', { fill: 'none', stroke: '#8FB4D8', 'stroke-width': '0.8', 'stroke-opacity': '0.7' })];
      default: return [];
    }
  }

  function marks(style, skin) {
    switch (style) {
      case 'freckles': return [[36, 55], [38.6, 57], [35, 58.6], [64, 55], [61.4, 57], [65, 58.6], [50, 53]].map(([x, y]) => s('circle', { cx: String(x), cy: String(y), r: '0.6', fill: shade(skin, 0.35) }));
      case 'blush': return [s('ellipse', { cx: '36', cy: '58', rx: '3.6', ry: '2', fill: '#E8837A', 'fill-opacity': '0.35' }), s('ellipse', { cx: '64', cy: '58', rx: '3.6', ry: '2', fill: '#E8837A', 'fill-opacity': '0.35' })];
      case 'mole': return [s('circle', { cx: '60.5', cy: '62', r: '0.8', fill: shade(skin, 0.5) })];
      default: return [];
    }
  }

  function gear(style) {
    switch (style) {
      case 'headband': return [p('M25.5 36.5 Q50 30 74.5 36.5 L74.5 42 Q50 35.5 25.5 42 Z', { class: 'avatar__trim' })];
      case 'visor': return [p('M26 37 Q50 31 74 37 L74 41 Q50 35.5 26 41 Z', { class: 'avatar__jersey' }), p('M23 40.5 Q50 31.5 77 40.5 Q79 44 75 45 Q50 37.5 25 45 Q21 44 23 40.5 Z', { class: 'avatar__jersey' }), p('M25 44.6 Q50 37.2 75 44.6', { fill: 'none', class: 'avatar__trim-line' })];
      default: return [];
    }
  }

  /* ---------- Avatar ---------- */

  // look: an a.look; label: accessible name; sizeClass: portrait size class.
  ui.avatar = function (look, label, sizeClass = '') {
    const lk = L.normalize(look);
    const skin = L.option('skin', lk.skin).hex;
    const hair = L.option('hairColor', lk.hairColor).hex;
    const hairStyle = (HAIR[lk.hair] || HAIR.crew)(hair);
    const face = facialHair(lk.facial, shade(hair, 0.1));
    const neck = shade(skin, 0.14);
    return s('svg', { class: `portrait portrait--avatar ${sizeClass}`.trim(), viewBox: '0 0 100 100', role: 'img', 'aria-label': label },
      hairStyle.back,
      s('ellipse', { cx: '27', cy: '51', rx: '4.2', ry: '6', fill: skin }),
      s('ellipse', { cx: '73', cy: '51', rx: '4.2', ry: '6', fill: skin }),
      s('ellipse', { cx: '27.4', cy: '51', rx: '2', ry: '3.4', fill: shade(skin, 0.12) }),
      s('ellipse', { cx: '72.6', cy: '51', rx: '2', ry: '3.4', fill: shade(skin, 0.12) }),
      p('M42 64 L42 82 L58 82 L58 64 Z', { fill: neck }),
      // The singlet, with a sash in the accent color.
      p('M6 100 C8 88 21 82 35 80 Q50 89 65 80 C79 82 92 88 94 100 Z', { class: 'avatar__jersey' }),
      p('M28 100 L69.5 80.6 L76 82.4 L39 100 Z', { class: 'avatar__trim' }),
      p('M35 80 Q50 89 65 80', { fill: 'none', class: 'avatar__trim-line' }),
      HEAD[lk.face] ? HEAD[lk.face](skin) : HEAD.oval(skin),
      // A soft shine on the forehead.
      s('ellipse', { cx: '43', cy: '33', rx: '7', ry: '4', fill: tint(skin, 0.5), 'fill-opacity': '0.25' }),
      marks(lk.marks, skin),
      face.under,
      nose(lk.nose, skin),
      mouth(lk.mouth, skin),
      face.over,
      eyes(lk.eyes),
      brows(lk.brows, shade(hair, 0.2)),
      hairStyle.front,
      glasses(lk.glasses),
      gear(lk.gear));
  };
})(window.XC = window.XC || {});
