/* Meet preview (course, live weather, contenders, lineup, strategy) and
   the results screen. */
(function (XC) {
  'use strict';

  const U = XC.util;
  const h = U.h;
  const ui = XC.ui;
  const S = XC.season;
  const A = XC.athletes;
  const R = XC.race;
  XC.screens = XC.screens || {};

  function weatherNotes(w) {
    const notes = [];
    if (w.tempC > 18) notes.push('Heat will slow every runner. Durable athletes cope best.');
    if (w.tempC < 0) notes.push('Bitter cold. Expect slower times.');
    if (w.soft) notes.push('Soft footing rewards durability and mental toughness.');
    if (w.windKph > 20) notes.push('Gusty wind will cost a few seconds per kilometer.');
    if (!notes.length) notes.push('Good racing weather. Fast times possible.');
    return notes;
  }

  /* ======================= Preview ======================= */

  XC.screens.meet = {
    title: 'Meet preview',
    render(root) {
      const state = XC.state;
      if (!state) return XC.go('title');
      const meet = S.currentMeet(state);
      if (!meet) return XC.go('hub');
      this.root = root;
      this.meet = meet;
      this.draw();
      if (!meet.weather) this.loadWeather(meet);
    },

    async loadWeather(meet) {
      const w = await XC.api.fetchWeather(meet.host.lat, meet.host.lon, meet.month, meet.id);
      if (!XC.state || meet.weather || meet.done) return;
      meet.weather = w;
      XC.save();
      if (XC.currentScreen() === 'meet' && this.meet === meet) this.drawWeather();
    },

    draw() {
      const root = this.root;
      const meet = this.meet;
      const state = XC.state;
      U.clear(root);
      const typeLabel = meet.type === 'invite' ? `Invitational ${meet.index + 1} of 3` : S.MEET_TYPES[meet.type];
      const distances = state.programs.map((sq) => `${S.squadNoun(sq)} ${R.DIST[sq].label}`).join(', ');

      const hero = h('section', { class: 'meet-hero' },
        h('p', { class: 'meet-hero__type' }, typeLabel),
        h('h2', { class: 'meet-hero__name' }, meet.name),
        h('p', { class: 'meet-hero__facts' },
          h('span', null, meet.date),
          h('span', null, `Hosted by ${meet.host.short}`),
          h('span', null, meet.course.name),
          h('span', null, distances)));

      const course = R.COURSES[meet.course.type];
      const coursePanel = ui.panel('Course', h('dl', { class: 'info-list' },
        h('dt', null, 'Profile'), h('dd', null, course.label),
        h('dt', null, 'What wins'), h('dd', null, course.note),
        h('dt', null, 'Field'), h('dd', null, `${S.fieldSchools(state, meet, XC.activeSquad).length + 1} teams`)));

      this.weatherBody = h('div');
      const weatherPanel = ui.panel('Race-day weather', this.weatherBody);

      this.squadArea = h('div', { class: 'stack' });

      root.appendChild(h('div', { class: 'meet' },
        h('div', { class: 'stack' }, hero, coursePanel, weatherPanel),
        this.squadArea));
      this.drawWeather();
      this.drawSquad();
    },

    drawWeather() {
      const body = this.weatherBody;
      const w = this.meet.weather;
      U.clear(body);
      if (!w) {
        body.appendChild(h('p', { class: 'muted' }, `Checking conditions at ${this.meet.host.short}…`));
        return;
      }
      body.appendChild(h('div', { class: 'weather' },
        h('p', { class: 'weather__temp' }, `${XC.api.toF(w.tempC)}°`),
        h('dl', { class: 'info-list' },
          h('dt', null, 'Sky'), h('dd', null, w.label),
          h('dt', null, 'Wind'), h('dd', null, `${XC.api.toMph(w.windKph)} mph`),
          h('dt', null, 'Rain'), h('dd', null, `${U.round(w.precipMm, 1)} mm`),
          h('dt', null, 'Footing'), h('dd', null, w.ground)),
        h('p', { class: `weather__source${w.live ? '' : ' weather__source--warn'}` },
          w.live
            ? `Live conditions at ${this.meet.host.short} from Open-Meteo.`
            : 'Live weather is unavailable, so these conditions are simulated for the date.')));
      body.appendChild(h('ul', { class: 'notes' }, weatherNotes(w).map((n) => h('li', null, n))));
    },

    drawSquad() {
      const area = this.squadArea;
      const state = XC.state;
      const meet = this.meet;
      const sq = XC.activeSquad;
      const squad = state.squads[sq];
      U.clear(area);

      // Contenders: field ranked by team strength, with your team slotted in.
      const field = S.fieldSchools(state, meet, sq).map((s) => ({ short: s.short, primary: s.primary, accent: s.accent, ovr: Math.round(state.opp[sq][s.id]), user: false }));
      const entry = S.userEntry(state, meet, sq);
      const userOvr = A.teamOvr(squad.roster);
      if (entry && entry.scored) field.push({ short: state.school.short, primary: state.school.primary, accent: state.school.accent, ovr: userOvr, user: true });
      field.sort((a, b) => b.ovr - a.ovr);
      const userRank = field.findIndex((f) => f.user);
      const shown = field.slice(0, 6);
      if (userRank >= 6) shown.push(field[userRank]);
      const contenders = h('table', { class: 'grid' },
        h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Rank'), h('th', { scope: 'col', class: 'cell-left' }, 'Team'), h('th', { scope: 'col' }, 'Team OVR'))),
        h('tbody', null, shown.map((f) => h('tr', { class: f.user ? 'is-user' : '' },
          h('td', null, String(field.indexOf(f) + 1)),
          h('td', { class: 'cell-left' }, ui.teamChip(f.primary, f.accent), f.short),
          h('td', null, String(f.ovr))))));
      area.appendChild(ui.panel(`${S.squadLabel(sq)} contenders`, contenders, {
        aside: userRank >= 0 ? `You rank ${U.ordinal(userRank + 1)} of ${field.length} on paper` : `${field.length} teams`
      }));

      // Lineup
      let lineupBody;
      if (!entry) {
        lineupBody = h('div', { class: 'stack' },
          h('p', { class: 'notice notice--warn' }, squad.natQual ? squad.natQual.reason : 'Your team is not entered.'),
          h('p', { class: 'muted' }, 'You can still watch the championship race.'));
      } else {
        const runners = entry.runners;
        const list = h('table', { class: 'grid' },
          h('thead', null, h('tr', null, ['#', 'Runner', 'YR', 'OVR', 'PR'].map((c, i) => h('th', { scope: 'col', class: i === 1 ? 'cell-left' : '' }, c)))),
          h('tbody', null, runners.map((a, i) => h('tr', null,
            h('td', null, String(i + 1)),
            h('td', { class: 'cell-left' }, A.fullName(a)),
            h('td', null, A.yearShort(a.year)),
            h('td', null, String(a.ovr)),
            h('td', null, a.pr ? U.formatTime(a.pr) : '—')))));
        const injured = squad.roster.filter((a) => a.injury > 0);
        lineupBody = h('div', { class: 'stack' },
          !entry.scored ? h('p', { class: 'notice' }, squad.natQual.reason) : null,
          runners.length < 5 && entry.scored ? h('p', { class: 'notice notice--warn' }, 'Fewer than five healthy runners. The team can’t post a score.') : null,
          list,
          injured.length ? h('p', { class: 'muted' }, `Injured: ${injured.map((a) => `${A.fullName(a)} (out ${a.injury})`).join(', ')}`) : null,
          this.strategyPicker(sq));
      }
      area.appendChild(ui.panel(`${S.squadLabel(sq)} lineup`, lineupBody, { aside: entry ? `Team OVR ${userOvr}` : '' }));

      area.appendChild(h('div', { class: 'actions actions--end' },
        ui.button('Edit lineup', () => XC.go('roster', { from: 'meet' }), { variant: 'ghost', attrs: { 'data-nav': '' } }),
        ui.button(meet.type === 'national' && !state.programs.some((p) => S.userEntry(state, meet, p)) ? 'Watch the race' : 'Start race',
          () => this.start(), { variant: 'primary', size: 'big', key: 'Enter', attrs: { 'data-nav': '', 'data-autofocus': '' } })));
    },

    strategyPicker(sq) {
      const squad = XC.state.squads[sq];
      return h('fieldset', { class: 'strategy' },
        h('legend', null, 'Race plan'),
        Object.entries(R.STRATEGIES).map(([key, s]) => {
          const input = h('input', { type: 'radio', name: `strategy-${sq}`, value: key, checked: squad.strategy === key });
          input.addEventListener('change', () => {
            squad.strategy = key;
            XC.audio.nav();
            XC.save();
          });
          return h('label', { class: 'strategy__option' }, input,
            h('span', { class: 'strategy__label' }, s.label),
            h('span', { class: 'strategy__note' }, s.note));
        }));
    },

    start() {
      const state = XC.state;
      const meet = this.meet;
      if (!meet || meet.done) return;
      const index = meet.index;
      const races = S.runMeet(state);
      XC.save();
      XC.live.races = races;
      XC.live.meetIndex = index;
      XC.go('race', { i: 0 });
    },

    onSquadChange() {
      this.drawSquad();
    },

    legend() {
      const items = [
        { key: 'Enter', label: 'Start race', action: () => this.start() },
        { key: 'L', label: 'Edit lineup', action: () => XC.go('roster', { from: 'meet' }) }
      ];
      if (XC.state && XC.state.programs.length > 1) items.push({ key: 'Q E', label: 'Squad', keyboardOnly: true, action: () => XC.setSquad(XC.activeSquad === 'M' ? 'W' : 'M') });
      items.push({ key: 'Esc', label: 'Hub', action: () => XC.go('hub') });
      return items;
    },

    onKey(e) {
      if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement) && !(e.target instanceof HTMLInputElement)) {
        this.start();
        return true;
      }
      if (e.key.toLowerCase() === 'l') {
        XC.go('roster', { from: 'meet' });
        return true;
      }
      return false;
    },

    back() {
      XC.go('hub');
    }
  };

  /* ======================= Results ======================= */

  XC.screens.results = {
    title: 'Results',
    render(root, params) {
      const state = XC.state;
      if (!state) return XC.go('title');
      this.root = root;
      this.params = params;
      this.meet = state.schedule[params.meetIndex];
      if (!this.meet || !this.meet.done) return XC.go('hub');
      this.draw();
      if (params.fresh) this.celebrate();
    },

    celebrate() {
      const res = this.meet.results[XC.activeSquad];
      if (res && res.userPlace === 1) XC.audio.fanfare();
      else XC.audio.finish();
    },

    draw() {
      const root = this.root;
      const meet = this.meet;
      const state = XC.state;
      const sq = XC.activeSquad;
      const res = meet.results[sq];
      U.clear(root);
      if (!res) {
        root.appendChild(h('p', { class: 'empty' }, 'No results for this squad.'));
        return;
      }

      let placeText;
      let line;
      if (res.userPlace) {
        placeText = U.ordinal(res.userPlace);
        line = `${S.squadLabel(sq)} team finished ${U.ordinal(res.userPlace)} of ${res.nTeams} with ${res.userScore} points.`;
      } else if (res.individualsOnly) {
        const best = res.individuals.find((i) => i.isUser);
        placeText = best ? U.ordinal(best.place) : '—';
        line = best ? `Individual qualifiers raced. Best finish: ${best.name}, ${U.ordinal(best.place)}.` : 'Individual qualifiers did not finish.';
      } else if (res.userEntered) {
        placeText = 'INC';
        line = 'Fewer than five finishers, so the team didn’t score.';
      } else {
        placeText = 'DNQ';
        line = `${S.squadLabel(sq)} team did not qualify for this meet.`;
      }
      const sub = [
        res.winner ? `Team champion: ${res.winner.short}, ${res.winner.score} points.` : '',
        res.champion ? `Individual champion: ${res.champion.name} (${res.champion.short}), ${U.formatTime(res.champion.time)}.` : ''
      ].filter(Boolean).join(' ');

      root.appendChild(h('section', { class: 'results-hero on-dark' },
        h('p', { class: 'results-hero__place' }, placeText),
        h('div', null,
          h('p', { class: 'results-hero__line' }, line),
          h('p', { class: 'results-hero__sub' }, `${meet.name}. ${sub}`)),
        h('div', { class: 'results-hero__rep' }, h('strong', null, ui.delta(res.repDelta)), h('span', null, 'Rep'))));

      // Team standings
      const teamTable = h('div', { class: 'table-wrap' }, h('table', { class: 'grid' },
        h('caption', { class: 'visually-hidden' }, 'Team scores'),
        h('thead', null, h('tr', null,
          ['Pl', 'Team', 'Score', '1', '2', '3', '4', '5', '(6)', '(7)', 'Spread'].map((c, i) => h('th', { scope: 'col', class: i === 1 ? 'cell-left' : '' }, c)))),
        h('tbody', null, res.standings.map((s) => h('tr', { class: s.isUser ? 'is-selected' : '' },
          h('td', null, s.place ? String(s.place) : '—'),
          h('td', { class: 'cell-left' }, ui.teamChip(s.primary, s.accent), s.short),
          h('td', null, s.complete ? String(s.score) : 'INC'),
          Array.from({ length: 7 }, (_, i) => h('td', { class: i >= 5 ? 'cell-dim' : '' }, s.places[i] ? String(s.places[i]) : '')),
          h('td', null, s.spread !== null ? U.formatTime(s.spread) : '—'))))));

      // Individuals: top 25 plus your runners further back
      const indiv = res.individuals.filter((r, i) => i < 25 || r.isUser);
      const indivTable = h('div', { class: 'table-wrap' }, h('table', { class: 'grid' },
        h('caption', { class: 'visually-hidden' }, 'Individual results'),
        h('thead', null, h('tr', null, ['Pl', 'Runner', 'Team', 'Time', ''].map((c, i) => h('th', { scope: 'col', class: i === 1 ? 'cell-name' : '' }, c)))),
        h('tbody', null, indiv.map((r) => h('tr', { class: r.isUser ? 'is-user' : '' },
          h('td', null, String(r.place)),
          h('td', { class: 'cell-name' }, r.name),
          h('td', null, r.short),
          h('td', null, U.formatTime(r.time)),
          h('td', null, r.pr ? h('span', { class: 'badge badge--good' }, 'PR') : ''))))));

      // Notes
      const notes = [];
      res.individuals.filter((r) => r.pr).forEach((r) => notes.push(['good', `${r.name} ran a personal best: ${U.formatTime(r.time)}.`]));
      res.aa.forEach((n) => notes.push(['good', `${n} earns All-American honors.`]));
      res.injuries.forEach((inj) => notes.push(['bad', `${inj.name} picked up an injury and will miss ${inj.out} meet${inj.out > 1 ? 's' : ''}.`]));
      res.dnfs.forEach((n) => notes.push(['bad', `${n} did not finish.`]));
      if (meet.type === 'regional' && state.squads[sq].natQual) notes.push([state.squads[sq].natQual.team ? 'good' : 'bad', state.squads[sq].natQual.reason]);
      if (!notes.length) notes.push(['', 'No injuries, no surprises. On to the next one.']);

      const isFinal = meet.type === 'national' && state.phase === 'recap';
      const fromSchedule = this.params.from === 'schedule';
      root.appendChild(h('div', { class: 'results-grid' },
        h('div', { class: 'stack' },
          ui.panel('Team scores', teamTable, { aside: `${res.nTeams} teams` }),
          ui.panel('Meet notes', h('ul', { class: 'notes' }, notes.map(([k, t]) => h('li', { class: k ? `note--${k}` : '' }, t))))),
        ui.panel('Individual results', indivTable, { aside: `${S.squadLabel(sq)} ${R.DIST[sq].label}` })));

      root.appendChild(h('div', { class: 'actions actions--end' },
        fromSchedule
          ? ui.button('Back to schedule', () => XC.go('schedule'), { variant: 'primary', key: 'Enter', attrs: { 'data-autofocus': '' } })
          : ui.button(isFinal ? 'Season recap' : 'Back to hub', () => this.continue(), { variant: 'primary', size: 'big', key: 'Enter', attrs: { 'data-autofocus': '' } })));
    },

    continue() {
      XC.audio.select();
      if (XC.state.phase === 'recap' && this.meet.type === 'national') XC.go('recap');
      else XC.go('hub');
    },

    onSquadChange() {
      this.draw();
    },

    legend(params) {
      const items = [{ key: 'Enter', label: 'Continue', action: () => (params.from === 'schedule' ? XC.go('schedule') : this.continue()) }];
      if (XC.state && XC.state.programs.length > 1) items.push({ key: 'Q E', label: 'Squad', keyboardOnly: true, action: () => XC.setSquad(XC.activeSquad === 'M' ? 'W' : 'M') });
      return items;
    },

    onKey(e) {
      if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
        if (this.params.from === 'schedule') XC.go('schedule');
        else this.continue();
        return true;
      }
      return false;
    },

    back(params) {
      if (params.from === 'schedule') XC.go('schedule');
      else this.continue();
    }
  };
})(window.XC = window.XC || {});
