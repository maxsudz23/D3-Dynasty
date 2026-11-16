/* Looks for generated runners: cartoon avatars built from parts (skin,
   face shape, hair and hair color, eyes, brows, nose, mouth, facial hair,
   glasses, face details, headwear). Each generated runner and recruit gets
   a look seeded by their id, so it's the same every time; the coach can
   change any of it on the look editor. Real roster athletes never get one:
   they keep their photo (or the silhouette).
   a.look = { skin, face, hair, hairColor, eyes, brows, nose, mouth,
   facial, glasses, marks, gear }, every value an option id below.
   Pure: no DOM. Drawing is in ui/avatar.js. */
(function (XC) {
  'use strict';

  const U = XC.util;
  const L = {};

  // w: generation weight for the men's (M) and women's (W) squads.
  // Every option is available to everyone in the editor.
  L.SKIN = [
    { id: 's1', label: 'Porcelain', hex: '#F9E1CF', w: 1 },
    { id: 's2', label: 'Fair', hex: '#F2CBA8', w: 1.4 },
    { id: 's3', label: 'Light', hex: '#E5B48A', w: 1.4 },
    { id: 's4', label: 'Medium', hex: '#D19A6A', w: 1.1 },
    { id: 's5', label: 'Olive', hex: '#B97F4F', w: 0.9 },
    { id: 's6', label: 'Tan', hex: '#9C6439', w: 0.8 },
    { id: 's7', label: 'Brown', hex: '#7A4A2A', w: 0.8 },
    { id: 's8', label: 'Deep', hex: '#55321D', w: 0.7 }
  ];

  L.HAIR_COLOR = [
    { id: 'black', label: 'Black', hex: '#1E1A18' },
    { id: 'darkbrown', label: 'Dark brown', hex: '#3B2A20' },
    { id: 'brown', label: 'Brown', hex: '#5E3B22' },
    { id: 'lightbrown', label: 'Light brown', hex: '#8C5E34' },
    { id: 'auburn', label: 'Auburn', hex: '#8E3B1F' },
    { id: 'ginger', label: 'Ginger', hex: '#C2561B' },
    { id: 'blonde', label: 'Blonde', hex: '#D6AE62' },
    { id: 'platinum', label: 'Platinum', hex: '#EBDDB2' },
    { id: 'gray', label: 'Gray', hex: '#9A9894' },
    { id: 'blue', label: 'Dyed blue', hex: '#3C6FB0' },
    { id: 'pink', label: 'Dyed pink', hex: '#D0609A' },
    { id: 'green', label: 'Dyed green', hex: '#3E9A63' }
  ];

  L.HAIR = [
    { id: 'buzz', label: 'Buzz cut', M: 3, W: 0.2 },
    { id: 'crew', label: 'Crew cut', M: 4, W: 0.2 },
    { id: 'sidepart', label: 'Side part', M: 3, W: 0.3 },
    { id: 'messy', label: 'Messy', M: 2.5, W: 0.4 },
    { id: 'curlyshort', label: 'Short curls', M: 2.5, W: 0.5 },
    { id: 'afro', label: 'Afro', M: 1, W: 0.6 },
    { id: 'manbun', label: 'Top knot', M: 0.8, W: 0.3 },
    { id: 'bald', label: 'Shaved', M: 0.6, W: 0.05 },
    { id: 'pixie', label: 'Pixie', M: 0.1, W: 1.2 },
    { id: 'ponytail', label: 'Ponytail', M: 0.1, W: 5 },
    { id: 'bun', label: 'Bun', M: 0.05, W: 2.5 },
    { id: 'long', label: 'Long', M: 0.4, W: 2.5 },
    { id: 'bob', label: 'Bob', M: 0.05, W: 1.5 },
    { id: 'braids', label: 'Braids', M: 0.2, W: 1.5 },
    { id: 'curlylong', label: 'Long curls', M: 0.2, W: 1.4 },
    { id: 'puffs', label: 'Puffs', M: 0.05, W: 0.8 }
  ];

  L.FACE = [
    { id: 'oval', label: 'Oval' },
    { id: 'round', label: 'Round' },
    { id: 'long', label: 'Long' },
    { id: 'square', label: 'Square' },
    { id: 'heart', label: 'Heart' }
  ];
  L.EYES = [
    { id: 'round', label: 'Round' },
    { id: 'almond', label: 'Almond' },
    { id: 'narrow', label: 'Narrow' },
    { id: 'wide', label: 'Wide' },
    { id: 'sleepy', label: 'Sleepy' },
    { id: 'happy', label: 'Smiling' }
  ];
  L.BROWS = [
    { id: 'flat', label: 'Straight' },
    { id: 'arched', label: 'Arched' },
    { id: 'angled', label: 'Determined' },
    { id: 'thick', label: 'Thick' },
    { id: 'thin', label: 'Thin' },
    { id: 'raised', label: 'Raised' }
  ];
  L.NOSE = [
    { id: 'button', label: 'Button' },
    { id: 'long', label: 'Long' },
    { id: 'wide', label: 'Wide' },
    { id: 'small', label: 'Small' },
    { id: 'pointy', label: 'Pointed' }
  ];
  L.MOUTH = [
    { id: 'smile', label: 'Smile' },
    { id: 'grin', label: 'Grin' },
    { id: 'neutral', label: 'Neutral' },
    { id: 'smirk', label: 'Smirk' },
    { id: 'open', label: 'Breathing hard' }
  ];
  L.FACIAL = [
    { id: 'none', label: 'None', M: 60, W: 1 },
    { id: 'stubble', label: 'Stubble', M: 18, W: 0 },
    { id: 'mustache', label: 'Mustache', M: 4, W: 0 },
    { id: 'goatee', label: 'Goatee', M: 7, W: 0 },
    { id: 'beard', label: 'Beard', M: 9, W: 0 }
  ];
  L.GLASSES = [
    { id: 'none', label: 'None', w: 86 },
    { id: 'round', label: 'Round frames', w: 5 },
    { id: 'square', label: 'Square frames', w: 5 },
    { id: 'sport', label: 'Sport shades', w: 4 }
  ];
  L.MARKS = [
    { id: 'none', label: 'None', w: 70 },
    { id: 'freckles', label: 'Freckles', w: 14 },
    { id: 'blush', label: 'Rosy cheeks', w: 12 },
    { id: 'mole', label: 'Beauty mark', w: 4 }
  ];
  L.GEAR = [
    { id: 'none', label: 'None', w: 80 },
    { id: 'headband', label: 'Headband', w: 14 },
    { id: 'visor', label: 'Visor', w: 6 }
  ];

  // Editor rows, in order: [field, label, options, kind].
  L.FIELDS = [
    ['skin', 'Skin', L.SKIN, 'swatch'],
    ['face', 'Face shape', L.FACE, 'step'],
    ['hair', 'Hair', L.HAIR, 'step'],
    ['hairColor', 'Hair color', L.HAIR_COLOR, 'swatch'],
    ['eyes', 'Eyes', L.EYES, 'step'],
    ['brows', 'Eyebrows', L.BROWS, 'step'],
    ['nose', 'Nose', L.NOSE, 'step'],
    ['mouth', 'Mouth', L.MOUTH, 'step'],
    ['facial', 'Facial hair', L.FACIAL, 'step'],
    ['glasses', 'Glasses', L.GLASSES, 'step'],
    ['marks', 'Face details', L.MARKS, 'step'],
    ['gear', 'Headwear', L.GEAR, 'step']
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
  const uniform = (opts, rng) => U.pick(opts, rng).id;

  // Natural hair colors lean on skin tone; dyed colors are rare.
  function hairColorFor(skinIndex, rng) {
    const dark = skinIndex / (L.SKIN.length - 1);
    const w = {
      black: 1 + dark * 6, darkbrown: 2 + dark * 2, brown: 2.5, lightbrown: 2 * (1 - dark) + 0.2,
      auburn: 0.8 * (1 - dark), ginger: 0.7 * (1 - dark) ** 2, blonde: 2 * (1 - dark) ** 2,
      platinum: 0.4 * (1 - dark) ** 2, gray: 0.03, blue: 0.08, pink: 0.08, green: 0.04
    };
    return pickWeighted(L.HAIR_COLOR, (o) => w[o.id] || 0, rng);
  }

  // A seeded look. seedKey: anything stable (the athlete's id); sq: 'M' or 'W'.
  L.generate = function (seedKey, sq = 'M', rng = null) {
    const r = rng || U.mulberry32(U.hash(`look|${seedKey}`));
    const skin = pickWeighted(L.SKIN, (o) => o.w, r);
    const skinIndex = L.SKIN.findIndex((o) => o.id === skin);
    const side = sq === 'W' ? 'W' : 'M';
    return {
      skin,
      face: uniform(L.FACE, r),
      hair: pickWeighted(L.HAIR, (o) => o[side], r),
      hairColor: hairColorFor(skinIndex, r),
      eyes: uniform(L.EYES, r),
      brows: uniform(L.BROWS, r),
      nose: uniform(L.NOSE, r),
      mouth: pickWeighted(L.MOUTH, (o) => (o.id === 'open' ? 0.4 : 1), r),
      facial: pickWeighted(L.FACIAL, (o) => o[side], r),
      glasses: pickWeighted(L.GLASSES, (o) => o.w, r),
      marks: pickWeighted(L.MARKS, (o) => o.w, r),
      gear: pickWeighted(L.GEAR, (o) => o.w, r)
    };
  };

  // Fill in or repair any field (older looks, hand-edited saves).
  L.normalize = function (look) {
    const out = {};
    L.FIELDS.forEach(([f]) => { out[f] = L.option(f, look && look[f]).id; });
    return out;
  };

  // Step a field to the next or previous option.
  L.step = function (look, field, dir) {
    const opts = L.optionsFor(field);
    const i = opts.findIndex((o) => o.id === look[field]);
    look[field] = opts[(i + dir + opts.length) % opts.length].id;
    return look;
  };

  // Generated runners get a look; real roster athletes never do.
  L.ensure = function (a, sq) {
    if (!a || a.real) return a;
    a.look = a.look ? L.normalize(a.look) : L.generate(a.id, sq);
    return a;
  };

  XC.looks = L;
})(window.XC = window.XC || {});
