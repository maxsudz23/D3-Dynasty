/* Shared helpers: randomness, formatting, color math, and a tiny DOM builder. */
(function (XC) {
  'use strict';

  const U = {};

  /* ---------- Randomness ---------- */

  // Small seeded PRNG so opponent rosters stay consistent within a season.
  U.mulberry32 = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  U.hash = function (str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  U.randInt = (min, max, rng = Math.random) => Math.floor(rng() * (max - min + 1)) + min;
  U.randFloat = (min, max, rng = Math.random) => min + rng() * (max - min);
  U.pick = (arr, rng = Math.random) => arr[Math.floor(rng() * arr.length)];
  U.chance = (p, rng = Math.random) => rng() < p;

  U.shuffle = function (arr, rng = Math.random) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  U.gauss = function (mean = 0, sd = 1, rng = Math.random) {
    let u = 0;
    let v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  // weights: object { key: weight }
  U.weightedKey = function (weights, rng = Math.random) {
    const entries = Object.entries(weights);
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let roll = rng() * total;
    for (const [key, w] of entries) {
      roll -= w;
      if (roll <= 0) return key;
    }
    return entries[entries.length - 1][0];
  };

  U.uid = () => Math.random().toString(36).slice(2, 10);

  /* ---------- Numbers & formatting ---------- */

  U.clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  U.round = (v, digits = 0) => {
    const m = 10 ** digits;
    return Math.round(v * m) / m;
  };
  U.avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  U.formatTime = function (secs) {
    if (secs === null || secs === undefined || !isFinite(secs)) return 'DNF';
    const m = Math.floor(secs / 60);
    const s = secs - m * 60;
    return `${m}:${s.toFixed(1).padStart(4, '0')}`;
  };

  U.formatClock = function (secs) {
    const safe = Math.max(0, secs);
    const m = Math.floor(safe / 60);
    const s = Math.floor(safe % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  U.ordinal = function (n) {
    if (n === null || n === undefined) return '—';
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
    return n + ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
  };

  U.signed = (n, digits = 1) => {
    const r = U.round(n, digits);
    return (r > 0 ? '+' : '') + r;
  };

  // Collegiate-style monogram: "Williams" -> W, "WashU" -> WU, "UW–La Crosse" -> UWL.
  U.initials = function (name) {
    const clean = String(name || '').replace(/[’']/g, '').replace(/\(.*?\)/g, ' ').replace(/[^A-Za-z&\s-]/g, ' ');
    const words = clean.split(/[\s-]+/).filter((w) => w && w !== '&' && !/^(of|the|and|in|at)$/i.test(w));
    if (!words.length) return 'XC';
    const first = words[0];
    if (words.length === 1) {
      if (first === first.toUpperCase() && first.length <= 4) return first;
      const caps = first.match(/[A-Z]/g) || [];
      return caps.length >= 2 ? caps.slice(0, 3).join('') : first[0].toUpperCase();
    }
    if (first === first.toUpperCase() && first.length <= 3) return (first + words[1][0]).toUpperCase().slice(0, 4);
    return words.slice(0, 3).map((w) => w[0].toUpperCase()).join('');
  };

  U.haversineKm = function (lat1, lon1, lat2, lon2) {
    const R = 6371;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  };

  /* ---------- Color ---------- */

  U.hexToRgb = function (hex) {
    let h = String(hex).replace('#', '').trim();
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    if (Number.isNaN(n) || h.length !== 6) return { r: 0, g: 0, b: 0 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  };

  U.rgbToHex = ({ r, g, b }) =>
    '#' + [r, g, b].map((v) => Math.round(U.clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('').toUpperCase();

  U.luminance = function (hex) {
    const { r, g, b } = U.hexToRgb(hex);
    const lin = (c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };

  U.contrast = function (a, b) {
    const la = U.luminance(a);
    const lb = U.luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };

  // Dark ink or white, whichever reads better on the given background.
  U.readableOn = function (hex) {
    return U.contrast(hex, '#FFFFFF') >= U.contrast(hex, '#17202B') ? '#FFFFFF' : '#17202B';
  };

  U.mixHex = function (a, b, t) {
    const x = U.hexToRgb(a);
    const y = U.hexToRgb(b);
    return U.rgbToHex({ r: x.r + (y.r - x.r) * t, g: x.g + (y.g - x.g) * t, b: x.b + (y.b - x.b) * t });
  };

  /* ---------- DOM ---------- */

  function append(el, children) {
    children.forEach((child) => {
      if (child === null || child === undefined || child === false) return;
      if (Array.isArray(child)) append(el, child);
      else if (child instanceof Node) el.appendChild(child);
      else el.appendChild(document.createTextNode(String(child)));
    });
  }

  function applyAttrs(el, attrs, isSvg) {
    if (!attrs) return;
    Object.entries(attrs).forEach(([key, value]) => {
      if (value === null || value === undefined || value === false) return;
      if (key === 'class') {
        if (isSvg) el.setAttribute('class', value);
        else el.className = value;
      } else if (key === 'text') {
        el.textContent = value;
      } else if (key === 'on') {
        Object.entries(value).forEach(([evt, fn]) => el.addEventListener(evt, fn));
      } else if (key === 'dataset') {
        Object.entries(value).forEach(([k, v]) => { el.dataset[k] = v; });
      } else if (value === true) {
        el.setAttribute(key, '');
      } else {
        el.setAttribute(key, value);
      }
    });
  }

  U.h = function (tag, attrs, ...children) {
    const el = document.createElement(tag);
    applyAttrs(el, attrs, false);
    append(el, children);
    return el;
  };

  U.svg = function (tag, attrs, ...children) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    applyAttrs(el, attrs, true);
    append(el, children);
    return el;
  };

  U.clear = function (el) {
    while (el.firstChild) el.removeChild(el.firstChild);
    return el;
  };

  U.prefersReducedMotion = () =>
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  XC.util = U;
})(window.XC = window.XC || {});
