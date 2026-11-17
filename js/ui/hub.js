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

  // Unanswered texts, for the workout-day tile.
  function textsFact(state) {
    const n = XC.texts.unread(state).length;
    return n ? `${n} unread text${n > 1 ? 's' : ''} from runners` : '';
  }

  // A reminder on the preseason tile while hiring is still open.
  function staffFact(state) {
    const ST = XC.staff;
    const expiring = state.staff.coaches.filter((c) => c.expiring).length;
    if (expiring) return `${expiring} staff contract${expiring > 1 ? 's' : ''} up`;
    const open = ST.openSlots(state);
    return open > 0 ? `${open} staff opening${open > 1 ? 's' : ''}` : 'Staff is full';
  }

  // What the big "Next up" tile offers in each phase.
  function nextUp(state) {
    const year = S.yearOf(state.season);
    switch (state.phase) {
      case 'preseason': {
        const range = XC.difficulty.range(state);
        const rangeFact = XC.difficulty.key(state) === 'easy' ? `Recruits up to ${range.max} OVR` : `Recruits ${range.min}\u2013${range.max} OVR, most toward the low end`;
        if (XC.difficulty.recruitMode(state) === 'scout') {
          return {
            kicker: `${year} preseason`,
            headline: 'Recruiting inbox',
            facts: ['Recruits email you their PRs', `${XC.scouting.VISITS[XC.difficulty.key(state)] || 6} official visits per squad`, staffFact(state)],
            action: 'Open recruiting',
            go: () => XC.go('recruit')
          };
        }
        return {
          kicker: `${year} preseason`,
          headline: 'Recruiting wheel',
          facts: [`${S.SPINS} spins per squad`, rangeFact, staffFact(state)],
          action: 'Spin the wheel',
          go: () => XC.go('wheel')
        };
      }
      case 'season': {
        const meet = state.schedule[state.meetIndex];
        if (XC.training.pending(state)) {
          const gap = XC.training.gapWeeks(state.meetIndex);
          return {
            kicker: `Before the ${meet.name}`,
            headline: 'Workout day',
            facts: [`${gap} week${gap === 1 ? '' : 's'} to race day`, `${XC.race.COURSES[meet.course.type].label} course`, textsFact(state) || 'Plan groups or let the staff auto-plan'],
            action: 'Plan workouts',
            go: () => XC.go('training')
          };
        }
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
        return { kicker: 'Offseason', headline: 'Roster cuts', facts: [`Roster limit ${state.programs.map((sq) => S.rosterCap(state, sq)).join(' / ')} per squad`], action: 'Manage roster', go: () => XC.go('roster', { mode: 'cut' }) };
      default:
        return { kicker: '', headline: '', facts: [], action: 'Continue', go: () => {} };
    }
  }

  /* ======================= Hub ======================= */

  // Arrow keys on the hub move to the nearest tile in that direction, by
  // the tiles' on-screen boxes (the grid's tiles come in different sizes).
  function spatialMove(root, key) {
    const items = Array.from(root.querySelectorAll('.hub-grid [data-nav]')).filter((el) => !el.disabled && el.checkVisibility());
    const cur = document.activeElement;
    if (!items.includes(cur)) {
      if (!items.length) return false;
      items[0].focus();
      return true;
    }
    const a = cur.getBoundingClientRect();
    const tol = 2;
    const horiz = key === 'ArrowLeft' || key === 'ArrowRight';
    const ahead = (b) => (key === 'ArrowRight' ? b.left >= a.right - tol
      : key === 'ArrowLeft' ? b.right <= a.left + tol
        : key === 'ArrowDown' ? b.top >= a.bottom - tol : b.bottom <= a.top + tol);
    const gap = (b) => (key === 'ArrowRight' ? b.left - a.right : key === 'ArrowLeft' ? a.left - b.right
      : key === 'ArrowDown' ? b.top - a.bottom : a.top - b.bottom);
    const overlap = (b) => (horiz ? Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) : Math.min(a.right, b.right) - Math.max(a.left, b.left)) > tol;
    const offset = (b) => (horiz ? Math.abs((b.top + b.bottom) / 2 - (a.top + a.bottom) / 2) : Math.abs((b.left + b.right) / 2 - (a.left + a.right) / 2));
    const cands = items.filter((el) => el !== cur).map((el) => ({ el, b: el.getBoundingClientRect() })).filter((c) => ahead(c.b));
    if (!cands.length) return false;
    const aligned = cands.filter((c) => overlap(c.b));
    const pick = aligned.length
      ? aligned.sort((x, y) => gap(x.b) - gap(y.b) || offset(x.b) - offset(y.b))[0]
      : cands.sort((x, y) => (gap(x.b) + 2 * offset(x.b)) - (gap(y.b) + 2 * offset(y.b)))[0];
    pick.el.focus({ preventScroll: true });
    pick.el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    return true;
  }

  // Starts a tile's art when it's hovered or keyboard focused, and stops it
  // once it's neither.
  function wireArt(btn, pic) {
    let active = false;
    const enter = () => {
      if (active) return;
      active = true;
      if (pic.enter) pic.enter();
    };
    const leave = () => {
      if (!active || btn.matches(':hover') || btn.matches(':focus-visible')) return;
      active = false;
      if (pic.leave) pic.leave();
    };
    btn.addEventListener('pointerenter', enter);
    btn.addEventListener('focus', () => { if (btn.matches(':focus-visible')) enter(); });
    btn.addEventListener('pointerleave', () => setTimeout(leave));
    btn.addEventListener('blur', () => setTimeout(leave));
  }

  // Fading edges show there's more menu to scroll to. CSS draws them with a
  // scroll-driven animation; browsers without one get classes from an
  // IntersectionObserver on a 1px marker at each end of the track.
  function edgeHints(track) {
    const start = h('span', { class: 'hub-track__edge', 'aria-hidden': 'true' });
    const end = h('span', { class: 'hub-track__edge', 'aria-hidden': 'true' });
    track.prepend(start);
    track.append(end);
    if ((window.CSS && CSS.supports('animation-timeline', 'scroll()')) || typeof IntersectionObserver !== 'function') return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        track.classList.toggle(target === start ? 'more-start' : 'more-end', !isIntersecting);
      });
    }, { root: track });
    io.observe(start);
    io.observe(end);
  }

  // A menu tile: art on the right, the title top left, a note bottom left.
  function menuTile(key, title, note, pic, go) {
    const noteEl = note ? h('span', { class: 'hub-tile__note' }, note) : null;
    const btn = h('button', {
      type: 'button', class: `hub-tile hub-tile--${key}`, 'data-nav': '',
      on: { click: () => { XC.audio.select(); go(); } }
    }, pic ? pic.el : null, h('span', { class: 'hub-tile__title' }, title), noteEl);
    if (pic) wireArt(btn, pic);
    btn.noteEl = noteEl;
    return btn;
  }

  XC.screens.hub = {
    title: 'Franchise',
    squadTabs: false,
    render(root) {
      const state = XC.state;
      if (!state) return XC.go('title');
      const next = nextUp(state);
      this.next = next;
      this.root = root;
      const art = XC.hubArt;

      const nextTile = h('section', { class: 'hub-tile hub-tile--next', 'aria-label': 'Next up' },
        ui.crest(state.school),
        h('p', { class: 'hub-next__kicker' }, next.kicker),
        h('h2', { class: 'hub-next__headline' }, next.headline),
        h('p', { class: 'hub-next__facts' }, next.facts.filter(Boolean).map((f) => h('span', null, f))),
        h('div', { class: 'actions' },
          ui.button(next.action, () => { XC.audio.select(); next.go(); }, { variant: 'primary', size: 'big', key: 'Enter', attrs: { 'data-nav': '', 'data-autofocus': '' } })));

      // Program snapshot: team OVRs, reputation, the latest results.
      const squads = h('div', { class: 'snapshot__squads' }, state.programs.map((sq) => {
        const roster = state.squads[sq].roster;
        return h('div', { class: 'snapshot__squad' },
          h('p', { class: 'snapshot__label' }, `${S.squadLabel(sq)}`),
          h('p', { class: 'bignum' }, String(A.teamOvr(roster)), h('small', null, 'OVR')),
          h('p', { class: 'snapshot__sub' }, `${roster.length} runners`));
      }));
      const win = XC.difficulty.range(state);
      const rep = h('div', { class: 'snapshot__rep' },
        ui.meter(state.rep / 100, `Reputation ${Math.round(state.rep)} of 100`),
        h('p', { class: 'meter-label' },
          h('span', null, `Reputation ${Math.round(state.rep)} / 100`),
          h('span', null, `Recruits ${win.min}–${win.max} OVR`)));
      const done = state.schedule.filter((m) => m.done).slice(-3);
      const record = done.length
        ? h('ul', { class: 'record-list' }, done.map((m) => h('li', null,
          h('span', null, m.name),
          h('span', null, state.programs.map((sq) => `${state.programs.length > 1 ? `${sq} ` : ''}${placeText(m.results[sq])}`).join(', ')))))
        : h('p', { class: 'snapshot__sub' }, state.phase === 'preseason' ? 'Season opens after recruiting.' : 'No meets run yet this season.');
      const snapshot = h('section', { class: 'hub-tile hub-tile--snap', 'aria-label': `${state.school.short} snapshot` },
        h('header', { class: 'snapshot__head' },
          h('h2', { class: 'hub-tile__title' }, `${state.school.short} snapshot`),
          h('p', { class: 'snapshot__sub' }, `Coach ${state.coach.name}`)),
        squads, rep, record);

      const unread = XC.texts.unread(state).length;
      const upcoming = state.phase === 'season' ? state.schedule[state.meetIndex] : null;
      const signed = state.staff.coaches.filter((c) => !c.expiring).length;
      const depth = menuTile('roster', 'Depth chart', 'Set your top seven', null, () => XC.go('roster'));
      const rosterArt = art.roster(state, (a) => { depth.noteEl.textContent = `${A.fullName(a)}, ${a.ovr} OVR`; });
      depth.prepend(rosterArt.el);
      wireArt(depth, rosterArt);

      const tiles = [
        depth,
        menuTile('schedule', 'Schedule', upcoming ? `Next: ${upcoming.name}, ${upcoming.date}` : 'Six meets, opener to nationals', art.schedule(state), () => XC.go('schedule')),
        menuTile('texts', 'Texts', unread ? `${unread} unread from your runners` : 'Messages from your runners', art.texts(state), () => XC.go('texts')),
        menuTile('facilities', 'Facilities', `Fund $${Math.round(state.funds || 0)}k`, art.facilities(state), () => XC.go('facilities')),
        menuTile('trophies', 'Trophy case', 'Banners and All-Americans', art.trophies(state), () => XC.go('trophies')),
        menuTile('staff', 'Staff', signed ? `${signed} assistant${signed === 1 ? '' : 's'}` : 'No assistants yet', art.staff(state), () => XC.go('staff')),
        menuTile('settings', 'Settings', null, art.settings(state), () => XC.go('settings'))
      ];

      const grid = h('div', { class: 'hub-grid' }, nextTile, snapshot,
        h('nav', { class: 'hub-menu', 'aria-label': 'Franchise menu' }, tiles));
      const track = h('div', { class: 'hub-track' }, grid);
      // A vertical wheel scrolls the menu sideways, until it reaches an end.
      track.addEventListener('wheel', (e) => {
        if (e.ctrlKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
        const max = track.scrollWidth - track.clientWidth;
        if (max <= 0) return;
        const dy = e.deltaY * (e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? track.clientWidth : 1);
        if ((dy < 0 && track.scrollLeft <= 0) || (dy > 0 && track.scrollLeft >= max - 1)) return;
        e.preventDefault();
        track.scrollLeft += dy;
      }, { passive: false });
      this.track = track;
      root.appendChild(h('div', { class: 'hub' }, track));
      edgeHints(track);
    },
    legend() {
      return [
        { key: 'Enter', label: 'Select', keyboardOnly: true, action: () => document.activeElement && document.activeElement.click() },
        { key: '← →', label: 'Browse', keyboardOnly: true, action: () => spatialMove(this.root, 'ArrowRight') },
        { key: 'D', label: 'Depth chart', action: () => XC.go('roster') },
        { key: 'S', label: 'Schedule', action: () => XC.go('schedule') },
        { key: 'M', label: 'Mute', keyboardOnly: true, action: () => XC.settings.toggleSound() }
      ];
    },
    onKey(e) {
      const k = e.key.toLowerCase();
      if (k === 'd') { XC.go('roster'); return true; }
      if (k === 's') { XC.go('schedule'); return true; }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        // No tile that way: still swallow the key, so focus doesn't wrap around.
        if (spatialMove(this.root, e.key)) XC.audio.nav();
        return true;
      }
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
          h('tbody', null, hist.toReversed().map((season) => h('tr', null,
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
        XC.state ? row('Difficulty', XC.difficulty.of(XC.state).blurb, h('span', { class: 'badge' }, XC.difficulty.of(XC.state).label)) : null,
        row('Theme', 'System matches your device’s light or dark setting.',
          h('div', { class: 'setting__choices', role: 'group', 'aria-label': 'Color scheme' },
            [['system', `System (${ui.systemDark() ? 'dark' : 'light'})`], ['light', 'Light'], ['dark', 'Dark']].map(([theme, label]) =>
              ui.button(label, () => { XC.settings.setTheme(theme); XC.refresh(); }, {
                variant: settings.theme === theme ? 'primary' : 'ghost',
                size: 'small',
                attrs: { id: `theme-${theme}`, 'aria-pressed': String(settings.theme === theme), 'data-nav': '' }
              })))),
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
