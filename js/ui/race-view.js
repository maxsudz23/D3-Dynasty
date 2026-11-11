/* Race day: an animated top-down course with every runner as a dot,
   live team scoring, checkpoint calls and an optional spoken announcer. */
(function (XC) {
  'use strict';

  const U = XC.util;
  const h = U.h;
  const ui = XC.ui;
  const S = XC.season;
  const A = XC.athletes;
  const R = XC.race;
  XC.screens = XC.screens || {};

  const COURSE = [
    [0.06, 0.8], [0.22, 0.88], [0.42, 0.84], [0.6, 0.9], [0.8, 0.84], [0.94, 0.66], [0.88, 0.44],
    [0.7, 0.4], [0.62, 0.22], [0.76, 0.1], [0.52, 0.06], [0.34, 0.16], [0.4, 0.36], [0.24, 0.44],
    [0.08, 0.3], [0.04, 0.52], [0.14, 0.66], [0.28, 0.7]
  ];
  const GRASS = { flat: '#7DA35F', rolling: '#729A57', hilly: '#668D4E', mud: '#6E8A4E' };
  const TRAIL = { flat: '#DCCFA6', rolling: '#D6C89C', hilly: '#CDBE92', mud: '#8A6A48' };
  const REAL_SECONDS = 16;

  function catmull(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  }

  XC.screens.race = {
    title: 'Race day',
    squadTabs: false,
    render(root, params) {
      const races = XC.live.races;
      const state = XC.state;
      if (!state) return XC.go('title');
      if (!races || !races[params.i]) {
        if (XC.live.meetIndex !== undefined) return XC.go('results', { meetIndex: XC.live.meetIndex, fresh: true });
        return XC.go('hub');
      }
      this.params = params;
      this.race = races[params.i];
      this.meet = state.schedule[XC.live.meetIndex];
      this.isLast = params.i >= races.length - 1;
      XC.activeSquad = this.race.squad;
      this.setup(root);
    },

    setup(root) {
      const race = this.race;
      const meet = this.meet;
      const sq = race.squad;
      this.teams = {};
      race.teams.forEach((t) => { this.teams[t.id] = t; });
      this.entries = race.sim.all.map((e, i) => Object.assign(e, { lane: ((i * 7919) % 13) - 6 }));
      this.finishers = race.sim.finishers;
      const winnerTime = this.finishers.length ? this.finishers[0].time : 1500;
      this.endTime = this.finishers.length ? this.finishers[this.finishers.length - 1].time + 4 : winnerTime;
      this.scale = winnerTime / REAL_SECONDS;
      this.T = 0;
      this.speed = 1;
      this.phase = 'marks';
      this.calls = new Set();
      this.lastSide = 0;

      this.clock = h('p', { class: 'race__clock', 'aria-label': 'Race clock' }, '0:00');
      this.canvas = h('canvas', { class: 'race__canvas', role: 'img', 'aria-label': `${S.squadLabel(sq)} race on ${meet.course.name}` });
      this.wrap = h('div', { class: 'race__canvas-wrap' }, this.canvas);
      this.teamList = h('ol', { class: 'live-list', 'aria-label': 'Live team scores' });
      this.userList = h('ol', { class: 'live-list', 'aria-label': 'Your runners' });
      this.call = h('p', { class: 'race__call', 'aria-live': 'polite' }, 'Runners, take your marks…');
      this.speedBtns = [1, 2, 4].map((n) => h('button', {
        type: 'button', 'aria-pressed': String(n === 1), on: { click: () => this.setSpeed(n) }
      }, `${n}x`));
      this.skipBtn = ui.button('Skip to finish', () => this.skip(), { variant: 'ghost', key: 'Space' });
      this.nextBtn = ui.button(this.isLast ? 'View results' : `Next: ${S.squadLabel(XC.live.races[this.params.i + 1].squad)} race`,
        () => this.next(), { variant: 'primary', size: 'big', key: 'Enter' });
      this.nextBtn.hidden = true;

      root.appendChild(h('div', { class: 'race' },
        h('div', { class: 'race__head' },
          h('div', { class: 'race__heading' },
            h('h2', { class: 'race__title' }, `${S.squadLabel(sq)} ${R.DIST[sq].label}`),
            h('p', { class: 'race__sub' }, `${meet.name}, ${meet.course.name}. ${R.COURSES[meet.course.type].label}${meet.weather ? `, ${XC.api.toF(meet.weather.tempC)}° and ${meet.weather.label.toLowerCase()}` : ''}`)),
          h('div', { class: 'actions race__controls' },
            h('div', { class: 'speed', role: 'group', 'aria-label': 'Playback speed' }, this.speedBtns),
            this.skipBtn,
            this.nextBtn),
          this.clock),
        this.call,
        h('div', { class: 'race__stage' },
          this.wrap,
          h('aside', { class: 'race__side' },
            h('h3', { class: 'race__side-title' }, 'Team scores'),
            this.teamList,
            h('h3', { class: 'race__side-title' }, `${XC.state.school.short} runners`),
            this.userList))));

      this.resizeObs = new ResizeObserver(() => this.resize());
      this.resizeObs.observe(this.wrap);
      this.resize();
      this.updateSide();

      const startDelay = U.prefersReducedMotion() ? 200 : 1100;
      XC.audio.say('Runners, take your marks.', { interrupt: true });
      this.startTimer = setTimeout(() => {
        this.phase = 'running';
        XC.audio.gun();
        this.say("And they're off!");
        this.lastFrame = performance.now();
        this.raf = requestAnimationFrame((t) => this.frame(t));
      }, startDelay);
    },

    say(text) {
      this.call.textContent = text;
      XC.audio.say(text);
    },

    setSpeed(n) {
      this.speed = n;
      this.speedBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.textContent === `${n}x`)));
      XC.audio.nav();
    },

    skip() {
      if (this.phase === 'done') return;
      clearTimeout(this.startTimer);
      this.T = this.endTime;
      // Skip straight to the result call instead of reading every checkpoint.
      R.DIST[this.race.squad].checkpoints.forEach((label) => this.calls.add(label));
      XC.audio.hush();
      if (this.phase === 'marks') XC.audio.gun();
      this.phase = 'running';
      if (!this.raf) {
        this.lastFrame = performance.now();
        this.raf = requestAnimationFrame((t) => this.frame(t));
      }
    },

    /* ---------- Geometry ---------- */

    resize() {
      const rect = this.wrap.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.dpr = dpr;
      this.W = rect.width;
      this.H = rect.height;
      this.k = Math.max(0.6, Math.min(1.4, rect.width / 820));
      this.canvas.width = Math.round(rect.width * dpr);
      this.canvas.height = Math.round(rect.height * dpr);
      this.buildPath();
      this.buildStatic();
      this.draw();
    },

    buildPath() {
      const pad = 26 * this.k;
      const pts = COURSE.map(([x, y]) => [pad + x * (this.W - 2 * pad), pad + y * (this.H - 2 * pad)]);
      const samples = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[Math.min(pts.length - 1, i + 2)];
        for (let s = 0; s < 24; s++) {
          const t = s / 24;
          samples.push([catmull(p0[0], p1[0], p2[0], p3[0], t), catmull(p0[1], p1[1], p2[1], p3[1], t)]);
        }
      }
      samples.push(pts[pts.length - 1]);
      const cum = [0];
      for (let i = 1; i < samples.length; i++) {
        cum.push(cum[i - 1] + Math.hypot(samples[i][0] - samples[i - 1][0], samples[i][1] - samples[i - 1][1]));
      }
      this.path = samples;
      this.cum = cum;
      this.total = cum[cum.length - 1];
    },

    pointAt(frac) {
      const target = U.clamp(frac, 0, 1) * this.total;
      const cum = this.cum;
      let lo = 0;
      let hi = cum.length - 1;
      while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if (cum[mid] <= target) lo = mid;
        else hi = mid;
      }
      const a = this.path[lo];
      const b = this.path[hi];
      const seg = cum[hi] - cum[lo] || 1;
      const t = (target - cum[lo]) / seg;
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1;
      return { x: a[0] + dx * t, y: a[1] + dy * t, nx: -dy / len, ny: dx / len };
    },

    buildStatic() {
      const type = this.meet.course.type;
      const k = this.k;
      const off = document.createElement('canvas');
      off.width = this.canvas.width;
      off.height = this.canvas.height;
      const ctx = off.getContext('2d');
      ctx.scale(this.dpr, this.dpr);
      const W = this.W;
      const H = this.H;

      // Grass with mow stripes
      ctx.fillStyle = GRASS[type];
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      for (let x = -H; x < W; x += 56 * k) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 28 * k, 0);
        ctx.lineTo(x + 28 * k + H * 0.6, H);
        ctx.lineTo(x + H * 0.6, H);
        ctx.closePath();
        ctx.fill();
      }

      const rng = U.mulberry32(U.hash(this.meet.id));
      if (type === 'hilly' || type === 'rolling') {
        ctx.strokeStyle = 'rgba(30,40,20,0.12)';
        ctx.lineWidth = 1.5;
        const hills = type === 'hilly' ? 3 : 2;
        for (let i = 0; i < hills; i++) {
          const cx = U.randFloat(0.2, 0.8, rng) * W;
          const cy = U.randFloat(0.2, 0.8, rng) * H;
          for (let r = 1; r <= 5; r++) {
            ctx.beginPath();
            ctx.ellipse(cx, cy, r * 26 * k, r * 16 * k, 0.4, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }

      // Trees, kept off the trail
      const nearPath = (x, y, d) => this.path.some((p) => Math.hypot(p[0] - x, p[1] - y) < d);
      for (let i = 0; i < 90; i++) {
        const x = rng() * W;
        const y = rng() * H;
        const r = (7 + rng() * 9) * k;
        if (nearPath(x, y, r + 16 * k)) continue;
        ctx.fillStyle = 'rgba(20,30,15,0.25)';
        ctx.beginPath();
        ctx.ellipse(x + 4 * k, y + 5 * k, r, r * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3E6B3A';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4F8046';
        ctx.beginPath();
        ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Trail
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      const trace = () => {
        ctx.beginPath();
        this.path.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      };
      trace();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 22 * k;
      ctx.stroke();
      trace();
      ctx.strokeStyle = TRAIL[type];
      ctx.lineWidth = 17 * k;
      ctx.stroke();
      if (type === 'mud') {
        ctx.fillStyle = 'rgba(70,45,25,0.35)';
        for (let i = 0; i < 40; i++) {
          const p = this.pointAt(rng());
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, (4 + rng() * 6) * k, (3 + rng() * 4) * k, rng() * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Start and finish lines
      const line = (frac, checkered) => {
        const p = this.pointAt(frac);
        const half = 14 * k;
        const steps = 6;
        for (let s = 0; s < steps; s++) {
          const a = -half + (2 * half * s) / steps;
          const b = -half + (2 * half * (s + 1)) / steps;
          ctx.strokeStyle = checkered && s % 2 ? '#1A2431' : '#FFFFFF';
          ctx.lineWidth = 4 * k;
          ctx.beginPath();
          ctx.moveTo(p.x + p.nx * a, p.y + p.ny * a);
          ctx.lineTo(p.x + p.nx * b, p.y + p.ny * b);
          ctx.stroke();
        }
      };
      line(0.002, false);
      line(0.998, true);

      // Labels
      const tag = (frac, text, dy) => {
        const p = this.pointAt(frac);
        ctx.font = `700 ${12 * k}px 'Saira Condensed', sans-serif`;
        const w = ctx.measureText(text).width + 12 * k;
        const x = U.clamp(p.x - w / 2, 4, W - w - 4);
        const y = U.clamp(p.y + dy * k, 4, H - 22 * k);
        ctx.fillStyle = '#1A2431';
        ctx.fillRect(x, y, w, 18 * k);
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + 6 * k, y + 9 * k);
      };
      tag(0, 'Start', 14);
      tag(1, 'Finish', -34);
      R.DIST[this.race.squad].checkpoints.forEach((label, i) => {
        const frac = (i + 1) / 4;
        const p = this.pointAt(frac);
        ctx.fillStyle = '#F2F5F8';
        ctx.fillRect(p.x - 1.5 * k, p.y - 22 * k, 3 * k, 22 * k);
        tag(frac, label, -40);
      });

      this.staticLayer = off;
    },

    /* ---------- Frame loop ---------- */

    frame(now) {
      const dt = Math.min(0.1, (now - this.lastFrame) / 1000);
      this.lastFrame = now;
      if (this.phase === 'running') {
        this.T = Math.min(this.endTime, this.T + dt * this.scale * this.speed);
        this.checkCalls();
        if (this.T >= this.endTime) this.finish();
      }
      this.draw();
      if (now - this.lastSide > 250 || this.phase === 'done') {
        this.lastSide = now;
        this.updateSide();
      }
      if (this.phase !== 'done') this.raf = requestAnimationFrame((t) => this.frame(t));
      else this.raf = null;
    },

    order() {
      const T = this.T;
      return this.entries
        .map((e) => ({ e, p: R.progressAt(e, T), done: !e.dnf && T >= e.time }))
        .sort((a, b) => {
          if (a.done && b.done) return a.e.time - b.e.time;
          if (a.done !== b.done) return a.done ? -1 : 1;
          return b.p - a.p;
        });
    },

    checkCalls() {
      const ord = this.order();
      const lead = ord[0];
      if (!lead) return;
      const school = XC.state.school.short;
      const userRank = () => {
        const scores = this.liveScores(ord);
        const idx = scores.findIndex((s) => s.id === 'user');
        return idx >= 0 ? idx + 1 : null;
      };
      R.DIST[this.race.squad].checkpoints.forEach((label, i) => {
        const frac = (i + 1) / 4;
        if (lead.p >= frac && !this.calls.has(label)) {
          this.calls.add(label);
          const rank = userRank();
          const team = this.teams[lead.e.teamId];
          this.say(`At ${label}, ${A.fullName(lead.e.runner)} of ${team.short} leads.${rank ? ` ${school} sits ${U.ordinal(rank)} in the team race.` : ''}`);
          XC.audio.tick();
        }
      });
      if (lead.done && !this.calls.has('win')) {
        this.calls.add('win');
        const team = this.teams[lead.e.teamId];
        this.say(`${A.fullName(lead.e.runner)} of ${team.short} wins in ${U.formatTime(lead.e.time)}!`);
        XC.audio.finish();
      }
    },

    liveScores(ord) {
      const counts = {};
      const sums = {};
      let place = 0;
      ord.forEach(({ e }) => {
        if (e.dnf) return;
        const team = this.teams[e.teamId];
        if (!team || team.scored === false) return;
        place += 1;
        counts[e.teamId] = (counts[e.teamId] || 0) + 1;
        if (counts[e.teamId] <= 5) sums[e.teamId] = (sums[e.teamId] || 0) + place;
      });
      return Object.keys(sums)
        .map((id) => ({ id, score: sums[id], n: Math.min(counts[id], 5) }))
        .sort((a, b) => (b.n - a.n) || (a.score - b.score));
    },

    finish() {
      this.phase = 'done';
      const res = this.meet.results[this.race.squad];
      const school = XC.state.school.short;
      let line;
      if (res.userPlace) line = `${res.winner.short} takes the team title with ${res.winner.score}. ${school} finishes ${U.ordinal(res.userPlace)} with ${res.userScore}.`;
      else if (res.winner) line = `${res.winner.short} takes the team title with ${res.winner.score} points.`;
      else line = 'The race is final.';
      setTimeout(() => this.say(line), 600);
      this.skipBtn.hidden = true;
      this.nextBtn.hidden = false;
      this.nextBtn.focus();
      this.clock.textContent = U.formatClock(this.finishers.length ? this.finishers[0].time : 0);
    },

    next() {
      XC.audio.select();
      if (this.isLast) {
        XC.activeSquad = XC.state.programs[0];
        XC.go('results', { meetIndex: XC.live.meetIndex, fresh: true });
      } else {
        XC.go('race', { i: this.params.i + 1 });
      }
    },

    draw() {
      const ctx = this.canvas.getContext('2d');
      if (!this.staticLayer) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(this.staticLayer, 0, 0);
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const k = this.k;
      const T = this.T;
      const user = [];
      let leader = null;
      let leaderP = -1;

      this.entries.forEach((e) => {
        const p = this.phase === 'marks' ? 0 : R.progressAt(e, T);
        const pos = this.pointAt(p);
        const lane = e.lane * 1.1 * k;
        const x = pos.x + pos.nx * lane;
        const y = pos.y + pos.ny * lane;
        const done = !e.dnf && T >= e.time;
        if (e.teamId === 'user') {
          user.push({ e, x, y, p, done });
          return;
        }
        if (p > leaderP) {
          leaderP = p;
          leader = { e, x, y };
        }
        const team = this.teams[e.teamId];
        ctx.globalAlpha = done || (e.dnf && p >= e.dnfAt) ? 0.35 : 0.9;
        ctx.fillStyle = team.primary;
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, 3.4 * k, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
      ctx.globalAlpha = 1;

      // Your runners on top, larger and ringed
      const school = XC.state.school;
      user.forEach(({ e, x, y, p, done }) => {
        if (p > leaderP) {
          leaderP = p;
          leader = { e, x, y };
        }
        ctx.globalAlpha = done ? 0.55 : 1;
        ctx.beginPath();
        ctx.arc(x, y, 7.5 * k, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 6 * k, 0, Math.PI * 2);
        ctx.fillStyle = school.primary;
        ctx.fill();
        ctx.lineWidth = 2 * k;
        ctx.strokeStyle = school.accent;
        ctx.stroke();
      });
      ctx.globalAlpha = 1;

      const label = (item, text, color) => {
        ctx.font = `700 ${12 * k}px 'Saira Condensed', sans-serif`;
        const w = ctx.measureText(text).width + 10 * k;
        const x = U.clamp(item.x - w / 2, 2, this.W - w - 2);
        const y = U.clamp(item.y - 26 * k, 2, this.H - 18 * k);
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, 16 * k);
        ctx.fillStyle = U.readableOn(color);
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + 5 * k, y + 8 * k);
      };
      if (this.phase !== 'marks') {
        const front = user.filter((u) => !u.done).sort((a, b) => b.p - a.p)[0];
        if (front && (!leader || front.e !== leader.e)) label(front, A.shortName(front.e.runner), school.primary);
        if (leader && leaderP < 1) label(leader, `Leader: ${A.shortName(leader.e.runner)}`, '#1A2431');
      }

      if (this.phase !== 'done') this.clock.textContent = U.formatClock(T);
    },

    updateSide() {
      const ord = this.order();
      const scores = this.liveScores(ord);
      U.clear(this.teamList);
      const top = scores.slice(0, 6);
      const userIdx = scores.findIndex((s) => s.id === 'user');
      if (userIdx >= 6) top.push(scores[userIdx]);
      top.forEach((s) => {
        const team = this.teams[s.id];
        this.teamList.appendChild(h('li', { class: s.id === 'user' ? 'is-user' : '' },
          h('span', { class: 'pos' }, String(scores.indexOf(s) + 1)),
          h('span', null, ui.teamChip(team.primary, team.accent), team.short),
          h('span', null, s.n < 5 ? `${s.score}*` : String(s.score))));
      });
      if (!top.length) this.teamList.appendChild(h('li', null, h('span'), h('span', null, 'Scores post after the gun'), h('span')));

      U.clear(this.userList);
      const mine = ord.map((o, i) => Object.assign({ pos: i + 1 }, o)).filter((o) => o.e.teamId === 'user');
      if (!mine.length) {
        this.userList.appendChild(h('li', null, h('span'), h('span', null, 'No runners in this race'), h('span')));
      }
      mine.forEach((o) => {
        const status = o.e.dnf && o.p >= o.e.dnfAt ? 'DNF' : o.done ? U.formatTime(o.e.time) : this.phase === 'marks' ? '' : `${Math.round(o.p * 100)}%`;
        this.userList.appendChild(h('li', null,
          h('span', { class: 'pos' }, o.e.dnf && o.p >= o.e.dnfAt ? '—' : String(o.pos)),
          h('span', null, A.shortName(o.e.runner)),
          h('span', null, status)));
      });
    },

    legend() {
      return [
        { key: 'Space', label: 'Skip', action: () => this.skip() },
        { key: '1 2 4', label: 'Speed', action: () => this.setSpeed(this.speed === 4 ? 1 : this.speed * 2) },
        { key: 'Enter', label: 'Continue', action: () => this.phase === 'done' && this.next() }
      ];
    },

    onKey(e) {
      if (e.key === ' ') {
        this.skip();
        return true;
      }
      if (['1', '2', '4'].includes(e.key)) {
        this.setSpeed(Number(e.key));
        return true;
      }
      if (e.key === 'Enter' && this.phase === 'done' && document.activeElement !== this.nextBtn) {
        this.next();
        return true;
      }
      if (e.key === 'q' || e.key === 'e' || e.key === 'Escape') return true;
      return false;
    },

    cleanup() {
      clearTimeout(this.startTimer);
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = null;
      if (this.resizeObs) this.resizeObs.disconnect();
      XC.audio.hush();
    }
  };
})(window.XC = window.XC || {});
