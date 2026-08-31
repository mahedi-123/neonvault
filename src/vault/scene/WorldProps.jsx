import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { WORLD_CENTER, WORLD_RADIUS, zones } from '../zoneConfig';

const VIOLET = '#8b5cf6';
const CYAN = '#22d3ee';

/**
 * Set dressing for the walkable floor.
 *
 * When the camera was locked overhead, empty space between the zones read as
 * deliberate negative space. At walking height it just reads as an empty
 * room, and the walk between two exhibits felt like nothing happening. These
 * props exist to fill that walk: lamp posts to pass under, crystal clusters
 * to walk around, and entrance banners that frame where the tour starts.
 *
 * All of it is low-poly primitives placed on a ring layout, deliberately
 * kept off the straight lines between neighbouring approach pads so nothing
 * ever stands between the player and the exhibit they are heading for.
 */

/** Squared distance from a point to every zone's approach pad. Props that
 *  land too near a pad are dropped rather than nudged — simpler, and the
 *  layout is dense enough that losing a few is invisible. */
function clearsApproachPads(x, z, minDist) {
  for (const zone of zones) {
    const d = Math.hypot(x - zone.approach[0], z - zone.approach[1]);
    if (d < minDist) return false;
    const dc = Math.hypot(x - zone.position[0], z - zone.position[2]);
    if (dc < zone.platformRadius + 2.4) return false;
  }
  return true;
}

const LampPost = ({ position, color }) => (
  <group position={position}>
    <mesh position={[0, 1.2, 0]}>
      <cylinderGeometry args={[0.05, 0.08, 2.4, 6]} />
      <meshStandardMaterial color="#241c3d" metalness={0.6} roughness={0.4} />
    </mesh>
    {/* Lit strip up the post. Without it the posts read as bare black sticks
        against a dark floor — the globe alone is too small to say "lamp". */}
    <mesh position={[0, 1.2, 0.055]}>
      <planeGeometry args={[0.035, 1.9]} />
      <meshBasicMaterial color={color} transparent opacity={0.6} toneMapped={false} side={2} />
    </mesh>
    <mesh position={[0, 2.5, 0]}>
      <sphereGeometry args={[0.17, 10, 8]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
    <pointLight position={[0, 2.5, 0]} color={color} intensity={0.6} distance={7} decay={2} />
    {/* The pool the lamp casts on the floor — cheaper and more legible than
        letting the point light alone try to reach the ground. */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.18, 0]}>
      <circleGeometry args={[1.5, 20]} />
      <meshBasicMaterial color={color} transparent opacity={0.07} toneMapped={false} depthWrite={false} />
    </mesh>
  </group>
);

const Crystal = ({ position, scale, color }) => (
  <group position={position} scale={scale}>
    <mesh position={[0, 0.55, 0]} rotation={[0, 0.6, 0.12]}>
      <octahedronGeometry args={[0.55, 0]} />
      <meshStandardMaterial
        color="#1a1430"
        metalness={0.5}
        roughness={0.3}
        emissive={color}
        emissiveIntensity={0.45}
      />
    </mesh>
    <mesh position={[0.42, 0.3, 0.22]} rotation={[0.2, 0, 0.3]} scale={0.5}>
      <octahedronGeometry args={[0.55, 0]} />
      <meshStandardMaterial
        color="#1a1430"
        metalness={0.5}
        roughness={0.3}
        emissive={color}
        emissiveIntensity={0.35}
      />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.17, 0]}>
      <circleGeometry args={[1, 16]} />
      <meshBasicMaterial color={color} transparent opacity={0.08} toneMapped={false} depthWrite={false} />
    </mesh>
  </group>
);

/**
 * The two entrance banners, gently swaying — the only moving set dressing,
 * which is enough to keep the entrance from looking like a still frame.
 *
 * Sized and placed carefully: an earlier pass had them twice this big and
 * standing behind the spawn point, which put a solid purple slab between the
 * follow camera and the courier for the whole opening shot. They now stand
 * AHEAD of the spawn mark, flanking the walkway, where they frame the view
 * down to CORE instead of blocking it.
 */
const Banner = ({ position, flip = false }) => {
  const ref = useRef(null);
  const seed = useRef(Math.random() * 10);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.6 + seed.current) * 0.05;
  });

  return (
    <group position={position}>
      <mesh position={[0, 1.35, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 2.7, 6]} />
        <meshStandardMaterial color="#241c3d" metalness={0.6} roughness={0.4} />
      </mesh>
      <group ref={ref} position={[0, 2.5, 0]}>
        <mesh position={[flip ? -0.4 : 0.4, -0.72, 0]}>
          <planeGeometry args={[0.72, 1.3]} />
          <meshStandardMaterial
            color="#2a1550"
            emissive={VIOLET}
            emissiveIntensity={0.22}
            side={2}
          />
        </mesh>
        <mesh position={[flip ? -0.4 : 0.4, -0.62, 0.012]}>
          <planeGeometry args={[0.26, 0.26]} />
          <meshBasicMaterial color={CYAN} transparent opacity={0.85} toneMapped={false} side={2} />
        </mesh>
      </group>
    </group>
  );
};

const WorldProps = ({ isTouch = false }) => {
  const [cx, cz] = WORLD_CENTER;

  const lamps = useMemo(() => {
    const count = isTouch ? 8 : 14;
    const out = [];
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2 + 0.2;
      const r = WORLD_RADIUS - 4.5;
      const x = cx + Math.sin(angle) * r;
      const z = cz + Math.cos(angle) * r;
      if (!clearsApproachPads(x, z, 2.6)) continue;
      out.push({ key: i, position: [x, 0, z], color: i % 2 === 0 ? VIOLET : CYAN });
    }
    return out;
  }, [cx, cz, isTouch]);

  const crystals = useMemo(() => {
    if (isTouch) return [];
    const out = [];
    for (let i = 0; i < 16; i += 1) {
      // Two offset rings rather than random scatter — keeps the spacing even
      // without needing a seeded RNG, and reads as landscaping, not litter.
      const ring = i % 2 === 0;
      const angle = (i / 16) * Math.PI * 2 + (ring ? 0 : 0.4);
      const r = ring ? WORLD_RADIUS - 7.5 : WORLD_RADIUS - 11.5;
      const x = cx + Math.sin(angle) * r;
      const z = cz + Math.cos(angle) * r;
      if (!clearsApproachPads(x, z, 3)) continue;
      out.push({
        key: i,
        position: [x, 0, z],
        scale: 0.7 + (i % 3) * 0.22,
        color: i % 3 === 0 ? CYAN : VIOLET,
      });
    }
    return out;
  }, [cx, cz, isTouch]);

  return (
    <group>
      <Banner position={[-3.6, 0, 3]} />
      <Banner position={[3.6, 0, 3]} flip />

      {lamps.map((lamp) => (
        <LampPost key={`lamp-${lamp.key}`} position={lamp.position} color={lamp.color} />
      ))}

      {crystals.map((crystal) => (
        <Crystal
          key={`crystal-${crystal.key}`}
          position={crystal.position}
          scale={crystal.scale}
          color={crystal.color}
        />
      ))}
    </group>
  );
};

export default WorldProps;
