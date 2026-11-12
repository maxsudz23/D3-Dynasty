/* Shared UI pieces: theme, crest, portraits, chrome (masthead, legend,
   ticker), toasts and the confirm dialog. */
(function (XC) {
  'use strict';

  const U = XC.util;
  const h = U.h;
  const ui = {};

  /* ---------- Theme ---------- */

  function highlightFor(primary, accent) {
    const usable = (hex) => {
      const l = U.luminance(hex);
      return l > 0.035 && l < 0.82;
    };
    if (usable(accent) && U.contrast(accent, '#E6EBF1') > 1.25) return accent;
    if (usable(primary)) return primary;
    return '#5C6B7E';
  }

  ui.setTheme = function (primary = '#2E4A6B', accent = '#E0A526') {
    const root = document.documentElement.style;
    const hi = highlightFor(primary, accent);
    const ink = U.luminance(primary) > 0.3 ? U.mixHex(primary, '#000000', 0.45) : primary;
    root.setProperty('--team-primary', primary);
    root.setProperty('--team-accent', accent);
    root.setProperty('--team-on-primary', U.readableOn(primary));
    root.setProperty('--team-on-accent', U.readableOn(accent));
    root.setProperty('--team-hi', hi);
    root.setProperty('--team-on-hi', U.readableOn(hi));
    root.setProperty('--team-ink', ink);
    // Highlight color lifted until it reads on the dark ink panels.
    let onDark = hi;
    for (let i = 0; i < 10 && U.contrast(onDark, '#1A2431') < 4.5; i++) onDark = U.mixHex(onDark, '#FFFFFF', 0.2);
    root.setProperty('--team-hi-on-dark', onDark);
    const { r, g, b } = U.hexToRgb(primary);
    root.setProperty('--streak', `rgba(${r}, ${g}, ${b}, 0.11)`);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', primary);
  };

  /* ---------- Crest (athletics logo or generated monogram shield) ---------- */

  const SHIELD = 'M50 3 L96 15 V56 C96 84 75 101 50 109 C25 101 4 84 4 56 V15 Z';

  // Real schools with a logo in img/logos get it on a white shield edged in
  // the school color. Everyone else, and any logo that fails to load, gets
  // the monogram.
  ui.crest = function (school, label) {
    const src = XC.logos && XC.logos.pathFor(school);
    if (!src) return monogram(school, label);
    // The logo box is 78 x 68, centered at (50, 51) inside the shield.
    const k = XC.logos.scaleFor(school);
    const bw = 78 * k;
    const bh = 68 * k;
    const svg = U.svg('svg', {
      class: 'crest crest--logo', viewBox: '0 0 100 112', role: 'img', 'aria-label': label || `${school.name} logo`
    },
    U.svg('path', { d: SHIELD, fill: '#FFFFFF', stroke: school.primary, 'stroke-width': '6' }),
    U.svg('image', {
      href: src, x: String(50 - bw / 2), y: String(51 - bh / 2), width: String(bw), height: String(bh), preserveAspectRatio: 'xMidYMid meet',
      on: { error: () => { if (svg.parentNode) svg.parentNode.replaceChild(asFallback(svg, monogram(school, label)), svg); } }
    }));
    return svg;
  };

  // Keep a failed logo's size classes and accessibility on its monogram.
  function asFallback(logo, mono) {
    mono.setAttribute('class', logo.getAttribute('class').replace(' crest--logo', ''));
    ['role', 'aria-label', 'aria-hidden'].forEach((attr) => {
      if (logo.hasAttribute(attr)) mono.setAttribute(attr, logo.getAttribute(attr));
      else mono.removeAttribute(attr);
    });
    return mono;
  }

  function monogram(school, label) {
    const initials = U.initials(school.short || school.name || 'XC');
    const size = [0, 54, 42, 32, 25][Math.min(initials.length, 4)];
    const text = U.readableOn(school.primary);
    return U.svg('svg', {
      class: 'crest', viewBox: '0 0 100 112', role: 'img', 'aria-label': label || `${school.name} crest`
    },
    U.svg('path', { d: SHIELD, fill: school.primary, stroke: school.accent, 'stroke-width': '5' }),
    U.svg('path', { d: 'M4 70 L96 46 V58 L6 82 Z', fill: school.accent, opacity: '0.85' }),
    U.svg('text', {
      class: 'crest__text', x: '50', y: '52', 'text-anchor': 'middle', 'dominant-baseline': 'middle',
      'font-size': String(size), fill: text
    }, initials));
  }

  /* ---------- Portraits ---------- */

  function sketch(athlete, sizeClass) {
    const svg = U.svg('svg', {
      class: `portrait portrait--sketch ${sizeClass}`, viewBox: '0 0 100 100', role: 'img',
      'aria-label': `Scouting sketch of ${athlete.first} ${athlete.last}`
    },
    U.svg('circle', { cx: '50', cy: '38', r: '18', fill: 'rgba(255,255,255,0.32)' }),
    U.svg('path', { d: 'M14 100 C16 70 32 60 50 60 C68 60 84 70 86 100 Z', fill: 'rgba(255,255,255,0.32)' }),
    U.svg('text', {
      x: '50', y: '88', 'text-anchor': 'middle', 'font-size': '18', 'font-weight': '800',
      fill: 'rgba(255,255,255,0.85)', class: 'crest__text'
    }, String(athlete.num || '')));
    return svg;
  }

  ui.portrait = function (athlete, size = '') {
    const sizeClass = size ? `portrait--${size}` : '';
    if (!athlete.photo) return sketch(athlete, sizeClass);
    const img = h('img', {
      class: `portrait ${sizeClass}`, src: athlete.photo, alt: `${athlete.first} ${athlete.last}`,
      loading: 'lazy', width: '128', height: '128'
    });
    img.addEventListener('error', () => {
      img.replaceWith(sketch(athlete, sizeClass));
    }, { once: true });
    return img;
  };

  /* ---------- Small pieces ---------- */

  ui.stars = function (rep) {
    const count = XC.season.stars(rep);
    const wrap = h('span', { class: 'rep__stars', role: 'img', 'aria-label': `${count} of 5 stars` });
    for (let i = 0; i < 5; i++) {
      wrap.appendChild(U.svg('svg', { class: `star${i < count ? ' star--on' : ''}`, viewBox: '0 0 20 20', 'aria-hidden': 'true' },
        U.svg('path', { d: 'M10 1.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L1.3 7.8l6.1-.7z' })));
    }
    return wrap;
  };

  ui.pot = (grade) => h('span', { class: `pot pot--${grade}`, title: `Potential ${grade}` }, grade);

  ui.delta = function (n, digits = 1) {
    const r = U.round(n, digits);
    const cls = r > 0 ? 'delta delta--up' : r < 0 ? 'delta delta--down' : 'delta';
    return h('span', { class: cls }, r === 0 ? '0' : U.signed(r, digits));
  };

  ui.teamChip = function (primary, accent) {
    const chip = h('span', { class: 'team-chip', 'aria-hidden': 'true' });
    chip.style.setProperty('--chip-a', primary);
    chip.style.setProperty('--chip-b', accent);
    return chip;
  };

  // A team's mark in tables and lists: its logo on a small shield when the
  // school has one, otherwise the two-color chip. Team objects carry the
  // school id, or 'user' for the player's school. Always followed by the
  // team's name, so it's hidden from screen readers.
  ui.teamMark = function (team) {
    const school = team.id === 'user' && XC.state ? XC.state.school : team;
    if (!XC.logos || !XC.logos.has(school)) return ui.teamChip(team.primary, team.accent);
    const mark = ui.crest(school);
    mark.setAttribute('class', `${mark.getAttribute('class')} team-mark`);
    mark.removeAttribute('role');
    mark.removeAttribute('aria-label');
    mark.setAttribute('aria-hidden', 'true');
    return mark;
  };

  ui.meter = function (fraction, label, cls = '') {
    const fill = h('div', { class: 'meter__fill' });
    fill.style.setProperty('--fill', `${U.clamp(fraction, 0, 1) * 100}%`);
    return h('div', { class: `meter${cls ? ` ${cls}` : ''}`, role: 'img', 'aria-label': label }, fill);
  };

  // Fatigue bar that shifts from calm to red as a runner wears down.
  ui.fatigueMeter = function (f) {
    const level = f < 20 ? 'fresh' : f < 40 ? 'ok' : f < 60 ? 'tired' : 'worn';
    return ui.meter(f / 100, `Fatigue ${Math.round(f)} of 100, ${XC.training.fatigueLabel(f).toLowerCase()}`, `meter--fatigue meter--${level}`);
  };

  /* ---------- Course map ---------- */

  // Small SVG map of a generated course with start and finish markers for
  // each squad that races there.
  ui.courseMap = function (course, programs) {
    const C = XC.course;
    const layout = C.layoutFor(course);
    const VW = 160;
    const VH = 90;
    const pt = ([x, y]) => [U.round(x * VW, 2), U.round(y * VH, 2)];
    const tallest = Math.max(1, ...layout.hills.map((hl) => hl.h));
    const svgKids = [U.svg('rect', { class: 'course-map__grass', x: 0, y: 0, width: VW, height: VH })];
    layout.hills.forEach((hl) => {
      const rings = U.clamp(Math.round(hl.h / 4), 1, 6);
      for (let r = rings; r >= 1; r--) {
        svgKids.push(U.svg('ellipse', {
          class: 'course-map__hill',
          cx: U.round(hl.x * VW, 2), cy: U.round(hl.y * VH, 2),
          rx: U.round(hl.rx * VW * 1.6 * (r / (rings + 1)), 2), ry: U.round(hl.ry * VH * 1.6 * (r / (rings + 1)), 2),
          opacity: U.round(0.35 + 0.65 * (hl.h / tallest), 2)
        }));
      }
    });
    // Each leg is drawn once, edges first so crossings and junctions join.
    const legTag = (leg) => (leg.closed ? 'polygon' : 'polyline');
    const legPoints = (leg) => leg.pts.map((p) => pt(p).join(',')).join(' ');
    layout.legs.forEach((leg) => svgKids.push(U.svg(legTag(leg), { class: 'course-map__edge', points: legPoints(leg) })));
    layout.legs.forEach((leg) => svgKids.push(U.svg(legTag(leg), { class: 'course-map__trail', points: legPoints(leg) })));
    // Arrows every so often along each leg, in running direction.
    layout.legs.forEach((leg) => {
      const pts = leg.pts.map(pt);
      let run = 0;
      for (let i = 1; i < pts.length; i++) {
        const [x, y] = pts[i - 1];
        const [x2, y2] = pts[i];
        run += Math.hypot(x2 - x, y2 - y);
        if (run < 22) continue;
        run = 0;
        const ang = U.round((Math.atan2(y2 - y, x2 - x) * 180) / Math.PI, 1);
        svgKids.push(U.svg('path', { class: 'course-map__arrow', d: 'M2.2,0 L-1.6,-1.8 L-1.6,1.8 Z', transform: `translate(${x},${y}) rotate(${ang})` }));
      }
    });
    // Place each label beside its marker, on whichever side is clear of
    // other markers and labels.
    const markers = [];
    const placed = [];
    const OFFSETS = [[0, 8], [0, -4.5], [14, 1.8], [-14, 1.8], [0, 13], [0, -9.5]];
    const label = (x, y, text) => {
      const halfW = text.length * 1.25 + 1;
      const fits = ([dx, dy]) => {
        const lx = x + dx;
        const ly = y + dy - 1.8;
        if (lx - halfW < 1 || lx + halfW > VW - 1 || ly < 3 || ly > VH - 2) return false;
        const clearOf = (m) => Math.abs(m.x - lx) > halfW + 2.5 || Math.abs(m.y - ly) > 4.5;
        return markers.every(clearOf) && placed.every((p) => Math.abs(p.x - lx) > halfW + p.halfW + 1 || Math.abs(p.y - ly) > 5.5);
      };
      const [dx, dy] = OFFSETS.find(fits) || OFFSETS[0];
      placed.push({ x: x + dx, y: y + dy - 1.8, halfW });
      return U.svg('text', { class: 'course-map__label', x: U.round(x + dx, 2), y: U.round(y + dy, 2), 'text-anchor': 'middle' }, text);
    };
    // Squads that start (or finish) in the same spot share one marker.
    const spots = (p) => {
      const list = [];
      programs.forEach((sq) => {
        const [x, y] = pt(C.racePoint(layout, sq, p));
        const same = list.find((s) => Math.hypot(s.x - x, s.y - y) < 6);
        if (same) same.names.push(sq);
        else list.push({ x, y, names: [sq] });
      });
      return list;
    };
    const starts = spots(0);
    const finishes = spots(1);
    const text = (s, word) => (programs.length > 1 && s.names.length === 1 ? `${XC.season.squadNoun(s.names[0])}'s ${word.toLowerCase()}` : word);
    starts.concat(finishes).forEach((s) => markers.push({ x: s.x, y: s.y }));
    starts.forEach((s) => svgKids.push(U.svg('circle', { class: 'course-map__start', cx: s.x, cy: s.y, r: 2.6 })));
    finishes.forEach((s) => svgKids.push(U.svg('rect', { class: 'course-map__finish', x: U.round(s.x - 2.6, 2), y: U.round(s.y - 2.6, 2), width: 5.2, height: 5.2 })));
    finishes.forEach((s) => svgKids.push(label(s.x, s.y, text(s, 'Finish'))));
    starts.forEach((s) => svgKids.push(label(s.x, s.y, text(s, 'Start'))));
    const svg = U.svg('svg', {
      class: `course-map course-map--${course.type}`, viewBox: `0 0 ${VW} ${VH}`, role: 'img',
      'aria-label': `${course.name}: ${C.describe(layout)}`
    }, svgKids);
    return svg;
  };

  ui.loading = function (root, text) {
    U.clear(root).appendChild(h('div', { class: 'loading' },
      h('div', { class: 'loading__pack', 'aria-hidden': 'true' }, h('span'), h('span'), h('span'), h('span')),
      h('p', { class: 'loading__text' }, text)));
  };

  ui.panel = function (title, body, { aside = null, dark = false, cls = '' } = {}) {
    return h('section', { class: `panel${dark ? ' panel--dark' : ''} ${cls}`.trim() },
      h('header', { class: 'panel__head' },
        h('h2', { class: 'panel__title' }, title),
        aside ? h('p', { class: 'panel__aside' }, aside) : null),
      h('div', { class: 'panel__body' }, body));
  };

  ui.button = function (label, onClick, { variant = '', size = '', key = null, disabled = false, attrs = {} } = {}) {
    const cls = ['btn', variant ? `btn--${variant}` : '', size ? `btn--${size}` : ''].filter(Boolean).join(' ');
    return h('button', Object.assign({ type: 'button', class: cls, disabled, on: { click: onClick } }, attrs),
      key ? h('span', { class: 'keycap', 'aria-hidden': 'true' }, key) : null,
      label);
  };

  /* ---------- Toasts ---------- */

  ui.toast = function (message, kind = '') {
    const host = document.getElementById('toasts');
    const el = h('p', { class: `toast${kind ? ` toast--${kind}` : ''}` }, message);
    host.appendChild(el);
    setTimeout(() => el.remove(), kind === 'warn' ? 6500 : 4200);
  };

  /* ---------- Confirm dialog ---------- */

  ui.confirm = function (message, okLabel = 'Confirm') {
    const dialog = document.getElementById('confirm-dialog');
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-ok').textContent = okLabel;
    if (typeof dialog.showModal !== 'function') {
      return Promise.resolve(window.confirm(message));
    }
    return new Promise((resolve) => {
      const done = () => {
        dialog.removeEventListener('close', done);
        resolve(dialog.returnValue === 'ok');
      };
      dialog.returnValue = '';
      dialog.addEventListener('close', done);
      dialog.showModal();
      document.getElementById('confirm-cancel').focus();
    });
  };

  /* ---------- Chrome: masthead, context bar, legend, ticker ---------- */

  function phaseLabel(state) {
    switch (state.phase) {
      case 'preseason': return 'preseason';
      case 'season': {
        // While watching a race or its results, name the meet just run.
        const watching = ['race', 'results'].includes(XC.currentScreen()) && XC.live.meetIndex !== undefined;
        return `meet ${(watching ? XC.live.meetIndex : state.meetIndex) + 1} of 6`;
      }
      default: return 'offseason';
    }
  }

  ui.renderStatus = function () {
    const state = XC.state;
    const repEl = document.getElementById('rep-display');
    const seasonEl = document.getElementById('season-tag');
    U.clear(repEl);
    if (!state) {
      seasonEl.textContent = '';
      return;
    }
    repEl.appendChild(ui.stars(state.rep));
    repEl.appendChild(h('span', { class: 'rep__num' }, `Rep ${Math.round(state.rep)}`));
    seasonEl.textContent = `${XC.season.yearOf(state.season)} ${phaseLabel(state)}`;
  };

  ui.renderContext = function (screen) {
    const state = XC.state;
    const body = document.body;
    const teamEl = document.getElementById('context-team');
    const squadEl = document.getElementById('context-squad');
    U.clear(teamEl);
    U.clear(squadEl);
    const show = Boolean(state) && screen && screen.context !== false;
    body.classList.toggle('no-context', !show);
    if (!show) return;

    teamEl.appendChild(ui.crest(state.school));
    teamEl.appendChild(h('span', { class: 'context-bar__team-name' }, `${state.school.short} ${state.school.mascot}`));

    const both = state.programs.length === 2;
    const tabs = both && screen.squadTabs !== false;
    body.classList.toggle('no-squads', !tabs);
    if (tabs) {
      state.programs.forEach((sq) => {
        squadEl.appendChild(h('button', {
          type: 'button', class: 'squad-tab', 'aria-pressed': String(XC.activeSquad === sq),
          on: { click: () => XC.setSquad(sq) }
        }, XC.season.squadNoun(sq)));
      });
    } else {
      const label = both ? 'Men and women' : `${XC.season.squadLabel(state.programs[0])} XC`;
      squadEl.appendChild(h('span', { class: 'squad-tab squad-tab--solo' }, label));
    }
  };

  ui.renderLegend = function (items) {
    const legend = document.getElementById('legend');
    U.clear(legend);
    // Items marked keyboardOnly repeat an on-screen control (squad tabs, the
    // sound toggle, a focused button), so touch screens hide them.
    (items || []).forEach((item) => {
      legend.appendChild(h('button', {
        type: 'button',
        class: `legend__item${item.keyboardOnly ? ' legend__item--keyboard' : ''}`,
        on: { click: () => item.action && item.action() }
      }, h('span', { class: 'keycap', 'aria-hidden': 'true' }, item.key), item.label));
    });
  };

  ui.renderTicker = function () {
    const track = document.getElementById('ticker-track');
    U.clear(track);
    const news = XC.state && XC.state.news.length
      ? XC.state.news
      : ['Welcome to D3 Dynasty. Pick a program and start building.'];
    news.forEach((item, i) => {
      if (i > 0) track.appendChild(h('span', { class: 'ticker__sep', 'aria-hidden': 'true' }));
      track.appendChild(document.createTextNode(item));
    });
    const chars = news.join('').length;
    track.style.setProperty('--ticker-duration', `${Math.max(40, Math.round(chars * 0.19))}s`);
  };

  ui.setTitle = function (text) {
    const el = document.getElementById('screen-title');
    el.textContent = text;
    // Restart the sweep animation for each new screen.
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  };

  XC.ui = ui;
})(window.XC = window.XC || {});
