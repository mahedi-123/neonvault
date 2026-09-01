import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  Color,
  InstancedBufferAttribute,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three';
import { WORLD_CENTER, WORLD_RADIUS } from '../zoneConfig';

const CX = WORLD_CENTER[0];
const CZ = WORLD_CENTER[1];

/** Where the city starts and stops. Well clear of the barrier at R+1.2. */
const INNER = WORLD_RADIUS + 12;
const OUTER = WORLD_RADIUS + 80;

/**
 * Deterministic pseudo-random. The city has to be identical on every load —
 * a skyline that reshuffles itself when you re-enter the vault would give
 * away that it is scenery, and it also makes any visual regression
 * impossible to spot.
 */
const makeRandom = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

const BUILDING_VERT = /* glsl */ `
  attribute vec3 aScale;
  attribute float aSeed;

  varying vec2 vFacade;
  varying float vSeed;
  varying float vRoof;
  varying float vUp;
  varying vec3 vWorldPos;

  void main() {
    vSeed = aSeed;
    vRoof = position.y + 0.5;
    vUp = step(0.5, abs(normal.y));

    // Window cells must be the same real-world size on a 40m tower and an 8m
    // block, so the facade coordinate is measured in metres rather than in
    // UV — otherwise every building gets the same window count and scale
    // stops reading as distance.
    float across = mix(position.x * aScale.x, position.z * aScale.z, step(0.5, abs(normal.x)));
    vFacade = vec2(across, position.y * aScale.y);

    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const BUILDING_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3 uWall;
  uniform vec3 uWinA;
  uniform vec3 uWinB;
  uniform vec3 uHaze;

  varying vec2 vFacade;
  varying float vSeed;
  varying float vRoof;
  varying float vUp;
  varying vec3 vWorldPos;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(41.31, 289.17))) * 43758.5453);
  }

  void main() {
    vec3 col = uWall * (0.45 + vRoof * 0.55);

    // Light spill at street level. Without it every tower sits on pure black
    // and the city reads as lit boxes floating over a void rather than as
    // buildings standing on ground.
    col += vec3(0.05, 0.09, 0.16) * pow(1.0 - vRoof, 2.0);

    if (vUp < 0.5) {
      vec2 cell = vec2(1.25, 1.65);         // metres per window
      vec2 id = floor(vFacade / cell);
      vec2 f = fract(vFacade / cell);

      // Leave a mullion between panes so the glass reads as a grid.
      float pane =
        step(0.16, f.x) * step(f.x, 0.84) *
        step(0.18, f.y) * step(f.y, 0.80);

      float r = hash(id + vSeed * 37.0);
      float on = step(0.44, r);

      // A handful of windows switch every few seconds. Enough that the city
      // is alive in peripheral vision, far too slow to pull the eye off the
      // districts you are actually meant to be shopping.
      float slot = floor(uTime * 0.28 + r * 23.0);
      on = clamp(on - step(0.88, hash(id + slot)), 0.0, 1.0);

      // Window cells are about two metres across, which past forty metres
      // is well under a pixel — left alone the far facades boil into a field
      // of crawling white dots every time the camera moves. Past that range
      // the grid dissolves into the average glow it would have had, which is
      // what a real city does at distance anyway.
      float d = distance(cameraPosition, vWorldPos);
      float detail = 1.0 - smoothstep(22.0, 62.0, d);
      float lit = mix(0.34, pane * on, detail);

      vec3 glass = mix(uWinA, uWinB, hash(id.yx + vSeed * 11.0));
      col = mix(col, glass, lit * 0.9);
      col += glass * lit * 0.55;
    }

    // Own distance haze rather than scene fog: the city sits far past the
    // range the walkable floor's fog is tuned for, and being eaten by it is
    // exactly the "nothing out there" this is here to fix.
    float d2 = distance(cameraPosition, vWorldPos);
    // Capped at three-quarters: the far side of the city has to stay
    // *legible* through the haze. Letting it reach 1.0 dissolved the whole
    // skyline back into the fog colour, which is the exact 'nothing out
    // there' this scenery exists to fix.
    col = mix(col, uHaze, 0.74 * smoothstep(25.0, 150.0, d2));

    gl_FragColor = vec4(col, 1.0);
  }
`;

const BEACON_VERT = /* glsl */ `
  attribute float aSeed;
  varying float vSeed;
  varying vec3 vWorldPos;
  void main() {
    vSeed = aSeed;
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const BEACON_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  varying float vSeed;
  varying vec3 vWorldPos;
  void main() {
    // Aircraft-warning blink: mostly off, a hard pulse on.
    float phase = fract(uTime * 0.45 + vSeed);
    float pulse = smoothstep(0.0, 0.12, phase) * smoothstep(0.42, 0.16, phase);
    float d = distance(cameraPosition, vWorldPos);
    float far = 1.0 - smoothstep(60.0, 190.0, d);
    gl_FragColor = vec4(uColor, (0.12 + pulse * 0.95) * far);
  }
`;

const GROUND_VERT = /* glsl */ `
  varying vec3 vWorldPos;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const GROUND_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3 uNear;
  uniform vec3 uHaze;
  uniform vec2 uCenter;
  varying vec3 vWorldPos;

  void main() {
    vec2 rel = vWorldPos.xz - uCenter;
    float r = length(rel);
    float a = atan(rel.y, rel.x);

    // Radial slip-roads running out from the vault, so the plate between the
    // barrier and the towers reads as somewhere the city goes rather than as
    // an empty apron.
    float spokes = smoothstep(0.97, 1.0, cos(a * 18.0));
    float rings = smoothstep(0.90, 1.0, cos(r * 0.55 - uTime * 0.25));
    vec3 col = uNear + vec3(0.05, 0.16, 0.22) * spokes * 0.5 + vec3(0.10, 0.05, 0.20) * rings * 0.35;

    // The plate brightens as it runs under the city — the glow a built-up
    // area throws onto its own streets. It is also what gives the towers a
    // floor to stand on instead of a black gap under every silhouette.
    col += vec3(0.055, 0.075, 0.145) * smoothstep(34.0, 78.0, r);

    col = mix(col, uHaze, 0.85 * smoothstep(26.0, 140.0, distance(cameraPosition, vWorldPos)));
    gl_FragColor = vec4(col, 1.0);
  }
`;

/**
 * One flying vehicle: a stretched glowing sliver on a slow circular lane.
 *
 * Three of these do more for "inhabited city" than another hundred buildings
 * would, because motion at that distance is the only cue that survives the
 * haze.
 */
const AirTraffic = ({ radius, height, speed, offset, color, length: len }) => {
  const ref = useRef(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime * speed + offset;
    ref.current.position.set(CX + Math.cos(t) * radius, height + Math.sin(t * 2.1) * 1.2, CZ + Math.sin(t) * radius);
    ref.current.rotation.y = -t + Math.PI / 2;
  });

  return (
    <mesh ref={ref}>
      <boxGeometry args={[len, 0.22, 0.22]} />
      <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.9} fog={false} />
    </mesh>
  );
};

/**
 * The city outside the barrier.
 *
 * The world used to end at the floor's edge with fog behind it, which reads
 * as an unfinished level rather than as a boundary. Putting a lit, moving
 * skyline out there changes what the edge means: the vault is one plaza in
 * somewhere much larger, and the shield is what keeps you in it — not the
 * end of the map.
 *
 * All of it is instanced and unlit: two draw calls for hundreds of towers,
 * no shadows, no per-building React state. Nothing here is interactive and
 * nothing here is collidable — the player can never get near it.
 */
const Skyline = ({ isTouch = false }) => {
  const buildingsRef = useRef(null);
  const beaconsRef = useRef(null);
  const buildingMat = useRef(null);
  const beaconMat = useRef(null);
  const groundMat = useRef(null);

  const count = isTouch ? 120 : 240;
  const beaconCount = isTouch ? 14 : 30;

  const { matrices, scales, seeds, beaconMatrices, beaconSeeds } = useMemo(() => {
    const rand = makeRandom(0x5eed1);
    const m = new Matrix4();
    const pos = new Vector3();
    const quat = new Quaternion();
    const scl = new Vector3();

    const out = new Float32Array(count * 16);
    const sc = new Float32Array(count * 3);
    const sd = new Float32Array(count);
    const towers = [];

    for (let i = 0; i < count; i += 1) {
      // sqrt keeps the density even across the annulus instead of piling
      // every tower against the inner edge.
      const t = rand();
      const radius = Math.sqrt(INNER * INNER + t * (OUTER * OUTER - INNER * INNER));
      const angle = rand() * Math.PI * 2;

      // Taller nearer the vault, so the silhouette steps down into the haze
      // rather than presenting a flat wall of equal-height blocks.
      const falloff = 1 - (radius - INNER) / (OUTER - INNER);
      // A spread of blocks, mid-rises and the occasional spire. Uniform
      // heights read as a hedge; it is the outliers that make a skyline.
      const spire = rand() > 0.88 ? 1 : 0;
      const height = 9 + rand() * 16 + falloff * falloff * 34 * rand() + spire * (20 + rand() * 28);
      const w = 4.0 + rand() * 6.0 - spire * 1.6;
      const d = 4.0 + rand() * 6.0 - spire * 1.6;

      pos.set(CX + Math.cos(angle) * radius, height / 2, CZ + Math.sin(angle) * radius);
      quat.setFromAxisAngle(new Vector3(0, 1, 0), rand() * Math.PI);
      scl.set(w, height, d);
      m.compose(pos, quat, scl);
      m.toArray(out, i * 16);

      sc[i * 3] = w;
      sc[i * 3 + 1] = height;
      sc[i * 3 + 2] = d;
      sd[i] = rand();

      towers.push({ x: pos.x, z: pos.z, top: height });
    }

    // Beacons crown the tallest towers only — that is where they are in a
    // real skyline, and it doubles as a height cue.
    towers.sort((a, b) => b.top - a.top);
    const bm = new Float32Array(beaconCount * 16);
    const bs = new Float32Array(beaconCount);
    const brand = makeRandom(0xbea0);
    for (let i = 0; i < beaconCount; i += 1) {
      const tower = towers[i % towers.length];
      pos.set(tower.x, tower.top + 0.5, tower.z);
      quat.identity();
      scl.setScalar(0.55);
      m.compose(pos, quat, scl);
      m.toArray(bm, i * 16);
      bs[i] = brand();
    }

    return { matrices: out, scales: sc, seeds: sd, beaconMatrices: bm, beaconSeeds: bs };
  }, [count, beaconCount]);

  const buildingUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWall: { value: new Color('#2b2058') },
      uWinA: { value: new Color('#22d3ee') },
      uWinB: { value: new Color('#b98cff') },
      uHaze: { value: new Color('#2a1e52') },
    }),
    []
  );

  const beaconUniforms = useMemo(
    () => ({ uTime: { value: 0 }, uColor: { value: new Color('#ff6ba8') } }),
    []
  );

  const groundUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uNear: { value: new Color('#1b1440') },
      uHaze: { value: new Color('#2a1e52') },
      uCenter: { value: [CX, CZ] },
    }),
    []
  );

  useLayoutEffect(() => {
    const mesh = buildingsRef.current;
    if (mesh) {
      mesh.instanceMatrix.array.set(matrices);
      mesh.instanceMatrix.needsUpdate = true;
      mesh.geometry.setAttribute('aScale', new InstancedBufferAttribute(scales, 3));
      mesh.geometry.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 1));
    }
    const beacons = beaconsRef.current;
    if (beacons) {
      beacons.instanceMatrix.array.set(beaconMatrices);
      beacons.instanceMatrix.needsUpdate = true;
      beacons.geometry.setAttribute('aSeed', new InstancedBufferAttribute(beaconSeeds, 1));
    }
  }, [matrices, scales, seeds, beaconMatrices, beaconSeeds]);

  useFrame((_, delta) => {
    if (buildingMat.current) buildingMat.current.uniforms.uTime.value += delta;
    if (beaconMat.current) beaconMat.current.uniforms.uTime.value += delta;
    if (groundMat.current) groundMat.current.uniforms.uTime.value += delta;
  });

  return (
    <group>
      {/* The plate the city stands on, tucked just under the vault floor so
          the two never z-fight along the seam. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[CX, -0.06, CZ]} frustumCulled={false}>
        <ringGeometry args={[WORLD_RADIUS - 1, OUTER + 45, isTouch ? 48 : 96, 1]} />
        <shaderMaterial
          ref={groundMat}
          vertexShader={GROUND_VERT}
          fragmentShader={GROUND_FRAG}
          uniforms={groundUniforms}
          fog={false}
          toneMapped={false}
        />
      </mesh>

      <instancedMesh ref={buildingsRef} args={[undefined, undefined, count]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <shaderMaterial
          ref={buildingMat}
          vertexShader={BUILDING_VERT}
          fragmentShader={BUILDING_FRAG}
          uniforms={buildingUniforms}
          fog={false}
          toneMapped={false}
        />
      </instancedMesh>

      <instancedMesh ref={beaconsRef} args={[undefined, undefined, beaconCount]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
        <shaderMaterial
          ref={beaconMat}
          vertexShader={BEACON_VERT}
          fragmentShader={BEACON_FRAG}
          uniforms={beaconUniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          fog={false}
          toneMapped={false}
        />
      </instancedMesh>

      {!isTouch && (
        <>
          <AirTraffic radius={58} height={17} speed={0.10} offset={0.0} color="#67e8f9" length={2.6} />
          <AirTraffic radius={74} height={24} speed={-0.07} offset={2.1} color="#d8b4fe" length={3.4} />
          <AirTraffic radius={47} height={13} speed={0.14} offset={4.4} color="#fda4af" length={2.0} />
        </>
      )}
      {isTouch && (
        <AirTraffic radius={62} height={19} speed={0.10} offset={0.6} color="#67e8f9" length={3.0} />
      )}
    </group>
  );
};

export default Skyline;
