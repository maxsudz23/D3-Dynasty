/* Staff: the assistant coaches, their contracts, and the hiring pool. */
(function (XC) {
  'use strict';

  const U = XC.util;
  const h = U.h;
  const ui = XC.ui;
  const S = XC.season;
  const ST = XC.staff;
  XC.screens = XC.screens || {};

  const money = (k) => `$${k}k`;
  const yearsText = (n) => `${n} year${n === 1 ? '' : 's'}`;
  const bonusPct = (c) => Math.round(ST.SPECIALTY_BONUS * ST.quality(c) * 100);

  XC.screens.staff = {
    title: 'Coaching staff',
    squadTabs: false,

    render(root) {
      const state = XC.state;
      if (!state) return XC.go('title');
      ST.ensure(state);
      this.root = root;
      this.draw();
    },

    draw() {
      const state = XC.state;
      const root = this.root;
      const focusId = document.activeElement && document.activeElement.id;
      U.clear(root);
      const open = ST.isOpen(state);
      const signed = ST.signed(state);
      const best = ST.best(state);

      const stats = h('div', { class: 'staff-stats' }, [
        ['Budget', money(ST.budget(state)), 'Grows with reputation'],
        ['Payroll', money(ST.payroll(state)), `${signed.length} of ${ST.SLOTS} assistants`],
        ['Room', money(Math.max(0, ST.room(state))), 'Left to spend'],
        ['Injury risk', best ? `−${Math.round((1 - ST.riskFactor(state)) * 100)}%` : '—', 'In workouts, from supervision']
      ].map(([label, value, note]) => h('div', { class: 'staff-stat' },
        h('p', { class: 'staff-stat__label' }, label),
        h('p', { class: 'staff-stat__value' }, value),
        h('p', { class: 'staff-stat__note' }, note))));

      const staffCards = state.staff.coaches.length
        ? h('ul', { class: 'staff-grid' }, state.staff.coaches.map((c) => this.staffCard(c)))
        : h('p', { class: 'empty' }, 'No assistants. You run every session yourself.');

      const pool = state.staff.pool;
      const poolCards = !open
        ? h('p', { class: 'empty' }, 'Candidates come looking for work after nationals. Hiring stays open through the preseason.')
        : pool.length
          ? h('div', { class: 'stack' },
            ST.openSlots(state) <= 0 ? h('p', { class: 'notice' }, `The staff is full (${ST.SLOTS} assistants). Let someone go to make room.`) : null,
            h('ul', { class: 'staff-grid' }, pool.map((c) => this.candidateCard(c))))
          : h('p', { class: 'empty' }, 'Everyone on the market has been hired. A new slate arrives next offseason.');

      root.appendChild(h('div', { class: 'stack' },
        h('p', { class: 'lede' },
          'Assistants make sessions in their specialty count for more and watch every workout, which cuts injuries. Their “Staff suggestion” on workout day leans toward those specialties and is less exact than your own “Suggest”.'),
        open
          ? null
          : h('p', { class: 'notice' }, 'Hiring opens after nationals and closes when the season starts.'),
        stats,
        ui.panel('Your staff', staffCards, { aside: `Head coach: Coach ${state.coach.name}` }),
        ui.panel('Candidates', poolCards, { aside: open ? `Ratings up to ${ST.poolMax(state)} at your reputation` : 'Closed' })));

      if (focusId) {
        const el = document.getElementById(focusId);
        if (el && !el.disabled) el.focus({ preventScroll: true });
      }
    },

    staffCard(c) {
      const state = XC.state;
      const open = ST.isOpen(state);
      const lines = [
        `${ST.specialtyLabel(c.specialty)} specialist, on staff since ${S.yearOf(c.since)}`,
        c.expiring
          ? `Contract up. Asks ${money(c.ask.salary)} a season for ${yearsText(c.ask.years)}.`
          : `${money(c.salary)} a season, ${yearsText(c.years)} left`
      ];
      const actions = [];
      let why = '';
      if (c.expiring) {
        why = ST.blocker(state, c.ask.salary);
        actions.push(ui.button('Re-sign', () => this.resign(c.id), { variant: 'primary', size: 'small', disabled: !!why, attrs: { id: `resign-${c.id}`, 'data-nav': '' } }));
      }
      if (open) actions.push(ui.button('Let go', () => this.release(c.id), { variant: 'ghost', size: 'small', attrs: { id: `release-${c.id}`, 'data-nav': '' } }));
      return h('li', { class: `staff-card on-dark${c.expiring ? ' staff-card--expiring' : ''}` },
        h('div', null,
          h('p', { class: 'staff-card__name' }, ST.fullName(c)),
          lines.map((l) => h('p', { class: 'staff-card__line' }, l))),
        this.rating(c),
        h('p', { class: 'staff-card__effect' }, c.expiring
          ? 'Leaves when the season starts unless re-signed.'
          : `+${bonusPct(c)}% benefit from ${ST.specialtyNoun(c.specialty)} sessions`),
        why ? h('p', { class: 'staff-card__why' }, why) : null,
        actions.length ? h('div', { class: 'actions' }, actions) : null);
    },

    candidateCard(c) {
      const state = XC.state;
      const why = ST.blocker(state, c.salary);
      // A full staff is said once above the list, not on every card.
      const shown = ST.openSlots(state) > 0 ? why : '';
      return h('li', { class: 'staff-card on-dark' },
        h('div', null,
          h('p', { class: 'staff-card__name' }, ST.fullName(c)),
          h('p', { class: 'staff-card__line' }, `${ST.specialtyLabel(c.specialty)} specialist`),
          h('p', { class: 'staff-card__line' }, `Asks ${money(c.salary)} a season for ${yearsText(c.years)}`)),
        this.rating(c),
        h('p', { class: 'staff-card__effect' }, `+${bonusPct(c)}% benefit from ${ST.specialtyNoun(c.specialty)} sessions`),
        shown ? h('p', { class: 'staff-card__why' }, shown) : null,
        h('div', { class: 'actions' },
          ui.button('Hire', () => this.hire(c.id), { variant: 'primary', size: 'small', disabled: !!why, attrs: { id: `hire-${c.id}`, 'data-nav': '' } })));
    },

    rating(c) {
      return h('div', { class: 'staff-card__rating' },
        h('strong', null, String(c.rating)),
        h('span', null, 'Rating'));
    },

    hire(id) {
      const state = XC.state;
      const c = state.staff.pool.find((x) => x.id === id);
      if (!c) return;
      const why = ST.blocker(state, c.salary);
      if (why) {
        ui.toast(why, 'warn');
        return;
      }
      ST.hire(state, id);
      this.done(`${ST.fullName(c)} joins the staff.`);
    },

    resign(id) {
      const state = XC.state;
      const c = state.staff.coaches.find((x) => x.id === id);
      if (!c || !c.expiring) return;
      const why = ST.blocker(state, c.ask.salary);
      if (why) {
        ui.toast(why, 'warn');
        return;
      }
      ST.resign(state, id);
      this.done(`${ST.fullName(c)} signs on for ${yearsText(c.years)}.`);
    },

    async release(id) {
      const state = XC.state;
      const c = state.staff.coaches.find((x) => x.id === id);
      if (!c || !ST.isOpen(state)) return;
      const ok = await ui.confirm(`Let ${ST.fullName(c)} go? They won’t be back on the market.`, 'Let go');
      if (!ok || !ST.isOpen(XC.state)) return;
      ST.release(XC.state, id);
      XC.audio.back();
      XC.save();
      ui.renderTicker();
      this.draw();
    },

    done(message) {
      XC.audio.select();
      XC.save();
      ui.renderTicker();
      ui.toast(message);
      this.draw();
    },

    legend() {
      return [
        { key: 'Enter', label: 'Select focused', keyboardOnly: true, action: () => document.activeElement && document.activeElement.click() },
        { key: 'Esc', label: 'Back', action: () => XC.go('hub') }
      ];
    },

    back() {
      XC.go('hub');
    }
  };
})(window.XC = window.XC || {});
