import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BackSide, Color, DoubleSide, MathUtils } from 'three';
import { PALETTE, WORLD_PORTAL } from '../zoneConfig';
import { player } from '../state/playerStore';
import { getWorldState } from '../state/worldStore';

/**
 * The travel gate. One per world, in the same place in each.
 *
 * The surface inside the ring is the whole idea: it is not a picture of
 * somewhere else, it is a slice of somewhere else. A flat disc with a
 * scrolling tunnel drawn on it does that convincingly from a distance and
 * costs one draw call, where an actual render-to-texture portal would cost a
 * second pass over a second scene every frame — unaffordable on the tier
 * that already needed lights taken away from it.
 *
 * It brightens as the courier approaches, and winds itself up hard during a
 * teleport's charge phase, so the flash that follows reads as the gate
 * firing rather than as the screen glitching.
 */

const VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uCharge;   // 0 idle, 1 mid-teleport
  uniform float uNear;     // 0 far away, 1 courier standing at it
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uLight;    // 1 in a daylight world

  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(41.31, 289.17))) * 43758.5453); }

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;

    float a = atan(p.y, p.x);
    float spin = uTime * (0.35 + uCharge * 2.6);

    // Depth: rings running inward, accelerating with charge. Reading them as
    // a tunnel depends entirely on them getting closer together toward the
    // middle, hence log rather than a linear ramp.
    float depth = 1.0 / max(r, 0.06);
    float rings = fract(depth * 1.6 - uTime * (0.6 + uCharge * 3.0));
    float tunnel = smoothstep(0.55, 1.0, rings) * smoothstep(1.0, 0.25, r);

    // Twelve spokes turning with the spin, which is what stops the middle
    // reading as a flat glowing dot.
    float spokes = smoothstep(0.65, 1.0, cos(a * 12.0 + spin * 2.0)) * (1.0 - r) * 0.7;

    // A dusting of static, brighter as it charges.
    float grain = hash(floor(vUv * 90.0) + floor(uTime * 12.0)) * (0.06 + uCharge * 0.3);

    float core = smoothstep(0.75, 0.0, r);
    float rim = smoothstep(0.86, 1.0, r) * 1.4;

    float energy = tunnel * 0.7 + spokes + grain + core * (0.35 + uCharge * 0.9) + rim;
    energy *= 0.55 + uNear * 0.35 + uCharge * 1.2;

    vec3 col = mix(uColorA, uColorB, clamp(r * 1.1 + tunnel * 0.4, 0.0, 1.0));
    col += vec3(uCharge) * 0.8;

    // On a pale sky an additive portal disappears; a daylight world needs the
    // surface to be substantially opaque before its colour reads at all.
    float alpha = clamp(energy, 0.0, 1.0) * mix(0.92, 1.0, uLight);
    alpha = mix(alpha, max(alpha, 0.55 + uCharge * 0.45), uLight);

    gl_FragColor = vec4(col, alpha);
  }
`;

const Portal = ({ isTouch = false, lite = false }) => {
  const matRef = useRef(null);
  const ringRef = useRef(null);
  const haloRef = useRef(null);
  const motesRef = useRef([]);
  const chargeRef = useRef(0);

  const palette = PALETTE;
  const portal = WORLD_PORTAL;
  const isLight = palette.scheme === 'light';

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCharge: { value: 0 },
      uNear: { value: 0 },
      uColorA: { value: new Color(palette.portal.a) },
      uColorB: { value: new Color(palette.portal.b) },
      uLight: { value: isLight ? 1 : 0 },
    }),
    [palette, isLight]
  );

  // Face the middle of the world, so you always meet the gate front-on.
  const facing = useMemo(
    () => Math.atan2(-portal.position[0], -portal.position[2]),
    [portal]
  );

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.1);
    const travel = getWorldState().travel;
    // Ease rather than snap: the charge phase is the wind-up the flash pays
    // off, and a step function there would look like a dropped frame.
    const targetCharge = travel === 'charging' || travel === 'flash' ? 1 : 0;
    chargeRef.current = MathUtils.damp(chargeRef.current, targetCharge, 6, dt);

    const dx = player.position.x - portal.position[0];
    const dz = player.position.z - portal.position[2];
    const near = 1 - MathUtils.clamp(Math.hypot(dx, dz) / 9, 0, 1);

    if (matRef.current) {
      const u = matRef.current.uniforms;
      u.uTime.value += dt;
      u.uCharge.value = chargeRef.current;
      u.uNear.value = near;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += dt * (0.25 + chargeRef.current * 2.4);
    }
    if (haloRef.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 1.4) * 0.03 + chargeRef.current * 0.25;
      haloRef.current.scale.setScalar(s);
      haloRef.current.material.opacity = (isLight ? 0.14 : 0.22) + near * 0.16 + chargeRef.current * 0.5;
    }
    motesRef.current.forEach((m, i) => {
      if (!m) return;
      // Drawn into the gate rather than orbiting it — the direction of travel
      // is the point.
      const t = (clock.elapsedTime * (0.3 + chargeRef.current * 1.2) + i / motesRef.current.length) % 1;
      const rad = 3.2 * (1 - t) + 0.3;
      const ang = i * 2.4 + t * 3.0;
      m.position.set(Math.cos(ang) * rad, 0.5 + t * 2.6, Math.sin(ang) * rad * 0.35);
      m.material.opacity = Math.sin(t * Math.PI) * (0.5 + chargeRef.current * 0.5);
    });
  });

  const MOTES = lite ? 0 : isTouch ? 6 : 12;
  const R = 2.15;

  return (
    <group position={[portal.position[0], 0, portal.position[2]]} rotation={[0, facing, 0]}>
      {/* Footing, so the gate stands on the floor rather than hovering. */}
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[2.9, 3.2, 0.12, lite ? 16 : 28]} />
        <meshStandardMaterial color={palette.structure.deep} metalness={0.4} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.2, 2.85, 28]} />
        <meshBasicMaterial
          color={palette.portal.a}
          transparent
          opacity={0.45}
          toneMapped={false}
          side={DoubleSide}
        />
      </mesh>

      <group position={[0, R + 0.5, 0]}>
        {/* The surface you step through. */}
        <mesh>
          <circleGeometry args={[R, lite ? 24 : 48]} />
          <shaderMaterial
            ref={matRef}
            vertexShader={VERT}
            fragmentShader={FRAG}
            uniforms={uniforms}
            transparent
            side={DoubleSide}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>

        {/* Structural frame */}
        <mesh ref={ringRef}>
          <torusGeometry args={[R + 0.1, 0.14, 8, lite ? 24 : 44]} />
          <meshStandardMaterial
            color={palette.portal.frame}
            metalness={0.8}
            roughness={0.25}
            emissive={palette.portal.a}
            emissiveIntensity={0.5 * palette.emissive}
          />
        </mesh>

        {/* Three struts, so the ring is held up by something. */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * (R + 0.05), -R * 0.55, 0]} rotation={[0, 0, s * 0.16]}>
            <boxGeometry args={[0.14, R * 1.1, 0.22]} />
            <meshStandardMaterial color={palette.structure.body} metalness={0.6} roughness={0.4} />
          </mesh>
        ))}

        {/* Soft halo, additive in the dark world and a plain wash in daylight
            where additive does nothing. */}
        <mesh ref={haloRef}>
          <circleGeometry args={[R * 1.5, 32]} />
          <meshBasicMaterial
            color={palette.portal.b}
            transparent
            opacity={0.2}
            toneMapped={false}
            depthWrite={false}
            side={BackSide}
            blending={isLight ? undefined : AdditiveBlending}
          />
        </mesh>
      </group>

      {Array.from({ length: MOTES }).map((_, i) => (
        <mesh key={i} ref={(m) => { motesRef.current[i] = m; }}>
          <sphereGeometry args={[0.055, 6, 5]} />
          <meshBasicMaterial
            color={i % 2 ? palette.portal.a : palette.portal.b}
            transparent
            opacity={0}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
};

export default Portal;
