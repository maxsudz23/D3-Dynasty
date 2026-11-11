/* Workout day: plan groups and individual sessions before each meet, see
   the projected dose, fatigue and injury risk for every runner, then run
   the day and read the report. */
(function (XC) {
  'use strict';

  const U = XC.util;
  const h = U.h;
  const ui = XC.ui;
  const S = XC.season;
  const A = XC.athletes;
  const T = XC.training;
  XC.screens = XC.screens || {};

  const GROUP_NAMES = ['Group A', 'Group B', 'Group C', 'Group D', 'Group E', 'Group F'];
  let uid = 0;
  const fieldId = (name) => `wk-${name}-${++uid}`;

  function zoneBadge(zone) {
    if (!zone) return h('span', { class: 'badge badge--line' }, 'Rest');
    return h('span', { class: `badge zone zone--${zone.key}` }, zone.label);
  }
  const dnfBadge = (text) => h('span', { class: 'badge zone zone--danger' }, text);

  const pct = (x) => `${Math.round(x * 100)}%`;
  const riskText = (r) => (r < 0.01 ? 'under 1%' : `${U.round(r * 100, 1)}%`);

  XC.screens.training = {
    title: 'Workout day',

    render(root) {
      const state = XC.state;
      if (!state) return XC.go('title');
      if (state.phase !== 'season') return XC.go('hub');
      T.ensurePlans(state);
      XC.save();
      this.root = root;
      this.draw();
    },

    plan() {
      return XC.state.training.plans[XC.activeSquad];
    },

    meet() {
      return XC.state.schedule[XC.state.meetIndex];
    },

    draw() {
      const focusId = document.activeElement && document.activeElement.id;
      U.clear(this.root);
      this.projections = new Map();
      this.groupNotes = new Map();
      if (XC.state.training.done) this.drawReport();
      else this.drawPlan();
      if (focusId) {
        const el = document.getElementById(focusId);
        if (el) el.focus({ preventScroll: true });
      }
    },

    save() {
      XC.save();
    },

    /* ---------- Planning ---------- */

    drawPlan() {
      const state = XC.state;
      const sq = XC.activeSquad;
      const meet = this.meet();
      const layout = XC.course.layoutFor(meet.course);
      const gap = T.gapWeeks(state.meetIndex);
      const roster = state.squads[sq].roster;
      const avgFatigue = U.avg(roster.map((a) => T.dayFatigue(state, a)));

      const hero = h('section', { class: 'meet-hero training-hero' },
        h('p', { class: 'meet-hero__type' }, `Before the ${meet.name}`),
        h('h2', { class: 'meet-hero__name' }, `${S.squadLabel(sq)} workout day`),
        h('p', { class: 'meet-hero__facts' },
          h('span', null, `${gap} week${gap === 1 ? '' : 's'} to race day`),
          h('span', null, `${XC.race.COURSES[meet.course.type].label}, ${Math.round(layout.climbPerKm)} m climb per km`),
          h('span', null, `Team fatigue ${Math.round(avgFatigue)} (${T.fatigueLabel(avgFatigue).toLowerCase()})`)),
        h('p', { class: 'training-hero__advice' }, T.blockAdvice(state)));

      const toolbar = h('div', { class: 'actions training-toolbar' },
        ui.button('Auto plan', () => this.autoPlan(), { variant: 'ghost', size: 'small', key: 'A', attrs: { 'data-nav': '' } }),
        ui.button('Everyone rests', () => this.allRest(), { variant: 'ghost', size: 'small', attrs: { 'data-nav': '' } }),
        ui.button('Add group', () => this.addGroup(), { variant: 'ghost', size: 'small', attrs: { 'data-nav': '' } }),
        ui.button('Run workout day', () => this.runDay(), { variant: 'primary', key: 'Enter', attrs: { 'data-nav': '', 'data-autofocus': '' } }));

      const plan = this.plan();
      const groups = h('div', { class: 'workout-groups' },
        plan.groups.length
          ? plan.groups.map((g) => this.groupCard(g))
          : h('p', { class: 'empty' }, 'No groups yet. Use Auto plan, or add a group and assign runners to it.'));

      const runners = h('ul', { class: 'plan-list' }, roster.map((a) => this.runnerRow(a)));

      this.root.appendChild(h('div', { class: 'training' },
        hero,
        toolbar,
        h('section', { class: 'stack', 'aria-label': 'Workout groups' },
          h('h2', { class: 'section-title' }, 'Groups'),
          groups),
        ui.panel('Runners', runners, { aside: 'Dose = load ÷ what this runner handles well' }),
        h('div', { class: 'actions actions--end' },
          ui.button('Run workout day', () => this.runDay(), { variant: 'primary', size: 'big', key: 'Enter' }))));
      this.refresh();
    },

    groupCard(g) {
      const plan = this.plan();
      const members = this.membersOf(g);
      const note = h('p', { class: 'workout-group__members' });
      this.groupNotes.set(g.id, { note, group: g });
      return h('section', { class: 'workout-group', 'aria-label': g.name },
        h('header', { class: 'workout-group__head' },
          h('h3', { class: 'workout-group__name' }, g.name),
          h('span', { class: 'workout-group__count' }, `${members.length} runner${members.length === 1 ? '' : 's'}`),
          h('div', { class: 'actions' },
            ui.button('Suggest', () => this.suggestGroup(g), { variant: 'ghost', size: 'small', disabled: !members.length }),
            ui.button('Remove', () => this.removeGroup(g), { variant: 'ghost', size: 'small', disabled: plan.groups.length <= 1 && members.length > 0 }))),
        this.editor(g.workout, `g-${g.id}`),
        note);
    },

    membersOf(g) {
      const plan = this.plan();
      return XC.state.squads[XC.activeSquad].roster.filter((a) => {
        const res = T.resolve(plan, a);
        return res.mode === 'group' && res.group === g;
      });
    },

    // Full workout editor. Structural changes (type, format) rebuild the
    // screen; numbers and pace update the projections in place.
    editor(w, key) {
      const spec = T.TYPES[w.type];
      const fmt = T.formatOf(w);
      const summary = h('p', { class: 'workout-editor__summary' }, T.describe(w));
      const changed = () => {
        T.normalize(w);
        w.source = 'coach';
        summary.textContent = T.describe(w);
        this.save();
        this.refresh();
      };

      const select = (name, label, options, value, onChange, wide = false) => {
        const id = `${key}-${name}`;
        const el = h('select', { class: 'select', id, on: { change: (e) => onChange(e.target.value) } },
          options.map(([v, text]) => h('option', { value: v, selected: v === value }, text)));
        return h('div', { class: `field field--compact${wide ? ' field--wide' : ''}` }, h('label', { class: 'field__label', for: id }, label), el);
      };
      const number = (name, label, range, unit) => {
        const id = `${key}-${name}`;
        const input = h('input', {
          class: 'input', id, type: 'number', inputmode: 'decimal',
          min: range.min, max: range.max, step: range.step || 1, value: w[name]
        });
        input.addEventListener('change', () => {
          w[name] = Number(input.value);
          changed();
          input.value = w[name];
        });
        return h('div', { class: 'field field--compact' },
          h('label', { class: 'field__label', for: id }, label),
          h('div', { class: 'input-unit' }, input, unit ? h('span', { class: 'input-unit__unit' }, unit) : null));
      };

      const fields = [
        select('type', 'Workout', T.TYPE_KEYS.map((t) => [t, T.TYPES[t].label]), w.type, (v) => {
          Object.assign(w, T.make(v), { source: 'coach' });
          this.save();
          this.draw();
        }, true),
        select('format', 'Format', Object.entries(spec.formats).map(([k, f]) => [k, `${f.label} (${f.continuous ? 'continuous' : 'broken'})`]), w.format, (v) => {
          Object.assign(w, T.make(w.type, v, w.intensity), { source: 'coach' });
          this.save();
          this.draw();
        }, true)
      ];
      if (fmt.reps) fields.push(number('reps', fmt.reps.label || 'Reps', fmt.reps, ''));
      fields.push(number('work', fmt.work.label, fmt.work, fmt.work.unit === 's' ? 'sec' : fmt.work.unit));
      if (fmt.rest) fields.push(number('rest', fmt.rest.label, fmt.rest, 'sec'));
      fields.push(select('intensity', 'Pace', Object.entries(spec.intensities).map(([k, it]) => [k, it.label]), w.intensity, (v) => {
        w.intensity = v;
        changed();
      }));

      return h('div', { class: 'workout-editor' },
        h('div', { class: 'workout-editor__fields' }, fields),
        summary,
        h('p', { class: 'workout-editor__note' }, spec.note));
    },

    runnerRow(a) {
      const state = XC.state;
      const plan = this.plan();
      const res = T.resolve(plan, a);
      const f = T.fatigueOf(a);
      const proj = h('div', { class: 'plan-row__proj' });
      this.projections.set(a.id, { el: proj, a });

      let control;
      if (a.injury > 0) {
        control = h('span', { class: 'badge badge--warn' }, `Injured, out ${a.injury}: rehab only`);
      } else {
        const id = `assign-${a.id}`;
        const current = res.mode === 'group' ? `g:${res.group.id}` : res.mode;
        const sel = h('select', { class: 'select', id, on: { change: (e) => this.assign(a, e.target.value) } },
          plan.groups.map((g) => h('option', { value: `g:${g.id}`, selected: current === `g:${g.id}` }, g.name)),
          h('option', { value: 'custom', selected: current === 'custom' }, 'Own workout'),
          h('option', { value: 'rest', selected: current === 'rest' }, 'Recovery run (rest)'));
        control = h('div', { class: 'plan-row__assign' },
          h('label', { class: 'visually-hidden', for: id }, `Assignment for ${A.fullName(a)}`),
          sel,
          ui.button('Suggest', () => this.suggestRunner(a), { variant: 'ghost', size: 'small' }));
      }

      const form = T.formOf(a);
      return h('li', { class: `plan-row${a.injury > 0 ? ' plan-row--injured' : ''}` },
        h('div', { class: 'plan-row__who' },
          h('p', { class: 'plan-row__name' }, A.fullName(a)),
          h('p', { class: 'plan-row__meta' },
            h('span', null, `${a.ovr} OVR`),
            h('span', null, A.yearShort(a.year)),
            h('span', null, `Form ${U.signed(form, 1)}`))),
        h('div', { class: 'plan-row__fatigue' },
          ui.fatigueMeter(f),
          h('p', { class: 'plan-row__meta' }, `Fatigue ${Math.round(f)}, ${T.fatigueLabel(f).toLowerCase()}. Workout day: ${Math.round(T.dayFatigue(state, a))}`)),
        control,
        proj,
        res.mode === 'custom' ? h('div', { class: 'plan-row__custom' }, this.editor(res.workout, `r-${a.id}`)) : null);
    },

    // Recompute every runner's projection and each group's member summary.
    refresh() {
      const state = XC.state;
      const sq = XC.activeSquad;
      const plan = this.plan();
      this.projections.forEach(({ el, a }) => {
        const res = T.resolve(plan, a);
        const p = T.preview(state, sq, a, res);
        U.clear(el);
        if (!res.workout) {
          el.appendChild(h('p', null, zoneBadge(null), ` Race-day fatigue ${Math.round(p.race)}`));
          return;
        }
        el.classList.toggle('plan-row__proj--warn', p.dnf || p.zone.key === 'over' || p.zone.key === 'danger');
        el.appendChild(p.dnf
          ? h('p', null, dnfBadge('Won’t finish'), ` Dose ${pct(p.x)} before they stop`)
          : h('p', null, zoneBadge(p.zone), ` Dose ${pct(p.x)}`));
        el.appendChild(h('p', { class: 'plan-row__meta' },
          `Fatigue after ${Math.round(p.after)}, race day ${Math.round(p.race)}. Injury risk ${riskText(p.risk)}`));
        if (p.dnf) {
          el.appendChild(h('p', { class: 'workout-group__warn' },
            `Asks for ${pct(p.strain)} of the time they can hold this pace. Likely drops out during ${T.stopPoint(res.workout, p.done)}. More rest, fewer reps or an easier pace.`));
        } else if (p.close || p.strain > 1) {
          el.appendChild(h('p', { class: 'workout-group__warn' },
            `${pct(p.strain)} of the time they can hold this pace, even counting rest. They might not finish.`));
        }
      });
      this.groupNotes.forEach(({ note, group }) => {
        const members = this.membersOf(group);
        U.clear(note);
        if (!members.length) {
          note.textContent = 'No runners assigned. Pick this group in a runner’s menu below.';
          return;
        }
        const previews = members.map((a) => T.preview(state, sq, a, T.resolve(plan, a)));
        // A runner who drops out only takes the dose of what they finish.
        const doses = previews.map((p) => p.x);
        const dnf = members.filter((a, i) => previews[i].dnf);
        const over = members.filter((a, i) => !previews[i].dnf && doses[i] > T.ZONES[2].max);
        const names = (list) => list.map((a) => A.shortName(a)).join(', ');
        note.appendChild(h('span', null, `${names(members)}. `));
        note.appendChild(h('span', null, `Doses ${pct(Math.min(...doses))} to ${pct(Math.max(...doses))}.`));
        if (dnf.length) {
          note.appendChild(h('span', { class: 'workout-group__warn' },
            dnf.length === members.length ? ' Nobody in this group can finish it.' : ` Won’t finish: ${names(dnf)}.`));
        }
        if (over.length) note.appendChild(h('span', { class: 'workout-group__warn' }, ` Too much for ${names(over)}.`));
      });
    },

    assign(a, value) {
      const plan = this.plan();
      if (value === 'rest') plan.assign[a.id] = { mode: 'rest' };
      else if (value === 'custom') {
        const prev = T.resolve(plan, a).workout;
        plan.assign[a.id] = { mode: 'custom', workout: prev ? Object.assign({}, prev) : T.recommend(XC.state, XC.activeSquad, [a]) };
      } else plan.assign[a.id] = { mode: 'group', group: value.slice(2) };
      XC.audio.nav();
      this.save();
      this.draw();
    },

    autoPlan() {
      XC.state.training.plans[XC.activeSquad] = T.autoPlan(XC.state, XC.activeSquad);
      XC.audio.select();
      this.save();
      ui.toast('Runners grouped by readiness, each group given a fitted workout. Worn-down runners rest.');
      this.draw();
    },

    allRest() {
      const plan = this.plan();
      XC.state.squads[XC.activeSquad].roster.forEach((a) => { plan.assign[a.id] = { mode: 'rest' }; });
      XC.audio.nav();
      this.save();
      this.draw();
    },

    addGroup() {
      const plan = this.plan();
      const used = new Set(plan.groups.map((g) => g.name));
      const name = GROUP_NAMES.find((n) => !used.has(n)) || `Group ${plan.groups.length + 1}`;
      let n = plan.groups.length + 1;
      while (plan.groups.some((g) => g.id === `g${n}`)) n++;
      plan.groups.push({ id: `g${n}`, name, workout: T.make('threshold') });
      XC.audio.select();
      this.save();
      this.draw();
    },

    removeGroup(g) {
      const plan = this.plan();
      this.membersOf(g).forEach((a) => { plan.assign[a.id] = { mode: 'rest' }; });
      plan.groups = plan.groups.filter((x) => x !== g);
      XC.audio.back();
      this.save();
      this.draw();
    },

    suggestGroup(g) {
      const members = this.membersOf(g);
      if (!members.length) return;
      g.workout = T.recommend(XC.state, XC.activeSquad, members);
      XC.audio.select();
      this.save();
      this.draw();
    },

    suggestRunner(a) {
      const plan = this.plan();
      plan.assign[a.id] = { mode: 'custom', workout: T.recommend(XC.state, XC.activeSquad, [a]) };
      XC.audio.select();
      this.save();
      this.draw();
    },

    async runDay() {
      const state = XC.state;
      if (state.training.done) return;
      // Warn before sending anyone well past their limit.
      const risky = [];
      const dnf = [];
      state.programs.forEach((sq) => {
        state.squads[sq].roster.forEach((a) => {
          const p = T.preview(state, sq, a, T.resolve(state.training.plans[sq], a));
          if (p.dnf) dnf.push(A.shortName(a));
          else if (p.zone && p.zone.key === 'danger') risky.push(A.shortName(a));
        });
      });
      const list = (names) => `${names.slice(0, 4).join(', ')}${names.length > 4 ? '…' : ''}`;
      const parts = [];
      if (dnf.length) parts.push(`${dnf.length} runner${dnf.length > 1 ? 's' : ''} can’t finish ${dnf.length > 1 ? 'their sessions' : 'the session'} and will drop out (${list(dnf)}).`);
      if (risky.length) parts.push(`${risky.length} runner${risky.length > 1 ? 's are' : ' is'} set far past their limit (${list(risky)}).`);
      if (parts.length) {
        const ok = await ui.confirm(`${parts.join(' ')} That risks injury and heavy fatigue. Run anyway?`, 'Run it');
        if (!ok || state.training.done) return;
      }
      T.runDay(state);
      const rows = Object.values(state.training.report.squads).flat();
      const hurt = rows.filter((r) => r.injury);
      if (hurt.length) S.addNews(state, `${state.school.short} loses ${hurt.map((r) => r.name).join(' and ')} to injury in practice.`);
      XC.save();
      XC.audio.fanfare();
      ui.renderTicker();
      this.draw();
      ui.renderLegend(this.legend());
      window.scrollTo(0, 0);
    },

    /* ---------- Report ---------- */

    drawReport() {
      const state = XC.state;
      const sq = XC.activeSquad;
      const report = state.training.report;
      const meet = this.meet();
      if (!report || !report.squads[sq]) {
        this.root.appendChild(h('div', { class: 'stack' },
          h('p', { class: 'notice' }, state.training.skipped ? 'The team rested through this block.' : 'Workout day is done.'),
          h('div', { class: 'actions' }, ui.button('Meet preview', () => XC.go('meet'), { variant: 'primary', attrs: { 'data-autofocus': '' } }))));
        return;
      }
      const rows = report.squads[sq];
      const worked = rows.filter((r) => r.zone);
      const dropped = rows.filter((r) => r.dnf);
      const gains = rows.reduce((n, r) => n + r.gains.length, 0);
      const hurt = rows.filter((r) => r.injury);
      const cooked = rows.filter((r) => r.dnf || r.zone === 'over' || r.zone === 'danger');

      const lines = [
        `${worked.length} runner${worked.length === 1 ? '' : 's'} worked out, ${rows.length - worked.length} recovered.`,
        dropped.length ? `${dropped.length} dropped out before the end.` : '',
        gains ? `${gains} rating point${gains === 1 ? '' : 's'} gained.` : 'No rating points this time; progress carries over.',
        hurt.length ? `${hurt.length} injur${hurt.length === 1 ? 'y' : 'ies'}.` : 'No injuries.'
      ].filter(Boolean);

      const table = h('div', { class: 'table-wrap' }, h('table', { class: 'grid' },
        h('caption', { class: 'visually-hidden' }, 'Workout report'),
        h('thead', null, h('tr', null, ['Runner', 'Session', 'Dose', 'Fatigue', 'Form', 'Gains', 'Notes']
          .map((c, i) => h('th', { scope: 'col', class: i <= 1 || i === 6 ? 'cell-left' : '' }, c)))),
        h('tbody', null, rows.map((r) => h('tr', { class: r.injury ? 'is-reserve' : '' },
          h('td', { class: 'cell-left' }, r.name),
          h('td', { class: 'cell-left' }, r.group ? `${r.group}: ${r.desc}` : r.desc),
          h('td', null, r.dnf ? dnfBadge('Dropped out') : r.zone ? zoneBadge(T.ZONES.find((z) => z.key === r.zone)) : '—', r.zone ? ` ${pct(r.x)}` : ''),
          h('td', null, `${Math.round(r.before)} → ${Math.round(r.after)}`),
          h('td', null, ui.delta(r.form)),
          h('td', null, r.gains.length ? h('span', { class: 'badge badge--good' }, `+${r.gains.join(' +')}`) : '—'),
          h('td', { class: 'cell-left' }, r.injury
            ? h('span', { class: 'workout-group__warn' }, `${r.injury.what}, out ${r.injury.out} meet${r.injury.out > 1 ? 's' : ''}. `)
            : null, r.note))))));

      this.root.appendChild(h('div', { class: 'stack' },
        h('section', { class: 'results-hero on-dark training-report__hero' },
          h('p', { class: 'results-hero__place' }, String(worked.length)),
          h('div', null,
            h('p', { class: 'results-hero__line' }, lines.join(' ')),
            h('p', { class: 'results-hero__sub' }, cooked.length
              ? `${cooked.length} ran past their limit and will carry the fatigue into the ${meet.name}.`
              : `Fatigue numbers are what each runner carries into the ${meet.name}.`)),
          h('div', { class: 'results-hero__rep' }, h('strong', null, String(T.gapWeeks(state.meetIndex))), h('span', null, 'Weeks out'))),
        ui.panel(`${S.squadLabel(sq)} workout report`, table, { aside: meet.name }),
        h('div', { class: 'actions actions--end' },
          ui.button('Back to hub', () => XC.go('hub'), { variant: 'ghost' }),
          ui.button('Meet preview', () => XC.go('meet'), { variant: 'primary', size: 'big', key: 'Enter', attrs: { 'data-autofocus': '' } }))));
    },

    /* ---------- Chrome ---------- */

    onSquadChange() {
      this.draw();
    },

    legend() {
      const done = XC.state && XC.state.training && XC.state.training.done;
      const items = done
        ? [{ key: 'Enter', label: 'Meet preview', action: () => XC.go('meet') }]
        : [
          { key: 'Enter', label: 'Run workouts', action: () => this.runDay() },
          { key: 'A', label: 'Auto plan', action: () => this.autoPlan() }
        ];
      if (XC.state && XC.state.programs.length > 1) items.push({ key: 'Q E', label: 'Squad', keyboardOnly: true, action: () => XC.setSquad(XC.activeSquad === 'M' ? 'W' : 'M') });
      items.push({ key: 'Esc', label: 'Hub', action: () => XC.go('hub') });
      return items;
    },

    onKey(e) {
      const tag = e.target && e.target.tagName;
      if (tag === 'SELECT' || tag === 'INPUT' || e.target instanceof HTMLButtonElement) return false;
      const done = XC.state.training.done;
      if (e.key === 'Enter') {
        if (done) XC.go('meet');
        else this.runDay();
        return true;
      }
      if (!done && e.key.toLowerCase() === 'a') {
        this.autoPlan();
        return true;
      }
      return false;
    },

    back() {
      XC.go('hub');
    }
  };
})(window.XC = window.XC || {});
