/* Real hometowns for athletes.
   Each state has an approximate population center, its population in
   millions and a list of real towns. A recruit's state is drawn by population,
   weighted toward states near the school, so most runners come from the
   region and a few from across the country. A small share are international. */
(function (XC) {
  'use strict';

  const U = XC.util;

  // abbr: [lat, lon, population (millions), towns]
  const STATES = {
    AL: [32.8, -86.8, 5.0, ['Birmingham', 'Huntsville', 'Mobile', 'Montgomery', 'Tuscaloosa', 'Auburn', 'Hoover', 'Madison', 'Florence', 'Vestavia Hills', 'Dothan', 'Fairhope']],
    AK: [61.2, -149.9, 0.73, ['Anchorage', 'Fairbanks', 'Juneau', 'Wasilla', 'Palmer', 'Sitka', 'Kenai', 'Homer']],
    AZ: [33.5, -111.9, 7.2, ['Phoenix', 'Tucson', 'Flagstaff', 'Mesa', 'Scottsdale', 'Tempe', 'Chandler', 'Gilbert', 'Prescott', 'Sedona', 'Peoria', 'Yuma']],
    AR: [34.8, -92.3, 3.0, ['Little Rock', 'Fayetteville', 'Bentonville', 'Conway', 'Rogers', 'Fort Smith', 'Jonesboro', 'Hot Springs', 'Springdale']],
    CA: [35.5, -119.5, 39.5, ['San Luis Obispo', 'Davis', 'Pasadena', 'Palo Alto', 'Berkeley', 'Sacramento', 'San Diego', 'Santa Barbara', 'Mammoth Lakes', 'Santa Cruz', 'Fresno', 'Claremont', 'Irvine', 'Walnut Creek', 'Folsom', 'Chico', 'Redlands', 'Los Gatos', 'Petaluma', 'Long Beach', 'San Jose', 'Oakland', 'Arcata', 'Encinitas', 'Thousand Oaks']],
    CO: [39.7, -105.0, 5.8, ['Boulder', 'Fort Collins', 'Colorado Springs', 'Golden', 'Littleton', 'Durango', 'Gunnison', 'Alamosa', 'Lakewood', 'Longmont', 'Evergreen', 'Steamboat Springs', 'Grand Junction', 'Denver']],
    CT: [41.6, -72.7, 3.6, ['New Haven', 'Hartford', 'Glastonbury', 'Ridgefield', 'Fairfield', 'Greenwich', 'Middletown', 'Mystic', 'Simsbury', 'Guilford', 'Westport', 'Wethersfield']],
    DE: [39.2, -75.5, 1.0, ['Wilmington', 'Newark', 'Dover', 'Lewes', 'Hockessin', 'Middletown', 'Rehoboth Beach']],
    DC: [38.9, -77.0, 0.69, ['Washington']],
    FL: [28.0, -81.7, 21.5, ['Gainesville', 'Tallahassee', 'Orlando', 'Tampa', 'Jacksonville', 'St. Petersburg', 'Sarasota', 'Naples', 'Pensacola', 'Winter Park', 'Fort Lauderdale', 'Miami', 'Boca Raton', 'Melbourne']],
    GA: [33.5, -84.2, 10.7, ['Atlanta', 'Athens', 'Savannah', 'Decatur', 'Marietta', 'Roswell', 'Alpharetta', 'Macon', 'Augusta', 'Peachtree City', 'Columbus', 'Dahlonega']],
    HI: [21.3, -157.9, 1.46, ['Honolulu', 'Hilo', 'Kailua', 'Kaneohe', 'Lahaina', 'Kapolei', 'Pearl City']],
    ID: [43.6, -116.0, 1.8, ['Boise', 'Moscow', "Coeur d'Alene", 'Idaho Falls', 'Pocatello', 'Meridian', 'Sandpoint', 'Ketchum', 'Twin Falls']],
    IL: [41.3, -88.4, 12.8, ['Naperville', 'Evanston', 'Peoria', 'Champaign', 'Oak Park', 'Wheaton', 'Hinsdale', 'Schaumburg', 'Rockford', 'Springfield', 'Bloomington', 'Glenview', 'Elmhurst', 'Galesburg', 'Normal', 'St. Charles', 'Downers Grove', 'Palatine', 'Lake Forest', 'Chicago']],
    IN: [39.9, -86.3, 6.8, ['Bloomington', 'Carmel', 'Fort Wayne', 'South Bend', 'Indianapolis', 'West Lafayette', 'Zionsville', 'Fishers', 'Evansville', 'Terre Haute', 'Valparaiso', 'Columbus', 'Muncie']],
    IA: [41.9, -93.3, 3.2, ['Ames', 'Dubuque', 'Iowa City', 'Des Moines', 'Cedar Rapids', 'Decorah', 'Davenport', 'Ankeny', 'Grinnell', 'Cedar Falls', 'Sioux City', 'Waterloo']],
    KS: [38.5, -97.0, 2.9, ['Lawrence', 'Wichita', 'Manhattan', 'Overland Park', 'Topeka', 'Olathe', 'Hutchinson', 'Salina', 'Emporia', 'Leawood']],
    KY: [37.8, -85.3, 4.5, ['Lexington', 'Louisville', 'Bowling Green', 'Frankfort', 'Berea', 'Paducah', 'Covington', 'Richmond', 'Owensboro']],
    LA: [30.7, -91.5, 4.7, ['New Orleans', 'Baton Rouge', 'Lafayette', 'Shreveport', 'Mandeville', 'Lake Charles', 'Ruston']],
    ME: [44.3, -69.8, 1.36, ['Portland', 'Bangor', 'Brunswick', 'Camden', 'Yarmouth', 'Falmouth', 'Augusta', 'Bar Harbor', 'Kennebunk', 'Lewiston', 'Cape Elizabeth']],
    MD: [39.1, -76.8, 6.2, ['Annapolis', 'Baltimore', 'Bethesda', 'Columbia', 'Frederick', 'Rockville', 'Silver Spring', 'Towson', 'Ellicott City', 'Salisbury', 'Hagerstown']],
    MA: [42.3, -71.5, 7.0, ['Concord', 'Lexington', 'Newton', 'Wellesley', 'Worcester', 'Northampton', 'Amherst', 'Andover', 'Brookline', 'Cambridge', 'Sudbury', 'Hingham', 'Lowell', 'Pittsfield', 'Falmouth', 'Needham', 'Acton']],
    MI: [42.8, -84.5, 10.1, ['Ann Arbor', 'Grand Rapids', 'Traverse City', 'Kalamazoo', 'Lansing', 'Marquette', 'Rochester Hills', 'Holland', 'Midland', 'Saline', 'Brighton', 'Rockford', 'Petoskey', 'Novi', 'Okemos']],
    MN: [45.0, -93.5, 5.7, ['Duluth', 'Rochester', 'Minneapolis', 'St. Paul', 'Edina', 'Stillwater', 'Northfield', 'Wayzata', 'Mankato', 'St. Cloud', 'Eden Prairie', 'Bemidji', 'Lakeville', 'Grand Marais']],
    MS: [32.6, -89.7, 2.96, ['Jackson', 'Oxford', 'Hattiesburg', 'Tupelo', 'Starkville', 'Biloxi', 'Madison', 'Ocean Springs']],
    MO: [38.4, -92.2, 6.2, ['St. Louis', 'Columbia', 'Kansas City', 'Springfield', 'Kirkwood', 'Webster Groves', 'Jefferson City', 'Cape Girardeau', 'Rolla', 'Chesterfield', "Lee's Summit", 'Joplin']],
    MT: [46.6, -110.9, 1.08, ['Missoula', 'Bozeman', 'Billings', 'Helena', 'Whitefish', 'Great Falls', 'Butte', 'Kalispell']],
    NE: [41.0, -97.0, 1.96, ['Omaha', 'Lincoln', 'Kearney', 'Grand Island', 'Norfolk', 'Papillion', 'Hastings', 'Scottsbluff']],
    NV: [36.4, -115.5, 3.1, ['Reno', 'Las Vegas', 'Henderson', 'Carson City', 'Elko', 'Sparks']],
    NH: [43.0, -71.5, 1.38, ['Hanover', 'Concord', 'Portsmouth', 'Nashua', 'Manchester', 'Keene', 'Exeter', 'Durham', 'Bedford', 'Plymouth']],
    NJ: [40.4, -74.4, 9.3, ['Princeton', 'Montclair', 'Morristown', 'Westfield', 'Ridgewood', 'Summit', 'Haddonfield', 'Cherry Hill', 'Red Bank', 'Hoboken', 'Toms River', 'New Brunswick', 'Moorestown']],
    NM: [34.6, -106.3, 2.1, ['Santa Fe', 'Albuquerque', 'Las Cruces', 'Taos', 'Los Alamos', 'Farmington', 'Silver City', 'Roswell']],
    NY: [41.6, -74.6, 20.2, ['Ithaca', 'Saratoga Springs', 'Buffalo', 'Rochester', 'Syracuse', 'Albany', 'Brooklyn', 'Lake Placid', 'Scarsdale', 'Huntington', 'Binghamton', 'Poughkeepsie', 'Pittsford', 'Fayetteville', 'Rye', 'Garden City', 'Utica', 'New Paltz', 'New York']],
    NC: [35.6, -79.5, 10.4, ['Asheville', 'Raleigh', 'Durham', 'Chapel Hill', 'Charlotte', 'Boone', 'Greensboro', 'Wilmington', 'Cary', 'Winston-Salem', 'Davidson', 'Hickory']],
    ND: [47.3, -99.0, 0.78, ['Fargo', 'Bismarck', 'Grand Forks', 'Minot', 'West Fargo', 'Dickinson', 'Jamestown']],
    OH: [40.5, -82.7, 11.8, ['Dayton', 'Hudson', 'Columbus', 'Cincinnati', 'Cleveland', 'Toledo', 'Akron', 'Oberlin', 'Athens', 'Dublin', 'Worthington', 'Westerville', 'Upper Arlington', 'Yellow Springs', 'Granville', 'Wooster', 'Mason', 'Shaker Heights']],
    OK: [35.6, -97.0, 4.0, ['Tulsa', 'Oklahoma City', 'Norman', 'Stillwater', 'Edmond', 'Broken Arrow', 'Bartlesville', 'Lawton']],
    OR: [44.7, -122.8, 4.2, ['Eugene', 'Bend', 'Portland', 'Corvallis', 'Ashland', 'Salem', 'Hood River', 'Beaverton', 'Lake Oswego', 'McMinnville', 'Medford', 'Sisters']],
    PA: [40.5, -77.0, 13.0, ['Erie', 'State College', 'Lancaster', 'Pittsburgh', 'Philadelphia', 'Harrisburg', 'Allentown', 'Bethlehem', 'Carlisle', 'Doylestown', 'Gettysburg', 'West Chester', 'Media', 'Williamsport', 'Scranton', 'York', 'Hershey']],
    RI: [41.8, -71.4, 1.1, ['Providence', 'Newport', 'Westerly', 'Barrington', 'Warwick', 'Cranston', 'East Greenwich', 'Narragansett']],
    SC: [34.0, -81.0, 5.1, ['Greenville', 'Charleston', 'Columbia', 'Clemson', 'Spartanburg', 'Rock Hill', 'Mount Pleasant', 'Beaufort', 'Aiken']],
    SD: [44.0, -98.0, 0.89, ['Sioux Falls', 'Rapid City', 'Brookings', 'Aberdeen', 'Vermillion', 'Spearfish', 'Pierre']],
    TN: [35.8, -86.4, 6.9, ['Chattanooga', 'Nashville', 'Knoxville', 'Memphis', 'Franklin', 'Murfreesboro', 'Johnson City', 'Sewanee', 'Brentwood', 'Cookeville']],
    TX: [30.9, -97.4, 29.1, ['Austin', 'Houston', 'Dallas', 'San Antonio', 'Plano', 'The Woodlands', 'Southlake', 'Fort Worth', 'El Paso', 'Lubbock', 'Round Rock', 'Waco', 'College Station', 'Katy', 'Frisco', 'Georgetown']],
    UT: [40.5, -111.8, 3.3, ['Salt Lake City', 'Provo', 'Ogden', 'Logan', 'Park City', 'St. George', 'Orem', 'Sandy', 'Cedar City']],
    VT: [44.1, -72.8, 0.64, ['Burlington', 'Montpelier', 'Middlebury', 'Brattleboro', 'Stowe', 'Rutland', 'Woodstock', 'St. Johnsbury', 'Essex']],
    VA: [38.0, -77.6, 8.6, ['Charlottesville', 'Richmond', 'Arlington', 'Alexandria', 'Blacksburg', 'Lexington', 'Roanoke', 'Williamsburg', 'Fairfax', 'Reston', 'Harrisonburg', 'Virginia Beach', 'Leesburg', 'Lynchburg']],
    WA: [47.3, -121.6, 7.7, ['Spokane', 'Seattle', 'Tacoma', 'Bellingham', 'Olympia', 'Walla Walla', 'Wenatchee', 'Bellevue', 'Redmond', 'Vancouver', 'Port Townsend', 'Yakima', 'Issaquah']],
    WV: [38.7, -80.8, 1.8, ['Morgantown', 'Charleston', 'Huntington', 'Shepherdstown', 'Wheeling', 'Parkersburg', 'Beckley', 'Fairmont']],
    WI: [43.7, -89.0, 5.9, ['Madison', 'Eau Claire', 'Milwaukee', 'La Crosse', 'Green Bay', 'Stevens Point', 'Appleton', 'Oshkosh', 'Whitefish Bay', 'Middleton', 'Wausau', 'Brookfield', 'Sheboygan', 'Kenosha']],
    WY: [42.8, -107.0, 0.58, ['Cheyenne', 'Laramie', 'Casper', 'Jackson', 'Sheridan', 'Cody', 'Lander']]
  };

  // [country, weight, cities]. Weights reflect how often each shows up on
  // Division III rosters: mostly Canada and the British Isles.
  const INTERNATIONAL = [
    ['Canada', 6, ['Toronto', 'Vancouver', 'Montreal', 'Ottawa', 'Calgary', 'Halifax', 'Guelph', 'Victoria', 'Winnipeg', 'Kingston']],
    ['England', 2.5, ['London', 'Manchester', 'Leeds', 'Bristol', 'Birmingham', 'Loughborough', 'Sheffield']],
    ['Scotland', 1, ['Edinburgh', 'Glasgow', 'Aberdeen', 'Inverness']],
    ['Ireland', 1.5, ['Dublin', 'Cork', 'Galway', 'Limerick']],
    ['Mexico', 1.5, ['Mexico City', 'Guadalajara', 'Monterrey', 'Puebla', 'Toluca']],
    ['Kenya', 1, ['Eldoret', 'Nairobi', 'Iten', 'Nakuru']],
    ['Germany', 1, ['Berlin', 'Munich', 'Hamburg', 'Cologne', 'Freiburg']],
    ['Netherlands', 0.6, ['Amsterdam', 'Utrecht', 'Rotterdam']],
    ['Norway', 0.6, ['Oslo', 'Bergen', 'Trondheim']],
    ['Sweden', 0.6, ['Stockholm', 'Gothenburg', 'Uppsala']],
    ['Denmark', 0.5, ['Copenhagen', 'Aarhus']],
    ['France', 0.6, ['Paris', 'Lyon', 'Bordeaux']],
    ['Spain', 0.6, ['Madrid', 'Barcelona', 'Valencia']],
    ['Switzerland', 0.4, ['Zurich', 'Geneva', 'Bern']],
    ['Australia', 1, ['Melbourne', 'Sydney', 'Brisbane', 'Perth', 'Canberra']],
    ['New Zealand', 0.6, ['Auckland', 'Wellington', 'Christchurch', 'Dunedin']],
    ['Japan', 0.6, ['Tokyo', 'Osaka', 'Sapporo', 'Kyoto']],
    ['South Korea', 0.5, ['Seoul', 'Busan']],
    ['China', 0.6, ['Shanghai', 'Beijing', 'Shenzhen']],
    ['India', 0.5, ['Bengaluru', 'Mumbai', 'Pune']],
    ['Brazil', 0.4, ['São Paulo', 'Rio de Janeiro', 'Curitiba']],
    ['Colombia', 0.4, ['Bogotá', 'Medellín']],
    ['Jamaica', 0.4, ['Kingston', 'Montego Bay']],
    ['Ghana', 0.3, ['Accra', 'Kumasi']],
    ['South Africa', 0.4, ['Cape Town', 'Johannesburg', 'Durban']]
  ];

  const INTL_RATE = 0.04;
  // Distance falloff: a state 450 km away is weighted ~37% of one next door,
  // and FLOOR keeps distant, populous states in the mix.
  const FALLOFF_KM = 450;
  const FLOOR = 0.06;

  const ABBRS = Object.keys(STATES);
  const REAL = new Set();
  ABBRS.forEach((abbr) => STATES[abbr][3].forEach((town) => REAL.add(`${town}, ${abbr}`)));
  INTERNATIONAL.forEach(([country, , cities]) => cities.forEach((city) => REAL.add(`${city}, ${country}`)));

  function weightedIndex(weights, rng) {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rng() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r < 0) return i;
    }
    return weights.length - 1;
  }

  const stateWeightCache = new Map();
  function stateWeights(near) {
    const ok = near && typeof near.lat === 'number' && typeof near.lon === 'number' && (near.lat || near.lon);
    const key = ok ? `${near.lat.toFixed(2)},${near.lon.toFixed(2)}` : 'national';
    if (!stateWeightCache.has(key)) {
      stateWeightCache.set(key, ABBRS.map((abbr) => {
        const [lat, lon, pop] = STATES[abbr];
        if (!ok) return pop;
        const d = U.haversineKm(near.lat, near.lon, lat, lon);
        return pop * (FLOOR + Math.exp(-d / FALLOFF_KM));
      }));
    }
    return stateWeightCache.get(key);
  }

  const P = {};

  // A real hometown, "Town, ST" or "City, Country". `near` is anything with
  // lat and lon (a school); without it, states are drawn by population alone.
  P.hometown = function (rng = Math.random, near = null) {
    if (rng() < INTL_RATE) {
      const [country, , cities] = INTERNATIONAL[weightedIndex(INTERNATIONAL.map((c) => c[1]), rng)];
      return `${U.pick(cities, rng)}, ${country}`;
    }
    const abbr = ABBRS[weightedIndex(stateWeights(near), rng)];
    return `${U.pick(STATES[abbr][3], rng)}, ${abbr}`;
  };

  P.isReal = (hometown) => REAL.has(hometown);

  XC.places = P;
})(window.XC = window.XC || {});
