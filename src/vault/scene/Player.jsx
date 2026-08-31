import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, Vector3 } from 'three';
import { zones } from '../zoneConfig';
import { PLAYER_SPEED, cameraRig, keys, markMoved, player, resolvePosition } from '../state/playerStore';
import { getSnapshot, setNearZone } from '../state/vaultStore';

const VIOLET = '#8b5cf6';
const CYAN = '#22d3ee';

/** Below this distance from the walk target the courier is considered arrived. */
const ARRIVE_EPSILON = 0.12;
/** Multiplier while a run key is held. */
const RUN_MULTIPLIER = 1.7;

const scratchDir = new Vector3();

/**
 * Wraps an angle into (-PI, PI]. Damping a heading without this makes the
 * courier spin the long way round whenever a turn crosses the ±PI seam.
 */
function shortestAngle(from, to) {
  let diff = (to - from) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

/**
 * Picks the zone the player is standing in. Zones overlap — CORE's radius
 * reaches into NEW DROPS', COMPUTING LAB's into GAMING's — so "nearest" is
 * measured as a fraction of each zone's own trigger radius rather than in
 * raw units. That makes the zone whose territory you are deepest inside win,
 * which is what a player reads as "the one I'm standing at".
 */
function findZoneUnderPlayer(x, z) {
  let best = null;
  let bestScore = Infinity;
  for (const zone of zones) {
    const dist = Math.hypot(x - zone.position[0], z - zone.position[2]);
    const score = dist / zone.triggerRadius;
    if (score <= 1 && score < bestScore) {
      bestScore = score;
      best = zone;
    }
  }
  return best;
}

/**
 * The courier: a low-poly figure the player steers around the floor, either
 * by tapping where they want to go or with WASD. Everything about them is
 * primitive geometry with emissive neon trim — no model to download, no rig
 * to load, and it stays legible at the distance the follow camera sits at.
 *
 * This component also owns the two pieces of world logic that depend on
 * where the player is: locomotion (both input schemes, plus collision
 * against the exhibit platforms), and the proximity test that publishes
 * which zone they are standing in for the enter prompt to offer.
 */
const Player = ({ isTouch = false }) => {
  const groupRef = useRef(null);
  const bodyRef = useRef(null);
  const legLeftRef = useRef(null);
  const legRightRef = useRef(null);
  const armLeftRef = useRef(null);
  const armRightRef = useRef(null);
  const ringMatRef = useRef(null);
  const phase = useRef(0);
  const strideRef = useRef(0);

  // Material props hoisted so the limb pairs stay identical by construction —
  // a left leg that drifts a shade off the right one is the kind of thing you
  // only notice once it is shipped.
  const materials = useMemo(
    () => ({
      shell: { color: '#1b1526', metalness: 0.45, roughness: 0.42 },
      trim: { color: '#2c2140', metalness: 0.5, roughness: 0.35 },
    }),
    []
  );

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const snap = getSnapshot();
    const canWalk = snap.mode === 'overview';
    const dt = Math.min(delta, 0.1); // clamp after a tab-switch stall, not per-frame pacing

    /* ---------- locomotion ----------
       Two input schemes feed the same movement. Keyboard wins whenever a
       direction key is held: it is the more immediate of the two, and
       leaving the tapped target live underneath would drag the courier back
       toward it the instant the key came up. */
    let moving = false;
    let stridePace = 1;

    if (canWalk && keys.active) {
      // Camera-relative, the way a third-person game reads: W goes away from
      // the camera whichever way the rig has been dragged, not toward -Z.
      const yaw = cameraRig.yaw;
      const forwardX = -Math.sin(yaw);
      const forwardZ = -Math.cos(yaw);
      // Right-hand perpendicular of forward in the XZ plane.
      const rightX = -forwardZ;
      const rightZ = forwardX;

      const ahead = (keys.forward ? 1 : 0) - (keys.back ? 1 : 0);
      const side = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);

      scratchDir.set(
        forwardX * ahead + rightX * side,
        0,
        forwardZ * ahead + rightZ * side
      );

      const length = scratchDir.length();
      if (length > 0.0001) {
        // Normalising is what stops diagonals being ~1.41x faster than a
        // straight line, the classic keyboard-movement bug.
        scratchDir.divideScalar(length);
        stridePace = keys.run ? RUN_MULTIPLIER : 1;
        const step = PLAYER_SPEED * stridePace * dt;
        player.position.addScaledVector(scratchDir, step);

        const [cx, cz] = resolvePosition(player.position.x, player.position.z);
        player.position.x = cx;
        player.position.z = cz;

        const desired = Math.atan2(scratchDir.x, scratchDir.z);
        player.heading += shortestAngle(player.heading, desired) * Math.min(1, dt * 12);
        moving = true;
        markMoved();
      }

      // Keep the tap target glued to the courier so the destination marker
      // hides and click-walk has nothing stale to resume toward.
      player.target.copy(player.position);
      player.intentZoneId = null;
    } else if (canWalk) {
      scratchDir.copy(player.target).sub(player.position);
      scratchDir.y = 0;
      const dist = scratchDir.length();

      if (dist > ARRIVE_EPSILON) {
        scratchDir.divideScalar(dist); // normalize, reusing the length
        // Ease into the last stride so arrivals settle instead of snapping.
        const speed = PLAYER_SPEED * Math.min(1, 0.35 + dist * 0.6);
        const step = Math.min(dist, speed * dt);
        player.position.addScaledVector(scratchDir, step);

        const [cx, cz] = resolvePosition(player.position.x, player.position.z);
        player.position.x = cx;
        player.position.z = cz;

        const desired = Math.atan2(scratchDir.x, scratchDir.z);
        player.heading += shortestAngle(player.heading, desired) * Math.min(1, dt * 9);
        moving = true;
      } else {
        player.intentZoneId = null;
      }
    }
    player.moving = moving;

    group.position.copy(player.position);
    group.rotation.y = player.heading;

    /* ---------- walk cycle ---------- */
    // strideRef ramps the animation amplitude rather than the pose itself, so
    // starting and stopping blends instead of popping mid-step.
    strideRef.current = MathUtils.damp(strideRef.current, moving ? 1 : 0, 7, dt);
    // Running steps faster as well as covering more ground — a sprint on the
    // same leg cadence reads as sliding.
    if (moving) phase.current += dt * 8.5 * stridePace;

    const swing = Math.sin(phase.current) * 0.62 * strideRef.current;
    if (legLeftRef.current) legLeftRef.current.rotation.x = swing;
    if (legRightRef.current) legRightRef.current.rotation.x = -swing;
    if (armLeftRef.current) armLeftRef.current.rotation.x = -swing * 0.75;
    if (armRightRef.current) armRightRef.current.rotation.x = swing * 0.75;

    if (bodyRef.current) {
      // A two-beat bob (legs are a one-beat cycle) plus a slow idle breath.
      const bob = Math.abs(Math.sin(phase.current)) * 0.075 * strideRef.current;
      const breathe = Math.sin(phase.current * 0.35 + 1.2) * 0.02 * (1 - strideRef.current);
      bodyRef.current.position.y = 0.92 + bob + breathe;
      bodyRef.current.rotation.z = Math.sin(phase.current) * 0.035 * strideRef.current;
    }

    if (ringMatRef.current) {
      ringMatRef.current.opacity = 0.22 + strideRef.current * 0.28;
    }

    /* ---------- proximity: offer the exhibit, don't take it ----------
       This only publishes which zone the courier is standing in. Turning
       that into an open exhibit is the player's call — EnterPrompt renders
       the offer and approachZone() runs on their confirmation. */
    if (!canWalk) {
      setNearZone(null);
      return;
    }

    const near = findZoneUnderPlayer(player.position.x, player.position.z);

    // A walk requested by name only offers its own destination — otherwise
    // crossing the floor to the back of the room would flash a prompt for
    // every exhibit the straight-line path happens to pass through.
    if (near && player.intentZoneId && player.intentZoneId !== near.id) {
      setNearZone(null);
      return;
    }

    setNearZone(near ? near.id : null);
  });

  return (
    // Slightly over life-size. At the follow camera's distance a strictly
    // proportioned figure reads as a detail of the floor rather than as the
    // thing you are steering.
    <group ref={groupRef} scale={1.12}>
      {/* Contact shadow + the courier's own footprint glow. No shadow maps in
          this scene, so without these the figure reads as floating. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.55, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.42} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.6, 0.78, 32]} />
        <meshBasicMaterial
          ref={ringMatRef}
          color={CYAN}
          transparent
          opacity={0.25}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      {/* Legs pivot from the hip, so they rotate at the top of the limb. */}
      <group ref={legLeftRef} position={[-0.17, 0.78, 0]}>
        <mesh position={[0, -0.39, 0]}>
          <capsuleGeometry args={[0.115, 0.5, 3, 8]} />
          <meshStandardMaterial {...materials.trim} />
        </mesh>
        <mesh position={[0, -0.72, 0.06]}>
          <boxGeometry args={[0.24, 0.12, 0.34]} />
          <meshStandardMaterial color="#0d0b13" metalness={0.3} roughness={0.6} />
        </mesh>
      </group>
      <group ref={legRightRef} position={[0.17, 0.78, 0]}>
        <mesh position={[0, -0.39, 0]}>
          <capsuleGeometry args={[0.115, 0.5, 3, 8]} />
          <meshStandardMaterial {...materials.trim} />
        </mesh>
        <mesh position={[0, -0.72, 0.06]}>
          <boxGeometry args={[0.24, 0.12, 0.34]} />
          <meshStandardMaterial color="#0d0b13" metalness={0.3} roughness={0.6} />
        </mesh>
      </group>

      <group ref={bodyRef} position={[0, 0.92, 0]}>
        {/* Torso */}
        <mesh>
          <capsuleGeometry args={[0.31, 0.42, 4, 12]} />
          <meshStandardMaterial
            {...materials.shell}
            emissive={VIOLET}
            emissiveIntensity={0.22}
          />
        </mesh>
        {/* Chest light — the courier carries their own key light, which is
            what keeps them readable against a floor this dark. */}
        <mesh position={[0, 0.06, 0.29]}>
          <circleGeometry args={[0.085, 16]} />
          <meshBasicMaterial color={CYAN} toneMapped={false} />
        </mesh>
        <pointLight position={[0, 0.1, 0.5]} color={CYAN} intensity={0.85} distance={4.5} decay={2} />
        {/* Shoulder yoke */}
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.34, 0.3, 0.11, 12]} />
          <meshStandardMaterial color="#3a2c58" metalness={0.6} roughness={0.3} emissive={VIOLET} emissiveIntensity={0.35} />
        </mesh>

        {/* Arms — pivot at the shoulder */}
        <group ref={armLeftRef} position={[-0.38, 0.24, 0]}>
          <mesh position={[0, -0.28, 0]} rotation={[0, 0, 0.12]}>
            <capsuleGeometry args={[0.085, 0.42, 3, 8]} />
            <meshStandardMaterial {...materials.trim} />
          </mesh>
        </group>
        <group ref={armRightRef} position={[0.38, 0.24, 0]}>
          <mesh position={[0, -0.28, 0]} rotation={[0, 0, -0.12]}>
            <capsuleGeometry args={[0.085, 0.42, 3, 8]} />
            <meshStandardMaterial {...materials.trim} />
          </mesh>
        </group>

        {/* Head + visor */}
        <mesh position={[0, 0.62, 0]}>
          <boxGeometry args={[0.4, 0.38, 0.38]} />
          <meshStandardMaterial
            color="#2a2140"
            metalness={0.5}
            roughness={0.4}
            emissive={VIOLET}
            emissiveIntensity={0.18}
          />
        </mesh>
        {/* Visor wraps the front corners, so the head still reads as a head
            from the three-quarter angles the follow camera actually uses —
            a flat front-facing strip disappeared the moment they turned. */}
        <mesh position={[0, 0.63, 0.201]}>
          <boxGeometry args={[0.33, 0.14, 0.02]} />
          <meshBasicMaterial color={CYAN} toneMapped={false} />
        </mesh>
        <mesh position={[0.201, 0.63, 0]}>
          <boxGeometry args={[0.02, 0.14, 0.2]} />
          <meshBasicMaterial color={CYAN} transparent opacity={0.75} toneMapped={false} />
        </mesh>
        <mesh position={[-0.201, 0.63, 0]}>
          <boxGeometry args={[0.02, 0.14, 0.2]} />
          <meshBasicMaterial color={CYAN} transparent opacity={0.75} toneMapped={false} />
        </mesh>
        {/* Crest — a sliver of violet so the silhouette is not a plain block */}
        <mesh position={[0, 0.83, -0.02]}>
          <boxGeometry args={[0.1, 0.08, 0.3]} />
          <meshBasicMaterial color={VIOLET} toneMapped={false} />
        </mesh>
      </group>

      {/* Rim light riding behind the courier, so their silhouette separates
          from whatever dark geometry is behind them. Skipped on touch, where
          the light budget is better spent elsewhere. */}
      {!isTouch && (
        <pointLight position={[0, 1.9, -1.1]} color={VIOLET} intensity={1.1} distance={5} decay={2} />
      )}
    </group>
  );
};

export default Player;
