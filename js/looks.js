/* Looks for generated runners: cartoon avatars built from parts. Each
   generated runner and recruit gets a look seeded by their id, so it's the
   same every time; the coach can change any of it on the look editor. Real
   roster athletes never get one: they keep their photo (or the silhouette).

   Version 2 (2026-11-16) is modeled on 100 real D3 cross country headshots
   (10 programs, 10 conferences, 5 men and 5 women each), measured for
   proportions, skin and hair colors, hairstyles, facial hair, accessories
   and expressions. Only aggregate numbers were kept; see CLAUDE.md, Looks.

   a.look = { v: 2, skin, face, build, hair, hairColor, eyes, eyeColor, brows,
   nose, mouth, facial, glasses, marks, jewelry, gear, top, tilt }, every value
   an option id below.
   Pure: no DOM. Drawing is in ui/avatar.js. */
(function (XC) {
  'use strict';

  const U = XC.util;
  const L = {};

  L.VERSION = 2;

  // Option weights: w for everyone, or M and W for the men's and women's
  // squads (the shares measured in the headshots). Every option is open to
  // everyone in the editor.

  // Measured cheek averages (warm, a little pink), light to deep.
  L.SKIN = [
    { id: 's1', label: 'Porcelain', hex: '#F7CEC2', M: 9, W: 17 },
    { id: 's2', label: 'Fair', hex: '#EFB7A5', M: 9, W: 12 },
    { id: 's3', label: 'Light', hex: '#E9AD92', M: 12, W: 15 },
    { id: 's4', label: 'Light medium', hex: '#DCA085', M: 18, W: 21 },
    { id: 's5', label: 'Medium', hex: '#D09179', M: 20, W: 19 },
    { id: 's6', label: 'Tan', hex: '#C08470', M: 22, W: 7 },
    { id: 's7', label: 'Brown', hex: '#A56C56', M: 6, W: 5 },
    { id: 's8', label: 'Deep', hex: '#7F4A35', M: 3, W: 3 },
    { id: 's9', label: 'Very deep', hex: '#5A3325', M: 1, W: 1 }
  ];

  // Measured hair bases, nudged for a cartoon. Photos desaturate hair.
  L.HAIR_COLOR = [
    { id: 'black', label: 'Black', hex: '#1E1917' },
    { id: 'darkbrown', label: 'Dark brown', hex: '#3A2A21' },
    { id: 'brown', label: 'Brown', hex: '#553A2A' },
    { id: 'lightbrown', label: 'Light brown', hex: '#765438' },
    { id: 'honey', label: 'Honey', hex: '#9A7550' },
    { id: 'blonde', label: 'Blonde', hex: '#C4A473' },
    { id: 'platinum', label: 'Platinum', hex: '#D8CDB0' },
    { id: 'auburn', label: 'Auburn', hex: '#8A5A36' },
    { id: 'ginger', label: 'Ginger', hex: '#B4612F' },
    { id: 'gray', label: 'Gray', hex: '#9A9894' },
    { id: 'blue', label: 'Dyed blue', hex: '#3C6FB0' },
    { id: 'pink', label: 'Dyed pink', hex: '#C9628F' },
    { id: 'green', label: 'Dyed green', hex: '#3E9A63' }
  ];

  L.HAIR = [
    // Men's core set, by measured share.
    { id: 'fringe', label: 'Textured fringe', M: 22, W: 0.3 },
    { id: 'sidepart', label: 'Side part', M: 14, W: 0.3 },
    { id: 'curlytop', label: 'Curls on top', M: 14, W: 0.3 },
    { id: 'flow', label: 'Flow', M: 12, W: 0.5 },
    { id: 'taper', label: 'Taper fade', M: 10, W: 0.2 },
    { id: 'messy', label: 'Messy', M: 10, W: 0.3 },
    { id: 'curlymop', label: 'Curly mop', M: 6, W: 0.4 },
    { id: 'curtain', label: 'Curtain part', M: 6, W: 0.4 },
    { id: 'shag', label: 'Shag', M: 4, W: 0.5 },
    { id: 'afro', label: 'Afro', M: 2, W: 0.5 },
    { id: 'curlyshort', label: 'Short curls', M: 1.5, W: 0.2 },
    { id: 'crew', label: 'Crew cut', M: 1, W: 0.05 },
    { id: 'buzz', label: 'Buzz cut', M: 1, W: 0.05 },
    { id: 'manbun', label: 'Top knot', M: 0.5, W: 0.1 },
    { id: 'bald', label: 'Shaved', M: 0.5, W: 0.02 },
    // Women's: almost always worn down in headshots.
    { id: 'long', label: 'Long, middle part', M: 0.3, W: 30 },
    { id: 'longwave', label: 'Long waves', M: 0.2, W: 22 },
    { id: 'longside', label: 'Long, side part', M: 0.1, W: 15 },
    { id: 'bob', label: 'Shoulder length', M: 0.2, W: 12 },
    { id: 'curlylong', label: 'Long curls', M: 0.2, W: 10 },
    { id: 'tucked', label: 'Tucked behind ear', M: 0.05, W: 6 },
    { id: 'bangs', label: 'Bangs', M: 0.02, W: 2 },
    { id: 'halfup', label: 'Half up', M: 0.05, W: 2 },
    { id: 'braids', label: 'Box braids', M: 0.2, W: 2 },
    { id: 'ponytail', label: 'Ponytail', M: 0.05, W: 3 },
    { id: 'bun', label: 'Bun', M: 0.02, W: 2 },
    { id: 'pixie', label: 'Pixie', M: 0.1, W: 1 },
    { id: 'puffs', label: 'Puffs', M: 0.02, W: 0.5 }
  ];

  L.FACE = [
    { id: 'oval', label: 'Oval', w: 4 },
    { id: 'long', label: 'Long', w: 2 },
    { id: 'square', label: 'Square jaw', w: 2 },
    { id: 'heart', label: 'Heart', w: 1.5 },
    { id: 'round', label: 'Round', w: 1 }
  ];
  // Neck and shoulders: the men measured broader (neck 0.69 of face width)
  // than the women (0.61).
  L.BUILD = [
    { id: 'slim', label: 'Slim', M: 1, W: 7 },
    { id: 'medium', label: 'Medium', M: 4, W: 3 },
    { id: 'athletic', label: 'Broad', M: 5, W: 0.3 }
  ];
  L.EYES = [
    { id: 'almond', label: 'Almond', w: 50 },
    { id: 'round', label: 'Round', w: 15 },
    { id: 'narrow', label: 'Narrow', w: 12 },
    { id: 'sleepy', label: 'Hooded', w: 13 },
    { id: 'wide', label: 'Wide', w: 5 },
    { id: 'happy', label: 'Closed', w: 2 }
  ];
  L.EYE_COLOR = [
    { id: 'brown', label: 'Brown', hex: '#5A3A24' },
    { id: 'darkbrown', label: 'Dark brown', hex: '#2E1F16' },
    { id: 'hazel', label: 'Hazel', hex: '#7D6235' },
    { id: 'green', label: 'Green', hex: '#4F7A4C' },
    { id: 'blue', label: 'Blue', hex: '#4E7FAF' },
    { id: 'gray', label: 'Gray', hex: '#7A8892' }
  ];
  L.BROWS = [
    { id: 'flat', label: 'Straight', M: 30, W: 10 },
    { id: 'angled', label: 'Angled', M: 25, W: 2 },
    { id: 'thick', label: 'Thick', M: 30, W: 4 },
    { id: 'soft', label: 'Soft arch', M: 3, W: 50 },
    { id: 'arched', label: 'Arched', M: 7, W: 28 },
    { id: 'thin', label: 'Thin', M: 1, W: 4 },
    { id: 'raised', label: 'Raised', M: 4, W: 2 }
  ];
  L.NOSE = [
    { id: 'button', label: 'Button', w: 30 },
    { id: 'long', label: 'Straight', w: 25 },
    { id: 'small', label: 'Small', w: 20 },
    { id: 'wide', label: 'Wide', w: 15 },
    { id: 'pointy', label: 'Pointed', w: 10 }
  ];
  // Teeth smiles dominate team headshots.
  L.MOUTH = [
    { id: 'grin', label: 'Big smile', M: 64, W: 86 },
    { id: 'smile', label: 'Smile', M: 14, W: 12 },
    { id: 'neutral', label: 'Neutral', M: 20, W: 1 },
    { id: 'smirk', label: 'Smirk', M: 1, W: 1 },
    { id: 'open', label: 'Breathing hard', M: 0.5, W: 0.3 }
  ];
  L.FACIAL = [
    { id: 'none', label: 'None', M: 84, W: 1 },
    { id: 'stubble', label: 'Stubble', M: 6, W: 0 },
    { id: 'mustache', label: 'Mustache', M: 4, W: 0 },
    { id: 'goatee', label: 'Mustache and chin', M: 4, W: 0 },
    { id: 'beard', label: 'Beard', M: 2, W: 0 }
  ];
  L.GLASSES = [
    { id: 'none', label: 'None', M: 94, W: 98 },
    { id: 'round', label: 'Round frames', M: 2, W: 0.7 },
    { id: 'square', label: 'Square frames', M: 2, W: 0.7 },
    { id: 'clear', label: 'Clear frames', M: 2, W: 0.6 },
    { id: 'sport', label: 'Sport shades', M: 0, W: 0 }
  ];
  L.MARKS = [
    { id: 'none', label: 'None', M: 84, W: 74 },
    { id: 'freckles', label: 'Freckles', M: 4, W: 14 },
    { id: 'blush', label: 'Rosy cheeks', M: 10, W: 10 },
    { id: 'mole', label: 'Beauty mark', M: 2, W: 2 }
  ];
  L.JEWELRY = [
    { id: 'none', label: 'None', M: 86, W: 50 },
    { id: 'chain', label: 'Necklace', M: 12, W: 34 },
    { id: 'studs', label: 'Earrings', M: 2, W: 6 },
    { id: 'hoops', label: 'Hoops', M: 0, W: 4 },
    { id: 'both', label: 'Necklace and earrings', M: 0, W: 6 }
  ];
  L.GEAR = [
    { id: 'none', label: 'None', w: 99 },
    { id: 'headband', label: 'Headband', w: 0.7 },
    { id: 'visor', label: 'Visor', w: 0.3 }
  ];
  L.TOP = [
    { id: 'singlet', label: 'Singlet', w: 80 },
    { id: 'zip', label: 'Quarter zip', w: 10 },
    { id: 'tee', label: 'T-shirt', w: 10 }
  ];
  // Head tilt in degrees: about 30% of women tilt, 5% of men.
  L.TILT = [
    { id: 'none', label: 'Straight', deg: 0, M: 95, W: 70 },
    { id: 'left', label: 'Tilted left', deg: -4.5, M: 2.5, W: 15 },
    { id: 'right', label: 'Tilted right', deg: 4.5, M: 2.5, W: 15 }
  ];

  // Editor rows, in order: [field, label, options, kind].
  L.FIELDS = [
    ['skin', 'Skin', L.SKIN, 'swatch'],
    ['face', 'Face shape', L.FACE, 'step'],
    ['build', 'Build', L.BUILD, 'step'],
    ['hair', 'Hair', L.HAIR, 'step'],
    ['hairColor', 'Hair color', L.HAIR_COLOR, 'swatch'],
    ['eyes', 'Eyes', L.EYES, 'step'],
    ['eyeColor', 'Eye color', L.EYE_COLOR, 'swatch'],
    ['brows', 'Eyebrows', L.BROWS, 'step'],
    ['nose', 'Nose', L.NOSE, 'step'],
    ['mouth', 'Mouth', L.MOUTH, 'step'],
    ['facial', 'Facial hair', L.FACIAL, 'step'],
    ['glasses', 'Glasses', L.GLASSES, 'step'],
    ['marks', 'Face details', L.MARKS, 'step'],
    ['jewelry', 'Jewelry', L.JEWELRY, 'step'],
    ['gear', 'Headwear', L.GEAR, 'step'],
    ['top', 'Top', L.TOP, 'step'],
    ['tilt', 'Head tilt', L.TILT, 'step']
  ];
  const OPTIONS = Object.fromEntries(L.FIELDS.map(([f, , opts]) => [f, opts]));

  L.optionsFor = (field) => OPTIONS[field] || [];
  L.option = (field, id) => L.optionsFor(field).find((o) => o.id === id) || L.optionsFor(field)[0];

  function pickWeighted(opts, weightOf, rng) {
    const total = opts.reduce((s, o) => s + weightOf(o), 0);
    let r = rng() * total;
    for (const o of opts) {
      r -= weightOf(o);
      if (r < 0) return o.id;
    }
    return opts[opts.length - 1].id;
  }
  const weightFor = (side) => (o) => (o[side] !== undefined ? o[side] : o.w !== undefined ? o.w : 1);

  // Natural hair colors lean on skin tone; blonde is twice as common on
  // the women's side; dyed colors are rare.
  function hairColorFor(dark, side, rng) {
    const light = 1 - dark;
    const w = {
      black: 3 + dark * 30, darkbrown: 22 + dark * 8, brown: 14, lightbrown: 17 * light + 1, honey: 10 * light + 0.5,
      blonde: (side === 'W' ? 18 : 8) * light ** 2, platinum: (side === 'W' ? 4 : 0.5) * light ** 2,
      auburn: 5 * light, ginger: 0.6 * light ** 2, gray: 0.05, blue: 0.3, pink: 0.3, green: 0.2
    };
    return pickWeighted(L.HAIR_COLOR, (o) => w[o.id] || 0, rng);
  }

  function eyeColorFor(dark, rng) {
    const light = 1 - dark;
    const w = { brown: 35, darkbrown: 10 + dark * 40, hazel: 12 * light + 2, green: 9 * light ** 2, blue: 24 * light ** 2, gray: 3 * light ** 2 };
    return pickWeighted(L.EYE_COLOR, (o) => w[o.id] || 0, rng);
  }

  // A seeded look. seedKey: anything stable (the athlete's id); sq: 'M' or 'W'.
  L.generate = function (seedKey, sq = 'M', rng = null) {
    const r = rng || U.mulberry32(U.hash(`look2|${seedKey}`));
    const side = sq === 'W' ? 'W' : 'M';
    const by = weightFor(side);
    const skin = pickWeighted(L.SKIN, by, r);
    const dark = L.SKIN.findIndex((o) => o.id === skin) / (L.SKIN.length - 1);
    return {
      v: L.VERSION,
      skin,
      face: pickWeighted(L.FACE, by, r),
      build: pickWeighted(L.BUILD, by, r),
      hair: pickWeighted(L.HAIR, by, r),
      hairColor: hairColorFor(dark, side, r),
      eyes: pickWeighted(L.EYES, by, r),
      eyeColor: eyeColorFor(dark, r),
      brows: pickWeighted(L.BROWS, by, r),
      nose: pickWeighted(L.NOSE, by, r),
      mouth: pickWeighted(L.MOUTH, by, r),
      facial: pickWeighted(L.FACIAL, by, r),
      glasses: pickWeighted(L.GLASSES, by, r),
      marks: pickWeighted(L.MARKS, by, r),
      jewelry: pickWeighted(L.JEWELRY, by, r),
      gear: pickWeighted(L.GEAR, by, r),
      top: pickWeighted(L.TOP, by, r),
      tilt: pickWeighted(L.TILT, by, r)
    };
  };

  // Fill in or repair any field. Missing fields come from `fill` (a
  // generated look) when given, so new fields are seeded, not defaulted.
  L.normalize = function (look, fill = null) {
    const out = { v: L.VERSION };
    L.FIELDS.forEach(([f]) => {
      const have = look && look[f] !== undefined ? look[f] : fill ? fill[f] : undefined;
      out[f] = L.option(f, have).id;
    });
    return out;
  };

  // Step a field to the next or previous option.
  L.step = function (look, field, dir) {
    const opts = L.optionsFor(field);
    const i = opts.findIndex((o) => o.id === look[field]);
    look[field] = opts[(i + dir + opts.length) % opts.length].id;
    return look;
  };

  /* ---------- Version 1 (before the headshot study) ----------
     Kept only to recognize looks nobody edited: those move to the new
     generator; edited ones are kept and get the new fields. This must
     reproduce the old generator exactly (same tables, same draw order). */
  const V1 = {
    skin: [['s1', 1], ['s2', 1.4], ['s3', 1.4], ['s4', 1.1], ['s5', 0.9], ['s6', 0.8], ['s7', 0.8], ['s8', 0.7]],
    hairColor: ['black', 'darkbrown', 'brown', 'lightbrown', 'auburn', 'ginger', 'blonde', 'platinum', 'gray', 'blue', 'pink', 'green'],
    hair: [['buzz', 3, 0.2], ['crew', 4, 0.2], ['sidepart', 3, 0.3], ['messy', 2.5, 0.4], ['curlyshort', 2.5, 0.5], ['afro', 1, 0.6],
      ['manbun', 0.8, 0.3], ['bald', 0.6, 0.05], ['pixie', 0.1, 1.2], ['ponytail', 0.1, 5], ['bun', 0.05, 2.5], ['long', 0.4, 2.5],
      ['bob', 0.05, 1.5], ['braids', 0.2, 1.5], ['curlylong', 0.2, 1.4], ['puffs', 0.05, 0.8]],
    face: ['oval', 'round', 'long', 'square', 'heart'],
    eyes: ['round', 'almond', 'narrow', 'wide', 'sleepy', 'happy'],
    brows: ['flat', 'arched', 'angled', 'thick', 'thin', 'raised'],
    nose: ['button', 'long', 'wide', 'small', 'pointy'],
    mouth: [['smile', 1], ['grin', 1], ['neutral', 1], ['smirk', 1], ['open', 0.4]],
    facial: [['none', 60, 1], ['stubble', 18, 0], ['mustache', 4, 0], ['goatee', 7, 0], ['beard', 9, 0]],
    glasses: [['none', 86], ['round', 5], ['square', 5], ['sport', 4]],
    marks: [['none', 70], ['freckles', 14], ['blush', 12], ['mole', 4]],
    gear: [['none', 80], ['headband', 14], ['visor', 6]]
  };
  function pickPairs(pairs, rng) {
    return pickWeighted(pairs.map(([id, w]) => ({ id, w })), (o) => o.w, rng);
  }
  L.legacyGenerate = function (seedKey, sq = 'M') {
    const r = U.mulberry32(U.hash(`look|${seedKey}`));
    const skin = pickPairs(V1.skin, r);
    const dark = V1.skin.findIndex(([id]) => id === skin) / (V1.skin.length - 1);
    const sideIdx = sq === 'W' ? 2 : 1;
    const uniform = (ids) => U.pick(ids, r);
    const out = { skin, face: uniform(V1.face) };
    out.hair = pickWeighted(V1.hair.map((h) => ({ id: h[0], w: h[sideIdx] })), (o) => o.w, r);
    const w = {
      black: 1 + dark * 6, darkbrown: 2 + dark * 2, brown: 2.5, lightbrown: 2 * (1 - dark) + 0.2,
      auburn: 0.8 * (1 - dark), ginger: 0.7 * (1 - dark) ** 2, blonde: 2 * (1 - dark) ** 2,
      platinum: 0.4 * (1 - dark) ** 2, gray: 0.03, blue: 0.08, pink: 0.08, green: 0.04
    };
    out.hairColor = pickWeighted(V1.hairColor.map((id) => ({ id })), (o) => w[o.id] || 0, r);
    out.eyes = uniform(V1.eyes);
    out.brows = uniform(V1.brows);
    out.nose = uniform(V1.nose);
    out.mouth = pickPairs(V1.mouth, r);
    out.facial = pickWeighted(V1.facial.map((f) => ({ id: f[0], w: f[sideIdx] })), (o) => o.w, r);
    out.glasses = pickPairs(V1.glasses, r);
    out.marks = pickPairs(V1.marks, r);
    out.gear = pickPairs(V1.gear, r);
    return out;
  };
  const V1_FIELDS = ['skin', 'face', 'hair', 'hairColor', 'eyes', 'brows', 'nose', 'mouth', 'facial', 'glasses', 'marks', 'gear'];

  // Generated runners get a look; real roster athletes never do. Version 1
  // looks nobody edited move to the new generator; edited ones keep their
  // choices and get seeded values for the new fields.
  L.ensure = function (a, sq) {
    if (!a || a.real) return a;
    if (!a.look) {
      a.look = L.generate(a.id, sq);
    } else if (a.look.v !== L.VERSION) {
      const old = L.legacyGenerate(a.id, sq);
      const untouched = V1_FIELDS.every((f) => a.look[f] === old[f]);
      a.look = untouched ? L.generate(a.id, sq) : L.normalize(a.look, L.generate(a.id, sq));
    } else {
      a.look = L.normalize(a.look, L.generate(a.id, sq));
    }
    return a;
  };

  XC.looks = L;
})(window.XC = window.XC || {});
