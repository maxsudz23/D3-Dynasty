/* Franchise hub, schedule, trophy case and settings. */
(function (XC) {
  'use strict';

  const U = XC.util;
  const h = U.h;
  const ui = XC.ui;
  const S = XC.season;
  const A = XC.athletes;
  XC.screens = XC.screens || {};

  function placeText(r) {
    if (!r) return '—';
    if (r.userPlace) return `${U.ordinal(r.userPlace)} of ${r.nTeams}`;
    if (r.individualsOnly) return 'Individuals';
    return r.userEntered ? 'Incomplete' : 'Did not qualify';
  }

  // What the big "Next up" tile offers in each phase.
  function nextUp(state) {
    const year = S.yearOf(state.season);
    switch (state.phase) {
      case 'preseason':
        return {
          kicker: `${year} preseason`,
          headline: 'Recruiting wheel',
          facts: [`${S.SPINS} spins per squad`, `Recruits up to ${S.repWindow(state.rep).max} OVR`],
          action: 'Spin the wheel',
          go: () => XC.go('wheel')
        };
      case 'season': {
        const meet = state.schedule[state.meetIndex];
        const typeLabel = meet.type === 'invite' ? `Invitational ${meet.index + 1} of 3` : S.MEET_TYPES[meet.type];
        return {
          kicker: typeLabel,
          headline: meet.name,
          facts: [meet.date, `Hosted by ${meet.host.short}`, `${meet.course.name}`, XC.race.COURSES[meet.course.type].label],
          action: 'Preview meet',
          go: () => XC.go('meet')
        };
      }
      case 'recap':
        return { kicker: `${year} complete`, headline: 'Season recap', facts: ['Nationals are in the books'], action: 'View recap', go: () => XC.go('recap') };
      case 'graduation':
        return { kicker: 'Offseason', headline: 'Graduation day', facts: ['Seniors move on'], action: 'Say goodbye', go: () => XC.go('graduation') };
      case 'progression':
        return { kicker: 'Offseason', headline: 'Training report', facts: ['See who grew over the summer'], action: 'Open report', go: () => XC.go('progression') };
      case 'cut':
        return { kicker: 'Offseason', headline: 'Roster cuts', facts: [`Roster limit ${S.ROSTER_CAP} per squad`], action: 'Manage roster', go: () => XC.go('roster', { mode: 'cut' }) };
      default:
        return { kicker: '', headline: '', facts: [], action: 'Continue', go: () => {} };
    }
  }

  /* ======================= Hub ======================= */

  XC.screens.hub = {
    title: 'Franchise',
    squadTabs: false,
    render(root) {
      const state = XC.state;
      if (!state) return XC.go('title');
      const next = nextUp(state);
      this.next = next;

      const nextTile = h('section', { class: 'tile tile--next on-dark', 'aria-label': 'Next up' },
        ui.crest(state.school),
        h('p', { class: 'tile__kicker' }, next.kicker),
        h('h2', { class: 'tile__headline' }, next.headline),
        h('p', { class: 'tile__facts' }, next.facts.map((f) => h('span', null, f))),
        h('div', { class: 'actions' },
          ui.button(next.action, () => { XC.audio.select(); next.go(); }, { variant: 'primary', size: 'big', key: 'Enter', attrs: { 'data-nav': '', 'data-autofocus': '' } })));

      // Program snapshot
      const squads = h('div', { class: 'snapshot__squads' }, state.programs.map((sq) => {
        const roster = state.squads[sq].roster;
        const top = roster.slice().sort((a, b) => b.ovr - a.ovr)[0];
        return h('div', { class: 'snapshot__squad' },
          h('p', { class: 'snapshot__label' }, `${S.squadLabel(sq)} team`),
          h('p', { class: 'bignum' }, String(A.teamOvr(roster)), h('small', null, 'OVR')),
          h('p', { class: 'muted' }, `${roster.length} runners`),
          top ? h('p', null, `Top runner: ${A.fullName(top)} (${top.ovr})`) : null);
      }));
      const win = S.repWindow(state.rep);
      const rep = h('div', null,
        ui.meter(state.rep / 100, `Reputation ${Math.round(state.rep)} of 100`),
        h('p', { class: 'meter-label' },
          h('span', null, `Reputation ${Math.round(state.rep)} / 100`),
          h('span', null, `Recruits ${win.min}–${win.max} OVR`)));

      const done = state.schedule.filter((m) => m.done);
      const record = done.length
        ? h('ul', { class: 'record-list' }, done.map((m) => h('li', null,
          h('span', null, m.name),
          h('span', null, state.programs.map((sq) => `${state.programs.length > 1 ? `${sq} ` : ''}${placeText(m.results[sq])}`).join(', ')))))
        : h('p', { class: 'muted' }, state.phase === 'preseason' ? 'Season opens after recruiting.' : 'No meets run yet this season.');

      const snapshot = ui.panel(`${state.school.short} snapshot`, h('div', { class: 'snapshot' }, squads, rep, record),
        { aside: `Coach ${state.coach.name}` });

      const tiles = [
        ['Depth chart', 'Set your top seven and study ratings', () => XC.go('roster')],
        ['Schedule', 'Six meets from opener to nationals', () => XC.go('schedule')],
        ['Trophy case', 'Banners, finishes and All-Americans', () => XC.go('trophies')],
        ['Settings', 'Sound, announcer and your save', () => XC.go('settings')]
      ].map(([title, text, fn]) => h('button', {
        type: 'button', class: 'tile', 'data-nav': '', on: { click: () => { XC.audio.select(); fn(); } }
      }, h('span', { class: 'tile__title' }, title), h('span', { class: 'tile__text' }, text)));

      root.appendChild(h('div', { class: 'hub' },
        nextTile,
        snapshot,
        h('nav', { class: 'menu-tiles', 'aria-label': 'Franchise menu' }, tiles)));
    },
    legend() {
      return [
        { key: 'Enter', label: 'Select', keyboardOnly: true, action: () => document.activeElement && document.activeElement.click() },
        { key: 'D', label: 'Depth chart', action: () => XC.go('roster') },
        { key: 'S', label: 'Schedule', action: () => XC.go('schedule') },
        { key: 'M', label: 'Mute', keyboardOnly: true, action: () => XC.settings.toggleSound() }
      ];
    },
    onKey(e) {
      const k = e.key.toLowerCase();
      if (k === 'd') { XC.go('roster'); return true; }
      if (k === 's') { XC.go('schedule'); return true; }
      if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
        this.next.go();
        return true;
      }
      return false;
    },
    back() {
      XC.go('title');
    }
  };

  /* ======================= Schedule ======================= */

  XC.screens.schedule = {
    title: 'Schedule',
    squadTabs: false,
    render(root) {
      const state = XC.state;
      const both = state.programs.length > 1;
      const rows = state.schedule.map((m) => {
        const isNext = state.phase === 'season' && m.index === state.meetIndex;
        const result = m.done
          ? state.programs.map((sq) => `${both ? `${S.squadNoun(sq)} ` : ''}${placeText(m.results[sq])}`).join(', ')
          : isNext ? 'Up next' : '';
        const action = m.done
          ? ui.button('Results', () => XC.go('results', { meetIndex: m.index, from: 'schedule' }), { variant: 'ghost', size: 'small', attrs: { 'data-nav': '' } })
          : isNext ? ui.button('Preview', () => XC.go('meet'), { variant: 'primary', size: 'small', attrs: { 'data-nav': '', 'data-autofocus': '' } }) : null;
        return h('tr', { class: isNext ? 'is-selected' : m.done ? '' : 'is-reserve' },
          h('td', null, m.date),
          h('td', { class: 'cell-left' }, m.name),
          h('td', { class: 'cell-left' }, S.MEET_TYPES[m.type]),
          h('td', { class: 'cell-left' }, m.host.short),
          h('td', { class: 'cell-left' }, `${m.course.name} (${XC.race.COURSES[m.course.type].label.toLowerCase()})`),
          h('td', { class: isNext ? 'status-up' : '' }, result),
          h('td', null, action));
      });
      root.appendChild(h('div', { class: 'stack' },
        h('div', { class: 'panel depth__table' },
          h('div', { class: 'table-wrap' },
            h('table', { class: 'grid' },
              h('caption', { class: 'visually-hidden' }, `${S.yearOf(state.season)} schedule`),
              h('thead', null, h('tr', null,
                ['Date', 'Meet', 'Type', 'Host', 'Course', 'Result', ''].map((c) => h('th', { scope: 'col' }, c)))),
              h('tbody', null, rows)))),
        h('p', { class: 'depth__tip' }, 'Top 3 at regionals earns a team bid to nationals. A fourth-place team with an invitational win also gets in.')));
    },
    legend() {
      return [{ key: 'Esc', label: 'Back', action: () => XC.go('hub') }];
    },
    back() {
      XC.go('hub');
    }
  };

  /* ======================= Trophy case ======================= */

  XC.screens.trophies = {
    title: 'Trophy case',
    squadTabs: false,
    render(root) {
      const state = XC.state;
      const hist = state.history;
      const count = (fn) => hist.reduce((sum, season) => sum + Object.values(season.squads).filter(fn).length, 0);
      const aa = hist.reduce((sum, season) => sum + Object.values(season.squads).reduce((s, q) => s + q.aa.length, 0), 0);
      const banners = [
        ['National titles', count((q) => q.national === 1)],
        ['Podium finishes', count((q) => q.national && q.national <= 4)],
        ['Regional titles', count((q) => q.regional === 1)],
        ['Conference titles', count((q) => q.conf === 1)],
        ['All-Americans', aa]
      ];

      const pennants = h('div', { class: 'trophies' }, banners.map(([label, n]) =>
        h('div', { class: `pennant${n ? '' : ' pennant--muted'}` }, h('strong', null, String(n)), h('span', null, label))));

      let table;
      if (!hist.length) {
        table = h('p', { class: 'empty' }, 'Your trophy case fills as seasons end. Finish your first nationals to hang a banner.');
      } else {
        const cols = ['Year', 'Rep'];
        state.programs.forEach((sq) => cols.push(`${S.squadNoun(sq)} conf`, `${S.squadNoun(sq)} region`, `${S.squadNoun(sq)} NCAA`, `${S.squadNoun(sq)} AA`));
        const fmt = (p) => (p ? U.ordinal(p) : '—');
        table = h('div', { class: 'table-wrap' }, h('table', { class: 'grid' },
          h('thead', null, h('tr', null, cols.map((c) => h('th', { scope: 'col' }, c)))),
          h('tbody', null, hist.slice().reverse().map((season) => h('tr', null,
            h('td', null, String(season.year)),
            h('td', null, `${Math.round(season.repStart)} → ${Math.round(season.repEnd)}`),
            state.programs.map((sq) => {
              const q = season.squads[sq];
              if (!q) return [h('td'), h('td'), h('td'), h('td')];
              return [h('td', null, fmt(q.conf)), h('td', null, fmt(q.regional)), h('td', null, q.national ? fmt(q.national) : 'DNQ'), h('td', null, String(q.aa.length))];
            }))))));
      }

      // Program records from the current roster and alumni.
      const records = state.programs.map((sq) => {
        const roster = state.squads[sq].roster.filter((a) => a.pr);
        const best = roster.sort((a, b) => a.pr - b.pr)[0];
        return h('li', null, `${S.squadLabel(sq)} best on the roster: ${best ? `${A.fullName(best)}, ${U.formatTime(best.pr)}` : 'no races yet'}`);
      });

      root.appendChild(h('div', { class: 'stack' },
        pennants,
        ui.panel('Season by season', table, { aside: `${hist.length} season${hist.length === 1 ? '' : 's'} coached` }),
        h('ul', { class: 'notes' }, records)));
    },
    legend() {
      return [{ key: 'Esc', label: 'Back', action: () => XC.go('hub') }];
    },
    back() {
      XC.go('hub');
    }
  };

  /* ======================= Settings ======================= */

  XC.screens.settings = {
    title: 'Settings',
    squadTabs: false,
    render(root) {
      const settings = XC.settings.get();
      const row = (name, hint, control) => h('div', { class: 'setting' },
        h('div', { class: 'setting__text' }, h('span', { class: 'setting__name' }, name), h('span', { class: 'setting__hint' }, hint)),
        control);
      const list = h('div', { class: 'settings-list' },
        row('Sound effects', 'Starting gun, wheel ticks and menu sounds.',
          ui.button(settings.muted ? 'Turn on' : 'Turn off', () => { XC.settings.toggleSound(); XC.refresh(); }, { variant: 'ghost', size: 'small', attrs: { 'data-nav': '', 'data-autofocus': '' } })),
        XC.audio.speechSupported
          ? row('Race announcer', 'Spoken calls at each checkpoint and the finish.',
            ui.button(settings.announcer ? 'Turn off' : 'Turn on', () => { XC.settings.toggleAnnouncer(); XC.refresh(); }, { variant: 'ghost', size: 'small', attrs: { 'data-nav': '' } }))
          : row('Race announcer', 'This browser doesn’t support spoken audio.', h('span', { class: 'muted' }, 'Unavailable')),
        row('Autosave', XC.storage.available ? 'Progress saves after every action.' : 'Saving is off in this browser, so progress lasts until you close the tab.',
          h('span', { class: 'badge' }, XC.storage.available ? 'On' : 'Off')),
        row('Title screen', 'Leave the hub. Your dynasty stays saved.',
          ui.button('Go to title', () => XC.go('title'), { variant: 'ghost', size: 'small', attrs: { 'data-nav': '' } })),
        row('Delete dynasty', 'Erase this save and start fresh.',
          ui.button('Delete', async () => {
            const ok = await ui.confirm(`Delete Coach ${XC.state.coach.name}'s dynasty at ${XC.state.school.short}? This can’t be undone.`, 'Delete');
            if (!ok) return;
            XC.storage.clearGame();
            XC.state = null;
            ui.setTheme();
            XC.go('title');
          }, { variant: 'danger', size: 'small', attrs: { 'data-nav': '' } })));
      root.appendChild(list);
    },
    legend() {
      return [{ key: 'Esc', label: 'Back', action: () => XC.go('hub') }];
    },
    back() {
      XC.go('hub');
    }
  };
})(window.XC = window.XC || {});
