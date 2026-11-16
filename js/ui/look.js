/* Look editor: change how one of your generated runners looks. Real
   roster athletes keep their photos and can't be edited. Every change
   saves as it's made. */
(function (XC) {
  'use strict';

  const U = XC.util;
  const h = U.h;
  const ui = XC.ui;
  const A = XC.athletes;
  const L = XC.looks;
  XC.screens = XC.screens || {};

  function findAthlete(state, id) {
    for (const sq of state.programs) {
      const a = state.squads[sq].roster.find((x) => x.id === id);
      if (a) return { a, sq };
    }
    return null;
  }

  XC.screens.look = {
    title: 'Runner look',
    squadTabs: false,

    render(root, params = {}) {
      const state = XC.state;
      if (!state) return XC.go('title');
      const found = findAthlete(state, params.id);
      if (!found || found.a.real) return XC.go('roster');
      this.root = root;
      this.backParams = params.back || {};
      this.a = found.a;
      this.sq = found.sq;
      L.ensure(this.a, this.sq);
      this.draw();
    },

    draw(focusId) {
      const a = this.a;
      focusId = focusId || (document.activeElement && document.activeElement.id);
      U.clear(this.root);

      const preview = h('section', { class: 'look-preview on-dark' },
        ui.portrait(a, 'xl'),
        h('div', null,
          h('p', { class: 'look-preview__name' }, A.fullName(a)),
          h('p', { class: 'look-preview__meta' }, `${A.yearLong(a.year)} · ${a.ovr} OVR · ${a.hometown}`)),
        h('div', { class: 'actions' },
          ui.button('Surprise me', () => this.randomize(), { variant: 'ghost', size: 'small', key: 'R', attrs: { id: 'look-random', 'data-nav': '' } }),
          ui.button('Original look', () => this.reset(), { variant: 'ghost', size: 'small', attrs: { id: 'look-reset', 'data-nav': '' } }),
          ui.button('Done', () => this.back(), { variant: 'primary', size: 'small', attrs: { id: 'look-done', 'data-nav': '' } })));

      const rows = h('div', { class: 'look-rows' }, L.FIELDS.map(([field, label, opts, kind]) => (kind === 'swatch'
        ? this.swatchRow(field, label, opts)
        : this.stepRow(field, label))));

      this.root.appendChild(h('div', { class: 'look-editor' }, preview, ui.panel('Customize', rows, { aside: 'Changes save as you go' })));

      const el = focusId && document.getElementById(focusId);
      if (el) el.focus({ preventScroll: true });
    },

    stepRow(field, label) {
      const current = L.option(field, this.a.look[field]);
      return h('div', { class: 'look-row' },
        h('span', { class: 'look-row__label', id: `look-${field}-label` }, label),
        h('div', { class: 'look-step', role: 'group', 'aria-labelledby': `look-${field}-label` },
          h('button', { type: 'button', class: 'look-step__arrow', id: `look-${field}-prev`, 'aria-label': `Previous ${label.toLowerCase()}`, 'data-nav': '', on: { click: () => this.step(field, -1) } }, '‹'),
          h('span', { class: 'look-step__value', 'aria-live': 'polite' }, current.label),
          h('button', { type: 'button', class: 'look-step__arrow', id: `look-${field}-next`, 'aria-label': `Next ${label.toLowerCase()}`, 'data-nav': '', on: { click: () => this.step(field, 1) } }, '›')));
    },

    swatchRow(field, label, opts) {
      const current = this.a.look[field];
      return h('div', { class: 'look-row look-row--swatches' },
        h('span', { class: 'look-row__label', id: `look-${field}-label` }, label),
        h('div', { class: 'look-swatches', role: 'radiogroup', 'aria-labelledby': `look-${field}-label` },
          opts.map((o) => h('button', {
            type: 'button', class: 'look-swatch', id: `look-${field}-${o.id}`, role: 'radio', 'aria-checked': String(o.id === current),
            'aria-label': o.label, title: o.label, 'data-nav': '', on: { click: () => this.set(field, o.id) }
          }, U.svg('svg', { viewBox: '0 0 20 20', 'aria-hidden': 'true' }, U.svg('circle', { cx: '10', cy: '10', r: '9', fill: o.hex }))))));
    },

    changed(focusId) {
      XC.save();
      XC.audio.nav();
      this.draw(focusId);
    },

    step(field, dir) {
      if (!this.a || this.a.real) return;
      L.step(this.a.look, field, dir);
      this.changed(`look-${field}-${dir > 0 ? 'next' : 'prev'}`);
    },

    set(field, id) {
      if (!this.a || this.a.real) return;
      this.a.look[field] = L.option(field, id).id;
      this.changed(`look-${field}-${id}`);
    },

    randomize() {
      if (!this.a || this.a.real) return;
      this.a.look = L.generate(null, this.sq, Math.random);
      this.changed('look-random');
    },

    reset() {
      if (!this.a || this.a.real) return;
      this.a.look = L.generate(this.a.id, this.sq);
      this.changed('look-reset');
    },

    onKey(e) {
      if (e.key.toLowerCase() === 'r') {
        this.randomize();
        return true;
      }
      return false;
    },

    legend() {
      return [
        { key: 'Enter', label: 'Select focused', keyboardOnly: true, action: () => document.activeElement && document.activeElement.click() },
        { key: 'R', label: 'Surprise me', action: () => this.randomize() },
        { key: 'Esc', label: 'Done', action: () => this.back() }
      ];
    },

    back() {
      XC.go('roster', this.backParams || {});
    }
  };
})(window.XC = window.XC || {});
