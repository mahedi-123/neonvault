import * as THREE from 'three';
import { starVert, starFrag, skyVert, skyFrag, billboardVert, nebulaFrag, glowFrag, warpVert, warpFrag } from './shaders';

/**
 * MILKY WAY — a barred spiral galaxy rendered behind every page.
 *
 *   • ~140k stars (fewer on phones / weak GPUs) in four logarithmic arms with
 *     dust lanes, pink HII star-forming knots, a warm bulge, a rotating bar
 *     and a faint halo — all animated on the GPU.
 *   • the page's scroll position flies the camera along a path: a wide view
 *     beside the hero, then down through the arms, skimming the disk, and up
 *     over the bright core at the end of the page.
 *   • the pointer is a gravitational lens; a click sends a shockwave.
 *   • route changes jump to hyperspace (warp streaks + FOV punch).
 *
 * The engine owns no DOM except its canvas; React drives it via setScroll,
 * setPointer, pulse() and warp().
 */

const R = 10; // galaxy radius in world units
const PITCH = 17; // arm pitch angle in degrees (the Milky Way's is ~12–20°)

// camera flight: [scroll progress, distance, elevation°, azimuth°, screen shift]
const PATH = [
  [0.0, 15.5, 52, 18, 0.2],
  [0.16, 11.5, 34, 58, 0.04],
  [0.36, 7.8, 15, 112, -0.12],
  [0.58, 5.6, 7, 172, 0.0],
  [0.8, 7.2, 24, 236, 0.08],
  [1.0, 4.2, 66, 300, 0.0],
];

const rand = mulberry32(20261024);
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = () => {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
};
const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

/** Build every star once. Returns typed arrays for the attributes. */
function buildGalaxy(count) {
  const orbit = new Float32Array(count * 4);
  const color = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const seed = new Float32Array(count);
  const ARMS = 4;
  const pitch = Math.tan((PITCH * Math.PI) / 180);
  const young = [0.62, 0.76, 1.0];
  const old = [1.0, 0.86, 0.68];
  const hii = [1.0, 0.42, 0.74];
  const warm = [1.0, 0.8, 0.56];

  for (let i = 0; i < count; i++) {
    const roll = rand();
    let r; let a; let y; let kind = 0; let c; let s = 0.04 + rand() * 0.04;
    if (roll < 0.035) {
      // arm haze: big, faint sprites along the arm crests — the milky glow of
      // unresolved stars and gas that makes the spiral read from far away
      kind = 4;
      const h = 3.6;
      r = 0.9 + -h * Math.log(1 - rand() * (1 - Math.exp(-(R - 0.9) / h)));
      const arm = Math.floor(rand() * ARMS);
      a = arm * ((2 * Math.PI) / ARMS) + Math.log(r / 0.7) / pitch + gauss() * (0.12 + 0.1 * (r / R));
      y = gauss() * 0.05;
      const tint = rand();
      c = (tint < 0.14 ? hii : tint < 0.75 ? [0.42, 0.52, 1.0] : [0.75, 0.6, 1.0]).map((v) => v * (r < 2.5 ? 0.05 : 0.07 + 0.03 * (r / R)));
      if (r < 2.5) c = warm.map((v) => v * 0.06);
      s = 0.7 + rand() * 1.1;
    } else if (roll < 0.68) {
      // disk: exponential radial profile, most stars in arms, some between
      const h = 3.4;
      // shifted exponential: no pile-up of stars at the inner edge
      r = 0.85 + -h * Math.log(1 - rand() * (1 - Math.exp(-(R - 0.85) / h)));
      const arm = Math.floor(rand() * ARMS);
      const strong = arm % 2 === 0; // two major + two minor arms
      const armAngle = arm * ((2 * Math.PI) / ARMS) + Math.log(r / 0.7) / pitch;
      const inArm = rand() < (strong ? 0.86 : 0.7);
      const spread = (0.18 + 0.22 * (r / R)) * (strong ? 1 : 1.35);
      const off = inArm ? gauss() * spread : (rand() - 0.5) * Math.PI;
      a = armAngle + off;
      y = gauss() * 0.11 * (1 - 0.55 * (r / R));
      const t = Math.min(1, Math.abs(off) / (spread * 1.6));
      c = inArm ? young.map((v, k) => lerp(v, old[k], t * 0.7)) : old.slice();
      // dust lane on the inner (trailing) edge of each arm
      if (inArm && off < -spread * 0.25 && off > -spread * 1.1 && r > 1.6) {
        c = c.map((v, k) => v * (k === 0 ? 0.32 : 0.2));
        s *= 0.8;
      }
      // star-forming knots along the arm crest
      if (inArm && Math.abs(off) < spread * 0.4 && rand() < 0.045 && r > 2) {
        c = hii.slice();
        s *= 2.6;
      }
      const bright = (inArm ? 0.7 + 0.35 * (r / R) : 0.4) + rand() * 0.55;
      c = c.map((v) => v * bright);
    } else if (roll < 0.86) {
      // bulge
      kind = 1;
      r = Math.abs(gauss()) * 1.05;
      a = rand() * Math.PI * 2;
      y = gauss() * 0.55 * Math.exp(-r * 0.5);
      c = warm.map((v) => v * (0.7 + rand() * 0.5));
      s *= 1.15;
    } else if (roll < 0.95) {
      // bar: local x/z, rotated rigidly in the shader
      kind = 2;
      r = gauss() * 2.1; // along the bar
      a = gauss() * 0.45; // across it
      y = gauss() * 0.22;
      c = warm.map((v, k) => v * (0.75 + rand() * 0.35) * (k === 2 ? 0.9 : 1));
    } else {
      // halo
      kind = 3;
      r = 2 + Math.abs(gauss()) * 6;
      a = rand() * Math.PI * 2;
      y = gauss() * 4;
      c = old.map((v) => v * 0.35);
      s *= 0.8;
    }
    orbit.set([r, a, y, kind], i * 4);
    color.set(c, i * 3);
    size[i] = s;
    seed[i] = rand();
  }
  return { orbit, color, size, seed };
}

function buildSky(count) {
  const pos = new Float32Array(count * 3);
  const color = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    // uniform on a sphere, with a denser band (a far neighbour's milky way)
    let x = gauss(); let y = gauss(); let z = gauss();
    if (rand() < 0.45) y *= 0.12;
    const l = Math.hypot(x, y, z) || 1;
    const rad = 70 + rand() * 30;
    pos.set([(x / l) * rad, (y / l) * rad, (z / l) * rad], i * 3);
    const tint = rand();
    color.set(tint < 0.6 ? [0.8, 0.86, 1] : tint < 0.85 ? [1, 0.92, 0.8] : [1, 0.7, 0.85], i * 3);
    size[i] = 60 + rand() * 120;
    seed[i] = rand();
  }
  return { pos, color, size, seed };
}

export default class GalaxyEngine {
  static create(canvas, opts) {
    try {
      return new GalaxyEngine(canvas, opts);
    } catch (e) {
      console.warn('[galaxy] WebGL unavailable', e);
      return null;
    }
  }

  constructor(canvas, { lite = false, small = false, reduced = false } = {}) {
    this.canvas = canvas;
    this.reduced = reduced;
    this.small = small;
    this.dprCap = lite ? 1 : small ? 1.25 : 1.5;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x020108, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.dprCap));

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(52, 1, 0.05, 400);
    this.scene.add(this.camera);
    this.galaxy = new THREE.Group();
    this.galaxy.rotation.z = 0.08; // a slight tilt reads as more natural than a perfect plane
    this.scene.add(this.galaxy);

    const count = lite ? 36000 : small ? 60000 : 140000;
    const g = buildGalaxy(count);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('aOrbit', new THREE.BufferAttribute(g.orbit, 4));
    geo.setAttribute('aColor', new THREE.BufferAttribute(g.color, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(g.size, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(g.seed, 1));
    this.count = count;
    this.starU = {
      uTime: { value: 0 }, uScale: { value: 400 }, uBright: { value: 1 }, uPattern: { value: 0.022 },
      uMouse: { value: new THREE.Vector2(9, 9) }, uLens: { value: 0 }, uAspect: { value: 1 },
      uPulse: { value: new THREE.Vector3(9, 9, 0) }, uPulseLife: { value: 0 }, uWarp: { value: 0 },
    };
    this.stars = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: this.starU, vertexShader: starVert, fragmentShader: starFrag,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.stars.frustumCulled = false;
    this.galaxy.add(this.stars);

    // core glow + bar glow
    this.glowU = { uColor: { value: new THREE.Color(1.0, 0.78, 0.52) }, uOpacity: { value: 0.75 } };
    const glowMat = new THREE.ShaderMaterial({ uniforms: this.glowU, vertexShader: billboardVert, fragmentShader: glowFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.core = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMat);
    this.core.scale.setScalar(7.5);
    this.galaxy.add(this.core);
    this.halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(0.32, 0.38, 0.85) }, uOpacity: { value: 0.22 } },
      vertexShader: billboardVert, fragmentShader: glowFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.halo.scale.setScalar(26);
    this.galaxy.add(this.halo);

    // nebulae drifting in the arms
    this.nebulae = [];
    if (!lite) {
      const palette = [
        [[0.95, 0.3, 0.7], [0.4, 0.25, 0.9]],
        [[0.25, 0.55, 1.0], [0.6, 0.3, 0.95]],
        [[1.0, 0.45, 0.55], [1.0, 0.75, 0.4]],
        [[0.3, 0.85, 0.95], [0.35, 0.4, 1.0]],
      ];
      const n = small ? 4 : 7;
      for (let i = 0; i < n; i++) {
        const [ca, cb] = palette[i % palette.length];
        const u = {
          uTime: { value: 0 }, uSeed: { value: i * 7.31 }, uOpacity: { value: 0.32 },
          uColorA: { value: new THREE.Color(...ca) }, uColorB: { value: new THREE.Color(...cb) },
        };
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
          uniforms: u, vertexShader: billboardVert, fragmentShader: nebulaFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        }));
        const rr = 2.6 + (i / n) * 6.2;
        const arm = i % 4;
        const ang = arm * (Math.PI / 2) + Math.log(rr / 0.7) / Math.tan((PITCH * Math.PI) / 180);
        m.userData = { r: rr, a: ang, u };
        m.scale.setScalar(2.2 + rand() * 2.6);
        this.galaxy.add(m);
        this.nebulae.push(m);
      }
    }

    // the far sky
    const sk = buildSky(small ? 2500 : 5000);
    const skyGeo = new THREE.BufferGeometry();
    skyGeo.setAttribute('position', new THREE.BufferAttribute(sk.pos, 3));
    skyGeo.setAttribute('aColor', new THREE.BufferAttribute(sk.color, 3));
    skyGeo.setAttribute('aSize', new THREE.BufferAttribute(sk.size, 1));
    skyGeo.setAttribute('aSeed', new THREE.BufferAttribute(sk.seed, 1));
    this.skyU = { uTime: { value: 0 }, uScale: { value: 400 }, uWarp: { value: 0 } };
    this.sky = new THREE.Points(skyGeo, new THREE.ShaderMaterial({
      uniforms: this.skyU, vertexShader: skyVert, fragmentShader: skyFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);

    // hyperspace streaks live in camera space
    const W = small ? 700 : 1400;
    const wp = new Float32Array(W * 2 * 3);
    const we = new Float32Array(W * 2);
    const ws = new Float32Array(W * 2);
    for (let i = 0; i < W; i++) {
      const ang = rand() * Math.PI * 2;
      const rad = 1.2 + Math.pow(rand(), 0.6) * 9;
      const z = rand() * 70;
      const s = rand();
      for (let e = 0; e < 2; e++) {
        wp.set([Math.cos(ang) * rad, Math.sin(ang) * rad, z], (i * 2 + e) * 3);
        we[i * 2 + e] = e;
        ws[i * 2 + e] = s;
      }
    }
    const warpGeo = new THREE.BufferGeometry();
    warpGeo.setAttribute('position', new THREE.BufferAttribute(wp, 3));
    warpGeo.setAttribute('aEnd', new THREE.BufferAttribute(we, 1));
    warpGeo.setAttribute('aSeed', new THREE.BufferAttribute(ws, 1));
    this.warpU = { uTime: { value: 0 }, uWarp: { value: 0 }, uColor: { value: new THREE.Color(0.75, 0.85, 1.0) } };
    this.warpLines = new THREE.LineSegments(warpGeo, new THREE.ShaderMaterial({
      uniforms: this.warpU, vertexShader: warpVert, fragmentShader: warpFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.warpLines.frustumCulled = false;
    this.warpLines.visible = false;
    this.camera.add(this.warpLines);

    // state
    this.time = 0;
    this.scroll = 0;
    this.scrollTarget = 0;
    this.pointer = { x: 9, y: 9, tx: 9, ty: 9, px: 0, py: 0, active: false };
    this.lens = 0;
    this.pulseT = 1;
    this.warpT = 1;
    this.warpDur = 1;
    this.warpLevel = 0;
    this.jump = 0; // azimuth offset after a hyperspace jump
    this.jumpTarget = 0;
    this.rig = { dist: PATH[0][1], elev: PATH[0][2], azim: PATH[0][3], shift: PATH[0][4] };
    this.frames = [];
    this.degraded = 0;
    this.resize(window.innerWidth, window.innerHeight);
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const scale = h * 0.5 * (this.small ? 1.1 : 1);
    this.starU.uScale.value = scale;
    this.skyU.uScale.value = scale;
    this.starU.uAspect.value = w / h;
    this.applyRig(true);
  }

  setScroll(p) { this.scrollTarget = Math.min(1, Math.max(0, p)); }

  setPointer(x, y, active) {
    this.pointer.tx = (x / this.w) * 2 - 1;
    this.pointer.ty = -((y / this.h) * 2 - 1);
    if (this.pointer.x > 5) { this.pointer.x = this.pointer.tx; this.pointer.y = this.pointer.ty; }
    this.pointer.active = active;
  }

  leave() { this.pointer.active = false; }

  pulse(x, y) {
    this.starU.uPulse.value.set((x / this.w) * 2 - 1, -((y / this.h) * 2 - 1), 0);
    this.pulseT = 0;
  }

  /** Hyperspace: streaks + FOV punch, and arrive somewhere new in the galaxy. */
  warp(duration = 1.1, travel = true) {
    this.warpT = 0;
    this.warpDur = duration;
    this.warpLines.visible = true;
    if (travel) this.jumpTarget += 70 + rand() * 90;
  }

  /** Where the camera should be for the current scroll position. */
  pathAt(p) {
    let i = 0;
    while (i < PATH.length - 2 && p > PATH[i + 1][0]) i++;
    const a = PATH[i];
    const b = PATH[i + 1];
    const t = smooth(Math.min(1, Math.max(0, (p - a[0]) / (b[0] - a[0]))));
    return { dist: lerp(a[1], b[1], t), elev: lerp(a[2], b[2], t), azim: lerp(a[3], b[3], t), shift: lerp(a[4], b[4], t) };
  }

  applyRig(snap = false, dt = 0.016) {
    const want = this.pathAt(this.scroll);
    const k = snap ? 1 : 1 - Math.exp(-dt * 3.2);
    for (const key of ['dist', 'elev', 'azim', 'shift']) this.rig[key] += (want[key] - this.rig[key]) * k;
    const shift = this.w < 900 ? 0 : this.rig.shift;
    // pointer parallax
    const px = this.pointer.px * 6;
    const py = this.pointer.py * 4;
    const el = THREE.MathUtils.degToRad(Math.min(85, Math.max(2, this.rig.elev + py)));
    const az = THREE.MathUtils.degToRad(this.rig.azim + this.jump + px);
    const d = this.rig.dist * (1 + this.warpLevel * 0.25);
    this.camera.position.set(Math.cos(az) * Math.cos(el) * d, Math.sin(el) * d, Math.sin(az) * Math.cos(el) * d);
    this.camera.lookAt(0, 0, 0);
    // shift the galaxy sideways on screen without changing perspective
    this.camera.setViewOffset(this.w, this.h, -shift * this.w, 0, this.w, this.h);
    this.camera.fov = 52 + this.warpLevel * 34;
    this.camera.updateProjectionMatrix();
  }

  step(dt) {
    this.time += this.reduced ? 0 : dt;
    const t = this.time;
    // smooth scroll + pointer
    const ks = 1 - Math.exp(-dt * 5);
    this.scroll += (this.scrollTarget - this.scroll) * ks;
    const kp = 1 - Math.exp(-dt * 7);
    const P = this.pointer;
    if (P.x < 5) {
      P.x += (P.tx - P.x) * kp;
      P.y += (P.ty - P.y) * kp;
      P.px += (P.tx - P.px) * dt * 1.5;
      P.py += (P.ty - P.py) * dt * 1.5;
    }
    this.lens += ((P.active ? 1 : 0) - this.lens) * kp;
    this.jump += (this.jumpTarget - this.jump) * (1 - Math.exp(-dt * 2.2));

    // warp envelope: fast in, hold, ease out
    if (this.warpT < 1) {
      this.warpT = Math.min(1, this.warpT + dt / this.warpDur);
      const w = this.warpT;
      this.warpLevel = w < 0.25 ? smooth(w / 0.25) : w < 0.55 ? 1 : 1 - smooth((w - 0.55) / 0.45);
      if (this.warpT >= 1) { this.warpLevel = 0; this.warpLines.visible = false; }
    }
    this.pulseT = Math.min(1, this.pulseT + dt * 0.8);

    const u = this.starU;
    u.uTime.value = t;
    u.uMouse.value.set(P.x, P.y);
    u.uLens.value = this.lens;
    u.uWarp.value = this.warpLevel;
    u.uPulse.value.z = this.pulseT * 1.6;
    u.uPulseLife.value = this.pulseT < 1 ? 1 - this.pulseT : 0;
    // stay readable behind dense content mid-page; brighten at the core finale
    u.uBright.value = 0.9 - 0.25 * Math.sin(Math.PI * Math.min(1, this.scroll / 0.92)) + this.warpLevel * 0.4;
    this.skyU.uTime.value = t;
    this.skyU.uWarp.value = this.warpLevel;
    this.warpU.uTime.value = t;
    this.warpU.uWarp.value = this.warpLevel;
    // the core glow is gorgeous from afar and blinding up close / edge-on
    const near = Math.min(1, Math.max(0.35, (this.rig.dist - 3) / 9));
    const edge = 0.55 + 0.45 * Math.min(1, this.rig.elev / 30);
    this.glowU.uOpacity.value = (0.62 + 0.12 * Math.sin(t * 0.7)) * near * edge;

    this.applyRig(false, dt);
    // billboards face the camera
    const q = this.camera.quaternion;
    const inv = this.galaxy.quaternion.clone().invert();
    const face = inv.multiply(q);
    this.core.quaternion.copy(face);
    this.halo.quaternion.copy(face);
    for (const m of this.nebulae) {
      const { r, a, u: nu } = m.userData;
      const ang = a + t * 0.022;
      m.position.set(Math.cos(ang) * r, 0, Math.sin(ang) * r);
      m.quaternion.copy(face);
      nu.uTime.value = t;
    }
    this.sky.rotation.y = t * 0.004;

    this.renderer.render(this.scene, this.camera);
    this.govern(dt);
  }

  /** Drop resolution, then star count, if the device can't keep up. */
  govern(dt) {
    // ignore load-time jank; only act on two slow windows in a row
    if (this.time < 6 || this.degraded >= 2) return;
    this.frames.push(dt);
    if (this.frames.length < 120) return;
    const sorted = [...this.frames].sort((a, b) => a - b);
    const median = sorted[sorted.length >> 1];
    this.frames.length = 0;
    this.slow = median > 0.024 ? (this.slow || 0) + 1 : 0;
    if (this.slow >= 2) {
      this.slow = 0;
      this.degraded++;
      if (this.degraded === 1) this.renderer.setPixelRatio(1);
      else this.stars.geometry.setDrawRange(0, Math.floor(this.count * 0.5));
      this.resize(this.w, this.h);
    }
  }

  dispose() {
    this.scene.traverse((o) => {
      o.geometry?.dispose?.();
      o.material?.dispose?.();
    });
    this.renderer.dispose();
  }
}
