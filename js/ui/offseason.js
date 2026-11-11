/* Offseason flow: season recap, graduation, training report. */
(function (XC) {
  'use strict';

  const U = XC.util;
  const h = U.h;
  const ui = XC.ui;
  const S = XC.season;
  XC.screens = XC.screens || {};

  const fmtPlace = (r) => (r.place ? `${U.ordinal(r.place)} of ${r.nTeams}` : r.type === 'national' ? 'Did not qualify' : '—');

  /* ======================= Recap ======================= */

  XC.screens.recap = {
    title: 'Season recap',
    render(root) {
      const state = XC.state;
      if (!state) return XC.go('title');
      if (state.phase !== 'recap') return XC.go('hub');
      this.root = root;
      this.draw();
    },

    draw() {
      const root = this.root;
      const state = XC.state;
      const sq = XC.activeSquad;
      const entry = state.history[state.history.length - 1];
      const q = entry.squads[sq];
      U.clear(root);

      const headline = q.national === 1
        ? 'National champions'
        : q.national && q.national <= 4
          ? `National podium: ${U.ordinal(q.national)}`
          : q.national
            ? `${U.ordinal(q.national)} at nationals`
            : q.conf === 1
              ? 'Conference champions'
              : `${U.ordinal(q.conf)} in the conference`;

      const hero = h('section', { class: 'results-hero on-dark' },
        h('p', { class: 'results-hero__place' }, String(entry.year)),
        h('div', null,
          h('p', { class: 'results-hero__line' }, `${S.squadLabel(sq)} team: ${headline}`),
          h('p', { class: 'results-hero__sub' }, q.natNote)),
        h('div', { class: 'results-hero__rep' },
          h('strong', null, ui.delta(entry.repEnd - entry.repStart)),
          h('span', null, 'Rep this year')));

      const meets = h('table', { class: 'grid' },
        h('thead', null, h('tr', null, h('th', { scope: 'col', class: 'cell-left' }, 'Meet'), h('th', { scope: 'col' }, 'Finish'), h('th', { scope: 'col' }, 'Score'))),
        h('tbody', null, q.results.map((r) => h('tr', { class: r.place === 1 ? 'is-user' : '' },
          h('td', { class: 'cell-left' }, r.name),
          h('td', null, fmtPlace(r)),
          h('td', null, r.score ? String(r.score) : '—')))));

      // Rep meter animates from where the season began to where it ended.
      const meter = ui.meter(entry.repStart / 100, `Reputation went from ${Math.round(entry.repStart)} to ${Math.round(entry.repEnd)}`);
      const fill = meter.querySelector('.meter__fill');
      requestAnimationFrame(() => requestAnimationFrame(() => fill.style.setProperty('--fill', `${U.clamp(entry.repEnd, 0, 100)}%`)));
      const nextRep = entry.repEnd > 80 ? entry.repEnd - 5 : entry.repEnd > 20 ? entry.repEnd - 3 : entry.repEnd;
      const win = S.repWindow(nextRep);

      const highlights = [];
      if (q.aa.length) highlights.push(['good', `All-Americans: ${q.aa.join(', ')}.`]);
      if (q.conf === 1) highlights.push(['good', 'Conference title banner earned.']);
      if (q.regional === 1) highlights.push(['good', 'Regional champions.']);
      if (q.mvp && q.mvp.pr) highlights.push(['', `Fastest on the team: ${q.mvp.name}, ${U.formatTime(q.mvp.pr)}.`]);
      highlights.push(['', `Next recruiting class: ${win.min}–${win.max} OVR after the offseason reputation dip.`]);

      root.appendChild(h('div', { class: 'stack' },
        hero,
        h('div', { class: 'results-grid' },
          ui.panel('Meet by meet', meets, { aside: `Team OVR ${q.teamOvr}` }),
          h('div', { class: 'stack' },
            ui.panel('Reputation', h('div', null, meter,
              h('p', { class: 'meter-label' },
                h('span', null, `Started at ${Math.round(entry.repStart)}`),
                h('span', null, `Finished at ${Math.round(entry.repEnd)}`)))),
            ui.panel('Highlights', h('ul', { class: 'notes' }, highlights.map(([k, t]) => h('li', { class: k ? `note--${k}` : '' }, t)))))),
        h('div', { class: 'actions actions--end' },
          ui.button('Continue to graduation', () => this.next(), { variant: 'primary', size: 'big', key: 'Enter', attrs: { 'data-autofocus': '' } }))));
    },

    next() {
      S.beginOffseason(XC.state);
      XC.save();
      XC.audio.select();
      XC.go('graduation');
    },

    onSquadChange() {
      this.draw();
    },

    legend() {
      const items = [{ key: 'Enter', label: 'Continue', action: () => this.next() }];
      if (XC.state && XC.state.programs.length > 1) items.push({ key: 'Q E', label: 'Squad', keyboardOnly: true, action: () => XC.setSquad(XC.activeSquad === 'M' ? 'W' : 'M') });
      items.push({ key: 'Esc', label: 'Hub', action: () => XC.go('hub') });
      return items;
    },

    onKey(e) {
      if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
        this.next();
        return true;
      }
      return false;
    },

    back() {
      XC.go('hub');
    }
  };

  /* ======================= Graduation ======================= */

  XC.screens.graduation = {
    title: 'Graduation day',
    render(root) {
      const state = XC.state;
      if (!state) return XC.go('title');
      if (state.phase !== 'graduation' || !state.offseason) return XC.go('hub');
      this.root = root;
      this.draw();
    },

    draw() {
      const root = this.root;
      const state = XC.state;
      const sq = XC.activeSquad;
      const grads = state.offseason.graduates[sq] || [];
      U.clear(root);

      let body;
      if (!grads.length) {
        body = h('p', { class: 'empty' }, 'No seniors on this roster this year. Everyone returns.');
      } else {
        body = h('ul', { class: 'grad-grid' }, grads.map((g) => {
          const c = g.career;
          const lines = [
            `${c.races} race${c.races === 1 ? '' : 's'} for ${state.school.short}${c.best ? `, best finish ${U.ordinal(c.best)}` : ''}`,
            `Final OVR ${g.ovr}${g.pr ? `, PR ${U.formatTime(g.pr)}` : ''}`,
            c.aa ? `${c.aa}-time All-American` : c.wins ? `${c.wins} race win${c.wins > 1 ? 's' : ''}` : g.hometown
          ];
          return h('li', { class: 'grad-card on-dark' },
            ui.portrait(g),
            h('div', null,
              h('p', { class: 'grad-card__name' }, g.name),
              lines.map((l) => h('p', { class: 'grad-card__line' }, l))));
        }));
      }

      root.appendChild(h('div', { class: 'stack' },
        h('p', { class: 'lede' }, `The class of ${state.offseason.year} moves on. Seniors graduate automatically after their fourth year.`),
        ui.panel(`${S.squadLabel(sq)} graduates`, body, { aside: `${grads.length} leaving` }),
        h('div', { class: 'actions actions--end' },
          ui.button('Continue to training report', () => this.next(), { variant: 'primary', size: 'big', key: 'Enter', attrs: { 'data-autofocus': '' } }))));
    },

    next() {
      XC.state.phase = 'progression';
      XC.save();
      XC.audio.select();
      XC.go('progression');
    },

    onSquadChange() {
      this.draw();
    },

    legend() {
      const items = [{ key: 'Enter', label: 'Continue', action: () => this.next() }];
      if (XC.state && XC.state.programs.length > 1) items.push({ key: 'Q E', label: 'Squad', keyboardOnly: true, action: () => XC.setSquad(XC.activeSquad === 'M' ? 'W' : 'M') });
      items.push({ key: 'Esc', label: 'Hub', action: () => XC.go('hub') });
      return items;
    },

    onKey(e) {
      if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
        this.next();
        return true;
      }
      return false;
    },

    back() {
      XC.go('hub');
    }
  };

  /* ======================= Training report ======================= */

  XC.screens.progression = {
    title: 'Training report',
    render(root) {
      const state = XC.state;
      if (!state) return XC.go('title');
      if (state.phase !== 'progression' || !state.offseason) return XC.go('hub');
      this.root = root;
      this.draw();
    },

    draw() {
      const root = this.root;
      const state = XC.state;
      const sq = XC.activeSquad;
      const rows = state.offseason.progression[sq] || [];
      U.clear(root);
      const avgGain = rows.length ? U.avg(rows.map((r) => r.delta)) : 0;
      const best = rows[0];

      const table = rows.length
        ? h('div', { class: 'table-wrap' }, h('table', { class: 'grid' },
          h('thead', null, h('tr', null, ['Runner', 'Now', 'Before', 'After', 'Change', 'POT'].map((c, i) => h('th', { scope: 'col', class: i === 0 ? 'cell-name' : '' }, c)))),
          h('tbody', null, rows.map((r, i) => h('tr', { class: i === 0 && r.delta > 0 ? 'is-selected' : '' },
            h('td', { class: 'cell-name' }, r.name),
            h('td', null, XC.athletes.yearShort(r.yearAfter)),
            h('td', null, String(r.before)),
            h('td', null, String(r.after)),
            h('td', null, ui.delta(r.delta, 0)),
            h('td', null, ui.pot(r.pot)))))))
        : h('p', { class: 'empty' }, 'No returning runners on this roster.');

      root.appendChild(h('div', { class: 'stack' },
        h('p', { class: 'lede' }, best && best.delta > 0
          ? `Summer miles paid off. ${best.name} made the biggest jump, ${best.before} to ${best.after}. Average change: ${U.signed(avgGain, 1)}.`
          : 'A quiet summer. Potential grades decide how much each runner grows.'),
        ui.panel(`${S.squadLabel(sq)} returners`, table, { aside: 'Higher potential means bigger offseason gains' }),
        h('div', { class: 'actions actions--end' },
          ui.button('Continue to roster cuts', () => this.next(), { variant: 'primary', size: 'big', key: 'Enter', attrs: { 'data-autofocus': '' } }))));
    },

    next() {
      XC.state.phase = 'cut';
      XC.save();
      XC.audio.select();
      XC.go('roster', { mode: 'cut' });
    },

    onSquadChange() {
      this.draw();
    },

    legend() {
      const items = [{ key: 'Enter', label: 'Continue', action: () => this.next() }];
      if (XC.state && XC.state.programs.length > 1) items.push({ key: 'Q E', label: 'Squad', keyboardOnly: true, action: () => XC.setSquad(XC.activeSquad === 'M' ? 'W' : 'M') });
      items.push({ key: 'Esc', label: 'Hub', action: () => XC.go('hub') });
      return items;
    },

    onKey(e) {
      if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
        this.next();
        return true;
      }
      return false;
    },

    back() {
      XC.go('hub');
    }
  };
})(window.XC = window.XC || {});
