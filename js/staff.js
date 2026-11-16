/* Assistant coaches. One staff serves both squads.

   Each assistant has a rating (how well they read and run a session), a
   specialty workout type, a salary and a contract. What they do:
   - Sessions in an assistant's specialty count for more (stimulus bonus).
   - Someone watching every session trims workout injury risk.
   - "Staff suggestion" gives their read of a workout: it leans toward their
     specialties and is less exact than the head coach's own "Suggest".
   Hiring happens in the offseason (graduation through preseason). Contracts
   tick down when a season ends; a coach whose contract is up can be
   re-signed until the season starts, or leaves.
   Pure: no DOM. */
(function (XC) {
  'use strict';

  const U = XC.util;
  const ST = {};

  ST.SLOTS = 2;
  ST.POOL_SIZE = 6;
  ST.MAX_RATING = 95;
  // Stimulus × (1 + this × quality) for sessions in a coach's specialty.
  ST.SPECIALTY_BONUS = 0.25;
  // Workout injury risk × (1 − this × the best coach's quality).
  ST.SUPERVISION = 0.25;
  // A specialist reads their own kind of session a little better.
  ST.READ_BONUS = 0.08;
  // Phases where coaches can be hired, re-signed or let go.
  ST.HIRING_PHASES = ['graduation', 'progression', 'cut', 'preseason'];

  const typeLabel = (t) => XC.training.TYPES[t].short;
  ST.specialtyLabel = typeLabel;
  // For the middle of a sentence: "hills sessions", "VO2 max sessions".
  ST.specialtyNoun = (t) => (t === 'vo2' ? typeLabel(t) : typeLabel(t).toLowerCase());
  ST.fullName = (c) => `${c.first} ${c.last}`;
  ST.quality = (c) => c.rating / 100;

  // Staff budget per season, in thousands of dollars. Better programs pay more.
  ST.budget = (state) => Math.round(30 + state.rep * 0.7);
  // What a coach of this rating asks for, in thousands.
  ST.askingSalary = (rating, rng = Math.random) =>
    Math.round((8 + Math.max(0, (rating - 40) / 55) ** 1.6 * 52) * (0.92 + rng() * 0.16));
  // Coaches who want a job here top out with the program's reputation.
  ST.poolMax = (state) => Math.min(ST.MAX_RATING, Math.round(62 + state.rep * 0.33));

  ST.isOpen = (state) => ST.HIRING_PHASES.includes(state.phase);
  // Coaches working this season. Expiring contracts don't count until re-signed.
  ST.signed = (state) => (state.staff ? state.staff.coaches.filter((c) => !c.expiring) : []);
  ST.payroll = (state) => ST.signed(state).reduce((sum, c) => sum + c.salary, 0);
  ST.room = (state) => ST.budget(state) - ST.payroll(state);
  ST.openSlots = (state) => ST.SLOTS - ST.signed(state).length;

  function makeCoach(state, rng, { rating, specialty, years }) {
    const pool = rng() < 0.5 ? XC.names.male : XC.names.female;
    const r = U.clamp(Math.round(rating), 35, ST.MAX_RATING);
    return {
      id: U.uid(),
      first: U.pick(pool, rng),
      last: U.pick(XC.names.last, rng),
      specialty: specialty || U.pick(XC.training.TYPE_KEYS, rng),
      rating: r,
      salary: ST.askingSalary(r, rng),
      years: years || U.randInt(1, 3),
      since: state.season
    };
  }

  // A fresh slate of candidates, covering every specialty.
  ST.makePool = function (state, rng = Math.random) {
    const max = ST.poolMax(state);
    const specs = [];
    while (specs.length < ST.POOL_SIZE) specs.push(...U.shuffle(XC.training.TYPE_KEYS.slice(), rng));
    return specs.slice(0, ST.POOL_SIZE)
      .map((specialty) => makeCoach(state, rng, { specialty, rating: 45 + (max - 45) * rng() ** 0.8 }))
      .sort((a, b) => b.rating - a.rating);
  };

  // A new head coach inherits one modest assistant on a one-year deal.
  ST.fresh = function (state, rng = Math.random) {
    return {
      coaches: [makeCoach(state, rng, { rating: U.randInt(52, 60, rng), years: 1 })],
      pool: ST.makePool(state, rng),
      trainingQuality: 0
    };
  };

  // Keep trainingQuality (the best signed coach, 0..1) in step with the staff.
  ST.update = function (state) {
    const best = ST.best(state);
    state.staff.trainingQuality = best ? ST.quality(best) : 0;
  };

  ST.ensure = function (state) {
    if (!state.staff) state.staff = ST.fresh(state);
    if (!Array.isArray(state.staff.coaches)) state.staff.coaches = [];
    if (!Array.isArray(state.staff.pool)) state.staff.pool = ST.makePool(state);
    ST.update(state);
    return state.staff;
  };

  ST.best = (state) => ST.signed(state).reduce((b, c) => (!b || c.rating > b.rating ? c : b), null);
  // The best signed coach whose specialty is this workout type.
  ST.specialist = (state, type) => ST.signed(state).filter((c) => c.specialty === type).reduce((b, c) => (!b || c.rating > b.rating ? c : b), null);
  ST.has = (state) => ST.signed(state).length > 0;

  /* ---------- Effects on training ---------- */

  ST.sessionBonus = function (state, w) {
    const c = w && ST.specialist(state, w.type);
    return c ? 1 + ST.SPECIALTY_BONUS * ST.quality(c) : 1;
  };

  ST.riskFactor = function (state) {
    const best = ST.best(state);
    return best ? 1 - ST.SUPERVISION * ST.quality(best) : 1;
  };

  // How exact the staff's read of a session of this type is, 0..1, and who
  // makes it: the specialist if there is one, otherwise the best coach.
  ST.read = function (state, type) {
    const spec = ST.specialist(state, type);
    if (spec) return { coach: spec, quality: Math.min(0.97, ST.quality(spec) + ST.READ_BONUS) };
    const best = ST.best(state);
    return { coach: best, quality: best ? ST.quality(best) : 0 };
  };

  ST.specialties = (state) => ST.signed(state).map((c) => c.specialty);

  /* ---------- Hiring ---------- */

  // Why a hire or re-sign can't happen, or '' if it can.
  ST.blocker = function (state, salary) {
    if (!ST.isOpen(state)) return 'Hiring opens after the season.';
    if (ST.openSlots(state) <= 0) return `The staff is full (${ST.SLOTS} assistants).`;
    if (salary > ST.room(state)) return `Over budget by $${salary - ST.room(state)}k.`;
    return '';
  };

  ST.hire = function (state, id) {
    const i = state.staff.pool.findIndex((c) => c.id === id);
    if (i < 0) return null;
    const c = state.staff.pool[i];
    if (ST.blocker(state, c.salary)) return null;
    state.staff.pool.splice(i, 1);
    c.since = state.season;
    state.staff.coaches.push(c);
    ST.update(state);
    XC.season.addNews(state, `${state.school.short} adds ${ST.fullName(c)} to the coaching staff as a ${ST.specialtyNoun(c.specialty)} specialist.`);
    return c;
  };

  ST.resign = function (state, id) {
    const c = state.staff.coaches.find((x) => x.id === id);
    if (!c || !c.expiring || !c.ask) return null;
    if (ST.blocker(state, c.ask.salary)) return null;
    c.salary = c.ask.salary;
    c.years = c.ask.years;
    delete c.expiring;
    delete c.ask;
    ST.update(state);
    XC.season.addNews(state, `${ST.fullName(c)} signs a ${c.years}-year extension with ${state.school.short}.`);
    return c;
  };

  ST.release = function (state, id) {
    if (!ST.isOpen(state)) return null;
    const i = state.staff.coaches.findIndex((c) => c.id === id);
    if (i < 0) return null;
    const [c] = state.staff.coaches.splice(i, 1);
    ST.update(state);
    XC.season.addNews(state, `${ST.fullName(c)} leaves the ${state.school.short} coaching staff.`);
    return c;
  };

  /* ---------- Season hooks ---------- */

  // At the end of a season: coaches grow with experience, contracts tick
  // down, and a new slate of candidates comes looking for work.
  ST.endSeason = function (state, rng = Math.random) {
    ST.ensure(state);
    state.staff.coaches.forEach((c) => {
      c.rating = U.clamp(c.rating + U.randInt(-1, 3, rng), 35, ST.MAX_RATING);
      if (c.expiring) return;
      c.years -= 1;
      if (c.years <= 0) {
        c.expiring = true;
        c.ask = { salary: Math.round(ST.askingSalary(c.rating, rng) * 0.95), years: U.randInt(1, 3, rng) };
        XC.season.addNews(state, `${ST.fullName(c)}’s contract is up. Re-sign them on the Staff screen before the season starts.`);
      }
    });
    state.staff.pool = ST.makePool(state, rng);
    ST.update(state);
  };

  // When the season starts, anyone not re-signed moves on.
  ST.startSeason = function (state) {
    ST.ensure(state);
    const gone = state.staff.coaches.filter((c) => c.expiring);
    state.staff.coaches = state.staff.coaches.filter((c) => !c.expiring);
    gone.forEach((c) => XC.season.addNews(state, `${ST.fullName(c)} takes a job elsewhere after their contract ran out.`));
    ST.update(state);
  };

  XC.staff = ST;
})(window.XC = window.XC || {});
