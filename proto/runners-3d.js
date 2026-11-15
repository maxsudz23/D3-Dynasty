/* 3D runners prototype (not part of the game yet; see PROTOTYPE_3D.md).
   Procedural runners built from primitives, with a coded run cycle, racing
   the real SIUE course (lidar terrain, aerial photo, traced route) or a
   made-up demo loop, in real UAA colors.
   URL params: ?cam=chase|side|aerial|hero|overview &t=SECONDS &paused=1
   &squad=W &course=demo &solo=1 (only the followed runner) &hud=0 */
(function (XC) {
  'use strict';

  const U = XC.util;
  const THREE = window.THREE;
  const params = new URLSearchParams(location.search);
  const SQUAD = params.get('squad') === 'W' ? 'W' : 'M';
  const TAU = Math.PI * 2;

  const stage = document.getElementById('stage');
  const hud = document.getElementById('hud');

  function notice(text) {
    U.clear(stage).appendChild(U.h('p', { class: 'notice' }, text));
    hud.classList.add('hud--hidden');
  }

  if (!THREE) { notice('Three.js did not load.'); return; }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  } catch (err) {
    notice('3D needs WebGL, which this browser or device has turned off.');
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const SKY = new THREE.Color('#BFD6E6');
  scene.background = SKY;
  scene.fog = new THREE.Fog(SKY, 110, 380);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 3000);

  scene.add(new THREE.HemisphereLight('#E4EEF8', '#3E5A2C', 0.62));
  const sun = new THREE.DirectionalLight('#FFF1DA', 0.72);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 160 });
  sun.shadow.bias = -0.0005;
  scene.add(sun, sun.target);

  /* ---------- Course ---------- */

  // The real SIUE course (siue/course-data.js) unless ?course=demo.
  const REAL = params.get('course') === 'demo' ? null : (XC.realCourse || null);
  const rng = U.mulberry32(U.hash('proto-course'));
  const ROUTE_HALF = 3.2;
  const PATH_LIFT = REAL ? 0.12 : 0.05; // the mowed path sits just above the ground
  let photoReady = !REAL;
  if (REAL) scene.fog = new THREE.Fog(SKY, 300, 1700);

  let heightAt;
  if (REAL) {
    // Lidar ground heights (USGS 3DEP) on a grid, north row first, in cm.
    const n = REAL.grid;
    const raw = atob(REAL.heightsCm);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    const cm = new Uint16Array(bytes.buffer);
    const W = REAL.widthM;
    const H = REAL.heightM;
    const at = (c, r) => cm[r * n + c] / 100;
    heightAt = (x, z) => {
      const gx = U.clamp(((x + W / 2) / W) * (n - 1), 0, n - 1.001);
      const gz = U.clamp(((z + H / 2) / H) * (n - 1), 0, n - 1.001);
      const ix = Math.floor(gx);
      const iz = Math.floor(gz);
      const fx = gx - ix;
      const fz = gz - iz;
      return (at(ix, iz) * (1 - fx) + at(ix + 1, iz) * fx) * (1 - fz) + (at(ix, iz + 1) * (1 - fx) + at(ix + 1, iz + 1) * fx) * fz;
    };
  } else {
    const HILLS = [
      { x: -60, z: -40, h: 9, rx: 70, rz: 55 },
      { x: 90, z: 30, h: 6, rx: 55, rz: 80 },
      { x: 10, z: 95, h: 4, rx: 60, rz: 40 },
      { x: -150, z: 80, h: 12, rx: 80, rz: 70 },
      { x: 170, z: -110, h: 14, rx: 90, rz: 80 }
    ];
    heightAt = (x, z) => {
      let y = 0;
      HILLS.forEach((hl) => { y += hl.h * Math.exp(-(((x - hl.x) / hl.rx) ** 2 + ((z - hl.z) / hl.rz) ** 2)); });
      return y + 0.6 * Math.sin(x * 0.045) * Math.cos(z * 0.05);
    };
  }

  // Course data is in meters from the photo's NW corner; the scene is centered.
  const toScene = ([x, y]) => (REAL ? [x - REAL.widthM / 2, y - REAL.heightM / 2] : [x, y]);

  function resample(pts, closed, step) {
    const ring = closed ? pts.concat([pts[0]]) : pts;
    const out = [ring[0]];
    let carry = 0;
    for (let i = 1; i < ring.length; i++) {
      const [ax, az] = ring[i - 1];
      const [bx, bz] = ring[i];
      const len = Math.hypot(bx - ax, bz - az);
      let d = step - carry;
      while (d <= len) {
        out.push([ax + ((bx - ax) * d) / len, az + ((bz - az) * d) / len]);
        d += step;
      }
      carry = len - (d - step);
    }
    if (!closed) out.push(ring[ring.length - 1]);
    return out;
  }

  /* ---------- Route ---------- */

  let routePts;
  let closedRoute;
  if (REAL) {
    routePts = resample(REAL.races[SQUAD].map(toScene), false, 1);
    closedRoute = false;
  } else {
    const CONTROL = [
      [0, -120], [80, -110], [150, -60], [140, 20], [100, 70], [40, 80],
      [-10, 120], [-80, 110], [-130, 60], [-120, -10], [-70, -60], [-40, -110]
    ];
    const curve = new THREE.CatmullRomCurve3(CONTROL.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal');
    routePts = curve.getSpacedPoints(1200).map((v) => [v.x, v.z]);
    closedRoute = true;
  }
  const route = [];
  let routeLen = 0;
  routePts.forEach(([x, z], i) => {
    if (i > 0) routeLen += Math.hypot(x - routePts[i - 1][0], z - routePts[i - 1][1]);
    route.push({ p: new THREE.Vector3(x, heightAt(x, z), z), s: routeLen });
  });

  // Point on the route at distance s, offset sideways by `lane` meters. An
  // open route carries on straight past either end.
  function routeAt(s, lane, out) {
    let lo = 0;
    let hi = 1;
    if (closedRoute) s = ((s % routeLen) + routeLen) % routeLen;
    if (s >= routeLen) { lo = route.length - 2; hi = route.length - 1; } else if (s > 0) {
      hi = route.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (route[mid].s <= s) lo = mid; else hi = mid;
      }
    }
    const a = route[lo];
    const b = route[hi];
    const t = (s - a.s) / Math.max(1e-6, b.s - a.s);
    const dx = b.p.x - a.p.x;
    const dz = b.p.z - a.p.z;
    const len = Math.hypot(dx, dz) || 1;
    const fx = dx / len;
    const fz = dz / len;
    const x = a.p.x + dx * t - fz * lane;
    const z = a.p.z + dz * t + fx * lane;
    out.pos.set(x, heightAt(x, z), z);
    out.heading = Math.atan2(fx, fz);
    out.fwd.set(fx, 0, fz);
    out.side.set(-fz, 0, fx);
    // Grade over the next few meters, so the lidar's small bumps don't jitter.
    out.grade = (heightAt(x + fx * 4, z + fz * 4) - heightAt(x - fx * 4, z - fz * 4)) / 8;
    return out;
  }
  const newSample = () => ({ pos: new THREE.Vector3(), fwd: new THREE.Vector3(), side: new THREE.Vector3(), heading: 0, grade: 0 });

  // Stretches of trail to draw: every traced leg once, or the demo loop.
  const trails = REAL
    ? Object.values(REAL.legs).map((l) => resample(l.pts.map(toScene), l.closed, 2))
    : [resample(routePts, true, 2)];

  /* ---------- Ground ---------- */

  if (REAL) {
    const W = REAL.widthM;
    const H = REAL.heightM;
    const n = REAL.grid;
    const geo = new THREE.PlaneGeometry(W, H, n - 1, n - 1);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
    geo.computeVertexNormals();
    const groundMat = new THREE.MeshLambertMaterial({ color: '#FFFFFF' });
    // The photo is ~0.7 m a pixel, so it smears up close. Multiply in a
    // tiling grass texture every 4 m; mipmapping fades it out with distance.
    const detail = grassDetail();
    groundMat.onBeforeCompile = (shader) => {
      shader.uniforms.detailMap = { value: detail };
      shader.uniforms.detailRepeat = { value: new THREE.Vector2(W / 4, H / 4) };
      shader.fragmentShader = 'uniform sampler2D detailMap;\nuniform vec2 detailRepeat;\n' + shader.fragmentShader.replace(
        '#include <map_fragment>',
        '#include <map_fragment>\n#ifdef USE_MAP\n  diffuseColor.rgb *= mix(vec3(1.0), texture2D(detailMap, vUv * detailRepeat).rgb * 2.0, 0.45);\n#endif'
      );
    };
    const ground = new THREE.Mesh(geo, groundMat);
    ground.receiveShadow = true;
    scene.add(ground);
    new THREE.TextureLoader().load(REAL.photo, (tex) => {
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      groundMat.map = tex;
      groundMat.needsUpdate = true;
      plantTrees(tex.image);
      photoReady = true;
    }, undefined, () => { photoReady = true; });
  } else {
    const geo = new THREE.PlaneGeometry(700, 520, 175, 130);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = [];
    const base = new THREE.Color('#4A7531');
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, heightAt(x, z));
      const k = 0.5 + 0.5 * Math.sin(x * 0.11 + Math.cos(z * 0.07) * 3) * Math.cos(z * 0.13);
      c.copy(base).offsetHSL(0.012 * (k - 0.5), 0.05 * (k - 0.5), 0.05 * (k - 0.5));
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  // Mid-gray canvas of short light and dark blades: multiplies to ~1 on average.
  function grassDetail() {
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = 256;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = 'rgb(128,128,128)';
    ctx.fillRect(0, 0, 256, 256);
    const r = U.mulberry32(U.hash('grass-detail'));
    for (let i = 0; i < 2600; i++) {
      const x = r() * 256;
      const y = r() * 256;
      const v = Math.round(128 + U.randFloat(-46, 46, r));
      const a = U.randFloat(-0.5, 0.5, r) - Math.PI / 2;
      const len = U.randFloat(3, 9, r);
      ctx.strokeStyle = `rgb(${v},${Math.min(255, v + 6)},${v - 4})`;
      ctx.lineWidth = U.randFloat(0.8, 1.8, r);
      [0, 256, -256].forEach((ox) => [0, 256, -256].forEach((oy) => {
        ctx.beginPath();
        ctx.moveTo(x + ox, y + oy);
        ctx.lineTo(x + ox + Math.cos(a) * len, y + oy + Math.sin(a) * len);
        ctx.stroke();
      }));
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return tex;
  }

  /* ---------- Trail, flags, start and finish ---------- */

  // Side-to-side unit vector at point i of a polyline.
  function sideAt(pts, i) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
  }

  (function buildTrail() {
    const verts = [];
    const idx = [];
    const half = ROUTE_HALF + 0.4;
    trails.forEach((pts) => {
      const base = verts.length / 3;
      pts.forEach(([x, z], i) => {
        const [sx, sz] = sideAt(pts, i);
        [-half, half].forEach((w) => {
          const vx = x + sx * w;
          const vz = z + sz * w;
          verts.push(vx, heightAt(vx, vz) + PATH_LIFT, vz);
        });
        if (i > 0) {
          const a = base + (i - 1) * 2;
          idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      });
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mat = REAL
      ? new THREE.MeshLambertMaterial({ color: '#C9DB98', transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 })
      : new THREE.MeshLambertMaterial({ color: '#6E9646', side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    scene.add(mesh);
  })();

  (function buildFlags() {
    const SPACING = 9; // trail points are 2 m apart, so a flag pair every 18 m
    const spots = [];
    trails.forEach((pts) => {
      for (let i = 0; i < pts.length; i += SPACING) {
        const [sx, sz] = sideAt(pts, i);
        [-1, 1].forEach((k) => spots.push({ x: pts[i][0] + sx * k * (ROUTE_HALF + 0.8), z: pts[i][1] + sz * k * (ROUTE_HALF + 0.8), k, heading: Math.atan2(sz, -sx) }));
      }
    });
    const poleGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.1, 5);
    poleGeo.translate(0, 0.55, 0);
    const flagGeo = new THREE.PlaneGeometry(0.42, 0.3);
    flagGeo.translate(0.21, 0.93, 0);
    const poles = new THREE.InstancedMesh(poleGeo, new THREE.MeshLambertMaterial({ color: '#EEEEEE' }), spots.length);
    const flags = new THREE.InstancedMesh(flagGeo, new THREE.MeshLambertMaterial({ color: '#FFFFFF', side: THREE.DoubleSide }), spots.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    const up = new THREE.Vector3(0, 1, 0);
    const red = new THREE.Color('#D33B2C');
    const yellow = new THREE.Color('#F2C230');
    spots.forEach((sp, i) => {
      q.setFromAxisAngle(up, sp.heading + Math.PI / 2);
      m.compose(new THREE.Vector3(sp.x, heightAt(sp.x, sp.z), sp.z), q, one);
      poles.setMatrixAt(i, m);
      flags.setMatrixAt(i, m);
      flags.setColorAt(i, sp.k < 0 ? red : yellow);
    });
    poles.castShadow = true;
    scene.add(poles, flags);
  })();

  // Demo loop scenery: scattered trees.
  if (!REAL) {
    (function buildTrees() {
      const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 3, 6);
      trunkGeo.translate(0, 1.5, 0);
      const leafGeo = new THREE.IcosahedronGeometry(3.2, 0);
      leafGeo.translate(0, 5, 0);
      const pineGeo = new THREE.ConeGeometry(2.6, 7, 7);
      pineGeo.translate(0, 5.5, 0);
      const spots = [];
      let tries = 0;
      while (spots.length < 170 && tries++ < 5000) {
        const x = U.randFloat(-320, 320, rng);
        const z = U.randFloat(-240, 240, rng);
        const clear = route.every((r, k) => k % 6 || Math.hypot(r.p.x - x, r.p.z - z) > 13);
        if (clear) spots.push({ x, z, pine: rng() < 0.4, scale: U.randFloat(0.75, 1.35, rng), rot: rng() * TAU });
      }
      const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: '#5A4130' }), spots.length);
      const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshLambertMaterial({ color: '#3F6F2E', flatShading: true }), spots.length);
      const pines = new THREE.InstancedMesh(pineGeo, new THREE.MeshLambertMaterial({ color: '#3F7346', flatShading: true }), spots.length);
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
      const autumn = ['#5C9440', '#6FA048', '#A8A23A', '#D08A34', '#B95A33'].map((c) => new THREE.Color(c));
      spots.forEach((sp, k) => {
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), sp.rot);
        m.compose(new THREE.Vector3(sp.x, heightAt(sp.x, sp.z) - 0.2, sp.z), q, new THREE.Vector3(sp.scale, sp.scale, sp.scale));
        trunks.setMatrixAt(k, m);
        leaves.setMatrixAt(k, sp.pine ? hidden : m);
        pines.setMatrixAt(k, sp.pine ? m : hidden);
        leaves.setColorAt(k, autumn[k % autumn.length]);
      });
      [trunks, leaves, pines].forEach((mesh) => { mesh.castShadow = true; scene.add(mesh); });
    })();
  }

  // Real course: a tree wherever the aerial photo shows canopy (dark,
  // textured green), colored from the photo, kept clear of the trail.
  function plantTrees(img) {
    const W = REAL.widthM;
    const H = REAL.heightM;
    const cv = document.createElement('canvas');
    cv.width = img.width;
    cv.height = img.height;
    const ctx = cv.getContext('2d');
    ctx.drawImage(img, 0, 0);
    let px;
    try {
      px = ctx.getImageData(0, 0, cv.width, cv.height).data;
    } catch (err) {
      return; // a tainted canvas (shouldn't happen with a data URL): no trees
    }
    const kx = cv.width / W;
    const kz = cv.height / H;

    // Cells near a trail (no trees) and within reach of one (trees).
    const NEAR = 4;
    const FAR = 25;
    const nearCols = Math.ceil(W / NEAR);
    const farCols = Math.ceil(W / FAR);
    const near = new Uint8Array(nearCols * Math.ceil(H / NEAR));
    const far = new Uint8Array(farCols * Math.ceil(H / FAR));
    const mark = (grid, cols, size, x, z, r) => {
      const cx = Math.floor((x + W / 2) / size);
      const cz = Math.floor((z + H / 2) / size);
      const rows = grid.length / cols;
      for (let j = -r; j <= r; j++) {
        for (let i = -r; i <= r; i++) {
          if (i * i + j * j > r * r + r) continue;
          const c = cx + i;
          const rr = cz + j;
          if (c >= 0 && rr >= 0 && c < cols && rr < rows) grid[rr * cols + c] = 1;
        }
      }
    };
    trails.forEach((pts) => pts.forEach(([x, z], i) => {
      mark(near, nearCols, NEAR, x, z, 2);
      if (i % 10 === 0) mark(far, farCols, FAR, x, z, 16);
    }));
    const cell = (grid, cols, size, x, z) => grid[Math.floor((z + H / 2) / size) * cols + Math.floor((x + W / 2) / size)];

    const trees = [];
    const STEP = 6.5;
    const R = 3;
    for (let z = -H / 2 + STEP; z < H / 2 - STEP; z += STEP) {
      for (let x = -W / 2 + STEP; x < W / 2 - STEP; x += STEP) {
        const tx = x + U.randFloat(-2.5, 2.5, rng);
        const tz = z + U.randFloat(-2.5, 2.5, rng);
        if (!cell(far, farCols, FAR, tx, tz) || cell(near, nearCols, NEAR, tx, tz)) continue;
        const pxx = Math.round((tx + W / 2) * kx);
        const pzz = Math.round((tz + H / 2) * kz);
        let sr = 0; let sg = 0; let sb = 0; let sl = 0; let sl2 = 0; let cnt = 0;
        for (let j = -R; j <= R; j++) {
          for (let i = -R; i <= R; i++) {
            const qx = pxx + i;
            const qz = pzz + j;
            if (qx < 0 || qz < 0 || qx >= cv.width || qz >= cv.height) continue;
            const o = (qz * cv.width + qx) * 4;
            const l = 0.3 * px[o] + 0.59 * px[o + 1] + 0.11 * px[o + 2];
            sr += px[o]; sg += px[o + 1]; sb += px[o + 2]; sl += l; sl2 += l * l; cnt++;
          }
        }
        const L = sl / cnt;
        const sd = Math.sqrt(Math.max(0, sl2 / cnt - L * L));
        const green = sg >= sr && sg >= sb;
        if (!green || sd < 6.5 || L > 104) continue;
        trees.push({ x: tx, z: tz, r: sr / cnt / 255, g: sg / cnt / 255, b: sb / cnt / 255 });
      }
    }

    const crownGeo = new THREE.IcosahedronGeometry(1, 1);
    // Squash and jitter the crown a little so the trees aren't all spheres.
    const cp = crownGeo.attributes.position;
    for (let i = 0; i < cp.count; i++) {
      const k = 1 + 0.12 * Math.sin(cp.getX(i) * 5.1 + cp.getZ(i) * 3.7) * Math.cos(cp.getY(i) * 4.3);
      cp.setXYZ(i, cp.getX(i) * k, cp.getY(i) * k, cp.getZ(i) * k);
    }
    crownGeo.computeVertexNormals();
    const trunkGeo = new THREE.CylinderGeometry(0.14, 0.2, 1, 6);
    trunkGeo.translate(0, 0.5, 0);
    const crowns = new THREE.InstancedMesh(crownGeo, new THREE.MeshLambertMaterial({ color: '#FFFFFF', flatShading: true }), trees.length);
    const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: '#4B3A2C' }), trees.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const c = new THREE.Color();
    trees.forEach((t, i) => {
      const y0 = heightAt(t.x, t.z);
      // Crowns reach down to 2-5 m, so the woods read as a solid edge.
      const r = U.randFloat(3.8, 6.2, rng);
      const ry = r * U.randFloat(1.15, 1.6, rng);
      const base = U.randFloat(2, 5, rng);
      q.setFromAxisAngle(up, rng() * TAU);
      m.compose(new THREE.Vector3(t.x, y0 + base + ry, t.z), q, new THREE.Vector3(r, ry, r));
      crowns.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(t.x, y0 - 0.3, t.z), q, new THREE.Vector3(1.6, base + ry * 0.6, 1.6));
      trunks.setMatrixAt(i, m);
      c.setRGB(t.r * 1.3, t.g * 1.3, t.b * 1.15).offsetHSL(U.randFloat(-0.015, 0.015, rng), 0.1, U.randFloat(-0.04, 0.03, rng));
      crowns.setColorAt(i, c);
    });
    crowns.castShadow = true;
    trunks.castShadow = true;
    scene.add(crowns, trunks);
    window.__protoTrees = trees.length;
  }

  function textTexture(text, bg, fg) {
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 96;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = fg;
    ctx.font = '800 64px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cv.width / 2, cv.height / 2 + 2);
    return new THREE.CanvasTexture(cv);
  }

  (function buildArch() {
    const sample = routeAt(closedRoute ? 0 : routeLen, 0, newSample());
    const group = new THREE.Group();
    const postMat = new THREE.MeshLambertMaterial({ color: '#A51417' });
    const postGeo = new THREE.BoxGeometry(0.35, 4, 0.35);
    [-1, 1].forEach((k) => {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(k * (ROUTE_HALF + 0.9), 2, 0);
      post.castShadow = true;
      group.add(post);
    });
    const tex = textTexture('FINISH', '#A51417', '#FFFFFF');
    const side = new THREE.MeshLambertMaterial({ color: '#A51417' });
    const face = new THREE.MeshLambertMaterial({ map: tex });
    const banner = new THREE.Mesh(new THREE.BoxGeometry((ROUTE_HALF + 1.1) * 2, 0.9, 0.25), [side, side, side, side, face, face]);
    banner.position.y = 3.7;
    banner.castShadow = true;
    group.add(banner);
    group.position.copy(sample.pos);
    group.rotation.y = sample.heading;
    scene.add(group);
    if (!closedRoute) {
      // Chalk start line.
      const start = routeAt(0, 0, newSample());
      const line = new THREE.Mesh(new THREE.BoxGeometry(ROUTE_HALF * 2 + 4, 0.04, 0.18), new THREE.MeshLambertMaterial({ color: '#FFFFFF' }));
      line.position.copy(start.pos);
      line.position.y += PATH_LIFT + 0.02;
      line.rotation.y = start.heading;
      scene.add(line);
    }
  })();

  /* ---------- Runner model ---------- */

  const SKIN = ['#F2CBA8', '#E3B08A', '#C99067', '#A36D49', '#7D5034', '#5B3A26'];
  const HAIR = ['#1F1A16', '#3A2A1E', '#5E4129', '#8E6439', '#C9A15F', '#2B2B2B'];
  const SHOES = ['#F4F4F4', '#C6F432', '#FF4F8B', '#FF7A1A', '#2E8BFF', '#1B1B1B', '#7C4DFF'];

  const G = {
    torso: new THREE.CapsuleGeometry(0.14, 0.26, 4, 12),
    hips: new THREE.CapsuleGeometry(0.13, 0.05, 4, 12),
    sash: new THREE.BoxGeometry(0.07, 0.46, 0.27),
    bib: new THREE.PlaneGeometry(0.15, 0.11),
    neck: new THREE.CylinderGeometry(0.048, 0.055, 0.1, 8),
    head: new THREE.SphereGeometry(0.105, 16, 12),
    hair: new THREE.SphereGeometry(0.112, 16, 10, 0, TAU, 0, Math.PI * 0.55),
    pony: new THREE.CapsuleGeometry(0.035, 0.13, 3, 8),
    upperArm: new THREE.CapsuleGeometry(0.042, 0.2, 3, 8),
    forearm: new THREE.CapsuleGeometry(0.037, 0.19, 3, 8),
    hand: new THREE.SphereGeometry(0.045, 8, 6),
    shortsLeg: new THREE.CylinderGeometry(0.078, 0.072, 0.2, 10),
    thigh: new THREE.CapsuleGeometry(0.062, 0.34, 3, 10),
    shin: new THREE.CapsuleGeometry(0.046, 0.35, 3, 10),
    sock: new THREE.CylinderGeometry(0.047, 0.045, 0.09, 8),
    shoe: new THREE.BoxGeometry(0.095, 0.07, 0.26)
  };
  const L_THIGH = 0.44;
  const L_SHIN = 0.43;

  const matCache = new Map();
  function mat(hex) {
    if (!matCache.has(hex)) matCache.set(hex, new THREE.MeshLambertMaterial({ color: hex }));
    return matCache.get(hex);
  }

  function part(geo, material, x, y, z) {
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x || 0, y || 0, z || 0);
    mesh.castShadow = true;
    return mesh;
  }
  function joint(parent, x, y, z) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  }

  // One runner: a root placed on the course, with a jointed body inside.
  function makeRunner(team, look) {
    const skin = mat(look.skin);
    const kit = mat(team.primary);
    const trim = mat(team.accent);
    const shorts = mat(team.shorts);
    const root = new THREE.Group();
    const body = joint(root, 0, 0.95, 0);
    body.scale.setScalar(look.scale);

    const pelvis = joint(body, 0, 0, 0);
    pelvis.add(part(G.hips, shorts, 0, 0.02, 0));
    const legs = [1, -1].map((side) => {
      const hip = joint(pelvis, side * 0.085, -0.02, 0);
      hip.add(part(G.shortsLeg, shorts, 0, -0.09, 0));
      hip.add(part(G.thigh, skin, 0, -L_THIGH / 2, 0));
      const knee = joint(hip, 0, -L_THIGH, 0);
      knee.add(part(G.shin, skin, 0, -L_SHIN / 2, 0));
      knee.add(part(G.sock, mat('#F4F4F4'), 0, -L_SHIN + 0.06, 0));
      const ankle = joint(knee, 0, -L_SHIN, 0);
      ankle.add(part(G.shoe, mat(look.shoe), 0, -0.04, 0.055));
      return { hip, knee, ankle };
    });

    const torso = joint(body, 0, 0.02, 0);
    const chest = part(G.torso, kit, 0, 0.29, 0);
    chest.scale.set(1.18, 1, 0.78);
    torso.add(chest);
    const sash = part(G.sash, trim, 0, 0.3, 0);
    sash.rotation.z = 0.62;
    sash.scale.set(1, 1, 0.82);
    torso.add(sash);
    const bib = part(G.bib, mat('#FFFFFF'), 0, 0.22, 0.112);
    bib.castShadow = false;
    torso.add(bib);
    torso.add(part(G.neck, skin, 0, 0.58, 0));
    const head = joint(torso, 0, 0.7, 0.01);
    const skull = part(G.head, skin);
    skull.scale.set(0.95, 1.1, 1);
    head.add(skull);
    const hair = part(G.hair, mat(look.hair), 0, 0.012, -0.008);
    hair.rotation.x = -0.45;
    hair.scale.set(0.97, 1.08, 1.04);
    head.add(hair);
    let pony = null;
    if (look.pony) {
      pony = joint(head, 0, 0.03, -0.1);
      pony.add(part(G.pony, mat(look.hair), 0, -0.08, 0));
    }

    const arms = [1, -1].map((side) => {
      const shoulder = joint(torso, side * 0.2, 0.47, 0);
      shoulder.rotation.z = side * 0.14;
      shoulder.add(part(G.upperArm, skin, 0, -0.13, 0));
      const elbow = joint(shoulder, 0, -0.27, 0);
      elbow.add(part(G.forearm, skin, 0, -0.12, 0));
      elbow.add(part(G.hand, skin, 0, -0.25, 0));
      return { shoulder, elbow };
    });

    return { root, body, pelvis, torso, head, pony, legs, arms, scale: look.scale };
  }

  /* ---------- Run cycle ---------- */

  // Smooth bump of half-width w centered on c, in phase (radians).
  function bump(phi, c, w) {
    let d = phi - c;
    d = ((d + Math.PI) % TAU + TAU) % TAU - Math.PI;
    if (Math.abs(d) >= w) return 0;
    const k = Math.cos((d / w) * Math.PI / 2);
    return k * k;
  }

  // Leg angles for phase phi: 0 = thigh vertical moving forward,
  // pi/2 = thigh fully forward (foot about to land), 3pi/2 = toe-off.
  function legPose(phi, amp) {
    const hip = -(0.2 + 0.6 * amp * Math.sin(phi));
    // Knee folds hardest mid-swing, as the thigh passes under the body.
    const knee = 0.16 + 0.34 * bump(phi, Math.PI * 0.95, 0.85) + 1.9 * amp * bump(phi, 6.0, 1.55);
    const ankle = -(hip + knee) * 0.7 + 0.7 * bump(phi, 4.35, 0.75) - 0.15 * bump(phi, 1.4, 0.6);
    return { hip, knee, ankle };
  }

  // How high the hip must sit so this foot's heel and toe stay on ground
  // that rises `grade` meters per meter ahead. Sagittal-plane kinematics.
  const FOOT_PTS = [[-0.075, -0.075], [-0.075, 0.185]]; // [y, z] in the ankle frame
  function hipLift(p, grade) {
    const a = p.hip;
    const ak = a + p.knee;
    const t = ak + p.ankle;
    const ay = -L_THIGH * Math.cos(a) - L_SHIN * Math.cos(ak);
    const az = -L_THIGH * Math.sin(a) - L_SHIN * Math.sin(ak);
    let need = -Infinity;
    FOOT_PTS.forEach(([y0, z0]) => {
      const py = ay + y0 * Math.cos(t) - z0 * Math.sin(t);
      const pz = az + y0 * Math.sin(t) + z0 * Math.cos(t);
      need = Math.max(need, grade * pz - py);
    });
    return need;
  }

  function pose(r, phi, speed, grade) {
    const amp = U.clamp(speed / 5.6, 0.55, 1.25);
    const lp = legPose(phi, amp);
    const rp = legPose(phi + Math.PI, amp);
    [lp, rp].forEach((p, i) => {
      const leg = r.legs[i];
      leg.hip.rotation.x = p.hip;
      leg.knee.rotation.x = p.knee;
      leg.ankle.rotation.x = p.ankle;
    });
    // Each arm swings with the opposite leg.
    [phi + Math.PI, phi].forEach((a, i) => {
      const arm = r.arms[i];
      arm.shoulder.rotation.x = -(0.12 + 0.5 * amp * Math.sin(a));
      arm.elbow.rotation.x = -(1.3 + 0.35 * amp * Math.max(0, Math.sin(a)));
    });
    const lean = 0.13 + U.clamp(grade, -0.1, 0.15) * 1.2;
    r.torso.rotation.x = lean;
    r.torso.rotation.y = 0.11 * amp * Math.sin(phi);
    r.pelvis.rotation.y = -0.08 * amp * Math.sin(phi);
    r.head.rotation.x = -lean * 0.8;
    if (r.pony) r.pony.rotation.x = 0.35 + 0.25 * Math.sin(phi * 2 + 0.8);
    if (r.pony) r.pony.rotation.z = 0.2 * Math.sin(phi);
    // Plant the lower foot, then add a little flight between steps.
    const g = U.clamp(grade, -0.3, 0.3);
    const lift = Math.max(hipLift(lp, g), hipLift(rp, g));
    const flight = 0.035 * amp * Math.max(0, -Math.cos(2 * phi));
    r.body.position.y = (lift + flight) * r.scale;
  }

  /* ---------- Field ---------- */

  const TEAM_IDS = ['washu', 'uchicago', 'emory', 'case', 'cmu', 'nyu', 'rochester'];
  const teams = TEAM_IDS.map((id) => {
    const sc = XC.schools.byId(id);
    const shorts = U.luminance(sc.accent) < 0.18 ? sc.accent : U.mixHex(sc.primary, '#101010', 0.6);
    return { id, name: sc.short, primary: sc.primary, accent: sc.accent, shorts, mine: id === 'washu' };
  });

  const markerGeo = new THREE.ConeGeometry(0.16, 0.3, 4);
  markerGeo.rotateX(Math.PI);
  const markerMat = new THREE.MeshBasicMaterial({ color: '#FFD23F' });

  const runners = [];
  const fieldRng = U.mulberry32(U.hash(`proto-field-${SQUAD}`));
  teams.forEach((team, t) => {
    for (let k = 0; k < 7; k++) {
      const look = {
        skin: U.pick(SKIN, fieldRng),
        hair: U.pick(HAIR, fieldRng),
        shoe: U.pick(SHOES, fieldRng),
        scale: (SQUAD === 'W' ? 0.93 : 1) * U.randFloat(0.95, 1.05, fieldRng),
        pony: SQUAD === 'W' && fieldRng() < 0.7
      };
      const model = makeRunner(team, look);
      if (team.mine) {
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.position.y = 2.25;
        model.root.add(marker);
        model.marker = marker;
      }
      scene.add(model.root);
      const n = runners.length;
      runners.push({
        team, model,
        s0: (closedRoute ? 40 : 3) - Math.floor(n / 7) * 1.4 - fieldRng() * 0.4,
        lane0: -2.7 + (n % 7) * 0.9,
        laneVel: 0,
        ability: 1 + U.gauss(0, 0.018, fieldRng) + (team.mine ? 0.006 : 0),
        drift: fieldRng() * TAU,
        phi: fieldRng() * TAU,
        speed: 5.4,
        sample: newSample()
      });
    }
  });
  function lineUp() {
    runners.forEach((r) => { r.s = r.s0; r.lane = r.lane0; r.laneVel = 0; r.speed = 5.4; });
  }
  lineUp();

  // The camera follows your best-placed runner.
  // (On an open route the race restarts once the leader is well past the finish.)
  let focus = runners.find((r) => r.team.mine);
  function updateFocus() {
    const best = runners.filter((r) => r.team.mine).reduce((a, b) => (b.s > a.s ? b : a));
    if (best !== focus && best.s - focus.s > 1.5) focus = best;
  }

  function stepField(dt, time) {
    runners.forEach((r) => routeAt(r.s, r.lane, r.sample));
    runners.forEach((r) => {
      const grade = r.sample.grade;
      let v = 5.55 * (r.ability + 0.012 * Math.sin(time * 0.08 + r.drift)) * (1 - U.clamp(grade, -0.08, 0.12) * 2.6);
      // Look for someone just ahead in the same lane: ease off and move around.
      let push = 0;
      runners.forEach((o) => {
        if (o === r) return;
        let ds = o.s - r.s;
        if (closedRoute && ds < -routeLen / 2) ds += routeLen;
        const dl = o.lane - r.lane;
        if (ds > 0 && ds < 1.6 && Math.abs(dl) < 0.62) {
          v = Math.min(v, o.speed + 0.05);
          push += (dl >= 0 ? -1 : 1) * (1.6 - ds);
        }
        if (Math.abs(ds) < 0.7 && Math.abs(dl) < 0.55) push += (dl >= 0 ? -1 : 1) * 0.8;
      });
      r.laneVel += (push * 1.4 - r.laneVel * 2.5 - r.lane * 0.06) * dt;
      r.speed += (v - r.speed) * Math.min(1, dt * 2);
    });
    runners.forEach((r) => {
      r.lane = U.clamp(r.lane + r.laneVel * dt, -ROUTE_HALF + 0.4, ROUTE_HALF - 0.4);
      r.s += r.speed * dt;
      const step = 1.5 + 0.28 * (r.speed / 5.6);
      r.phi = (r.phi + TAU * r.speed / (2 * step) * dt) % TAU;
    });
    if (!closedRoute && runners.every((r) => r.s > routeLen + 15)) lineUp();
  }

  function placeField(time) {
    runners.forEach((r) => {
      const sm = routeAt(r.s, r.lane, r.sample);
      r.model.root.position.copy(sm.pos);
      r.model.root.position.y += PATH_LIFT;
      r.model.root.rotation.y = sm.heading;
      pose(r.model, r.phi, r.speed, sm.grade);
      if (r.model.marker) r.model.marker.position.y = 2.25 + 0.08 * Math.sin(time * 3 + r.drift);
    });
  }

  /* ---------- Cameras ---------- */

  const CAMS = [
    { id: 'chase', label: 'Chase' },
    { id: 'side', label: 'Broadcast' },
    { id: 'aerial', label: 'Aerial' },
    { id: 'hero', label: 'Close-up' },
    { id: 'overview', label: 'Overview' }
  ];
  let camMode = CAMS.some((c) => c.id === params.get('cam')) ? params.get('cam') : 'side';
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const wantPos = new THREE.Vector3();
  const wantLook = new THREE.Vector3();
  let snapCam = true;

  function packCenter(out) {
    // Average of the front half of the field, so the leaders stay in frame.
    const lead = runners.slice().sort((a, b) => b.s - a.s).slice(0, 24);
    out.set(0, 0, 0);
    lead.forEach((r) => out.add(r.model.root.position));
    return out.multiplyScalar(1 / lead.length);
  }

  const tmpC = new THREE.Vector3();
  const centerSample = newSample();
  function aimCamera(dt, time) {
    const f = focus.sample;
    const fp = focus.model.root.position;
    if (camMode === 'chase') {
      wantPos.copy(fp).addScaledVector(f.fwd, -9).addScaledVector(f.side, 2);
      wantPos.y = fp.y + 4.6;
      wantLook.copy(fp).addScaledVector(f.fwd, 7);
      wantLook.y = fp.y + 0.6;
    } else if (camMode === 'side') {
      packCenter(tmpC);
      const lead = runners.reduce((a, b) => (b.s > a.s ? b : a));
      routeAt(lead.s - 6, 0, centerSample);
      wantPos.copy(centerSample.pos).addScaledVector(centerSample.side, 15).addScaledVector(centerSample.fwd, 6);
      wantPos.y = Math.max(heightAt(wantPos.x, wantPos.z), centerSample.pos.y) + 3.4;
      wantLook.copy(centerSample.pos);
      wantLook.y += 0.9;
    } else if (camMode === 'aerial') {
      packCenter(tmpC);
      const a = time * 0.05;
      const reach = REAL ? 70 : 34;
      wantPos.set(tmpC.x + Math.cos(a) * reach, tmpC.y + reach * 0.85, tmpC.z + Math.sin(a) * reach);
      wantLook.copy(tmpC);
    } else if (camMode === 'overview') {
      // The whole course, slowly circling its middle.
      const a = 0.6 + time * 0.02;
      const reach = REAL ? 620 : 260;
      tmpC.set(0, heightAt(0, 0), 0);
      wantPos.set(Math.cos(a) * reach, tmpC.y + reach * 0.75, Math.sin(a) * reach);
      wantLook.copy(tmpC);
    } else {
      wantPos.copy(fp).addScaledVector(f.side, 2.9).addScaledVector(f.fwd, 1.5);
      wantPos.y = fp.y + 1.15;
      wantLook.copy(fp);
      wantLook.y += 1.0;
    }
    const k = snapCam ? 1 : 1 - Math.exp(-dt * 4);
    camPos.lerp(wantPos, k);
    camLook.lerp(wantLook, k);
    snapCam = false;
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    // Keep the shadow box around the action.
    sun.target.position.copy(camMode === 'aerial' || camMode === 'side' ? tmpC : fp);
    if (camMode === 'overview') sun.target.position.copy(fp);
    sun.position.copy(sun.target.position).add(new THREE.Vector3(-30, 60, 25));
    const span = camMode === 'aerial' ? (REAL ? 80 : 45) : 30;
    Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span });
    sun.shadow.camera.updateProjectionMatrix();
  }

  /* ---------- Loop and controls ---------- */

  let paused = params.get('paused') === '1';
  let rate = 1;
  let time = 0;
  const DT = 1 / 60;
  const startAt = Math.max(0, Number(params.get('t')) || 0);
  while (time < startAt) { stepField(DT, time); updateFocus(); time += DT; }
  // Debug stills: only the followed runner.
  if (params.get('solo') === '1') runners.forEach((r) => { r.model.root.visible = r === focus; });

  const buttons = {};
  function sync() {
    CAMS.forEach((c) => buttons[c.id].setAttribute('aria-pressed', String(c.id === camMode)));
    buttons.pause.textContent = paused ? 'Play' : 'Pause';
    buttons.rate.textContent = `${rate}×`;
  }
  function setCam(id) { camMode = id; snapCam = true; sync(); }

  if (params.get('hud') === '0') hud.classList.add('hud--hidden');
  hud.appendChild(U.h('span', { class: 'hud__title' }, `3D prototype · ${SQUAD === 'W' ? 'Women' : 'Men'}`));
  CAMS.forEach((c, i) => {
    buttons[c.id] = U.h('button', { type: 'button', title: `Key ${i + 1}`, on: { click: () => setCam(c.id) } }, c.label);
    hud.appendChild(buttons[c.id]);
  });
  buttons.pause = U.h('button', { type: 'button', title: 'Space', on: { click: () => { paused = !paused; sync(); } } }, 'Pause');
  const RATES = [1, 2, 4, 8, 0.25];
  buttons.rate = U.h('button', { type: 'button', on: { click: () => { rate = RATES[(RATES.indexOf(rate) + 1) % RATES.length]; sync(); } } }, '1×');
  const other = new URLSearchParams(location.search);
  other.set('squad', SQUAD === 'W' ? 'M' : 'W');
  hud.append(buttons.pause, buttons.rate, U.h('button', {
    type: 'button', on: { click: () => { location.search = other.toString(); } }
  }, SQUAD === 'W' ? 'Men' : 'Women'));
  const otherCourse = new URLSearchParams(location.search);
  if (REAL) otherCourse.set('course', 'demo'); else otherCourse.delete('course');
  hud.append(U.h('button', {
    type: 'button', on: { click: () => { location.search = otherCourse.toString(); } }
  }, REAL ? 'Demo loop' : 'SIUE'));
  if (REAL) hud.append(U.h('span', { class: 'hud__credit' }, `${REAL.name} · ${REAL.credits}`));
  sync();

  document.addEventListener('keydown', (e) => {
    const n = Number(e.key);
    if (n >= 1 && n <= CAMS.length) setCam(CAMS[n - 1].id);
    if (e.key === ' ') { e.preventDefault(); paused = !paused; sync(); }
  });

  function resize() {
    const w = stage.clientWidth || window.innerWidth;
    const h = stage.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000) * rate;
    last = now;
    if (!paused) {
      let left = dt;
      while (left > 1e-6) {
        const d = Math.min(DT, left);
        stepField(d, time);
        updateFocus();
        time += d;
        left -= d;
      }
    }
    placeField(time);
    aimCamera(paused ? 1 : dt, time);
    renderer.render(scene, camera);
    if (photoReady) window.__protoReady = true;
    requestAnimationFrame(frame);
  }
  placeField(time);
  aimCamera(1, time);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
})(window.XC = window.XC || {});
