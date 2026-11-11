/* Router, global keyboard controls and boot. */
(function (XC) {
  'use strict';

  const U = XC.util;
  XC.screens = XC.screens || {};
  XC.state = null;
  XC.live = {};
  XC.activeSquad = 'M';

  let current = null;
  let currentName = '';
  let currentParams = {};
  let saveWarned = false;

  XC.save = function () {
    if (!XC.state) return;
    const ok = XC.storage.saveGame(XC.state);
    if (!ok && !saveWarned) {
      saveWarned = true;
      XC.ui.toast('Saving is off in this browser, so this dynasty lasts until you close the tab.', 'warn');
    }
  };

  XC.go = function (name, params = {}) {
    const screen = XC.screens[name];
    if (!screen) return;
    if (current && typeof current.cleanup === 'function') current.cleanup();
    current = screen;
    currentName = name;
    currentParams = params;
    const root = document.getElementById('screen');
    U.clear(root);
    document.body.classList.toggle('is-title', name === 'title');
    const title = typeof screen.title === 'function' ? screen.title(params) : screen.title;
    XC.ui.setTitle(title || 'D3 Dynasty');
    document.title = name === 'title' ? 'D3 Dynasty | Division III Cross Country Coaching' : `${title} | D3 Dynasty`;
    XC.ui.renderContext(screen);
    XC.ui.renderStatus();
    XC.ui.renderTicker();
    screen.render(root, params);
    XC.ui.renderLegend(screen.legend ? screen.legend(params) : []);
    window.scrollTo(0, 0);
    const focusTarget = root.querySelector('[data-autofocus]');
    if (focusTarget) focusTarget.focus({ preventScroll: true });
    else root.focus({ preventScroll: true });
  };

  XC.refresh = () => XC.go(currentName, currentParams);
  XC.currentScreen = () => currentName;

  XC.setSquad = function (sq) {
    if (!XC.state || !XC.state.programs.includes(sq) || XC.activeSquad === sq) return;
    XC.activeSquad = sq;
    XC.audio.nav();
    if (current && typeof current.onSquadChange === 'function') {
      current.onSquadChange();
      XC.ui.renderContext(current);
    } else {
      XC.refresh();
    }
  };

  function cycleSquad(dir) {
    if (!XC.state || XC.state.programs.length < 2 || !current || current.squadTabs === false) return false;
    const list = XC.state.programs;
    const idx = list.indexOf(XC.activeSquad);
    XC.setSquad(list[(idx + dir + list.length) % list.length]);
    return true;
  }

  // Arrow keys move focus between buttons on screens without their own grid.
  function moveFocus(dir) {
    const root = document.getElementById('screen');
    const items = Array.from(root.querySelectorAll('[data-nav]')).filter((el) => !el.disabled && el.offsetParent !== null);
    if (!items.length) return false;
    const idx = items.indexOf(document.activeElement);
    const next = idx === -1 ? items[0] : items[(idx + dir + items.length) % items.length];
    next.focus();
    XC.audio.nav();
    return true;
  }

  function onKeyDown(e) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    if (document.querySelector('dialog[open]')) return;
    const tag = e.target && e.target.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    if (typing) {
      if (e.key === 'Escape') e.target.blur();
      return;
    }
    if (current && typeof current.onKey === 'function' && current.onKey(e) === true) {
      e.preventDefault();
      return;
    }
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === 'q' && cycleSquad(-1)) {
      e.preventDefault();
    } else if (key === 'e' && cycleSquad(1)) {
      e.preventDefault();
    } else if (key === 'Escape' && current && typeof current.back === 'function') {
      e.preventDefault();
      XC.audio.back();
      current.back(currentParams);
    } else if (key === 'm') {
      toggleSound();
    } else if (key === 'ArrowDown' || key === 'ArrowRight') {
      if (moveFocus(1)) e.preventDefault();
    } else if (key === 'ArrowUp' || key === 'ArrowLeft') {
      if (moveFocus(-1)) e.preventDefault();
    }
  }

  /* ---------- Settings toggles ---------- */

  const settings = XC.storage.loadSettings();

  function syncToggles() {
    const sound = document.getElementById('toggle-sound');
    const announcer = document.getElementById('toggle-announcer');
    sound.setAttribute('aria-pressed', String(!settings.muted));
    sound.textContent = settings.muted ? 'Sound off' : 'Sound on';
    announcer.hidden = !XC.audio.speechSupported;
    announcer.setAttribute('aria-pressed', String(settings.announcer));
    announcer.textContent = settings.announcer ? 'Announcer on' : 'Announcer off';
  }

  function toggleSound() {
    settings.muted = !settings.muted;
    XC.audio.setMuted(settings.muted);
    XC.storage.saveSettings(settings);
    syncToggles();
    if (!settings.muted) XC.audio.select();
  }

  function toggleAnnouncer() {
    settings.announcer = !settings.announcer;
    XC.audio.setAnnouncer(settings.announcer);
    XC.storage.saveSettings(settings);
    syncToggles();
    if (settings.announcer) XC.audio.say('Announcer on. Welcome to the race.', { interrupt: true });
  }

  XC.settings = {
    get: () => Object.assign({}, settings),
    toggleSound,
    toggleAnnouncer
  };

  /* ---------- Boot ---------- */

  function boot() {
    XC.audio.setMuted(settings.muted);
    XC.audio.setAnnouncer(settings.announcer);
    syncToggles();
    document.getElementById('toggle-sound').addEventListener('click', toggleSound);
    document.getElementById('toggle-announcer').addEventListener('click', toggleAnnouncer);
    document.getElementById('squad-prev').addEventListener('click', () => cycleSquad(-1));
    document.getElementById('squad-next').addEventListener('click', () => cycleSquad(1));
    document.addEventListener('keydown', onKeyDown);

    const saved = XC.storage.loadGame();
    if (saved) XC.ui.setTheme(saved.school.primary, saved.school.accent);
    else XC.ui.setTheme();
    XC.go('title');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.XC = window.XC || {});
