import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import LivingTree from './LivingTree';
import { particleVert, particleFrag, cardVert, cardFrag, finalPass } from './shaders';
import {
  T, seg, easeInOut, easeOut, lerp, clamp01, rawCardIndex, magnetIndex, unitForCard,
} from './timeline';

/* World layout (y is "depth" of the dive) */
const HERO_Y = -100;
const BASE_Y = -140;          // y of the centred card
const CARD_STEP_Y = 3.6;      // vertical spacing between cards on the helix
const CARD_ANGLE = 1.15;      // radians between cards on the helix
const HELIX_R = 4.6;

const CATEGORY_TINT = {
  headphones: '#5eead4', keyboards: '#a78bfa', mice: '#22d3ee', wearables: '#f0abfc',
  'smart-home': '#86efac', gaming: '#c084fc', audio: '#67e8f9', accessories: '#fcd34d',
  displays: '#7dd3fc', streaming: '#f9a8d4',
};

const rand = (a, b) => a + Math.random() * (b - a);

export default class VaultEngine {
  constructor(canvas, { lite = false, onProgress } = {}) {
    this.canvas = canvas;
    this.lite = lite;
    this.onProgress = onProgress;
    this.target = 0;
    this.s = 0;
    this.vel = 0;
    this.pointer = new THREE.Vector2(0, 0);
    this.pointerSmooth = new THREE.Vector2(0, 0);
    this.hovered = -1;
    this.spin = 0;
    this.outro = 0;
    this.cards = [];
    this.products = [];
    this.textureCache = new Map();
    this.state = { s: 0, vel: 0, index: 0, rawIndex: 0, count: 0 };
    this.listeners = new Set();
    this.t0 = performance.now() / 1000;
    this.disposed = false;

    this.#initRenderer();
    this.#initScene();
    this.#buildParticles();
    this.#buildLogo();
    this.#buildJellyfish();
    this.#buildStreaks();
    this.#buildTree();
    this.#initPost();
    this.resize();

    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  /* ---------------------------------------------------------------- setup */

  #initRenderer() {
    const r = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      powerPreference: 'high-performance',
      alpha: false,
    });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.lite ? 1 : 1.6));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.15;
    r.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer = r;
  }

  #initScene() {
    this.scene = new THREE.Scene();
    this.bg = new THREE.Color('#05080b');
    this.scene.background = this.bg;
    this.scene.fog = new THREE.FogExp2('#05080b', 0.018);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);
    this.camera.position.set(0, 0, 9);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envTex;
    pmrem.dispose();

    this.scene.add(new THREE.AmbientLight('#406070', 0.6));
    this.keyLight = new THREE.PointLight('#5eead4', 40, 30, 1.6);
    this.fillLight = new THREE.PointLight('#a78bfa', 40, 30, 1.6);
    this.scene.add(this.keyLight, this.fillLight);
  }

  #buildParticles() {
    const n = this.lite ? 9000 : 26000;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const seed = new Float32Array(n);
    const c = new THREE.Color();
    const moss = ['#9acd32', '#c4d94a', '#6b8e23', '#d4e157', '#7fbf4d'];
    const nebula = ['#a78bfa', '#f0abfc', '#e879f9', '#c4b5fd', '#f9a8d4', '#67e8f9'];
    const dust = ['#cfe8ef', '#9ad7e0', '#ffffff'];

    // forest "stalks": vertical columns of moss the camera falls past
    const stalks = Array.from({ length: 34 }, () => ({
      x: rand(-14, 14) * (Math.random() < 0.5 ? 0.6 : 1),
      z: rand(-16, 4),
      top: rand(-14, -40),
      w: rand(0.8, 2.6),
    }));
    // nebula blobs around the spine
    const blobs = Array.from({ length: 22 }, (_, i) => ({
      x: (Math.random() < 0.5 ? -1 : 1) * rand(3, 11),
      y: BASE_Y + 6 - i * 2.6,
      z: rand(-9, 1),
      r: rand(1.2, 3.2),
      c: nebula[i % nebula.length],
    }));

    for (let i = 0; i < n; i++) {
      const k = Math.random();
      let x, y, z, s, hex;
      if (k < 0.22) { // ambient dust everywhere
        x = rand(-22, 22); y = rand(12, BASE_Y - 70); z = rand(-25, 8);
        s = rand(0.4, 1.3); hex = dust[(Math.random() * dust.length) | 0];
      } else if (k < 0.66) { // forest
        const st = stalks[(Math.random() * stalks.length) | 0];
        const t = Math.pow(Math.random(), 0.8);
        y = lerp(st.top, -88, t);
        const spread = st.w * (0.4 + t * 1.1);
        x = st.x + (Math.random() - 0.5) * spread * 2;
        z = st.z + (Math.random() - 0.5) * spread * 2;
        // moss floor where the forest bottoms out
        if (Math.random() < 0.22) { y = rand(-80, -90); x = rand(-18, 18); z = rand(-18, 3); }
        s = rand(0.8, 2.6); hex = moss[(Math.random() * moss.length) | 0];
        if (Math.random() < 0.08) hex = nebula[(Math.random() * nebula.length) | 0];
      } else if (k < 0.74) { // the purple bloom near the logo at the start of the dive
        const a = Math.random() * Math.PI * 2;
        const r = Math.pow(Math.random(), 0.6) * 4;
        x = Math.cos(a) * r * 0.8 - 0.8; y = rand(-4, -22); z = Math.sin(a) * r - 1;
        s = rand(0.8, 2.2); hex = nebula[(Math.random() * 3) | 0];
      } else { // nebulae around the product spine
        const b = blobs[(Math.random() * blobs.length) | 0];
        const u = Math.random() * Math.PI * 2;
        const v = Math.acos(2 * Math.random() - 1);
        const r = b.r * Math.cbrt(Math.random());
        x = b.x + r * Math.sin(v) * Math.cos(u) * 1.4;
        y = b.y + r * Math.cos(v);
        z = b.z + r * Math.sin(v) * Math.sin(u);
        s = rand(0.4, 1.35); hex = Math.random() < 0.8 ? b.c : moss[0];
      }
      pos.set([x, y, z], i * 3);
      c.set(hex);
      col.set([c.r, c.g, c.b], i * 3);
      size[i] = s;
      seed[i] = Math.random();
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    this.particleMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: this.renderer.getPixelRatio() },
        uFocus: { value: 9 },
        uVel: { value: 0 },
      },
      vertexShader: particleVert,
      fragmentShader: particleFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.particles = new THREE.Points(g, this.particleMat);
    this.particles.frustumCulled = false;
    this.scene.add(this.particles);
  }

  #glass(color, extra = {}) {
    if (this.lite) {
      return new THREE.MeshPhysicalMaterial({
        color, metalness: 0.6, roughness: 0.12, clearcoat: 1,
        iridescence: 1, iridescenceIOR: 1.4, envMapIntensity: 2, ...extra,
      });
    }
    return new THREE.MeshPhysicalMaterial({
      color, metalness: 0, roughness: 0.06, transmission: 1, thickness: 0.8, ior: 1.45,
      iridescence: 1, iridescenceIOR: 1.35, iridescenceThicknessRange: [200, 900],
      clearcoat: 1, envMapIntensity: 2.2, attenuationColor: new THREE.Color(color),
      attenuationDistance: 2.5, ...extra,
    });
  }

  #buildLogo() {
    const logo = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.2, 48, 180), this.#glass('#d9fff8'));
    logo.add(ring);

    // the inner mark: a hexagonal "V" vault glyph, extruded glass
    const hex = (r, rot = Math.PI / 6) => Array.from({ length: 6 }, (_, i) => {
      const a = rot + (i / 6) * Math.PI * 2;
      return new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r);
    });
    const shape = new THREE.Shape(hex(0.95));
    shape.holes.push(new THREE.Path(hex(0.62)));
    const markGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.32, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 4, curveSegments: 1,
    });
    markGeo.center();
    const bar = new THREE.BoxGeometry(0.28, 1.25, 0.38);
    bar.translate(0.66, -0.2, 0);
    const mark = new THREE.Mesh(mergeGeometries([markGeo.index ? markGeo.toNonIndexed() : markGeo, bar.toNonIndexed()]), this.#glass('#c4b5fd'));
    mark.scale.setScalar(0.92);
    logo.add(mark);
    this.mark = mark;

    // figure-eight ribbon hanging under the ring
    const pts = [];
    for (let i = 0; i <= 120; i++) {
      const t = (i / 120) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.sin(2 * t) * 1.25, -1.55 - (1 - Math.cos(t)) * 3.4, Math.sin(t) * 0.35));
    }
    const ribbon = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 300, 0.05, 10, true),
      new THREE.MeshPhysicalMaterial({ color: '#bfeee6', metalness: 0.4, roughness: 0.15, clearcoat: 1, iridescence: 1, transparent: true, opacity: 0.7 }),
    );
    logo.add(ribbon);
    this.ribbon = ribbon;

    this.logo = logo;
    this.scene.add(logo);
  }

  #buildJellyfish() {
    this.jellies = [];
    const spots = [[3.6, -6, -3], [-4.2, -27, -5], [4.8, -47, -6], [-3.4, -68, -4], [3.5, HERO_Y - 26, -8]];
    spots.forEach(([x, y, z], idx) => {
      const g = new THREE.Group();
      const bell = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshPhysicalMaterial({
          color: '#b8c4c8', roughness: 0.25, metalness: 0.1, clearcoat: 1, iridescence: 0.8,
          transparent: true, opacity: 0.85, side: THREE.DoubleSide,
        }),
      );
      bell.scale.y = 0.62;
      g.add(bell);
      const tentacles = [];
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2;
        const verts = new Float32Array(26 * 3);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
        const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#dff6ff', transparent: true, opacity: 0.45 }));
        line.frustumCulled = false;
        g.add(line);
        tentacles.push({ line, a, r: 0.12 + (k % 3) * 0.12, len: rand(2.2, 3.8) });
      }
      g.position.set(x, y, z);
      g.rotation.z = (idx % 2 ? 1 : -1) * 0.15;
      this.scene.add(g);
      this.jellies.push({ g, bell, tentacles, phase: Math.random() * 10, base: new THREE.Vector3(x, y, z) });
    });
  }

  #buildStreaks() {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 8;
    const ctx = cv.getContext('2d');
    const grd = ctx.createLinearGradient(0, 0, 256, 0);
    grd.addColorStop(0, 'rgba(255,255,255,0)');
    grd.addColorStop(0.8, 'rgba(200,255,240,0.9)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 256, 8);
    const tex = new THREE.CanvasTexture(cv);
    this.streaks = [];
    const geo = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < 26; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0,
        color: Math.random() < 0.5 ? '#5eead4' : '#c4b5fd',
      }));
      m.scale.set(rand(4, 12), rand(0.02, 0.08), 1);
      m.userData = { speed: rand(10, 28), y: rand(-3.5, 3.5), z: rand(-6, -1), x: rand(-20, 20) };
      this.scene.add(m);
      this.streaks.push(m);
    }
  }

  #buildTree() {
    this.helix = new THREE.Group();
    this.helix.position.y = BASE_Y;
    this.tree = new LivingTree({ lite: this.lite, pixelRatio: this.renderer.getPixelRatio() });
    this.helix.add(this.tree.group);
    this.scene.add(this.helix);
  }

  #initPost() {
    const composer = new EffectComposer(this.renderer);
    composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), this.lite ? 0.4 : 0.55, 0.6, 0.86);
    composer.addPass(this.bloom);
    this.final = new ShaderPass(finalPass);
    this.final.uniforms.uEdge.value = new THREE.Color('#1d5a5a');
    composer.addPass(this.final);
    composer.addPass(new OutputPass());
    this.composer = composer;
  }

  /* --------------------------------------------------------------- cards */

  setProducts(products) {
    this.cards.forEach(({ mesh, frame }) => {
      this.helix.remove(mesh, frame);
      mesh.geometry.dispose(); mesh.material.dispose();
      frame.geometry.dispose(); frame.material.dispose();
    });
    this.cards = [];
    this.products = products;
    const portrait = this.aspect < 0.8;
    const w = portrait ? 2.7 : 4.6;
    const h = portrait ? 3.4 : 3.0;
    this.cardSize = [w, h];
    const frameGeo = new RoundedBoxGeometry(w + 0.16, h + 0.16, 0.16, 4, 0.28);
    products.forEach((p, i) => {
      const tint = new THREE.Color(CATEGORY_TINT[p.category] || '#5eead4');
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: null }, uHasMap: { value: 0 }, uPlane: { value: new THREE.Vector2(w, h) },
          uTime: { value: 0 }, uActive: { value: 0 }, uHover: { value: 0 }, uShift: { value: 0 },
          uOpacity: { value: 0 }, uBend: { value: 0 }, uTint: { value: tint },
          uRim: { value: tint.clone().multiplyScalar(0.55) },
        },
        vertexShader: cardVert, fragmentShader: cardFrag, transparent: true,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h, 32, 20), mat);
      const frame = new THREE.Mesh(frameGeo, new THREE.MeshPhysicalMaterial({
        color: tint.clone().multiplyScalar(0.35), metalness: 0.2, roughness: 0.1, clearcoat: 1,
        iridescence: 0.7, transparent: true, opacity: 0, envMapIntensity: 1.6, depthWrite: false,
      }));
      const a = i * CARD_ANGLE;
      const pos = new THREE.Vector3(Math.sin(a) * HELIX_R, -i * CARD_STEP_Y, Math.cos(a) * HELIX_R);
      mesh.position.copy(pos);
      mesh.rotation.y = a;
      frame.position.copy(pos).addScaledVector(new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), -0.1);
      frame.rotation.y = a;
      mesh.userData.index = i;
      this.helix.add(frame, mesh);
      this.cards.push({ mesh, frame, product: p, hover: 0 });
      this.#loadCardTexture(p).then((tex) => {
        if (this.disposed || !tex || this.products !== products) return;
        mat.uniforms.uMap.value = tex;
        mat.uniforms.uHasMap.value = 1;
      });
    });
    this.tree.build(
      products,
      { step: CARD_STEP_Y, angle: CARD_ANGLE, radius: HELIX_R, cardW: w, cardH: h },
      (p) => new THREE.Color(CATEGORY_TINT[p.category] || '#5eead4'),
    );
    this.state.count = products.length;
  }

  /** Texture = product photo (cover-cropped) with the name typeset onto it. */
  #loadCardTexture(p) {
    const portrait = this.aspect < 0.8;
    const key = `${p.id}:${portrait ? 'p' : 'l'}`;
    if (this.textureCache.has(key)) return this.textureCache.get(key);
    const job = new Promise((resolve) => {
      // canvas matches the card's aspect so the photo is never stretched
      const W = portrait ? 720 : 1024, H = portrait ? 906 : 680;
      const draw = (img) => {
        const cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        const ctx = cv.getContext('2d');
        ctx.fillStyle = '#071012'; ctx.fillRect(0, 0, W, H);
        if (img) {
          const s = Math.max(W / img.width, H / img.height);
          ctx.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s);
        } else {
          const g = ctx.createLinearGradient(0, 0, W, H);
          g.addColorStop(0, '#0b2a2c'); g.addColorStop(1, '#2a1640');
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        }
        const shade = ctx.createLinearGradient(0, H * 0.35, 0, H);
        shade.addColorStop(0, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(0,0,0,0.72)');
        ctx.fillStyle = shade; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.font = '600 22px "IBM Plex Mono", monospace';
        ctx.fillText(`[ ${p.category.toUpperCase()} ]`, 48, H - 128);
        ctx.font = '700 64px "Space Grotesk", sans-serif';
        ctx.fillText(p.name.toUpperCase(), 48, H - 58);
        const tex = new THREE.CanvasTexture(cv);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        resolve(tex);
      };
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.onload = () => draw(img);
      img.onerror = () => draw(null);
      img.src = p.images?.[0] || '';
      if (!p.images?.[0]) draw(null);
    });
    this.textureCache.set(key, job);
    return job;
  }

  /** Preload the first few textures — the loader waits on these. */
  preload(products, n = 5) {
    const list = products.slice(0, n);
    let done = 0;
    return Promise.all(list.map((p) => this.#loadCardTexture(p).then(() => {
      done += 1;
      this.onProgress?.(done / list.length);
    })));
  }

  /* --------------------------------------------------------------- input */

  setScroll(units) { this.target = units; }
  jumpTo(units) { this.target = units; this.s = units; }

  setPointer(nx, ny) { this.pointer.set(nx, ny); }

  pick(nx, ny) {
    if (!this.cards.length) return -1;
    this.raycaster ??= new THREE.Raycaster();
    this.raycaster.setFromCamera(new THREE.Vector2(nx, ny), this.camera);
    const hit = this.raycaster.intersectObjects(this.cards.map((c) => c.mesh), false)
      .find((h) => h.object.material.uniforms.uOpacity.value > 0.2);
    return hit ? hit.object.userData.index : -1;
  }

  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.aspect = w / h;
    this.renderer.setSize(w, h, false);
    this.composer?.setSize(w, h);
    this.bloom?.resolution.set(w / 2, h / 2);
    this.camera.aspect = this.aspect;
    // keep the cards framed on narrow screens
    this.camera.fov = this.aspect < 0.8 ? 58 : 42;
    this.camera.updateProjectionMatrix();
    if (this.final) this.final.uniforms.uAspect.value = this.aspect;
    const portrait = this.aspect < 0.8;
    if (this.products.length && this.cardSize && (portrait !== (this.cardSize[0] < 4))) {
      this.setProducts(this.products);
    }
  }

  /* ---------------------------------------------------------------- frame */

  loop() {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now() / 1000;
    const dt = Math.min(now - (this.lastT ?? now), 0.1);
    this.lastT = now;
    const t = now - this.t0;
    this.update(dt, t);
    this.composer.render(dt);
  }

  update(dt, t) {
    const prev = this.s;
    this.s += (this.target - this.s) * (1 - Math.exp(-dt * 5.5));
    if (Math.abs(this.target - this.s) < 1e-4) this.s = this.target;
    const instVel = dt > 0 ? (this.s - prev) / dt : 0;
    this.vel += (instVel - this.vel) * (1 - Math.exp(-dt * 8));
    const s = this.s;
    const vel = this.vel;
    this.pointerSmooth.lerp(this.pointer, 1 - Math.exp(-dt * 4));
    const px = this.pointerSmooth.x;
    const py = this.pointerSmooth.y;

    /* camera choreography */
    const descent = easeInOut(seg(s, T.INTRO_END - 0.3, T.DESCENT_END + 0.3));
    const dive = easeInOut(seg(s, T.HERO_OUT - 0.2, T.DIVE_END));
    const portrait = this.aspect < 0.8;
    const camDistProducts = portrait ? 12.6 : 11.5;
    let camY = lerp(0, HERO_Y, descent);
    camY = lerp(camY, BASE_Y + 0.4, dive);
    // past the last card the camera pulls back to reveal the whole tree
    const lastU = unitForCard(Math.max(0, this.cards.length - 1));
    const outro = easeInOut(seg(s, lastU + 0.35, lastU + 1.3));
    this.outro = outro;
    camY += outro * 3;
    let camZ = lerp(lerp(9, 8.5, descent), camDistProducts, dive) + Math.sin(descent * Math.PI) * 2.5
      + outro * (portrait ? 30 : 24);
    const sway = Math.sin(descent * Math.PI * 3) * 1.2 * (1 - dive);
    // on wide screens the centred card sits left of centre, clear of the product panel
    const shiftX = portrait ? 0 : 1.2 * dive * (1 - outro);
    // on phones lift the card above the bottom product sheet
    const shiftY = portrait ? -1.5 * dive * (1 - outro) : 0;
    // fly-in: clicking the centred card dollies the camera into it
    let flyK = 0;
    if (this.fly) flyK = easeInOut(Math.min((t - this.fly.t0) / 0.75, 1));
    this.flyK = flyK;
    camZ = lerp(camZ, HELIX_R + 1.3, flyK);
    this.camera.position.set(lerp(px * 0.6 + sway + shiftX, 0, flyK), camY + py * 0.35 + shiftY * (1 - flyK), camZ);
    const lookY = camY - Math.sin(descent * Math.PI) * 2.2 + shiftY + outro * 4;
    this.camera.lookAt(lerp(sway * 0.3 + shiftX, 0, flyK), lerp(lookY, camY, flyK), 0);
    this.camera.rotation.z += Math.sin(descent * Math.PI * 2) * 0.05 * (1 - dive);

    /* logo ring */
    const heroGrow = easeOut(seg(s, T.HERO_IN, T.HERO_IN + 1.2));
    const ringLeave = easeInOut(seg(s, T.HERO_OUT - 0.4, T.DIVE_END - 0.1));
    const heroX = portrait ? 0 : 0.6;
    this.logo.position.set(
      lerp(0, heroX, heroGrow) + px * 0.2,
      lerp(camY - 0.2 * (1 - heroGrow), HERO_Y + 0.2, heroGrow) + ringLeave * 9,
      lerp(0, 0.6, heroGrow) + ringLeave * 2,
    );
    const ringScale = lerp(1, portrait ? 1.35 : 1.95, heroGrow) * (1 - ringLeave * 0.7);
    this.logo.scale.setScalar(Math.max(ringScale, 0.001));
    this.logo.visible = ringLeave < 0.999;
    this.logo.rotation.set(
      Math.sin(t * 0.4) * 0.12 + py * 0.25,
      Math.sin(t * 0.3) * 0.5 + s * 0.9 + px * 0.6,
      Math.sin(t * 0.25) * 0.08,
    );
    this.mark.rotation.y = Math.sin(t * 0.7) * 0.3;
    this.ribbon.material.opacity = 0.7 * (1 - heroGrow * 0.85);

    /* lights follow the action */
    this.keyLight.position.set(4, camY + 3, 4);
    this.fillLight.position.set(-4, camY - 2, 3);

    /* particles */
    const u = this.particleMat.uniforms;
    u.uTime.value = t;
    u.uVel.value = THREE.MathUtils.clamp(vel, -3, 3) * 0.6;
    u.uFocus.value = lerp(lerp(9, 7, descent), camDistProducts - HELIX_R, dive);

    /* jellyfish */
    this.jellies.forEach((j) => {
      const ph = t * 1.4 + j.phase;
      const pulse = Math.sin(ph);
      j.bell.scale.set(1 + pulse * 0.08, 0.62 - pulse * 0.06, 1 + pulse * 0.08);
      j.g.position.y = j.base.y + Math.sin(t * 0.3 + j.phase) * 0.8 + (pulse > 0 ? pulse : 0) * 0.1;
      j.g.position.x = j.base.x + Math.sin(t * 0.17 + j.phase) * 0.6;
      j.tentacles.forEach((tc) => {
        const arr = tc.line.geometry.attributes.position.array;
        for (let k = 0; k < 26; k++) {
          const f = k / 25;
          const w = Math.sin(ph * 0.8 - f * 5 + tc.a) * 0.18 * f;
          arr[k * 3] = Math.cos(tc.a) * tc.r * (1 - f * 0.4) + w;
          arr[k * 3 + 1] = -f * tc.len - 0.05;
          arr[k * 3 + 2] = Math.sin(tc.a) * tc.r * (1 - f * 0.4) + Math.cos(ph * 0.6 - f * 4) * 0.12 * f;
        }
        tc.line.geometry.attributes.position.needsUpdate = true;
      });
    });

    /* light streaks in the hero */
    const heroAmt = seg(s, T.HERO_IN + 0.2, T.HERO_IN + 1) * (1 - seg(s, T.HERO_OUT - 0.4, T.HERO_OUT + 0.2));
    this.streaks.forEach((m) => {
      const d = m.userData;
      d.x -= dt * d.speed * (1 + Math.abs(vel) * 2);
      if (d.x < -22) d.x = 22;
      m.position.set(d.x, HERO_Y + d.y, d.z);
      m.material.opacity = heroAmt * 0.55;
      m.visible = heroAmt > 0.001;
    });

    /* product helix */
    const count = this.cards.length;
    const raw = rawCardIndex(s, count);
    const f = magnetIndex(raw);
    // slow showcase spin during the outro; unwinds to the nearest full turn after
    if (this.outro > 0.01) this.spin += dt * 0.22 * this.outro;
    else this.spin += (Math.round(this.spin / (Math.PI * 2)) * Math.PI * 2 - this.spin) * (1 - Math.exp(-dt * 3));
    this.helix.rotation.y = -f * CARD_ANGLE + px * 0.08 + this.spin;
    this.helix.position.y = BASE_Y + f * CARD_STEP_Y;
    const cardsIn = seg(s, T.HERO_OUT - 0.1, T.DIVE_END + 0.2);
    this.tree.update({
      t, f, vel, intro: cardsIn, hovered: this.hovered, pointer: this.pointerSmooth,
      crown: easeOut(seg(s, T.HERO_OUT - 0.5, T.DIVE_END - 0.3)),
    });
    const bend = THREE.MathUtils.clamp(vel * 0.35, -0.6, 0.6);
    this.cards.forEach((c, i) => {
      const cu = c.mesh.material.uniforms;
      const dist = Math.abs(i - f);
      const active = clamp01(1 - dist);
      c.hover += ((this.hovered === i ? 1 : 0) - c.hover) * (1 - Math.exp(-dt * 10));
      cu.uTime.value = t;
      cu.uActive.value = active;
      cu.uHover.value = c.hover;
      cu.uShift.value = THREE.MathUtils.clamp(vel * 0.8, -1, 1);
      cu.uBend.value = bend;
      const vis = cardsIn * Math.max(1 - clamp01((dist - 5) / 2), this.outro);
      cu.uOpacity.value = vis;
      c.frame.material.opacity = vis * (0.35 + active * 0.35);
      const sc = 1 + c.hover * 0.04 + active * 0.04;
      c.mesh.scale.setScalar(sc);
      c.frame.scale.setScalar(sc);
      c.mesh.visible = c.frame.visible = vis > 0.002;
    });

    /* atmosphere */
    const forest = seg(s, 1.5, 4.2) * (1 - seg(s, 4.4, 5.0));
    this.scene.fog.density = (0.012 + forest * 0.02) * (1 - this.outro * 0.6);
    const edge = this.final.uniforms.uEdge.value;
    edge.setRGB(0.05 + dive * 0.08, 0.2 - dive * 0.06, 0.21 + dive * 0.07);
    // the white-out flash as we burst out of the forest into the hero
    const flash = Math.max(0, 1 - Math.abs(s - (T.HERO_IN + 0.05)) / 0.25);
    this.final.uniforms.uFlash.value = flash * flash * 0.32 + (this.flyK || 0) ** 3 * 0.85;
    this.final.uniforms.uTime.value = t;
    this.final.uniforms.uCA.value = 0.0008 + Math.min(Math.abs(vel) * 0.0012, 0.0035);
    this.bloom.strength = (this.lite ? 0.4 : 0.55) + flash * 0.7;

    this.state.s = s;
    this.state.vel = vel;
    this.state.rawIndex = raw;
    this.state.index = Math.round(raw);
    this.state.count = count;
    this.listeners.forEach((fn) => fn(this.state));
  }

  setHovered(i) { this.hovered = i; }

  /** Dolly into the centred card (used just before routing to its product). */
  flyInto() { this.fly = { t0: this.lastT - this.t0 }; }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.listeners.clear();
    this.textureCache.forEach((p) => p.then((tex) => tex?.dispose()));
    this.scene.traverse((o) => {
      o.geometry?.dispose?.();
      const m = o.material;
      if (Array.isArray(m)) m.forEach((x) => x.dispose()); else m?.dispose?.();
    });
    this.envTex.dispose();
    this.composer.dispose?.();
    this.renderer.dispose();
  }
}
