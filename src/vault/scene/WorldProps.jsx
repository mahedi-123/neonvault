import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { WORLD_CENTER, WORLD_RADIUS, zones } from '../zoneConfig';

const VIOLET = '#8b5cf6';
const CYAN = '#22d3ee';

/**
 * Everything on the floor that is not a district: street furniture, the
 * entrance gateway, and the transit line running around the rim.
 *
 * The walk between two districts is most of the time spent in this world,
 * and on the first pass that walk was empty — the props existed to stop the
 * floor being bare. At thirty-one units of radius that is no longer enough:
 * a world you cross in silence reads as a menu with extra steps. So the
 * dressing now does three things — it fills the walk (lamps, crystals), it
 * frames the arrival (the gateway), and it makes the place feel inhabited
 * even when nothing is happening (a tram that keeps running whether or not
 * anyone is watching).
 *
 * All of it is low-poly primitives on ring layouts, kept clear of the
 * approach pads so nothing ever stands between the player and the district
 * they are walking to.
 */

/** Props that land too near a district's pad or platform are dropped rather
 *  than nudged — simpler, and the layout is dense enough to hide the gaps. */
function clearsDistricts(x, z, minDist) {
  for (const zone of zones) {
    if (Math.hypot(x - zone.approach[0], z - zone.approach[1]) < minDist) return false;
    if (
      Math.hypot(x - zone.position[0], z - zone.position[2]) <
      zone.platformRadius + 2.4
    ) {
      return false;
    }
  }
  return true;
}

const LampPost = ({ position, color }) => (
  <group position={position}>
    <mesh position={[0, 1.2, 0]}>
      <cylinderGeometry args={[0.05, 0.08, 2.4, 6]} />
      <meshStandardMaterial color="#2e2450" metalness={0.6} roughness={0.4} />
    </mesh>
    {/* Lit strip up the post. Without it the posts read as bare black sticks
        against the floor — the globe alone is too small to say "lamp". */}
    <mesh position={[0, 1.2, 0.055]}>
      <planeGeometry args={[0.035, 1.9]} />
      <meshBasicMaterial color={color} transparent opacity={0.6} toneMapped={false} side={2} />
    </mesh>
    <mesh position={[0, 2.5, 0]}>
      <sphereGeometry args={[0.17, 10, 8]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
    <pointLight position={[0, 2.5, 0]} color={color} intensity={0.55} distance={8} decay={2} />
    {/* The pool the lamp casts on the floor — cheaper and more legible than
        letting the point light alone try to reach the ground. */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.18, 0]}>
      <circleGeometry args={[1.6, 20]} />
      <meshBasicMaterial color={color} transparent opacity={0.08} toneMapped={false} depthWrite={false} />
    </mesh>
  </group>
);

const Crystal = ({ position, scale, color }) => (
  <group position={position} scale={scale}>
    <mesh position={[0, 0.55, 0]} rotation={[0, 0.6, 0.12]}>
      <octahedronGeometry args={[0.55, 0]} />
      <meshStandardMaterial
        color="#241b45"
        metalness={0.5}
        roughness={0.3}
        emissive={color}
        emissiveIntensity={0.45}
      />
    </mesh>
    <mesh position={[0.42, 0.3, 0.22]} rotation={[0.2, 0, 0.3]} scale={0.5}>
      <octahedronGeometry args={[0.55, 0]} />
      <meshStandardMaterial
        color="#241b45"
        metalness={0.5}
        roughness={0.3}
        emissive={color}
        emissiveIntensity={0.35}
      />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.17, 0]}>
      <circleGeometry args={[1, 16]} />
      <meshBasicMaterial color={color} transparent opacity={0.09} toneMapped={false} depthWrite={false} />
    </mesh>
  </group>
);

/** Entrance banners, gently swaying — placed AHEAD of the spawn mark so they
 *  frame the walk in rather than standing between the camera and the
 *  courier for the whole opening shot. */
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
        <meshStandardMaterial color="#2e2450" metalness={0.6} roughness={0.4} />
      </mesh>
      <group ref={ref} position={[0, 2.5, 0]}>
        <mesh position={[flip ? -0.4 : 0.4, -0.72, 0]}>
          <planeGeometry args={[0.72, 1.3]} />
          <meshStandardMaterial color="#341c63" emissive={VIOLET} emissiveIntensity={0.24} side={2} />
        </mesh>
        <mesh position={[flip ? -0.4 : 0.4, -0.62, 0.012]}>
          <planeGeometry args={[0.26, 0.26]} />
          <meshBasicMaterial color={CYAN} transparent opacity={0.85} toneMapped={false} side={2} />
        </mesh>
      </group>
    </group>
  );
};

/**
 * The gateway the courier spawns under. Its whole job is the first second:
 * something overhead at the start point turns "you are standing on a disc"
 * into "you have arrived somewhere", and gives the establishing shot a
 * foreground to read depth against.
 */
const EntranceArch = () => {
  const scanRef = useRef(null);
  const scanMatRef = useRef(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (scanRef.current) scanRef.current.position.y = 1.2 + ((t * 0.55) % 1) * 3.8;
    if (scanMatRef.current) {
      const phase = (t * 0.55) % 1;
      scanMatRef.current.opacity = Math.sin(phase * Math.PI) * 0.34;
    }
  });

  return (
    // Sits AHEAD of the spawn mark, not behind it. Behind, it was both in
    // front of the follow camera at spawn and a solid bar straight across
    // the establishing shot, hiding the city the shot exists to show.
    // Ahead, you walk out through it and it frames the view in.
    <group position={[0, 0, 11]}>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 3.9, 0, 0]}>
          <mesh position={[0, 2.6, 0]}>
            <boxGeometry args={[0.6, 5.2, 0.8]} />
            <meshStandardMaterial color="#241c46" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[side * 0.32, 2.6, 0]}>
            <planeGeometry args={[0.06, 4.0]} />
            <meshBasicMaterial color={CYAN} transparent opacity={0.7} toneMapped={false} side={2} />
          </mesh>
          <mesh position={[0, 0.25, 0]}>
            <boxGeometry args={[1.2, 0.5, 1.4]} />
            <meshStandardMaterial color="#1e1738" metalness={0.5} roughness={0.5} />
          </mesh>
        </group>
      ))}

      {/* Lintel */}
      <mesh position={[0, 5.5, 0]}>
        <boxGeometry args={[8.4, 0.55, 0.85]} />
        <meshStandardMaterial color="#2b2154" metalness={0.6} roughness={0.38} emissive={VIOLET} emissiveIntensity={0.22} />
      </mesh>
      <mesh position={[0, 5.18, 0.44]}>
        <planeGeometry args={[7.6, 0.09]} />
        <meshBasicMaterial color={VIOLET} transparent opacity={0.85} toneMapped={false} />
      </mesh>

      {/* Scan plane rising through the gate — the arch is "reading you in" */}
      <mesh ref={scanRef} position={[0, 1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7.4, 1.4]} />
        <meshBasicMaterial
          ref={scanMatRef}
          color={CYAN}
          transparent
          opacity={0}
          toneMapped={false}
          depthWrite={false}
          side={2}
        />
      </mesh>

      <pointLight position={[0, 4.4, 0]} color={VIOLET} intensity={1.5} distance={18} decay={2} />
    </group>
  );
};

/**
 * An elevated transit loop around the rim with two cars running on it.
 *
 * This is the one piece of the world that moves on its own schedule and has
 * nothing to do with the player, which is exactly why it is here: a place
 * feels inhabited when something in it carries on regardless of you. It
 * also draws the world's outer boundary in the air, so the edge of the disc
 * reads as the edge of a city rather than as the end of the geometry.
 */
const TransitRing = ({ isTouch }) => {
  const carRefs = useRef([]);
  const [cx, cz] = WORLD_CENTER;
  const RADIUS = WORLD_RADIUS + 3.5;
  const HEIGHT = 5.6;
  const CARS = isTouch ? 1 : 2;

  const supports = useMemo(() => {
    const count = isTouch ? 8 : 14;
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + 0.1;
      return {
        key: i,
        position: [cx + Math.sin(angle) * RADIUS, 0, cz + Math.cos(angle) * RADIUS],
      };
    });
  }, [cx, cz, isTouch, RADIUS]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    carRefs.current.forEach((car, i) => {
      if (!car) return;
      // Each car is a group pivoted at the world centre, so orbiting it is a
      // single Y rotation — no per-frame trig, no path to interpolate.
      car.rotation.y = t * 0.055 + (i / CARS) * Math.PI * 2;
    });
  });

  return (
    <group position={[cx, 0, cz]}>
      {/* Track */}
      <mesh position={[0, HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[RADIUS, 0.11, 6, isTouch ? 48 : 96]} />
        <meshStandardMaterial color="#2b2252" metalness={0.6} roughness={0.4} emissive={VIOLET} emissiveIntensity={0.18} />
      </mesh>
      <mesh position={[0, HEIGHT - 0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[RADIUS, 0.02, 6, isTouch ? 48 : 96]} />
        <meshBasicMaterial color={CYAN} transparent opacity={0.5} toneMapped={false} />
      </mesh>

      {/* Support columns */}
      {supports.map((s) => (
        <mesh key={s.key} position={[s.position[0] - cx, HEIGHT / 2, s.position[2] - cz]}>
          <cylinderGeometry args={[0.16, 0.24, HEIGHT, 8]} />
          <meshStandardMaterial color="#231b44" metalness={0.55} roughness={0.45} />
        </mesh>
      ))}

      {/* Cars */}
      {Array.from({ length: CARS }, (_, i) => (
        <group
          key={`car-${i}`}
          ref={(g) => {
            carRefs.current[i] = g;
          }}
        >
          <group position={[0, HEIGHT + 0.5, RADIUS]}>
            {/* Capsules are built along Y; tipped onto X so the car lies
                along its direction of travel, which at this point on the
                loop is the tangent. */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <capsuleGeometry args={[0.42, 2.6, 4, 10]} />
              <meshStandardMaterial color="#2f2461" metalness={0.7} roughness={0.28} emissive={VIOLET} emissiveIntensity={0.2} />
            </mesh>
            {/* Window band */}
            <mesh position={[0, 0.08, 0.43]}>
              <planeGeometry args={[2.4, 0.3]} />
              <meshBasicMaterial color={CYAN} transparent opacity={0.85} toneMapped={false} />
            </mesh>
            <mesh position={[0, 0.08, -0.43]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[2.4, 0.3]} />
              <meshBasicMaterial color={CYAN} transparent opacity={0.85} toneMapped={false} />
            </mesh>
            <pointLight color={CYAN} intensity={0.8} distance={12} decay={2} />
          </group>
        </group>
      ))}
    </group>
  );
};

const WorldProps = ({ isTouch = false }) => {
  const [cx, cz] = WORLD_CENTER;

  const lamps = useMemo(() => {
    // Lamps sit ON the two ring roads, so the lit line you follow between
    // districts is the same line the floor draws.
    const out = [];
    const ringSpecs = isTouch
      ? [{ radius: 24, count: 10 }]
      : [
          { radius: 12, count: 10 },
          { radius: 24, count: 18 },
        ];
    let key = 0;
    for (const { radius, count } of ringSpecs) {
      for (let i = 0; i < count; i += 1) {
        const angle = (i / count) * Math.PI * 2 + 0.22;
        const x = cx + Math.sin(angle) * radius;
        const z = cz + Math.cos(angle) * radius;
        key += 1;
        if (!clearsDistricts(x, z, 3)) continue;
        out.push({ key, position: [x, 0, z], color: key % 2 === 0 ? VIOLET : CYAN });
      }
    }
    return out;
  }, [cx, cz, isTouch]);

  const crystals = useMemo(() => {
    if (isTouch) return [];
    const out = [];
    for (let i = 0; i < 26; i += 1) {
      // Three offset rings rather than random scatter — keeps the spacing
      // even without a seeded RNG, and reads as landscaping, not litter.
      const band = i % 3;
      const angle = (i / 26) * Math.PI * 2 + band * 0.35;
      const r = [7, 18, 28][band];
      const x = cx + Math.sin(angle) * r;
      const z = cz + Math.cos(angle) * r;
      if (!clearsDistricts(x, z, 3.2)) continue;
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
      <EntranceArch />
      <TransitRing isTouch={isTouch} />

      <Banner position={[-3.2, 0, 7]} />
      <Banner position={[3.2, 0, 7]} flip />

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
