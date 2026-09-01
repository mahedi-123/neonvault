import { useEffect } from 'react';
import {
  cameraRig,
  pointerState,
  setSteerActive,
  steer,
} from '../state/playerStore';
import { SCHEME_DRAG, getControls } from '../state/controlStore';
import { getSnapshot } from '../state/vaultStore';

/** Pixels of travel before a press counts as a drag rather than a tap. Below
 *  this, WalkGround gets the click and the player walks to that spot. */
const DRAG_THRESHOLD = 7;
const YAW_PER_PIXEL = 0.006;

/**
 * How far the pointer has to travel from where it went down for the steer to
 * read as "full speed". Scaled off the viewport rather than fixed, so the
 * same gesture spans the same fraction of a phone screen and a desktop
 * window — a 140px pad is a comfortable thumb arc on one and a twitch on the
 * other.
 */
function padRadius() {
  const min = Math.min(window.innerWidth, window.innerHeight);
  return Math.max(64, Math.min(150, min * 0.19));
}

/**
 * All pointer input for the vault, in one place.
 *
 * There is exactly one gesture the two control schemes cannot share — press
 * and drag on the world — so this hook is what decides who gets it:
 *
 *  • 'drag' scheme: the primary pointer steers the courier. A second pointer
 *    (or the right mouse button) orbits the camera, so looking around is
 *    still possible without giving up the stick.
 *  • 'classic' scheme: dragging orbits, exactly as it always did.
 *
 * Listening on window rather than on the canvas element keeps a drag tracking
 * once the pointer leaves whatever it started on; the press itself is only
 * accepted if it landed on the canvas, which is what stops a drag that starts
 * on the exhibition panel or the minimap from also walking the courier.
 */
export function useVaultPointer() {
  useEffect(() => {
    let steerId = null;
    let orbitId = null;
    let radius = 150;
    let startX = 0;
    let startY = 0;
    let lastX = 0;

    const endSteer = () => {
      steerId = null;
      setSteerActive(false);
    };

    const onDown = (e) => {
      if (e.target?.tagName !== 'CANVAS') return;

      const mode = getSnapshot().mode;
      const { scheme } = getControls();
      // No scheme yet means the picker is still up: nothing steers or orbits
      // underneath an open dialog.
      if (!scheme) return;

      const wantsOrbit =
        scheme !== SCHEME_DRAG || e.button === 2 || (steerId !== null && orbitId === null);

      if (wantsOrbit) {
        if (orbitId !== null) return;
        orbitId = e.pointerId;
        lastX = e.clientX;
        startX = e.clientX;
        startY = e.clientY;
        if (steerId === null) pointerState.dragged = false;
        return;
      }

      if (steerId !== null) return;
      if (mode !== 'overview') return;

      steerId = e.pointerId;
      radius = padRadius();
      startX = e.clientX;
      startY = e.clientY;
      steer.originX = e.clientX;
      steer.originY = e.clientY;
      steer.pointX = e.clientX;
      steer.pointY = e.clientY;
      pointerState.dragged = false;
    };

    const onMove = (e) => {
      if (e.pointerId === orbitId) {
        const dx = e.clientX - lastX;
        lastX = e.clientX;
        if (!pointerState.dragged) {
          if (Math.hypot(e.clientX - startX, e.clientY - startY) < DRAG_THRESHOLD) return;
          pointerState.dragged = true;
        }
        pointerState.lastDragAt = performance.now();
        const mode = getSnapshot().mode;
        if (mode === 'overview' || mode === 'intro') cameraRig.yaw -= dx * YAW_PER_PIXEL;
        return;
      }

      if (e.pointerId !== steerId) return;

      const vx = e.clientX - steer.originX;
      const vy = e.clientY - steer.originY;
      const length = Math.hypot(vx, vy);

      if (length < DRAG_THRESHOLD) {
        // Still a tap as far as anyone is concerned. Leaving the pad inactive
        // here is what preserves tap-to-walk under the drag scheme.
        if (steer.active) setSteerActive(false);
        return;
      }

      steer.pointX = e.clientX;
      steer.pointY = e.clientY;
      steer.x = vx / length;
      steer.y = vy / length;
      steer.magnitude = Math.min(1, length / radius);

      /* Resolve the screen pull into a WORLD direction here, once per pointer
         move, rather than every frame in the player.

         The camera swings round to sit behind whichever way the courier
         faces. Re-reading the pull against the live camera each frame
         therefore feeds back on itself: hold the pointer out to the right and
         "right of the camera" keeps rotating with the courier, so they walk a
         circle and never get anywhere. Freezing the direction in world space
         the moment the hand moves means a held pointer walks a straight line,
         and the direction only changes when the player actually changes it. */
      const yaw = cameraRig.yaw;
      const forwardX = -Math.sin(yaw);
      const forwardZ = -Math.cos(yaw);
      // Screen y grows downward, so pulling down the screen walks toward the
      // camera.
      const ahead = -steer.y;
      const side = steer.x;
      steer.worldX = forwardX * ahead + -forwardZ * side;
      steer.worldZ = forwardZ * ahead + forwardX * side;
      // The courier is moving under the player's hand, so this press must not
      // also land as a click on the floor when it ends.
      pointerState.dragged = true;
      if (!steer.active) setSteerActive(true);
    };

    const onUp = (e) => {
      if (e.pointerId === orbitId) orbitId = null;
      if (e.pointerId === steerId) endSteer();
    };

    // A held right-drag would otherwise open the browser menu mid-orbit.
    const onContextMenu = (e) => {
      if (e.target?.tagName === 'CANVAS') e.preventDefault();
    };

    // Alt-tabbing mid-drag must not leave the courier sprinting forever.
    const onBlur = () => {
      orbitId = null;
      endSteer();
    };

    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('blur', onBlur);
      setSteerActive(false);
    };
  }, []);
}
