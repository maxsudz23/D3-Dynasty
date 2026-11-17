/* Difficulty: chosen when a dynasty starts, saved as state.difficulty.

   Easy    The original game. Auto plans and dose percentages on workout
           day, full fatigue and morale numbers, the recruiting wheel, and
           a recruit window that slides up with reputation.
   Medium  Auto plans, but dose percentages hidden (zone labels stay).
           Fatigue and morale still shown. Reputation stretches the recruit
           range upward instead of sliding it, and draws lean low, so top
           recruits are reachable but never guaranteed. Recruiting by the
           wheel or by scouting (emails and visits), chosen at the start.
   Hard    Like medium, but scouting only, with no OVR on recruit emails;
           no fatigue, form, morale or injury-risk numbers (runners text
           when they're worn down); no auto plans or exact suggestions (the
           staff can still suggest); a tougher recruit pool, and slower
           offseason growth and reputation gains.

   Saves from before difficulties are Easy, which is how they played.
   Pure: no DOM. */
(function (XC) {
  'use strict';

  const U = XC.util;
  const D = {};

  D.LEVELS = {
    easy: {
      label: 'Easy',
      blurb: 'Auto-plan workouts with dose percentages, see every runner’s fatigue and morale, and recruit on the wheel. Better reputation, better recruits.',
      dosePct: true, condition: true, autoPlan: true, ovrInEmails: true,
      modes: ['wheel'], skew: 1, progress: 1, rep: 1
    },
    medium: {
      label: 'Medium',
      blurb: 'Auto plans without dose percentages. Reputation widens the recruit pool instead of lifting it, so a great class is never a sure thing. Recruit on the wheel or by scouting.',
      dosePct: false, condition: true, autoPlan: true, ovrInEmails: true,
      modes: ['wheel', 'scout'], skew: 1.6, progress: 1, rep: 1
    },
    hard: {
      label: 'Hard',
      blurb: 'Plan every workout yourself, with no fatigue or morale numbers: your runners will tell you when they’re cooked. Scout recruits from their emails and PRs alone. Slower growth.',
      dosePct: false, condition: false, autoPlan: false, ovrInEmails: false,
      modes: ['scout'], skew: 1.75, progress: 0.85, rep: 0.85
    }
  };
  D.KEYS = Object.keys(D.LEVELS);

  D.key = (state) => (state && D.LEVELS[state.difficulty] ? state.difficulty : 'easy');
  D.of = (state) => D.LEVELS[D.key(state)];
  // dosePct, condition (fatigue/form/morale/injury risk), autoPlan, ovrInEmails.
  D.shows = (state, what) => !!D.of(state)[what];

  // 'wheel' or 'scout'. Hard is always scouting; easy is always the wheel.
  D.recruitMode = (state) => {
    const modes = D.of(state).modes;
    return modes.includes(state && state.recruitMode) ? state.recruitMode : modes[0];
  };

  /* ---------- Recruit quality ---------- */

  // The range recruits are drawn from. Easy slides a 20-point window up
  // with reputation (S.repWindow). Medium and hard keep a low floor and
  // let reputation raise only the ceiling.
  D.range = function (state) {
    const rep = state.rep;
    if (D.key(state) === 'easy') return XC.season.repWindow(rep);
    if (D.key(state) === 'hard') return { min: 48, max: Math.min(97, Math.round(60 + 0.37 * rep)) };
    return { min: 50, max: Math.min(99, Math.round(62 + 0.37 * rep)) };
  };

  // An OVR from a quantile q (0..1) of the range, skewed toward the low end
  // on medium and hard. extraSkew steepens it further (scouting, where the
  // coach picks from a bigger pool).
  D.ovrAt = function (state, q, extraSkew = 0) {
    const { min, max } = D.range(state);
    return Math.round(min + (max - min) * U.clamp(q, 0, 1) ** (D.of(state).skew + extraSkew));
  };

  // Medium/hard wheel: each segment covers a band of quantiles.
  const BANDS = {
    walkon: [0, 0.35],
    prospect: [0.1, 0.8],
    transfer: [0.35, 0.9],
    gem: [0.05, 0.45],
    blue: [0.65, 1]
  };
  D.wheelOvr = function (state, segKey, rng = Math.random) {
    const [lo, hi] = BANDS[segKey] || BANDS.prospect;
    return D.ovrAt(state, lo + (hi - lo) * rng());
  };

  XC.difficulty = D;
})(window.XC = window.XC || {});
