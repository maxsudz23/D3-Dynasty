// Contact sheet: node proto/tools/sheet.js out.png COLS x,y,w,h a.png b.png ...
// (crops each image to x,y,w,h and tiles them). Needs puppeteer-core.
const puppeteer = require('puppeteer-core');
const path = require('path');
const [out, cols, crop, ...files] = process.argv.slice(2); // crop = x,y,w,h
const [cx, cy, cw, ch] = crop.split(',').map(Number);
(async () => {
  const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--allow-file-access-from-files'] });
  const p = await b.newPage();
  const n = Number(cols); const rows = Math.ceil(files.length / n);
  await p.setViewport({ width: cw * n, height: ch * rows });
  await p.goto('file://' + path.resolve('.') + '/');
  await p.evaluate((files, n, cx, cy, cw, ch, dir) => {
    document.body.style.margin = 0;
    files.forEach((f, i) => {
      const d = document.createElement('div');
      Object.assign(d.style, { position: 'absolute', left: (i % n) * cw + 'px', top: Math.floor(i / n) * ch + 'px', width: cw + 'px', height: ch + 'px', overflow: 'hidden', outline: '1px solid #000' });
      const img = document.createElement('img'); img.src = 'file://' + dir + '/' + encodeURIComponent(f);
      Object.assign(img.style, { position: 'absolute', left: -cx + 'px', top: -cy + 'px' });
      d.appendChild(img); document.body.appendChild(d);
    });
  }, files, n, cx, cy, cw, ch, path.resolve('.'));
  await new Promise((r) => setTimeout(r, 500));
  await p.screenshot({ path: out });
  await b.close();
})();
