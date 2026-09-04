import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, MathUtils, Vector3 } from 'three';
import { PALETTE, WORLD_PORTAL, zones } from '../zoneConfig';
import { PLAYER_SPEED, cameraRig, keys, markMoved, player, resolvePosition, steer } from '../state/playerStore';
import { getSnapshot, setNearPortal, setNearZone } from '../state/vaultStore';


/** Below this distance from the walk target the courier is considered arrived. */
const ARRIVE_EPSILON = 0.12;
/** Multiplier while a run key is held, and the ceiling for an analog pull. */
const RUN_MULTIPLIER = 2.0;
/**
 * Analog steering speed, as a multiple of PLAYER_SPEED.
 *
 * A pointer held a few pixels from where it went down is somebody nudging
 * themselves into position, and should amble; one dragged the full pad radius
 * is somebody crossing the floor, and should run. Below the dead zone nothing
 * moves at all, or the courier would creep whenever a hand rested still.
 */
const STEER_DEADZONE = 0.14;
const STEER_MIN_PACE = 0.34;
/** Seconds a dropped footfall ring takes to expand and fade out. */
const FOOTPRINT_LIFE = 1.1;

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
 * Picks the district the player is standing in.
 *
 * "Nearest" is measured as a fraction of each district's own trigger radius
 * rather than in raw units, so the one whose territory you are deepest
 * inside wins — which is what a player reads as "the one I'm standing at".
 * On the two-ring layout no two radii overlap (scripts/check-zones.mjs
 * asserts it), so today this only ever finds one candidate; the normalised
 * comparison is what keeps it correct if districts are ever packed closer.
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
  // The courier is dressed by the world they are standing in — a near-black
  // suit with cyan trim reads as a silhouette cut out of a porcelain floor.
  const VIOLET = PALETTE.courier.cloak;
  const CYAN = PALETTE.courier.visor;
  const groupRef = useRef(null);
  const bodyRef = useRef(null);
  const legLeftRef = useRef(null);
  const legRightRef = useRef(null);
  const armLeftRef = useRef(null);
  const armRightRef = useRef(null);
  const ringMatRef = useRef(null);
  const headRef = useRef(null);
  const visorMatRef = useRef(null);
  const thrusterMatRefs = useRef([]);
  const footRefs = useRef([]);
  const footMatRefs = useRef([]);
  const phase = useRef(0);
  const strideRef = useRef(0);
  const leanRef = useRef(0);
  const paceRef = useRef(1);
  const idleClock = useRef(Math.random() * 20);
  /** Sign of the leg swing last frame — a zero crossing is a foot landing. */
  const lastSwingSign = useRef(1);
  /** Round-robin index into the footprint pool. */
  const footCursor = useRef(0);
  /** Age of each pooled footprint, in seconds. Infinity = free. */
  const footAge = useRef([Infinity, Infinity, Infinity, Infinity]);

  // Material props hoisted so the limb pairs stay identical by construction —
  // a left leg that drifts a shade off the right one is the kind of thing you
  // only notice once it is shipped.
  const materials = useMemo(
    () => ({
      shell: { color: PALETTE.courier.shell, metalness: 0.45, roughness: 0.42 },
      trim: { color: PALETTE.courier.trim, metalness: 0.5, roughness: 0.35 },
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
    } else if (canWalk && steer.active && steer.magnitude > STEER_DEADZONE) {
      /* ---------- analog steering (held pointer / finger) ----------
         The direction was already resolved against the camera when the hand
         last moved (useVaultPointer), so all that is left here is the speed —
         which, unlike the keyboard's on/off, is a real range taken from how
         far the pointer has been pulled. */
      scratchDir.set(steer.worldX, 0, steer.worldZ);

      const length = scratchDir.length();
      if (length > 0.0001) {
        scratchDir.divideScalar(length);
        const pull = (steer.magnitude - STEER_DEADZONE) / (1 - STEER_DEADZONE);
        stridePace = STEER_MIN_PACE + pull * (RUN_MULTIPLIER - STEER_MIN_PACE);
        player.position.addScaledVector(scratchDir, PLAYER_SPEED * stridePace * dt);

        const [cx, cz] = resolvePosition(player.position.x, player.position.z);
        player.position.x = cx;
        player.position.z = cz;

        // Turn rate scales with pace: a slow steer should read as picking
        // your way around, a fast one as leaning into the turn.
        const desired = Math.atan2(scratchDir.x, scratchDir.z);
        player.heading += shortestAngle(player.heading, desired) * Math.min(1, dt * (7 + stridePace * 3));
        moving = true;
        markMoved();
      }

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

    /* ---------- face the exhibit on arrival ----------
       Approach marks sit on the side of a district facing the middle of the
       world, so you reach one walking in whatever direction the trip
       happened to end in — frequently sideways to the thing you came to
       see. Standing still inside a district therefore turns the courier to
       look at it, and the camera swings round with them (see CameraRig). */
    player.autoFacing = false;
    if (canWalk && !moving && snap.nearZoneId) {
      const zone = zones.find((z) => z.id === snap.nearZoneId);
      if (zone) {
        const dx = zone.position[0] - player.position.x;
        const dz = zone.position[2] - player.position.z;
        if (Math.hypot(dx, dz) > 0.2) {
          const diff = shortestAngle(player.heading, Math.atan2(dx, dz));
          if (Math.abs(diff) > 0.02) {
            player.heading += diff * Math.min(1, dt * 5);
            player.autoFacing = true;
          }
        }
      }
    }

    group.position.copy(player.position);
    group.rotation.y = player.heading;

    /* ---------- walk cycle ---------- */
    // strideRef ramps the animation amplitude rather than the pose itself, so
    // starting and stopping blends instead of popping mid-step.
    strideRef.current = MathUtils.damp(strideRef.current, moving ? 1 : 0, 7, dt);
    // Running steps faster as well as covering more ground — a sprint on the
    // same leg cadence reads as sliding.
    if (moving) phase.current += dt * 8.5 * stridePace;

    // Pace is damped rather than read raw: letting go of the run key used to
    // drop the lean and the stride length in a single frame, which read as a
    // stumble.
    paceRef.current = MathUtils.damp(paceRef.current, moving ? stridePace : 1, 6, dt);
    const pace = paceRef.current;

    const swingAmount = 0.62 * (0.85 + (pace - 1) * 0.5);
    const swing = Math.sin(phase.current) * swingAmount * strideRef.current;
    if (legLeftRef.current) legLeftRef.current.rotation.x = swing;
    if (legRightRef.current) legRightRef.current.rotation.x = -swing;
    if (armLeftRef.current) armLeftRef.current.rotation.x = -swing * 0.78;
    if (armRightRef.current) armRightRef.current.rotation.x = swing * 0.78;

    idleClock.current += dt;
    const idle = 1 - strideRef.current;

    if (bodyRef.current) {
      // A two-beat bob (legs are a one-beat cycle) plus a slow idle breath.
      const bob = Math.abs(Math.sin(phase.current)) * 0.075 * strideRef.current;
      const breathe = Math.sin(idleClock.current * 1.1) * 0.022 * idle;
      bodyRef.current.position.y = 0.92 + bob + breathe;
      bodyRef.current.rotation.z =
        Math.sin(phase.current) * 0.035 * strideRef.current +
        // Idle weight shift: the hips settle onto one leg, then the other, on
        // a much slower cycle than the walk. Standing perfectly still is the
        // single thing that most makes a figure read as a prop.
        Math.sin(idleClock.current * 0.42) * 0.045 * idle;

      // Forward lean scaled by pace — a runner leads with the chest.
      const targetLean = strideRef.current * (0.06 + (pace - 1) * 0.16);
      leanRef.current = MathUtils.damp(leanRef.current, targetLean, 5, dt);
      bodyRef.current.rotation.x = leanRef.current;
    }

    if (headRef.current) {
      // Walking: the head counter-rotates slightly against the stride, which
      // is what keeps the gaze steady instead of bobbing with the shoulders.
      // Idle: a slow look around the room on an unhurried, off-beat cycle.
      const scan = Math.sin(idleClock.current * 0.33) * 0.5 + Math.sin(idleClock.current * 0.17 + 2) * 0.3;
      headRef.current.rotation.y = scan * 0.55 * idle - swing * 0.12;
      headRef.current.rotation.x = -leanRef.current * 0.7 + Math.sin(idleClock.current * 0.29) * 0.06 * idle;
    }

    if (visorMatRef.current) {
      // Slow breathing glow with an occasional quick double-blink, so the
      // visor reads as something switched on and paying attention.
      const base = 0.72 + Math.sin(idleClock.current * 1.6) * 0.12;
      const cycle = idleClock.current % 6;
      const blink = cycle < 0.09 || (cycle > 0.2 && cycle < 0.29) ? 0.25 : 1;
      visorMatRef.current.opacity = base * blink;
    }

    // Heel thrusters flare with pace — idle they are barely lit.
    thrusterMatRefs.current.forEach((m, i) => {
      if (!m) return;
      const legSwing = i === 0 ? swing : -swing;
      // Brightest as that leg drives backward, i.e. mid-push-off.
      const push = Math.max(0, -legSwing / swingAmount);
      m.opacity = 0.12 + strideRef.current * (0.2 + push * 0.55) * pace;
    });

    if (ringMatRef.current) {
      ringMatRef.current.opacity = 0.22 + strideRef.current * 0.28;
    }

    /* ---------- footfall pulses ----------
       A ring dropped where each foot lands, left behind in WORLD space while
       the courier walks on. It is the cheapest possible way to make the floor
       feel touched rather than hovered over, and it doubles as a trail
       showing where you have just been. */
    const swingSign = Math.sin(phase.current) >= 0 ? 1 : -1;
    if (moving && swingSign !== lastSwingSign.current) {
      const i = footCursor.current;
      const ring = footRefs.current[i];
      if (ring) {
        // Offset to the foot that just planted, in the courier's own frame.
        const side = swingSign > 0 ? 0.19 : -0.19;
        const cos = Math.cos(player.heading);
        const sin = Math.sin(player.heading);
        ring.position.set(
          player.position.x + cos * side,
          0.04,
          player.position.z - sin * side
        );
        footAge.current[i] = 0;
      }
      footCursor.current = (i + 1) % footRefs.current.length;
    }
    lastSwingSign.current = swingSign;

    for (let i = 0; i < footAge.current.length; i += 1) {
      const age = footAge.current[i];
      if (age === Infinity) continue;
      const next = age + dt;
      footAge.current[i] = next > FOOTPRINT_LIFE ? Infinity : next;
      const ring = footRefs.current[i];
      const mat = footMatRefs.current[i];
      const t01 = Math.min(1, next / FOOTPRINT_LIFE);
      if (ring) ring.scale.setScalar(0.35 + t01 * 1.15);
      if (mat) mat.opacity = (1 - t01) * 0.5;
    }

    /* ---------- proximity: offer the exhibit, don't take it ----------
       This only publishes which zone the courier is standing in. Turning
       that into an open exhibit is the player's call — EnterPrompt renders
       the offer and approachZone() runs on their confirmation. */
    if (!canWalk) {
      setNearZone(null);
      setNearPortal(false);
      return;
    }

    // The gate gets a generous radius. It is one object on a wide apron with
    // nothing else near it, and having to find an exact spot to stand on to
    // leave a world would be a puzzle nobody asked for.
    const pdx = player.position.x - WORLD_PORTAL.position[0];
    const pdz = player.position.z - WORLD_PORTAL.position[2];
    setNearPortal(Math.hypot(pdx, pdz) < 4.6);

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
    <>
      {/* Footfall pulses. Deliberately OUTSIDE the courier's group: a ring is
          dropped at a world position and stays there while they walk on, so
          it marks the floor rather than following the feet. Four is enough —
          at walking cadence the oldest has faded before it is reused. */}
      <group>
        {[0, 1, 2, 3].map((i) => (
          <mesh
            key={i}
            ref={(m) => { footRefs.current[i] = m; }}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -100, 0]}
          >
            <ringGeometry args={[0.16, 0.24, 20]} />
            <meshBasicMaterial
              ref={(m) => { footMatRefs.current[i] = m; }}
              color={CYAN}
              transparent
              opacity={0}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

    {/* Slightly over life-size. At the follow camera's distance a strictly
        proportioned figure reads as a detail of the floor rather than as the
        thing you are steering. */}
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
        {/* Heel jet — flares on push-off and burns brighter at a run. */}
        <mesh position={[0, -0.72, -0.12]}>
          <planeGeometry args={[0.16, 0.1]} />
          <meshBasicMaterial
            ref={(m) => { thrusterMatRefs.current[0] = m; }}
            color={CYAN}
            transparent
            opacity={0.12}
            toneMapped={false}
            side={DoubleSide}
          />
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
        <mesh position={[0, -0.72, -0.12]}>
          <planeGeometry args={[0.16, 0.1]} />
          <meshBasicMaterial
            ref={(m) => { thrusterMatRefs.current[1] = m; }}
            color={CYAN}
            transparent
            opacity={0.12}
            toneMapped={false}
            side={DoubleSide}
          />
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

        {/* Head + visor, on their own pivot so the courier can look around
            while idle and hold their gaze steady while walking. */}
        <group ref={headRef} position={[0, 0.62, 0]}>
          <mesh>
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
          <mesh position={[0, 0.01, 0.201]}>
            <boxGeometry args={[0.33, 0.14, 0.02]} />
            <meshBasicMaterial
              ref={visorMatRef}
              color={CYAN}
              transparent
              opacity={0.85}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0.201, 0.01, 0]}>
            <boxGeometry args={[0.02, 0.14, 0.2]} />
            <meshBasicMaterial color={CYAN} transparent opacity={0.7} toneMapped={false} />
          </mesh>
          <mesh position={[-0.201, 0.01, 0]}>
            <boxGeometry args={[0.02, 0.14, 0.2]} />
            <meshBasicMaterial color={CYAN} transparent opacity={0.7} toneMapped={false} />
          </mesh>
          {/* Crest — a sliver of violet so the silhouette is not a plain block */}
          <mesh position={[0, 0.21, -0.02]}>
            <boxGeometry args={[0.1, 0.08, 0.3]} />
            <meshBasicMaterial color={VIOLET} toneMapped={false} />
          </mesh>
        </group>
      </group>

      {/* Rim light riding behind the courier, so their silhouette separates
          from whatever dark geometry is behind them. Skipped on touch, where
          the light budget is better spent elsewhere. */}
      {!isTouch && (
        <pointLight position={[0, 1.9, -1.1]} color={VIOLET} intensity={1.1} distance={5} decay={2} />
      )}
    </group>
    </>
  );
};

export default Player;
