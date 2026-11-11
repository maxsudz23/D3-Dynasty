/* Race simulation and standard cross country scoring. Pure functions. */
(function (XC) {
  'use strict';

  const U = XC.util;
  const R = {};

  R.DIST = {
    M: { meters: 8000, label: '8K', checkpoints: ['2K', '4K', '6K'] },
    W: { meters: 6000, label: '6K', checkpoints: ['1.5K', '3K', '4.5K'] }
  };

  R.COURSES = {
    flat: { label: 'Flat and fast', note: 'Speed is king. Pure turnover wins.' },
    rolling: { label: 'Rolling', note: 'Constant small grades reward strength over distance.' },
    hilly: { label: 'Hilly', note: 'Long climbs. Hill ratings swing places.' },
    mud: { label: 'Mud and grass', note: 'Soft footing. Durability and mental toughness matter.' }
  };

  R.STRATEGIES = {
    hard: {
      label: 'Go out hard',
      note: 'Grab position early. Strong-endurance teams gain; others risk a late fade.'
    },
    even: {
      label: 'Even pace',
      note: 'Run within yourselves. Steady and predictable.'
    },
    neg: {
      label: 'Negative split',
      note: 'Sit in the pack, then reel runners in. Rewards kick and race IQ.'
    }
  };

  // Seconds for a rating on a neutral course.
  R.baseTime = function (eff, squad) {
    return squad === 'W' ? 1215 + (99 - eff) * 5.2 : 1440 + (99 - eff) * 6.73;
  };

  R.weatherSeconds = function (weather, km, dur) {
    if (!weather) return 0;
    const heat = Math.max(0, weather.tempC - 16) * 1.1;
    const cold = Math.max(0, -2 - weather.tempC) * 0.4;
    const rain = Math.min(weather.precipMm || 0, 6) * 1.6;
    const wind = Math.max(0, (weather.windKph || 0) - 12) * 0.12;
    return (heat + cold + rain + wind) * km * (1.25 - (dur / 100) * 0.5);
  };

  const PROFILES = {
    hard: [0.236, 0.247, 0.255, 0.262],
    even: [0.248, 0.25, 0.252, 0.25],
    neg: [0.256, 0.252, 0.248, 0.244]
  };

  function runRunner(runner, strategy, ctx, rng) {
    const s = runner.stats;
    const ovr = runner.ovr;
    let eff = ovr;

    switch (ctx.course) {
      case 'hilly': eff += (s.hil - ovr) * 0.4; break;
      case 'flat': eff += (s.spd - ovr) * 0.3; break;
      case 'rolling': eff += (s.end - ovr) * 0.2 + (s.hil - ovr) * 0.1; break;
      case 'mud': eff += ((s.dur + s.mnt) / 2 - ovr) * 0.35; break;
      default: break;
    }
    if (ctx.weather && ctx.weather.soft) eff += ((s.dur + s.mnt) / 2 - ovr) * 0.15;

    let sd = 1.4 + ((100 - s.mnt) / 100) * 4.2;
    if (strategy === 'hard') {
      eff += (s.end - 75) * 0.18;
      sd *= 1.45;
    } else if (strategy === 'neg') {
      eff += (s.kck - 72) * 0.12 + (s.iq - 72) * 0.06;
      sd *= 0.85;
    } else {
      eff += (s.iq - 72) * 0.04;
    }
    eff += U.gauss(0, sd, rng);
    const badDay = rng() < 0.035 * (1.4 - s.mnt / 100);
    if (badDay) eff -= U.randFloat(5, 12, rng);

    const km = ctx.meters / 1000;
    const time = R.baseTime(eff, ctx.squad) + R.weatherSeconds(ctx.weather, km, s.dur);
    const dnf = rng() < 0.003 + ((100 - s.dur) / 100) * 0.008;

    // Pace profile drives the animation and splits.
    const profile = PROFILES[strategy].slice();
    const kickShift = ((s.kck - 70) / 100) * 0.012;
    profile[3] -= kickShift;
    profile[0] += kickShift * 0.5;
    profile[1] += kickShift * 0.5;
    for (let i = 0; i < 4; i++) profile[i] += U.gauss(0, 0.0025, rng);
    const total = profile.reduce((a, b) => a + b, 0);
    let acc = 0;
    const cum = profile.map((p) => {
      acc += (p / total) * time;
      return acc;
    });

    return {
      time: dnf ? null : time,
      projected: time,
      cum,
      dnf,
      dnfAt: dnf ? U.randFloat(0.25, 0.85, rng) : null,
      badDay
    };
  }

  /* teams: [{ id, name, short, primary, accent, isUser, scored, strategy, runners: [athlete] }] */
  R.simulate = function ({ squad, course, weather, teams, rng = Math.random }) {
    const ctx = { squad, course, weather, meters: R.DIST[squad].meters };
    const entries = [];
    teams.forEach((team) => {
      team.runners.forEach((runner) => {
        const strategy = team.strategy || U.weightedKey({ even: 5, hard: 3, neg: 2 }, rng);
        const out = runRunner(runner, strategy, ctx, rng);
        entries.push(Object.assign({ runner, teamId: team.id, strategy }, out));
      });
    });

    const finishers = entries.filter((e) => !e.dnf).sort((a, b) => a.time - b.time);
    const dnfs = entries.filter((e) => e.dnf);
    const teamMeta = {};
    teams.forEach((t) => { teamMeta[t.id] = t; });
    const standings = R.score(finishers, teamMeta);
    dnfs.forEach((d) => {
      d.place = null;
      d.teamPlace = null;
    });
    return { squad, finishers, dnfs, standings, all: finishers.concat(dnfs) };
  };

  /* finishers must be sorted fastest first. Mutates place/teamPlace. */
  R.score = function (finishers, teamMeta) {
    const counts = {};
    finishers.forEach((f) => {
      if (teamMeta[f.teamId].scored !== false) counts[f.teamId] = (counts[f.teamId] || 0) + 1;
    });
    const isComplete = (id) => (counts[id] || 0) >= 5;
    const taken = {};
    let teamPlace = 0;
    finishers.forEach((f, i) => {
      f.place = i + 1;
      f.teamPlace = null;
      if (teamMeta[f.teamId].scored !== false && isComplete(f.teamId) && (taken[f.teamId] || 0) < 7) {
        taken[f.teamId] = (taken[f.teamId] || 0) + 1;
        f.teamPlace = ++teamPlace;
      }
    });

    const standings = Object.values(teamMeta)
      .filter((t) => t.scored !== false)
      .map((t) => {
        const mine = finishers.filter((f) => f.teamId === t.id);
        const places = mine.filter((f) => f.teamPlace).map((f) => f.teamPlace);
        const complete = isComplete(t.id);
        const top5 = mine.slice(0, 5).map((f) => f.time);
        return {
          id: t.id,
          name: t.name,
          short: t.short,
          primary: t.primary,
          accent: t.accent,
          isUser: Boolean(t.isUser),
          complete,
          score: complete ? places.slice(0, 5).reduce((a, b) => a + b, 0) : null,
          places,
          finishers: mine.length,
          spread: complete ? top5[4] - top5[0] : null,
          avg: complete ? U.avg(top5) : null
        };
      });

    standings.sort((a, b) => {
      if (a.complete !== b.complete) return a.complete ? -1 : 1;
      if (!a.complete) return b.finishers - a.finishers;
      if (a.score !== b.score) return a.score - b.score;
      const sixA = a.places[5] === undefined ? Infinity : a.places[5];
      const sixB = b.places[5] === undefined ? Infinity : b.places[5];
      return sixA - sixB;
    });
    let place = 0;
    standings.forEach((s) => {
      s.place = s.complete ? ++place : null;
    });
    return standings;
  };

  // Fraction of the course covered at race clock t (used by the animation).
  R.progressAt = function (entry, t) {
    const cum = entry.cum;
    if (!entry.dnf && t >= entry.time) return 1;
    let prev = 0;
    let frac = 1;
    for (let i = 0; i < 4; i++) {
      if (t < cum[i]) {
        frac = (i + (t - prev) / (cum[i] - prev)) / 4;
        break;
      }
      prev = cum[i];
    }
    if (entry.dnf) return Math.min(frac, entry.dnfAt);
    return Math.max(0, Math.min(1, frac));
  };

  XC.race = R;
})(window.XC = window.XC || {});
