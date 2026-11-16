/* Facilities: the facilities fund, upgrades, and the home course editor. */
(function (XC) {
  'use strict';

  const U = XC.util;
  const h = U.h;
  const ui = XC.ui;
  const S = XC.season;
  const F = XC.facilities;
  const C = XC.course;
  XC.screens = XC.screens || {};

  const money = (k) => (k < 0 ? `−$${Math.round(-k)}k` : `$${Math.round(k)}k`);
  const KIND_LABEL = { '': 'Any layout', loop: 'Lapped loop', point: 'Point to point' };

  XC.screens.facilities = {
    title: 'Facilities',
    squadTabs: false,

    render(root) {
      const state = XC.state;
      if (!state) return XC.go('title');
      F.ensure(state);
      this.root = root;
      this.resetDraft();
      this.draw();
    },

    resetDraft() {
      const hc = XC.state.homeCourse;
      this.draft = { name: hc.name, type: hc.type, seed: hc.seed, kind: hc.kind || '', courseId: hc.courseId || null };
    },

    draw(focusId) {
      const state = XC.state;
      const root = this.root;
      focusId = focusId || (document.activeElement && document.activeElement.id);
      U.clear(root);
      const open = F.isOpen(state);
      const last = state.lastPayout;

      const stats = h('div', { class: 'staff-stats' }, [
        ['Facilities fund', money(state.funds), 'Paid in each offseason'],
        ['Last payout', last ? money(last.total) : '—', last ? `After the ${last.year} season` : 'Arrives after your first season'],
        ['Building', open ? 'Open' : 'Closed', open ? 'Until the season starts' : 'Opens after nationals']
      ].map(([label, value, note]) => h('div', { class: 'staff-stat' },
        h('p', { class: 'staff-stat__label' }, label),
        h('p', { class: 'staff-stat__value' }, value),
        h('p', { class: 'staff-stat__note' }, note))));

      const trainingRoom = F.level(state, 'trainingRoom');
      const track = F.level(state, 'track');
      const spectators = F.level(state, 'spectators');
      const cards = h('ul', { class: 'staff-grid' },
        this.upgradeCard('trainingRoom', 'Runners shed 1.5 more fatigue a week per level.', trainingRoom ? `Now +${U.round(trainingRoom * 1.5, 1)} a week` : 'Basic training room'),
        this.upgradeCard('track', 'VO2 max sessions count 5% more per level.', track ? `Now +${track * 5}%` : 'Shared community track'),
        this.upgradeCard('spectators', `Each squad earns +${F.SPECTATOR_REP} rep per level at home meets.`, spectators ? `Now +${U.round(spectators * F.SPECTATOR_REP, 1)} rep a home race` : 'No stands yet'),
        this.championshipCard());

      const payout = last
        ? h('ul', { class: 'payout' }, last.lines.map(([label, v]) => h('li', null, h('span', null, label), h('span', null, money(v)))),
          h('li', { class: 'payout__total' }, h('span', null, 'Total'), h('span', null, money(last.total))))
        : h('p', { class: 'muted' }, 'After each season the athletic department pays a base budget plus amounts for reputation, reputation gained, titles and All-Americans.');

      root.appendChild(h('div', { class: 'stack' },
        h('p', { class: 'lede' }, 'The athletic department funds facilities each offseason, based on how the season went. Staff salaries come from the separate staff budget.'),
        open ? null : h('p', { class: 'notice' }, 'Building happens in the offseason, after nationals and until the next season starts.'),
        stats,
        ui.panel('Upgrades', cards),
        this.coursePanel(),
        ui.panel('How the fund is paid', payout, { aside: last ? `${last.year} season` : '' })));

      const el = focusId && document.getElementById(focusId);
      if (el && !el.disabled) el.focus({ preventScroll: true });
    },

    upgradeCard(key, effect, now) {
      const state = XC.state;
      const item = F.ITEMS[key];
      const lv = F.level(state, key);
      const cost = F.nextCost(state, key);
      const why = F.blocker(state, cost);
      return h('li', { class: 'staff-card on-dark' },
        h('div', null,
          h('p', { class: 'staff-card__name' }, item.label),
          h('p', { class: 'staff-card__line' }, effect)),
        h('div', { class: 'staff-card__rating' }, h('strong', null, `${lv}/${item.max}`), h('span', null, 'Level')),
        h('p', { class: 'staff-card__effect' }, now),
        cost !== null && why && F.isOpen(state) ? h('p', { class: 'staff-card__why' }, why) : null,
        h('div', { class: 'actions' },
          ui.button(cost === null ? 'Fully built' : `Upgrade, ${money(cost)}`, () => this.upgrade(key), {
            variant: 'primary', size: 'small', disabled: !!why, attrs: { id: `up-${key}`, 'data-nav': '' }
          })));
    },

    championshipCard() {
      const state = XC.state;
      const done = state.facilities.championship;
      const why = done ? 'Built.' : F.blocker(state, F.CHAMPIONSHIP_COST);
      return h('li', { class: 'staff-card on-dark' },
        h('div', null,
          h('p', { class: 'staff-card__name' }, 'Championship grade'),
          h('p', { class: 'staff-card__line' }, `Wider lanes, timing mats and a finish chute fit for a title meet. You host the conference meet ${Math.round(F.CONF_HOST.championship * 100)}% of the time instead of ${Math.round(F.CONF_HOST.base * 100)}%.`)),
        h('div', { class: 'staff-card__rating' }, h('strong', null, done ? 'Yes' : 'No'), h('span', null, 'Built')),
        h('p', { class: 'staff-card__effect' }, 'Takes effect from the next schedule.'),
        !done && why && F.isOpen(state) ? h('p', { class: 'staff-card__why' }, why) : null,
        h('div', { class: 'actions' },
          ui.button(done ? 'Built' : `Build, ${money(F.CHAMPIONSHIP_COST)}`, () => this.buyChampionship(), {
            variant: 'primary', size: 'small', disabled: !!why, attrs: { id: 'up-championship', 'data-nav': '' }
          })));
    },

    /* ---------- Home course editor ---------- */

    draftCourse() {
      const d = this.draft;
      const c = { name: d.name, type: d.type, seed: d.seed };
      if (d.courseId) c.courseId = d.courseId;
      else if (d.kind) c.kind = d.kind;
      return c;
    },

    coursePanel() {
      const state = XC.state;
      const open = F.isOpen(state);
      const d = this.draft;
      const course = this.draftCourse();
      const layout = C.layoutFor(course);
      const real = F.real(state);

      const nameId = 'course-name';
      const nameInput = h('input', { class: 'input', id: nameId, type: 'text', maxlength: '40', value: d.name, disabled: !open });
      nameInput.addEventListener('input', () => { d.name = nameInput.value; this.refreshActions(); });

      const select = (id, label, options, value, onChange) => h('div', { class: 'field field--compact' },
        h('label', { class: 'field__label', for: id }, label),
        h('select', { class: 'select', id, disabled: !open, on: { change: (e) => onChange(e.target.value) } },
          options.map(([v, t]) => h('option', { value: v, selected: v === value }, t))));

      const terrain = select('course-terrain', 'Terrain', F.TERRAINS.map((t) => [t, XC.race.COURSES[t].label]), d.type, (v) => {
        d.type = v;
        d.courseId = null;
        this.draw('course-terrain');
      });
      const kind = select('course-kind', 'Layout', Object.entries(KIND_LABEL), d.courseId ? '' : d.kind, (v) => {
        d.kind = v;
        d.courseId = null;
        this.draw('course-kind');
      });

      const realNote = real
        ? (state.homeCourse.courseId === real.id
          ? `This is ${real.name}, your real home course. A new layout or terrain replaces it with a custom course.`
          : `Your real home course is ${real.name}. You can restore it.`)
        : 'A course of your own. Change the terrain or draw up new layouts until you like one.';

      this.actionsEl = h('div', { class: 'actions' });
      this.whyEl = h('p', { class: 'staff-card__why course-editor__why' });
      this.costEl = h('p', { class: 'course-editor__cost' });

      const body = h('div', { class: 'course-editor' },
        h('div', { class: 'course-editor__map' }, ui.courseMap(course, state.programs)),
        h('div', { class: 'stack course-editor__controls' },
          h('p', { class: 'muted' }, realNote),
          h('p', { class: 'course-editor__facts' },
            `${XC.race.COURSES[course.type].label}. ${C.describe(layout)}`),
          h('div', { class: 'field field--compact' }, h('label', { class: 'field__label', for: nameId }, 'Course name'), nameInput),
          h('div', { class: 'course-editor__row' }, terrain, kind),
          h('div', { class: 'actions' },
            ui.button('Draw a new layout', () => this.reroll(), { variant: 'ghost', size: 'small', disabled: !open, attrs: { id: 'course-reroll', 'data-nav': '' } }),
            real && state.homeCourse.courseId !== real.id
              ? ui.button(`Use ${real.name}`, () => this.useReal(), { variant: 'ghost', size: 'small', disabled: !open, attrs: { id: 'course-real', 'data-nav': '' } })
              : null,
            ui.button('Start over', () => { this.resetDraft(); this.draw('course-reset'); }, { variant: 'ghost', size: 'small', attrs: { id: 'course-reset', 'data-nav': '' } })),
          this.costEl,
          this.whyEl,
          this.actionsEl));
      this.refreshActions();
      return ui.panel('Home course', body, { aside: state.homeCourse.name });
    },

    refreshActions() {
      if (!this.actionsEl) return;
      const state = XC.state;
      const course = this.draftCourse();
      const rebuild = F.isRebuild(state, course);
      const named = !!F.cleanName(this.draft.name) && F.cleanName(this.draft.name) !== state.homeCourse.name;
      const why = rebuild ? F.blocker(state, F.COURSE_WORK) : F.isOpen(state) ? '' : F.blocker(state, 0);
      U.clear(this.actionsEl);
      this.costEl.textContent = rebuild
        ? `Course work: ${money(F.COURSE_WORK)}. Home meets that haven’t run yet move to the new course.`
        : named ? 'Renaming is free.' : '';
      this.whyEl.textContent = (rebuild || named) && why ? why : '';
      this.actionsEl.appendChild(ui.button(rebuild ? `Build it, ${money(F.COURSE_WORK)}` : 'Save name', () => this.saveCourse(), {
        variant: 'primary', size: 'small', disabled: !(rebuild || named) || !!why, attrs: { id: 'course-save', 'data-nav': '' }
      }));
    },

    reroll() {
      if (!F.isOpen(XC.state)) return;
      this.draft.seed = U.randInt(1, 2 ** 31 - 1);
      this.draft.courseId = null;
      XC.audio.nav();
      this.draw('course-reroll');
    },

    useReal() {
      const real = F.real(XC.state);
      if (!real || !F.isOpen(XC.state)) return;
      Object.assign(this.draft, { name: real.name, type: real.type, seed: U.hash(`course|${real.id}`), kind: '', courseId: real.id });
      XC.audio.nav();
      this.draw('course-save');
    },

    saveCourse() {
      const state = XC.state;
      const course = this.draftCourse();
      const rebuild = F.isRebuild(state, course);
      const ok = rebuild ? F.build(state, course) : F.rename(state, this.draft.name);
      if (!ok) {
        ui.toast(F.blocker(state, rebuild ? F.COURSE_WORK : 0) || 'Give the course a name.', 'warn');
        return;
      }
      XC.audio.select();
      XC.save();
      ui.renderTicker();
      ui.toast(rebuild ? `${state.homeCourse.name} is built.` : `Renamed to ${state.homeCourse.name}.`);
      this.resetDraft();
      this.draw('course-save');
    },

    /* ---------- Buying ---------- */

    upgrade(key) {
      const state = XC.state;
      const why = F.blocker(state, F.nextCost(state, key));
      if (why) {
        ui.toast(why, 'warn');
        return;
      }
      F.upgrade(state, key);
      this.bought(`${F.ITEMS[key].label} upgraded to level ${F.level(state, key)}.`);
    },

    buyChampionship() {
      const state = XC.state;
      const why = state.facilities.championship ? 'Already built.' : F.blocker(state, F.CHAMPIONSHIP_COST);
      if (why) {
        ui.toast(why, 'warn');
        return;
      }
      F.buyChampionship(state);
      this.bought(`${state.homeCourse.name} is championship grade.`);
    },

    bought(message) {
      XC.audio.fanfare();
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
