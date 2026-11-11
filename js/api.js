/* Data APIs with graceful fallbacks.
   - randomuser.me: recruit names, hometowns and portraits.
   - Open-Meteo: live conditions at the meet host's campus.
   Every call has a timeout and returns usable data even when offline. */
(function (XC) {
  'use strict';

  const U = XC.util;
  const API = {};

  async function fetchJson(url, timeoutMs = 7000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  /* ---------- People (randomuser.me) ---------- */

  API.localPerson = function (squad, rng = Math.random) {
    const pool = squad === 'W' ? XC.names.female : XC.names.male;
    return {
      first: U.pick(pool, rng),
      last: U.pick(XC.names.last, rng),
      hometown: U.pick(XC.names.hometowns, rng),
      photo: null
    };
  };

  function cleanName(str) {
    const s = String(str || '').trim();
    return s ? s[0].toUpperCase() + s.slice(1) : '';
  }

  /* randomuser.me can't filter by age, and its photos are picked separately
     from the birth date it returns. Its portraits come from a fixed pool of
     100 per gender, so these are the ones that pass for college runners.
     Duplicate shots of the same person are left out. */
  const YOUNG_PORTRAITS = {
    men: [1, 4, 6, 9, 10, 12, 14, 16, 18, 27, 28, 35, 38, 39, 42, 43, 44, 45, 46, 47,
      51, 56, 57, 60, 62, 64, 65, 73, 77, 81, 84, 85, 86, 89, 90, 92, 95, 96, 97],
    women: [1, 2, 5, 6, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22, 25, 26, 27, 28,
      29, 30, 31, 32, 33, 34, 35, 36, 38, 40, 42, 43, 44, 45, 46, 48, 49, 50, 51, 52,
      54, 55, 56, 57, 59, 60, 62, 63, 64, 66, 67, 68, 70, 71, 72, 73, 74, 75, 76, 77,
      78, 79, 80, 81, 82, 84, 85, 86, 87, 88, 90, 91, 92, 93, 94, 95, 96, 97, 98]
  };
  const PORTRAIT_RE = /^(https:\/\/randomuser\.me\/api\/portraits\/)(men|women)\/(\d+)\.jpg$/;

  // Keeps the API's photo when it's on the list, otherwise swaps in an unused
  // one from the list, so a batch never shows the same face twice.
  function youngPortraits(urls) {
    const used = new Set();
    const parsed = urls.map((url) => {
      const m = PORTRAIT_RE.exec(url || '');
      if (!m) return null;
      const n = Number(m[3]);
      const keep = YOUNG_PORTRAITS[m[2]].includes(n) && !used.has(`${m[2]}/${n}`);
      if (keep) used.add(`${m[2]}/${n}`);
      return { base: m[1], group: m[2], n, keep };
    });
    return parsed.map((p, i) => {
      if (!p) return urls[i] || null;
      if (!p.keep) {
        const open = YOUNG_PORTRAITS[p.group].filter((n) => !used.has(`${p.group}/${n}`));
        p.n = open.length ? U.pick(open) : U.pick(YOUNG_PORTRAITS[p.group]);
        used.add(`${p.group}/${p.n}`);
      }
      return `${p.base}${p.group}/${p.n}.jpg`;
    });
  }

  API.fetchPeople = async function (count, squad) {
    const gender = squad === 'W' ? 'female' : 'male';
    const url = `https://randomuser.me/api/?results=${count}&nat=us&gender=${gender}&inc=name,location,picture&noinfo`;
    try {
      const data = await fetchJson(url);
      if (!data || !Array.isArray(data.results) || data.results.length === 0) throw new Error('No people returned');
      const photos = youngPortraits(data.results.map((r) => r.picture && r.picture.large));
      const people = data.results.map((r, i) => {
        const state = XC.names.stateAbbr[r.location && r.location.state] || (r.location && r.location.state) || '';
        const city = r.location && r.location.city ? r.location.city : U.pick(XC.names.hometowns).split(',')[0];
        return {
          first: cleanName(r.name && r.name.first) || API.localPerson(squad).first,
          last: cleanName(r.name && r.name.last) || U.pick(XC.names.last),
          hometown: state ? `${city}, ${state}` : city,
          photo: photos[i]
        };
      });
      while (people.length < count) people.push(API.localPerson(squad));
      return { people, live: true };
    } catch (err) {
      const people = Array.from({ length: count }, () => API.localPerson(squad));
      return { people, live: false };
    }
  };

  /* ---------- Weather (Open-Meteo) ---------- */

  const WMO = [
    [[0], 'Clear skies'],
    [[1, 2], 'Partly cloudy'],
    [[3], 'Overcast'],
    [[45, 48], 'Fog'],
    [[51, 53, 55, 56, 57], 'Drizzle'],
    [[61, 63, 65, 66, 67], 'Rain'],
    [[71, 73, 75, 77], 'Snow'],
    [[80, 81, 82], 'Rain showers'],
    [[85, 86], 'Snow showers'],
    [[95, 96, 99], 'Thunderstorms']
  ];
  const WET_CODES = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99];

  API.weatherLabel = function (code) {
    const hit = WMO.find(([codes]) => codes.includes(code));
    return hit ? hit[1] : 'Mixed conditions';
  };

  function finishWeather(w) {
    w.label = API.weatherLabel(w.code);
    w.soft = w.precipMm >= 0.4 || WET_CODES.includes(w.code);
    w.ground = w.precipMm >= 2 ? 'Muddy' : w.soft ? 'Soft' : 'Firm';
    return w;
  }

  // Plausible autumn race-day weather for when the live call fails.
  API.simulatedWeather = function (monthIndex, seedKey) {
    const rng = U.mulberry32(U.hash(String(seedKey)));
    const ranges = { 8: [12, 26], 9: [5, 18], 10: [-2, 11] };
    const [lo, hi] = ranges[monthIndex] || [6, 16];
    const wet = rng() < 0.3;
    const code = wet ? U.pick([51, 61, 63, 80], rng) : U.pick([0, 1, 2, 3, 3], rng);
    return finishWeather({
      tempC: U.round(U.randFloat(lo, hi, rng), 1),
      precipMm: wet ? U.round(U.randFloat(0.4, 4, rng), 1) : 0,
      windKph: U.round(U.randFloat(4, 26, rng), 1),
      code,
      live: false
    });
  };

  API.fetchWeather = async function (lat, lon, fallbackMonth, seedKey) {
    const url = 'https://api.open-meteo.com/v1/forecast' +
      `?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}` +
      '&current=temperature_2m,precipitation,wind_speed_10m,weather_code&timezone=auto';
    try {
      const data = await fetchJson(url);
      const c = data && data.current;
      if (!c || typeof c.temperature_2m !== 'number') throw new Error('Weather data missing');
      return finishWeather({
        tempC: c.temperature_2m,
        precipMm: c.precipitation || 0,
        windKph: c.wind_speed_10m || 0,
        code: c.weather_code || 0,
        live: true
      });
    } catch (err) {
      return API.simulatedWeather(fallbackMonth, seedKey);
    }
  };

  API.toF = (c) => Math.round((c * 9) / 5 + 32);
  API.toMph = (kph) => Math.round(kph * 0.621371);

  XC.api = API;
})(window.XC = window.XC || {});
