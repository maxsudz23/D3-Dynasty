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

  /* ---------- Crest (generated monogram shield) ---------- */

  ui.crest = function (school, label) {
    const initials = U.initials(school.short || school.name || 'XC');
    const size = [0, 54, 42, 32, 25][Math.min(initials.length, 4)];
    const text = U.readableOn(school.primary);
    return U.svg('svg', {
      class: 'crest', viewBox: '0 0 100 112', role: 'img', 'aria-label': label || `${school.name} crest`
    },
    U.svg('path', {
      d: 'M50 3 L96 15 V56 C96 84 75 101 50 109 C25 101 4 84 4 56 V15 Z',
      fill: school.primary, stroke: school.accent, 'stroke-width': '5'
    }),
    U.svg('path', { d: 'M4 70 L96 46 V58 L6 82 Z', fill: school.accent, opacity: '0.85' }),
    U.svg('text', {
      class: 'crest__text', x: '50', y: '52', 'text-anchor': 'middle', 'dominant-baseline': 'middle',
      'font-size': String(size), fill: text
    }, initials));
  };

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

  ui.meter = function (fraction, label) {
    const fill = h('div', { class: 'meter__fill' });
    fill.style.setProperty('--fill', `${U.clamp(fraction, 0, 1) * 100}%`);
    return h('div', { class: 'meter', role: 'img', 'aria-label': label }, fill);
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
