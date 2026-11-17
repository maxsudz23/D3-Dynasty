/* Scouting recruiting (medium and hard): instead of spinning a wheel,
   recruits email the coach in the preseason with their PRs. Assistant
   coaches widen and lift that pool (better scouts find better runners)
   and write scouting reports. The coach hosts a few official visits;
   after a visit the recruit decides whether to commit.

   Prospects live in state.recruiting[sq].prospects like wheel recruits
   (status 'pending' | 'signed' | 'passed'), so S.finishRecruiting works
   for both. Scouting data is in p.scout and is dropped when they join:
   { interest, prs: [[event, seconds]], school, major, variant, report,
   decision: null | 'committed' | 'declined' | 'passed', otherSchool }.
   rec.scout = { visitsLeft, reportsLeft }.
   Pure: no DOM. */
(function (XC) {
  'use strict';

  const U = XC.util;
  const A = XC.athletes;
  const SC = {};

  SC.VISITS = { medium: 6, hard: 5 };
  SC.EXTRA_SKEW = 0.8;
  const MAJORS = ['biology', 'economics', 'computer science', 'history', 'chemistry', 'environmental studies', 'psychology', 'engineering', 'English', 'math', 'neuroscience', 'political science', 'physics', 'education', 'kinesiology'];
  const FROM = ['a Division I program', 'a Division II program', 'a junior college'];

  const diff = (state) => XC.difficulty.key(state);
  const best = (state) => (XC.staff ? XC.staff.best(state) : null);

  // How well the program scouts: 0.25 with only the head coach, up to
  // about 0.96 with a top assistant.
  SC.power = (state) => {
    const b = best(state);
    return 0.25 + (b ? (b.rating / 100) * 0.75 : 0);
  };
  SC.inboxSize = (state) => (diff(state) === 'hard' ? 6 : 8) + Math.round(SC.power(state) * 4);
  SC.reports = (state) => 2 + (XC.staff ? XC.staff.signed(state).length * 2 : 0);

  /* ---------- PRs from ratings ---------- */

  // High school PRs (1600, 3200, 5K XC), or college marks for a transfer,
  // from the race model's time for this OVR. Speed shows in the 1600,
  // endurance in the 5K, plus a little noise, so PRs hint at a runner's
  // shape without giving the rating away.
  SC.prsFor = function (a, sq, transfer, rng = Math.random) {
    const jit = () => 1 + U.gauss(0, 0.008, rng);
    const t = XC.race.baseTime(a.ovr, sq);
    const spd = 1 - (a.stats.spd - a.ovr) * 0.003;
    const end = 1 - (a.stats.end - a.ovr) * 0.002;
    const t5 = (sq === 'W' ? t * (5 / 6) ** 1.06 : t / 1.6 ** 1.06) * end * jit();
    const t3200 = t5 * 0.6233 * 0.96 * Math.sqrt(spd) * jit();
    const t1600 = t3200 * 0.4796 * 0.98 * spd * jit();
    if (transfer) {
      return [[sq === 'W' ? '6K XC' : '8K XC', t * jit()], ['5000', t5 * 0.96 * jit()], ['1500', t1600 * 0.93]];
    }
    return [['1600', t1600], ['3200', t3200], ['5K XC', t5]];
  };

  /* ---------- The inbox ---------- */

  function interestFor(state, ovr, rng) {
    // The better the runner, the more programs want them.
    const need = (ovr - 50) / 40;
    const f = state.facilities || {};
    const fac = 0.015 * ((f.trainingRoom || 0) + (f.track || 0) + (f.spectators || 0)) + (f.championship ? 0.03 : 0);
    const harder = diff(state) === 'hard' ? 0.08 : 0;
    return U.round(U.clamp(0.62 + (state.rep / 100 - need) * 0.9 + fac - harder + U.gauss(0, 0.1, rng), 0.05, 0.95), 3);
  }

  function makeRecruit(state, sq, rng, used) {
    const power = SC.power(state);
    // Better scouting tilts the pool toward the top of the range (gently:
    // the coach also picks who to visit from a bigger pool).
    const q = 1 - (1 - rng()) ** (1 + power * 0.3);
    // A steeper skew than the wheel: the coach chooses who to visit from
    // the whole inbox, so the pool itself has to be thinner at the top.
    const ovr = XC.difficulty.ovrAt(state, q, SC.EXTRA_SKEW);
    const transfer = rng() < 0.15;
    const year = transfer ? U.randInt(2, 3, rng) : 1;
    const pot = transfer
      ? A.randomPot({ B: 20, C: 50, D: 30 }, rng)
      : diff(state) === 'hard' ? A.randomPot({ A: 10, B: 35, C: 40, D: 15 }, rng) : A.randomPot({ A: 15, B: 40, C: 35, D: 10 }, rng);
    const person = XC.api.localPerson(sq, rng, state.school);
    const a = A.create({ person, year, transfer, ovr: Math.min(ovr, 99), pot, rng, usedNumbers: used });
    used.add(a.num);
    a.tier = transfer ? 'transfer' : 'prospect';
    a.status = 'pending';
    XC.looks.ensure(a, sq);
    a.scout = {
      interest: interestFor(state, a.ovr, rng),
      prs: SC.prsFor(a, sq, transfer, rng).map(([e, t]) => [e, U.round(t, 1)]),
      school: transfer ? U.pick(FROM, rng) : `${(a.hometown || 'Central').split(',')[0]} High School`,
      major: U.pick(MAJORS, rng),
      variant: U.randInt(0, 2, rng),
      report: null,
      decision: null,
      otherSchool: null
    };
    return a;
  }

  // Build a squad's inbox the first time the preseason needs it.
  SC.ensure = function (state, sq, rng = Math.random) {
    const rec = state.recruiting && state.recruiting[sq];
    if (!rec || rec.scout) return rec;
    const used = new Set(state.squads[sq].roster.map((a) => a.num));
    const n = SC.inboxSize(state);
    for (let i = 0; i < n; i++) rec.prospects.push(makeRecruit(state, sq, rng, used));
    // Strongest-sounding emails first is what a coach would sort by.
    rec.prospects.sort((x, y) => x.scout.prs[0][1] / (sq === 'W' ? 1.1 : 1) - y.scout.prs[0][1] / (sq === 'W' ? 1.1 : 1));
    rec.scout = { visitsLeft: SC.VISITS[diff(state)] || SC.VISITS.medium, reportsLeft: SC.reports(state) };
    return rec;
  };

  SC.interestLabel = (i) => (i >= 0.7 ? 'Very interested' : i >= 0.5 ? 'Interested' : i >= 0.3 ? 'Open to it' : 'Lukewarm');

  /* ---------- Actions ---------- */

  SC.blocker = function (state, sq, p, action) {
    const rec = state.recruiting && state.recruiting[sq];
    if (state.phase !== 'preseason' || !rec || !rec.scout) return 'Recruiting is closed.';
    if (!p || p.status !== 'pending') return 'Already decided.';
    if (action === 'scout') {
      if (p.scout.report) return 'Already scouted.';
      if (rec.scout.reportsLeft <= 0) return 'No scouting reports left this year.';
    }
    if (action === 'visit') {
      if (rec.scout.visitsLeft <= 0) return 'No official visits left this year.';
      if (XC.season.openSpots(state, sq) <= 0) return 'No roster spots left.';
    }
    return '';
  };

  // A scouting report: potential, strengths, interest, and (when emails
  // carry no OVR) an OVR range that's tighter with a better scout.
  SC.scoutReport = function (state, sq, id, rng = Math.random) {
    const rec = state.recruiting[sq];
    const p = rec.prospects.find((x) => x.id === id);
    if (SC.blocker(state, sq, p, 'scout')) return null;
    const b = best(state);
    const quality = b ? b.rating / 100 : 0.35;
    const err = Math.max(1, Math.round(8 - 6.5 * quality));
    const low = p.ovr - U.randInt(0, err, rng);
    const stats = Object.entries(p.stats).sort((x, y) => y[1] - x[1]);
    p.scout.report = {
      by: b ? XC.staff.fullName(b) : 'You',
      pot: p.pot,
      low,
      high: low + err,
      strong: stats[0][0],
      weak: stats[stats.length - 1][0],
      interest: SC.interestLabel(p.scout.interest)
    };
    rec.scout.reportsLeft -= 1;
    return p.scout.report;
  };

  // An official visit; they decide at the end of it.
  SC.visit = function (state, sq, id, rng = Math.random) {
    const rec = state.recruiting[sq];
    const p = rec.prospects.find((x) => x.id === id);
    if (SC.blocker(state, sq, p, 'visit')) return null;
    const b = best(state);
    const chance = U.clamp(p.scout.interest + (b ? (b.rating / 100) * 0.08 : 0), 0.05, 0.95);
    rec.scout.visitsLeft -= 1;
    if (rng() < chance) {
      p.status = 'signed';
      p.scout.decision = 'committed';
      XC.season.addNews(state, `${A.fullName(p)} commits to ${state.school.short} after an official visit.`);
    } else {
      p.status = 'passed';
      p.scout.decision = 'declined';
      const others = XC.schools.list.filter((s) => s.id !== state.school.id && s.region === state.school.region);
      p.scout.otherSchool = (U.pick(others.length ? others : XC.schools.list, rng) || {}).short || 'another program';
    }
    return p.scout.decision;
  };

  SC.pass = function (state, sq, id) {
    const p = state.recruiting[sq].prospects.find((x) => x.id === id);
    if (!p || p.status !== 'pending') return false;
    p.status = 'passed';
    p.scout.decision = 'passed';
    return true;
  };

  XC.scouting = SC;
})(window.XC = window.XC || {});
