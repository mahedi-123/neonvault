import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MathUtils, Vector3 } from 'three';
import {
  ENTRY_POSE,
  FOLLOW,
  MOBILE_ENTRY_POSE,
  MOBILE_FOLLOW,
  WORLD_PORTAL,
  getZoneById,
} from '../zoneConfig';
import { cameraRig, player, pointerState } from '../state/playerStore';
import { getWorldState } from '../state/worldStore';
import { arrive, beginIntro, getSnapshot, settleOverview } from '../state/vaultStore';

/** How long after a drag the rig leaves the player's chosen bearing alone. */
const DRAG_GRACE_MS = 2500;

/** How long the establishing shot holds before the guide takes over. */
const ENTRY_HOLD_MS = 1900;

const desiredEye = new Vector3();
const desiredLook = new Vector3();
const lookAt = new Vector3();

/**
 * Owns the camera. Two behaviours, chosen by store mode:
 *
 *  • follow  — third-person rig riding behind the courier at a fixed
 *              distance/height, yaw auto-following their heading and
 *              overridable by drag (see useVaultPointer, which owns every
 *              pointer listener in the vault). Used for 'entering', 'intro',
 *              'overview' and 'returning'.
 *  • focus   — parks on a zone's authored focusPose. Used for 'diving'
 *              and 'zone'.
 *
 * Both are the same damped move toward a target pose, so switching between
 * them is continuous — there is never a cut. Arrival is detected by distance
 * rather than a timer, which is what promotes 'diving' → 'zone' (panel opens)
 * and 'returning' → 'overview' (walking resumes).
 */
const CameraRig = ({ isTouch }) => {
  const { camera } = useThree();
  const follow = isTouch ? MOBILE_FOLLOW : FOLLOW;
  const entryPose = isTouch ? MOBILE_ENTRY_POSE : ENTRY_POSE;
  const lookRef = useRef(new Vector3(...entryPose.target));
  const settledRef = useRef(false);
  const lastModeRef = useRef('entering');
  const followingRef = useRef(false);

  // Establishing shot: hold the wide pose, then hand over to the guide. The
  // glide itself is just the normal damping toward the follow pose, which
  // starts the moment the mode leaves 'entering'.
  useEffect(() => {
    camera.position.set(...entryPose.eye);
    lookRef.current.set(...entryPose.target);
    camera.lookAt(lookRef.current);
    const t = setTimeout(() => beginIntro(), ENTRY_HOLD_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, delta) => {
    const snap = getSnapshot();
    const dt = Math.min(delta, 0.1);

    // A mode change always re-arms arrival detection. Without this, diving to
    // a zone whose focusPose happens to sit where the camera already is would
    // never fire arrive() — the "settled" edge would have been consumed by
    // the previous mode — and the exhibition panel would never open.
    if (snap.mode !== lastModeRef.current) {
      lastModeRef.current = snap.mode;
      settledRef.current = false;
    }

    /* ---------- auto-follow the courier's heading ----------
       The rig's yaw used to be a fixed compass bearing, only ever changed by
       dragging. That was liveable on a small floor where everything was
       north of you; across a 31-unit disc it means walking west while the
       camera keeps staring north, and the district you are walking to sits
       off the side of the screen the whole way.

       So the yaw eases to sit behind whichever way the courier faces —
       including while they turn on the spot to face an exhibit. Dragging
       still wins: the follow is suspended for a beat afterwards, or a
       deliberate look-around would be yanked back by the next step. */
    if (snap.mode !== 'overview') {
      followingRef.current = false;
    } else {
      // Latched rather than sampled per frame. The courier turns faster than
      // the rig does, so gating on "is the player turning right now" left the
      // camera stranded mid-swing the instant they settled — which is exactly
      // the arrival case this exists to fix. Once armed, the follow runs to
      // completion and disarms itself when it gets there.
      if (player.moving || player.autoFacing) followingRef.current = true;

      const sinceDrag = performance.now() - pointerState.lastDragAt;
      if (followingRef.current && sinceDrag > DRAG_GRACE_MS) {
        // The camera sits BEHIND the courier, so its bearing is their
        // heading turned half a circle.
        const desired = player.heading + Math.PI;
        let diff = (desired - cameraRig.yaw) % (Math.PI * 2);
        if (diff > Math.PI) diff -= Math.PI * 2;
        if (diff < -Math.PI) diff += Math.PI * 2;

        if (Math.abs(diff) < 0.012 && !player.moving && !player.autoFacing) {
          followingRef.current = false;
        } else {
          // Deliberately unhurried — a rig that snaps behind every small
          // course correction is nauseating to walk with.
          cameraRig.yaw += diff * Math.min(1, dt * 2.2);
        }
      }
    }

    const focusing = snap.mode === 'diving' || snap.mode === 'zone';
    const zone = focusing && snap.activeZoneId ? getZoneById(snap.activeZoneId) : null;

    if (zone) {
      desiredEye.set(...zone.focusPose.eye);
      desiredLook.set(...zone.focusPose.target);
    } else {
      // Follow pose: behind the courier along the rig's yaw, raised, aimed at
      // roughly chest height so they sit low in frame with the world above.
      const yaw = cameraRig.yaw;
      // Right-hand perpendicular of the rig's forward direction. Eye and look
      // target both shift along it by the same amount, which slides the
      // courier off-centre while leaving what is ahead of them nearly
      // centred — perspective means the further object moves less on screen.
      const rightX = Math.cos(yaw);
      const rightZ = -Math.sin(yaw);
      const shoulder = follow.shoulder ?? 0;

      desiredEye.set(
        player.position.x + Math.sin(yaw) * follow.distance + rightX * shoulder,
        follow.height,
        player.position.z + Math.cos(yaw) * follow.distance + rightZ * shoulder
      );
      desiredLook.set(
        player.position.x + rightX * shoulder,
        follow.lookHeight,
        player.position.z + rightZ * shoulder
      );
    }

    // 'entering' holds the wide establishing pose; everything else eases.
    if (snap.mode === 'entering') {
      camera.lookAt(lookRef.current);
      settledRef.current = false;
      return;
    }

    // Slower on a dive (it should read as a deliberate move onto the
    // exhibit), quicker on the follow rig (it should feel attached).
    const lambda = focusing ? 2.6 : 3.4;
    camera.position.x = MathUtils.damp(camera.position.x, desiredEye.x, lambda, dt);
    camera.position.y = MathUtils.damp(camera.position.y, desiredEye.y, lambda, dt);
    camera.position.z = MathUtils.damp(camera.position.z, desiredEye.z, lambda, dt);

    lookRef.current.x = MathUtils.damp(lookRef.current.x, desiredLook.x, lambda, dt);
    lookRef.current.y = MathUtils.damp(lookRef.current.y, desiredLook.y, lambda, dt);
    lookRef.current.z = MathUtils.damp(lookRef.current.z, desiredLook.z, lambda, dt);

    /* ---------- teleport push ----------
       While the gate is charging, the camera drifts toward it and turns to
       look through it. Applied AFTER the normal damping rather than by
       changing the target pose, so none of the follow rig's own arrival
       logic can see it — travel only ever starts from 'overview', where that
       logic is idle anyway, and layering it this way means a cancelled
       teleport just stops pushing rather than leaving the rig somewhere it
       has to unwind from. */
    const travel = getWorldState().travel;
    if (travel === 'charging' || travel === 'flash') {
      const gate = WORLD_PORTAL.position;
      const pull = Math.min(1, dt * 1.8);
      camera.position.x += (gate[0] - camera.position.x) * pull * 0.5;
      camera.position.y += (2.6 - camera.position.y) * pull * 0.5;
      camera.position.z += (gate[2] - camera.position.z) * pull * 0.5;
      lookRef.current.x += (gate[0] - lookRef.current.x) * pull;
      lookRef.current.y += (2.6 - lookRef.current.y) * pull;
      lookRef.current.z += (gate[2] - lookRef.current.z) * pull;
    }

    lookAt.copy(lookRef.current);
    camera.lookAt(lookAt);

    // Arrival: within a short distance of the target pose AND aimed at it.
    const settled =
      camera.position.distanceTo(desiredEye) < 0.45 &&
      lookRef.current.distanceTo(desiredLook) < 0.45;

    if (settled && !settledRef.current) {
      settledRef.current = true;
      if (snap.mode === 'diving') arrive();
      else if (snap.mode === 'returning') settleOverview();
    } else if (!settled) {
      settledRef.current = false;
    }
  });

  return null;
};

export default CameraRig;
