import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide } from 'three';

/**
 * ATELIER's exhibits.
 *
 * Same contract as every other variant: a `factorRef` that ramps as the
 * district wakes, an `accentColor`, all motion written to refs in useFrame.
 *
 * Clothing is the hardest of the three worlds to build out of primitives,
 * because cloth is the one thing a box is worst at. The answer used
 * throughout here is to imply the garment with the thing that holds it — a
 * rail, a hanger, a form, a plinth — and let a slow sway do the rest. A
 * still, hard-edged coat reads as a slab; the same slab swinging by two
 * degrees on a hanger reads as fabric.
 */

const Plinth = ({ radius = 0.9, height = 0.62, color, accent }) => (
  <group>
    <mesh position={[0, height / 2, 0]}>
      <cylinderGeometry args={[radius, radius * 1.05, height, 20]} />
      <meshStandardMaterial color={color} metalness={0.08} roughness={0.8} />
    </mesh>
    <mesh position={[0, height + 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius * 0.8, radius * 0.95, 24]} />
      <meshBasicMaterial color={accent} transparent opacity={0.45} toneMapped={false} side={DoubleSide} />
    </mesh>
  </group>
);

/** One garment on a hanger: shoulders, a tapering body, and a sway. */
const Hanging = ({ colour, width = 0.46, length = 1.05, tone }) => (
  <group>
    <mesh position={[0, 0.04, 0]}>
      <torusGeometry args={[0.055, 0.012, 6, 12, Math.PI]} />
      <meshStandardMaterial color={tone} metalness={0.8} roughness={0.25} />
    </mesh>
    {/* Shoulder bar */}
    <mesh position={[0, -0.06, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.015, 0.015, width, 6]} />
      <meshStandardMaterial color={tone} metalness={0.8} roughness={0.25} />
    </mesh>
    {/* The garment: wider at the shoulder than the hem, which is the whole
        difference between reading as a coat and reading as a plank. */}
    <mesh position={[0, -0.06 - length / 2, 0]}>
      <cylinderGeometry args={[width * 0.62, width * 0.44, length, 8, 1, false]} />
      <meshStandardMaterial color={colour} metalness={0.03} roughness={0.92} />
    </mesh>
    {/* Front seam — one line is enough to say "this opens". */}
    <mesh position={[0, -0.06 - length / 2, width * 0.45]}>
      <planeGeometry args={[0.012, length * 0.92]} />
      <meshStandardMaterial color={tone} metalness={0.3} roughness={0.6} />
    </mesh>
  </group>
);

/**
 * OUTERWEAR — a rail of coats, each swinging on its own beat.
 */
export function RailGeometry({ factorRef, accentColor, P, isTouch = false }) {
  const coatRefs = useRef([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const f = factorRef.current;
    coatRefs.current.forEach((g, i) => {
      if (!g) return;
      g.rotation.z = Math.sin(t * 0.85 + i * 1.3) * 0.075 * f;
      g.rotation.y = Math.sin(t * 0.5 + i) * 0.22;
    });
  });

  const COUNT = isTouch ? 3 : 5;
  const coats = ['#8a5a45', '#6f7f74', '#a8724f', '#5d6b78', '#93613f'];

  return (
    <group>
      <Plinth radius={1.2} height={0.5} color={P.structure.light} accent={accentColor} />

      {[-1.0, 1.0].map((x) => (
        <mesh key={x} position={[x, 1.25, 0]}>
          <cylinderGeometry args={[0.05, 0.06, 1.5, 8]} />
          <meshStandardMaterial color={P.structure.deep} metalness={0.55} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 1.98, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 2.05, 8]} />
        <meshStandardMaterial color={P.structure.deep} metalness={0.8} roughness={0.2} />
      </mesh>

      {Array.from({ length: COUNT }).map((_, i) => {
        const x = (i - (COUNT - 1) / 2) * 0.4;
        return (
          <group key={i} ref={(g) => { coatRefs.current[i] = g; }} position={[x, 1.98, 0]}>
            <Hanging colour={coats[i % coats.length]} tone={P.structure.deep} length={1.0 + (i % 2) * 0.16} />
          </group>
        );
      })}
    </group>
  );
}

/**
 * DENIM YARD — a stack of folded pairs that breathes.
 *
 * Folded rather than hung, because that is how denim is actually kept, and
 * because a stack gives the district a completely different silhouette from
 * the rail next door — five worlds of identical rails would be one world.
 */
export function StackGeometry({ factorRef, accentColor, P, isTouch = false }) {
  const foldRefs = useRef([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const f = factorRef.current;
    foldRefs.current.forEach((m, i) => {
      if (!m) return;
      // The stack settles and lifts very slightly, like it has just been
      // straightened. Any faster and denim looks like it is floating.
      m.position.y = 0.72 + i * 0.17 + Math.sin(t * 0.7 + i * 0.5) * 0.012 * f;
      m.rotation.y = Math.sin(t * 0.3 + i) * 0.03;
    });
  });

  const COUNT = isTouch ? 4 : 6;
  const washes = ['#3f5570', '#54708c', '#2f4258', '#6b86a0', '#455f7a', '#7d94ab'];

  return (
    <group>
      <Plinth radius={1.05} height={0.6} color={P.structure.light} accent={accentColor} />

      {Array.from({ length: COUNT }).map((_, i) => (
        <group key={i} ref={(g) => { foldRefs.current[i] = g; }} position={[0, 0.72 + i * 0.17, 0]}>
          <mesh>
            <boxGeometry args={[1.0 - i * 0.03, 0.14, 0.66 - i * 0.02]} />
            <meshStandardMaterial color={washes[i % washes.length]} metalness={0.02} roughness={0.95} />
          </mesh>
          {/* The fold line down the middle of each pair. */}
          <mesh position={[0, 0.072, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.9 - i * 0.03, 0.014]} />
            <meshStandardMaterial color={P.structure.deep} metalness={0.1} roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* A single pair hung beside the stack, so the district shows the shape
          as well as the pile. */}
      <mesh position={[0.95, 1.15, 0]} rotation={[0, 0, 0.08]}>
        <cylinderGeometry args={[0.16, 0.11, 1.1, 8]} />
        <meshStandardMaterial color={washes[0]} metalness={0.02} roughness={0.95} />
      </mesh>
    </group>
  );
}

/**
 * FOOTWEAR — one pair, turning on a lit plinth.
 *
 * A shoe is the one clothing object that survives being built from primitives
 * at this scale, so this district gets to be literal where the others imply.
 */
export function FootwearGeometry({ factorRef, accentColor, P }) {
  const turntableRef = useRef(null);
  const glowRef = useRef(null);

  useFrame(({ clock }, delta) => {
    const f = factorRef.current;
    if (turntableRef.current) turntableRef.current.rotation.y += delta * 0.35;
    if (glowRef.current) {
      glowRef.current.material.opacity = 0.18 + Math.sin(clock.elapsedTime * 1.2) * 0.05 + f * 0.2;
    }
  });

  const Shoe = ({ z, colour }) => (
    <group position={[0, 0, z]} rotation={[0, 0.22, 0]}>
      {/* Sole */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.62, 0.08, 0.24]} />
        <meshStandardMaterial color={P.structure.light} metalness={0.05} roughness={0.75} />
      </mesh>
      {/* Upper — tapering toward the toe */}
      <mesh position={[-0.06, 0.15, 0]}>
        <boxGeometry args={[0.44, 0.14, 0.22]} />
        <meshStandardMaterial color={colour} metalness={0.08} roughness={0.6} />
      </mesh>
      {/* Heel counter */}
      <mesh position={[0.22, 0.19, 0]}>
        <boxGeometry args={[0.16, 0.22, 0.21]} />
        <meshStandardMaterial color={colour} metalness={0.08} roughness={0.6} />
      </mesh>
      {/* Toe cap */}
      <mesh position={[-0.28, 0.12, 0]} rotation={[0, 0, 0.12]}>
        <sphereGeometry args={[0.115, 10, 8]} />
        <meshStandardMaterial color={accentColor} metalness={0.1} roughness={0.55} />
      </mesh>
    </group>
  );

  return (
    <group>
      <Plinth radius={1.0} height={0.7} color={P.structure.light} accent={accentColor} />

      <group ref={turntableRef} position={[0, 0.78, 0]}>
        <mesh position={[0, -0.03, 0]}>
          <cylinderGeometry args={[0.72, 0.72, 0.06, 24]} />
          <meshStandardMaterial color={P.structure.edge} metalness={0.35} roughness={0.4} />
        </mesh>
        <Shoe z={-0.2} colour="#7c4a35" />
        <Shoe z={0.22} colour="#7c4a35" />
      </group>

      {/* Light cone over the plinth — the museum-case treatment the district
          description promises. */}
      <mesh ref={glowRef} position={[0, 1.6, 0]}>
        <coneGeometry args={[0.78, 1.5, 20, 1, true]} />
        <meshBasicMaterial
          color={accentColor}
          transparent
          opacity={0.2}
          toneMapped={false}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/**
 * THE CARRY — bags on hooks, each with its own swing.
 */
export function BagsGeometry({ factorRef, accentColor, P, isTouch = false }) {
  const bagRefs = useRef([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const f = factorRef.current;
    bagRefs.current.forEach((g, i) => {
      if (!g) return;
      g.rotation.z = Math.sin(t * 1.0 + i * 1.7) * 0.1 * f;
    });
  });

  const COUNT = isTouch ? 2 : 3;
  const leathers = ['#8a5638', '#5f7268', '#a06a41'];

  return (
    <group>
      <Plinth radius={1.05} height={0.55} color={P.structure.light} accent={accentColor} />

      {/* Back panel the hooks are set into */}
      <mesh position={[0, 1.5, -0.32]}>
        <boxGeometry args={[1.9, 1.7, 0.08]} />
        <meshStandardMaterial color={P.structure.edge} metalness={0.1} roughness={0.85} />
      </mesh>

      {Array.from({ length: COUNT }).map((_, i) => {
        const x = (i - (COUNT - 1) / 2) * 0.62;
        const drop = 0.5 + (i % 2) * 0.12;
        return (
          <group key={i} position={[x, 2.1, -0.22]}>
            {/* Hook */}
            <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.05, 0.014, 6, 12, Math.PI]} />
              <meshStandardMaterial color={P.structure.deep} metalness={0.85} roughness={0.2} />
            </mesh>
            <group ref={(g) => { bagRefs.current[i] = g; }}>
              {/* Strap */}
              <mesh position={[0, -0.2, 0]}>
                <torusGeometry args={[0.19, 0.018, 6, 14, Math.PI]} />
                <meshStandardMaterial color={leathers[i % leathers.length]} metalness={0.05} roughness={0.8} />
              </mesh>
              {/* Body */}
              <mesh position={[0, -0.22 - drop / 2, 0]}>
                <boxGeometry args={[0.46, drop, 0.2]} />
                <meshStandardMaterial color={leathers[i % leathers.length]} metalness={0.06} roughness={0.72} />
              </mesh>
              {/* Clasp — the one bit of hardware, and what stops the bag
                  reading as a cardboard box. */}
              <mesh position={[0, -0.24 - drop * 0.35, 0.105]}>
                <boxGeometry args={[0.1, 0.07, 0.03]} />
                <meshStandardMaterial color={accentColor} metalness={0.8} roughness={0.25} />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
}

/**
 * THE RUNWAY — the centre of the world.
 *
 * A lit walk with a form standing at the end of it. The strip lights run
 * away from the viewer on a loop, which is the cue that says "this is a
 * runway" long before you can make out the form at the top.
 */
export function RunwayGeometry({ factorRef, accentColor, P, isTouch = false }) {
  const stripRefs = useRef([]);
  const formRef = useRef(null);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const f = factorRef.current;
    stripRefs.current.forEach((m, i) => {
      if (!m) return;
      const phase = (t * 0.55 - i / stripRefs.current.length) % 1;
      // Same as the mirror's bulbs: the ref is on the material.
      m.opacity = (0.12 + Math.max(0, 1 - phase * 4) * 0.55) * f;
    });
    if (formRef.current) formRef.current.rotation.y += delta * 0.22;
  });

  const STRIPS = isTouch ? 6 : 10;

  return (
    <group>
      {/* The walk */}
      <mesh position={[0, 0.14, 0]}>
        <boxGeometry args={[1.6, 0.28, 5.2]} />
        <meshStandardMaterial color={P.structure.light} metalness={0.06} roughness={0.78} />
      </mesh>

      {Array.from({ length: STRIPS }).map((_, i) => (
        <mesh
          key={i}
          position={[0, 0.29, -2.3 + (i / (STRIPS - 1)) * 4.6]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[1.42, 0.08]} />
          <meshBasicMaterial
            ref={(m) => { stripRefs.current[i] = m; }}
            color={accentColor}
            transparent
            opacity={0.2}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* Dress form at the head of the walk */}
      <group ref={formRef} position={[0, 0.28, -2.0]}>
        <mesh position={[0, 0.16, 0]}>
          <cylinderGeometry args={[0.42, 0.5, 0.12, 20]} />
          <meshStandardMaterial color={P.structure.edge} metalness={0.3} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 1.2, 8]} />
          <meshStandardMaterial color={P.structure.deep} metalness={0.75} roughness={0.25} />
        </mesh>
        {/* Torso: two tapers meeting at the waist is the whole shape of a
            tailor's dummy, and reads from any angle. */}
        <mesh position={[0, 1.62, 0]}>
          <cylinderGeometry args={[0.34, 0.24, 0.62, 12]} />
          <meshStandardMaterial color="#cbb59a" metalness={0.04} roughness={0.88} />
        </mesh>
        <mesh position={[0, 2.12, 0]}>
          <cylinderGeometry args={[0.2, 0.34, 0.42, 12]} />
          <meshStandardMaterial color="#cbb59a" metalness={0.04} roughness={0.88} />
        </mesh>
        {/* A sash in the world's accent, so the form is not a beige blob. */}
        <mesh position={[0, 1.72, 0]} rotation={[0, 0, 0.35]}>
          <torusGeometry args={[0.33, 0.035, 6, 18]} />
          <meshStandardMaterial color={accentColor} metalness={0.1} roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
}
