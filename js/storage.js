/* localStorage wrapper. Every call is guarded: private windows and blocked
   site data make storage throw, and the game must keep running without it. */
(function (XC) {
  'use strict';

  const SAVE_KEY = 'd3dynasty.save.v1';
  const SETTINGS_KEY = 'd3dynasty.settings.v1';
  // Saves from before the rename still load.
  const LEGACY_SAVE_KEY = 'harriers27.dynasty.v1';
  const LEGACY_SETTINGS_KEY = 'harriers27.settings.v1';

  const S = {};

  S.available = (function () {
    try {
      const probe = '__harriers_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return true;
    } catch (err) {
      return false;
    }
  })();

  function read(key) {
    if (!S.available) return null;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function write(key, value) {
    if (!S.available) return false;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  }

  S.loadGame = () => {
    const data = read(SAVE_KEY) || read(LEGACY_SAVE_KEY);
    return data && data.version === 1 ? data : null;
  };
  S.saveGame = (state) => write(SAVE_KEY, state);
  S.clearGame = () => {
    if (!S.available) return;
    try {
      window.localStorage.removeItem(SAVE_KEY);
      window.localStorage.removeItem(LEGACY_SAVE_KEY);
    } catch (err) {
      /* nothing to clear */
    }
  };

  S.SETTINGS_KEY = SETTINGS_KEY;
  S.THEMES = ['system', 'light', 'dark'];
  // theme: 'system' follows the device; 'light' or 'dark' pins it. Settings
  // from before the system option kept a dark flag: on stays dark, off
  // follows the system.
  S.loadSettings = () => {
    const s = Object.assign({ muted: false, announcer: false }, read(SETTINGS_KEY) || read(LEGACY_SETTINGS_KEY) || {});
    if (!S.THEMES.includes(s.theme)) s.theme = s.dark ? 'dark' : 'system';
    delete s.dark;
    return s;
  };
  S.saveSettings = (settings) => write(SETTINGS_KEY, settings);

  XC.storage = S;
})(window.XC = window.XC || {});
