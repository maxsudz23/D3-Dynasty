/* Dynasty rules: new game, schedule, fields, meet results, reputation,
   nationals qualification, offseason and recruiting. */
(function (XC) {
  'use strict';

  const U = XC.util;
  const A = XC.athletes;
  const R = XC.race;
  const S = {};

  S.ROSTER_CAP = 20;
  S.START_REP = 30;
  S.START_YEAR = 2027;
  S.SPINS = 7;

  S.yearOf = (season) => S.START_YEAR + season - 1;
  S.squadLabel = (sq) => (sq === 'M' ? "Men's" : "Women's");
  S.squadNoun = (sq) => (sq === 'M' ? 'Men' : 'Women');

  S.repWindow = function (rep) {
    const max = U.clamp(Math.round(62 + 0.37 * rep), 62, 99);
    return { min: max - 20, max };
  };
  S.stars = (rep) => (rep < 20 ? 1 : rep < 40 ? 2 : rep < 60 ? 3 : rep < 80 ? 4 : 5);

  S.MEET_TYPES = {
    invite: 'Invitational',
    conference: 'Conference championship',
    regional: 'NCAA regional',
    national: 'NCAA championship'
  };

  const DATES = [
    { label: 'Sep 6', month: 8 },
    { label: 'Sep 20', month: 8 },
    { label: 'Oct 4', month: 9 },
    { label: 'Nov 1', month: 10 },
    { label: 'Nov 15', month: 10 },
    { label: 'Nov 22', month: 10 }
  ];

  S.WHEEL = [
    { key: 'prospect', label: 'Prospect' },
    { key: 'walkon', label: 'Walk-on' },
    { key: 'transfer', label: 'Transfer' },
    { key: 'prospect', label: 'Prospect' },
    { key: 'gem', label: 'Hidden gem' },
    { key: 'walkon', label: 'Walk-on' },
    { key: 'prospect', label: 'Prospect' },
    { key: 'blue', label: 'Blue chip' },
    { key: 'transfer', label: 'Transfer' },
    { key: 'prospect', label: 'Prospect' }
  ];
  S.TIER_NOTE = {
    walkon: 'Raw freshman. Low rating, room to grow.',
    prospect: 'Solid freshman recruit.',
    gem: 'Unpolished freshman with elite potential.',
    blue: 'Top freshman in your reach.',
    transfer: 'Experienced runner joining as a sophomore or junior.'
  };

  /* ---------- New game ---------- */

  function startingRoster(squad, people) {
    const years = U.shuffle([1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4]);
    const used = new Set();
    const roster = years.map((year, i) => {
      const ovr = Math.round(50 + 40 * ((Math.random() + Math.random()) / 2));
      const pot = year <= 2
        ? A.randomPot({ A: 15, B: 35, C: 35, D: 15 })
        : A.randomPot({ A: 5, B: 25, C: 45, D: 25 });
      return A.create({ person: people[i] || XC.api.localPerson(squad), year, ovr: U.clamp(ovr, 50, 90), pot, usedNumbers: used });
    });
    return roster.sort((a, b) => b.ovr - a.ovr);
  }

  S.newGame = function ({ coachName, school, programs, people }) {
    const state = {
      version: 1,
      coach: { name: coachName },
      school,
      programs,
      season: 1,
      rep: S.START_REP,
      repStart: S.START_REP,
      phase: 'preseason',
      meetIndex: 0,
      schedule: [],
      squads: {},
      opp: {},
      history: [],
      news: [],
      recruiting: null,
      offseason: null
    };
    programs.forEach((sq) => {
      state.squads[sq] = {
        roster: startingRoster(sq, people[sq] || []),
        strategy: 'even',
        inviteWins: 0,
        natQual: null
      };
    });
    initOpp(state);
    state.schedule = S.buildSchedule(state);
    S.resetRecruiting(state);
    S.addNews(state, `${school.short} hires Coach ${coachName} to lead the ${school.mascot}.`);
    preseasonNews(state);
    return state;
  };

  /* ---------- Opponents ---------- */

  const TIER_RANGE = { 1: [78, 86], 2: [70, 78], 3: [61, 71] };
  const TIER_MEAN = { 1: 82, 2: 74, 3: 66 };

  function initOpp(state) {
    state.opp = {};
    state.programs.forEach((sq) => {
      state.opp[sq] = {};
      XC.schools.list.forEach((s) => {
        if (s.id === state.school.id || !XC.schools.offers(s, sq)) return;
        const [lo, hi] = TIER_RANGE[s.tier];
        state.opp[sq][s.id] = U.randInt(lo, hi);
      });
    });
  }

  function driftOpp(state) {
    state.programs.forEach((sq) => {
      Object.keys(state.opp[sq]).forEach((id) => {
        const school = XC.schools.byId(id);
        const v = state.opp[sq][id];
        const next = v + U.gauss(0, 2.5) + (TIER_MEAN[school.tier] - v) * 0.15;
        state.opp[sq][id] = U.round(U.clamp(next, 55, 92), 1);
      });
    });
  }

  S.poll = function (state, sq) {
    return Object.entries(state.opp[sq])
      .map(([id, str]) => ({ school: XC.schools.byId(id), str }))
      .sort((a, b) => b.str - a.str);
  };

  const oppCache = new Map();
  S.oppRunners = function (state, school, sq) {
    const key = `${school.id}|${sq}|${state.season}|${state.opp[sq][school.id]}`;
    if (oppCache.has(key)) return oppCache.get(key);
    const str = state.opp[sq][school.id];
    const rng = U.mulberry32(U.hash(`${school.id}|${sq}|${state.season}`));
    const used = new Set();
    const offsets = [7, 4, 2, 0, -2, -4, -7];
    const runners = offsets.map((off, i) => A.create({
      person: XC.api.localPerson(sq, rng),
      ovr: U.clamp(Math.round(str + off + U.gauss(0, 2.5, rng)), 40, 97),
      year: U.randInt(1, 4, rng),
      rng,
      usedNumbers: used,
      id: `${school.id}-${state.season}-${i}`
    }));
    if (oppCache.size > 600) oppCache.clear();
    oppCache.set(key, runners);
    return runners;
  };

  /* ---------- Schedule ---------- */

  function courseName(rng) {
    return `${U.pick(XC.names.coursePrefix, rng)} ${U.pick(XC.names.courseSuffix, rng)}`;
  }

  function hostOf(school) {
    return { id: school.id, short: school.short, name: school.name, lat: school.lat, lon: school.lon };
  }

  S.buildSchedule = function (state) {
    const rng = Math.random;
    const home = state.school;
    const others = XC.schools.list.filter((s) => s.id !== home.id);
    const nearby = others
      .map((s) => ({ s, d: U.haversineKm(home.lat, home.lon, s.lat, s.lon) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 14)
      .map((x) => x.s);
    const prefixes = U.shuffle(XC.names.invitePrefix, rng);
    const types = ['flat', 'rolling', 'hilly', 'mud'];
    const homeInvite = U.randInt(0, 2, rng);

    const meets = [];
    for (let i = 0; i < 3; i++) {
      const host = i === homeInvite ? home : U.pick(nearby, rng);
      meets.push({
        type: 'invite',
        name: `${prefixes[i]} ${U.pick(XC.names.inviteSuffix, rng)}`,
        host: hostOf(host),
        course: { name: courseName(rng), type: U.pick(types, rng) }
      });
    }

    const confMates = others.filter((s) => s.conf === home.conf);
    const confHost = confMates.length && rng() < 0.8 ? U.pick(confMates, rng) : home;
    meets.push({
      type: 'conference',
      name: `${home.conf === 'Independent' ? 'Independent' : home.conf} Championship`,
      host: hostOf(confHost),
      course: { name: courseName(rng), type: U.pick(['rolling', 'hilly', 'flat'], rng) }
    });

    const regionMates = others.filter((s) => s.region === home.region);
    const regHost = regionMates.length ? U.pick(regionMates, rng) : home;
    meets.push({
      type: 'regional',
      name: `NCAA ${home.region} Regional`,
      host: hostOf(regHost),
      course: { name: courseName(rng), type: U.pick(['rolling', 'hilly', 'mud'], rng) }
    });

    const natHost = U.pick(others, rng);
    meets.push({
      type: 'national',
      name: 'NCAA Division III Championships',
      host: hostOf(natHost),
      course: { name: U.pick(XC.names.nationalVenues, rng), type: U.pick(['flat', 'rolling', 'mud'], rng) }
    });

    return meets.map((m, i) => Object.assign(m, {
      id: `s${state.season}-m${i}`,
      index: i,
      date: DATES[i].label,
      month: DATES[i].month,
      weather: null,
      results: {},
      repDelta: null,
      done: false
    }));
  };

  S.currentMeet = (state) => (state.phase === 'season' ? state.schedule[state.meetIndex] : null);

  /* ---------- Fields ---------- */

  S.fieldSchools = function (state, meet, sq) {
    const home = state.school;
    const pool = XC.schools.list.filter((s) => s.id !== home.id && XC.schools.offers(s, sq) && state.opp[sq][s.id] !== undefined);
    const rng = U.mulberry32(U.hash(`${meet.id}|field`));
    const byDistance = (lat, lon) => pool
      .map((s) => ({ s, d: U.haversineKm(lat, lon, s.lat, s.lon) }))
      .sort((a, b) => a.d - b.d)
      .map((x) => x.s);

    if (meet.type === 'invite') {
      const near = byDistance(meet.host.lat, meet.host.lon).slice(0, 22);
      const size = U.randInt(9, 15, rng);
      const hostSchool = pool.find((s) => s.id === meet.host.id);
      const picked = U.shuffle(near, rng).slice(0, size);
      if (hostSchool && !picked.includes(hostSchool)) picked[0] = hostSchool;
      return picked;
    }

    if (meet.type === 'conference') {
      const mates = pool.filter((s) => s.conf === home.conf);
      if (mates.length >= 5) return mates;
      const fill = byDistance(home.lat, home.lon).filter((s) => !mates.includes(s));
      return mates.concat(fill.slice(0, 7 - mates.length));
    }

    if (meet.type === 'regional') {
      const mates = pool.filter((s) => s.region === home.region);
      if (mates.length >= 10) return mates;
      const fill = byDistance(home.lat, home.lon).filter((s) => !mates.includes(s));
      return mates.concat(fill.slice(0, 16 - mates.length));
    }

    // Nationals: regional qualifiers plus the strongest programs in the country.
    const qual = state.squads[sq].natQual || { team: false, regionTeams: [] };
    const slots = qual.team ? 31 : 32;
    const chosen = (qual.regionTeams || []).map((id) => pool.find((s) => s.id === id)).filter(Boolean);
    const ranked = S.poll(state, sq).map((p) => p.school).filter((s) => pool.includes(s) && !chosen.includes(s));
    return chosen.concat(ranked).slice(0, slots);
  };

  S.userEntry = function (state, meet, sq) {
    const squad = state.squads[sq];
    const school = state.school;
    const base = { id: 'user', name: school.name, short: school.short, primary: school.primary, accent: school.accent, isUser: true, strategy: squad.strategy };
    if (meet.type === 'national') {
      const qual = squad.natQual;
      if (!qual || !qual.team) {
        const indiv = qual ? squad.roster.filter((a) => qual.individuals.includes(a.id) && a.injury <= 0) : [];
        if (!indiv.length) return null;
        return Object.assign(base, { scored: false, runners: indiv });
      }
    }
    return Object.assign(base, { scored: true, runners: A.lineup(squad.roster) });
  };

  S.buildTeams = function (state, meet, sq) {
    const teams = S.fieldSchools(state, meet, sq).map((s) => ({
      id: s.id,
      name: s.name,
      short: s.short,
      primary: s.primary,
      accent: s.accent,
      isUser: false,
      scored: true,
      strategy: null,
      str: state.opp[sq][s.id],
      runners: S.oppRunners(state, s, sq)
    }));
    const user = S.userEntry(state, meet, sq);
    if (user) teams.push(user);
    return teams;
  };

  /* ---------- Running a meet ---------- */

  function repForPlace(type, place, nTeams) {
    if (!place) return -1;
    switch (type) {
      case 'invite': return place === 1 ? 3 : place <= 3 ? 1.5 : place <= nTeams / 2 ? 0.5 : -0.5;
      case 'conference': return place === 1 ? 6 : place === 2 ? 3 : place === 3 ? 1.5 : place <= nTeams / 2 ? 0 : -1;
      case 'regional': return place === 1 ? 7 : place === 2 ? 5 : place <= 4 ? 3 : place <= 8 ? 1 : -1;
      case 'national': return place === 1 ? 16 : place <= 4 ? 11 : place <= 10 ? 7 : place <= 20 ? 4 : 2;
      default: return 0;
    }
  }

  function summarize(sim, teams, meet, sq) {
    const shortById = {};
    teams.forEach((t) => { shortById[t.id] = t.short; });
    const user = sim.standings.find((s) => s.isUser) || null;
    const individuals = sim.finishers
      .filter((f, i) => i < 50 || f.teamId === 'user')
      .map((f) => ({
        place: f.place,
        teamPlace: f.teamPlace,
        name: A.fullName(f.runner),
        teamId: f.teamId,
        short: shortById[f.teamId],
        time: U.round(f.time, 1),
        isUser: f.teamId === 'user',
        athleteId: f.teamId === 'user' ? f.runner.id : null,
        year: f.teamId === 'user' ? f.runner.year : null,
        pr: false
      }));
    const winner = sim.standings[0] || null;
    const top = sim.finishers[0];
    return {
      squad: sq,
      standings: sim.standings.map((s) => ({
        id: s.id, name: s.name, short: s.short, primary: s.primary, accent: s.accent, isUser: s.isUser,
        score: s.score, place: s.place, places: s.places.slice(0, 7), complete: s.complete,
        spread: s.spread === null ? null : U.round(s.spread, 1)
      })),
      individuals,
      dnfs: sim.dnfs.filter((d) => d.teamId === 'user').map((d) => A.fullName(d.runner)),
      userPlace: user ? user.place : null,
      userScore: user ? user.score : null,
      userEntered: teams.some((t) => t.id === 'user'),
      individualsOnly: teams.some((t) => t.id === 'user' && t.scored === false),
      nTeams: sim.standings.length,
      winner: winner ? { id: winner.id, short: winner.short, name: winner.name, score: winner.score } : null,
      champion: top ? { name: A.fullName(top.runner), short: shortById[top.teamId], time: U.round(top.time, 1), isUser: top.teamId === 'user' } : null,
      injuries: [],
      aa: [],
      repDelta: 0
    };
  }

  function applyToRoster(state, meet, sq, sim, summary) {
    const squad = state.squads[sq];
    const raced = new Set();
    sim.all.filter((e) => e.teamId === 'user').forEach((e) => {
      const a = e.runner;
      raced.add(a.id);
      a.career.races += 1;
      if (e.dnf) return;
      const row = summary.individuals.find((r) => r.athleteId === a.id);
      if (a.pr === null || e.time < a.pr) {
        if (a.pr !== null && row) row.pr = true;
        a.pr = U.round(e.time, 1);
      }
      if (a.career.best === null || e.place < a.career.best) a.career.best = e.place;
      if (e.place === 1) a.career.wins += 1;
      if (e.place <= 10) a.career.top10 += 1;
      if (meet.type === 'national' && e.place <= 40) {
        a.career.aa += 1;
        summary.aa.push(A.fullName(a));
      }
    });

    // Runners who sat out heal one meet; racers roll for new injuries.
    squad.roster.forEach((a) => {
      if (!raced.has(a.id) && a.injury > 0) {
        a.injury -= 1;
        a.career.missed = (a.career.missed || 0) + 1;
      }
    });
    squad.roster.forEach((a) => {
      if (!raced.has(a.id)) return;
      const risk = 0.012 + ((100 - a.stats.dur) / 100) * 0.05;
      if (meet.type !== 'national' && Math.random() < risk) {
        a.injury = U.randInt(1, 3);
        summary.injuries.push({ name: A.fullName(a), out: a.injury });
      }
    });
  }

  S.runMeet = function (state) {
    const meet = state.schedule[state.meetIndex];
    if (!meet.weather) meet.weather = XC.api.simulatedWeather(meet.month, meet.id);
    const factor = state.programs.length === 2 ? 0.6 : 1;
    const races = [];
    let repTotal = 0;

    state.programs.forEach((sq) => {
      const teams = S.buildTeams(state, meet, sq);
      const sim = R.simulate({ squad: sq, course: meet.course.type, weather: meet.weather, teams });
      const summary = summarize(sim, teams, meet, sq);
      applyToRoster(state, meet, sq, sim, summary);

      let delta = 0;
      if (meet.type === 'national') {
        if (summary.userPlace) delta = repForPlace('national', summary.userPlace, summary.nTeams);
        else delta = -2;
        delta += Math.min(summary.aa.length, 3);
      } else if (summary.userEntered) {
        delta = repForPlace(meet.type, summary.userPlace, summary.nTeams);
      }
      summary.repDelta = U.round(delta * factor, 1);
      repTotal += delta * factor;

      if (meet.type === 'invite' && summary.userPlace === 1) state.squads[sq].inviteWins += 1;
      meet.results[sq] = summary;
      races.push({ squad: sq, sim, teams });
      raceNews(state, meet, sq, summary);
    });

    meet.done = true;
    meet.repDelta = U.round(repTotal, 1);
    state.rep = U.round(U.clamp(state.rep + repTotal, 0, 100), 1);

    if (meet.type === 'regional') qualify(state, meet);
    if (meet.type === 'national') closeSeason(state);
    else state.meetIndex += 1;

    return races;
  };

  function raceNews(state, meet, sq, summary) {
    const label = S.squadLabel(sq).toLowerCase();
    const school = state.school.short;
    if (summary.winner && summary.winner.id !== 'user') {
      S.addNews(state, `${summary.winner.short} wins the ${label} title at the ${meet.name} with ${summary.winner.score} points.`);
    }
    if (summary.userPlace === 1) {
      S.addNews(state, `${school} ${label} team takes the ${meet.name} crown with ${summary.userScore} points.`);
    } else if (summary.userPlace) {
      S.addNews(state, `${school} ${label} squad finishes ${U.ordinal(summary.userPlace)} of ${summary.nTeams} at the ${meet.name}.`);
    }
    if (summary.champion) {
      S.addNews(state, `${summary.champion.name} (${summary.champion.short}) wins the ${label} individual race in ${U.formatTime(summary.champion.time)}.`);
    }
  }

  function qualify(state, meet) {
    state.programs.forEach((sq) => {
      const squad = state.squads[sq];
      const res = meet.results[sq];
      const p = res.userPlace;
      const regionTeams = res.standings.filter((s) => !s.isUser && s.complete).slice(0, 3).map((s) => s.id);
      let team = false;
      let reason = '';
      if (p && p <= 2) {
        team = true;
        reason = `Automatic bid for finishing ${U.ordinal(p)} at regionals.`;
      } else if (p === 3) {
        team = true;
        reason = 'At-large bid for finishing third at regionals.';
      } else if (p === 4 && squad.inviteWins > 0) {
        team = true;
        reason = 'At-large bid: fourth at regionals plus an invitational win.';
      }
      let individuals = [];
      if (!team) {
        individuals = res.individuals.filter((i) => i.isUser && i.place <= 10).map((i) => i.athleteId);
        reason = individuals.length
          ? `The team missed the cut, but ${individuals.length} runner${individuals.length > 1 ? 's' : ''} qualified individually with a top-10 finish.`
          : 'No bid this year. Top 3 at regionals earns a team bid; a top-10 finish sends a runner individually.';
      }
      squad.natQual = { team, individuals, reason, regionTeams };
      S.addNews(state, `${state.school.short} ${S.squadLabel(sq).toLowerCase()} team ${team ? 'punches its ticket to nationals' : 'misses the nationals field'}.`);
    });
  }

  function closeSeason(state) {
    const entry = {
      season: state.season,
      year: S.yearOf(state.season),
      repStart: state.repStart,
      repEnd: state.rep,
      squads: {}
    };
    state.programs.forEach((sq) => {
      const results = state.schedule.map((m) => {
        const r = m.results[sq];
        return { name: m.name, type: m.type, place: r ? r.userPlace : null, nTeams: r ? r.nTeams : null, score: r ? r.userScore : null };
      });
      const byType = (t) => results.find((r) => r.type === t) || {};
      const nat = state.schedule[5].results[sq];
      const roster = state.squads[sq].roster;
      const mvp = roster.slice().sort((a, b) => (a.pr || 9999) - (b.pr || 9999))[0];
      entry.squads[sq] = {
        results,
        conf: byType('conference').place,
        regional: byType('regional').place,
        national: byType('national').place,
        natNote: state.squads[sq].natQual ? state.squads[sq].natQual.reason : '',
        aa: nat ? nat.aa.slice() : [],
        teamOvr: A.teamOvr(roster),
        mvp: mvp ? { name: A.fullName(mvp), pr: mvp.pr } : null
      };
    });
    state.history.push(entry);
    state.phase = 'recap';
    state.meetIndex = state.schedule.length;
  }

  /* ---------- Offseason ---------- */

  S.beginOffseason = function (state) {
    const report = { year: S.yearOf(state.season), graduates: {}, progression: {} };
    state.programs.forEach((sq) => {
      const squad = state.squads[sq];
      const grads = squad.roster.filter((a) => a.year >= 4);
      squad.roster = squad.roster.filter((a) => a.year < 4);
      report.graduates[sq] = grads.map((a) => ({
        id: a.id, name: A.fullName(a), first: a.first, last: a.last, num: a.num, ovr: a.ovr, pot: a.pot,
        hometown: a.hometown, photo: a.photo, pr: a.pr, career: a.career, transfer: a.transfer
      }));
      report.progression[sq] = squad.roster
        .map((a) => {
          const yearBefore = a.year;
          const row = A.progress(a);
          a.year += 1;
          a.injury = 0;
          return Object.assign(row, { yearBefore, yearAfter: a.year });
        })
        .sort((x, y) => y.delta - x.delta);
      squad.roster.sort((x, y) => y.ovr - x.ovr);
      if (grads.length) S.addNews(state, `${state.school.short} says goodbye to ${grads.length} ${S.squadLabel(sq).toLowerCase()} senior${grads.length > 1 ? 's' : ''}.`);
    });
    state.offseason = report;
    state.phase = 'graduation';
  };

  S.startNewSeason = function (state) {
    state.season += 1;
    if (state.rep > 80) state.rep = U.round(state.rep - 5, 1);
    else if (state.rep > 20) state.rep = U.round(state.rep - 3, 1);
    state.repStart = state.rep;
    driftOpp(state);
    state.schedule = S.buildSchedule(state);
    state.meetIndex = 0;
    state.phase = 'preseason';
    state.offseason = null;
    state.programs.forEach((sq) => {
      state.squads[sq].inviteWins = 0;
      state.squads[sq].natQual = null;
    });
    S.resetRecruiting(state);
    preseasonNews(state);
  };

  /* ---------- Recruiting ---------- */

  S.resetRecruiting = function (state) {
    state.recruiting = {};
    state.programs.forEach((sq) => {
      state.recruiting[sq] = { people: null, live: null, prospects: [], spins: 0 };
    });
  };

  S.makeProspect = function (state, sq, segIndex) {
    const rec = state.recruiting[sq];
    const seg = S.WHEEL[segIndex];
    const win = S.repWindow(state.rep);
    const person = (rec.people && rec.people[rec.spins]) || XC.api.localPerson(sq);
    const used = new Set(state.squads[sq].roster.map((a) => a.num).concat(rec.prospects.map((p) => p.num)));
    let ovr;
    let pot;
    let year = 1;
    let transfer = false;
    switch (seg.key) {
      case 'walkon':
        ovr = U.randInt(win.min, win.min + 7);
        pot = A.randomPot({ A: 5, B: 20, C: 45, D: 30 });
        break;
      case 'gem':
        ovr = U.randInt(win.min, win.min + 8);
        pot = 'A';
        break;
      case 'blue':
        ovr = U.randInt(win.max - 6, win.max);
        pot = A.randomPot({ A: 35, B: 45, C: 20 });
        break;
      case 'transfer':
        ovr = U.randInt(win.min + 8, win.max);
        pot = A.randomPot({ B: 20, C: 50, D: 30 });
        year = U.randInt(2, 3);
        transfer = true;
        break;
      default:
        ovr = U.randInt(win.min + 5, win.max - 5);
        pot = A.randomPot({ A: 15, B: 40, C: 35, D: 10 });
    }
    const athlete = A.create({ person, year, transfer, ovr: Math.min(ovr, 99), pot, usedNumbers: used });
    athlete.tier = seg.key;
    athlete.status = 'pending';
    rec.prospects.push(athlete);
    rec.spins += 1;
    return athlete;
  };

  S.signedCount = (state, sq) => state.recruiting[sq].prospects.filter((p) => p.status === 'signed').length;
  S.openSpots = (state, sq) => S.ROSTER_CAP - state.squads[sq].roster.length - S.signedCount(state, sq);

  S.finishRecruiting = function (state) {
    state.programs.forEach((sq) => {
      const rec = state.recruiting[sq];
      const signed = rec.prospects.filter((p) => p.status === 'signed');
      signed.forEach((p) => {
        delete p.status;
        state.squads[sq].roster.push(p);
      });
      if (signed.length) {
        const best = signed.slice().sort((a, b) => b.ovr - a.ovr)[0];
        S.addNews(state, `${A.fullName(best)} (${best.ovr} OVR) headlines the ${state.school.short} ${S.squadLabel(sq).toLowerCase()} recruiting class.`);
      }
    });
    S.resetRecruiting(state);
    state.phase = 'season';
    state.meetIndex = 0;
  };

  /* ---------- News ---------- */

  S.addNews = function (state, text) {
    state.news.unshift(text);
    state.news = state.news.slice(0, 16);
  };

  function preseasonNews(state) {
    state.programs.forEach((sq) => {
      const top = S.poll(state, sq).slice(0, 2);
      if (top.length) {
        S.addNews(state, `Preseason poll: ${top[0].school.short} opens No. 1 in the ${S.squadLabel(sq).toLowerCase()} rankings, ${top[1].school.short} close behind.`);
      }
    });
  }

  XC.season = S;
})(window.XC = window.XC || {});
