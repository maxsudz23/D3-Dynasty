/* Title screen and coach setup (name, program, school, custom school). */
(function (XC) {
  'use strict';

  const U = XC.util;
  const h = U.h;
  const ui = XC.ui;
  XC.screens = XC.screens || {};

  /* ======================= Title ======================= */

  function continueGame(saved) {
    XC.audio.select();
    XC.state = saved;
    XC.activeSquad = saved.programs[0];
    ui.setTheme(saved.school.primary, saved.school.accent);
    XC.go('hub');
  }

  async function newGame(saved) {
    if (saved) {
      const ok = await ui.confirm(`Start over? This replaces Coach ${saved.coach.name}'s dynasty at ${saved.school.short}.`, 'Start over');
      if (!ok) return;
    }
    XC.audio.select();
    XC.go('setup');
  }

  XC.screens.title = {
    title: 'D3 Dynasty',
    context: false,
    render(root) {
      const saved = XC.storage.loadGame();
      this.saved = saved;
      const menu = h('div', { class: 'title-menu' });
      if (saved) {
        menu.appendChild(ui.button('Continue dynasty', () => continueGame(saved), { variant: 'primary', size: 'big', attrs: { 'data-nav': '', 'data-autofocus': '' } }));
        menu.appendChild(h('p', { class: 'title-save' },
          `Coach ${saved.coach.name} at ${saved.school.short}, ${XC.season.yearOf(saved.season)} season`));
        menu.appendChild(ui.button('New dynasty', () => newGame(saved), { variant: 'ghost', attrs: { 'data-nav': '' } }));
      } else {
        menu.appendChild(ui.button('New dynasty', () => newGame(null), { variant: 'primary', size: 'big', attrs: { 'data-nav': '', 'data-autofocus': '' } }));
      }
      if (!XC.storage.available) {
        menu.appendChild(h('p', { class: 'title-save' }, 'Saving is off in this browser, so a dynasty lasts until you close the tab.'));
      }

      root.appendChild(h('section', { class: 'title-screen' },
        h('div', { class: 'title-screen__inner' },
          h('h2', { class: 'logo', 'aria-label': 'D3 Dynasty' },
            h('span', { class: 'logo__word', 'aria-hidden': 'true' }, 'D3'),
            h('span', { class: 'logo__script', 'aria-hidden': 'true' }, 'Dynasty')),
          h('div', { class: 'logo__bar', 'aria-hidden': 'true' }),
          h('p', { class: 'title-sub' }, 'Division III cross country coaching'),
          menu,
          h('p', { class: 'press-start', 'aria-hidden': 'true' }, 'Press Enter'),
          h('p', { class: 'title-credit' },
            'Recruit names and photos from randomuser.me. Race-day weather from Open-Meteo. Programs are real; every athlete is fictional.'))));
    },
    legend() {
      return [{ key: 'Enter', label: 'Start', keyboardOnly: true, action: () => document.activeElement && document.activeElement.click() }];
    },
    onKey(e) {
      if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
        if (this.saved) continueGame(this.saved);
        else newGame(null);
        return true;
      }
      return false;
    }
  };

  /* ======================= Setup ======================= */

  const form = {
    coachName: '',
    program: 'M',
    schoolId: null,
    custom: null,
    geo: null,
    query: '',
    region: ''
  };

  function regionCenter(region) {
    const members = XC.schools.list.filter((s) => s.region === region);
    return {
      lat: U.avg(members.map((s) => s.lat)),
      lon: U.avg(members.map((s) => s.lon))
    };
  }

  function selectedSchool() {
    if (form.schoolId === 'custom') return form.custom;
    return form.schoolId ? XC.schools.byId(form.schoolId) : null;
  }

  function programList() {
    return form.program === 'MW' ? ['M', 'W'] : [form.program];
  }

  function offersProgram(school) {
    return programList().every((sq) => school.programs.includes(sq));
  }

  XC.screens.setup = {
    title: 'New coach',
    context: false,
    render(root) {
      this.root = root;
      const school = selectedSchool();
      if (school) ui.setTheme(school.primary, school.accent);

      const nameInput = h('input', {
        class: 'input', id: 'coach-name', type: 'text', maxlength: '24', autocomplete: 'name',
        value: form.coachName, placeholder: 'Your name', 'data-autofocus': '', required: true
      });
      nameInput.addEventListener('input', () => {
        form.coachName = nameInput.value;
        this.updatePreview();
      });
      nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.start();
        }
      });

      const program = h('fieldset', { class: 'segmented' },
        h('legend', null, 'Program'),
        h('div', { class: 'segmented__options' },
          [['M', 'Men'], ['W', 'Women'], ['MW', 'Both']].map(([value, label]) => {
            const input = h('input', { type: 'radio', name: 'program', value, checked: form.program === value });
            input.addEventListener('change', () => {
              form.program = value;
              const current = selectedSchool();
              if (current && !offersProgram(current)) {
                form.schoolId = null;
                ui.setTheme();
              }
              XC.audio.nav();
              this.renderList();
              this.updatePreview();
            });
            return h('label', { class: 'segmented__option' }, input, h('span', null, label));
          })));

      const search = h('input', {
        class: 'input', type: 'search', placeholder: 'Search by school, mascot or conference',
        value: form.query, 'aria-label': 'Search schools'
      });
      search.addEventListener('input', () => {
        form.query = search.value;
        this.renderList();
      });

      const region = h('select', { class: 'select', 'aria-label': 'Filter by region' },
        h('option', { value: '' }, 'All regions'),
        XC.schools.REGIONS.map((r) => h('option', { value: r, selected: form.region === r }, r)));
      region.addEventListener('change', () => {
        form.region = region.value;
        this.renderList();
      });

      this.geoStatus = h('p', { class: 'geo-status', role: 'status' },
        form.geo ? 'Sorted by distance from you. Your location stays in this browser.' : '');
      const nearMe = ui.button('Near me', () => this.locate(), { variant: 'ghost', size: 'small' });

      this.list = h('ul', { class: 'school-list', 'aria-label': 'Division III programs' });
      this.count = h('p', { class: 'field__hint' });

      const custom = this.customForm();

      this.preview = h('aside', { class: 'preview-card', 'aria-label': 'Program preview' });
      this.error = h('p', { class: 'form-error', role: 'alert' });

      root.appendChild(h('div', { class: 'setup' },
        h('form', { class: 'setup__form', novalidate: true, on: { submit: (e) => { e.preventDefault(); this.start(); } } },
          ui.panel('Coach profile', h('div', { class: 'stack' },
            h('div', { class: 'field' },
              h('label', { class: 'field__label', for: 'coach-name' }, 'Coach name'),
              nameInput),
            program)),
          ui.panel('Choose your program', h('div', { class: 'stack' },
            h('div', { class: 'finder-tools' }, search, region, nearMe),
            this.geoStatus,
            this.list,
            this.count,
            custom), { aside: 'Every NCAA Division III conference is represented' })),
        h('div', { class: 'stack' }, this.preview)));

      this.renderList();
      this.updatePreview();
    },

    customForm() {
      const c = form.custom || {
        id: 'custom', name: '', short: '', mascot: '', conf: 'Independent', region: 'Central',
        primary: '#1F5F8B', accent: '#F2B134', programs: 'MW', tier: 3, lat: 0, lon: 0
      };
      form.custom = c;
      const name = h('input', { class: 'input', type: 'text', maxlength: '40', value: c.name, id: 'custom-name' });
      const mascot = h('input', { class: 'input', type: 'text', maxlength: '24', value: c.mascot, id: 'custom-mascot' });
      const conf = h('select', { class: 'select', id: 'custom-conf' },
        h('option', { value: 'Independent' }, 'Independent'),
        XC.schools.CONFERENCES.map((cf) => h('option', { value: cf, selected: c.conf === cf }, cf)));
      const region = h('select', { class: 'select', id: 'custom-region' },
        XC.schools.REGIONS.map((r) => h('option', { value: r, selected: c.region === r }, r)));
      const primary = h('input', { class: 'input', type: 'color', value: c.primary, id: 'custom-primary' });
      const accent = h('input', { class: 'input', type: 'color', value: c.accent, id: 'custom-accent' });

      const sync = () => {
        c.name = name.value.trim();
        c.short = c.name.length > 22 ? U.initials(c.name) : c.name;
        c.mascot = mascot.value.trim() || 'Harriers';
        c.conf = conf.value;
        c.region = region.value;
        c.primary = primary.value.toUpperCase();
        c.accent = accent.value.toUpperCase();
        const center = c.conf === 'Independent' ? regionCenter(c.region) : XC.schools.confCenter(c.conf);
        c.lat = center.lat;
        c.lon = center.lon;
        if (form.schoolId === 'custom') {
          ui.setTheme(c.primary, c.accent);
          this.updatePreview();
        }
      };
      [name, mascot, conf, region, primary, accent].forEach((el) => el.addEventListener('input', sync));
      sync();

      const use = ui.button('Coach this school', () => {
        sync();
        if (!c.name) {
          this.error.textContent = 'Give your custom school a name first.';
          name.focus();
          return;
        }
        this.error.textContent = '';
        form.schoolId = 'custom';
        ui.setTheme(c.primary, c.accent);
        XC.audio.select();
        this.renderList();
        this.updatePreview();
      }, { variant: 'ghost', size: 'small' });

      return h('details', { class: 'custom-school', open: form.schoolId === 'custom' },
        h('summary', null, 'Not listed? Create a custom program'),
        h('div', { class: 'custom-school__grid' },
          h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'custom-name' }, 'School name'), name),
          h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'custom-mascot' }, 'Mascot'), mascot),
          h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'custom-conf' }, 'Conference'), conf),
          h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'custom-region' }, 'NCAA region'), region),
          h('div', { class: 'custom-school__colors' },
            h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'custom-primary' }, 'Primary'), primary),
            h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'custom-accent' }, 'Accent'), accent)),
          h('div', { class: 'actions' }, use)));
    },

    renderList() {
      const q = form.query.trim().toLowerCase();
      let rows = XC.schools.list.filter((s) => offersProgram(s));
      if (form.region) rows = rows.filter((s) => s.region === form.region);
      if (q) {
        rows = rows.filter((s) => [s.name, s.short, s.mascot, s.conf].some((v) => v.toLowerCase().includes(q)));
      }
      if (form.geo) {
        rows = rows
          .map((s) => Object.assign({}, s, { dist: U.haversineKm(form.geo.lat, form.geo.lon, s.lat, s.lon) }))
          .sort((a, b) => a.dist - b.dist);
      } else {
        rows = rows.slice().sort((a, b) => a.short.localeCompare(b.short));
      }

      U.clear(this.list);
      if (!rows.length) {
        this.list.appendChild(h('li', { class: 'empty' }, 'No programs match. Clear the search or pick another region, or create a custom program below.'));
      }
      rows.forEach((s) => {
        const chip = h('span', { class: 'school-option__chip', 'aria-hidden': 'true' });
        chip.style.setProperty('--chip-a', s.primary);
        chip.style.setProperty('--chip-b', s.accent);
        const btn = h('button', {
          type: 'button', class: 'school-option', 'aria-pressed': String(form.schoolId === s.id),
          dataset: { id: s.id }, on: { click: () => this.pick(s.id) }
        },
        chip,
        h('span', null,
          h('span', { class: 'school-option__name' }, s.name),
          h('span', { class: 'school-option__meta' },
            h('span', null, s.mascot), h('span', null, s.conf), h('span', null, s.region),
            s.programs.length === 1 ? h('span', null, s.programs === 'M' ? "Men's only" : "Women's only") : null)),
        s.dist !== undefined ? h('span', { class: 'school-option__dist' }, `${Math.round(s.dist * 0.621)} mi`) : h('span'));
        this.list.appendChild(h('li', null, btn));
      });
      this.count.textContent = `${rows.length} program${rows.length === 1 ? '' : 's'} shown`;
    },

    pick(id) {
      form.schoolId = id;
      const s = XC.schools.byId(id);
      ui.setTheme(s.primary, s.accent);
      XC.audio.select();
      this.error.textContent = '';
      Array.from(this.list.querySelectorAll('.school-option')).forEach((b) => b.setAttribute('aria-pressed', 'false'));
      const active = this.list.querySelector(`[data-id="${id}"]`);
      if (active) active.setAttribute('aria-pressed', 'true');
      this.updatePreview();
    },

    locate() {
      const status = this.geoStatus;
      status.classList.remove('geo-status--error');
      if (!('geolocation' in navigator)) {
        status.classList.add('geo-status--error');
        status.textContent = 'This browser can’t share your location. Search by name or filter by region instead.';
        return;
      }
      status.textContent = 'Finding programs near you…';
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          form.geo = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          status.textContent = 'Sorted by distance from you. Your location stays in this browser.';
          XC.audio.select();
          this.renderList();
        },
        (err) => {
          status.classList.add('geo-status--error');
          const messages = {
            1: 'Location permission was denied. Search by name or filter by region instead.',
            2: 'Your location isn’t available right now. Search by name or filter by region instead.',
            3: 'Finding your location took too long. Try again, or search by name.'
          };
          status.textContent = messages[err.code] || messages[2];
          XC.audio.error();
        },
        { timeout: 10000, maximumAge: 600000 }
      );
    },

    updatePreview() {
      const school = selectedSchool();
      const preview = this.preview;
      if (!preview) return;
      U.clear(preview);
      const shown = school && school.name ? school : { name: 'Pick a program', short: 'XC', mascot: '', conf: '', region: '', primary: '#2E4A6B', accent: '#E0A526' };
      const label = form.program === 'MW' ? 'Men and women' : form.program === 'W' ? "Women's team" : "Men's team";
      preview.appendChild(h('div', { class: 'preview-card__band' }, ui.crest(shown)));
      preview.appendChild(h('div', { class: 'preview-card__body on-dark' },
        h('p', { class: 'preview-card__school' }, shown.name),
        school ? h('dl', { class: 'preview-card__facts' },
          h('dt', null, 'Coach'), h('dd', null, form.coachName.trim() || 'Name needed'),
          h('dt', null, 'Mascot'), h('dd', null, shown.mascot),
          h('dt', null, 'Conference'), h('dd', null, shown.conf),
          h('dt', null, 'Region'), h('dd', null, shown.region),
          h('dt', null, 'Coaching'), h('dd', null, label),
          h('dt', null, 'Roster'), h('dd', null, '12 returning runners')) : h('p', { class: 'muted' }, 'Choose a school from the list or build your own. The whole game takes on its colors.'),
        this.error,
        h('div', { class: 'actions' }, ui.button('Start dynasty', () => this.start(), { variant: 'primary', size: 'big', key: 'Enter' }))));
    },

    async start() {
      const name = form.coachName.trim();
      const school = selectedSchool();
      if (!name) {
        this.error.textContent = 'Enter your coach name to continue.';
        XC.audio.error();
        document.getElementById('coach-name').focus();
        return;
      }
      if (!school || !school.name) {
        this.error.textContent = 'Pick a school from the list, or create a custom program.';
        XC.audio.error();
        return;
      }
      XC.audio.select();
      const programs = programList();
      ui.loading(this.root, 'Scouting your returning roster…');
      const results = await Promise.all(programs.map((sq) => XC.api.fetchPeople(12, sq)));
      const people = {};
      programs.forEach((sq, i) => { people[sq] = results[i].people; });
      XC.state = XC.season.newGame({ coachName: name, school: Object.assign({}, school), programs, people });
      XC.activeSquad = programs[0];
      XC.save();
      if (results.some((r) => !r.live)) {
        ui.toast('Recruit photos are unavailable right now, so your roster uses scouting sketches and local names.', 'warn');
      }
      XC.go('hub');
    },

    legend() {
      return [
        { key: 'Enter', label: 'Start dynasty', action: () => this.start() },
        { key: 'Esc', label: 'Back', action: () => XC.go('title') }
      ];
    },
    onKey(e) {
      if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement) && !(e.target instanceof HTMLInputElement)) {
        this.start();
        return true;
      }
      return false;
    },
    back() {
      XC.go('title');
    }
  };
})(window.XC = window.XC || {});
