/* Real rosters, used with the team's permission. A new save as one of these
   schools starts with this exact roster for each squad it fields, instead of
   a generated one. Names, class years (1 = first-year … 4 = senior) and
   hometowns come from the school's roster page; ratings are generated,
   seeded by name so every save gets the same team. Real athletes carry
   a.real = true, which keeps their hometowns as listed.
   Rows: [first, last, year, hometown as "City, ST"]. */
(function (XC) {
  'use strict';

  XC.rosters = {
    // https://washubears.com/sports/mens-cross-country/roster (2026)
    // https://washubears.com/sports/womens-cross-country/roster (2026)
    washu: {
      season: 2026,
      M: [
        ['Ryan', 'Brinker', 3, 'Grand Rapids, MI'],
        ['Caleb', 'Brox', 3, 'Princeton, NJ'],
        ['Dominic', 'Buckman', 2, 'Webster Groves, MO'],
        ['Brayden', 'Bunt', 1, 'Charleston, SC'],
        ['Calvin', 'Crossland', 4, 'Park City, UT'],
        ['Brody', 'Cushing', 1, 'Mount Prospect, IL'],
        ['Grey', 'Donner', 1, 'Alpharetta, GA'],
        ['Paul', 'Fleck', 2, 'Baldwin, NY'],
        ['Charlie', 'Glatz', 2, 'Ladue, MO'],
        ['Sean', 'Green', 3, 'San Francisco, CA'],
        ['Mateo', 'Gros-Slovinsky', 2, 'Bethesda, MD'],
        ['Charlie', 'Houck', 2, 'Boerne, TX'],
        ['Lukas', 'Keane', 1, 'Naperville, IL'],
        ['Russell', 'Kramer', 4, 'Penn Laird, VA'],
        ['Ryan', 'Lien', 1, 'Shorewood, WI'],
        ['Will', 'Liu', 4, 'Acton, MA'],
        ['Ben', 'Lorenz', 3, 'Westport, CT'],
        ['Kaleb', 'McElfish', 4, 'Rancho Santa Margarita, CA'],
        ['William', 'Newkirk', 2, 'Colorado Springs, CO'],
        ['Gavin', 'O\'Connor', 2, 'Evergreen Park, IL'],
        ['Jackson', 'Proffitt', 1, 'Lexington, KY'],
        ['Bankson', 'Roach', 2, 'Fayetteville, GA'],
        ['Will', 'Ruszkowski', 3, 'Michigan City, IN'],
        ['Rishi', 'Shadaksharappa', 2, 'Scarsdale, NY'],
        ['Ilan', 'Sherman-Kadish', 3, 'Newton, MA'],
        ['Max', 'Sudrzynski', 2, 'Algonquin, IL'],
        ['Brandon', 'Sun', 1, 'San Diego, CA'],
        ['Freddie', 'van der Velden', 1, 'Natick, MA'],
        ['Riley', 'Wold', 1, 'Arlington Heights, IL'],
        ['Toby', 'Wong', 1, 'Boulder, CO']
      ],
      W: [
        ['Emily', 'Anand', 1, 'New Braunfels, TX'],
        ['Taylor', 'Buese', 2, 'Denver, CO'],
        ['Sally', 'Carrington', 3, 'Denver, CO'],
        ['Madeline', 'Cassidy', 1, 'Batavia, IL'],
        ['Lily', 'Dipple', 4, 'Demarest, NJ'],
        ['Gianna', 'Ezekwe', 2, 'North Kansas City, MO'],
        ['Chloe', 'Hamilton', 1, 'Incline Village, NV'],
        ['Ella', 'Jackson', 1, 'Webster Groves, MO'],
        ['Kira', 'Larner', 4, 'Encinitas, CA'],
        ['Vivienne', 'Larson', 4, 'Eden Prairie, MN'],
        ['Lucinda', 'Laughlin', 3, 'San Francisco, CA'],
        ['Maddy', 'Lee', 3, 'Greenwich, CT'],
        ['Lucy', 'Luetkemeyer', 1, 'St. Louis, MO'],
        ['Amelie', 'Maltz', 4, 'San Francisco, CA'],
        ['Anna', 'McAndrew', 2, 'St. Louis, MO'],
        ['Avery', 'Nason', 4, 'Corvallis, OR'],
        ['Lucy', 'Peterson', 2, 'Tiburon, CA'],
        ['Lauren', 'Raley', 3, 'Colorado Springs, CO'],
        ['Mackenzie', 'Raue', 3, 'Bethesda, MD'],
        ['Megan', 'Raue', 2, 'Bethesda, MD'],
        ['Leah', 'Sekulich', 2, 'Honolulu, HI'],
        ['Sofia', 'Sheldon', 3, 'Arlington, VA'],
        ['Piper', 'Stevens', 1, 'Nicholasville, KY'],
        ['Grace', 'Todd', 3, 'Denver, CO']
      ]
    }
  };

  XC.rosters.forSchool = (schoolId, squad) => {
    const team = XC.rosters[schoolId];
    return team && Array.isArray(team[squad]) ? team[squad] : null;
  };
})(window.XC = window.XC || {});
