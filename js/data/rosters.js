/* Real rosters, used with the team's permission. A new save as one of these
   schools starts with this exact roster for each squad it fields, instead of
   a generated one. Names, class years (1 = first-year … 4 = senior) and
   hometowns (and headshots, where listed in photos) come from the
   school's roster page. OVR comes from each
   runner's season-best time (men 8K, women 6K) through S.ovrFromMark; the
   individual ratings are shaped around it, seeded by name so every save
   gets the same team. A runner with no mark gets a seeded rating a little
   below their class average. Real athletes carry a.real = true, which
   keeps their hometowns as listed.
   Rows: [first, last, year, hometown as "City, ST", best mark or null]. */
(function (XC) {
  'use strict';

  XC.rosters = {
    // https://washubears.com/sports/mens-cross-country/roster (2026)
    // https://washubears.com/sports/womens-cross-country/roster (2026)
    // Marks: 2026 season bests supplied by the team (men 8K, women 6K).
    // At the team's request, each squad includes its top 20 by season best
    // plus anyone outside it who asked to be in the game. The rest are in
    // HIDDEN_ROSTER.md (not served).
    washu: {
      season: 2026,
      M: [
        ['Ryan', 'Brinker', 3, 'Grand Rapids, MI', '25:23.7'],
        ['Caleb', 'Brox', 3, 'Princeton, NJ', '26:10.0'],
        ['Dominic', 'Buckman', 2, 'Webster Groves, MO', '26:45.4'],
        ['Brayden', 'Bunt', 1, 'Charleston, SC', '25:05.9'],
        // 8K PR from TFRRS (Oct 2023); speed from his track PRs (see ratings).
        ['Calvin', 'Crossland', 4, 'Park City, UT', '27:02.9'],
        ['Brody', 'Cushing', 1, 'Mount Prospect, IL', '25:51.1'],
        ['Grey', 'Donner', 1, 'Alpharetta, GA', '27:02.8'],
        ['Paul', 'Fleck', 2, 'Baldwin, NY', '27:06.7'],
        ['Charlie', 'Glatz', 2, 'Ladue, MO', '26:14.0'],
        ['Sean', 'Green', 3, 'San Francisco, CA', '24:43.2'],
        ['Mateo', 'Gros-Slovinsky', 2, 'Bethesda, MD', '26:17.7'],
        ['Charlie', 'Houck', 2, 'Boerne, TX', '24:56.0'],
        ['Lukas', 'Keane', 1, 'Naperville, IL', '26:10.4'],
        ['Russell', 'Kramer', 4, 'Penn Laird, VA', '26:22.2'],
        ['Ryan', 'Lien', 1, 'Shorewood, WI', '25:50.9'],
        // No college mark yet: his high school 5K (15:28.4) as an 8K by
        // Riegel's formula (t8 = t5 x 1.6^1.06). Starts the game injured.
        ['Jackson', 'Proffitt', 1, 'Lexington, KY', '25:27.9'],
        ['Will', 'Liu', 4, 'Acton, MA', '25:52.1'],
        ['Ben', 'Lorenz', 3, 'Westport, CT', '24:45.8'],
        ['William', 'Newkirk', 2, 'Colorado Springs, CO', '26:52.6'],
        ['Gavin', 'O\'Connor', 2, 'Evergreen Park, IL', '25:01.6'],
        ['Bankson', 'Roach', 2, 'Fayetteville, GA', '27:23.1'],
        ['Will', 'Ruszkowski', 3, 'Michigan City, IN', '25:09.4'],
        // Freshman (2025) 8K PR from TFRRS; he starts the game injured.
        ['Rishi', 'Shadaksharappa', 2, 'Scarsdale, NY', '25:23.7'],
        ['Ilan', 'Sherman-Kadish', 3, 'Newton, MA', '26:28.0'],
        ['Max', 'Sudrzynski', 2, 'Algonquin, IL', '24:17.7'],
        ['Brandon', 'Sun', 1, 'San Diego, CA', '26:42.8'],
        ['Freddie', 'van der Velden', 1, 'Natick, MA', '26:18.7'],
        ['Riley', 'Wold', 1, 'Arlington Heights, IL', '26:11.1'],
        ['Toby', 'Wong', 1, 'Boulder, CO', '24:44.9']
      ],
      // TFRRS college bests for everyone but first-years (who haven't run
      // college track yet), from tfrrs.org/teams/MO_college_m_Washington_U
      // and ..._f_Washington_U. xc is the 8K (men) or 6K (women) XC PR;
      // m800, m1500, mile, m5000, m10000 are track PRs. S.realRating blends
      // these with the season best to set OVR, speed and kick.
      tfrrs: {
        M: {
          'Ryan Brinker': { xc: '25:23.6', m800: '1:59.48', m1500: '4:05.79', mile: '4:28.60' },
          'Caleb Brox': { xc: '25:56.9', m800: '1:57.69', m1500: '3:54.52', mile: '4:16.08' },
          'Dominic Buckman': { xc: '26:45.4' },
          'Calvin Crossland': { xc: '27:02.9', m800: '1:57.40', m1500: '3:59.45', mile: '4:25.99' },
          'Paul Fleck': { xc: '27:06.7' },
          'Charlie Glatz': { xc: '26:14.0' },
          'Sean Green': { xc: '24:43.2', mile: '4:21.63', m5000: '14:46.08' },
          'Mateo Gros-Slovinsky': { xc: '25:58.3' },
          'Charlie Houck': { xc: '24:48.8', m800: '2:00.96', mile: '4:19.65', m5000: '14:34.64', m10000: '31:13.50' },
          'Russell Kramer': { xc: '26:22.2', m800: '2:07.73', m1500: '4:09.01', mile: '4:30.01', m5000: '15:17.19', m10000: '32:11.55' },
          'Will Liu': { xc: '25:25.0', m800: '2:00.59', mile: '4:15.32', m5000: '14:40.89' },
          'Ben Lorenz': { xc: '24:45.8', m800: '2:05.54', m1500: '4:03.10', mile: '4:22.15', m5000: '14:57.30' },
          'William Newkirk': { xc: '26:52.6', m800: '1:53.96', mile: '4:27.25' },
          'Gavin O\'Connor': { xc: '25:01.6' },
          'Bankson Roach': { xc: '27:23.1' },
          'Will Ruszkowski': { xc: '25:09.4', m800: '2:03.17', mile: '4:27.48', m5000: '14:52.11' },
          'Rishi Shadaksharappa': { xc: '25:23.7' },
          'Ilan Sherman-Kadish': { xc: '25:27.2', mile: '4:24.82', m5000: '14:54.70' },
          'Max Sudrzynski': { xc: '24:17.7' }
        },
        W: {
          'Taylor Buese': { xc: '22:20.1', m800: '2:25.17', mile: '5:09.56' },
          'Sally Carrington': { xc: '22:00.1', m800: '2:28.37', m1500: '4:53.39', mile: '5:14.98', m5000: '17:41.79' },
          'Lily Dipple': { xc: '23:00.2', m800: '2:18.24', m1500: '4:56.96', mile: '5:18.97' },
          'Kira Larner': { xc: '22:50.6', m800: '2:30.39', m1500: '4:53.12', mile: '5:20.39', m5000: '18:29.83' },
          'Lucinda Laughlin': { xc: '20:41.6' },
          'Maddy Lee': { xc: '22:10.2' },
          'Amelie Maltz': { xc: '22:51.9', m1500: '4:52.24', mile: '5:24.51', m5000: '17:59.04' },
          'Anna McAndrew': { xc: '23:31.2', m800: '2:32.87', m1500: '5:05.73', mile: '5:38.69' },
          'Avery Nason': { xc: '22:02.4', m800: '2:28.82', m1500: '4:55.26', mile: '5:15.22', m5000: '17:42.86', m10000: '37:17.68' },
          'Lucy Peterson': { xc: '22:32.5', m800: '2:30.11', m1500: '4:57.83', mile: '5:21.73', m5000: '18:10.66' },
          'Lauren Raley': { xc: '22:05.7' },
          'Mackenzie Raue': { xc: '22:41.2' },
          'Leah Sekulich': { xc: '22:30.9', m800: '2:27.00', mile: '5:13.53', m5000: '17:34.24' },
          'Sofia Sheldon': { xc: '22:27.4' },
          'Grace Todd': { xc: '22:24.3' }
        }
      },
      // Runners who start a new save injured: out this many meets (a season
      // is six), so they're back for the next season.
      injuries: {
        M: {
          'Rishi Shadaksharappa': 6,
          'Jackson Proffitt': 6
        }
      },
      // Hand-set ratings that replace the generated ones (OVR is then
      // recomputed from all seven). Applied to new saves, and once to
      // existing ones.
      ratings: {
        M: {
          'Freddie van der Velden': { spd: 85, kck: 90 },
          'Mateo Gros-Slovinsky': { spd: 85, kck: 93 }
        }
      },
      // Roster headshots from washubears.com, hosted here. Runners without
      // one (Lukas Keane has none on the site) get the sketch portrait.
      photos: {
        M: {
        'Ryan Brinker': 'img/roster/washu/m/ryan-brinker.webp',
        'Caleb Brox': 'img/roster/washu/m/caleb-brox.webp',
        'Dominic Buckman': 'img/roster/washu/m/dominic-buckman.webp',
        'Brayden Bunt': 'img/roster/washu/m/brayden-bunt.webp',
        'Calvin Crossland': 'img/roster/washu/m/calvin-crossland.webp',
        'Brody Cushing': 'img/roster/washu/m/brody-cushing.webp',
        'Grey Donner': 'img/roster/washu/m/grey-donner.webp',
        'Paul Fleck': 'img/roster/washu/m/paul-fleck.webp',
        'Charlie Glatz': 'img/roster/washu/m/charlie-glatz.webp',
        'Sean Green': 'img/roster/washu/m/sean-green.webp',
        'Mateo Gros-Slovinsky': 'img/roster/washu/m/mateo-gros-slovinsky.webp',
        'Charlie Houck': 'img/roster/washu/m/charlie-houck.webp',
        'Russell Kramer': 'img/roster/washu/m/russell-kramer.webp',
        'Ryan Lien': 'img/roster/washu/m/ryan-lien.webp',
        'Will Liu': 'img/roster/washu/m/will-liu.webp',
        'Ben Lorenz': 'img/roster/washu/m/ben-lorenz.webp',
        'William Newkirk': 'img/roster/washu/m/william-newkirk.webp',
        'Gavin O\'Connor': 'img/roster/washu/m/gavin-oconnor.webp',
        'Jackson Proffitt': 'img/roster/washu/m/jackson-proffitt.webp',
        'Bankson Roach': 'img/roster/washu/m/bankson-roach.webp',
        'Will Ruszkowski': 'img/roster/washu/m/will-ruszkowski.webp',
        'Rishi Shadaksharappa': 'img/roster/washu/m/rishi-shadaksharappa.webp',
        'Ilan Sherman-Kadish': 'img/roster/washu/m/ilan-sherman-kadish.webp',
        'Max Sudrzynski': 'img/roster/washu/m/max-sudrzynski.webp',
        'Brandon Sun': 'img/roster/washu/m/brandon-sun.webp',
        'Freddie van der Velden': 'img/roster/washu/m/freddie-van-der-velden.webp',
        'Riley Wold': 'img/roster/washu/m/riley-wold.webp',
        'Toby Wong': 'img/roster/washu/m/toby-wong.webp'
        }
      },
      W: [
        ['Emily', 'Anand', 1, 'New Braunfels, TX', '23:24.3'],
        ['Taylor', 'Buese', 2, 'Denver, CO', '22:20.1'],
        ['Sally', 'Carrington', 3, 'Denver, CO', '22:00.1'],
        ['Madeline', 'Cassidy', 1, 'Batavia, IL', '23:10.9'],
        ['Lily', 'Dipple', 4, 'Demarest, NJ', '23:00.2'],
        ['Chloe', 'Hamilton', 1, 'Incline Village, NV', '23:23.1'],
        ['Ella', 'Jackson', 1, 'Webster Groves, MO', '22:58.6'],
        ['Kira', 'Larner', 4, 'Encinitas, CA', '23:05.5'],
        ['Lucinda', 'Laughlin', 3, 'San Francisco, CA', '20:41.6'],
        ['Maddy', 'Lee', 3, 'Greenwich, CT', '22:10.2'],
        ['Lucy', 'Luetkemeyer', 1, 'St. Louis, MO', '21:42.8'],
        ['Amelie', 'Maltz', 4, 'San Francisco, CA', '23:46.7'],
        ['Anna', 'McAndrew', 2, 'St. Louis, MO', '23:31.2'],
        ['Avery', 'Nason', 4, 'Corvallis, OR', '22:02.4'],
        ['Lucy', 'Peterson', 2, 'Tiburon, CA', '22:32.5'],
        ['Lauren', 'Raley', 3, 'Colorado Springs, CO', '22:05.7'],
        ['Mackenzie', 'Raue', 3, 'Bethesda, MD', '22:41.2'],
        ['Leah', 'Sekulich', 2, 'Honolulu, HI', '22:30.9'],
        ['Sofia', 'Sheldon', 3, 'Arlington, VA', '23:04.2'],
        ['Grace', 'Todd', 3, 'Denver, CO', '22:24.3']
      ]
    }
  };

  XC.rosters.photoFor = (schoolId, squad, first, last) => {
    const team = XC.rosters[schoolId];
    const set = team && team.photos && team.photos[squad];
    return (set && set[`${first} ${last}`]) || null;
  };

  XC.rosters.ratingsFor = (schoolId, squad, first, last) => {
    const team = XC.rosters[schoolId];
    const set = team && team.ratings && team.ratings[squad];
    return (set && set[`${first} ${last}`]) || null;
  };

  XC.rosters.injuryFor = (schoolId, squad, first, last) => {
    const team = XC.rosters[schoolId];
    const set = team && team.injuries && team.injuries[squad];
    return (set && set[`${first} ${last}`]) || 0;
  };

  XC.rosters.tfrrsFor = (schoolId, squad, first, last) => {
    const team = XC.rosters[schoolId];
    const set = team && team.tfrrs && team.tfrrs[squad];
    return (set && set[`${first} ${last}`]) || null;
  };

  XC.rosters.forSchool = (schoolId, squad) => {
    const team = XC.rosters[schoolId];
    return team && Array.isArray(team[squad]) ? team[squad] : null;
  };
})(window.XC = window.XC || {});
