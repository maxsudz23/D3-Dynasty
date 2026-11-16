/* Facilities and the facilities fund.

   Each offseason the athletic department pays into the fund based on the
   season: a base amount, the program's reputation, reputation gained, and
   titles and All-Americans. The money builds:
   - Training room (levels 1–3): +1.5 fatigue recovered per week per level
     (T.recoveryPerWeek).
   - Track (levels 1–3): VO2 max sessions count 5% more per level.
   - Home course: spectator areas (levels 1–3, a small rep bonus at home
     meets), championship grade (once: likeliest conference host), and
     course work (rename for free; new terrain or layout for a fee).
   Staff salaries come from the separate staff budget (XC.staff).
   Building happens in the offseason, the same window as hiring.
   Pure: no DOM. */
(function (XC) {
  'use strict';

  const U = XC.util;
  const F = {};

  F.START_FUNDS = 60;
  F.ITEMS = {
    trainingRoom: { label: 'Training room', max: 3, cost: [90, 160, 250] },
    track: { label: 'Track', max: 3, cost: [80, 140, 220] },
    spectators: { label: 'Spectator areas', max: 3, cost: [40, 70, 110] }
  };
  F.CHAMPIONSHIP_COST = 250;
  F.COURSE_WORK = 25;
  // Rep per level, per squad, at a home meet the team raced.
  F.SPECTATOR_REP = 0.4;
  // Chance you host the conference meet.
  F.CONF_HOST = { base: 0.2, championship: 0.5 };
  F.OPEN_PHASES = ['graduation', 'progression', 'cut', 'preseason'];
  // Most the athletic department pays in one offseason.
  F.PAYOUT_CAP = 180;

  F.ensure = function (state) {
    const f = state.facilities || {};
    state.facilities = {
      trainingRoom: f.trainingRoom || 0,
      track: f.track || 0,
      spectators: f.spectators || 0,
      championship: !!f.championship
    };
    if (typeof state.funds !== 'number') state.funds = F.START_FUNDS;
    return state.facilities;
  };

  F.isOpen = (state) => F.OPEN_PHASES.includes(state.phase);
  F.level = (state, key) => (state.facilities && state.facilities[key]) || 0;
  F.nextCost = (state, key) => {
    const item = F.ITEMS[key];
    const lv = F.level(state, key);
    return lv >= item.max ? null : item.cost[lv];
  };

  // Why something can't be bought, or ''.
  F.blocker = function (state, cost) {
    if (!F.isOpen(state)) return 'Building happens in the offseason.';
    if (cost === null) return 'Fully built.';
    if (cost > state.funds) return `Needs $${cost - Math.floor(state.funds)}k more.`;
    return '';
  };

  F.upgrade = function (state, key) {
    if (!F.ITEMS[key]) return false;
    const cost = F.nextCost(state, key);
    if (F.blocker(state, cost)) return false;
    state.funds = U.round(state.funds - cost, 1);
    state.facilities[key] += 1;
    XC.season.addNews(state, `${state.school.short} opens an upgraded ${F.ITEMS[key].label.toLowerCase()} (level ${state.facilities[key]}).`);
    return true;
  };

  F.buyChampionship = function (state) {
    if (state.facilities.championship) return false;
    if (F.blocker(state, F.CHAMPIONSHIP_COST)) return false;
    state.funds = U.round(state.funds - F.CHAMPIONSHIP_COST, 1);
    state.facilities.championship = true;
    XC.season.addNews(state, `${state.homeCourse.name} is now a championship-grade course.`);
    return true;
  };

  F.confHostChance = (state) => (state.facilities && state.facilities.championship ? F.CONF_HOST.championship : F.CONF_HOST.base);

  // Extra rep for one squad's race at a home meet.
  F.homeRep = (state, meet) => (meet.host && meet.host.id === state.school.id ? F.level(state, 'spectators') * F.SPECTATOR_REP : 0);

  /* ---------- The athletic department's payout ---------- */

  // entry: a state.history season entry. Capped at F.PAYOUT_CAP, shown as
  // its own (negative) line.
  F.payout = function (entry) {
    const lines = [['Base budget', 30], ['Program reputation', Math.round(entry.repEnd * 0.4)]];
    const gained = Math.round(Math.max(0, entry.repEnd - entry.repStart) * 1.5);
    if (gained) lines.push(['Reputation gained', gained]);
    Object.entries(entry.squads).forEach(([sq, q]) => {
      const who = XC.season.squadLabel(sq);
      if (q.conf === 1) lines.push([`${who} conference title`, 15]);
      if (q.regional === 1) lines.push([`${who} regional title`, 15]);
      if (q.national === 1) lines.push([`${who} national title`, 40]);
      else if (q.national && q.national <= 4) lines.push([`${who} national podium`, 20]);
      else if (q.national) lines.push([`${who} team at nationals`, 8]);
      if (q.aa.length) lines.push([`${who} All-Americans (${q.aa.length})`, q.aa.length * 3]);
    });
    const sum = lines.reduce((s, [, v]) => s + v, 0);
    if (sum > F.PAYOUT_CAP) lines.push(['Athletic department limit', F.PAYOUT_CAP - sum]);
    return { total: Math.min(sum, F.PAYOUT_CAP), lines };
  };

  // Called as the offseason begins.
  F.collect = function (state) {
    F.ensure(state);
    const entry = state.history[state.history.length - 1];
    if (!entry) return null;
    const pay = F.payout(entry);
    state.funds = U.round(state.funds + pay.total, 1);
    state.lastPayout = { year: entry.year, total: pay.total, lines: pay.lines };
    XC.season.addNews(state, `The athletic department adds $${pay.total}k to the ${state.school.short} facilities fund.`);
    return pay;
  };

  /* ---------- Home course work ---------- */

  F.TERRAINS = ['flat', 'rolling', 'hilly', 'mud'];
  F.real = (state) => (XC.courses ? XC.courses.forSchool(state.school.id) : null);

  // Home meets not yet run pick up the new course.
  function refreshHomeMeets(state) {
    (state.schedule || []).forEach((m) => {
      if (!m.done && m.host && m.host.id === state.school.id) m.course = Object.assign({}, state.homeCourse);
    });
  }

  F.cleanName = (name) => String(name || '').replace(/\s+/g, ' ').trim().slice(0, 40);

  F.rename = function (state, name) {
    const clean = F.cleanName(name);
    if (!clean || !F.isOpen(state)) return false;
    state.homeCourse.name = clean;
    refreshHomeMeets(state);
    return true;
  };

  // Does this draft need course work (anything beyond a new name)?
  F.isRebuild = (state, draft) => draft.type !== state.homeCourse.type
    || draft.seed !== state.homeCourse.seed
    || (draft.kind || null) !== (state.homeCourse.kind || null)
    || !!state.homeCourse.courseId !== !!draft.courseId;

  // draft: { name, type, seed, kind? } for a custom course, or the real
  // course's venue to restore it.
  F.build = function (state, draft) {
    if (!F.isRebuild(state, draft)) return F.rename(state, draft.name);
    if (F.blocker(state, F.COURSE_WORK)) return false;
    const name = F.cleanName(draft.name) || state.homeCourse.name;
    state.funds = U.round(state.funds - F.COURSE_WORK, 1);
    state.homeCourse = draft.courseId
      ? { name, type: draft.type, seed: draft.seed, courseId: draft.courseId }
      : { name, type: draft.type, seed: draft.seed, kind: draft.kind || undefined, custom: true };
    if (!state.homeCourse.kind) delete state.homeCourse.kind;
    refreshHomeMeets(state);
    XC.season.addNews(state, `${state.school.short} finishes course work on ${name}.`);
    return true;
  };

  XC.facilities = F;
})(window.XC = window.XC || {});
