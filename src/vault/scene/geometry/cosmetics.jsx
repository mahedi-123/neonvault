import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide } from 'three';

/**
 * AURA LAB's exhibits.
 *
 * Same contract as the technology world's variants in Zone.jsx: each takes a
 * `factorRef` that ramps 0→1 as the district wakes up, an `accentColor`, and
 * writes all motion straight to refs inside useFrame so hovering a district
 * never re-renders the 3D tree.
 *
 * The one thing they do differently is restraint with emissive. These stand
 * on a porcelain floor under a bright sky, where a glowing object reads as a
 * blown-out smear rather than as a lit one — so form and material carry the
 * exhibits here, and light only trims them.
 */

/** Shared plinth. Every exhibit in this world stands on the same one, which
 *  is what makes five different objects read as one collection. */
const Plinth = ({ radius = 0.85, height = 0.9, color, accent }) => (
  <group>
    <mesh position={[0, height / 2, 0]}>
      <cylinderGeometry args={[radius, radius * 1.06, height, 20]} />
      <meshStandardMaterial color={color} metalness={0.12} roughness={0.72} />
    </mesh>
    <mesh position={[0, height + 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius * 0.82, radius * 0.97, 24]} />
      <meshBasicMaterial color={accent} transparent opacity={0.5} toneMapped={false} side={DoubleSide} />
    </mesh>
  </group>
);

/**
 * COLOUR BAR — a rank of lipstick bullets that rise and turn.
 *
 * Six rather than one: a single lipstick at this scale is a small cylinder
 * and reads as nothing. A row of them reads instantly, and staggering their
 * rise turns the whole district into one slow gesture.
 */
export function LipstickGeometry({ factorRef, accentColor, P, isTouch = false }) {
  const bulletsRef = useRef([]);
  const ringRef = useRef(null);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const f = factorRef.current;
    bulletsRef.current.forEach((mesh, i) => {
      if (!mesh) return;
      const phase = t * 0.9 + i * 0.7;
      // Each bullet winds out of its case and back, never all at once.
      const rise = (Math.sin(phase) * 0.5 + 0.5) * 0.34 * f;
      mesh.position.y = 0.34 + rise;
      mesh.rotation.y += delta * (0.4 + i * 0.05);
    });
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.16;
      ringRef.current.material.opacity = 0.14 + f * 0.2;
    }
  });

  const COUNT = isTouch ? 4 : 6;
  const shades = ['#c2455f', '#e0679a', '#b8465c', '#d4736f', '#a83c62', '#e88fa8'];

  return (
    <group>
      <Plinth radius={1.15} height={0.86} color={P.structure.light} accent={accentColor} />

      {/* The bar itself — a low slab the bullets stand in. */}
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[1.9, 0.14, 0.5]} />
        <meshStandardMaterial color={P.structure.edge} metalness={0.3} roughness={0.5} />
      </mesh>

      {Array.from({ length: COUNT }).map((_, i) => {
        const x = (i - (COUNT - 1) / 2) * 0.31;
        return (
          <group key={i} position={[x, 0, 0]}>
            {/* Case */}
            <mesh position={[0, 1.14, 0]}>
              <cylinderGeometry args={[0.075, 0.082, 0.26, 12]} />
              <meshStandardMaterial color={P.structure.deep} metalness={0.72} roughness={0.24} />
            </mesh>
            {/* Bullet — the angled tip is the whole silhouette of a lipstick. */}
            <mesh
              ref={(m) => { bulletsRef.current[i] = m; }}
              position={[0, 1.34, 0]}
              rotation={[0.28, 0, 0]}
            >
              <cylinderGeometry args={[0.055, 0.062, 0.2, 12]} />
              <meshStandardMaterial
                color={shades[i % shades.length]}
                metalness={0.1}
                roughness={0.34}
                emissive={shades[i % shades.length]}
                emissiveIntensity={0.18 * P.emissive}
              />
            </mesh>
          </group>
        );
      })}

      {/* A slow halo behind the row, standing in for a lit mirror. */}
      <mesh ref={ringRef} position={[0, 1.5, -0.42]}>
        <ringGeometry args={[0.9, 1.02, 40]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.2} toneMapped={false} side={DoubleSide} />
      </mesh>
    </group>
  );
}

/**
 * SKIN LAB — a dropper over a bowl, releasing one bead at a time.
 *
 * The bead is the exhibit. A bottle on a plinth is inert; a single drop
 * falling on a loop is the smallest possible thing that says "this is a
 * liquid, and it is being applied".
 */
export function SerumGeometry({ factorRef, accentColor, P }) {
  const dropRef = useRef(null);
  const rippleRef = useRef(null);
  const bottleRef = useRef(null);

  useFrame(({ clock }, delta) => {
    const f = factorRef.current;
    const cycle = (clock.elapsedTime * 0.55) % 1;

    if (dropRef.current) {
      // Falls from the nozzle to the bowl, then disappears for the reset.
      dropRef.current.position.y = 1.62 - cycle * 0.72;
      dropRef.current.scale.setScalar((cycle < 0.92 ? 1 : 0) * (0.6 + f * 0.4));
    }
    if (rippleRef.current) {
      // The ripple starts exactly as the drop lands.
      const r = cycle < 0.92 ? 0 : (cycle - 0.92) / 0.08;
      rippleRef.current.scale.setScalar(0.3 + r * 1.5);
      rippleRef.current.material.opacity = (1 - r) * 0.5 * f;
    }
    if (bottleRef.current) {
      bottleRef.current.rotation.y += delta * 0.22;
    }
  });

  return (
    <group>
      <Plinth radius={1.0} height={0.9} color={P.structure.light} accent={accentColor} />

      {/* Bowl the drop lands in */}
      <mesh position={[0, 0.94, 0]}>
        <cylinderGeometry args={[0.42, 0.3, 0.12, 20]} />
        <meshStandardMaterial color={P.structure.edge} metalness={0.25} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.38, 20]} />
        <meshStandardMaterial color={accentColor} metalness={0.4} roughness={0.15} transparent opacity={0.55} />
      </mesh>
      <mesh ref={rippleRef} position={[0, 1.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.26, 24]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0} toneMapped={false} side={DoubleSide} />
      </mesh>

      {/* The falling bead */}
      <mesh ref={dropRef} position={[0, 1.6, 0]}>
        <sphereGeometry args={[0.052, 10, 8]} />
        <meshStandardMaterial
          color={accentColor}
          metalness={0.2}
          roughness={0.1}
          emissive={accentColor}
          emissiveIntensity={0.35 * P.emissive}
        />
      </mesh>

      {/* Bottle and pipette above */}
      <group ref={bottleRef} position={[0, 1.72, 0]}>
        <mesh>
          <cylinderGeometry args={[0.19, 0.19, 0.42, 14]} />
          <meshStandardMaterial color={P.structure.light} metalness={0.15} roughness={0.12} transparent opacity={0.72} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.14, 0.14, 0.3, 12]} />
          <meshStandardMaterial color={accentColor} metalness={0.2} roughness={0.3} transparent opacity={0.85} />
        </mesh>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.09, 0.11, 0.2, 12]} />
          <meshStandardMaterial color={P.structure.deep} metalness={0.7} roughness={0.28} />
        </mesh>
        <mesh position={[0, -0.24, 0]}>
          <coneGeometry args={[0.05, 0.14, 10]} />
          <meshStandardMaterial color={P.structure.deep} metalness={0.7} roughness={0.28} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * FRAGRANCE HALL — a faceted bottle with scent leaving it.
 *
 * Scent is invisible, so the exhibit has to be about the release rather than
 * the liquid: rings expanding out of the atomiser on a slow loop, which is
 * the only honest way to draw a smell.
 */
export function FragranceGeometry({ factorRef, accentColor, P, isTouch = false }) {
  const bottleRef = useRef(null);
  const puffRefs = useRef([]);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const f = factorRef.current;
    if (bottleRef.current) {
      bottleRef.current.rotation.y += delta * 0.3;
      bottleRef.current.position.y = 1.28 + Math.sin(t * 0.9) * 0.03;
    }
    puffRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const phase = ((t * 0.42 + i / puffRefs.current.length) % 1);
      mesh.scale.setScalar(0.25 + phase * 1.5);
      mesh.position.y = 1.62 + phase * 0.5;
      mesh.material.opacity = (1 - phase) * 0.32 * f;
    });
  });

  const PUFFS = isTouch ? 2 : 3;

  return (
    <group>
      <Plinth radius={1.05} height={0.92} color={P.structure.light} accent={accentColor} />

      <group ref={bottleRef} position={[0, 1.28, 0]}>
        {/* Faceted body — an octahedron flattened into a flask reads as cut
            glass far better than a cylinder does. */}
        <mesh scale={[1, 1.15, 0.62]}>
          <octahedronGeometry args={[0.3, 0]} />
          <meshStandardMaterial
            color={accentColor}
            metalness={0.35}
            roughness={0.08}
            transparent
            opacity={0.68}
          />
        </mesh>
        <mesh position={[0, 0.34, 0]}>
          <cylinderGeometry args={[0.07, 0.09, 0.14, 10]} />
          <meshStandardMaterial color={P.structure.deep} metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.44, 0]}>
          <sphereGeometry args={[0.075, 10, 8]} />
          <meshStandardMaterial color={P.structure.deep} metalness={0.85} roughness={0.15} />
        </mesh>
      </group>

      {Array.from({ length: PUFFS }).map((_, i) => (
        <mesh
          key={i}
          ref={(m) => { puffRefs.current[i] = m; }}
          position={[0, 1.62, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.28, 0.33, 24]} />
          <meshBasicMaterial color={accentColor} transparent opacity={0} toneMapped={false} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * THE TOOL RAIL — brushes hanging from a rail, swaying.
 *
 * Hung rather than standing in a pot: hanging gives them a length to read
 * and a reason to move, and the sway is what stops five identical sticks
 * looking like a fence.
 */
export function BrushesGeometry({ factorRef, accentColor, P, isTouch = false }) {
  const brushRefs = useRef([]);
  const railRef = useRef(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const f = factorRef.current;
    brushRefs.current.forEach((g, i) => {
      if (!g) return;
      g.rotation.z = Math.sin(t * 1.1 + i * 0.9) * 0.14 * f;
      g.rotation.x = Math.cos(t * 0.8 + i * 0.6) * 0.06 * f;
    });
    if (railRef.current) railRef.current.position.y = 1.72 + Math.sin(t * 0.6) * 0.015;
  });

  const COUNT = isTouch ? 4 : 6;
  const ferrules = ['#d8b46a', '#c9a15a', '#e0c07d'];

  return (
    <group>
      <Plinth radius={1.1} height={0.88} color={P.structure.light} accent={accentColor} />

      {/* Uprights + rail */}
      {[-0.85, 0.85].map((x) => (
        <mesh key={x} position={[x, 1.32, 0]}>
          <cylinderGeometry args={[0.045, 0.05, 0.9, 8]} />
          <meshStandardMaterial color={P.structure.deep} metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
      <group ref={railRef} position={[0, 1.72, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.035, 0.035, 1.75, 8]} />
          <meshStandardMaterial color={P.structure.deep} metalness={0.75} roughness={0.25} />
        </mesh>
      </group>

      {Array.from({ length: COUNT }).map((_, i) => {
        const x = (i - (COUNT - 1) / 2) * 0.27;
        const len = 0.32 + (i % 3) * 0.06;
        return (
          <group key={i} ref={(g) => { brushRefs.current[i] = g; }} position={[x, 1.7, 0]}>
            {/* Handle */}
            <mesh position={[0, -len / 2 - 0.1, 0]}>
              <cylinderGeometry args={[0.026, 0.034, len, 8]} />
              <meshStandardMaterial color={P.structure.deep} metalness={0.2} roughness={0.5} />
            </mesh>
            {/* Ferrule — the metal band is what makes it a brush and not a stick */}
            <mesh position={[0, -len - 0.13, 0]}>
              <cylinderGeometry args={[0.036, 0.032, 0.07, 8]} />
              <meshStandardMaterial color={ferrules[i % 3]} metalness={0.85} roughness={0.2} />
            </mesh>
            {/* Bristles */}
            <mesh position={[0, -len - 0.22, 0]}>
              <coneGeometry args={[0.055, 0.16, 10]} />
              <meshStandardMaterial color={accentColor} metalness={0.05} roughness={0.9} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/**
 * THE MIRROR — the centre of the world.
 *
 * The counterpart to the tech world's CORE: monumental rather than
 * product-shaped, and the one thing on the floor visible from everywhere. A
 * ring light standing on end, with the bulbs actually running round it.
 */
export function MirrorGeometry({ factorRef, accentColor, P, isTouch = false }) {
  const ringRef = useRef(null);
  const bulbRefs = useRef([]);
  const glassRef = useRef(null);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const f = factorRef.current;
    if (ringRef.current) ringRef.current.rotation.z += delta * 0.05;
    bulbRefs.current.forEach((m, i) => {
      if (!m) return;
      // A chase running round the ring, the way a dressing-room mirror does.
      const phase = (t * 0.7 - i / bulbRefs.current.length) % 1;
      // `m` is the material itself (the ref sits on <meshStandardMaterial>),
      // so this writes the property directly rather than through .material.
      m.emissiveIntensity = (0.35 + Math.max(0, 1 - phase * 5) * 1.4) * f * P.emissive;
    });
    if (glassRef.current) {
      glassRef.current.material.opacity = 0.24 + Math.sin(t * 0.5) * 0.04 + f * 0.12;
    }
  });

  const BULBS = isTouch ? 14 : 24;
  const R = 2.05;

  return (
    <group>
      {/* Base the ring stands on */}
      <mesh position={[0, 0.24, 0]}>
        <cylinderGeometry args={[1.5, 1.7, 0.48, 28]} />
        <meshStandardMaterial color={P.structure.edge} metalness={0.2} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.49, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.2, 1.44, 32]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.4} toneMapped={false} side={DoubleSide} />
      </mesh>

      {/* Two posts holding the ring up */}
      {[-1.05, 1.05].map((x) => (
        <mesh key={x} position={[x, 1.3, 0]} rotation={[0, 0, x > 0 ? -0.1 : 0.1]}>
          <cylinderGeometry args={[0.07, 0.09, 1.7, 10]} />
          <meshStandardMaterial color={P.structure.deep} metalness={0.6} roughness={0.35} />
        </mesh>
      ))}

      <group ref={ringRef} position={[0, 3.0, 0]}>
        {/* The ring body */}
        <mesh>
          <torusGeometry args={[R, 0.16, 10, isTouch ? 28 : 48]} />
          <meshStandardMaterial color={P.structure.light} metalness={0.5} roughness={0.28} />
        </mesh>

        {/* Bulbs set into its inner face */}
        {Array.from({ length: BULBS }).map((_, i) => {
          const a = (i / BULBS) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * (R - 0.16), Math.sin(a) * (R - 0.16), 0.1]}>
              <sphereGeometry args={[0.075, 8, 6]} />
              <meshStandardMaterial
                ref={(m) => { bulbRefs.current[i] = m; }}
                color="#fff6ec"
                emissive="#ffe9d2"
                emissiveIntensity={0.4}
                toneMapped={false}
              />
            </mesh>
          );
        })}

        {/* The glass itself — barely there, which is what makes it read as a
            mirror rather than as a disc. */}
        <mesh ref={glassRef} position={[0, 0, -0.02]}>
          <circleGeometry args={[R - 0.2, isTouch ? 24 : 40]} />
          <meshStandardMaterial
            color={P.structure.light}
            metalness={0.95}
            roughness={0.06}
            transparent
            opacity={0.3}
            side={DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
}
