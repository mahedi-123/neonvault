import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, DoubleSide, Vector3 } from 'three';
import { WORLD_CENTER, WORLD_RADIUS } from '../zoneConfig';
import { player } from '../state/playerStore';

const VERT = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uPlayer;

  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec2 vUv;

  /**
   * Distance to the nearest edge of a hex cell. Hexes rather than squares
   * because a square grid on a curved wall reads as a texture, while hexes
   * read as a fabricated surface — the shorthand every shield in every
   * science-fiction film has used for fifty years.
   */
  float hexEdge(vec2 p) {
    p.x *= 1.1547;                       // 2/sqrt(3): squash to hex spacing
    p.y += mod(floor(p.x), 2.0) * 0.5;   // offset every other column
    p = abs(fract(p) - 0.5);
    return abs(max(p.x * 1.5 + p.y, p.y * 2.0) - 1.0);
  }

  void main() {
    // Fresnel: transparent when you look straight at it, bright at grazing
    // angles. This is what makes the wall read as glass you can see through
    // rather than as a tinted cylinder around the world.
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float facing = abs(dot(viewDir, vWorldNormal));
    float fresnel = pow(1.0 - facing, 2.2);

    // Hex lattice, stretched around the circumference.
    float cells = hexEdge(vec2(vUv.x * 78.0, vUv.y * 9.0));
    float lattice = smoothstep(0.06, 0.0, cells);

    // Denser at the base, thinning out toward the top so the wall has no
    // hard upper edge — it just runs out of energy.
    float vertical = smoothstep(1.0, 0.05, vUv.y);

    // A bright rail where the shield meets the floor. Head-on, fresnel gives
    // almost nothing, and without this the boundary was only legible when you
    // happened to be looking along it — which is precisely when you do not
    // need to be told where the edge is.
    float rail = smoothstep(0.09, 0.0, vUv.y) * 0.55 + smoothstep(0.15, 0.10, vUv.y) * 0.15;

    // Vertical posts, thin and widely spaced: structure, so the wall reads as
    // built rather than as a gradient someone left on.
    float post = smoothstep(0.965, 1.0, cos(vUv.x * 220.0)) * (0.35 + 0.65 * (1.0 - vUv.y));

    // A charge band climbing the wall.
    float band = fract(vUv.y * 0.9 - uTime * 0.06);
    float scan = smoothstep(0.86, 1.0, band);

    // The shield brightens where the courier stands near it, so walking to
    // the edge tells you the boundary is a thing that noticed you rather
    // than an invisible stop.
    float prox = 1.0 - smoothstep(2.0, 7.0, distance(vWorldPos.xz, uPlayer.xz));

    // The follow camera sits behind the courier, so walking up to the edge
    // puts the camera *outside* the shield and you end up looking at the
    // whole world through a lit cyan mesh. Fading the fragments nearest the
    // camera keeps the wall readable where it curves away to either side
    // while the part directly in front of the lens gets out of the way.
    float clearance = smoothstep(3.5, 22.0, distance(cameraPosition, vWorldPos));

    float alpha =
      ((0.06 + lattice * 0.34 + post * 0.30 + scan * 0.30 + prox * 0.40) *
        (0.40 + fresnel * 0.85) *
        vertical
        + rail * 0.30) *
      clearance;

    vec3 color = mix(uColorA, uColorB, clamp(vUv.y * 1.2 + scan * 0.5, 0.0, 1.0));
    color += prox * 0.35;

    gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.9));
  }
`;

/**
 * The containment wall at the edge of the walkable floor.
 *
 * The floor used to simply stop: the player hit an invisible clamp with
 * nothing to explain it, and past the boundary markers there was only fog.
 * A shield answers both — it makes the limit legible before you reach it,
 * and being transparent it lets the city outside do the job of showing that
 * the world does not end here, it just stops being walkable.
 *
 * Additively blended with depth writes off, so it never occludes anything
 * and never fights the transparent floor pools for sort order.
 */
const WorldBarrier = ({ isTouch = false }) => {
  const matRef = useRef(null);
  const playerVec = useMemo(() => new Vector3(), []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorA: { value: new Color('#22d3ee') },
      uColorB: { value: new Color('#8b5cf6') },
      uPlayer: { value: new Vector3(0, 0, 0) },
    }),
    []
  );

  useFrame((_, delta) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value += delta;
    playerVec.copy(player.position);
    matRef.current.uniforms.uPlayer.value.copy(playerVec);
  });

  return (
    <mesh position={[WORLD_CENTER[0], 5.0, WORLD_CENTER[1]]}>
      {/* Open-ended: no caps, or the world would have a lid. */}
      <cylinderGeometry args={[WORLD_RADIUS + 1.2, WORLD_RADIUS + 1.2, 10, isTouch ? 48 : 96, 1, true]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        transparent
        side={DoubleSide}
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
};

export default WorldBarrier;
