/* Real home courses, researched from each school's athletics site, meet
   results and published course maps. Keyed by course, since schools can
   share a venue. A school with no verified course keeps a generated venue;
   never enter a course that couldn't be verified.

   Course fields:
     name, city, state       where it is
     type                    flat, rolling, hilly or mud (race profile)
     kind                    'loop' or 'point'
     climbPerKm?             meters of climb per km, when a source gives it
     features                short notes shown nowhere yet, kept for later use
     confidence              'high' or 'medium', with the reason in notes
     sources                 URLs for every fact above
     trace?                  the route traced from the course map:
       mapSource             URL of the map it was traced from
       rotate?               degrees to turn the trace so it fits 16:9
       legs                  { id: { pts: [[x, y], ...], closed? } } in the
                             tracer's own coordinates, y down, drawn in the
                             direction runners go
       races                 { M, W }: { label, path: [segment, ...] }
                             segment: { leg, from?, to?, laps?, reverse? },
                             with from/to as leg fractions or [x, y] points
       hills?                [{ x, y, r, h }] where the map shows climbs
       layoutLabel, describe text for the meet preview
   Ship only names, facts and our own traced points, never map images. */
(function (XC) {
  'use strict';

  const COURSES = {
    // Traced from UR's map for the 2021 UAA Championships. RIT's map for the
    // 2025 Niagara Regional shows the same route.
    'genesee-valley-park': {
      name: 'Genesee Valley Park',
      city: 'Rochester',
      state: 'NY',
      type: 'flat',
      kind: 'loop',
      features: [
        'A 2K loop around one big riverside field of ballfields',
        'A long diagonal start straight across the middle of the field',
        'Two hairpins through the field each lap, then the river bank',
        'Floodplain grass: flat and fast, but it turns muddy in rain'
      ],
      confidence: 'high',
      notes: 'Home of the Yellowjacket Invitational, 2022–2026. Also hosted the 2021 UAA Championships and the 2025 NCAA Niagara Regional.',
      sources: [
        'https://uofrathletics.com/facilities/genesee-valley-park/5',
        'https://uofrathletics.com/sports/2021/10/27/MXC_2021_UAAChamps.aspx',
        'https://uofrathletics.com/sports/mens-cross-country/schedule/2026',
        'https://ritathletics.com/sports/2025/9/17/niagara-region-XC-championships25.aspx',
        'https://campustimes.org/?p=17143'
      ],
      trace: {
        mapSource: 'https://static.uofrathletics.com/custompages/UR%20CROSS%20COUNTRY/2021/GVP-Course-Map-UAA.pdf',
        // Pixel coordinates on the map's 2000×1545 render, north up.
        legs: {
          start: { pts: [[1230, 1110], [935, 700], [635, 297]] },
          loop: {
            closed: true,
            pts: [
              [635, 297], [555, 295], [510, 320], [470, 390], [455, 470], [445, 540], [445, 612],
              // Top arm east to the east tip, then the middle arm back west
              [560, 660], [700, 720], [850, 790], [1000, 860], [1120, 915], [1200, 942], [1240, 965],
              [1225, 992], [1180, 1012], [1100, 1000], [980, 960], [830, 905], [680, 840], [450, 740],
              [300, 682], [262, 662], [262, 685],
              // River bank, the south edge, then north up the east side
              [330, 735], [580, 890], [780, 990], [865, 1060], [920, 1160], [1000, 1210], [1050, 1232],
              [1100, 1225], [1250, 1170], [1400, 1120], [1530, 1105], [1565, 1085], [1540, 1040],
              [1510, 990], [1500, 900], [1502, 840], [1545, 750], [1570, 640], [1560, 560], [1530, 480],
              [1500, 420], [1450, 370], [1415, 358], [1370, 380], [1330, 430], [1280, 460], [1200, 470],
              [1130, 450], [1050, 400], [950, 340], [880, 300], [760, 305]
            ]
          },
          finish: { pts: [[1502, 840], [1490, 760], [1470, 720], [1400, 690], [1300, 650], [1205, 612]] }
        },
        races: {
          M: {
            label: 'Start straight, about 3¾ laps of the 2K loop, then the finish lane',
            path: [{ leg: 'start' }, { leg: 'loop', to: [1502, 840], laps: 3 }, { leg: 'finish' }]
          },
          W: {
            label: 'Start straight, about 2¾ laps of the 2K loop, then the finish lane',
            path: [{ leg: 'start' }, { leg: 'loop', to: [1502, 840], laps: 2 }, { leg: 'finish' }]
          }
        },
        // The floodplain field has no hills worth drawing.
        hills: [],
        layoutLabel: '2 km loop with a start straight',
        describe: 'A compact 2K loop around one riverside field, with two hairpins each lap'
      }
    }
  };

  COURSES['youthtowne-fields'] = {
    name: 'Youthtowne Fields',
    city: 'Clinton',
    state: 'PA',
    type: 'rolling',
    kind: 'loop',
    // The Horizon League map's elevation profile: 235 ft of climb over 8K.
    climbPerKm: 9,
    features: [
      'All grass except one short gravel road crossing',
      'Crosses Youthtowne Rd between the west field and the big east field',
      'A pond loop to the south and a meadow loop to the north, both run once',
      'Many short ups and downs rather than one big climb'
    ],
    confidence: 'medium',
    notes: 'Robert Morris\'s home course. CMU moved the CMU Invitational here from Schenley Park in 2025 and ran it here again in 2026. Traced from the 2026 Horizon League map; CMU\'s own layout (women race 5K at its invitational) isn\'t published, so the route is medium confidence.',
    sources: [
      'https://athletics.cmu.edu/sports/mxc/2026-27/releases/20261010nkil56',
      'https://athletics.cmu.edu/sports/mxc/2025-26/releases/20251011ohzjz6',
      'https://athletics.cmu.edu/sports/mxc/2026-27/schedule',
      'https://rmucolonials.com/news/2025/9/11/mens-cross-country-rmu-mens-and-womens-cross-country-host-colonial-invitational.aspx',
      'https://horizonleague.org/documents/2026/8/10//Men_s_XC_Champ_Map.pdf?id=17377',
      'https://horizonleague.org/documents/2026/8/10//Women_s_XC_Champ_Map.pdf?id=17376'
    ],
    trace: {
      mapSource: 'https://horizonleague.org/documents/2026/8/10//Men_s_XC_Champ_Map.pdf?id=17377',
      // Pixel coordinates on the map's 1236×1600 render, north up. The site
      // runs north to south, so it's turned to fit the wide frame.
      rotate: 90,
      legs: {
        start: { pts: [[382, 612], [440, 608], [510, 604], [560, 600]] },
        // The orange loop: east across the road, around the east field,
        // back west, and a lap of the west field. Eastbound and westbound
        // lanes run side by side between the fields.
        loop: {
          closed: true,
          pts: [
            [492, 655], [494, 622], [510, 605], [560, 600], [610, 595], [648, 590], [668, 605],
            [692, 665], [705, 740], [732, 810], [757, 867], [800, 858], [850, 842], [840, 810],
            [800, 682], [785, 610], [775, 595], [725, 580], [665, 576], [600, 575], [540, 578],
            [485, 572], [440, 566], [390, 575], [365, 600], [357, 645], [360, 685], [390, 712],
            [455, 712], [490, 690]
          ]
        },
        // Around the ponds south of the east field, from its SW corner.
        ponds: {
          pts: [[757, 867], [752, 895], [745, 935], [700, 965], [670, 995], [645, 1020], [630, 1015],
            [627, 995], [620, 950], [620, 900], [635, 887], [700, 887], [745, 900], [757, 870]]
        },
        // From the east field's NE corner up the road to the meadow loop,
        // then down the farm lane to the westbound lane.
        north: {
          pts: [[775, 595], [750, 572], [712, 545], [700, 500], [695, 440], [680, 392], [640, 388],
            [592, 388], [560, 365], [545, 352], [470, 356], [420, 368], [405, 392], [420, 415],
            [490, 425], [570, 438], [600, 455], [612, 500], [615, 560], [600, 575]]
        },
        finish: { pts: [[357, 650], [365, 672], [395, 692], [440, 695], [468, 693]] }
      },
      races: {
        M: {
          label: 'One big lap with the pond and meadow loops, two shorter laps, then the finishing straight',
          path: [
            { leg: 'start' },
            { leg: 'loop', from: [560, 600], to: [757, 867] },
            { leg: 'ponds' },
            { leg: 'loop', from: [757, 867], to: [775, 595] },
            { leg: 'north' },
            { leg: 'loop', from: [600, 575], to: [492, 655] },
            { leg: 'loop', from: [492, 655], laps: 1 },
            { leg: 'loop', from: [492, 655], to: [357, 645] },
            { leg: 'finish' }
          ]
        },
        W: {
          label: 'One big lap with the pond and meadow loops, one shorter lap, then the finishing straight',
          path: [
            { leg: 'start' },
            { leg: 'loop', from: [560, 600], to: [757, 867] },
            { leg: 'ponds' },
            { leg: 'loop', from: [757, 867], to: [775, 595] },
            { leg: 'north' },
            { leg: 'loop', from: [600, 575], to: [492, 655] },
            { leg: 'loop', from: [492, 655], to: [357, 645] },
            { leg: 'finish' }
          ]
        }
      },
      layoutLabel: 'Two fields across a country road',
      describe: 'A big opening lap past the ponds and the north meadow, then shorter laps between two fields'
    }
  };

  COURSES['highland-park-attleboro'] = {
    name: 'Highland Park (Mark Coogan Course)',
    city: 'Attleboro',
    state: 'MA',
    type: 'flat',
    kind: 'loop',
    features: [
      'A former golf course: open fairways, bunkers and tree lines, all grass',
      'An out-and-back up the long north fairway and a hairpin through the middle each lap',
      'A long diagonal to the far southwest corner, then the south fairway home',
      'About a 200 m home straight'
    ],
    confidence: 'medium',
    notes: 'Brandeis has no regular home meet; this is where it hosted the 2024 UAA Championships, about 35 miles from campus. Also used by Wheaton, Babson and Suffolk for their season opener. Traced from Brandeis\'s own lap-by-lap 8K and 6K maps.',
    sources: [
      'https://brandeisjudges.com/sports/2024/10/22/uaa-xc-championships-2024.aspx',
      'https://brandeisjudges.com/news/2024/11/2/carleo-forde-pace-x-country-teams-at-uaa-championships.aspx',
      'https://brandeisjudges.com/news/2024/8/31/x-country-teams-take-third-in-season-opening-meet-at-wheaton.aspx',
      'https://brandeisjudges.com/documents/2024/10/2/Highland_Park_XC_Maps.pdf',
      'https://newengland.usatf.org/News/2024/USATF-NE-cross-country-hammers-at-Highland-Park'
    ],
    trace: {
      mapSource: 'https://brandeisjudges.com/documents/2024/10/2/Highland_Park_XC_Maps.pdf',
      // Pixel coordinates on the 8K page's 1980×1530 render, north up.
      legs: {
        // Lap 1 only: from the start up the middle of the north fairway.
        center: { pts: [[1420, 655], [1200, 560], [1050, 480], [960, 420], [870, 350], [760, 270], [650, 195], [560, 148], [540, 128]] },
        // The full lap, from the north edge by the start: up the fairway,
        // back down its far side, the hairpin, the long diagonal, the
        // south fairway, and north up the east side.
        loop: {
          closed: true,
          pts: [
            [1420, 578], [1250, 505], [1000, 395], [800, 295], [650, 215], [540, 128], [490, 130],
            [480, 170], [530, 230], [620, 300], [720, 390], [835, 478], [1000, 535], [1150, 590],
            [1300, 650], [1400, 700], [1415, 760], [1370, 830], [1320, 855], [1280, 845], [1150, 770],
            [1000, 690], [880, 625], [838, 605], [800, 625], [700, 690], [560, 800], [430, 920],
            [300, 1060], [200, 1200], [150, 1330], [175, 1395], [260, 1390], [370, 1350], [480, 1250],
            [560, 1150], [680, 1060], [850, 1000], [1000, 960], [1150, 950], [1270, 970], [1400, 1040],
            [1550, 1090], [1700, 1120], [1800, 1115], [1840, 1060], [1830, 950], [1800, 820],
            [1760, 700], [1700, 680], [1600, 640], [1500, 605]
          ]
        },
        // The one-time cut-through between the fairway and the hairpin.
        cut: { pts: [[838, 605], [832, 540], [835, 478]] },
        // Women's lap 1: from the hairpin's tip past the start to 1K.
        connector: { pts: [[1415, 760], [1490, 690], [1505, 645], [1475, 605], [1420, 578]] },
        finish: { pts: [[1420, 578], [1330, 505], [1200, 410], [1080, 320], [995, 262]] }
      },
      races: {
        M: {
          label: 'A short opening lap, then three big laps, then the home straight',
          path: [
            { leg: 'center' },
            { leg: 'loop', from: [540, 128], to: [838, 605] },
            { leg: 'cut' },
            { leg: 'loop', from: [835, 478], to: [1420, 578] },
            { leg: 'loop', from: [1420, 578], laps: 2 },
            { leg: 'finish' }
          ]
        },
        W: {
          label: 'A 1K opening lap, then two 2.5K laps, then the home straight',
          path: [
            { leg: 'center' },
            { leg: 'loop', from: [540, 128], to: [835, 478] },
            { leg: 'cut', reverse: true },
            { leg: 'loop', from: [838, 605], to: [1415, 760], reverse: true },
            { leg: 'connector' },
            { leg: 'loop', from: [1420, 578], laps: 2 },
            { leg: 'finish' }
          ]
        }
      },
      layoutLabel: '2.5 km golf-course loop with an opening lap',
      describe: 'Open fairways on an old golf course: an out-and-back, a hairpin and a long sweep around the edge'
    }
  };

  COURSES['siue'] = {
    name: 'SIUE Cross Country Course',
    city: 'Edwardsville',
    state: 'IL',
    type: 'rolling',
    kind: 'loop',
    features: [
      'Start and finish side by side in an open field beside University Dr',
      'A long out-and-back along University Dr to a hairpin, run every lap',
      'A wooded loop out to New Poag Rd and back',
      'The "first mile hill" on the meadow loop',
      'Permanent color-coded course signs'
    ],
    confidence: 'high',
    notes: 'WashU has no course of its own. It hosts its home opener, the Gabby Reuveni Invite, at SIUE, 25 miles away, and hosted the 2025 UAA Championships here. Traced from the 8K and 6K maps WashU posted for that meet, which match SIUE\'s own.',
    sources: [
      'https://washubears.com/news/2025/9/6/rv-mens-cross-country-wins-gabby-reuveni-invite-in-home-opener.aspx',
      'https://washubears.com/news/2026/9/5/no-17-washu-mens-cross-country-claims-gabby-reuveni-invite-to-open-season.aspx',
      'https://washubears.com/sports/2025/9/25/2025-uaa-cross-country-championships.aspx',
      'https://dxbhsrqyrr690.cloudfront.net/sidearm.nextgen.sites/siuecougars.com/documents/2021/6/14/8k_Map.pdf'
    ],
    trace: {
      mapSource: 'https://dxbhsrqyrr690.cloudfront.net/sidearm.nextgen.sites/washubears.com/images/2025/10/22/8k_Map.jpg',
      // Pixel coordinates on the 8K map's 1763×1364 image, north up.
      legs: {
        start: { pts: [[1010, 645], [1100, 685], [1195, 725]] },
        // The 3K loop from the bottom of the start field: NW beside
        // University Dr, the New Poag Rd woods, past 1M, the meadow's north
        // edge, the spur, down the straight to the hairpin and back.
        loop: {
          closed: true,
          pts: [
            [1195, 725], [1120, 660], [1060, 595], [1000, 545], [930, 490], [850, 440], [770, 375],
            [700, 368], [665, 360], [655, 250], [648, 140], [640, 85], [590, 65], [400, 85], [140, 120],
            [60, 240], [40, 300], [75, 390], [125, 415], [230, 408], [280, 425], [410, 478], [490, 500],
            [600, 610], [670, 690], [680, 765], [760, 790], [800, 820], [840, 830], [930, 822],
            [1060, 822], [1190, 890], [1240, 935], [1225, 1040], [1212, 1110], [1330, 1112],
            [1470, 1118], [1550, 1210], [1640, 1320], [1700, 1335], [1710, 1320], [1600, 1180],
            [1450, 980], [1300, 800], [1250, 755]
          ]
        },
        // The meadow loop with the first mile hill, back to the start field.
        meadow: {
          pts: [[1240, 935], [1160, 1060], [1130, 1095], [1060, 1105], [1010, 1100], [1000, 1050],
            [900, 1035], [820, 1025], [800, 1000], [810, 880], [820, 820], [830, 750], [860, 738],
            [1000, 738], [1100, 722], [1150, 700], [1195, 725]]
        },
        // Women only: the 1K add-on, a right turn at the end of the start field.
        addon: { pts: [[1195, 725], [1250, 775], [1300, 840], [1350, 905], [1365, 930], [1330, 945], [1290, 930], [1240, 935]] },
        finish: { pts: [[1250, 755], [1180, 670], [1115, 600]] }
      },
      races: {
        M: {
          label: 'An opening 2K down the straight and around the meadow, then the 3K loop twice',
          path: [
            { leg: 'start' },
            { leg: 'loop', from: [1195, 725], to: [1240, 935], reverse: true },
            { leg: 'meadow' },
            { leg: 'loop', from: [1195, 725], to: [1250, 755], laps: 1 },
            { leg: 'finish' }
          ]
        },
        W: {
          label: 'The opening 2K, a 1K add-on around the meadow again, then one 3K loop',
          path: [
            { leg: 'start' },
            { leg: 'loop', from: [1195, 725], to: [1240, 935], reverse: true },
            { leg: 'meadow' },
            { leg: 'addon' },
            { leg: 'meadow' },
            { leg: 'loop', from: [1195, 725], to: [1250, 755] },
            { leg: 'finish' }
          ]
        }
      },
      layoutLabel: '3 km loop with an opening 2K',
      describe: 'Out-and-back along University Dr, a wooded loop by New Poag Rd and a meadow with the first mile hill'
    }
  };

  COURSES['squire-valleevue-farm'] = {
    name: 'Squire Valleevue Farm',
    city: 'Hunting Valley',
    state: 'OH',
    type: 'rolling',
    kind: 'loop',
    features: [
      'Case Western\'s University Farm: field edges, meadows and hayfields',
      'Start and finish side by side at the top of a long, narrow start field',
      'An opening mile through two fields east of the farm buildings',
      'A big western loop out along the woods to a far hayfield, back past the ponds with a V around a small one',
      'A gradual rise of 20–30 m from the farm buildings to the west fields'
    ],
    confidence: 'high',
    notes: 'Called the teams\' home by CWRU\'s facilities page. Hosts the Bill Sudeck Invitational every year and hosted the 2023 UAA Championships. Traced from CWRU\'s 2023 UAA 8K and 6K maps.',
    sources: [
      'https://athletics.case.edu/facilities/?id=10',
      'https://athletics.case.edu/sports/2023/10/3/2023-uaa-cross-country-championships.aspx',
      'https://athletics.case.edu/documents/2023/10/26/23_XC_Champ_Program.pdf',
      'https://athletics.case.edu/news/2025/8/29/mens-cross-country-records-fall-as-spartan-men-women-win-sudeck-invite.aspx',
      'https://athletics.case.edu/images/2023/10/5/CWRU_8k_Revised_4_mi.jpg',
      'https://athletics.case.edu/images/2023/10/5/CWRU6kCourse.jpg'
    ],
    trace: {
      mapSource: 'https://athletics.case.edu/images/2023/10/5/CWRU_8k_Revised_4_mi.jpg',
      // Pixel coordinates on the 8K map's 2000×1413 image, north up.
      legs: {
        start: { pts: [[1555, 330], [1552, 500], [1550, 700], [1550, 795]] },
        // The two east fields, from the junction south of the start field:
        // the lower field clockwise, then the upper field.
        east: {
          closed: true,
          pts: [[1550, 795], [1560, 880], [1650, 940], [1760, 1010], [1860, 1080], [1970, 1080],
            [1985, 980], [1960, 935], [1760, 930], [1755, 915], [1880, 910], [1870, 800], [1840, 710],
            [1790, 700], [1730, 705], [1660, 760], [1630, 800]]
        },
        // Women only: across the middle of the upper field to the lower one.
        cross: { pts: [[1550, 795], [1640, 815], [1760, 812], [1872, 805], [1876, 880], [1855, 912], [1760, 930]] },
        // The big western loop: past the buildings, along the south edge of
        // the central meadow, out to the far west field, back past the
        // ponds, up through the north meadow and down the start field.
        loop: {
          closed: true,
          pts: [
            [1550, 795], [1505, 830], [1490, 868], [1462, 900], [1445, 940], [1420, 950], [1240, 955],
            [1080, 900], [1070, 840], [1020, 790], [1000, 790], [800, 785], [700, 720], [530, 560],
            [360, 495], [25, 435], [15, 400], [20, 378], [100, 378], [240, 395], [330, 420], [370, 465],
            [480, 490], [650, 595], [780, 605], [900, 620], [990, 725], [1000, 730], [1040, 690],
            [1140, 590], [1220, 565], [1250, 500], [1330, 420], [1440, 410], [1460, 460], [1480, 500],
            [1490, 630], [1487, 700], [1552, 692], [1550, 740]
          ]
        },
        finish: { pts: [[1490, 630], [1595, 615], [1600, 500], [1610, 335]] }
      },
      races: {
        M: {
          label: 'An opening mile through the east fields, then the big western loop twice',
          path: [
            { leg: 'start' },
            { leg: 'east' },
            { leg: 'loop', from: [1550, 795], to: [1490, 630], laps: 1 },
            { leg: 'finish' }
          ]
        },
        W: {
          label: 'Both east fields, back around the lower one, then one big western loop',
          path: [
            { leg: 'start' },
            { leg: 'east' },
            { leg: 'cross' },
            { leg: 'east', from: [1760, 930], to: [1550, 795], reverse: true },
            { leg: 'loop', from: [1550, 795], to: [1490, 630] },
            { leg: 'finish' }
          ]
        }
      },
      layoutLabel: '3.2 km western loop with an opening mile',
      describe: 'Farm fields and meadows: two east fields, then a long loop out to the west hayfield and back past the ponds'
    }
  };

  COURSES['st-james-farm'] = {
    name: 'St. James Farm',
    city: 'Warrenville',
    state: 'IL',
    type: 'flat',
    kind: 'loop',
    features: [
      'A forest preserve loop of about 1.9 km around a wooded block and a heart-shaped pond',
      'A long straight north side, where the start joins and the finish leaves',
      'The south side runs beside Butterfield Rd',
      'Very spectator friendly: most of the loop is visible from the central fields'
    ],
    confidence: 'medium',
    notes: 'Home course for Wheaton (IL), whose Gil Dodds Invitational is held here every year, and North Central, which hosted the CCIW Championships here. UChicago hosted the 2026 UAA Championships here, about 30 miles from campus; it hosted no other meet in 2022–2026. Also a CCIW championship course. Traced from the 2012 CCIW men\'s map, which shows the same loop as the 2026 UAA map; the direction and lap counts are read from its lap colors and mile markers, not published.',
    sources: [
      'https://athletics.uchicago.edu/sports/2026/8/6/cross-country-2027-uaa-championships.aspx',
      'https://athletics.uchicago.edu/news/2026/10/31/-18-mens-cross-country-claims-third-place-finish-at-uaa-championships.aspx',
      'https://athletics.uchicago.edu/images/2026/10/27/UAA_XC_Course_Map.png',
      'https://athletics.wheaton.edu/news/2025/9/20/mens-cross-country-the-thunder-mens-cross-country-team-places-third-at-its-gil-dodds-invitational.aspx',
      'https://cciw.org/sports/2012/10/10/MCC_1010122531.aspx?id=772',
      'https://cciw.org/custompages/CCIW_Links/CrossCountry/Results/2012/Mens.Course.jpg'
    ],
    trace: {
      mapSource: 'https://cciw.org/custompages/CCIW_Links/CrossCountry/Results/2012/Mens.Course.jpg',
      // Pixel coordinates on the 893×774 map, north up.
      legs: {
        start: { pts: [[385, 510], [290, 525], [195, 540], [180, 568]] },
        // Counterclockwise: west along the north straight, down the Winfield
        // Rd side, east along Butterfield Rd with a jog around the pond, the
        // rectangle by Madison St, then back west.
        loop: {
          closed: true,
          pts: [
            [180, 568], [60, 568], [35, 580], [28, 620], [30, 670], [40, 685], [200, 682], [300, 652],
            [330, 612], [352, 600], [358, 618], [335, 642], [352, 662], [440, 672], [480, 690],
            [600, 688], [760, 682], [830, 675], [833, 642], [700, 640], [686, 615], [668, 565],
            [540, 560], [415, 558], [300, 562]
          ]
        },
        finish: { pts: [[415, 558], [403, 505], [400, 455], [485, 452]] }
      },
      races: {
        M: {
          label: 'A short lead-in, almost four laps of the loop, then north to the finish',
          path: [{ leg: 'start' }, { leg: 'loop', from: [180, 568], to: [415, 558], laps: 3 }, { leg: 'finish' }]
        },
        W: {
          label: 'A short lead-in, almost three laps of the loop, then north to the finish',
          path: [{ leg: 'start' }, { leg: 'loop', from: [180, 568], to: [415, 558], laps: 2 }, { leg: 'finish' }]
        }
      },
      layoutLabel: '1.9 km loop',
      describe: 'A flat 1.9K loop around a wooded block and a pond, almost all of it in view'
    }
  };

  /* ---------- NESCAC ---------- */

  COURSES['middlebury-golf-course'] = {
    name: 'Middlebury College XC Course',
    city: 'Middlebury',
    state: 'VT',
    type: 'rolling',
    kind: 'loop',
    // Estimated from the maps' elevation profile (366–474 ft, two big
    // climbs per lap); no total is published.
    climbPerKm: 9,
    features: [
      'The Red Kelly Trail around the Ralph Myhre Golf Course',
      'Starts and finishes on the playing fields by the Athletics Complex',
      'A ridge along the north edge of the golf course and a wooded ridge along the south',
      'A footbridge before the woods that lead back to the fields'
    ],
    confidence: 'high',
    notes: 'Home of the Aldrich Invitational; Middlebury hosts the 2026 NESCAC Championships here. Traced from Middlebury\'s 2023 men\'s 8K and 2024 women\'s 6K maps.',
    sources: [
      'https://athletics.middlebury.edu/facilities/cross-country-course/2',
      'https://athletics.middlebury.edu/documents/2023/8/28/CrossCountryCourseMapMen23_2.pdf',
      'https://athletics.middlebury.edu/documents/2024/7/30/WomenXCCourse24.pdf',
      'https://www.middleburycampus.com/article/2014/10/xc-runners-gear-up-for-nescacs-on-home-course'
    ],
    trace: {
      mapSource: 'https://athletics.middlebury.edu/documents/2023/8/28/CrossCountryCourseMapMen23_2.pdf',
      // Pixel coordinates on the men's map rendered at 2000×1545, north up.
      // The women's map uses the same base.
      legs: {
        // Down the west side of the field block and along its bottom.
        start: { pts: [[1330, 600], [1332, 760], [1335, 945], [1420, 948], [1515, 945]] },
        // The golf-course lap, counterclockwise from the field block's SE
        // corner: up its east side, north past the stadium, west along the
        // north ridge, down the west side, east along the south ridge,
        // over the footbridge and back through the woods.
        loop: {
          closed: true,
          pts: [
            [1515, 945], [1510, 800], [1507, 700], [1505, 640], [1500, 580], [1420, 577], [1350, 575],
            [1335, 520], [1330, 420], [1325, 320], [1300, 270], [1200, 280], [1080, 300], [1000, 270],
            [930, 235], [800, 210], [660, 212], [560, 215], [470, 225], [400, 280], [340, 350],
            [290, 440], [275, 520], [300, 610], [270, 680], [330, 720], [450, 768], [530, 785],
            [570, 820], [620, 880], [680, 890], [800, 882], [900, 890], [925, 935], [1030, 935],
            [1090, 980], [1200, 1080], [1300, 1160], [1420, 1170], [1480, 1120], [1550, 1010], [1535, 960]
          ]
        },
        // Women: the lower fields by South Street.
        lower: {
          closed: true,
          pts: [[1515, 945], [1600, 965], [1640, 1040], [1690, 1160], [1712, 1280], [1700, 1370],
            [1600, 1378], [1520, 1372], [1512, 1300], [1515, 1180], [1525, 1100], [1555, 1010]]
        },
        // Women's finish: from the woods south past km 5 to the lower fields.
        wbranch: { pts: [[1480, 1120], [1488, 1170], [1495, 1230], [1512, 1300]] },
        wfinish: { pts: [[1600, 965], [1555, 900], [1515, 800], [1490, 720], [1450, 710]] },
        mfinish: { pts: [[1507, 700], [1470, 688], [1430, 685]] }
      },
      races: {
        M: {
          label: 'Around the playing fields, two laps of the golf course, then the finish on the fields',
          path: [
            { leg: 'start' },
            { leg: 'loop', from: [1515, 945], to: [1507, 700], laps: 2 },
            { leg: 'mfinish' }
          ]
        },
        W: {
          label: 'The lower fields, one lap of the golf course, then back through the lower fields to the finish',
          path: [
            { leg: 'start' },
            { leg: 'lower' },
            { leg: 'loop', from: [1515, 945], to: [1480, 1120] },
            { leg: 'wbranch' },
            { leg: 'lower', from: [1512, 1300], to: [1600, 965], reverse: true },
            { leg: 'wfinish' }
          ]
        }
      },
      hills: [{ x: 560, y: 230, r: 220, h: 1 }, { x: 760, y: 890, r: 220, h: 1 }, { x: 330, y: 700, r: 120, h: 0.6 }],
      layoutLabel: '4 km golf-course loop',
      describe: 'Around the golf course on the Red Kelly Trail, with a ridge on each side'
    }
  };

  COURSES['pickard-field'] = {
    name: 'Pickard Cross Country Course',
    city: 'Brunswick',
    state: 'ME',
    type: 'flat',
    kind: 'loop',
    features: [
      'A perimeter loop around Bowdoin\'s playing fields: woods on the west, Harpswell Rd on the east',
      'Grass, dirt and a wood-chip trail through the trees',
      'A long diagonal start across the fields',
      'Called "pancake flat" and fast'
    ],
    confidence: 'high',
    notes: 'Re-laid after the 2022–2024 Pickard Field renovations. Bowdoin hosted the 2024 NESCAC Championships here and the Maine State Meet in 2025 and 2026. Traced from Bowdoin\'s 2025 course map.',
    sources: [
      'https://athletics.bowdoin.edu/facilities/pickard-cross-country-course/4',
      'https://athletics.bowdoin.edu/images/2025/9/16/XCcourse25.png',
      'https://bowdoinorient.com/2024/09/12/bowdoin-hosts-first-cross-country-meet-since-2022/',
      'https://athletics.bowdoin.edu/news/2024/10/31/mens-cross-country-bowdoin-to-host-nescac-cross-country-championships-saturday.aspx',
      'https://www.middleburycampus.com/article/2024/11/middlebury-cross-country-competes-at-nescac-championship-meet'
    ],
    trace: {
      mapSource: 'https://athletics.bowdoin.edu/images/2025/9/16/XCcourse25.png',
      // Pixel coordinates on the 2000×1174 map, north up.
      legs: {
        // The white starting segment: diagonally across the fields, east
        // along the turf field, round to Harpswell Rd.
        start: { pts: [[380, 135], [690, 570], [1000, 1000], [1300, 950], [1560, 905], [1640, 920], [1720, 960], [1840, 950], [1940, 925]] },
        // The yellow perimeter loop, from the junction south-west of Pickard
        // Field: north past Farley, west along the top, down the woods
        // edge, east along the south, north by Harpswell Rd, back west.
        loop: {
          closed: true,
          pts: [
            [890, 710], [800, 680], [755, 620], [725, 500], [725, 330], [705, 200], [680, 120], [665, 60],
            [500, 50], [300, 72], [150, 140], [125, 250], [140, 400], [170, 530], [215, 600], [150, 665],
            [80, 700], [75, 800], [110, 920], [125, 990], [150, 1100], [200, 1160], [500, 1140], [760, 1125],
            [1100, 1060], [1400, 1010], [1670, 965], [1800, 962], [1940, 925], [1965, 800], [1950, 650],
            [1900, 475], [1600, 545], [1300, 612], [1000, 685]
          ]
        }
      },
      races: {
        M: {
          label: 'The starting segment, then three laps of the perimeter loop',
          path: [
            { leg: 'start' },
            { leg: 'loop', from: [1940, 925], to: [890, 710] },
            { leg: 'loop', from: [890, 710], to: [705, 200], laps: 3 }
          ]
        },
        W: {
          label: 'The starting segment, then two laps of the perimeter loop',
          path: [
            { leg: 'start' },
            { leg: 'loop', from: [1940, 925], to: [890, 710] },
            { leg: 'loop', from: [890, 710], to: [705, 200], laps: 2 }
          ]
        }
      },
      hills: [],
      layoutLabel: '2 km perimeter loop with a starting segment',
      describe: 'A flat, fast loop around Bowdoin\'s playing fields'
    }
  };

  COURSES['wainwright'] = {
    name: 'Wainwright Recreation Complex',
    city: 'South Portland',
    state: 'ME',
    type: 'flat',
    kind: 'loop',
    features: [
      'A flat grass loop around six ball diamonds',
      'Start and finish on parallel chutes in the south-east corner',
      'A long straight along a tree line',
      'The 8K adds an out-and-back up a lane between two tree rows'
    ],
    confidence: 'medium',
    notes: 'Bates has no fixed home course and races nothing on its Lewiston campus. Its hosted meets moved between Pineland Farms (2022, 2024; hilly, no map found), Roy\'s Golf Center in Auburn (2023) and Wainwright, where it hosted the 2026 Regional Preview and the 2026 NCAA DIII East Regional. Wainwright is the current venue and the only one with maps. Traced from Bates\'s 2026 regional 8K and 6K maps.',
    sources: [
      'https://gobatesbobcats.com/sports/2026/10/19/2026-ncaa-east-regionals-m.aspx',
      'https://gobatesbobcats.com/documents/2026/10/22/BatesXC_2026NCAARegionals_CourseMap_v2-3.pdf',
      'https://ncaaorg.s3.amazonaws.com/championships/sports/crosstrack/d3/crosscountry/2026-27D3XCC_RegionalFinalsHosts.pdf',
      'https://www.tfrrs.org/results/xc/28016/Bates_Regional_Preview',
      'https://brandeisjudges.com/news/2026/9/6/cross-country-earns-two-individual-one-team-win-at-bates-regional-preview-race.aspx',
      'https://gobatesbobcats.com/sports/mens-cross-country/schedule/2026'
    ],
    trace: {
      mapSource: 'https://gobatesbobcats.com/documents/2026/10/22/BatesXC_2026NCAARegionals_CourseMap_v2-3.pdf',
      // Pixel coordinates on the men's 8K page rendered at 1999×1545.
      legs: {
        start: { pts: [[1475, 1060], [1600, 850], [1700, 680], [1740, 560], [1790, 520], [1890, 545]] },
        // The 8K loop from the top of the start chute: down the east side,
        // west along the south past the tents, round the diamonds, the
        // tree-line diagonal, up beside the chutes, out and back along the
        // northern lane.
        loop: {
          closed: true,
          pts: [
            [1890, 545], [1925, 600], [1905, 800], [1850, 950], [1790, 1050], [1690, 1150], [1590, 1240],
            [1530, 1205], [1390, 1130], [1250, 1045], [1100, 1050], [900, 1080], [700, 1100], [600, 1105],
            [450, 1070], [330, 960], [200, 860], [100, 780], [75, 710], [130, 640], [250, 545], [350, 465],
            [420, 520], [650, 640], [900, 770], [1100, 880], [1290, 1020], [1340, 950], [1400, 830],
            [1460, 740], [1530, 640], [1420, 570], [1200, 420], [950, 265], [720, 115], [770, 45],
            [1000, 180], [1300, 330], [1590, 520], [1640, 420], [1690, 395], [1730, 420], [1800, 480]
          ]
        },
        // Women: straight up beside the chutes, skipping the lane.
        shortcut: { pts: [[1530, 640], [1560, 580], [1590, 520]] },
        finish: { pts: [[1730, 420], [1600, 640], [1480, 840], [1370, 1030]] }
      },
      races: {
        M: {
          label: 'Up the start chute, two 4K loops with the northern lane, then the finish chute',
          path: [{ leg: 'start' }, { leg: 'loop', to: [1730, 420], laps: 1 }, { leg: 'finish' }]
        },
        W: {
          label: 'Up the start chute, two 3K loops, then the finish chute',
          path: [
            { leg: 'start' },
            { leg: 'loop', to: [1530, 640] },
            { leg: 'shortcut' },
            { leg: 'loop', from: [1590, 520], to: [1890, 545] },
            { leg: 'loop', from: [1890, 545], to: [1530, 640] },
            { leg: 'shortcut' },
            { leg: 'loop', from: [1590, 520], to: [1730, 420] },
            { leg: 'finish' }
          ]
        }
      },
      hills: [],
      layoutLabel: 'Loop around the ball diamonds',
      describe: 'Flat grass around six ball diamonds, with a long tree-line straight'
    }
  };

  COURSES['long-lane-farm'] = {
    name: 'Wes Fuhrman \'05 Trails at Long Lane Farm',
    city: 'Middletown',
    state: 'CT',
    type: 'rolling',
    kind: 'loop',
    features: [
      'Start and finish at the south end of a long, narrow upper field by Long Lane',
      'Wooded trails west of the field, with a creek crossing',
      'Two out-and-back fingers: one in the back field by West St., one in the woods',
      'Long gradual hills and one major hill, which the 8K climbs twice'
    ],
    confidence: 'high',
    notes: 'Home of the Cardinal Invitational; hosted the 2005 and 2015 NESCAC Championships. Traced from Wesleyan\'s official 8000 m and 6000 m maps, which are schematic drawings from 2015 or earlier, so the shape is approximate.',
    sources: [
      'https://athletics.wesleyan.edu/sports/2020/6/17/facilities-xc-course.aspx',
      'https://athletics.wesleyan.edu/sports/2020/8/20/wesleyan-university-cross-country-home-course-maps.aspx?id=1608',
      'https://athletics.wesleyan.edu/news/2025/9/20/womens-cross-country-womens-cross-country-places-third-at-home.aspx',
      'https://athletics.wpi.edu/news/2025/9/20/mens-cross-country-places-fourth-at-stacked-wesleyan-cardinal-invitational.aspx'
    ],
    trace: {
      mapSource: 'https://athletics.wesleyan.edu/documents/2020/8/20//wesfuhrman8kxccoursemap_men.pdf?id=1959',
      // Pixel coordinates on the 8000 m map rendered at 1545×2000, north up.
      // The park runs north to south, so it's turned to fit the wide frame.
      rotate: -90,
      legs: {
        // The long upper field: up its west side, round the top, down the
        // east side and back to the start/finish at its south end.
        field: {
          closed: true,
          pts: [[745, 1515], [725, 1300], [740, 1060], [785, 800], [825, 600], [850, 525], [905, 528],
            [918, 620], [900, 800], [875, 1000], [850, 1200], [835, 1270], [815, 1400], [800, 1540],
            [760, 1570], [710, 1555]]
        },
        // Out to the Long Lane edge (mile 1) and back to the top of the field.
        east: { pts: [[835, 1270], [900, 1255], [945, 1215], [985, 1050], [990, 975], [930, 950], [920, 800], [918, 620]] },
        // The woods circuit from the junction on the field's west side:
        // over the creek, up and down the back-field finger, then up and
        // down the woods finger.
        woods: {
          closed: true,
          pts: [[740, 1060], [690, 1100], [660, 1250], [630, 1390], [570, 1450], [450, 1470], [432, 1260],
            [340, 1245], [300, 1100], [285, 900], [280, 770], [305, 745], [328, 770], [345, 900],
            [365, 1100], [385, 1200], [440, 1228], [520, 1180], [590, 1060], [620, 900], [640, 700],
            [670, 535], [705, 555], [712, 640], [690, 800], [665, 980], [700, 1050]]
        }
      },
      races: {
        M: {
          label: 'Around the upper field and Long Lane, then the woods circuit twice',
          path: [
            { leg: 'field', to: [835, 1270] },
            { leg: 'east' },
            { leg: 'field', from: [918, 620], to: [740, 1060], reverse: true },
            { leg: 'woods' },
            { leg: 'field', from: [740, 1060], to: [745, 1515], reverse: true },
            { leg: 'field', from: [745, 1515], to: [740, 1060] },
            { leg: 'woods' },
            { leg: 'field', from: [740, 1060], to: [745, 1515], reverse: true }
          ]
        },
        W: {
          label: 'Around the upper field and Long Lane, the woods circuit, then one more lap of the field',
          path: [
            { leg: 'field', to: [835, 1270] },
            { leg: 'east' },
            { leg: 'field', from: [918, 620], to: [740, 1060], reverse: true },
            { leg: 'woods' },
            { leg: 'field', from: [740, 1060], to: [745, 1515], reverse: true },
            { leg: 'field' }
          ]
        }
      },
      layoutLabel: 'Field loop and woods circuit',
      describe: 'A long upper field and a wooded circuit across the creek, with two out-and-back fingers'
    }
  };

  COURSES['wickham-park'] = {
    name: 'Wickham Park',
    city: 'Manchester',
    state: 'CT',
    type: 'hilly',
    kind: 'point',
    features: [
      '"The Green Monster", a steep hill on the east side, climbed in the second mile',
      'A big open-field loop in the north of the park',
      'A stone wall and dirt road through the woods in the middle',
      'Separate start and finish lines in the eastern field; the finish is slightly uphill'
    ],
    confidence: 'high',
    notes: 'Trinity\'s home course (its datelines say Hartford, but the park is in Manchester). The home invitational, renamed the George Suitor Invitational in 2025, is a 5K; the 8K and 6K routes traced here are from the 2021 NESCAC Championships Trinity hosted. The maps are hand-drawn sketches, so shapes are approximate.',
    sources: [
      'https://bantamsports.com/sports/2021/8/30/wickham-park-cross-country-course-maps.aspx',
      'https://nescac.com/news/2021/10/26/trinity-set-to-host-nescac-cross-country-championship-sunday.aspx',
      'https://bantamsports.com/news/2025/9/7/mens-cross-country-mens-xc-finished-third-at-george-suitor-invitational.aspx',
      'https://bantamsports.com/news/2024/9/7/mens-cross-country-bantams-take-5th-in-home-invitational.aspx',
      'https://en.wikipedia.org/wiki/Wickham_Park_(Manchester,_Connecticut)'
    ],
    trace: {
      mapSource: 'https://bantamsports.com/documents/2021/9/9/WickhamPark_8k_TrinityCollege.pdf',
      // Pixel coordinates on the 8K sketch rendered at 2000×1214, north up.
      // The 6K sketch uses the same base. Not laps: one tour of the park.
      legs: {
        start: { pts: [[1785, 940], [1785, 700], [1790, 450], [1800, 250], [1790, 160], [1720, 105]] },
        north: { pts: [[1720, 105], [1200, 115], [700, 100], [300, 95], [285, 130]] },
        // Mile 1 ends cutting back east below the open field.
        west1: { pts: [[285, 130], [300, 300], [340, 430], [390, 515], [480, 530], [640, 490], [715, 465]] },
        // Mile 4 runs all the way down the west side to the stone wall.
        west4: { pts: [[285, 130], [240, 300], [210, 450], [195, 600], [215, 720], [270, 790], [330, 820]] },
        cabin: { pts: [[715, 465], [850, 420], [1000, 370], [1150, 310], [1300, 260], [1450, 225], [1580, 200], [1800, 180]] },
        // Down the far east edge and up Green Monster Hill to the cabin.
        monster: {
          pts: [[1800, 180], [1845, 250], [1855, 450], [1870, 700], [1880, 900], [1850, 975], [1750, 990],
            [1680, 985], [1640, 900], [1615, 780], [1580, 620], [1530, 520], [1450, 470], [1380, 380],
            [1300, 300], [1200, 330], [1150, 350]]
        },
        west3: { pts: [[1150, 350], [1000, 410], [800, 465], [600, 525], [420, 605], [240, 680], [235, 740], [300, 800], [330, 820]] },
        wall: { pts: [[330, 820], [590, 830], [800, 800], [1000, 775], [1300, 750], [1520, 725]] },
        // Mile 3 round the south-east corner and up the east edge.
        southeast: {
          pts: [[1520, 725], [1580, 725], [1615, 820], [1650, 960], [1700, 1000], [1800, 1005], [1930, 975],
            [1955, 850], [1940, 700], [1915, 560], [1895, 400], [1870, 250], [1820, 150], [1720, 105]]
        },
        // Men's last mile: the wooded path beside Green Monster, round the
        // team-tent field, north to the finish.
        tents: {
          pts: [[1520, 725], [1495, 600], [1430, 480], [1455, 420], [1550, 400], [1700, 440], [1712, 540],
            [1680, 690], [1730, 790], [1850, 850], [1905, 810], [1880, 620], [1840, 460], [1760, 330]]
        },
        // Women's last 1000 m from the 3-mile mark.
        wlast: {
          pts: [[1915, 560], [1895, 400], [1870, 250], [1840, 170], [1780, 165], [1730, 195], [1600, 215],
            [1450, 235], [1400, 300], [1410, 410], [1530, 420], [1690, 445], [1700, 480], [1660, 600],
            [1650, 700], [1750, 800], [1860, 870], [1880, 850], [1840, 700], [1810, 600], [1790, 450], [1770, 330]]
        }
      },
      races: {
        M: {
          label: 'A tour of the park: the open field twice, Green Monster Hill, the stone wall, and the team-tent field to finish',
          path: [
            { leg: 'start' }, { leg: 'north' }, { leg: 'west1' }, { leg: 'cabin' }, { leg: 'monster' },
            { leg: 'west3' }, { leg: 'wall' }, { leg: 'southeast' }, { leg: 'north' }, { leg: 'west4' },
            { leg: 'wall' }, { leg: 'tents' }
          ]
        },
        W: {
          label: 'The open field, Green Monster Hill, the stone wall, then a loop of the team-tent field to finish',
          path: [
            { leg: 'start' }, { leg: 'north' }, { leg: 'west1' }, { leg: 'cabin' }, { leg: 'monster' },
            { leg: 'west3' }, { leg: 'wall' }, { leg: 'southeast', to: [1915, 560] }, { leg: 'wlast' }
          ]
        }
      },
      hills: [{ x: 1600, y: 650, r: 160, h: 1 }, { x: 1200, y: 360, r: 160, h: 0.5 }],
      layoutLabel: 'A tour of the park',
      describe: 'A winding tour of the park with the steep Green Monster Hill'
    }
  };

  // Verified venues with no usable map: real name and terrain, generated
  // layout. Trace them when a map turns up.

  COURSES['mt-greylock'] = {
    name: 'Mt. Greylock XC Loops',
    city: 'Williamstown',
    state: 'MA',
    type: 'hilly',
    kind: 'loop',
    features: [
      'At Mount Greylock Regional School, off campus',
      'Very hilly, with technical woods sections',
      'One big hill climbed twice in the 8K'
    ],
    confidence: 'medium',
    notes: 'Williams hosts the Purple Valley Classic here, its only home meet in 2025 and 2026, and hosted the 2019 NESCAC Championships. No course map: the old 2008 map images on Williams\'s directions page return 404 with no archived copy.',
    sources: [
      'https://ephsports.williams.edu/sports/2020/8/11/cross-country-directions.aspx?id=1257',
      'https://ephsports.williams.edu/sports/mens-cross-country/schedule/2025',
      'https://ephsports.williams.edu/news/2026/6/16/mens-cross-country-williams-cross-country-announces-2026-schedule.aspx',
      'https://ephsports.williams.edu/news/2025/9/20/mens-cross-country-mens-cross-country-puts-in-strong-showing-at-purple-valley-classic.aspx'
    ]
  };

  COURSES['quarry-road'] = {
    name: 'Quarry Road Trails',
    city: 'Waterville',
    state: 'ME',
    type: 'hilly',
    features: [
      'Colby\'s own trail system, used for Nordic skiing in winter',
      'Known as hilly and challenging'
    ],
    confidence: 'medium',
    notes: 'Colby calls Quarry Road its home course and hosted the 2019 Maine State Meet (8K) there, but it has hosted no cross country meet since a September 2022 dual with Thomas. No race map or lap structure is published, so even loop or point-to-point is unknown.',
    sources: [
      'https://colbyathletics.com/news/2019/10/5/10_5_2019_1223.aspx',
      'https://colbyathletics.com/sports/2020/5/28/facilities-xc-trails.aspx',
      'https://colbyathletics.com/sports/cross-country/schedule/2022',
      'https://colbyathletics.com/sports/cross-country/schedule/2026'
    ]
  };

  COURSES['hamilton-college'] = {
    name: 'Hamilton College Cross Country Course',
    city: 'Clinton',
    state: 'NY',
    type: 'rolling',
    kind: 'loop',
    features: [
      'On campus: the golf course and farm fields west of the athletic complex',
      'Mostly grass with one short gravel stretch',
      'Starts on high ground with a fast downhill opening'
    ],
    confidence: 'high',
    notes: 'Hamilton hosts three home meets each fall, including the Hamilton Invitational, and hosted the 2022 NESCAC Championships. The only maps found are from 2014, before the course was rebuilt alongside new baseball and softball fields, so the layout is generated.',
    sources: [
      'https://athletics.hamilton.edu/facilities/?id=6',
      'https://results.runnercard.com/runner/data/13582/5680/schedule/2014%20Hamilton%20XC%20Invitational%20Information.pdf',
      'https://athletics.hamilton.edu/news/2022/10/30/mens-cross-country-brady-23-paces-mens-cross-country-in-nescac-championships.aspx',
      'https://athletics.hamilton.edu/news/2025/10/12/mens-cross-country-mens-cross-country-dominates-in-capturing-hamilton-invitational-title.aspx'
    ]
  };

  COURSES['harkness-park'] = {
    name: 'Harkness Memorial State Park',
    city: 'Waterford',
    state: 'CT',
    type: 'rolling',
    kind: 'loop',
    features: [
      'Open coastal lawns of the Eolia mansion estate on Long Island Sound',
      'Stretches along the shoreline fence, dirt roads and a crushed-stone path',
      'Two field loops, run in opposite directions',
      'Only gentle grades; fast course records (8K 23:43, 6K 19:51)'
    ],
    confidence: 'high',
    notes: 'Home of the Connecticut College Invitational; hosted the NCAA DIII Mideast Regionals (2021, 2024) and the 2025 NESCAC Championships. Conn\'s map has no direction arrows and its km labels don\'t match Conn\'s own turn-by-turn description, so the running order couldn\'t be traced reliably; the layout is generated. Conn\'s course-tour videos could settle it.',
    sources: [
      'https://camelathletics.com/sports/2024/9/3/harkness-park-course-description.aspx',
      'https://camelathletics.com/facilities/?id=14',
      'https://camelathletics.com/sports/2024/9/24/2024-ncaa-division-iii-mideast-regional-cross-country-championship.aspx',
      'https://camelathletics.com/news/2025/10/30/mens-cross-country-camels-set-to-host-2025-nescac-xc-championships.aspx',
      'http://oak.conncoll.edu/sports/xcmap.pdf'
    ]
  };

  // schoolId -> courseId
  const HOME_OF = {
    middlebury: 'middlebury-golf-course',
    williams: 'mt-greylock',
    colby: 'quarry-road',
    hamilton: 'hamilton-college',
    conncoll: 'harkness-park',
    trinityct: 'wickham-park',
    wesleyan: 'long-lane-farm',
    bates: 'wainwright',
    bowdoin: 'pickard-field',
    washu: 'siue',
    uchicago: 'st-james-farm',
    wheatonil: 'st-james-farm',
    northcentral: 'st-james-farm',
    case: 'squire-valleevue-farm',
    rochester: 'genesee-valley-park',
    cmu: 'youthtowne-fields',
    brandeis: 'highland-park-attleboro'
  };

  XC.courses = {
    list: COURSES,
    homeOf: HOME_OF,
    byId: (id) => (id && COURSES[id] ? Object.assign({ id }, COURSES[id]) : null),
    forSchool: (schoolId) => XC.courses.byId(HOME_OF[schoolId])
  };
})(window.XC = window.XC || {});
