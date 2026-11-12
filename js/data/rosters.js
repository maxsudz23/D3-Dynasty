/* Real rosters, used with the team's permission. A new save as one of these
   schools starts with this exact roster for each squad it fields, instead of
   a generated one. Names, class years (1 = first-year … 4 = senior) and
   hometowns come from the school's roster page. OVR comes from each
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
    washu: {
      season: 2026,
      M: [
        ['Ryan', 'Brinker', 3, 'Grand Rapids, MI', '25:23.7'],
        ['Caleb', 'Brox', 3, 'Princeton, NJ', '26:10.0'],
        ['Dominic', 'Buckman', 2, 'Webster Groves, MO', '26:45.4'],
        ['Brayden', 'Bunt', 1, 'Charleston, SC', '25:05.9'],
        ['Calvin', 'Crossland', 4, 'Park City, UT', '27:44.8'],
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
        ['Will', 'Liu', 4, 'Acton, MA', '25:52.1'],
        ['Ben', 'Lorenz', 3, 'Westport, CT', '24:45.8'],
        ['Kaleb', 'McElfish', 4, 'Rancho Santa Margarita, CA', '27:03.1'],
        ['William', 'Newkirk', 2, 'Colorado Springs, CO', '26:52.6'],
        ['Gavin', 'O\'Connor', 2, 'Evergreen Park, IL', '25:01.6'],
        ['Jackson', 'Proffitt', 1, 'Lexington, KY', null],
        ['Bankson', 'Roach', 2, 'Fayetteville, GA', '27:23.1'],
        ['Will', 'Ruszkowski', 3, 'Michigan City, IN', '25:09.4'],
        ['Rishi', 'Shadaksharappa', 2, 'Scarsdale, NY', '27:39.7'],
        ['Ilan', 'Sherman-Kadish', 3, 'Newton, MA', '26:28.0'],
        ['Max', 'Sudrzynski', 2, 'Algonquin, IL', '24:17.7'],
        ['Brandon', 'Sun', 1, 'San Diego, CA', '26:42.8'],
        ['Freddie', 'van der Velden', 1, 'Natick, MA', '26:18.7'],
        ['Riley', 'Wold', 1, 'Arlington Heights, IL', '26:11.1'],
        ['Toby', 'Wong', 1, 'Boulder, CO', '24:44.9']
      ],
      W: [
        ['Emily', 'Anand', 1, 'New Braunfels, TX', '23:24.3'],
        ['Taylor', 'Buese', 2, 'Denver, CO', '22:20.1'],
        ['Sally', 'Carrington', 3, 'Denver, CO', '22:00.1'],
        ['Madeline', 'Cassidy', 1, 'Batavia, IL', '23:10.9'],
        ['Lily', 'Dipple', 4, 'Demarest, NJ', '23:00.2'],
        ['Gianna', 'Ezekwe', 2, 'North Kansas City, MO', null],
        ['Chloe', 'Hamilton', 1, 'Incline Village, NV', '23:23.1'],
        ['Ella', 'Jackson', 1, 'Webster Groves, MO', '22:58.6'],
        ['Kira', 'Larner', 4, 'Encinitas, CA', '23:05.5'],
        ['Vivienne', 'Larson', 4, 'Eden Prairie, MN', null],
        ['Lucinda', 'Laughlin', 3, 'San Francisco, CA', '20:41.6'],
        ['Maddy', 'Lee', 3, 'Greenwich, CT', '22:10.2'],
        ['Lucy', 'Luetkemeyer', 1, 'St. Louis, MO', '21:42.8'],
        ['Amelie', 'Maltz', 4, 'San Francisco, CA', '23:46.7'],
        ['Anna', 'McAndrew', 2, 'St. Louis, MO', '23:31.2'],
        ['Avery', 'Nason', 4, 'Corvallis, OR', '22:02.4'],
        ['Lucy', 'Peterson', 2, 'Tiburon, CA', '22:32.5'],
        ['Lauren', 'Raley', 3, 'Colorado Springs, CO', '22:05.7'],
        ['Mackenzie', 'Raue', 3, 'Bethesda, MD', '22:41.2'],
        ['Megan', 'Raue', 2, 'Bethesda, MD', null],
        ['Leah', 'Sekulich', 2, 'Honolulu, HI', '22:30.9'],
        ['Sofia', 'Sheldon', 3, 'Arlington, VA', '23:04.2'],
        ['Piper', 'Stevens', 1, 'Nicholasville, KY', '24:44.6'],
        ['Grace', 'Todd', 3, 'Denver, CO', '22:24.3']
      ]
    }
  };

  XC.rosters.forSchool = (schoolId, squad) => {
    const team = XC.rosters[schoolId];
    return team && Array.isArray(team[squad]) ? team[squad] : null;
  };
})(window.XC = window.XC || {});
