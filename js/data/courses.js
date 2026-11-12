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

  // schoolId -> courseId
  const HOME_OF = {
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
