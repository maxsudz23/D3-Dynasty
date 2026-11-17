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

  function facilities() {
    const racks = [];
    // Squat racks in a row, receding to the left: two uprights, a crossbar,
    // a team banner between the uprights and a loaded barbell.
    for (let k = 5; k >= 0; k--) {
      const sc = 1 - k * 0.14;
      const x = 214 - k * 30 * (1 - k * 0.04);
      const base = 138 - k * 9;
      const hgt = 108 * sc;
      const w = 34 * sc;
      const top = base - hgt;
      const barY = top + hgt * 0.5;
      const plates = (cx) => [
        s('rect', { x: cx - 3.2 * sc, y: barY - 13 * sc, width: 6.4 * sc, height: 26 * sc, rx: 2 * sc, class: 'gym__plate' }),
        s('rect', { x: cx - 1.4 * sc, y: barY - 9 * sc, width: 2.8 * sc, height: 18 * sc, rx: 1 * sc, class: 'gym__plate-rim' })
      ];
      racks.push(s('g', { class: 'gym__rack' },
        s('rect', { x: x - w * 0.66, y: top + 9 * sc, width: w * 0.32, height: hgt * 0.7, class: 'gym__banner' }),
        s('rect', { x: x - w * 0.56, y: top + 14 * sc, width: w * 0.12, height: hgt * 0.56, class: 'gym__banner-stripe' }),
        s('rect', { x: x - w, y: top, width: 4 * sc, height: hgt, class: 'gym__upright' }),
        s('rect', { x: x - 4 * sc, y: top, width: 4 * sc, height: hgt, class: 'gym__upright' }),
        s('rect', { x: x - w - 1 * sc, y: top - 3 * sc, width: w + 2 * sc, height: 4 * sc, class: 'gym__bar' }),
        s('rect', { x: x - w - 3 * sc, y: base - 3 * sc, width: w + 6 * sc, height: 4 * sc, class: 'gym__bar' }),
        s('rect', { x: x - w - 14 * sc, y: barY - 1.3 * sc, width: w + 28 * sc, height: 2.6 * sc, class: 'gym__barbell' }),
        ...plates(x - w - 8 * sc),
        ...plates(x + 8 * sc)));
    }
    const lights = [0, 1, 2].map((k) => s('rect', { x: 40 + k * 66, y: 8 + k * 3, width: 50 - k * 6, height: 3.5, rx: 1.75, class: 'gym__light' }));
    const yard = [0, 1, 2, 3].map((k) => s('line', { x1: 0, y1: 104 + k * 13, x2: 18 + k * 15, y2: 104 + k * 13, class: 'gym__yard' }));
    const svg = s('svg', { viewBox: '0 0 240 150', class: 'gym', preserveAspectRatio: 'xMaxYMax slice' },
      s('rect', { x: 0, y: 0, width: 240, height: 150, class: 'gym__wall' }),
      s('rect', { x: 0, y: 0, width: 240, height: 24, class: 'gym__ceiling' }),
      ...lights,
      s('polygon', { points: '0,150 0,92 240,108 240,150', class: 'gym__floor' }),
      s('polygon', { points: '0,150 0,96 40,96 100,150', class: 'gym__turf' }),
      ...yard,
      ...racks);
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
