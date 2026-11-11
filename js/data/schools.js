/* NCAA Division III cross country programs.
   Columns: id, full name, short name, mascot, conference, region, lat, lon,
   primary color, accent color, programs (M, W or MW), tier (1 = perennial power).
   Colors are approximations of each school's athletic palette. */
(function (XC) {
  'use strict';

  const ROWS = [
    // University Athletic Association
    ['washu', 'Washington University in St. Louis', 'WashU', 'Bears', 'UAA', 'Central', 38.648, -90.305, '#A51417', '#005F41', 'MW', 1],
    ['uchicago', 'University of Chicago', 'Chicago', 'Maroons', 'UAA', 'Midwest', 41.789, -87.600, '#800000', '#767676', 'MW', 1],
    ['emory', 'Emory University', 'Emory', 'Eagles', 'UAA', 'South/Southeast', 33.791, -84.324, '#012169', '#F2A900', 'MW', 2],
    ['case', 'Case Western Reserve University', 'Case Western', 'Spartans', 'UAA', 'Great Lakes', 41.504, -81.608, '#0A304E', '#8A9BA8', 'MW', 2],
    ['cmu', 'Carnegie Mellon University', 'Carnegie Mellon', 'Tartans', 'UAA', 'Mid-Atlantic', 40.443, -79.943, '#C41230', '#6D6E71', 'MW', 2],
    ['nyu', 'New York University', 'NYU', 'Violets', 'UAA', 'New York', 40.729, -73.996, '#57068C', '#B79FCB', 'MW', 2],
    ['rochester', 'University of Rochester', 'Rochester', 'Yellowjackets', 'UAA', 'New York', 43.128, -77.628, '#001E5F', '#FFD82B', 'MW', 2],
    ['brandeis', 'Brandeis University', 'Brandeis', 'Judges', 'UAA', 'New England', 42.366, -71.259, '#003478', '#7BAFD4', 'MW', 3],

    // NESCAC
    ['williams', 'Williams College', 'Williams', 'Ephs', 'NESCAC', 'New England', 42.712, -73.203, '#500082', '#FFBE0A', 'MW', 1],
    ['amherst', 'Amherst College', 'Amherst', 'Mammoths', 'NESCAC', 'New England', 42.370, -72.517, '#3F1F69', '#B7A57A', 'MW', 2],
    ['middlebury', 'Middlebury College', 'Middlebury', 'Panthers', 'NESCAC', 'New England', 44.008, -73.177, '#0D395F', '#8EB2D3', 'MW', 1],
    ['tufts', 'Tufts University', 'Tufts', 'Jumbos', 'NESCAC', 'New England', 42.407, -71.119, '#3E8EDE', '#512E1C', 'MW', 1],
    ['bowdoin', 'Bowdoin College', 'Bowdoin', 'Polar Bears', 'NESCAC', 'New England', 43.907, -69.964, '#1C1C1C', '#FFFFFF', 'MW', 2],
    ['bates', 'Bates College', 'Bates', 'Bobcats', 'NESCAC', 'New England', 44.106, -70.203, '#881124', '#2B2B2B', 'MW', 3],
    ['colby', 'Colby College', 'Colby', 'Mules', 'NESCAC', 'New England', 44.564, -69.663, '#002878', '#8FA7C9', 'MW', 3],
    ['hamilton', 'Hamilton College', 'Hamilton', 'Continentals', 'NESCAC', 'New York', 43.051, -75.403, '#002F86', '#E1C68A', 'MW', 3],
    ['wesleyan', 'Wesleyan University', 'Wesleyan', 'Cardinals', 'NESCAC', 'New England', 41.556, -72.656, '#CE0E2D', '#1F1F1F', 'MW', 3],
    ['trinityct', 'Trinity College (CT)', 'Trinity (CT)', 'Bantams', 'NESCAC', 'New England', 41.747, -72.690, '#002A5C', '#F0B323', 'MW', 3],
    ['conncoll', 'Connecticut College', 'Conn College', 'Camels', 'NESCAC', 'New England', 41.379, -72.104, '#002855', '#7FA7D0', 'MW', 3],

    // CCIW
    ['northcentral', 'North Central College', 'North Central', 'Cardinals', 'CCIW', 'Midwest', 41.774, -88.143, '#C8102E', '#FFFFFF', 'MW', 1],
    ['wheatonil', 'Wheaton College (IL)', 'Wheaton (IL)', 'Thunder', 'CCIW', 'Midwest', 41.870, -88.099, '#E35205', '#003366', 'MW', 2],
    ['iwu', 'Illinois Wesleyan University', 'Illinois Wesleyan', 'Titans', 'CCIW', 'Midwest', 40.490, -88.990, '#006747', '#B3D9C6', 'MW', 3],
    ['augustanail', 'Augustana College (IL)', 'Augustana', 'Vikings', 'CCIW', 'Midwest', 41.503, -90.551, '#003DA5', '#FFC72C', 'MW', 2],
    ['carthage', 'Carthage College', 'Carthage', 'Firebirds', 'CCIW', 'Midwest', 42.623, -87.821, '#D50032', '#1F1F1F', 'MW', 3],
    ['elmhurst', 'Elmhurst University', 'Elmhurst', 'Bluejays', 'CCIW', 'Midwest', 41.899, -87.943, '#003DA5', '#9BB8E3', 'MW', 3],
    ['millikin', 'Millikin University', 'Millikin', 'Big Blue', 'CCIW', 'Midwest', 39.849, -88.978, '#00337F', '#A2AAAD', 'MW', 3],
    ['northpark', 'North Park University', 'North Park', 'Vikings', 'CCIW', 'Midwest', 41.980, -87.712, '#003F87', '#FFC72C', 'MW', 3],

    // WIAC
    ['uwl', 'University of Wisconsin–La Crosse', 'UW–La Crosse', 'Eagles', 'WIAC', 'Midwest', 43.815, -91.233, '#8C1D40', '#A2AAAD', 'MW', 1],
    ['uwec', 'University of Wisconsin–Eau Claire', 'UW–Eau Claire', 'Blugolds', 'WIAC', 'Midwest', 44.799, -91.500, '#002F6C', '#FFC72C', 'MW', 2],
    ['uwosh', 'University of Wisconsin–Oshkosh', 'UW–Oshkosh', 'Titans', 'WIAC', 'Midwest', 44.025, -88.552, '#1F1F1F', '#FFB81C', 'MW', 2],
    ['uwsp', 'University of Wisconsin–Stevens Point', 'UW–Stevens Point', 'Pointers', 'WIAC', 'Midwest', 44.528, -89.570, '#4B2E84', '#FFC72C', 'MW', 2],
    ['uww', 'University of Wisconsin–Whitewater', 'UW–Whitewater', 'Warhawks', 'WIAC', 'Midwest', 42.840, -88.744, '#4B2E83', '#A7A8AA', 'MW', 3],
    ['uwp', 'University of Wisconsin–Platteville', 'UW–Platteville', 'Pioneers', 'WIAC', 'Midwest', 42.735, -90.477, '#F47920', '#002D62', 'MW', 3],
    ['uwstout', 'University of Wisconsin–Stout', 'UW–Stout', 'Blue Devils', 'WIAC', 'Midwest', 44.875, -91.925, '#003C71', '#8DB9E2', 'MW', 3],
    ['uwrf', 'University of Wisconsin–River Falls', 'UW–River Falls', 'Falcons', 'WIAC', 'Midwest', 44.853, -92.623, '#C8102E', '#1F1F1F', 'MW', 3],

    // MIAC
    ['carleton', 'Carleton College', 'Carleton', 'Knights', 'MIAC', 'Central', 44.461, -93.155, '#003069', '#FFD100', 'MW', 1],
    ['stolaf', 'St. Olaf College', 'St. Olaf', 'Oles', 'MIAC', 'Central', 44.462, -93.183, '#1F1F1F', '#FFC72C', 'MW', 2],
    ['sju', "Saint John's University", "Saint John's", 'Johnnies', 'MIAC', 'Central', 45.581, -94.392, '#B11F24', '#1F1F1F', 'M', 2],
    ['csb', 'College of Saint Benedict', 'Saint Benedict', 'Bennies', 'MIAC', 'Central', 45.559, -94.320, '#C8102E', '#A2AAAD', 'W', 2],
    ['gustavus', 'Gustavus Adolphus College', 'Gustavus', 'Gusties', 'MIAC', 'Central', 44.323, -93.973, '#1F1F1F', '#FFC72C', 'MW', 2],
    ['macalester', 'Macalester College', 'Macalester', 'Scots', 'MIAC', 'Central', 44.938, -93.168, '#F26522', '#01426A', 'MW', 3],
    ['hamline', 'Hamline University', 'Hamline', 'Pipers', 'MIAC', 'Central', 44.965, -93.164, '#A6192E', '#A2AAAD', 'MW', 3],
    ['bethel', 'Bethel University (MN)', 'Bethel', 'Royals', 'MIAC', 'Central', 45.054, -93.165, '#003865', '#FFC72C', 'MW', 3],
    ['cord', 'Concordia College (MN)', 'Concordia (MN)', 'Cobbers', 'MIAC', 'Central', 46.866, -96.770, '#8C2332', '#FFC72C', 'MW', 3],

    // American Rivers
    ['wartburg', 'Wartburg College', 'Wartburg', 'Knights', 'American Rivers', 'Central', 42.731, -92.484, '#F47920', '#1F1F1F', 'MW', 1],
    ['luther', 'Luther College', 'Luther', 'Norse', 'American Rivers', 'Central', 43.313, -91.805, '#003E7E', '#8DB9E2', 'MW', 2],
    ['loras', 'Loras College', 'Loras', 'Duhawks', 'American Rivers', 'Central', 42.504, -90.674, '#4F2D7F', '#FFC72C', 'MW', 2],
    ['coe', 'Coe College', 'Coe', 'Kohawks', 'American Rivers', 'Central', 41.989, -91.656, '#A6192E', '#A7A8AA', 'MW', 3],
    ['centraliowa', 'Central College (IA)', 'Central (IA)', 'Dutch', 'American Rivers', 'Central', 41.405, -92.919, '#D50032', '#1F1F1F', 'MW', 2],
    ['simpson', 'Simpson College', 'Simpson', 'Storm', 'American Rivers', 'Central', 41.367, -93.565, '#B20837', '#FFD100', 'MW', 3],
    ['dubuque', 'University of Dubuque', 'Dubuque', 'Spartans', 'American Rivers', 'Central', 42.493, -90.689, '#003865', '#A6192E', 'MW', 3],
    ['buenavista', 'Buena Vista University', 'Buena Vista', 'Beavers', 'American Rivers', 'Central', 42.643, -95.205, '#002D72', '#FFC72C', 'MW', 3],

    // Centennial
    ['jhu', 'Johns Hopkins University', 'Johns Hopkins', 'Blue Jays', 'Centennial', 'Mid-Atlantic', 39.329, -76.620, '#002D72', '#68ACE5', 'MW', 1],
    ['haverford', 'Haverford College', 'Haverford', 'Fords', 'Centennial', 'Mid-Atlantic', 40.008, -75.306, '#A6192E', '#1F1F1F', 'MW', 2],
    ['swarthmore', 'Swarthmore College', 'Swarthmore', 'Garnet', 'Centennial', 'Mid-Atlantic', 39.905, -75.354, '#7A0019', '#A2AAAD', 'MW', 3],
    ['dickinson', 'Dickinson College', 'Dickinson', 'Red Devils', 'Centennial', 'Mid-Atlantic', 40.202, -77.198, '#C8102E', '#F2C6CE', 'MW', 2],
    ['ursinus', 'Ursinus College', 'Ursinus', 'Bears', 'Centennial', 'Mid-Atlantic', 40.192, -75.456, '#A6192E', '#FFC72C', 'MW', 3],
    ['gettysburg', 'Gettysburg College', 'Gettysburg', 'Bullets', 'Centennial', 'Mid-Atlantic', 39.835, -77.233, '#FF6900', '#003DA5', 'MW', 3],
    ['fandm', 'Franklin & Marshall College', 'Franklin & Marshall', 'Diplomats', 'Centennial', 'Mid-Atlantic', 40.047, -76.319, '#002D72', '#8DB9E2', 'MW', 3],
    ['muhlenberg', 'Muhlenberg College', 'Muhlenberg', 'Mules', 'Centennial', 'Mid-Atlantic', 40.598, -75.511, '#A6192E', '#A2AAAD', 'MW', 3],
    ['mcdaniel', 'McDaniel College', 'McDaniel', 'Green Terror', 'Centennial', 'Mid-Atlantic', 39.578, -77.000, '#00543C', '#FFC72C', 'MW', 3],

    // SCIAC
    ['pomonapitzer', 'Pomona-Pitzer Colleges', 'Pomona-Pitzer', 'Sagehens', 'SCIAC', 'West', 34.098, -117.712, '#0057B8', '#F78F1E', 'MW', 1],
    ['cms', 'Claremont-Mudd-Scripps', 'Claremont-Mudd-Scripps', 'Stags & Athenas', 'SCIAC', 'West', 34.101, -117.708, '#8C1D40', '#FFC72C', 'MW', 1],
    ['oxy', 'Occidental College', 'Occidental', 'Tigers', 'SCIAC', 'West', 34.127, -118.211, '#EB5F0C', '#1F1F1F', 'MW', 3],
    ['redlands', 'University of Redlands', 'Redlands', 'Bulldogs', 'SCIAC', 'West', 34.063, -117.164, '#A6192E', '#A2AAAD', 'MW', 3],
    ['callutheran', 'California Lutheran University', 'Cal Lutheran', 'Kingsmen & Regals', 'SCIAC', 'West', 34.225, -118.877, '#4F2D7F', '#FFC72C', 'MW', 3],
    ['whittier', 'Whittier College', 'Whittier', 'Poets', 'SCIAC', 'West', 33.977, -118.031, '#4F2D7F', '#D5A022', 'MW', 3],
    ['laverne', 'University of La Verne', 'La Verne', 'Leopards', 'SCIAC', 'West', 34.101, -117.769, '#00573F', '#FF8200', 'MW', 3],
    ['caltech', 'California Institute of Technology', 'Caltech', 'Beavers', 'SCIAC', 'West', 34.138, -118.125, '#FF6C0C', '#3A3A3A', 'MW', 3],

    // Northwest Conference
    ['whitworth', 'Whitworth University', 'Whitworth', 'Pirates', 'NWC', 'West', 47.753, -117.418, '#C8102E', '#1F1F1F', 'MW', 2],
    ['georgefox', 'George Fox University', 'George Fox', 'Bruins', 'NWC', 'West', 45.304, -122.973, '#002D72', '#B3A369', 'MW', 2],
    ['pugetsound', 'University of Puget Sound', 'Puget Sound', 'Loggers', 'NWC', 'West', 47.262, -122.481, '#8C1D40', '#A2AAAD', 'MW', 3],
    ['linfield', 'Linfield University', 'Linfield', 'Wildcats', 'NWC', 'West', 45.204, -123.199, '#4F2D7F', '#E21833', 'MW', 3],
    ['willamette', 'Willamette University', 'Willamette', 'Bearcats', 'NWC', 'West', 44.937, -123.031, '#8C1D40', '#FFC72C', 'MW', 3],
    ['plu', 'Pacific Lutheran University', 'Pacific Lutheran', 'Lutes', 'NWC', 'West', 47.146, -122.444, '#1F1F1F', '#FFC72C', 'MW', 3],
    ['lewisclark', 'Lewis & Clark College', 'Lewis & Clark', 'Pioneers', 'NWC', 'West', 45.451, -122.670, '#F47920', '#1F1F1F', 'MW', 3],
    ['whitman', 'Whitman College', 'Whitman', 'Blues', 'NWC', 'West', 46.071, -118.329, '#003865', '#FFC72C', 'MW', 3],
    ['pacificu', 'Pacific University', 'Pacific (OR)', 'Boxers', 'NWC', 'West', 45.521, -123.109, '#C8102E', '#1F1F1F', 'MW', 3],

    // North Coast Athletic Conference
    ['kenyon', 'Kenyon College', 'Kenyon', 'Owls', 'NCAC', 'Great Lakes', 40.375, -82.397, '#4F2D7F', '#C9B2E6', 'MW', 3],
    ['denison', 'Denison University', 'Denison', 'Big Red', 'NCAC', 'Great Lakes', 40.074, -82.520, '#C8102E', '#A2AAAD', 'MW', 2],
    ['wooster', 'The College of Wooster', 'Wooster', 'Fighting Scots', 'NCAC', 'Great Lakes', 40.809, -81.937, '#FFB81C', '#1F1F1F', 'MW', 3],
    ['oberlin', 'Oberlin College', 'Oberlin', 'Yeomen & Yeowomen', 'NCAC', 'Great Lakes', 41.293, -82.222, '#A6192E', '#FFC72C', 'MW', 3],
    ['owu', 'Ohio Wesleyan University', 'Ohio Wesleyan', 'Battling Bishops', 'NCAC', 'Great Lakes', 40.296, -83.068, '#C8102E', '#1F1F1F', 'MW', 3],
    ['wabash', 'Wabash College', 'Wabash', 'Little Giants', 'NCAC', 'Great Lakes', 40.037, -86.906, '#A6192E', '#A2AAAD', 'M', 2],
    ['depauw', 'DePauw University', 'DePauw', 'Tigers', 'NCAC', 'Great Lakes', 39.640, -86.863, '#1F1F1F', '#FFC72C', 'MW', 2],
    ['allegheny', 'Allegheny College', 'Allegheny', 'Gators', 'NCAC', 'Great Lakes', 41.649, -80.143, '#00205B', '#FFC72C', 'MW', 3],
    ['wittenberg', 'Wittenberg University', 'Wittenberg', 'Tigers', 'NCAC', 'Great Lakes', 39.933, -83.814, '#C8102E', '#A2AAAD', 'MW', 3],

    // MIAA
    ['calvin', 'Calvin University', 'Calvin', 'Knights', 'MIAA', 'Great Lakes', 42.931, -85.588, '#8C2332', '#FFC72C', 'MW', 1],
    ['hope', 'Hope College', 'Hope', 'Flying Dutch', 'MIAA', 'Great Lakes', 42.787, -86.103, '#003DA5', '#FF6A13', 'MW', 2],
    ['albion', 'Albion College', 'Albion', 'Britons', 'MIAA', 'Great Lakes', 42.244, -84.751, '#4F2D7F', '#FFC72C', 'MW', 3],
    ['alma', 'Alma College', 'Alma', 'Scots', 'MIAA', 'Great Lakes', 43.384, -84.660, '#8C2332', '#C9B37E', 'MW', 3],
    ['kzoo', 'Kalamazoo College', 'Kalamazoo', 'Hornets', 'MIAA', 'Great Lakes', 42.290, -85.600, '#FF8200', '#1F1F1F', 'MW', 3],
    ['trine', 'Trine University', 'Trine', 'Thunder', 'MIAA', 'Great Lakes', 41.635, -85.004, '#003865', '#A2AAAD', 'MW', 3],
    ['olivet', 'University of Olivet', 'Olivet', 'Comets', 'MIAA', 'Great Lakes', 42.441, -84.925, '#C8102E', '#A2AAAD', 'MW', 3],
    ['adrian', 'Adrian College', 'Adrian', 'Bulldogs', 'MIAA', 'Great Lakes', 41.900, -84.047, '#1F1F1F', '#FFB81C', 'MW', 3],

    // Liberty League
    ['rpi', 'Rensselaer Polytechnic Institute', 'RPI', 'Engineers', 'Liberty League', 'New York', 42.730, -73.677, '#D6001C', '#A2AAAD', 'MW', 2],
    ['vassar', 'Vassar College', 'Vassar', 'Brewers', 'Liberty League', 'New York', 41.687, -73.897, '#7A1F3D', '#A2AAAD', 'MW', 3],
    ['rit', 'Rochester Institute of Technology', 'RIT', 'Tigers', 'Liberty League', 'New York', 43.084, -77.674, '#F76902', '#1F1F1F', 'MW', 2],
    ['skidmore', 'Skidmore College', 'Skidmore', 'Thoroughbreds', 'Liberty League', 'New York', 43.096, -73.783, '#00573F', '#FFC72C', 'MW', 3],
    ['stlawrence', 'St. Lawrence University', 'St. Lawrence', 'Saints', 'Liberty League', 'New York', 44.590, -75.161, '#A6192E', '#5C3A21', 'MW', 3],
    ['union', 'Union College', 'Union', 'Garnet Chargers', 'Liberty League', 'New York', 42.818, -73.930, '#822433', '#A2AAAD', 'MW', 3],
    ['hws', 'Hobart and William Smith Colleges', 'Hobart & William Smith', 'Statesmen & Herons', 'Liberty League', 'New York', 42.858, -76.987, '#4B2E83', '#F58025', 'MW', 3],
    ['clarkson', 'Clarkson University', 'Clarkson', 'Golden Knights', 'Liberty League', 'New York', 44.664, -74.999, '#004E42', '#FFCD00', 'MW', 3],
    ['ithaca', 'Ithaca College', 'Ithaca', 'Bombers', 'Liberty League', 'New York', 42.422, -76.497, '#003C71', '#FFC72C', 'MW', 2],

    // SUNYAC
    ['geneseo', 'SUNY Geneseo', 'Geneseo', 'Knights', 'SUNYAC', 'New York', 42.796, -77.817, '#003DA5', '#8DB9E2', 'MW', 2],
    ['cortland', 'SUNY Cortland', 'Cortland', 'Red Dragons', 'SUNYAC', 'New York', 42.600, -76.188, '#C8102E', '#A2AAAD', 'MW', 2],
    ['oneonta', 'SUNY Oneonta', 'Oneonta', 'Red Dragons', 'SUNYAC', 'New York', 42.469, -75.064, '#C8102E', '#1F1F1F', 'MW', 3],
    ['brockport', 'SUNY Brockport', 'Brockport', 'Golden Eagles', 'SUNYAC', 'New York', 43.212, -77.951, '#00533E', '#FFC72C', 'MW', 3],
    ['fredonia', 'SUNY Fredonia', 'Fredonia', 'Blue Devils', 'SUNYAC', 'New York', 42.450, -79.333, '#003DA5', '#A2AAAD', 'MW', 3],
    ['newpaltz', 'SUNY New Paltz', 'New Paltz', 'Hawks', 'SUNYAC', 'New York', 41.741, -74.083, '#F47920', '#003DA5', 'MW', 3],
    ['oswego', 'SUNY Oswego', 'Oswego', 'Lakers', 'SUNYAC', 'New York', 43.453, -76.542, '#00533E', '#FFC72C', 'MW', 3],
    ['plattsburgh', 'SUNY Plattsburgh', 'Plattsburgh', 'Cardinals', 'SUNYAC', 'New York', 44.693, -73.467, '#C8102E', '#003865', 'MW', 3],

    // NEWMAC
    ['mit', 'Massachusetts Institute of Technology', 'MIT', 'Engineers', 'NEWMAC', 'New England', 42.360, -71.094, '#A31F34', '#8A8B8C', 'MW', 1],
    ['wpi', 'Worcester Polytechnic Institute', 'WPI', 'Engineers', 'NEWMAC', 'New England', 42.274, -71.808, '#AC2B37', '#A9B0B7', 'MW', 3],
    ['coastguard', 'U.S. Coast Guard Academy', 'Coast Guard', 'Bears', 'NEWMAC', 'New England', 41.374, -72.098, '#002D72', '#FF8200', 'MW', 3],
    ['springfield', 'Springfield College', 'Springfield', 'Pride', 'NEWMAC', 'New England', 42.103, -72.555, '#8C2332', '#A2AAAD', 'MW', 3],
    ['wellesley', 'Wellesley College', 'Wellesley', 'Blue', 'NEWMAC', 'New England', 42.294, -71.306, '#002776', '#A7C6ED', 'W', 3],
    ['smith', 'Smith College', 'Smith', 'Pioneers', 'NEWMAC', 'New England', 42.318, -72.638, '#004F9F', '#F2A900', 'W', 3],
    ['mtholyoke', 'Mount Holyoke College', 'Mount Holyoke', 'Lyons', 'NEWMAC', 'New England', 42.256, -72.574, '#003865', '#8DB9E2', 'W', 3],
    ['babson', 'Babson College', 'Babson', 'Beavers', 'NEWMAC', 'New England', 42.297, -71.264, '#006A4E', '#A2AAAD', 'MW', 3],
    ['wheatonma', 'Wheaton College (MA)', 'Wheaton (MA)', 'Lyons', 'NEWMAC', 'New England', 41.966, -71.183, '#002D72', '#8DB9E2', 'MW', 3],

    // ODAC
    ['wlu', 'Washington and Lee University', 'Washington and Lee', 'Generals', 'ODAC', 'South/Southeast', 37.788, -79.443, '#002D72', '#8DB9E2', 'MW', 2],
    ['lynchburg', 'University of Lynchburg', 'Lynchburg', 'Hornets', 'ODAC', 'South/Southeast', 37.401, -79.183, '#A6192E', '#A2AAAD', 'MW', 2],
    ['roanoke', 'Roanoke College', 'Roanoke', 'Maroons', 'ODAC', 'South/Southeast', 37.293, -80.054, '#861F41', '#A2AAAD', 'MW', 3],
    ['vwu', 'Virginia Wesleyan University', 'Virginia Wesleyan', 'Marlins', 'ODAC', 'South/Southeast', 36.869, -76.183, '#003865', '#A2AAAD', 'MW', 3],
    ['bridgewater', 'Bridgewater College', 'Bridgewater', 'Eagles', 'ODAC', 'South/Southeast', 38.379, -78.968, '#A6192E', '#FFB81C', 'MW', 3],
    ['rmc', 'Randolph-Macon College', 'Randolph-Macon', 'Yellow Jackets', 'ODAC', 'South/Southeast', 37.758, -77.475, '#1D1D1B', '#FFC72C', 'MW', 3],
    ['emu', 'Eastern Mennonite University', 'Eastern Mennonite', 'Royals', 'ODAC', 'South/Southeast', 38.468, -78.881, '#003DA5', '#A2AAAD', 'MW', 3],
    ['cnu', 'Christopher Newport University', 'Christopher Newport', 'Captains', 'ODAC', 'South/Southeast', 37.064, -76.494, '#002D72', '#A2AAAD', 'MW', 2],

    // Southern Athletic Association
    ['centre', 'Centre College', 'Centre', 'Colonels', 'SAA', 'South/Southeast', 37.646, -84.776, '#EAAA00', '#1D1D1B', 'MW', 3],
    ['sewanee', 'Sewanee: The University of the South', 'Sewanee', 'Tigers', 'SAA', 'South/Southeast', 35.205, -85.921, '#4F2D7F', '#FFC72C', 'MW', 3],
    ['berry', 'Berry College', 'Berry', 'Vikings', 'SAA', 'South/Southeast', 34.289, -85.188, '#002D72', '#A2AAAD', 'MW', 3],
    ['rhodes', 'Rhodes College', 'Rhodes', 'Lynx', 'SAA', 'South/Southeast', 35.155, -89.990, '#A6192E', '#1F1F1F', 'MW', 3],
    ['hendrix', 'Hendrix College', 'Hendrix', 'Warriors', 'SAA', 'South/Southeast', 35.099, -92.441, '#FF8200', '#1F1F1F', 'MW', 3],
    ['oglethorpe', 'Oglethorpe University', 'Oglethorpe', 'Stormy Petrels', 'SAA', 'South/Southeast', 33.874, -84.333, '#1D1D1B', '#B3A369', 'MW', 3],
    ['trinitytx', 'Trinity University (TX)', 'Trinity (TX)', 'Tigers', 'SAA', 'South/Southeast', 29.462, -98.483, '#800000', '#A2AAAD', 'MW', 2],

    // NJAC
    ['tcnj', 'The College of New Jersey', 'TCNJ', 'Lions', 'NJAC', 'Mid-Atlantic', 40.268, -74.779, '#002D72', '#FFC72C', 'MW', 2],
    ['rowan', 'Rowan University', 'Rowan', 'Profs', 'NJAC', 'Mid-Atlantic', 39.710, -75.119, '#5D3A1A', '#FFC72C', 'MW', 3],
    ['stockton', 'Stockton University', 'Stockton', 'Ospreys', 'NJAC', 'Mid-Atlantic', 39.491, -74.528, '#002D72', '#A2AAAD', 'MW', 3],
    ['ramapo', 'Ramapo College', 'Ramapo', 'Roadrunners', 'NJAC', 'Mid-Atlantic', 41.082, -74.174, '#A6192E', '#1F1F1F', 'MW', 3],
    ['montclair', 'Montclair State University', 'Montclair State', 'Red Hawks', 'NJAC', 'Mid-Atlantic', 40.864, -74.198, '#C8102E', '#1F1F1F', 'MW', 3],
    ['kean', 'Kean University', 'Kean', 'Cougars', 'NJAC', 'Mid-Atlantic', 40.678, -74.235, '#002D72', '#A2AAAD', 'MW', 3],
    ['wpunj', 'William Paterson University', 'William Paterson', 'Pioneers', 'NJAC', 'Mid-Atlantic', 40.951, -74.197, '#F47920', '#1F1F1F', 'MW', 3]
  ];

  const list = ROWS.map(([id, name, short, mascot, conf, region, lat, lon, primary, accent, programs, tier]) => ({
    id, name, short, mascot, conf, region, lat, lon, primary, accent, programs, tier
  }));

  const byId = new Map(list.map((s) => [s.id, s]));

  const REGIONS = ['Central', 'Great Lakes', 'Mid-Atlantic', 'Midwest', 'New England', 'New York', 'South/Southeast', 'West'];
  const CONFERENCES = Array.from(new Set(list.map((s) => s.conf))).sort();

  XC.schools = {
    list,
    REGIONS,
    CONFERENCES,
    byId: (id) => byId.get(id) || null,
    offers: (school, squad) => school.programs.includes(squad),
    // Average coordinates of a conference, used to place custom schools on the map.
    confCenter(conf) {
      const members = list.filter((s) => s.conf === conf);
      if (!members.length) return { lat: 39.8, lon: -89.6 };
      return {
        lat: members.reduce((a, s) => a + s.lat, 0) / members.length,
        lon: members.reduce((a, s) => a + s.lon, 0) / members.length
      };
    }
  };
})(window.XC = window.XC || {});
