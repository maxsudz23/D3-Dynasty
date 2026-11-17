/* The hub's menu-tile art. Each builder returns { el, enter?, leave? }:
   el is the picture (decorative, aria-hidden), and enter/leave run when the
   tile is hovered or focused. CSS plays each animation only while its tile
   is hovered or focused, and only without reduced motion, so it restarts
   from the top every time. */
(function (XC) {
  'use strict';

  const U = XC.util;
  const h = U.h;
  const s = U.svg;
  const ui = XC.ui;
  const L = XC.looks;

  const art = (kind, ...children) => h('div', { class: `art art--${kind}`, 'aria-hidden': 'true' }, ...children);
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MONTH_SHORT = MONTHS.map((m) => m.slice(0, 3));

  /* ---------- Depth chart: a rostered runner, a new one each hover ---------- */

  // onPick(athlete) runs with each new runner, so the tile can name them.
  function roster(state, onPick = () => {}) {
    const everyone = state.programs.flatMap((sq) => state.squads[sq].roster);
    const el = art('roster');
    let last = null;
    const shot = () => {
      const pool = everyone.length > 1 ? everyone.filter((a) => a !== last) : everyone;
      const a = pool[Math.floor(Math.random() * pool.length)];
      last = a;
      if (a) onPick(a);
      return a ? h('div', { class: 'art__shot' }, ui.portrait(a)) : null;
    };
    const first = shot();
    if (first) el.appendChild(first);
    return {
      el,
      enter() {
        const next = shot();
        if (!next) return;
        // The old picture fades out under the new one, then goes.
        el.querySelectorAll('.art__shot').forEach((old) => {
          old.classList.add('is-leaving');
          setTimeout(() => old.remove(), 450);
        });
        el.appendChild(next);
      }
    };
  }

  /* ---------- Schedule: a tear-off calendar ---------- */

  function nextMeetDate(state) {
    const meets = state.schedule;
    const m = meets[Math.min(state.meetIndex || 0, meets.length - 1)] || meets[0];
    const [mon, day] = String(m ? m.date : 'Sep 6').split(' ');
    const month = Math.max(0, MONTH_SHORT.indexOf(mon));
    return new Date(XC.season.yearOf(state.season), month, Number(day) || 1);
  }

  function schedule(state) {
    const page = (cls) => {
      const month = h('span', { class: 'cal__month' });
      const day = h('span', { class: 'cal__day' });
      return { el: h('div', { class: `cal__page ${cls}` }, month, day), month, day };
    };
    const under = page('cal__page--under');
    const top = page('cal__page--top');
    let date = nextMeetDate(state);
    const paint = () => {
      const after = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      top.month.textContent = MONTHS[date.getMonth()];
      top.day.textContent = String(date.getDate());
      under.month.textContent = MONTHS[after.getMonth()];
      under.day.textContent = String(after.getDate());
    };
    paint();
    // Each time the top page flies off, the next day is on top.
    top.el.addEventListener('animationiteration', () => {
      date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      paint();
    });
    const el = art('schedule', h('div', { class: 'cal' },
      h('div', { class: 'cal__rings' }, h('span'), h('span')),
      under.el, top.el));
    return {
      el,
      enter() {
        date = nextMeetDate(state);
        paint();
      },
      leave() {
        date = nextMeetDate(state);
        paint();
      }
    };
  }

  /* ---------- Staff: the coaches, signed and on the market ---------- */

  function coachLook(c) {
    const sq = XC.names && XC.names.female.includes(c.first) ? 'W' : 'M';
    const look = L.generate(`coach|${c.id}`, sq);
    // Coaches wear the quarter zip, never race gear.
    return Object.assign(look, { top: 'zip', gear: 'none' });
  }

  function staff(state) {
    const coaches = state.staff.coaches.concat(state.staff.pool || []);
    const faces = coaches.map((c, i) => h('div', { class: `art__shot${i === 0 ? ' is-on' : ''}` },
      ui.avatar(coachLook(c), `Coach ${c.first} ${c.last}`)));
    const el = art('staff', ...faces);
    let i = 0;
    let timer = null;
    const show = (n) => {
      faces.forEach((f, k) => f.classList.toggle('is-on', k === n));
    };
    return {
      el,
      enter() {
        if (faces.length < 2 || timer) return;
        i = (i + 1) % faces.length;
        show(i);
        timer = setInterval(() => { i = (i + 1) % faces.length; show(i); }, 1100);
      },
      leave() {
        clearInterval(timer);
        timer = null;
      }
    };
  }

  /* ---------- Facilities: a weight room in team colors ---------- */

  // A team weight room in one-point perspective: a long row of squat racks
  // (team-color uprights, pulleys, a banner with the school's name, a weight
  // stack and bumper plates on the side) running off toward the far wall,
  // under a white ceiling with LED strips, a duct and a fan, with turf and
  // yard lines on the left. Drawn in a 200 x 180 box.
  let gymCount = 0;
  const VP = [54, 76];
  // A point `t` of the way from (x, y) to the vanishing point.
  const toward = (x, y, t) => [x + (VP[0] - x) * t, y + (VP[1] - y) * t];
  const pts = (list) => list.map(([x, y]) => `${U.round(x, 2)},${U.round(y, 2)}`).join(' ');

  function rack(school, k) {
    const sc = 1.3 * 0.7 ** k;
    const [bx, by] = toward(176, 170, 1 - 0.7 ** k);
    const name = (school.short || school.name || '').toUpperCase();
    const fs = Math.min(9, 58 / Math.max(1, name.length * 0.56));
    const dx = -9;
    const dy = -6;
    const holes = [];
    for (let y = -92; y <= -8; y += 6) {
      holes.push(s('circle', { cx: -42, cy: y, r: 0.55, class: 'gym__hole' }), s('circle', { cx: -2, cy: y, r: 0.55, class: 'gym__hole' }));
    }
    const stack = [];
    for (let y = -46; y <= -20; y += 3) stack.push(s('line', { x1: -14, y1: y, x2: -7, y2: y, class: 'gym__stack-line' }));
    const plate = (cy, r, label) => [
      s('circle', { cx: 8, cy, r, class: 'gym__plate' }),
      s('circle', { cx: 8, cy, r: r * 0.72, class: 'gym__plate-ring' }),
      s('circle', { cx: 8, cy, r: r * 0.22, class: 'gym__plate-hub' }),
      s('rect', { x: 8 - r * 0.32, y: cy - r * 0.62, width: r * 0.64, height: r * 0.16, class: 'gym__plate-label' }),
      label ? s('circle', { cx: 8, cy: cy + r * 0.48, r: r * 0.09, class: 'gym__plate-label' }) : null
    ];
    const pulley = (cx, cy, r) => [
      s('circle', { cx, cy, r, class: 'gym__pulley' }),
      s('circle', { cx, cy, r: r * 0.3, class: 'gym__plate-hub' })
    ];
    return s('g', { class: 'gym__rack', transform: `translate(${U.round(bx, 2)} ${U.round(by, 2)}) scale(${U.round(sc, 4)})` },
      // Back frame, set up and left toward the far wall.
      s('rect', { x: -44 + dx, y: -100 + dy, width: 4, height: 100, class: 'gym__upright-back' }),
      s('rect', { x: -4 + dx, y: -100 + dy, width: 4, height: 100, class: 'gym__upright-back' }),
      s('polygon', { points: pts([[-44, -100], [-44 + dx, -100 + dy], [dx, -100 + dy], [0, -100], [0, -96], [-44, -96]]), class: 'gym__upright-side' }),
      s('rect', { x: -47 + dx, y: -2 + dy, width: 50, height: 3, class: 'gym__foot' }),
      // Banner board with the school's name, and the weight stack.
      s('rect', { x: -32, y: -88, width: 14, height: 66, class: 'gym__banner' }),
      s('rect', { x: -30, y: -86, width: 10, height: 9, rx: 1.5, class: 'gym__badge' }),
      s('text', { class: 'gym__badge-text', x: -25, y: -81.3, 'font-size': 7.5, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, name[0] || ''),
      s('text', { class: 'gym__banner-text', 'font-size': U.round(fs, 2), transform: 'translate(-25 -46) rotate(-90)', 'text-anchor': 'middle', 'dominant-baseline': 'central' }, name),
      s('rect', { x: -15, y: -84, width: 9, height: 66, class: 'gym__stack-rail' }),
      s('rect', { x: -14, y: -48, width: 7, height: 30, class: 'gym__stack' }),
      ...stack,
      // Front frame.
      s('rect', { x: -44, y: -100, width: 4, height: 100, class: 'gym__upright' }),
      s('rect', { x: -4, y: -100, width: 4, height: 100, class: 'gym__upright' }),
      s('rect', { x: -44, y: -100, width: 44, height: 4, class: 'gym__upright' }),
      ...holes,
      s('rect', { x: -45, y: -60, width: 6, height: 2.5, class: 'gym__hook' }),
      s('rect', { x: -5, y: -60, width: 6, height: 2.5, class: 'gym__hook' }),
      s('rect', { x: -48, y: -2, width: 52, height: 3, class: 'gym__foot' }),
      ...pulley(-38, -104, 4),
      ...pulley(-21, -107, 5.5),
      ...pulley(-6, -104, 4),
      // Plate horn and bumper plates on the side.
      s('rect', { x: 0, y: -92, width: 12, height: 2, class: 'gym__foot' }),
      ...plate(-74, 11, true),
      ...plate(-47, 9, true),
      ...plate(-24, 7, false));
  }

  function facilities(state) {
    const school = (state && state.school) || {};
    const id = `gym-${++gymCount}`;
    const far = { l: 40, r: 74, t: 64, b: 86 };

    // Ceiling: panels, beams to the far wall, LED strips, a duct and a fan.
    const beams = [-80, -20, 40, 100, 160, 220].map((x) => {
      const [x2, y2] = toward(x, 0, 0.92);
      return s('line', { x1: x, y1: 0, x2, y2, class: 'gym__beam' });
    });
    const strip = (x, w, t1, t2) => s('polygon', {
      points: pts([toward(x, 0, t1), toward(x + w, 0, t1), toward(x + w, 0, t2), toward(x, 0, t2)]),
      class: 'gym__led'
    });
    const leds = [strip(-70, 10, 0.05, 0.42), strip(-70, 10, 0.5, 0.78), strip(30, 9, 0.02, 0.4), strip(30, 9, 0.48, 0.74), strip(120, 9, 0.18, 0.5)];
    const duct = s('polygon', { points: pts([[200, 2], [200, 9], toward(200, 9, 0.9), toward(200, 2, 0.9)]), class: 'gym__duct' });
    const fan = s('g', { transform: 'translate(74 26) scale(1 0.34)' },
      s('g', { class: 'gym__fan' },
        ...[0, 120, 240].map((deg) => s('rect', { x: 0, y: -1.6, width: 20, height: 3.2, rx: 1.6, transform: `rotate(${deg})`, class: 'gym__fan-blade' })),
        s('circle', { cx: 0, cy: 0, r: 2.6, class: 'gym__fan-hub' })));

    // Floor tiles in a band along the turf, dark and light like rubber mats.
    const tiles = [];
    const tStep = [0, 0.18, 0.33, 0.45, 0.55, 0.63, 0.7, 0.76, 0.81];
    for (let i = 0; i < tStep.length - 1; i++) {
      for (let j = 0; j < 3; j++) {
        if ((i + j) % 2) continue;
        const x0 = 78 + j * 24;
        const x1 = x0 + 24;
        tiles.push(s('polygon', { points: pts([toward(x0, 180, tStep[i]), toward(x1, 180, tStep[i]), toward(x1, 180, tStep[i + 1]), toward(x0, 180, tStep[i + 1])]), class: 'gym__tile' }));
      }
    }

    // Turf with a sideline, yard lines and the school's letter.
    const edge = (t) => toward(72, 180, t);
    const yard = [0.12, 0.3, 0.45, 0.57, 0.66, 0.73, 0.79].map((t) => {
      const [x, y] = edge(t);
      return s('line', { x1: x - 3, y1: y, x2: Math.max(0, x - 64 * (1 - t)), y2: y + 1, class: 'gym__yard' });
    });
    const letter = ((school.short || school.name || 'X')[0] || 'X').toUpperCase();

    const svg = s('svg', { viewBox: '0 0 200 180', class: 'gym', preserveAspectRatio: 'xMaxYMax slice' },
      s('defs', null,
        s('linearGradient', { id: `${id}-ceil`, x1: 0, y1: 0, x2: 0, y2: 1 },
          s('stop', { offset: 0, class: 'gym__ceil-top' }),
          s('stop', { offset: 1, class: 'gym__ceil-bottom' })),
        s('linearGradient', { id: `${id}-floor`, x1: 0, y1: 0, x2: 0, y2: 1 },
          s('stop', { offset: 0, class: 'gym__floor-far' }),
          s('stop', { offset: 1, class: 'gym__floor-near' }))),
      // Walls, ceiling and floor.
      s('rect', { x: 0, y: 0, width: 200, height: 180, class: 'gym__wall' }),
      s('polygon', { points: pts([[0, 0], [200, 0], [far.r, far.t], [far.l, far.t], [0, 40]]), fill: `url(#${id}-ceil)` }),
      ...beams,
      duct,
      ...leds,
      fan,
      s('rect', { x: far.l, y: far.t, width: far.r - far.l, height: far.b - far.t, class: 'gym__far' }),
      s('rect', { x: far.l + 4, y: far.t + 4, width: far.r - far.l - 8, height: 9, class: 'gym__mirror' }),
      s('rect', { x: far.l, y: far.b - 6, width: far.r - far.l, height: 3, class: 'gym__trim' }),
      s('polygon', { points: pts([[0, 40], [far.l, far.t], [far.l, far.b], [0, 110]]), class: 'gym__side-wall' }),
      s('polygon', { points: pts([[0, 92], [far.l, far.b - 6], [far.l, far.b - 3], [0, 100]]), class: 'gym__trim' }),
      s('polygon', { points: pts([[0, 110], [far.l, far.b], [far.r, far.b], [200, 120], [200, 180], [0, 180]]), fill: `url(#${id}-floor)` }),
      ...tiles,
      s('polygon', { points: pts([[0, 180], edge(0), edge(0.82), [0, 108]]), class: 'gym__turf' }),
      s('polyline', { points: pts([edge(0), edge(0.82)]), class: 'gym__sideline' }),
      ...yard,
      s('text', { class: 'gym__turf-letter', x: 0, y: 0, transform: 'translate(10 172) skewX(-38) scale(1 0.5)', 'font-size': 46 }, letter),
      // Racks, far to near.
      ...[8, 7, 6, 5, 4, 3, 2, 1, 0].map((k) => rack(school, k)));
    return { el: art('facilities', svg) };
  }

  /* ---------- Texts: a buzzing phone ---------- */

  const SNIPPETS = {
    tired: ['Legs are dead', '😵'],
    sick: ['Got the flu', '🤒'],
    injured: ['Something hurts', '😬'],
    request: ['Can we try this workout?', '🙏'],
    pr: ['New PR!!', '🔥'],
    badrace: ['Rough race today', '😞'],
    homesick: ['Missing home', '🏠'],
    midterms: ['Midterms this week', '📚']
  };

  function texts(state) {
    const unread = XC.texts.unread(state);
    const ids = [...new Set((unread.length ? unread : state.inbox || []).map((it) => it.templateId))].filter((id) => SNIPPETS[id]);
    const picks = (ids.length ? ids : ['pr', 'tired', 'request']).slice(0, 3);
    const bubbles = picks.map((id, i) => {
      const [text, emoji] = SNIPPETS[id];
      const b = h('span', { class: 'handset__bubble' }, `${text} ${emoji}`);
      b.style.setProperty('--i', String(i));
      return b;
    });
    const floaters = ['💬', '👟', '⏱️'].map((e, i) => {
      const f = h('span', { class: 'handset__emoji' }, e);
      f.style.setProperty('--i', String(i));
      return f;
    });
    const badge = unread.length ? h('span', { class: 'handset__badge' }, String(unread.length)) : null;
    const phone = h('div', { class: 'handset' },
      h('div', { class: 'handset__screen' },
        h('span', { class: 'handset__notch' }),
        h('span', { class: 'handset__line' }),
        h('span', { class: 'handset__line handset__line--short' }),
        h('span', { class: 'handset__line' })),
      badge);
    return { el: art('texts', h('div', { class: 'handset__float' }, ...bubbles, ...floaters), phone) };
  }

  /* ---------- Trophy case ---------- */

  function cup(x, y, sc, cls) {
    return s('g', { class: `case__cup ${cls}`, transform: `translate(${x} ${y}) scale(${sc})` },
      s('path', { d: 'M-12 -34 H12 C12 -18 8 -12 0 -10 C-8 -12 -12 -18 -12 -34 Z', class: 'case__gold' }),
      s('path', { d: 'M-12 -30 C-20 -30 -20 -18 -9 -16 M12 -30 C20 -30 20 -18 9 -16', class: 'case__handle' }),
      s('rect', { x: -2, y: -10, width: 4, height: 6, class: 'case__gold-dark' }),
      s('rect', { x: -9, y: -4, width: 18, height: 4, class: 'case__base' }),
      s('path', { d: 'M-7 -31 C-7 -22 -5 -17 -2 -14', class: 'case__glint' }));
  }

  function medal(x, y, cls) {
    return s('g', { class: 'case__medal', transform: `translate(${x} ${y})` },
      s('path', { d: 'M-6 -20 L0 -6 L6 -20', class: 'case__ribbon' }),
      s('circle', { cx: 0, cy: 0, r: 7, class: `case__disc ${cls}` }),
      s('circle', { cx: 0, cy: 0, r: 4.2, class: 'case__disc-in' }));
  }

  function trophies() {
    const svg = s('svg', { viewBox: '26 2 168 146', class: 'case', preserveAspectRatio: 'xMidYMax meet' },
      s('rect', { x: 30, y: 6, width: 160, height: 138, rx: 3, class: 'case__frame' }),
      s('rect', { x: 37, y: 13, width: 146, height: 124, class: 'case__back' }),
      s('rect', { x: 37, y: 70, width: 146, height: 5, class: 'case__shelf' }),
      s('rect', { x: 37, y: 132, width: 146, height: 5, class: 'case__shelf' }),
      cup(110, 70, 1.25, 'case__cup--big'),
      cup(68, 70, 0.9, ''),
      cup(152, 70, 0.9, ''),
      medal(62, 112, 'case__disc--gold'),
      medal(88, 116, 'case__disc--silver'),
      medal(114, 112, 'case__disc--bronze'),
      s('rect', { x: 134, y: 104, width: 36, height: 28, rx: 2, class: 'case__plaque' }),
      s('rect', { x: 140, y: 110, width: 24, height: 3, class: 'case__plaque-line' }),
      s('rect', { x: 140, y: 117, width: 18, height: 3, class: 'case__plaque-line' }),
      s('rect', { x: 37, y: 13, width: 146, height: 124, class: 'case__glass' }),
      s('rect', { x: 0, y: 0, width: 26, height: 150, class: 'case__shine', transform: 'skewX(-18)' }));
    return { el: art('trophies', svg) };
  }

  /* ---------- Settings: gears ---------- */

  function gearPath(teeth, outer, inner, hole) {
    const pts = [];
    const step = (Math.PI * 2) / teeth;
    for (let i = 0; i < teeth; i++) {
      const a = i * step;
      [[-0.32, inner], [-0.18, outer], [0.18, outer], [0.32, inner]].forEach(([f, r]) => {
        const t = a + f * step;
        pts.push(`${U.round(Math.cos(t) * r, 2)} ${U.round(Math.sin(t) * r, 2)}`);
      });
    }
    // Outline, then the hole (even-odd fill cuts it out).
    return `M${pts.join(' L')} Z M${hole} 0 A${hole} ${hole} 0 1 0 ${-hole} 0 A${hole} ${hole} 0 1 0 ${hole} 0 Z`;
  }

  function settings() {
    const svg = s('svg', { viewBox: '0 0 120 100', class: 'gears', preserveAspectRatio: 'xMaxYMid meet' },
      s('g', { transform: 'translate(70 52)' }, s('path', { d: gearPath(10, 34, 27, 10), class: 'gears__big' })),
      s('g', { transform: 'translate(24 26)' }, s('path', { d: gearPath(7, 19, 14, 5.5), class: 'gears__small' })));
    return { el: art('settings', svg) };
  }

  XC.hubArt = { roster, schedule, staff, facilities, texts, trophies, settings };
})(window.XC = window.XC || {});
