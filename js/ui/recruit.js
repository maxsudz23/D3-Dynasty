/* Recruiting by scouting (medium and hard): an inbox of recruit emails
   with their PRs. Ask the staff for a scouting report, host official
   visits, or pass. A visit ends in a commitment or a no. */
(function (XC) {
  'use strict';

  const U = XC.util;
  const h = U.h;
  const ui = XC.ui;
  const S = XC.season;
  const A = XC.athletes;
  const SC = XC.scouting;
  const D = XC.difficulty;
  XC.screens = XC.screens || {};

  const coachLast = (state) => state.coach.name.split(/\s+/).slice(-1)[0];
  // "endurance", "hills": the rating's name without "rating".
  const statName = (k) => (A.NAMES[k] || k).replace(/ rating$/i, '').toLowerCase();
  const YEAR_WORD = { 2: 'sophomore', 3: 'junior' };

  // The email a recruit sends, built from their saved facts so saves stay small.
  function email(state, p) {
    const sc = p.scout;
    const town = (p.hometown || '').split(',')[0];
    const short = state.school.short;
    const subject = p.transfer
      ? `Transfer inquiry: ${p.first} ${p.last}`
      : sc.interest >= 0.7 ? `${short} is my top choice!`
        : sc.interest >= 0.45 ? `Prospective runner: ${p.first} ${p.last}, class of ${S.yearOf(state.season)}`
          : `Recruiting questionnaire: ${p.first} ${p.last}`;
    let body;
    if (p.transfer) {
      body = `Coach ${coachLast(state)}, I’m a ${YEAR_WORD[p.year] || 'junior'} at ${sc.school} and I’m looking to transfer somewhere I can race more and study ${sc.major}. My college PRs are below.`;
    } else {
      body = [
        `Hi Coach ${coachLast(state)}, my name is ${p.first} and I’m a senior at ${sc.school} in ${town}. ${short} is high on my list, and I’d love to run for you while studying ${sc.major}.`,
        `Coach ${coachLast(state)}, I’ve followed ${short} cross country for a while. I’m a senior at ${sc.school} and I want a team where I can keep improving. I’m planning to major in ${sc.major}.`,
        `Hello Coach! I’m ${p.first} ${p.last} from ${town}. I run for ${sc.school} and I’m hoping to keep running in college. ${short} is one of the places I’m most excited about.`
      ][sc.variant] || '';
    }
    // A hint some runners give about their upside (most A potentials say
    // it, a few others do too).
    const hintRoll = (U.hash(p.id) % 100) / 100;
    const hint = !p.transfer && ((p.pot === 'A' && hintRoll < 0.7) || (p.pot !== 'A' && hintRoll < 0.1))
      ? 'I only started running seriously two years ago, so I think my best races are ahead of me.' : '';
    return { subject, body, hint };
  }

  XC.screens.recruit = {
    title: 'Recruiting',

    render(root) {
      const state = XC.state;
      if (!state) return XC.go('title');
      if (state.phase !== 'preseason') return XC.go('hub');
      if (D.recruitMode(state) !== 'scout') return XC.go('wheel');
      state.programs.forEach((sq) => SC.ensure(state, sq));
      XC.save();
      this.root = root;
      this.draw();
    },

    draw(focusId) {
      const state = XC.state;
      const sq = XC.activeSquad;
      const rec = state.recruiting[sq];
      focusId = focusId || (document.activeElement && document.activeElement.id);
      U.clear(this.root);
      const open = S.openSpots(state, sq);
      const signed = S.signedCount(state, sq);
      const best = XC.staff.best(state);

      const stats = h('div', { class: 'staff-stats' }, [
        ['Official visits', String(rec.scout.visitsLeft), 'Left this year'],
        ['Scouting reports', String(rec.scout.reportsLeft), best ? `From Coach ${best.last} and staff` : 'Hire assistants for more'],
        ['Roster spots', String(open), `Of ${S.rosterCap(state, sq)}`],
        ['Committed', String(signed), `${S.squadLabel(sq)} class`]
      ].map(([label, value, note]) => h('div', { class: 'staff-stat' },
        h('p', { class: 'staff-stat__label' }, label),
        h('p', { class: 'staff-stat__value' }, value),
        h('p', { class: 'staff-stat__note' }, note))));

      const pending = rec.prospects.filter((p) => p.status === 'pending');
      const decided = rec.prospects.filter((p) => p.status !== 'pending');
      const list = h('ol', { class: 'mail-list' }, pending.concat(decided).map((p) => this.mail(p)));

      this.root.appendChild(h('div', { class: 'stack' },
        h('p', { class: 'lede' }, `${rec.prospects.length} recruits reached out this year. Read their PRs, ask your staff for scouting reports, and bring your favorites in for official visits. A visit isn’t a promise: they decide at the end of it.`),
        stats,
        ui.panel(`${S.squadLabel(sq)} recruiting inbox`, list, { aside: D.shows(state, 'ovrInEmails') ? 'Ratings from the recruiting service' : 'No ratings: judge by PRs and reports' }),
        h('div', { class: 'actions actions--end' },
          ui.button('Manage roster', () => XC.go('roster', { mode: 'cut', from: 'recruit' }), { variant: 'ghost', attrs: { 'data-nav': '' } }),
          ui.button('Finish recruiting', () => this.finish(), { variant: 'primary', size: 'big', attrs: { id: 'recruit-finish', 'data-nav': '' } }))));

      const el = focusId && document.getElementById(focusId);
      if (el && !el.disabled) el.focus({ preventScroll: true });
    },

    mail(p) {
      const state = XC.state;
      const sq = XC.activeSquad;
      const sc = p.scout;
      const msg = email(state, p);
      const showOvr = D.shows(state, 'ovrInEmails');
      const meta = `${p.transfer ? `Transfer, ${A.yearLong(p.year).toLowerCase()}` : 'High school senior'} · ${p.hometown}`;

      const prs = h('ul', { class: 'mail__prs', 'aria-label': 'PRs' },
        sc.prs.map(([event, t]) => h('li', null, h('span', null, event), h('b', null, U.formatTime(t)))));

      const report = sc.report ? h('div', { class: 'mail__report' },
        h('p', { class: 'mail__report-head' }, `Scouting report from ${sc.report.by === 'You' ? 'your own film study' : `Coach ${sc.report.by}`}`),
        h('p', null, [
          `Potential ${sc.report.pot}.`,
          showOvr ? '' : `Rating about ${sc.report.low}–${sc.report.high}.`,
          `Best at ${statName(sc.report.strong)}, weakest at ${statName(sc.report.weak)}.`,
          `Interest in ${state.school.short}: ${sc.report.interest.toLowerCase()}.`
        ].filter(Boolean).join(' '))) : null;

      let footer;
      if (p.status === 'signed') {
        footer = h('p', { class: 'mail__result mail__result--good' }, `${p.first} committed to ${state.school.short} after the visit.`);
      } else if (sc.decision === 'declined') {
        footer = h('p', { class: 'mail__result mail__result--bad' }, `${p.first} visited, then chose ${sc.otherSchool}.`);
      } else if (p.status === 'passed') {
        footer = h('p', { class: 'mail__result' }, 'You passed.');
      } else {
        const why = (action) => SC.blocker(state, sq, p, action);
        const reasons = [why('scout'), why('visit')].filter((r) => r && r !== 'Already scouted.');
        footer = h('div', null,
          h('div', { class: 'actions' },
            ui.button(sc.report ? 'Scouted' : 'Scouting report', () => this.scout(p.id), { variant: 'ghost', size: 'small', disabled: !!why('scout'), attrs: { id: `scout-${p.id}`, 'data-nav': '' } }),
            ui.button('Invite on a visit', () => this.visit(p.id), { variant: 'primary', size: 'small', disabled: !!why('visit'), attrs: { id: `visit-${p.id}`, 'data-nav': '' } }),
            ui.button('Pass', () => this.pass(p.id), { variant: 'ghost', size: 'small', attrs: { id: `pass-${p.id}`, 'data-nav': '' } })),
          reasons.length ? h('p', { class: 'mail__why' }, [...new Set(reasons)].join(' ')) : null);
      }

      return h('li', { class: `mail${p.status === 'pending' ? '' : ' mail--done'}`, id: `mail-${p.id}` },
        h('header', { class: 'mail__head' },
          h('span', { class: 'mail__avatar' }, ui.portrait(p, 'sm')),
          h('div', { class: 'mail__who' },
            h('p', { class: 'mail__from' }, `${p.first} ${p.last}`),
            h('p', { class: 'mail__meta' }, meta)),
          showOvr ? h('div', { class: 'mail__ovr' }, h('strong', null, String(p.ovr)), h('span', null, 'OVR')) : null),
        h('p', { class: 'mail__subject' }, msg.subject),
        h('p', { class: 'mail__body' }, msg.body),
        msg.hint ? h('p', { class: 'mail__body' }, msg.hint) : null,
        prs,
        h('p', { class: 'mail__sign' }, `Thanks, ${p.first}`),
        report,
        footer);
    },

    scout(id) {
      const state = XC.state;
      const sq = XC.activeSquad;
      const p = state.recruiting[sq].prospects.find((x) => x.id === id);
      const why = SC.blocker(state, sq, p, 'scout');
      if (why) { ui.toast(why, 'warn'); return; }
      SC.scoutReport(state, sq, id);
      XC.audio.select();
      XC.save();
      this.draw(`visit-${id}`);
    },

    async visit(id) {
      const state = XC.state;
      const sq = XC.activeSquad;
      const p = state.recruiting[sq].prospects.find((x) => x.id === id);
      const why = SC.blocker(state, sq, p, 'visit');
      if (why) { ui.toast(why, 'warn'); return; }
      const result = SC.visit(state, sq, id);
      XC.save();
      if (result === 'committed') {
        XC.audio.fanfare();
        ui.toast(`${A.fullName(p)} committed!`);
        ui.renderTicker();
      } else {
        XC.audio.back();
        ui.toast(`${A.fullName(p)} chose ${p.scout.otherSchool}.`, 'warn');
      }
      this.draw(`mail-${id}`);
    },

    pass(id) {
      if (!SC.pass(XC.state, XC.activeSquad, id)) return;
      XC.audio.back();
      XC.save();
      this.draw();
    },

    finish() {
      const state = XC.state;
      if (state.phase !== 'preseason') return;
      const signed = state.programs.reduce((n, sq) => n + S.signedCount(state, sq), 0);
      S.finishRecruiting(state);
      XC.save();
      XC.audio.fanfare();
      ui.toast(signed ? `${signed} recruit${signed === 1 ? '' : 's'} committed. The season opens soon.` : 'No commitments this year. The season opens soon.');
      XC.go('hub');
    },

    onSquadChange() {
      this.draw();
    },

    legend() {
      const items = [{ key: 'Enter', label: 'Select focused', keyboardOnly: true, action: () => document.activeElement && document.activeElement.click() }];
      if (XC.state && XC.state.programs.length > 1) items.push({ key: 'Q E', label: 'Squad', keyboardOnly: true, action: () => XC.setSquad(XC.activeSquad === 'M' ? 'W' : 'M') });
      items.push({ key: 'Esc', label: 'Hub', action: () => XC.go('hub') });
      return items;
    },

    back() {
      XC.go('hub');
    }
  };
})(window.XC = window.XC || {});
