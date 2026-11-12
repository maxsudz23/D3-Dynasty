/* Workout days. Before each meet the coach plans one key session: groups of
   runners share a workout, anyone can get their own, and anyone can rest.

   The model, in short:
   - Every runner has a capacity: the training load they absorb well.
   - A workout's load comes from its volume, intensity and how broken up it
     is. Load / capacity is the dose. A dose near 1 is the sweet spot.
   - Benefit flattens out above a dose of 1, but fatigue keeps climbing
     (it grows faster than linearly). Fatigue drags race performance and
     raises injury risk in workouts and races.
   - Form is short-term sharpness from recent good sessions. It fades, and
     resting through a block costs a little.
   - Fatigue recovers by the week, so short gaps before championships call
     for a taper.
   - A session that asks for more than a runner can hold ends early: they
     run until they blow up, then drop out. Running to failure costs extra
     and pays back less than a session they could finish.
   Pure: no DOM. */
(function (XC) {
  'use strict';

  const U = XC.util;
  const A = XC.athletes;
  const T = {};

  // Weeks from the previous meet (or summer, for the opener) to each meet.
  T.GAP_WEEKS = [3, 2, 2, 4, 2, 1];
  T.gapWeeks = (meetIndex) => T.GAP_WEEKS[U.clamp(meetIndex, 0, T.GAP_WEEKS.length - 1)];

  /* ---------- Workout catalog ---------- */

  T.TYPES = {
    threshold: {
      label: 'Threshold run',
      short: 'Threshold',
      note: 'Comfortably hard, sustained running. Builds endurance and the ability to hold pace.',
      stats: { end: 0.55, dur: 0.15, mnt: 0.3 },
      load: 1,
      formats: {
        continuous: {
          label: 'Continuous tempo', continuous: true,
          work: { min: 12, max: 45, step: 1, unit: 'min', label: 'Duration', def: 22 }
        },
        cruise: {
          label: 'Cruise intervals', continuous: false,
          reps: { min: 2, max: 8, def: 4 },
          work: { min: 3, max: 15, step: 1, unit: 'min', label: 'Rep length', def: 6 },
          rest: { min: 30, max: 180, step: 15, label: 'Jog rest', def: 60 }
        }
      },
      intensities: {
        steady: { label: 'Steady state', i: 0.58, tte: 120 },
        threshold: { label: 'Threshold pace', i: 0.74, tte: 55 },
        hard: { label: 'Hard threshold (10K effort)', i: 0.85, tte: 32 }
      }
    },
    vo2: {
      label: 'VO2 max intervals',
      short: 'VO2 max',
      note: 'Fast repeats near 3K to 5K effort. Builds speed and aerobic power.',
      stats: { spd: 0.4, end: 0.3, kck: 0.15, mnt: 0.15 },
      load: 1,
      formats: {
        intervals: {
          label: 'Track intervals', continuous: false,
          reps: { min: 3, max: 12, def: 5 },
          work: { min: 400, max: 2000, step: 100, unit: 'm', label: 'Rep distance', def: 1000 },
          rest: { min: 45, max: 300, step: 15, label: 'Recovery', def: 120 }
        },
        floats: {
          label: 'On/off floats', continuous: true,
          reps: { min: 6, max: 24, def: 12 },
          work: { min: 20, max: 90, step: 10, unit: 's', label: 'On', def: 60 },
          rest: { min: 20, max: 90, step: 10, label: 'Float', def: 60 }
        }
      },
      intensities: {
        k5: { label: '5K pace', i: 1, pace: 1.02, tte: 16 },
        k3: { label: '3K pace', i: 1.12, pace: 1.06, tte: 9 },
        mile: { label: 'Mile pace', i: 1.24, pace: 1.12, tte: 4.5 }
      }
    },
    hills: {
      label: 'Hill repeats',
      short: 'Hills',
      note: 'Strength on the climbs. Hard on the legs, so it carries extra load.',
      stats: { hil: 0.55, spd: 0.15, dur: 0.15, mnt: 0.15 },
      load: 1.5,
      formats: {
        long: {
          label: 'Long hill repeats', continuous: false,
          reps: { min: 3, max: 10, def: 6 },
          work: { min: 45, max: 180, step: 15, unit: 's', label: 'Climb', def: 75 },
          rest: { min: 60, max: 240, step: 15, label: 'Jog down', def: 120 }
        },
        short: {
          label: 'Short hill sprints', continuous: false,
          stats: { spd: 0.4, hil: 0.35, kck: 0.25 },
          reps: { min: 6, max: 16, def: 10 },
          work: { min: 8, max: 30, step: 2, unit: 's', label: 'Sprint', def: 14 },
          rest: { min: 60, max: 180, step: 15, label: 'Walk down', def: 90 }
        },
        circuit: {
          label: 'Hilly tempo loop', continuous: true,
          work: { min: 15, max: 40, step: 1, unit: 'min', label: 'Duration', def: 20 }
        }
      },
      intensities: {
        controlled: { label: 'Controlled', i: 0.85, tte: 30 },
        strong: { label: 'Strong', i: 1, tte: 12 },
        allout: { label: 'All-out', i: 1.18, tte: 5 }
      }
    },
    fartlek: {
      label: 'Fartlek / cutdown',
      short: 'Fartlek',
      note: 'Pace changes and closing speed. Teaches racing moves and finishing.',
      stats: { kck: 0.3, iq: 0.3, spd: 0.2, end: 0.2 },
      load: 1,
      formats: {
        fartlek: {
          label: 'Fartlek surges', continuous: true,
          reps: { min: 4, max: 16, def: 8 },
          work: { min: 1, max: 5, step: 0.5, unit: 'min', label: 'Surge', def: 2 },
          rest: { min: 30, max: 180, step: 15, label: 'Float', def: 60 }
        },
        cutdown: {
          label: 'Cutdown run', continuous: true, progressive: true,
          reps: { min: 3, max: 6, def: 4, label: 'Segments' },
          work: { min: 3, max: 10, step: 1, unit: 'min', label: 'Segment length', def: 5 }
        },
        broken: {
          label: 'Broken cutdown', continuous: false, progressive: true,
          reps: { min: 3, max: 6, def: 5, label: 'Segments' },
          work: { min: 2, max: 8, step: 1, unit: 'min', label: 'Segment length', def: 4 },
          rest: { min: 45, max: 180, step: 15, label: 'Rest', def: 90 }
        }
      },
      intensities: {
        relaxed: { label: 'Relaxed', i: 0.7, tte: 70 },
        moderate: { label: 'Moderate', i: 0.82, tte: 40 },
        aggressive: { label: 'Aggressive', i: 0.95, tte: 20 }
      }
    }
  };

  T.TYPE_KEYS = Object.keys(T.TYPES);
  T.MAIN_STAT = { threshold: 'end', vo2: 'spd', hills: 'hil', fartlek: 'kck' };

  const firstKey = (obj) => Object.keys(obj)[0];

  T.formatOf = (w) => T.TYPES[w.type].formats[w.format];

  T.make = function (type, format, intensity, overrides = {}) {
    const spec = T.TYPES[type];
    const fKey = format && spec.formats[format] ? format : firstKey(spec.formats);
    const fmt = spec.formats[fKey];
    const iKeys = Object.keys(spec.intensities);
    const w = {
      type,
      format: fKey,
      intensity: intensity && spec.intensities[intensity] ? intensity : iKeys[Math.floor(iKeys.length / 2)],
      reps: fmt.reps ? fmt.reps.def : 1,
      work: fmt.work.def,
      rest: fmt.rest ? fmt.rest.def : 0
    };
    return T.normalize(Object.assign(w, overrides));
  };

  // Clamp to the format's ranges and snap to its steps.
  T.normalize = function (w) {
    const spec = T.TYPES[w.type] || T.TYPES.threshold;
    if (!T.TYPES[w.type]) w.type = 'threshold';
    if (!spec.formats[w.format]) w.format = firstKey(spec.formats);
    if (!spec.intensities[w.intensity]) w.intensity = Object.keys(spec.intensities)[1];
    const fmt = spec.formats[w.format];
    const snap = (v, r) => U.clamp(Math.round((Number(v) || r.min) / (r.step || 1)) * (r.step || 1), r.min, r.max);
    w.reps = fmt.reps ? snap(w.reps, fmt.reps) : 1;
    w.work = U.round(snap(w.work, fmt.work), 1);
    w.rest = fmt.rest ? snap(w.rest, fmt.rest) : 0;
    return w;
  };

  const restText = (s) => (s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}s`);
  const workText = (v, unit) => (unit === 'm' ? `${v} m` : unit === 's' ? `${v} sec` : `${v} min`);

  T.describe = function (w) {
    const spec = T.TYPES[w.type];
    const fmt = spec.formats[w.format];
    const label = spec.intensities[w.intensity].label;
    const pace = /^[A-Z][a-z]/.test(label) ? label[0].toLowerCase() + label.slice(1) : label;
    if (fmt.progressive) {
      const segs = `${w.reps} × ${workText(w.work, fmt.work.unit)} cutting down to ${pace}`;
      return fmt.rest ? `${segs}, ${restText(w.rest)} rest` : `${segs}, no breaks`;
    }
    if (!fmt.reps) return `${workText(w.work, fmt.work.unit)} ${w.type === 'hills' ? 'on a hilly loop' : 'continuous'} at ${pace}`;
    const restLabel = fmt.rest.label.toLowerCase();
    return `${w.reps} × ${workText(w.work, fmt.work.unit)} at ${pace}, ${restText(w.rest)} ${restLabel}`;
  };

  T.title = (w) => `${T.TYPES[w.type].short}: ${T.formatOf(w).label}`;

  /* ---------- Load, capacity, dose ---------- */

  // Seconds per kilometer at race effort.
  function racePace(a, sq) {
    const meters = XC.race.DIST[sq].meters;
    return XC.race.baseTime(a.ovr, sq) / (meters / 1000);
  }

  T.workMinutes = function (w, a, sq) {
    const spec = T.TYPES[w.type];
    const fmt = spec.formats[w.format];
    let per;
    if (fmt.work.unit === 'min') per = w.work;
    else if (fmt.work.unit === 's') per = w.work / 60;
    else per = ((w.work / 1000) * racePace(a, sq)) / (spec.intensities[w.intensity].pace || 1) / 60;
    return per * w.reps;
  };

  // How much of a runner's limit at this pace the session uses. Each pace
  // has a time to exhaustion (how long it could be held in one go); rest
  // between reps buys some of it back, floats less than full rest. Above
  // about 0.8 of the limit the session's cost climbs steeply, so 8 x 1K at
  // 3K pace on 45 seconds rest or 40 minutes at 10K effort cooks anyone.
  T.strain = function (w, a, sq) {
    const spec = T.TYPES[w.type];
    const fmt = spec.formats[w.format];
    const work = T.workMinutes(w, a, sq);
    const repMin = work / (w.reps || 1);
    let tte = spec.intensities[w.intensity].tte * (0.8 + a.stats.end / 250);
    if (fmt.progressive) tte *= 0.85;
    let density = 1;
    if (fmt.rest) {
      const ratio = w.rest / 60 / (repMin || 1);
      density = fmt.continuous ? 0.55 + 0.45 / (1 + 1.5 * ratio) : 0.4 + 0.6 / (1 + 2 * ratio);
    }
    const fraction = (work / tte) * density;
    return { fraction, rep: repMin / tte, mult: strainMult(fraction) };
  };

  const strainMult = (fraction) => 1 + 1.2 * Math.max(0, fraction - 0.8) ** 1.3;

  // Load before the strain multiplier.
  function baseLoad(w, a, sq) {
    const spec = T.TYPES[w.type];
    const fmt = spec.formats[w.format];
    let i = spec.intensities[w.intensity].i;
    if (fmt.progressive) i *= 1.06;
    const work = T.workMinutes(w, a, sq);
    const restMin = (w.rest / 60) * w.reps;
    let density = 1;
    if (fmt.rest && !fmt.continuous) density = 0.8 + 0.2 * (work / (work + restMin || 1));
    // Floats keep you running, so they add load instead of relieving it.
    else if (fmt.rest && fmt.continuous) density = 1 + 0.15 * (restMin / (work + restMin || 1));
    return work * i * i * spec.load * (fmt.loadMult || 1) * density;
  }

  T.load = (w, a, sq) => baseLoad(w, a, sq) * T.strain(w, a, sq).mult;

  // Load a runner absorbs well in one key session.
  T.capacity = function (a) {
    const s = a.stats;
    return U.clamp(14.8 + (s.end - 60) * 0.1 + (s.dur - 60) * 0.06 + (s.mnt - 60) * 0.03 + (a.year - 1) * 0.8, 9, 26);
  };

  // The planned dose, as if the runner finishes the whole session.
  T.dose = (w, a, sq) => T.load(w, a, sq) / T.capacity(a);

  // How much of their time to exhaustion (the strain fraction) a runner can
  // push through before they blow up. Tough runners dig deeper; tired legs
  // give out sooner.
  T.breakingPoint = (a, day) => U.clamp(1.15 + (a.stats.mnt - 60) * 0.004 - Math.max(0, day - 25) * 0.004, 0.95, 1.35);
  T.BREAK_SD = 0.06;

  // How far into a session a runner gets, given their workout-day fatigue.
  // Without rng it's the expected outcome (for previews); with rng the
  // breaking point varies a little, as it does on the day. Strain grows
  // with each rep, so a runner over their breaking point gets limit/strain
  // of the way through. A single rep longer than they can hold stops them
  // inside the first one.
  T.attempt = function (w, a, sq, day, rng) {
    const s = T.strain(w, a, sq);
    const cap = T.capacity(a);
    const expected = T.breakingPoint(a, day);
    const limit = rng ? Math.max(0.85, expected * (1 + U.gauss(0, T.BREAK_SD, rng))) : expected;
    let done = Math.min(1, limit / s.fraction);
    if (s.rep > limit) done = Math.min(done, limit / (s.rep * (w.reps || 1)));
    const base = baseLoad(w, a, sq);
    // Within about two spreads of the breaking point a finish isn't sure.
    const close = s.fraction > expected * (1 - 2 * T.BREAK_SD);
    if (done >= 1) return { done: 1, dnf: false, close, x: (base * s.mult) / cap, strain: s.fraction, limit: expected };
    // They held the pace right up to their limit, then stopped.
    return { done, dnf: true, close: true, x: (base * done * strainMult(limit)) / cap, strain: s.fraction, limit: expected };
  };

  // Where in the session a runner stopped: "rep 2 of 12", "18 of 40 min".
  T.stopPoint = function (w, done) {
    const fmt = T.formatOf(w);
    if (!fmt.reps) return `${Math.max(1, Math.floor(w.work * done))} of ${w.work} min`;
    const noun = fmt.progressive ? 'segment' : w.format === 'fartlek' ? 'surge' : 'rep';
    const n = Math.min(w.reps, Math.floor(w.reps * done + 1e-9) + 1);
    return `${noun} ${n} of ${w.reps}`;
  };
  T.stopText = (w, done) => (T.formatOf(w).reps ? `Dropped out during ${T.stopPoint(w, done)}` : `Dropped out ${T.stopPoint(w, done)} in`);

  // What running to failure costs on top of the work done: the session
  // breaks down (less benefit), the legs are trashed (extra fatigue), it
  // dents confidence (form) and tired form raises injury risk.
  T.DNF = { stim: 0.5, fatigue: 12, form: 1, risk: 1.5 };

  T.ZONES = [
    { max: 0.55, key: 'light', label: 'Light' },
    { max: 0.85, key: 'moderate', label: 'Moderate' },
    { max: 1.12, key: 'target', label: 'On target' },
    { max: 1.4, key: 'over', label: 'Overreach' },
    { max: Infinity, key: 'danger', label: 'Too much' }
  ];
  T.zone = (x) => T.ZONES.find((z) => x <= z.max);

  /* ---------- Hooks for staff and facilities (future features) ---------- */

  // How good the training suggestions are, 0..1. The head coach is exact
  // until assistant coaches arrive.
  T.advisorQuality = (state) => (state.staff && typeof state.staff.trainingQuality === 'number' ? state.staff.trainingQuality : 1);
  const facility = (state, key) => (state.facilities && state.facilities[key]) || 0;

  // Fatigue shed per week. A better training room speeds it up.
  T.recoveryPerWeek = (state, a) => 9 + a.stats.dur * 0.07 + facility(state, 'trainingRoom') * 1.5;
  // A better track makes interval sessions count for more.
  const trackBonus = (state, w) => (w.type === 'vo2' ? 1 + facility(state, 'track') * 0.05 : 1);

  /* ---------- Fatigue, form and racing ---------- */

  T.fatigueOf = (a) => a.fatigue || 0;
  T.formOf = (a) => a.form || 0;

  // Rating points lost on race day.
  T.fatiguePenalty = (f) => Math.max(0, f - 20) * 0.12;
  T.raceFatigue = (a) => 12 + (100 - a.stats.dur) * 0.06;
  T.raceInjuryRisk = (a) => (0.008 + ((100 - a.stats.dur) / 100) * 0.035) * (0.7 + (T.fatigueOf(a) / 40) ** 2);

  T.fatigueLabel = function (f) {
    if (f < 20) return 'Fresh';
    if (f < 40) return 'Normal';
    if (f < 60) return 'Tired';
    if (f < 80) return 'Worn down';
    return 'Exhausted';
  };

  const POT_MULT = { A: 1.35, B: 1.15, C: 0.95, D: 0.75 };

  /* ---------- Weekly mileage ---------- */

  // Miles a week a runner can absorb long term. Durable, aerobically strong
  // upperclassmen handle far more than a fast but fragile first-year.
  T.mileageCapacity = (a) => U.clamp(Math.round(30 + (a.stats.dur - 50) * 1.0 + (a.stats.end - 50) * 0.55 + (a.year - 1) * 5), 30, 120);
  T.MILEAGE = {
    standard: 0.75, // share of capacity the old fixed recovery assumed
    fatigue: 14, // weekly fatigue at full capacity
    exp: 2.2,
    xp: { end: 0.07, dur: 0.03 }, // rating XP per week at standard mileage
    floor: 0.4, // below this share of capacity, no base building
    risk: 0.03,
    form: 1, // race form per block for each 'standard' of base above or below usual
    max: 130,
    step: 5
  };
  const M = T.MILEAGE;
  const mileShare = (a, miles) => miles / T.mileageCapacity(a);
  const roundMiles = (m) => U.clamp(Math.round(m / M.step) * M.step, 0, M.max);

  // The auto plan: about the best share of capacity found in the balance
  // sim, less when tired, and a cut in the final week before a meet.
  T.autoMileage = function (state, a) {
    // Durable runners recover faster, so they can carry a bit more.
    let share = U.clamp(0.79 + (a.stats.dur - 70) * 0.003, 0.7, 0.86);
    if (T.gapWeeks(state.meetIndex) <= 1) share *= 0.75;
    share *= 1 - Math.max(0, T.fatigueOf(a) - 35) / 120;
    return roundMiles(T.mileageCapacity(a) * share);
  };
  T.isAutoMileage = (a) => typeof a.miles !== 'number';
  T.milesFor = (state, a) => (T.isAutoMileage(a) ? T.autoMileage(state, a) : a.miles);

  // Extra fatigue per week compared with the usual mileage (negative means
  // faster recovery). Injured runners cross-train at the usual load.
  T.mileageFatigue = function (state, a, miles = T.milesFor(state, a)) {
    if (a.injury > 0) return 0;
    return M.fatigue * (mileShare(a, miles) ** M.exp - M.standard ** M.exp);
  };

  // Net fatigue shed per week: recovery minus what the mileage costs.
  T.weeklyRecovery = (state, a, miles) => T.recoveryPerWeek(state, a) - T.mileageFatigue(state, a, miles);
  const halfBlock = (state, a, miles) => (T.weeklyRecovery(state, a, miles) * T.gapWeeks(state.meetIndex)) / 2;

  // Base building per week as a share of standard: nothing below the
  // floor, diminishing returns above, and tired legs absorb less.
  const curve = (r) => 1 - Math.exp(-1.6 * r);
  T.mileageShare = (a, miles) => Math.max(0, (curve(mileShare(a, miles)) - curve(M.floor)) / (curve(M.standard) - curve(M.floor)));
  T.mileageBenefit = (a, miles, fatigue) => T.mileageShare(a, miles) * (0.35 + 0.65 * (1 - fatigue / 100));
  // Race fitness from the block's mileage, compared with the usual amount.
  const mileageForm = (a, miles) => (a.injury > 0 ? 0 : M.form * (T.mileageShare(a, miles) - 1));

  // Overuse injury chance per week, from about 85% of capacity up.
  T.mileageRisk = (a, miles, fatigue) => M.risk * Math.max(0, mileShare(a, miles) - 0.85) ** 1.5
    * (1 + (fatigue / 40) ** 2) * (1.45 - a.stats.dur / 100);

  // A block of weekly mileage: base-building XP and overuse risk.
  function mileageBlock(state, a, fatigue, rng) {
    const out = { miles: T.milesFor(state, a), gains: [], injury: null };
    if (a.injury > 0) return out;
    const weeks = T.gapWeeks(state.meetIndex);
    const per = T.mileageBenefit(a, out.miles, fatigue) * (POT_MULT[a.pot] || 1);
    a.xp = a.xp || {};
    Object.entries(M.xp).forEach(([k, base]) => {
      const cur = a.stats[k];
      const slow = cur >= 90 ? 0.4 : cur >= 80 ? 0.7 : 1;
      a.xp[k] = (a.xp[k] || 0) + per * base * weeks * slow;
      while (a.xp[k] >= 1 && a.stats[k] < 99) {
        a.xp[k] -= 1;
        a.stats[k] += 1;
        out.gains.push(A.LABELS[k]);
      }
    });
    if (out.gains.length) A.refresh(a);
    const blockRisk = 1 - (1 - T.mileageRisk(a, out.miles, fatigue)) ** weeks;
    if (rng() < blockRisk) {
      const [what, outFor] = U.pick(OVERUSE, rng);
      a.injury = Math.max(a.injury, outFor);
      out.injury = { what, out: outFor };
    }
    return out;
  }
  const OVERUSE = [['stress reaction from the mileage', 2], ['overuse shin splints', 2], ['achy Achilles from the volume', 1], ['plantar fasciitis', 1]];

  function stimulus(x, fatigue) {
    const raw = x <= 1 ? x : 1 + 0.3 * (1 - Math.exp(-2.5 * (x - 1)));
    return raw * (0.35 + 0.65 * (1 - fatigue / 100));
  }

  const workoutFatigue = (x) => 18 * x ** 1.8;
  const workoutRisk = (x, f, a) => 0.004 * (0.4 + x) ** 2 * (1 + (f / 35) ** 2) * (1.45 - a.stats.dur / 100);

  // Fatigue on the workout day itself: half the block's recovery has passed.
  T.dayFatigue = function (state, a) {
    return U.clamp(T.fatigueOf(a) - halfBlock(state, a), 0, 100);
  };

  /* ---------- Plans ---------- */

  T.emptyPlan = () => ({ groups: [], assign: {} });

  // What an athlete is actually doing under a plan.
  T.resolve = function (plan, a) {
    if (a.injury > 0) return { mode: 'injured', workout: null };
    const as = plan && plan.assign[a.id];
    if (!as) return { mode: 'rest', workout: null };
    if (as.mode === 'custom' && as.workout) return { mode: 'custom', workout: as.workout };
    if (as.mode === 'group') {
      const g = plan.groups.find((x) => x.id === as.group);
      if (g) return { mode: 'group', workout: g.workout, group: g };
    }
    return { mode: 'rest', workout: null };
  };

  // Projected outcome, without changing anything.
  T.preview = function (state, sq, a, res) {
    const day = T.dayFatigue(state, a);
    const half = halfBlock(state, a);
    const miles = T.milesFor(state, a);
    const mileRisk = a.injury > 0 ? 0 : 1 - (1 - T.mileageRisk(a, miles, day)) ** T.gapWeeks(state.meetIndex);
    const race = (after) => U.clamp(after - half, 0, 100);
    if (!res.workout) {
      const after = Math.max(0, day - 10);
      return { x: 0, zone: null, day, after, race: race(after), risk: mileRisk, stim: 0, miles };
    }
    const att = T.attempt(res.workout, a, sq, day);
    const x = att.x;
    const dnf = att.dnf ? T.DNF : null;
    const after = Math.min(100, day + workoutFatigue(x) + (dnf ? dnf.fatigue : 0));
    return {
      x,
      planned: T.dose(res.workout, a, sq),
      strain: att.strain,
      dnf: att.dnf,
      close: att.close,
      done: att.done,
      zone: T.zone(x),
      day,
      after,
      race: race(after),
      miles,
      risk: Math.min(0.5, 1 - (1 - workoutRisk(x, day, a) * (dnf ? dnf.risk : 1)) * (1 - mileRisk)),
      stim: stimulus(x, day) * trackBonus(state, res.workout) * (dnf ? dnf.stim : 1)
    };
  };

  /* ---------- Recommendations ---------- */

  const median = (arr) => {
    if (!arr.length) return 0;
    const s = arr.slice().sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };

  // The dose a coach should aim for this block.
  T.targetDose = function (state, fatigue) {
    const meet = state.schedule[state.meetIndex];
    const gap = T.gapWeeks(state.meetIndex);
    let target = 1.08;
    if (gap <= 1) target = 0.5;
    else if (meet && meet.type !== 'invite' && gap <= 2) target = 0.92;
    target -= Math.max(0, fatigue - 20) / 60;
    return U.clamp(target, 0.3, 1.08);
  };

  T.blockAdvice = function (state) {
    const meet = state.schedule[state.meetIndex];
    const gap = T.gapWeeks(state.meetIndex);
    if (!meet) return '';
    if (gap <= 1) return 'One week out. Taper: keep it short and sharp so legs are fresh on race day.';
    if (meet.type !== 'invite' && gap <= 2) return 'Championship season. Train, but leave something in the tank.';
    if (gap >= 4) return `${gap} weeks until the next meet. Room for a big session; there is time to recover.`;
    return `${gap} weeks until the next meet. Aim for workouts right at each runner’s capacity.`;
  };

  function pickType(state, members, rng, quality) {
    const meet = state.schedule[state.meetIndex];
    const gap = T.gapWeeks(state.meetIndex);
    const climb = meet ? XC.course.layoutFor(meet.course).climbPerKm : 6;
    const score = { threshold: 1, vo2: 1, hills: 0.9, fartlek: 0.8 };
    if (climb >= 9) score.hills += 1.6;
    else if (climb >= 4.5) { score.hills += 0.5; score.threshold += 0.5; }
    else score.vo2 += 1.1;
    if (meet && meet.course.type === 'mud') score.threshold += 0.8;
    if (gap <= 1) { score.fartlek += 2; score.vo2 += 0.4; score.threshold -= 0.5; score.hills -= 1.2; }
    if (state.meetIndex <= 1) score.threshold += 0.8;
    T.TYPE_KEYS.forEach((t) => {
      const stat = T.MAIN_STAT[t];
      const deficit = U.avg(members.map((a) => a.ovr - a.stats[stat]));
      score[t] += deficit * 0.08;
      const repeats = members.filter((a) => a.lastWorkout === t).length;
      if (repeats > members.length / 2) score[t] -= 1;
    });
    if (rng() < (1 - quality) * 0.4) return U.pick(T.TYPE_KEYS, rng);
    return T.TYPE_KEYS.reduce((best, t) => (score[t] > score[best] ? t : best), T.TYPE_KEYS[0]);
  }

  function shapeFor(type, state, fatigue, rng) {
    const meet = state.schedule[state.meetIndex];
    const gap = T.gapWeeks(state.meetIndex);
    const climb = meet ? XC.course.layoutFor(meet.course).climbPerKm : 6;
    const taper = gap <= 1;
    switch (type) {
      case 'threshold':
        if (taper) return T.make('threshold', 'cruise', 'threshold', { work: 5, rest: 60 });
        if (fatigue > 40) return T.make('threshold', 'continuous', 'steady');
        return rng() < 0.5 ? T.make('threshold', 'continuous', 'threshold') : T.make('threshold', 'cruise', 'threshold', { work: 8, rest: 75 });
      case 'vo2':
        if (taper) return T.make('vo2', 'intervals', 'mile', { work: 400, rest: 90 });
        if (rng() < 0.6) return rng() < 0.5 ? T.make('vo2', 'intervals', 'k5', { work: 1000, rest: 120 }) : T.make('vo2', 'intervals', 'k3', { work: 800, rest: 150 });
        return T.make('vo2', 'floats', 'k5');
      case 'hills':
        if (taper) return T.make('hills', 'short', 'strong');
        if (climb >= 9) return T.make('hills', 'long', 'strong');
        return T.make('hills', rng() < 0.5 ? 'long' : 'circuit', 'controlled');
      default:
        if (taper) return T.make('fartlek', 'fartlek', 'moderate', { work: 1, rest: 60 });
        return T.make('fartlek', rng() < 0.5 ? 'cutdown' : 'fartlek', 'moderate');
    }
  }

  // Scale volume so the group's middle runner lands on the target dose,
  // without anyone getting near the point where they'd drop out.
  function fitVolume(w, members, sq, target, days) {
    const fmt = T.formatOf(w);
    const doseOf = (cand) => median(members.map((a) => T.dose(cand, a, sq)));
    const peakOf = (cand) => Math.max(...members.map((a) => T.dose(cand, a, sq)));
    const atRisk = (cand) => members.filter((a, i) => T.attempt(cand, a, sq, days[i]).close).length;
    const candidates = [];
    const workRange = [];
    for (let v = fmt.work.min; v <= fmt.work.max + 1e-9; v += fmt.work.step) workRange.push(U.round(v, 1));
    if (fmt.reps) {
      for (let r = fmt.reps.min; r <= fmt.reps.max; r++) candidates.push(Object.assign({}, w, { reps: r }));
      // Only stretch rep length if reps alone can't reach the target.
      const most = Object.assign({}, w, { reps: fmt.reps.max });
      if (doseOf(most) < target) workRange.forEach((v) => candidates.push(Object.assign({}, most, { work: v })));
    } else {
      workRange.forEach((v) => candidates.push(Object.assign({}, w, { work: v })));
    }
    let best = w;
    let bestErr = Infinity;
    candidates.forEach((c) => {
      // Hit the middle runner's target without pushing anyone into overreach.
      const err = Math.abs(doseOf(c) - target) + Math.max(0, peakOf(c) - Math.max(target + 0.08, 1.1)) * 3 + atRisk(c) * 2;
      if (err < bestErr) {
        bestErr = err;
        best = c;
      }
    });
    return T.normalize(Object.assign({}, best));
  }

  // A workout suited to these runners. quality < 1 adds the kind of error
  // a weaker assistant coach would make.
  T.recommend = function (state, sq, members, { quality = T.advisorQuality(state), rng = Math.random } = {}) {
    if (!members.length) return T.make('threshold');
    const days = members.map((a) => T.dayFatigue(state, a));
    const fatigue = median(days);
    let target = T.targetDose(state, fatigue);
    target *= 1 + U.gauss(0, (1 - quality) * 0.4, rng);
    const type = pickType(state, members, rng, quality);
    const w = fitVolume(shapeFor(type, state, fatigue, rng), members, sq, U.clamp(target, 0.25, 1.6), days);
    w.source = quality < 1 ? 'staff' : 'auto';
    return w;
  };

  // Rest anyone too worn down, then split the rest into groups of similar
  // readiness and give each group a fitted workout.
  T.autoPlan = function (state, sq, rng = Math.random) {
    const roster = state.squads[sq].roster;
    const plan = T.emptyPlan();
    const healthy = roster.filter((a) => a.injury <= 0);
    const tired = healthy.filter((a) => T.dayFatigue(state, a) >= 65);
    const active = healthy
      .filter((a) => !tired.includes(a))
      .map((a) => ({ a, r: T.capacity(a) * (1 - Math.max(0, T.dayFatigue(state, a) - 25) / 100) }))
      .sort((x, y) => y.r - x.r)
      .map((x) => x.a);
    const n = active.length <= 5 ? 1 : active.length <= 11 ? 2 : 3;
    const names = ['Group A', 'Group B', 'Group C'];
    for (let g = 0; g < n && active.length; g++) {
      const from = Math.round((g * active.length) / n);
      const to = Math.round(((g + 1) * active.length) / n);
      const members = active.slice(from, to);
      if (!members.length) continue;
      const group = { id: `g${g + 1}`, name: names[g], workout: T.recommend(state, sq, members, { rng }) };
      plan.groups.push(group);
      members.forEach((a) => { plan.assign[a.id] = { mode: 'group', group: group.id }; });
    }
    tired.forEach((a) => { plan.assign[a.id] = { mode: 'rest' }; });
    return plan;
  };

  /* ---------- Season hooks ---------- */

  T.pending = (state) => state.phase === 'season' && state.training && state.training.meetIndex === state.meetIndex && !state.training.done;

  T.openBlock = function (state) {
    state.training = { meetIndex: state.meetIndex, done: false, plans: null, report: null };
  };

  // Plans are made on first visit so the coach can just press go.
  T.ensurePlans = function (state) {
    if (!state.training || state.training.meetIndex !== state.meetIndex) T.openBlock(state);
    if (!state.training.plans) {
      state.training.plans = {};
      state.programs.forEach((sq) => { state.training.plans[sq] = T.autoPlan(state, sq); });
    }
    return state.training.plans;
  };

  // Fresh legs to start a season.
  T.startSeason = function (state) {
    state.programs.forEach((sq) => {
      state.squads[sq].roster.forEach((a) => {
        a.fatigue = U.randInt(5, 20);
        a.form = 0;
      });
    });
    T.openBlock(state);
  };

  const INJURIES = [
    ['tight hamstring', 1], ['sore Achilles', 1], ['calf strain', 2], ['IT band flare-up', 1],
    ['shin splints', 2], ['rolled ankle', 1], ['hip flexor strain', 2], ['stress reaction in the foot', 3]
  ];

  function gainStats(a, w, stim) {
    const spec = T.TYPES[w.type];
    const weights = T.formatOf(w).stats || spec.stats;
    const gained = [];
    a.xp = a.xp || {};
    Object.entries(weights).forEach(([k, wt]) => {
      const cur = a.stats[k];
      const slow = cur >= 90 ? 0.4 : cur >= 80 ? 0.7 : 1;
      a.xp[k] = (a.xp[k] || 0) + stim * (POT_MULT[a.pot] || 1) * wt * slow;
      while (a.xp[k] >= 1 && a.stats[k] < 99) {
        a.xp[k] -= 1;
        a.stats[k] += 1;
        gained.push(A.LABELS[k]);
      }
    });
    if (gained.length) A.refresh(a);
    return gained;
  }

  function noteFor(zoneKey, mode) {
    switch (zoneKey) {
      case 'light': return mode === 'rest' ? '' : 'Felt easy. Could have handled more.';
      case 'moderate': return 'Solid, controlled day.';
      case 'target': return 'Right at their limit. Good work.';
      case 'over': return 'Dug deep. The legs will feel it.';
      case 'danger': return 'Way over their head. Badly cooked.';
      default: return '';
    }
  }

  // Run the planned session for every squad and close the block.
  T.runDay = function (state, rng = Math.random) {
    T.ensurePlans(state);
    const report = { meetIndex: state.meetIndex, squads: {} };
    state.programs.forEach((sq) => {
      const plan = state.training.plans[sq];
      const rows = [];
      state.squads[sq].roster.forEach((a) => {
        const res = T.resolve(plan, a);
        const half = halfBlock(state, a);
        const before = T.fatigueOf(a);
        let day = T.dayFatigue(state, a);
        const base = mileageBlock(state, a, day, rng);
        const row = { id: a.id, name: A.fullName(a), mode: res.mode, group: res.group ? res.group.name : null, desc: '', zone: null, x: 0, gains: [], injury: null, note: '', before };
        if (res.mode === 'injured') {
          day = Math.max(0, day - 10);
          row.desc = 'Rehab and cross-training';
          row.note = 'Working back from injury.';
        } else if (!res.workout) {
          day = Math.max(0, day - 10);
          row.desc = 'Easy recovery run';
          a.form = U.clamp(0.5 * T.formOf(a) - 0.35, -3, 4.5);
        } else {
          const w = res.workout;
          const att = T.attempt(w, a, sq, day, rng);
          const dnf = att.dnf ? T.DNF : null;
          const x = att.x;
          const zone = T.zone(x);
          const stim = stimulus(x, day) * trackBonus(state, w) * (dnf ? dnf.stim : 1);
          row.desc = T.describe(w);
          row.title = T.title(w);
          row.x = U.round(x, 2);
          row.zone = zone.key;
          row.note = noteFor(zone.key, res.mode);
          if (dnf) {
            row.dnf = { done: U.round(att.done, 3), at: T.stopPoint(w, att.done) };
            row.note = `${T.stopText(w, att.done)}: couldn’t hold the pace any longer.`;
          }
          row.gains = gainStats(a, w, stim);
          a.form = U.clamp(0.5 * T.formOf(a) + 1.4 * stim - 0.35 - (dnf ? dnf.form : 0), -3, 4.5);
          a.lastWorkout = w.type;
          if (rng() < workoutRisk(x, day, a) * (dnf ? dnf.risk : 1)) {
            const [what, out] = U.pick(INJURIES, rng);
            a.injury = Math.max(a.injury, out);
            row.injury = { what, out };
          }
          day = Math.min(100, day + workoutFatigue(x) + (dnf ? dnf.fatigue : 0));
          if (w.source === 'staff' && (row.injury || dnf || zone.key === 'danger')) row.note += ' This was the staff’s suggestion.';
        }
        a.fatigue = U.round(U.clamp(day - half, 0, 100), 1);
        a.form = U.clamp(T.formOf(a) + mileageForm(a, base.miles), -3, 4.5);
        row.after = a.fatigue;
        row.miles = base.miles;
        row.baseGains = base.gains;
        if (base.injury && !row.injury) row.injury = base.injury;
        row.form = U.round(T.formOf(a), 1);
        rows.push(row);
      });
      report.squads[sq] = rows;
    });
    state.training.done = true;
    state.training.report = report;
    return report;
  };

  // The meet came before any workout: everyone rested through the block.
  T.restBlock = function (state, rng = Math.random) {
    state.programs.forEach((sq) => {
      state.squads[sq].roster.forEach((a) => {
        const full = T.weeklyRecovery(state, a) * T.gapWeeks(state.meetIndex);
        const base = mileageBlock(state, a, T.dayFatigue(state, a), rng);
        a.fatigue = U.round(U.clamp(T.fatigueOf(a) - full - 10, 0, 100), 1);
        a.form = U.clamp(0.5 * T.formOf(a) - 0.35 + mileageForm(a, base.miles), -3, 4.5);
      });
    });
    if (state.training) {
      state.training.done = true;
      state.training.skipped = true;
    }
  };

  // mult scales the race's fatigue (an individual plan like holding back).
  T.afterRace = function (a, mult = 1) {
    a.fatigue = U.round(Math.min(100, T.fatigueOf(a) + T.raceFatigue(a) * mult), 1);
  };

  XC.training = T;
})(window.XC = window.XC || {});
