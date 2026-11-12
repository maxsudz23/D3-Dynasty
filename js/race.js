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
      note: 'Grab position early and hold on.'
    },
    even: {
      label: 'Even pace',
      note: 'Run within yourselves, an even effort the whole way.'
    },
    neg: {
      label: 'Negative split',
      note: 'Sit in the pack, then reel runners in.'
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

  // Individual plans for the user's starting seven. 'team' follows the
  // team's pace plan; the rest override it for that runner.
  R.PLANS = {
    team: { label: 'Team plan', short: 'Team', note: 'Race the team’s pace plan.' },
    hard: { label: 'Go out hard', short: 'Hard', note: 'Grab position early and hold on.' },
    even: { label: 'Even pace', short: 'Even', note: 'Run an even effort the whole way.' },
    neg: { label: 'Negative split', short: 'Neg split', note: 'Start controlled, then reel runners in.' },
    pack: { label: 'Pack up', short: 'Pack', note: 'Run together with the other runners set to Pack up.' },
    kick: { label: 'Sit and kick', short: 'Kick', note: 'Stay tucked in, then go all out in the last kilometer.' },
    hills: { label: 'Attack the hills', short: 'Hills', note: 'Push hard on every climb.' },
    easy: { label: 'Hold back', short: 'Hold back', note: 'Run a controlled effort to spare the legs.' }
  };

  // How each plan changes fatigue and injury risk from the race.
  R.PLAN_COST = {
    hills: { fatigue: 1.3, injury: 1.15 },
    hard: { fatigue: 1.1, injury: 1 },
    easy: { fatigue: 0.55, injury: 0.5 }
  };

  const PROFILES = {
    hard: [0.236, 0.247, 0.255, 0.262],
    even: [0.248, 0.25, 0.252, 0.25],
    neg: [0.256, 0.252, 0.248, 0.244],
    kick: [0.257, 0.256, 0.252, 0.235],
    pack: [0.249, 0.25, 0.251, 0.25],
    hills: [0.246, 0.251, 0.253, 0.25],
    easy: [0.249, 0.25, 0.251, 0.25]
  };

  const hillWeightOf = (ctx) => (typeof ctx.climbPerKm === 'number'
    ? U.clamp(ctx.climbPerKm / 32, 0.03, 0.5)
    : { hilly: 0.4, rolling: 0.1 }[ctx.course] || 0);

  // What a plan does to a runner's effective rating before race-day luck,
  // and how much it widens or narrows that luck. Pack effects come later,
  // since they depend on the other pack runners.
  R.planEffect = function (runner, plan, ctx) {
    const s = runner.stats;
    switch (plan) {
      case 'hard': return { eff: (s.end - 75) * 0.18, sd: 1.45 };
      case 'neg': return { eff: (s.kck - 72) * 0.12 + (s.iq - 72) * 0.06, sd: 0.85 };
      case 'kick': return { eff: (s.kck - 74) * 0.22 + (s.iq - 72) * 0.04, sd: 0.95 };
      case 'hills': {
        const climb = typeof ctx.climbPerKm === 'number' ? ctx.climbPerKm : 6;
        return { eff: (s.hil - 72) * hillWeightOf(ctx) * 0.5 + (s.end - 72) * 0.03 - (climb < 4 ? 0.6 : 0), sd: 1.05 };
      }
      case 'easy': return { eff: -3 + (s.iq - 72) * 0.04, sd: 0.8 };
      case 'pack':
      case 'even':
      default: return { eff: (s.iq - 72) * 0.04, sd: 1 };
    }
  };

  // Rating on this course and day, before any plan.
  function baseEff(runner, ctx) {
    const s = runner.stats;
    const ovr = runner.ovr;
    let eff = ovr;
    // Hill rating counts in proportion to the course's actual climbing.
    eff += (s.hil - ovr) * hillWeightOf(ctx);
    switch (ctx.course) {
      case 'flat': eff += (s.spd - ovr) * 0.3; break;
      case 'rolling': eff += (s.end - ovr) * 0.2; break;
      case 'mud': eff += ((s.dur + s.mnt) / 2 - ovr) * 0.35; break;
      default: break;
    }
    // Training: sharpness helps, accumulated fatigue hurts.
    eff += (runner.form || 0) - Math.max(0, (runner.fatigue || 0) - 20) * 0.12;
    if (ctx.weather && ctx.weather.soft) eff += ((s.dur + s.mnt) / 2 - ovr) * 0.15;
    return eff;
  }

  // Pack running: members' ratings pull toward the pack's average, the
  // tighter the pack the bigger the lift, and they share much of their
  // race-day luck. One runner alone has no pack and just runs even.
  R.PACK = { pull: 0.3, lift: 1.8, liftPerPoint: 0.12, shared: 0.6 };
  R.packAdjust = function (effs) {
    if (effs.length < 2) return effs.map(() => 0);
    const mean = U.avg(effs);
    const spread = Math.max(...effs) - Math.min(...effs);
    const lift = Math.max(0, R.PACK.lift - spread * R.PACK.liftPerPoint);
    return effs.map((e) => (mean - e) * R.PACK.pull + lift);
  };

  // Expected change in effective rating from a plan compared with even
  // pace, for the meet preview. packRunners: everyone on 'pack', this
  // runner included.
  R.planEdge = function (runner, plan, ctx, packRunners = []) {
    const even = R.planEffect(runner, 'even', ctx).eff;
    let eff = R.planEffect(runner, plan, ctx).eff;
    if (plan === 'pack' && packRunners.length >= 2) {
      const effs = packRunners.map((r) => baseEff(r, ctx) + R.planEffect(r, 'pack', ctx).eff);
      eff += R.packAdjust(effs)[packRunners.indexOf(runner)] || 0;
    }
    return eff - even;
  };
  R.baseEff = baseEff;

  function runRunner(runner, strategy, ctx, rng, pre) {
    const s = runner.stats;
    let eff = pre ? pre.eff : baseEff(runner, ctx) + R.planEffect(runner, strategy, ctx).eff;
    let sd = (1.4 + ((100 - s.mnt) / 100) * 4.2) * (pre ? pre.sd : R.planEffect(runner, strategy, ctx).sd);
    if (pre && pre.shared !== undefined) {
      // Pack runners share part of their luck, so they race together.
      eff += pre.shared * sd * R.PACK.shared + U.gauss(0, sd * Math.sqrt(1 - R.PACK.shared ** 2), rng);
    } else {
      eff += U.gauss(0, sd, rng);
    }
    const badDay = rng() < 0.035 * (1.4 - s.mnt / 100) * (pre && pre.shared !== undefined ? 0.6 : 1);
    if (badDay) eff -= U.randFloat(5, 12, rng);

    const km = ctx.meters / 1000;
    const time = R.baseTime(eff, ctx.squad) + R.weatherSeconds(ctx.weather, km, s.dur);
    const dnf = rng() < 0.003 + ((100 - s.dur) / 100) * 0.008;

    // Pace profile drives the animation and splits.
    const profile = (PROFILES[strategy] || PROFILES.even).slice();
    const kickShift = ((s.kck - 70) / 100) * 0.012;
    profile[3] -= kickShift;
    profile[0] += kickShift * 0.5;
    profile[1] += kickShift * 0.5;
    const wobble = pre && pre.wobble ? pre.wobble : [0, 1, 2, 3].map(() => U.gauss(0, 0.0025, rng));
    for (let i = 0; i < 4; i++) profile[i] += wobble[i];
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

  // The plan a runner races: their own plan, or the team's pace plan.
  R.resolvePlan = (plan, teamStrategy) => (plan && plan !== 'team' && R.PLANS[plan] ? plan : teamStrategy);

  /* teams: [{ id, name, short, primary, accent, isUser, scored, strategy,
     plans?: { [athleteId]: planKey }, runners: [athlete] }] */
  R.simulate = function ({ squad, course, climbPerKm, weather, teams, rng = Math.random }) {
    const ctx = { squad, course, climbPerKm, weather, meters: R.DIST[squad].meters };
    const entries = [];
    teams.forEach((team) => {
      const plans = team.plans || {};
      const strategyOf = (runner) => R.resolvePlan(plans[runner.id], team.strategy || U.weightedKey({ even: 5, hard: 3, neg: 2 }, rng));
      const chosen = team.runners.map((runner) => ({ runner, strategy: strategyOf(runner) }));
      // Pack runners are set up together: pulled toward the pack's
      // average, sharing luck and pace wobble.
      const pack = chosen.filter((c) => c.strategy === 'pack');
      const pre = new Map();
      if (pack.length >= 2) {
        const effs = pack.map((c) => baseEff(c.runner, ctx) + R.planEffect(c.runner, 'pack', ctx).eff);
        const adj = R.packAdjust(effs);
        const shared = U.gauss(0, 1, rng);
        const wobble = [0, 1, 2, 3].map(() => U.gauss(0, 0.0025, rng));
        pack.forEach((c, i) => pre.set(c.runner.id, { eff: effs[i] + adj[i], sd: 0.8, shared, wobble }));
      }
      chosen.forEach(({ runner, strategy }) => {
        const out = runRunner(runner, strategy, ctx, rng, pre.get(runner.id));
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
