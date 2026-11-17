/* Text messages from runners. Each workout block, a few runners whose
   situation suggests it text the coach: tired legs, the flu, an injury
   that's slow to heal, a workout they want to try, a PR, a bad race,
   homesickness, midterms. Every text has 2–3 replies, and each reply has
   small effects: morale, fatigue, form, injury time, a promised plan for
   the block (rest, or the workout they asked for), sometimes a news line.

   Morale (a.morale, −5..5) is new: it adds to race-day rating and to MNT
   on race day (steadier races), and drifts back toward 0 each block.

   state.inbox = [{ id, athleteId, squad, templateId, variant, vars,
   workout?, replied: null | replyIndex, note }]. Texts that are still
   unanswered when the meet runs expire, and the runner feels ignored.
   Pure: no DOM. */
(function (XC) {
  'use strict';

  const U = XC.util;
  const A = XC.athletes;
  const X = {};

  X.MORALE_MIN = -5;
  X.MORALE_MAX = 5;
  // Each block morale keeps this share of itself.
  X.MORALE_KEEP = 0.7;
  // Race-day effect: XC.race.MORALE (rating and MNT points per point).
  // An unanswered text when the meet runs.
  X.IGNORED = -0.5;
  // Most texts a squad gets in one block.
  X.MAX_PER_SQUAD = 3;
  // Chance per squad per block that someone comes down with the flu.
  X.FLU_CHANCE = 0.3;

  const T = () => XC.training;
  const firstName = (a) => a.first;

  X.moraleOf = (a) => a.morale || 0;
  X.moraleLabel = function (m) {
    if (m >= 2.5) return 'Fired up';
    if (m >= 1) return 'Happy';
    if (m > -1) return 'Steady';
    if (m > -2.5) return 'Down';
    return 'Unhappy';
  };

  // How each runner did at the last meet: PRs and races well below their
  // rank on the team. Varsity only for bad races; PRs count in JV too.
  function lastMeetFacts(state, sq) {
    const facts = {};
    const meet = state.meetIndex > 0 ? state.schedule[state.meetIndex - 1] : null;
    if (!meet || !meet.done) return facts;
    const add = (summary) => {
      if (!summary) return;
      summary.individuals.filter((r) => r.isUser && r.pr).forEach((r) => {
        facts[r.athleteId] = Object.assign(facts[r.athleteId] || {}, { pr: r.time });
      });
    };
    const varsity = meet.results[sq];
    add(varsity);
    add(meet.jv && meet.jv[sq]);
    if (varsity) {
      const byId = new Map(state.squads[sq].roster.map((a) => [a.id, a]));
      const ran = varsity.individuals.filter((r) => r.isUser && byId.has(r.athleteId));
      const byOvr = ran.toSorted((x, y) => byId.get(y.athleteId).ovr - byId.get(x.athleteId).ovr);
      ran.forEach((r, i) => {
        const expected = byOvr.indexOf(r);
        if (i - expected >= 2) facts[r.athleteId] = Object.assign(facts[r.athleteId] || {}, { bad: true, place: r.place });
      });
      (varsity.dnfs || []).forEach((name) => {
        const a = state.squads[sq].roster.find((x) => A.fullName(x) === name);
        if (a) facts[a.id] = Object.assign(facts[a.id] || {}, { bad: true, dnf: true });
      });
    }
    return facts;
  }

  // The workout a runner asks for: their favorite kind of session, a bit
  // more than is good for them.
  function askedWorkout(state, sq, a, push) {
    const T_ = T();
    const fav = T_.TYPE_KEYS.reduce((best, t) => (a.stats[T_.MAIN_STAT[t]] > a.stats[T_.MAIN_STAT[best]] ? t : best), T_.TYPE_KEYS[0]);
    const w = T_.recommend(state, sq, [a], { type: fav, push });
    w.source = 'runner';
    return w;
  }

  /* ---------- Templates ----------
     Weights are per runner, so everyday texts (requests, midterms) are
     small and event texts (a PR, a bad race) are large.
     when(ctx) -> weight (0 = not eligible). ctx: { state, sq, a, day, facts, rng }.
     texts: message variants with {name}, {workout}, {injury}, {home}, {time} slots.
     replies: [{ text, effects, note, miss? }]. effects: morale, fatigue,
     form, plan ('rest' | 'asked' | 'asked-less'), injury (+/- weeks), cure,
     news, odds: [{ p, ...effects, note }] rolled in order, first hit wins;
     miss: extra effects when no odds hit (the note is then the reply's). */
  X.TEMPLATES = {
    tired: {
      // Fatigue as the block opens, right after the meet: most of it fades
      // before workout day, but this is when the legs feel it.
      when: ({ a }) => (a.injury > 0 || (a.fatigue || 0) < 25 ? 0 : 0.3 + ((a.fatigue || 0) - 25) / 20),
      texts: [
        'Coach, my legs are dead. Any chance I can go easy this week?',
        'Not gonna lie, I’m wiped. Could I skip the workout and just run easy?'
      ],
      replies: [
        { text: 'Take it easy. Recovery runs only this week.', effects: { morale: 1, plan: 'rest' }, note: '{name} rests this block.' },
        { text: 'Do the workout, but keep it controlled.', effects: {}, note: 'No change to the plan.' },
        { text: 'Everyone’s tired this time of year. Push through it.', effects: { morale: -1 }, note: 'Morale down.' }
      ]
    },
    sick: {
      // Rolled separately: the flu happens to someone, then they text.
      when: () => 0,
      texts: [
        'I have the flu and can’t run this week. Sorry coach \u{1F912}',
        'Woke up with a fever. Pretty sure it’s the flu that’s going around the dorm.'
      ],
      replies: [
        { text: 'Rest up and drink fluids. Don’t come in until you’re better.', effects: { morale: 1 }, note: '{name} rests until the flu passes.' },
        {
          text: 'See the trainer. If the fever breaks, you race.',
          effects: { odds: [{ p: 0.5, cure: true, fatigue: 15, note: 'The fever broke. Cleared to train and race, but worn down.' }] },
          note: 'Still sick. Resting until it passes.'
        },
        {
          text: 'Can you at least make the workout?',
          effects: {
            morale: -2,
            news: 'A sick {full} shows up to {school} practice.',
            odds: [{ p: 0.5, cure: true, fatigue: 22, note: 'Came in sick and got through it. Cleared to race, but dragging.' }]
          },
          note: 'Came in sick and got worse. Out an extra week.',
          // The miss: the flu lingers.
          miss: { injury: 1 }
        }
      ]
    },
    injured: {
      when: ({ a }) => (a.injury > 0 && !a.illness ? 1.5 : 0),
      texts: [
        'My {injury} still isn’t right. Should I keep cross-training?',
        'Still feeling the {injury}. Pool running again this week?'
      ],
      replies: [
        { text: 'Keep cross-training. Don’t rush it.', effects: { morale: 1 }, note: '{name} keeps rehabbing.' },
        {
          text: 'Try an easy run and see how it feels.',
          effects: { odds: [{ p: 0.35, injury: -1, note: 'Felt good. Back a week sooner.' }, { p: 0.25, injury: 1, morale: -1, note: 'It flared up. Out a week longer.' }] },
          note: 'No change. Still rehabbing.'
        }
      ]
    },
    request: {
      when: ({ a, day }) => (a.injury > 0 || day >= 40 ? 0 : 0.12),
      texts: [
        'I was thinking about doing {workout} this week, thoughts?',
        'Could I do {workout} this week instead of the group workout? Feeling really good.'
      ],
      replies: [
        { text: 'Love it. Go for it.', effects: { morale: 1, plan: 'asked' }, note: '{name} runs their own workout this block.' },
        { text: 'Good idea. Let’s do a little less of it.', effects: { morale: 0.5, plan: 'asked-less' }, note: '{name} runs a shorter version this block.' },
        { text: 'Stick with the group this week.', effects: { morale: -1 }, note: 'Morale down.' }
      ]
    },
    pr: {
      when: ({ a, facts }) => (facts[a.id] && facts[a.id].pr && !facts[a.id].bad ? 0.7 : 0),
      texts: [
        'PR today!! {time} \u{1F389}',
        'Can’t believe I ran {time} today. New PR!'
      ],
      replies: [
        { text: 'So proud of you. That one was earned.', effects: { morale: 1.5 }, note: 'Morale up.' },
        { text: 'Great run. Now let’s go get the next one.', effects: { morale: 0.5, form: 0.3 }, note: 'Morale and form up.' }
      ]
    },
    badrace: {
      when: ({ a, facts }) => (facts[a.id] && facts[a.id].bad ? 3 : 0),
      texts: [
        'Sorry about today. I don’t know what happened out there.',
        'That race was rough. I feel like I let the team down.'
      ],
      replies: [
        { text: 'One race doesn’t define you. We move on.', effects: { morale: 1 }, note: 'Morale up.' },
        { text: 'Let’s go through the splits together and figure it out.', effects: { morale: 0.5, form: 0.3 }, note: 'Morale and form up.' },
        { text: 'That wasn’t good enough. I expect more.', effects: { morale: -1.5, form: 0.5 }, note: 'Fired up, but morale down.' }
      ]
    },
    homesick: {
      when: ({ state, a }) => {
        if (state.meetIndex > 2) return 0;
        return a.year === 1 ? 0.35 : a.year === 2 ? 0.1 : 0.03;
      },
      texts: [
        'Kind of homesick this week. Really missing {home}.',
        'Not a great week. I miss home a lot right now.'
      ],
      replies: [
        { text: 'Call home tonight. We’ve got your back here.', effects: { morale: 1 }, note: 'Morale up.' },
        { text: 'Take a few days off and recharge.', effects: { morale: 2, plan: 'rest' }, note: '{name} rests this block.' },
        { text: 'Stay busy. Running helps.', effects: { morale: -0.5 }, note: 'Morale down a little.' }
      ]
    },
    midterms: {
      when: ({ state, a }) => (a.injury > 0 ? 0 : state.meetIndex >= 2 && state.meetIndex <= 3 ? 0.25 : 0.03),
      texts: [
        'I have three midterms this week. Could I skip the workout?',
        'Exam week is brutal. Any chance I can skip the workout to study?'
      ],
      replies: [
        { text: 'School comes first. Skip it.', effects: { morale: 1.5, plan: 'rest' }, note: '{name} rests this block.' },
        { text: 'Run the workout early, then go study.', effects: { morale: 0.5 }, note: 'No change to the plan.' },
        { text: 'Midterms are no excuse. See you at practice.', effects: { morale: -1.5 }, note: 'Morale down.' }
      ]
    }
  };

  X.template = (id) => X.TEMPLATES[id];

  function fill(text, vars) {
    return text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
  }

  X.messageOf = (item) => fill(X.TEMPLATES[item.templateId].texts[item.variant] || X.TEMPLATES[item.templateId].texts[0], item.vars);
  X.replyText = (item, i) => fill(X.TEMPLATES[item.templateId].replies[i].text, item.vars);

  X.athleteOf = (state, item) => (state.squads[item.squad] ? state.squads[item.squad].roster.find((a) => a.id === item.athleteId) : null) || null;

  // Weighted pick without replacement.
  function draw(cands, n, rng) {
    const out = [];
    const pool = cands.slice();
    while (out.length < n && pool.length) {
      const total = pool.reduce((s, c) => s + c.w, 0);
      let r = rng() * total;
      let i = 0;
      while (i < pool.length - 1 && r >= pool[i].w) { r -= pool[i].w; i++; }
      out.push(pool[i]);
      // One text per runner per block.
      const id = pool[i].a.id;
      for (let j = pool.length - 1; j >= 0; j--) if (pool[j].a.id === id) pool.splice(j, 1);
    }
    return out;
  }

  function makeItem(state, sq, a, templateId, rng, extra = {}) {
    const tpl = X.TEMPLATES[templateId];
    const vars = Object.assign({
      name: firstName(a),
      full: A.fullName(a),
      school: state.school.short,
      home: (a.hometown || 'home').split(',')[0],
      injury: a.injuryWhat || 'leg'
    }, extra.vars || {});
    const item = { id: U.uid(), athleteId: a.id, squad: sq, templateId, variant: Math.floor(rng() * tpl.texts.length), vars, replied: null, note: '' };
    if (extra.workout) item.workout = extra.workout;
    return item;
  }

  // A new block: morale drifts back, last block's texts go, new ones arrive.
  X.roll = function (state, rng = Math.random) {
    state.inbox = [];
    if (state.phase !== 'season') return state.inbox;
    state.programs.forEach((sq) => {
      const roster = state.squads[sq].roster;
      roster.forEach((a) => { a.morale = U.round(X.moraleOf(a) * X.MORALE_KEEP, 2); });
      const items = [];
      // Someone may come down with the flu.
      const healthy = roster.filter((a) => a.injury <= 0);
      if (healthy.length && rng() < X.FLU_CHANCE) {
        const a = U.pick(healthy, rng);
        // The flu lasts one to two weeks from workout day.
        a.injury = Math.max(a.injury, U.randInt(1, 2, rng));
        a.illness = 'flu';
        items.push(makeItem(state, sq, a, 'sick', rng));
      }
      const facts = lastMeetFacts(state, sq);
      const cands = [];
      roster.forEach((a) => {
        if (items.some((it) => it.athleteId === a.id)) return;
        const ctx = { state, sq, a, day: T().dayFatigue(state, a), facts, rng };
        Object.entries(X.TEMPLATES).forEach(([id, tpl]) => {
          const w = tpl.when(ctx);
          if (w > 0) cands.push({ a, id, w });
        });
      });
      // Hard difficulty hides fatigue numbers, so worn-down runners always
      // speak up (up to two a block, on top of the usual texts).
      if (XC.difficulty && !XC.difficulty.shows(state, 'condition')) {
        roster.filter((a) => a.injury <= 0 && (a.fatigue || 0) >= 32 && !items.some((it) => it.athleteId === a.id))
          .sort((x, y) => (y.fatigue || 0) - (x.fatigue || 0))
          .slice(0, 2)
          .forEach((a) => {
            items.push(makeItem(state, sq, a, 'tired', rng));
            for (let j = cands.length - 1; j >= 0; j--) if (cands[j].a.id === a.id) cands.splice(j, 1);
          });
      }
      const n = Math.max(0, Math.min(X.MAX_PER_SQUAD - items.length, 1 + (rng() < 0.55 ? 1 : 0) + (rng() < 0.2 ? 1 : 0)));
      draw(cands, n, rng).forEach(({ a, id }) => {
        const extra = {};
        if (id === 'pr') extra.vars = { time: U.formatTime(facts[a.id].pr) };
        if (id === 'request') {
          extra.workout = askedWorkout(state, sq, a, 1.3);
          extra.vars = { workout: U.lowerFirst(T().describe(extra.workout)) };
        }
        items.push(makeItem(state, sq, a, id, rng, extra));
      });
      state.inbox.push(...items);
    });
    return state.inbox;
  };

  X.unread = (state, sq = null) => (state.inbox || []).filter((it) => it.replied === null && !it.expired && (!sq || it.squad === sq));

  // Why a reply can't be sent, or ''.
  X.blocker = function (state, item, i) {
    if (!item || item.replied !== null || item.expired) return 'Already answered.';
    const reply = X.TEMPLATES[item.templateId].replies[i];
    if (!reply) return 'No such reply.';
    if (!X.athleteOf(state, item)) return 'They’re no longer on the team.';
    const changesPlan = reply.effects.plan || reply.effects.cure;
    if (changesPlan && state.training && state.training.done) return 'Too late: the workout day already happened.';
    return '';
  };

  function applyEffects(state, item, a, fx) {
    const T_ = T();
    if (fx.morale) a.morale = U.round(U.clamp(X.moraleOf(a) + fx.morale, X.MORALE_MIN, X.MORALE_MAX), 2);
    if (fx.fatigue) a.fatigue = U.round(U.clamp((a.fatigue || 0) + fx.fatigue, 0, 100), 1);
    if (fx.form) a.form = U.clamp((a.form || 0) + fx.form, -3, 4.5);
    if (fx.injury) {
      a.injury = Math.max(0, a.injury + fx.injury);
      if (a.injury <= 0) delete a.illness;
    }
    if (fx.cure) {
      a.injury = 0;
      delete a.illness;
    }
    if (fx.plan && state.training) {
      let promise = null;
      if (fx.plan === 'rest') promise = { mode: 'rest' };
      else if (item.workout) {
        const w = fx.plan === 'asked'
          ? Object.assign({}, item.workout)
          : T_.recommend(state, item.squad, [a], { type: item.workout.type });
        w.source = 'runner';
        promise = { mode: 'custom', workout: w };
      }
      if (promise) {
        state.training.promises = state.training.promises || {};
        state.training.promises[a.id] = Object.assign(promise, { by: item.templateId });
        if (state.training.plans && state.training.plans[item.squad]) T_.applyPromises(state, item.squad, state.training.plans[item.squad]);
      }
    }
    if (fx.news) XC.season.addNews(state, fill(fx.news, item.vars));
  }

  // Send reply i. Returns the note shown under the reply, or null.
  X.reply = function (state, itemId, i, rng = Math.random) {
    const item = (state.inbox || []).find((it) => it.id === itemId);
    if (!item || X.blocker(state, item, i)) return null;
    const a = X.athleteOf(state, item);
    const reply = X.TEMPLATES[item.templateId].replies[i];
    const fx = Object.assign({}, reply.effects);
    let note = reply.note;
    if (fx.odds) {
      const r = rng();
      let acc = 0;
      const hit = fx.odds.find((o) => { acc += o.p; return r < acc; });
      if (hit) {
        Object.assign(fx, hit);
        note = hit.note;
      } else if (reply.miss) {
        Object.assign(fx, reply.miss);
      }
      delete fx.odds;
    }
    applyEffects(state, item, a, fx);
    item.replied = i;
    item.note = fill(note, item.vars);
    return item.note;
  };

  // The meet runs: unanswered texts expire, and the runner feels ignored.
  X.expire = function (state) {
    (state.inbox || []).forEach((it) => {
      if (it.replied !== null || it.expired) return;
      it.expired = true;
      const a = X.athleteOf(state, it);
      if (a) a.morale = U.round(U.clamp(X.moraleOf(a) + X.IGNORED, X.MORALE_MIN, X.MORALE_MAX), 2);
    });
  };

  XC.texts = X;
})(window.XC = window.XC || {});
