/* Local name pools: fallbacks when randomuser.me is unreachable, and the
   source for opponent runners and meet names. */
(function (XC) {
  'use strict';

  XC.names = {
    male: [
      'Aiden', 'Ben', 'Caleb', 'Carter', 'Charlie', 'Cole', 'Connor', 'Daniel', 'Declan', 'Eli', 'Ethan', 'Evan',
      'Finn', 'Gabe', 'Grant', 'Gus', 'Henry', 'Isaac', 'Jack', 'Jake', 'Jonah', 'Julian', 'Kai', 'Liam', 'Logan',
      'Luke', 'Marcus', 'Mateo', 'Max', 'Micah', 'Miles', 'Nate', 'Noah', 'Owen', 'Parker', 'Quinn', 'Reid', 'Ryan',
      'Sam', 'Sawyer', 'Silas', 'Theo', 'Tyler', 'Wes', 'Will', 'Xavier', 'Zach', 'Andre', 'Bryce', 'Dev', 'Emmett',
      'Hayden', 'Jalen', 'Kieran', 'Malik', 'Omar', 'Rafael', 'Tomas', 'Wyatt', 'Yusuf'
    ],
    female: [
      'Abby', 'Addison', 'Ava', 'Bella', 'Brooke', 'Callie', 'Chloe', 'Claire', 'Dani', 'Eden', 'Ella', 'Emma',
      'Erin', 'Grace', 'Hannah', 'Harper', 'Iris', 'Isla', 'Ivy', 'Jade', 'Josie', 'Kate', 'Kenzie', 'Lena', 'Lila',
      'Lucy', 'Maddie', 'Maya', 'Mia', 'Molly', 'Nora', 'Olivia', 'Paige', 'Piper', 'Quinn', 'Reese', 'Riley',
      'Rosa', 'Ruby', 'Sadie', 'Sage', 'Sofia', 'Stella', 'Tess', 'Willa', 'Zoe', 'Amara', 'Bianca', 'Celeste',
      'Daria', 'Esme', 'Fiona', 'Greta', 'Imani', 'Juniper', 'Keira', 'Leah', 'Noelle', 'Priya', 'Talia'
    ],
    last: [
      'Abbott', 'Alvarez', 'Bauer', 'Bennett', 'Brooks', 'Burke', 'Caldwell', 'Carver', 'Chen', 'Collins', 'Cruz',
      'Dalton', 'Diaz', 'Doyle', 'Ellis', 'Erickson', 'Fischer', 'Fleming', 'Foster', 'Garcia', 'Gibson', 'Grady',
      'Hale', 'Hansen', 'Hayes', 'Holt', 'Hughes', 'Iverson', 'Jensen', 'Kaplan', 'Keller', 'Kim', 'Kowalski',
      'Larsen', 'Lindqvist', 'Lopez', 'Maddox', 'Marsh', 'McAllister', 'Meyer', 'Morales', 'Nakamura', 'Nguyen',
      'Novak', "O'Brien", 'Olsen', 'Ortiz', 'Patel', 'Pierce', 'Quigley', 'Ramirez', 'Reyes', 'Rhodes', 'Rios',
      'Sato', 'Schmidt', 'Shaw', 'Sorensen', 'Stone', 'Sullivan', 'Thatcher', 'Torres', 'Underwood', 'Vance',
      'Vasquez', 'Walsh', 'Ward', 'Weber', 'Whitaker', 'Wilder', 'Yates', 'Young', 'Zimmerman', 'Abernathy',
      'Becker', 'Castillo', 'Delgado', 'Eastman', 'Ferreira', 'Gallagher', 'Haddad', 'Ishikawa', 'Jovanovic',
      'Kruger', 'Lachance', 'Mbeki', 'Nilsen', 'Okafor', 'Petrov', 'Rasmussen', 'Strand', 'Toivonen', 'Varga'
    ],
    hometowns: [
      'Boulder, CO', 'Flagstaff, AZ', 'Eugene, OR', 'Bend, OR', 'Spokane, WA', 'Missoula, MT', 'Boise, ID',
      'Madison, WI', 'Eau Claire, WI', 'Duluth, MN', 'Rochester, MN', 'Ames, IA', 'Dubuque, IA', 'Naperville, IL',
      'Evanston, IL', 'Peoria, IL', 'St. Louis, MO', 'Columbia, MO', 'Lawrence, KS', 'Omaha, NE', 'Ann Arbor, MI',
      'Grand Rapids, MI', 'Traverse City, MI', 'Bloomington, IN', 'Carmel, IN', 'Dayton, OH', 'Hudson, OH',
      'Erie, PA', 'State College, PA', 'Lancaster, PA', 'Ithaca, NY', 'Saratoga Springs, NY', 'Buffalo, NY',
      'Burlington, VT', 'Hanover, NH', 'Portland, ME', 'Concord, MA', 'Providence, RI', 'New Haven, CT',
      'Princeton, NJ', 'Annapolis, MD', 'Charlottesville, VA', 'Asheville, NC', 'Chattanooga, TN', 'Athens, GA',
      'Lexington, KY', 'Austin, TX', 'Santa Fe, NM', 'San Luis Obispo, CA', 'Davis, CA', 'Pasadena, CA',
      'Salt Lake City, UT', 'Anchorage, AK', 'Fargo, ND', 'Sioux Falls, SD', 'Little Rock, AR', 'Mobile, AL'
    ],
    stateAbbr: {
      Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO', Connecticut: 'CT',
      Delaware: 'DE', Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA',
      Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI',
      Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV',
      'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC',
      'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI',
      'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT',
      Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY'
    },
    invitePrefix: [
      'Harvest Moon', 'Lakefront', 'Pumpkin Run', 'Gold Leaf', 'Hilltop', 'Red Barn', 'Maple Leaf', 'Bluff Country',
      'Cider Mill', 'Prairie Fire', 'Timberline', 'Covered Bridge', 'Iron Horse', 'Crimson Oak', 'Frost Line',
      'Corn Maze', 'Riverbend', 'Haybale', 'Lighthouse', 'Old Orchard', 'Granite State', 'Big Sky', 'Pine Needle',
      'Lantern Light', 'Fox Hollow'
    ],
    inviteSuffix: ['Invitational', 'Classic', 'Challenge', 'Open', 'Shootout', 'Opener', 'Gathering'],
    coursePrefix: [
      'Pine Hollow', 'Prairie Ridge', 'Hawk Hill', 'Cedar Bend', 'Willow Creek', 'Stonegate', 'Elk Run', 'Bur Oak',
      'Blackberry Farm', 'Tamarack', 'Heron Marsh', 'Copper Ridge', 'Fern Valley', 'Quarry Lake', 'Windmill Hill'
    ],
    courseSuffix: ['Golf Course', 'Park', 'Farm', 'Preserve', 'Fairgrounds', 'Arboretum', 'Nature Center', 'Meadows'],
    nationalVenues: [
      'Lake Breeze Golf Club', 'LaVern Gibson Championship Course', 'Hawk Hollow Fields', 'Prairie Dunes Fairgrounds',
      'Thunder Ridge Farm', 'Glacier Bluffs Park'
    ]
  };
})(window.XC = window.XC || {});
