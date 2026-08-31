import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MathUtils, Vector3 } from 'three';
import {
  ENTRY_POSE,
  FOLLOW,
  MOBILE_ENTRY_POSE,
  MOBILE_FOLLOW,
  getZoneById,
} from '../zoneConfig';
import { cameraRig, player, pointerState } from '../state/playerStore';
import { arrive, beginIntro, getSnapshot, settleOverview } from '../state/vaultStore';

/** Pixels of pointer travel before a press counts as a camera drag rather
 *  than a tap. Below this, WalkGround gets the click and the player walks. */
const DRAG_THRESHOLD = 7;
const YAW_PER_PIXEL = 0.006;

/** How long the establishing shot holds before the guide takes over. */
const ENTRY_HOLD_MS = 1900;

const desiredEye = new Vector3();
const desiredLook = new Vector3();
const lookAt = new Vector3();

/**
 * Owns the camera. Two behaviours, chosen by store mode:
 *
 *  • follow  — third-person rig riding behind the courier at a fixed
 *              distance/height, yaw controlled by pointer drag. Used for
 *              'entering', 'intro', 'overview' and 'returning'.
 *  • focus   — parks on a zone's authored focusPose. Used for 'diving'
 *              and 'zone'.
 *
 * Both are the same damped move toward a target pose, so switching between
 * them is continuous — there is never a cut. Arrival is detected by distance
 * rather than a timer, which is what promotes 'diving' → 'zone' (panel opens)
 * and 'returning' → 'overview' (walking resumes).
 */
const CameraRig = ({ isTouch }) => {
  const { camera, gl } = useThree();
  const follow = isTouch ? MOBILE_FOLLOW : FOLLOW;
  const entryPose = isTouch ? MOBILE_ENTRY_POSE : ENTRY_POSE;
  const lookRef = useRef(new Vector3(...entryPose.target));
  const settledRef = useRef(false);
  const lastModeRef = useRef('entering');

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

  // Pointer drag orbits the rig's yaw. Registered on the canvas element
  // rather than through R3F events so it keeps tracking once the pointer
  // leaves whatever mesh the press started on.
  useEffect(() => {
    const el = gl.domElement;
    let down = false;
    let lastX = 0;
    let startX = 0;
    let startY = 0;

    const onDown = (e) => {
      down = true;
      lastX = e.clientX;
      startX = e.clientX;
      startY = e.clientY;
      pointerState.dragged = false;
    };

    const onMove = (e) => {
      if (!down) return;
      if (!pointerState.dragged) {
        if (Math.hypot(e.clientX - startX, e.clientY - startY) < DRAG_THRESHOLD) return;
        pointerState.dragged = true;
      }
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      const mode = getSnapshot().mode;
      if (mode === 'overview' || mode === 'intro') {
        cameraRig.yaw -= dx * YAW_PER_PIXEL;
      }
    };

    const onUp = () => {
      down = false;
      // Cleared on the NEXT press, not here: WalkGround's click handler runs
      // after pointerup and needs to still see that this was a drag.
    };

    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [gl]);

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

    const focusing = snap.mode === 'diving' || snap.mode === 'zone';
    const zone = focusing && snap.activeZoneId ? getZoneById(snap.activeZoneId) : null;

    if (zone) {
      desiredEye.set(...zone.focusPose.eye);
      desiredLook.set(...zone.focusPose.target);
    } else {
      // Follow pose: behind the courier along the rig's yaw, raised, aimed at
      // roughly chest height so they sit low in frame with the world above.
      const yaw = cameraRig.yaw;
      desiredEye.set(
        player.position.x + Math.sin(yaw) * follow.distance,
        follow.height,
        player.position.z + Math.cos(yaw) * follow.distance
      );
      desiredLook.set(
        player.position.x,
        follow.lookHeight,
        player.position.z
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
