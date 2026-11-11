/* Recruiting wheel: a canvas prize wheel that lands on a prospect tier,
   then reveals a recruit card you can sign or pass on. */
(function (XC) {
  'use strict';

  const U = XC.util;
  const h = U.h;
  const ui = XC.ui;
  const S = XC.season;
  const A = XC.athletes;
  XC.screens = XC.screens || {};

  const SEG = S.WHEEL.length;
  const ARC = (Math.PI * 2) / SEG;
  const POINTER = -Math.PI / 2;
  const loading = {};

  let angle = 0;
  let spinning = false;
  let raf = null;

  function segColors() {
    const school = XC.state.school;
    return {
      prospect: school.primary,
      walkon: '#2B3746',
      transfer: '#56677D',
      gem: '#1D7A45',
      blue: '#2F6FB5'
    };
  }

  function easeOut(t) {
    return 1 - (1 - t) ** 4;
  }

  XC.screens.wheel = {
    title: 'Recruiting wheel',
    render(root) {
      const state = XC.state;
      if (!state) return XC.go('title');
      if (state.phase !== 'preseason') return XC.go('hub');
      this.root = root;
      this.draw();
    },

    rec() {
      return XC.state.recruiting[XC.activeSquad];
    },

    draw() {
      const root = this.root;
      const state = XC.state;
      const sq = XC.activeSquad;
      const rec = this.rec();
      U.clear(root);
      this.ensurePeople(sq);

      this.canvas = h('canvas', { class: 'wheel__canvas', width: '880', height: '880', role: 'img', 'aria-label': 'Recruiting wheel' });
      this.countEl = h('p', { class: 'wheel__count', role: 'status' });
      this.spinBtn = ui.button('Spin', () => this.spin(), { variant: 'primary', size: 'big', key: 'Space', attrs: { 'data-autofocus': '' } });
      this.allBtn = ui.button('Spin all', () => this.spinAll(), { variant: 'ghost', key: 'A' });
      const win = S.repWindow(state.rep);

      const wheel = h('section', { class: 'wheel', 'aria-label': 'Wheel' },
        h('div', { class: 'wheel__canvas-wrap' }, this.canvas),
        this.countEl,
        h('div', { class: 'actions' }, this.spinBtn, this.allBtn),
        h('p', { class: 'wheel__window' }, `Reputation ${Math.round(state.rep)} puts recruits between ${win.min} and ${win.max} overall.`));

      this.board = h('section', { class: 'board', 'aria-label': 'Prospect board' });
      root.appendChild(h('div', { class: 'wheel-screen' }, wheel, this.board));
      this.paint();
      this.updateControls();
      this.drawBoard();
    },

    async ensurePeople(sq) {
      const rec = XC.state.recruiting[sq];
      if (rec.people || loading[sq]) return;
      loading[sq] = true;
      const result = await XC.api.fetchPeople(S.SPINS, sq);
      loading[sq] = false;
      if (!XC.state || !XC.state.recruiting || XC.state.recruiting[sq] !== rec) return;
      rec.people = result.people;
      rec.live = result.live;
      XC.save();
      if (!result.live) ui.toast('Recruit photos are unavailable right now, so this class uses scouting sketches and local names.', 'warn');
      if (XC.currentScreen() === 'wheel' && XC.activeSquad === sq) this.updateControls();
    },

    updateControls() {
      const rec = this.rec();
      const left = S.SPINS - rec.spins;
      const ready = Boolean(rec.people);
      this.spinBtn.disabled = spinning || left <= 0 || !ready;
      this.allBtn.disabled = spinning || left <= 0 || !ready;
      this.countEl.textContent = !ready
        ? 'Scouting prospects…'
        : left > 0
          ? `Spin ${rec.spins + 1} of ${S.SPINS}`
          : `All ${S.SPINS} spins used`;
    },

    paint() {
      const canvas = this.canvas;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const size = canvas.width;
      const c = size / 2;
      const r = size / 2 - 40;
      const colors = segColors();
      ctx.clearRect(0, 0, size, size);

      // Outer rim
      ctx.beginPath();
      ctx.arc(c, c, r + 26, 0, Math.PI * 2);
      ctx.fillStyle = '#1A2431';
      ctx.fill();

      S.WHEEL.forEach((seg, i) => {
        const start = angle + i * ARC;
        const fill = colors[seg.key];
        ctx.beginPath();
        ctx.moveTo(c, c);
        ctx.arc(c, c, r, start, start + ARC);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Labels on the left half are flipped so they never read upside down.
        const mid = start + ARC / 2;
        const flip = Math.cos(mid) < 0;
        ctx.save();
        ctx.translate(c, c);
        ctx.rotate(flip ? mid + Math.PI : mid);
        ctx.textAlign = flip ? 'left' : 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = U.readableOn(fill);
        ctx.font = "italic 800 38px 'Saira Condensed', sans-serif";
        ctx.fillText(seg.label, flip ? -(r - 34) : r - 34, 0);
        ctx.restore();

        // Pegs
        ctx.beginPath();
        ctx.arc(c + Math.cos(start) * (r + 13), c + Math.sin(start) * (r + 13), 7, 0, Math.PI * 2);
        ctx.fillStyle = '#F2F5F8';
        ctx.fill();
      });

      // Hub
      const school = XC.state.school;
      ctx.beginPath();
      ctx.arc(c, c, 92, 0, Math.PI * 2);
      ctx.fillStyle = school.accent;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(c, c, 80, 0, Math.PI * 2);
      ctx.fillStyle = school.primary;
      ctx.fill();
      ctx.fillStyle = U.readableOn(school.primary);
      const mono = U.initials(school.short);
      ctx.font = `800 ${[0, 84, 70, 54, 42][Math.min(mono.length, 4)]}px 'Saira Condensed', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(mono, c, c + 4);

      // Pointer
      ctx.beginPath();
      ctx.moveTo(c - 34, 4);
      ctx.lineTo(c + 34, 4);
      ctx.lineTo(c, 92);
      ctx.closePath();
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--team-hi').trim() || '#E0A526';
      ctx.strokeStyle = '#1A2431';
      ctx.lineWidth = 6;
      ctx.fill();
      ctx.stroke();
    },

    segmentAtPointer() {
      const rel = (((POINTER - angle) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      return Math.floor(rel / ARC) % SEG;
    },

    spin(quick = false) {
      const rec = this.rec();
      if (spinning || rec.spins >= S.SPINS || !rec.people) return Promise.resolve();
      spinning = true;
      this.updateControls();
      const target = U.randInt(0, SEG - 1);
      const jitter = U.randFloat(0.15, 0.85);
      // Final angle where the pointer sits inside the target segment.
      const desired = POINTER - (target + jitter) * ARC;
      const current = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      let delta = (((desired - current) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const turns = quick ? 2 : 5;
      delta += turns * Math.PI * 2;
      const startAngle = angle;
      const reduced = U.prefersReducedMotion();
      const duration = reduced ? 350 : quick ? 1500 : 3800;
      const t0 = performance.now();
      let lastSeg = this.segmentAtPointer();
      XC.audio.select();

      return new Promise((resolve) => {
        const step = (now) => {
          const t = Math.min(1, (now - t0) / duration);
          angle = startAngle + delta * easeOut(t);
          const seg = this.segmentAtPointer();
          if (seg !== lastSeg) {
            lastSeg = seg;
            XC.audio.tick();
          }
          this.paint();
          if (t < 1) {
            raf = requestAnimationFrame(step);
            return;
          }
          raf = null;
          spinning = false;
          const landed = this.segmentAtPointer();
          const prospect = S.makeProspect(XC.state, XC.activeSquad, landed);
          XC.save();
          XC.audio.reveal();
          this.drawBoard(prospect.id);
          this.updateControls();
          resolve();
        };
        raf = requestAnimationFrame(step);
      });
    },

    async spinAll() {
      const sq = XC.activeSquad;
      while (this.rec().spins < S.SPINS && XC.currentScreen() === 'wheel' && XC.activeSquad === sq) {
        await this.spin(true);
      }
    },

    drawBoard(newId = null) {
      const state = XC.state;
      const sq = XC.activeSquad;
      const rec = this.rec();
      const board = this.board;
      U.clear(board);
      const open = S.openSpots(state, sq);
      const allDone = state.programs.every((p) => state.recruiting[p].spins >= S.SPINS);
      const pendingSquad = state.programs.find((p) => state.recruiting[p].spins < S.SPINS);

      board.appendChild(h('div', { class: 'board__head' },
        h('div', null,
          h('h2', { class: 'section-title' }, `${S.squadLabel(sq)} prospect board`),
          h('p', { class: 'muted' }, `${open} open roster spot${open === 1 ? '' : 's'} of ${S.ROSTER_CAP}. Signed: ${S.signedCount(state, sq)}`)),
        h('div', { class: 'actions' },
          ui.button('Manage roster', () => XC.go('roster', { mode: 'cut', from: 'wheel' }), { variant: 'ghost', size: 'small' }),
          ui.button('Finish recruiting', () => this.finish(), { variant: 'primary', size: 'small', disabled: !allDone }))));

      if (!allDone && state.programs.length > 1 && pendingSquad !== sq && rec.spins >= S.SPINS) {
        board.appendChild(h('p', { class: 'notice' }, `Now spin the ${S.squadLabel(pendingSquad).toLowerCase()} wheel. Press ${pendingSquad === 'W' ? 'E' : 'Q'} or use the squad tabs.`));
      }

      if (!rec.prospects.length) {
        board.appendChild(h('p', { class: 'board__empty' },
          'Seven prospects are waiting on your call. Spin the wheel to see who lands. Most are incoming freshmen; transfers arrive ready to race.'));
        return;
      }

      const list = h('ul', { class: 'board__list' });
      rec.prospects.slice().reverse().forEach((p) => list.appendChild(this.prospectCard(p, open, p.id === newId)));
      board.appendChild(list);
    },

    prospectCard(p, open, isNew) {
      const sq = XC.activeSquad;
      const seg = S.WHEEL.find((s) => s.key === p.tier);
      const yearText = p.transfer ? `Transfer, ${A.yearLong(p.year).toLowerCase()}` : 'Incoming freshman';
      const set = (status) => {
        if (status === 'signed' && S.openSpots(XC.state, sq) <= 0) {
          ui.toast('Your roster is full. Cut a runner to make room.', 'warn');
          XC.audio.error();
          return;
        }
        p.status = status;
        XC.save();
        if (status === 'signed') XC.audio.fanfare();
        else XC.audio.back();
        this.drawBoard();
      };

      let actions;
      if (p.status === 'signed') {
        actions = [h('span', { class: 'badge badge--hi' }, 'Signed'), ui.button('Undo', () => set('pending'), { variant: 'ghost', size: 'small' })];
      } else if (p.status === 'passed') {
        actions = [h('span', { class: 'badge' }, 'Passed'), ui.button('Reconsider', () => set('pending'), { variant: 'ghost', size: 'small' })];
      } else {
        actions = [
          ui.button('Sign', () => set('signed'), { variant: 'primary', size: 'small', disabled: open <= 0 }),
          ui.button('Pass', () => set('passed'), { variant: 'ghost', size: 'small' }),
          open <= 0 ? h('span', { class: 'prospect__meta' }, 'Roster full') : null
        ];
      }

      const cls = ['prospect', 'on-dark', isNew ? 'prospect--new' : '', p.status === 'signed' ? 'prospect--signed' : '', p.status === 'passed' ? 'prospect--passed' : ''];
      return h('li', { class: cls.filter(Boolean).join(' ') },
        ui.portrait(p),
        h('div', null,
          h('p', { class: 'prospect__name' }, A.fullName(p)),
          h('p', { class: 'prospect__meta' },
            h('span', { class: 'tier-tag' }, seg ? seg.label : 'Prospect'),
            h('span', null, yearText)),
          h('p', { class: 'prospect__meta' }, h('span', null, p.hometown), h('span', null, A.ARCHETYPE_LABEL[p.archetype]))),
        h('div', { class: 'prospect__ovr' }, h('strong', null, String(p.ovr)), h('span', null, 'OVR')),
        h('ul', { class: 'prospect__stats', 'aria-label': 'Ratings' },
          A.STATS.map((k) => h('li', null, h('abbr', { title: A.NAMES[k] }, A.LABELS[k]), h('b', null, String(p.stats[k])))),
          h('li', null, h('abbr', { title: 'Potential' }, 'POT'), h('b', null, p.pot))),
        h('div', { class: 'prospect__actions' }, actions));
    },

    finish() {
      const state = XC.state;
      if (!state.programs.every((p) => state.recruiting[p].spins >= S.SPINS)) return;
      const signed = state.programs.reduce((n, p) => n + S.signedCount(state, p), 0);
      S.finishRecruiting(state);
      XC.save();
      XC.audio.fanfare();
      ui.toast(signed ? `${signed} recruit${signed === 1 ? '' : 's'} signed. The season opens soon.` : 'No signings this year. The season opens soon.');
      XC.go('hub');
    },

    onSquadChange() {
      if (spinning) return;
      this.draw();
    },

    legend() {
      const items = [
        { key: 'Space', label: 'Spin', action: () => this.spin() },
        { key: 'A', label: 'Spin all', action: () => this.spinAll() }
      ];
      if (XC.state && XC.state.programs.length > 1) items.push({ key: 'Q E', label: 'Squad', keyboardOnly: true, action: () => XC.setSquad(XC.activeSquad === 'M' ? 'W' : 'M') });
      items.push({ key: 'Esc', label: 'Hub', action: () => XC.go('hub') });
      return items;
    },

    onKey(e) {
      const onButton = e.target instanceof HTMLButtonElement;
      if (spinning && (e.key === 'q' || e.key === 'e' || e.key === 'Escape')) return true;
      if (e.key === ' ' && !onButton) {
        this.spin();
        return true;
      }
      if (e.key.toLowerCase() === 'a') {
        this.spinAll();
        return true;
      }
      return false;
    },

    back() {
      XC.go('hub');
    },

    cleanup() {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      spinning = false;
    }
  };
})(window.XC = window.XC || {});
