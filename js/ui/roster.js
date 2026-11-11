/* Depth chart: the roster table, player banner card, reordering and cuts. */
(function (XC) {
  'use strict';

  const U = XC.util;
  const h = U.h;
  const ui = XC.ui;
  const S = XC.season;
  const A = XC.athletes;
  XC.screens = XC.screens || {};

  const HI_COLS = ['yr', 'ovr', 'spd', 'end', 'hil', 'kck', 'iq', 'dur', 'mnt', 'pot', 'pr'];
  const MIN_ROSTER = 5;

  const view = { sel: 0, col: 'ovr', grabbed: false, dragFrom: null };

  function cutAllowed(state) {
    return state.phase === 'cut' || state.phase === 'preseason';
  }

  function headerLabel(key) {
    if (key === 'yr') return 'YR';
    if (key === 'ovr') return 'OVR';
    if (key === 'pot') return 'POT';
    if (key === 'pr') return 'PR';
    return A.LABELS[key];
  }

  XC.screens.roster = {
    title: (params) => (params && params.mode === 'cut' ? 'Roster cuts' : 'Depth chart'),
    render(root, params) {
      this.root = root;
      this.params = params || {};
      const state = XC.state;
      if (!state) return XC.go('title');
      const roster = this.roster();
      view.sel = U.clamp(view.sel, 0, Math.max(0, roster.length - 1));
      view.grabbed = false;
      this.draw();
    },

    roster() {
      return XC.state.squads[XC.activeSquad].roster;
    },

    draw() {
      const root = this.root;
      const state = XC.state;
      const roster = this.roster();
      const sq = XC.activeSquad;
      const selected = roster[view.sel];
      U.clear(root);

      const wrap = h('div', { class: 'depth' });
      wrap.appendChild(selected ? this.card(selected) : h('p', { class: 'empty' }, 'No runners on this roster.'));

      // Table
      const lineupIds = new Set(A.lineup(roster).map((a) => a.id));
      const columns = ['#', 'Name', ...HI_COLS, 'Status'];
      const head = h('tr', null, columns.map((c) => {
        const key = HI_COLS.includes(c) ? c : null;
        if (!key) return h('th', { scope: 'col', class: c === 'Name' ? 'cell-name' : '' }, c);
        return h('th', { scope: 'col', class: view.col === key ? 'is-col-hi' : '', title: A.NAMES[key] },
          h('button', { type: 'button', on: { click: () => { view.col = key; XC.audio.nav(); this.draw(); } } }, headerLabel(key)));
      }));

      let racingSlot = 0;
      const rows = roster.map((a, i) => {
        const racing = lineupIds.has(a.id);
        if (racing) racingSlot += 1;
        const cls = [
          i === view.sel ? 'is-selected' : '',
          i >= 7 ? 'is-reserve' : '',
          i === 6 ? 'is-cutline' : '',
          i === view.sel && view.grabbed ? 'is-grabbed' : ''
        ].filter(Boolean).join(' ');
        const cell = (key, value) => h('td', { class: view.col === key ? 'is-col-hi' : '' }, value);
        const tr = h('tr', { class: cls, draggable: 'true', dataset: { index: String(i) } },
          h('td', null, racing ? String(racingSlot) : '–'),
          h('td', { class: 'cell-name' }, A.shortName(a)),
          cell('yr', A.yearShort(a.year)),
          cell('ovr', String(a.ovr)),
          A.STATS.map((k) => cell(k, String(a.stats[k]))),
          cell('pot', a.pot),
          cell('pr', a.pr ? U.formatTime(a.pr) : '—'),
          h('td', null, a.injury > 0 ? h('span', { class: 'badge badge--warn' }, `Out ${a.injury}`) : racing ? 'Racing' : 'Reserve'));
        tr.addEventListener('click', () => this.select(i));
        tr.addEventListener('dragstart', (e) => {
          view.dragFrom = i;
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', String(i));
        });
        tr.addEventListener('dragover', (e) => {
          e.preventDefault();
          tr.classList.add('is-dragover');
        });
        tr.addEventListener('dragleave', () => tr.classList.remove('is-dragover'));
        tr.addEventListener('drop', (e) => {
          e.preventDefault();
          if (view.dragFrom !== null) this.moveTo(view.dragFrom, i);
          view.dragFrom = null;
        });
        return tr;
      });

      this.tableWrap = h('div', {
        class: 'table-wrap', tabindex: '0', 'data-autofocus': '',
        'aria-label': 'Depth chart. Arrow keys select a runner, Enter picks them up to move.'
      },
      h('table', { class: 'grid grid--interactive' },
        h('caption', { class: 'visually-hidden' }, `${S.squadLabel(sq)} depth chart`),
        h('thead', null, head),
        h('tbody', null, rows)));

      wrap.appendChild(h('div', { class: 'panel depth__table' },
        h('p', { class: 'grid__desc' }, `${A.NAMES[view.col]}: ${A.HELP[view.col]}`),
        this.tableWrap));

      // Footer: roster meter + actions
      const count = roster.length;
      const actions = h('div', { class: 'actions' },
        ui.button('Move up', () => this.moveBy(-1), { variant: 'ghost', size: 'small', disabled: view.sel === 0 }),
        ui.button('Move down', () => this.moveBy(1), { variant: 'ghost', size: 'small', disabled: view.sel >= count - 1 }),
        ui.button('Auto reorder', () => this.autoReorder(), { variant: 'ghost', size: 'small', key: 'R' }));
      if (cutAllowed(state)) {
        actions.appendChild(ui.button('Cut runner', () => this.cut(), { variant: 'danger', size: 'small', key: 'X', disabled: !selected || count <= MIN_ROSTER }));
      }
      if (this.params.mode === 'cut' && state.phase === 'cut') {
        actions.appendChild(ui.button(`Start ${S.yearOf(state.season + 1)} season`, () => this.finishCuts(), { variant: 'primary', key: 'Enter' }));
      }

      const injuredInTop = roster.slice(0, 7).filter((a) => a.injury > 0).length;
      wrap.appendChild(h('div', { class: 'depth__footer' },
        h('div', null,
          ui.meter(count / S.ROSTER_CAP, `Roster spots used: ${count} of ${S.ROSTER_CAP}`),
          h('p', { class: 'meter-label' },
            h('span', null, `Roster spots ${count} / ${S.ROSTER_CAP}`),
            h('span', null, `Team OVR ${A.teamOvr(roster)}`))),
        actions,
        h('p', { class: 'depth__tip' },
          injuredInTop
            ? `${injuredInTop} injured runner${injuredInTop > 1 ? 's sit' : ' sits'} in your top seven. The next healthy runner races in their place.`
            : this.params.mode === 'cut'
              ? `Cut runners to make room for this year’s recruits. Keep at least ${MIN_ROSTER}.`
              : 'The top seven healthy runners race. Drag rows, or press Enter to pick a runner up and use the arrow keys.')));

      root.appendChild(wrap);
    },

    card(a) {
      const state = XC.state;
      const lineup = A.lineup(this.roster());
      const racing = lineup.some((x) => x.id === a.id);
      const badges = [
        h('span', { class: 'badge badge--hi' }, racing ? `Racing, slot ${lineup.findIndex((x) => x.id === a.id) + 1}` : 'Reserve'),
        h('span', { class: 'badge badge--line' }, A.ARCHETYPE_LABEL[a.archetype] || 'All-rounder'),
        a.transfer ? h('span', { class: 'badge badge--line' }, 'Transfer') : null,
        a.injury > 0 ? h('span', { class: 'badge badge--warn' }, `Injured, out ${a.injury} meet${a.injury > 1 ? 's' : ''}`) : null
      ];
      return h('section', { class: 'player-card', 'aria-label': `Selected runner ${A.fullName(a)}` },
        h('div', { class: 'player-card__art' }, ui.crest(state.school), ui.portrait(a)),
        h('div', { class: 'player-card__info' },
          h('h2', { class: 'player-card__name' }, A.fullName(a)),
          h('p', { class: 'player-card__meta' },
            h('span', null, '#', h('b', null, String(a.num))),
            h('span', null, h('b', null, A.yearLong(a.year))),
            h('span', null, 'From ', h('b', null, a.hometown)),
            h('span', null, 'PR ', h('b', null, a.pr ? U.formatTime(a.pr) : 'None yet')),
            h('span', null, 'Potential ', h('b', null, a.pot)),
            h('span', null, 'Races ', h('b', null, String(a.career.races)))),
          h('div', { class: 'player-card__badges' }, badges)),
        h('div', { class: 'player-card__ovr' },
          h('span', { class: 'player-card__ovr-num' }, String(a.ovr)),
          h('span', { class: 'player-card__ovr-label' }, 'OVR')));
    },

    select(i) {
      const roster = this.roster();
      if (i < 0 || i >= roster.length) return;
      if (view.sel !== i) XC.audio.nav();
      view.sel = i;
      this.draw();
      this.focusTable();
    },

    focusTable() {
      if (this.tableWrap) this.tableWrap.focus({ preventScroll: true });
      const row = this.tableWrap && this.tableWrap.querySelector('tr.is-selected');
      if (row) row.scrollIntoView({ block: 'nearest' });
    },

    moveTo(from, to) {
      const roster = this.roster();
      if (from === to || to < 0 || to >= roster.length) return;
      const [a] = roster.splice(from, 1);
      roster.splice(to, 0, a);
      view.sel = to;
      XC.audio.nav();
      XC.save();
      this.draw();
      this.focusTable();
    },

    moveBy(dir) {
      this.moveTo(view.sel, view.sel + dir);
    },

    autoReorder() {
      const roster = this.roster();
      roster.sort((a, b) => (a.injury > 0) - (b.injury > 0) || b.ovr - a.ovr);
      view.sel = 0;
      XC.audio.select();
      XC.save();
      ui.toast('Depth chart sorted by overall. Injured runners moved down.');
      this.draw();
      this.focusTable();
    },

    async cut() {
      const state = XC.state;
      if (!cutAllowed(state)) return;
      const roster = this.roster();
      const a = roster[view.sel];
      if (!a) return;
      if (roster.length <= MIN_ROSTER) {
        ui.toast(`Keep at least ${MIN_ROSTER} runners so the team can score.`, 'warn');
        return;
      }
      const ok = await ui.confirm(`Cut ${A.fullName(a)} (${a.ovr} OVR, ${A.yearLong(a.year)})? They leave the program for good.`, 'Cut runner');
      if (!ok) return;
      roster.splice(view.sel, 1);
      view.sel = Math.min(view.sel, roster.length - 1);
      S.addNews(state, `${state.school.short} releases ${A.fullName(a)} from the ${S.squadLabel(XC.activeSquad).toLowerCase()} roster.`);
      XC.save();
      XC.audio.back();
      ui.renderTicker();
      this.draw();
      this.focusTable();
    },

    finishCuts() {
      const state = XC.state;
      S.startNewSeason(state);
      XC.save();
      XC.audio.fanfare();
      ui.toast(`Welcome to the ${S.yearOf(state.season)} season. Spin the recruiting wheel to add your new class.`);
      XC.go('wheel');
    },

    onSquadChange() {
      view.sel = 0;
      view.grabbed = false;
      this.draw();
    },

    legend(params) {
      const items = [
        { key: 'Enter', label: 'Move runner', keyboardOnly: true, action: () => this.toggleGrab() },
        { key: 'R', label: 'Auto reorder', action: () => this.autoReorder() }
      ];
      if (XC.state && cutAllowed(XC.state)) items.push({ key: 'X', label: 'Cut', action: () => this.cut() });
      if (XC.state && params && params.mode === 'cut' && XC.state.phase === 'cut') {
        items.push({ key: 'Shift Enter', label: 'Start season', action: () => this.finishCuts() });
      }
      if (XC.state && XC.state.programs.length > 1) items.push({ key: 'Q E', label: 'Squad', keyboardOnly: true, action: () => XC.setSquad(XC.activeSquad === 'M' ? 'W' : 'M') });
      items.push({ key: 'Esc', label: 'Back', action: () => this.back(params) });
      return items;
    },

    toggleGrab() {
      view.grabbed = !view.grabbed;
      XC.audio[view.grabbed ? 'select' : 'nav']();
      this.draw();
      this.focusTable();
    },

    onKey(e) {
      const onButton = e.target instanceof HTMLButtonElement;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === 'ArrowDown' || key === 'ArrowUp') {
        const dir = key === 'ArrowDown' ? 1 : -1;
        if (view.grabbed) this.moveBy(dir);
        else this.select(view.sel + dir);
        return true;
      }
      if (key === 'ArrowLeft' || key === 'ArrowRight') {
        const idx = HI_COLS.indexOf(view.col);
        view.col = HI_COLS[(idx + (key === 'ArrowRight' ? 1 : -1) + HI_COLS.length) % HI_COLS.length];
        XC.audio.nav();
        this.draw();
        this.focusTable();
        return true;
      }
      if (key === 'Enter' && !onButton) {
        if (this.params.mode === 'cut' && XC.state.phase === 'cut' && !view.grabbed && e.shiftKey) {
          this.finishCuts();
        } else {
          this.toggleGrab();
        }
        return true;
      }
      if (key === 'r') {
        this.autoReorder();
        return true;
      }
      if (key === 'x' && cutAllowed(XC.state)) {
        this.cut();
        return true;
      }
      if (key === 'Escape' && view.grabbed) {
        this.toggleGrab();
        return true;
      }
      return false;
    },

    back(params) {
      const from = params && params.from;
      if (from === 'meet') XC.go('meet');
      else if (from === 'wheel') XC.go('wheel');
      else XC.go('hub');
    }
  };
})(window.XC = window.XC || {});
