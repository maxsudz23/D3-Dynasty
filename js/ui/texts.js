/* Texts: a phone-style inbox where runners message the coach between
   meets. Each text offers a few replies; the effects show once sent. */
(function (XC) {
  'use strict';

  const U = XC.util;
  const h = U.h;
  const ui = XC.ui;
  const S = XC.season;
  const A = XC.athletes;
  const T = XC.training;
  const X = XC.texts;
  XC.screens = XC.screens || {};

  const pct = (x) => `${Math.round(x * 100)}%`;

  XC.screens.texts = {
    title: 'Texts',

    render(root) {
      const state = XC.state;
      if (!state) return XC.go('title');
      if (!Array.isArray(state.inbox)) state.inbox = [];
      this.root = root;
      this.draw();
    },

    draw(focusId) {
      const state = XC.state;
      const sq = XC.activeSquad;
      const items = state.inbox.filter((it) => it.squad === sq && X.athleteOf(state, it));
      const unread = X.unread(state, sq).length;
      U.clear(this.root);

      const threads = items.length
        ? h('ol', { class: 'phone__threads' }, items.map((it) => this.thread(it)))
        : h('p', { class: 'phone__empty' }, state.phase === 'season'
          ? 'No texts this week.'
          : 'Runners text between meets during the season.');

      const phone = h('section', { class: 'phone', 'aria-label': `${S.squadLabel(sq)} team texts` },
        h('header', { class: 'phone__bar' },
          h('span', { class: 'phone__title' }, 'Messages'),
          h('span', { class: 'phone__count' }, unread ? `${unread} unread` : 'All caught up')),
        threads);

      const roster = state.squads[sq].roster;
      const moods = roster.filter((a) => Math.abs(X.moraleOf(a)) >= 0.5)
        .sort((a, b) => X.moraleOf(b) - X.moraleOf(a));
      const moodList = moods.length
        ? h('ul', { class: 'mood-list' }, moods.map((a) => h('li', null,
          h('span', null, A.fullName(a)),
          h('span', { class: X.moraleOf(a) > 0 ? 'delta delta--up' : 'delta delta--down' }, `${X.moraleLabel(X.moraleOf(a))} (${U.signed(X.moraleOf(a), 1)})`))))
        : h('p', { class: 'muted' }, 'Everyone is steady.');

      const meet = S.currentMeet(state);
      this.root.appendChild(h('div', { class: 'texts' },
        phone,
        h('div', { class: 'stack texts__side' },
          ui.panel('How replies land', h('ul', { class: 'notes' },
            h('li', null, 'Replies can change a runner’s morale, fatigue, form or time out, and can promise their plan for this block.'),
            h('li', null, 'Morale nudges race-day rating and steadiness. It fades a little every block.'),
            h('li', null, meet ? `Unanswered texts expire when the ${meet.name} runs, and the runner feels ignored.` : 'Unanswered texts expire when the next meet runs.'))),
          ui.panel('Team morale', moodList, { aside: S.squadLabel(sq) }),
          h('div', { class: 'actions' },
            state.phase === 'season' && T.pending(state)
              ? ui.button('Plan workouts', () => XC.go('training'), { variant: 'primary', attrs: { 'data-nav': '' } })
              : null,
            ui.button('Back to hub', () => XC.go('hub'), { variant: 'ghost', attrs: { 'data-nav': '' } })))));

      const el = focusId && document.getElementById(focusId);
      if (el) el.focus({ preventScroll: true });
    },

    thread(it) {
      const state = XC.state;
      const a = X.athleteOf(state, it);
      const tpl = X.template(it.templateId);
      const m = X.moraleOf(a);
      const kids = [
        h('header', { class: 'thread__head' },
          h('span', { class: 'thread__avatar' }, ui.portrait(a, 'sm')),
          h('span', { class: 'thread__who' },
            h('span', { class: 'thread__name' }, A.fullName(a)),
            h('span', { class: 'thread__meta' },
              `${A.yearShort(a.year)} · ${a.ovr} OVR · Fatigue ${Math.round(a.fatigue || 0)} · ${X.moraleLabel(m)}`))),
        h('p', { class: 'bubble bubble--in' }, X.messageOf(it))
      ];
      // What the asked-for workout would mean for them, like the workout screen shows.
      if (it.workout && it.replied === null && !it.expired && state.training && !state.training.done && a.injury <= 0) {
        const p = T.preview(state, it.squad, a, { mode: 'custom', workout: it.workout });
        kids.push(h('p', { class: 'thread__hint' }, p.dnf
          ? `For ${a.first}: dose ${pct(p.x)}, and they likely wouldn’t finish it.`
          : `For ${a.first}: dose ${pct(p.x)} (${p.zone.label.toLowerCase()}).`));
      }
      if (it.replied !== null) {
        kids.push(h('p', { class: 'bubble bubble--out' }, X.replyText(it, it.replied)));
        kids.push(h('p', { class: 'thread__note' }, it.note));
      } else if (it.expired) {
        kids.push(h('p', { class: 'thread__note thread__note--bad' }, 'No reply before the meet. They felt ignored.'));
      } else {
        const reasons = new Set();
        const buttons = tpl.replies.map((r, i) => {
          const why = X.blocker(state, it, i);
          if (why) reasons.add(why);
          return h('button', {
            type: 'button', class: 'reply-chip', id: `reply-${it.id}-${i}`, disabled: !!why, 'data-nav': '',
            on: { click: () => this.reply(it.id, i) }
          }, X.replyText(it, i));
        });
        kids.push(h('div', { class: 'thread__replies', role: 'group', 'aria-label': `Reply to ${A.fullName(a)}` }, buttons));
        reasons.forEach((r) => kids.push(h('p', { class: 'thread__note' }, r)));
      }
      const cls = `thread${it.replied === null && !it.expired ? ' thread--unread' : ''}`;
      return h('li', { class: cls, id: `thread-${it.id}` }, kids);
    },

    reply(itemId, i) {
      const state = XC.state;
      const it = state.inbox.find((x) => x.id === itemId);
      if (!it) return;
      const why = X.blocker(state, it, i);
      if (why) {
        ui.toast(why, 'warn');
        return;
      }
      X.reply(state, itemId, i);
      XC.audio.select();
      XC.save();
      ui.renderTicker();
      // Move on to the next unanswered text, if any.
      const next = X.unread(state, XC.activeSquad)[0];
      this.draw(next ? `reply-${next.id}-0` : null);
      ui.renderLegend(this.legend());
    },

    onSquadChange() {
      this.draw();
    },

    legend() {
      const items = [{ key: 'Enter', label: 'Select focused', keyboardOnly: true, action: () => document.activeElement && document.activeElement.click() }];
      if (XC.state && XC.state.programs.length > 1) items.push({ key: 'Q E', label: 'Squad', keyboardOnly: true, action: () => XC.setSquad(XC.activeSquad === 'M' ? 'W' : 'M') });
      items.push({ key: 'Esc', label: 'Hub', action: () => XC.go('hub') });
      return items;
    },

    back() {
      XC.go('hub');
    }
  };
})(window.XC = window.XC || {});
