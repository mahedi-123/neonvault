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
 * Time constant of the filter on the raw pointer, in seconds.
 *
 * A mouse reports in jerky integer pixels and a finger wobbles; both go
 * straight into the courier's heading if you use them raw, which is what made
 * the old steering feel twitchy rather than heavy. 45ms is short enough to be
 * imperceptible as lag and long enough to swallow a pixel of hand tremor.
 *
 * Applied to the pull VECTOR rather than to the resulting angle, so it
 * smooths direction and distance together and never has to worry about
 * angles wrapping at ±180°.
 */
const SMOOTH_TAU = 0.045;

/**
 * Slack, in pixels, before the follow origin starts chasing the pointer.
 *
 * Without it the origin ratchets. A thumb held at full deflection sits right
 * on the rim by construction — that is what the follow origin is for — so
 * hand tremor puts it a pixel outside, then a pixel inside, over and over.
 * Every outward twitch dragged the origin along; every inward one then read
 * as a smaller pull. Over a few seconds of holding still the magnitude bled
 * away to nothing and the direction, now derived from a pull of almost zero
 * length, became pure noise: the courier span on the spot.
 *
 * Six pixels is wider than any tremor and far narrower than a deliberate
 * movement, so real travel still drags the origin immediately.
 */
const FOLLOW_BAND = 6;

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
    /** Filtered pull vector, in pixels, and when it was last advanced. */
    let smoothX = 0;
    let smoothY = 0;
    let lastMoveAt = 0;

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
      // Belt and braces with the canvas's `touch-action: none` (see
      // index.css): capture routes the rest of this gesture to the canvas
      // whatever it passes over, so a finger that strays onto the HUD, or a
      // mouse that leaves the window, keeps steering instead of silently
      // dropping the courier mid-stride.
      try {
        e.target.setPointerCapture?.(e.pointerId);
      } catch {
        /* capture is an optimisation, never a requirement */
      }
      radius = padRadius();
      startX = e.clientX;
      startY = e.clientY;
      steer.originX = e.clientX;
      steer.originY = e.clientY;
      steer.pointX = e.clientX;
      steer.pointY = e.clientY;
      smoothX = 0;
      smoothY = 0;
      lastMoveAt = e.timeStamp;
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

      /* ---------- follow origin ----------
         Once the pointer passes the pad's radius the stick is at full
         deflection and has nothing left to say — but the hand keeps going,
         and on a phone a thumb travels well past it. Dragging the origin
         along behind keeps the pull pinned at exactly one radius, which does
         two things: the direction stays as precise at the edge as it is in
         the middle, and pulling BACK slows down immediately instead of first
         having to retrace the overshoot. Standard dynamic-stick behaviour,
         and the single biggest difference on touch. */
      let rawX = e.clientX - steer.originX;
      let rawY = e.clientY - steer.originY;
      const rawLen = Math.hypot(rawX, rawY);
      if (rawLen > radius + FOLLOW_BAND) {
        const move = rawLen - radius - FOLLOW_BAND;
        steer.originX += (rawX / rawLen) * move;
        steer.originY += (rawY / rawLen) * move;
        rawX = (rawX / rawLen) * (radius + FOLLOW_BAND);
        rawY = (rawY / rawLen) * (radius + FOLLOW_BAND);
      }

      // Exponential filter, framed in time rather than in events: pointer
      // events do not arrive on a fixed cadence, and a per-event alpha would
      // smooth a 120Hz mouse far harder than a 60Hz one.
      const dt = Math.max(0, Math.min(0.1, (e.timeStamp - lastMoveAt) / 1000));
      lastMoveAt = e.timeStamp;
      const alpha = 1 - Math.exp(-dt / SMOOTH_TAU);
      smoothX += (rawX - smoothX) * alpha;
      smoothY += (rawY - smoothY) * alpha;

      const length = Math.hypot(smoothX, smoothY);

      if (Math.hypot(rawX, rawY) < DRAG_THRESHOLD) {
        // Still a tap as far as anyone is concerned. Leaving the pad inactive
        // here is what preserves tap-to-walk under the drag scheme.
        if (steer.active) setSteerActive(false);
        return;
      }
      if (length < 0.0001) return;

      // The knob draws from the filtered value, not the raw one, so what the
      // player sees is exactly what the courier is being told to do.
      steer.pointX = steer.originX + smoothX;
      steer.pointY = steer.originY + smoothY;
      steer.x = smoothX / length;
      steer.y = smoothY / length;
      steer.magnitude = Math.min(1, length / radius);

      /* The pull stays in SCREEN space. Turning it into a world direction is
         Player's job, against the live camera, every frame.

         This was once resolved here instead — the world direction frozen at
         each pointer event — to stop a sideways hold walking in a circle as
         the camera swung round behind the courier. That cure was worse than
         the disease: every pointer event re-froze the direction against a
         camera that had rotated since the last one, so a hand simply
         trembling on a held stick rotated the courier a few degrees per
         event. Holding still walked a slow, permanent circle.

         Reading the live camera per frame has a fixed point where freezing
         did not: hold forward and the courier's heading, the camera's bearing
         and the pull all converge on each other, so forward is a straight
         line. A sideways hold does still curve — that is what every
         third-person game does, and it is what a player expects from pushing
         a stick sideways while the camera follows them. */
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
