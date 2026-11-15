const puppeteer = require('puppeteer-core');
// Stills of the 3D prototype for checking by eye. Needs puppeteer-core (not a
// repo dependency): run with NODE_PATH pointing at a scratch install.
//   node proto/tools/shots.js side:45 chase:250 hero:30:solo=1 overview:20:course=demo
// Each arg is cam:seconds[:extra query]. PNGs land in the current directory.
const path = require('path');
const BASE = 'file://' + encodeURI(path.resolve(__dirname, '../runners-3d.html'));
const shots = process.argv.slice(2).length ? process.argv.slice(2) : ['hero:30', 'chase:30', 'side:30', 'aerial:30'];
(async () => {
  const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new',
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage(); await p.setViewport({ width: 1280, height: 720 });
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  for (const s of shots) {
    const [cam, t, squad] = s.split(':');
    await p.goto(`${BASE}?cam=${cam}&t=${t}&paused=1&hud=0${squad ? '&' + squad : ''}`);
    await p.waitForFunction('window.__protoReady', { timeout: 120000 });
    await new Promise((r) => setTimeout(r, 1500)); console.log(s, 'trees', await p.evaluate(() => window.__protoTrees));
    await p.screenshot({ path: `shot-${cam}-${t}${squad || ''}.png` });
  }
  console.log('errors', JSON.stringify(errs));
  await b.close();
})();
