/* Athletics logos for real programs, from Wikimedia Commons. Every file is
   tagged public domain there (a simple text or shape logo) and is still the
   school's trademark. Sources are listed in img/logos/SOURCES.md. Schools
   not listed here, and custom schools, keep the generated monogram crest.
   Maps school id to the file extension in img/logos, or to
   [extension, scale] for a logo drawn smaller to clear the shield's edge. */
(function (XC) {
  'use strict';

  const LOGOS = {
    washu: 'svg',
    uchicago: 'svg',
    case: 'png',
    nyu: 'svg',
    rochester: 'svg',
    brandeis: 'png',
    williams: 'png',
    middlebury: ['png', 0.84],
    colby: 'png',
    hamilton: 'svg',
    trinityct: 'png',
    northcentral: 'svg',
    carthage: 'svg',
    millikin: 'svg',
    uwec: 'svg',
    uwosh: 'png',
    uwrf: 'png',
    carleton: 'svg',
    sju: 'svg',
    csb: 'svg',
    hamline: 'svg',
    bethel: 'svg',
    wartburg: 'svg',
    centraliowa: 'svg',
    simpson: 'svg',
    haverford: 'png',
    swarthmore: 'svg',
    muhlenberg: 'svg',
    mcdaniel: 'svg',
    oxy: 'svg',
    callutheran: 'svg',
    whitworth: 'svg',
    georgefox: 'svg',
    pugetsound: 'svg',
    willamette: 'png',
    kenyon: 'svg',
    denison: 'svg',
    wooster: 'png',
    oberlin: 'svg',
    owu: 'png',
    wabash: 'png',
    depauw: 'png',
    albion: 'svg',
    alma: 'png',
    kzoo: 'png',
    trine: 'svg',
    olivet: 'svg',
    rpi: 'svg',
    vassar: 'svg',
    rit: 'png',
    union: 'svg',
    clarkson: 'png',
    ithaca: 'svg',
    oneonta: 'svg',
    wpi: 'png',
    springfield: 'svg',
    wellesley: 'png',
    smith: 'png',
    mtholyoke: 'png',
    wheatonma: 'png',
    wlu: 'png',
    lynchburg: 'png',
    bridgewater: 'png',
    rmc: 'png',
    emu: 'png',
    cnu: 'png',
    centre: 'png',
    sewanee: 'png',
    tcnj: 'png',
    rowan: 'png',
    wpunj: 'png'
  };

  const has = (school) => !!(school && Object.prototype.hasOwnProperty.call(LOGOS, school.id));
  const entry = (school) => [].concat(LOGOS[school.id]);

  XC.logos = {
    has,
    pathFor: (school) => (has(school) ? `img/logos/${school.id}.${entry(school)[0]}` : null),
    scaleFor: (school) => (has(school) ? entry(school)[1] || 1 : 1)
  };
})(window.XC = window.XC || {});
