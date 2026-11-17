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

  // Moving to a different screen cross-fades it with a view transition. The
  // swap then runs a frame later, so XC.go skips the animation for redraws of
  // the same screen, for redirects from inside a screen's render, with reduced
  // motion, and where the API is missing. Keys wait while a swap is pending.
  let goSeq = 0;
  let rendering = false;
  let navigating = false;

  XC.go = function (name, params = {}) {
    const screen = XC.screens[name];
    if (!screen) return;
    const seq = ++goSeq;
    const animate = currentName && name !== currentName && !rendering &&
      typeof document.startViewTransition === 'function' && !U.prefersReducedMotion();
    if (!animate) {
      navigating = false;
      show(name, screen, params);
      return;
    }
    navigating = true;
    const transition = document.startViewTransition(() => {
      // A later XC.go replaced this one before it ran.
      if (seq !== goSeq) return;
      navigating = false;
      try {
        show(name, screen, params);
      } catch (err) {
        // Report it like an ordinary error instead of a rejected promise.
        setTimeout(() => { throw err; });
      }
    });
    // A skipped transition rejects these; the swap itself still happened.
    transition.ready.catch(() => {});
    transition.finished.catch(() => {});
  };

  function show(name, screen, params) {
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
    rendering = true;
    try {
      screen.render(root, params);
    } finally {
      rendering = false;
    }
    // render() redirected to another screen, which has drawn itself.
    if (current !== screen) return;
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
    // A screen can hold the squad in place, e.g. while the wheel is spinning.
    if (current && typeof current.canChangeSquad === 'function' && !current.canChangeSquad()) return;
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
    if (navigating) return;
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
    const dark = document.getElementById('toggle-dark');
    const on = XC.ui.isDark(settings.theme);
    dark.setAttribute('aria-pressed', String(on));
    dark.textContent = on ? 'Dark mode on' : 'Dark mode off';
  }

  function applyTheme() {
    XC.ui.applyTheme(settings.theme);
    syncToggles();
  }

  function setTheme(theme) {
    if (!XC.storage.THEMES.includes(theme)) return;
    settings.theme = theme;
    XC.storage.saveSettings(settings);
    applyTheme();
    XC.audio.select();
  }

  // The header chip flips what's on screen. Flipping back to what the device
  // uses returns to following the device instead of pinning it.
  function toggleDark() {
    const target = XC.ui.isDark(settings.theme) ? 'light' : 'dark';
    const device = XC.ui.systemDark() ? 'dark' : 'light';
    setTheme(target === device ? 'system' : target);
  }

  // Follow the device's scheme when it changes, and a theme picked in another tab.
  function watchTheme() {
    const changed = () => {
      applyTheme();
      if (XC.currentScreen() === 'settings') XC.refresh();
    };
    if (XC.ui.darkQuery && typeof XC.ui.darkQuery.addEventListener === 'function') {
      XC.ui.darkQuery.addEventListener('change', () => { if (settings.theme === 'system') changed(); });
    }
    window.addEventListener('storage', (e) => {
      if (e.key !== XC.storage.SETTINGS_KEY) return;
      const theme = XC.storage.loadSettings().theme;
      if (theme === settings.theme) return;
      settings.theme = theme;
      changed();
    });
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
    toggleAnnouncer,
    toggleDark,
    setTheme
  };

  /* ---------- Boot ---------- */

  function boot() {
    XC.audio.setMuted(settings.muted);
    XC.audio.setAnnouncer(settings.announcer);
    applyTheme();
    watchTheme();
    document.getElementById('toggle-sound').addEventListener('click', toggleSound);
    document.getElementById('toggle-announcer').addEventListener('click', toggleAnnouncer);
    document.getElementById('toggle-dark').addEventListener('click', toggleDark);
    document.getElementById('squad-prev').addEventListener('click', () => cycleSquad(-1));
    document.getElementById('squad-next').addEventListener('click', () => cycleSquad(1));
    document.addEventListener('keydown', onKeyDown);

    const saved = XC.storage.loadGame();
    if (saved) XC.ui.setTheme(saved.school.primary, saved.school.accent, saved.school);
    else XC.ui.setTheme();
    XC.go('title');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.XC = window.XC || {});
