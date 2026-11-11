/* Athlete model: ratings, overall formula, generation, offseason growth. */
(function (XC) {
  'use strict';

  const U = XC.util;
  const A = {};

  A.STATS = ['spd', 'end', 'hil', 'kck', 'iq', 'dur', 'mnt'];
  A.WEIGHTS = { spd: 0.2, end: 0.3, hil: 0.1, kck: 0.1, iq: 0.1, dur: 0.1, mnt: 0.1 };
  A.LABELS = { spd: 'SPD', end: 'END', hil: 'HIL', kck: 'KCK', iq: 'IQ', dur: 'DUR', mnt: 'MNT' };
  A.NAMES = {
    ovr: 'Overall rating',
    spd: 'Speed rating',
    end: 'Endurance rating',
    hil: 'Hills rating',
    kck: 'Kick rating',
    iq: 'Race IQ rating',
    dur: 'Durability rating',
    mnt: 'Mental toughness rating',
    pot: 'Potential grade',
    yr: 'Class year',
    pr: 'Personal record'
  };
  A.HELP = {
    ovr: 'Weighted blend of every rating. Endurance counts most.',
    spd: 'Raw turnover. Wins on flat, fast courses.',
    end: 'Holds pace deep into an 8K or 6K. The biggest piece of overall.',
    hil: 'Climbs and descents. Decisive on hilly courses.',
    kck: 'Finishing speed over the last 400 meters. Pays off with negative splits.',
    iq: 'Positioning, pack running and pacing judgment.',
    dur: 'Resists injury and holds up in heat, rain and mud.',
    mnt: 'Race-to-race consistency. Low mental means more bad days.',
    pot: 'How much this runner grows each offseason. A is elite growth.',
    yr: 'Runners graduate after their senior year.',
    pr: 'Best time this runner has posted for you.'
  };

  A.YEAR_SHORT = ['FR', 'SO', 'JR', 'SR'];
  A.YEAR_LONG = ['Freshman', 'Sophomore', 'Junior', 'Senior'];
  A.yearShort = (y) => A.YEAR_SHORT[U.clamp(y, 1, 4) - 1];
  A.yearLong = (y) => A.YEAR_LONG[U.clamp(y, 1, 4) - 1];

  const POT_GAIN = { A: [4, 8], B: [3, 6], C: [1, 4], D: [0, 2] };
  const ARCHETYPES = {
    miler: { spd: 6, kck: 6, end: -5, hil: -2 },
    grinder: { end: 5, dur: 5, spd: -5, kck: -3 },
    climber: { hil: 9, spd: -3, kck: -2 },
    tactician: { iq: 7, mnt: 4, spd: -3 },
    balanced: {}
  };
  A.ARCHETYPE_LABEL = {
    miler: 'Miler speed', grinder: 'Grinder', climber: 'Hill specialist', tactician: 'Tactician', balanced: 'All-rounder'
  };

  A.rawOvr = (stats) => A.STATS.reduce((sum, k) => sum + stats[k] * A.WEIGHTS[k], 0);
  A.calcOvr = (stats) => U.clamp(Math.round(A.rawOvr(stats)), 1, 99);

  // Build a rating spread whose overall lands exactly on the target.
  A.shapeStats = function (target, rng = Math.random, archetype = null) {
    const type = archetype || U.pick(Object.keys(ARCHETYPES), rng);
    const bias = ARCHETYPES[type];
    const stats = {};
    A.STATS.forEach((k) => {
      stats[k] = target + (bias[k] || 0) + U.gauss(0, 5, rng);
    });
    for (let pass = 0; pass < 6; pass++) {
      const delta = target - A.rawOvr(stats);
      A.STATS.forEach((k) => {
        stats[k] = U.clamp(stats[k] + delta, 25, 99);
      });
    }
    A.STATS.forEach((k) => {
      stats[k] = Math.round(stats[k]);
    });
    // Nudge single stats to fix rounding drift.
    let guard = 0;
    while (A.calcOvr(stats) !== target && guard < 40) {
      const dir = A.calcOvr(stats) < target ? 1 : -1;
      const k = U.pick(A.STATS, rng);
      stats[k] = U.clamp(stats[k] + dir, 25, 99);
      guard++;
    }
    return { stats, archetype: type };
  };

  A.randomPot = (weights, rng = Math.random) => U.weightedKey(weights, rng);

  function nextNumber(used, rng) {
    for (let i = 0; i < 60; i++) {
      const n = U.randInt(1, 99, rng);
      if (!used.has(n)) {
        used.add(n);
        return n;
      }
    }
    return U.randInt(1, 99, rng);
  }

  A.create = function ({ person, year = 1, transfer = false, ovr, pot = 'C', rng = Math.random, usedNumbers = new Set(), id = null }) {
    const target = U.clamp(Math.round(ovr), 30, 99);
    const shaped = A.shapeStats(target, rng);
    const athlete = {
      id: id || U.uid(),
      first: person.first,
      last: person.last,
      hometown: person.hometown,
      photo: person.photo || null,
      year,
      transfer,
      num: nextNumber(usedNumbers, rng),
      stats: shaped.stats,
      archetype: shaped.archetype,
      pot,
      ovr: 0,
      injury: 0,
      pr: null,
      career: { races: 0, wins: 0, top10: 0, aa: 0, best: null }
    };
    A.refresh(athlete);
    return athlete;
  };

  A.refresh = (a) => {
    a.ovr = A.calcOvr(a.stats);
    return a;
  };

  A.fullName = (a) => `${a.first} ${a.last}`;
  A.shortName = (a) => `${a.first[0]}. ${a.last}`;

  // Offseason growth. Returns a report row.
  A.progress = function (a, rng = Math.random) {
    const before = a.ovr;
    const [lo, hi] = POT_GAIN[a.pot] || POT_GAIN.C;
    let gain = U.randFloat(lo, hi, rng);
    if (a.ovr >= 88) gain *= 0.55;
    else if (a.ovr >= 80) gain *= 0.8;
    // A season lost to injury slows development.
    if (a.career.missed && a.career.missed >= 3) gain *= 0.6;
    const statDeltas = {};
    A.STATS.forEach((k) => {
      const d = Math.round(gain + U.gauss(0, 1.6, rng));
      const nextVal = U.clamp(a.stats[k] + d, 25, 99);
      statDeltas[k] = nextVal - a.stats[k];
      a.stats[k] = nextVal;
    });
    A.refresh(a);
    a.career.missed = 0;
    return { id: a.id, name: A.fullName(a), before, after: a.ovr, delta: a.ovr - before, pot: a.pot, statDeltas };
  };

  // Lineup = depth chart order, skipping injured runners.
  A.lineup = (roster, size = 7) => roster.filter((a) => a.injury <= 0).slice(0, size);

  A.teamOvr = function (roster) {
    const top = roster.filter((a) => a.injury <= 0).map((a) => a.ovr).sort((x, y) => y - x).slice(0, 7);
    return top.length ? Math.round(U.avg(top)) : 0;
  };

  XC.athletes = A;
})(window.XC = window.XC || {});
