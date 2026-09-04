import { useSyncExternalStore } from 'react';
import { Vector3 } from 'three';
import { PLAYER_SPAWN, WORLD_CENTER, WORLD_RADIUS, getZoneById, zones } from '../zoneConfig';

/**
 * The walkable player's live state. Deliberately NOT React state: position
 * and heading are mutated every frame inside useFrame by Player.jsx and read
 * by CameraRig and the minimap, so routing them through React would re-render
 * the entire overlay 60 times a second. Anything the DOM genuinely needs to
 * re-render on (has the player moved at all yet?) goes through the tiny
 * subscribe/emit pair below instead.
 */

// Raised along with the world's growth: at 4.6 a walk from the entrance to
// the far rim took the better part of a minute, which made the far districts
// feel like a chore rather than a destination. Holding a run key covers the
// same ground in about half that.
export const PLAYER_SPEED = 5.6;

export const player = {
  position: new Vector3(PLAYER_SPAWN[0], 0, PLAYER_SPAWN[2]),
  target: new Vector3(PLAYER_SPAWN[0], 0, PLAYER_SPAWN[2]),
  /** Radians about Y. PI = facing -Z, which is "into the world" from spawn. */
  heading: Math.PI,
  moving: false,
  /** Latched the first time a walk target is set — drives the one-time hint. */
  hasMoved: false,
  /**
   * Set when the walk was requested by name (navigator / minimap) rather than
   * by tapping the floor. While it is set, only THAT zone may raise its enter
   * prompt — otherwise a walk to the back of the room would flash a prompt for
   * every exhibit the straight-line path happens to cross on the way.
   */
  intentZoneId: null,
  /**
   * True while the courier is turning on the spot to face the district they
   * have arrived at. The camera watches this so it can swing round with
   * them — otherwise arriving somewhere leaves you looking off in whatever
   * direction you happened to walk in from.
   */
  autoFacing: false,
  /**
   * Live locomotion pace, as a multiple of walking speed (0 stopped, 1 walk,
   * 2 full run). Written every frame by Player, read by the camera rig so the
   * rig can ease back when the courier opens up — a small, cheap speed cue
   * that costs nothing and reads as momentum.
   */
  pace: 0,
};

/**
 * Held movement keys. Mutated by the keyboard listener, read every frame by
 * Player.jsx — same reasoning as `player` above: this changes at input rate
 * and must never re-render the overlay.
 *
 * `active` latches while any direction key is down. It is what tells the
 * locomotion code to ignore the click-to-walk target: the two schemes would
 * otherwise fight, with the walk target dragging the courier back toward the
 * last tapped spot the moment the player let go of W.
 */
export const keys = {
  forward: false,
  back: false,
  left: false,
  right: false,
  run: false,
  active: false,
};

export function clearKeys() {
  keys.forward = false;
  keys.back = false;
  keys.left = false;
  keys.right = false;
  keys.run = false;
  keys.active = false;
}

/** Latch the "player has moved" flag from keyboard locomotion too, so the
 *  tap-the-floor hint clears for someone who only ever uses WASD. */
export function markMoved() {
  if (player.hasMoved) return;
  player.hasMoved = true;
  emit();
}

/**
 * Analog steering: the live pull of a held pointer, in SCREEN space.
 *
 * `x`/`y` are a unit vector in the direction the pointer has been dragged
 * from where it went down (y is screen-down, as DOM coordinates are), and
 * `magnitude` is how far it was dragged as a fraction of the pad radius,
 * clamped to 1. Player.jsx rotates that into world space against the camera's
 * yaw, so pulling "up the screen" always means "away from the camera" however
 * the rig happens to be turned.
 *
 * The magnitude is the whole reason this is not just four more booleans:
 * a small pull is a walk, a long one is a run, and everything in between is
 * a real speed — which is what makes a drag feel like steering rather than
 * like pressing an arrow key with a mouse.
 *
 * `originX/Y` and `pointX/Y` are client pixels, kept here purely so the
 * on-screen pad can draw itself where the finger actually is.
 */
export const steer = {
  active: false,
  x: 0,
  y: 0,
  magnitude: 0,
  originX: 0,
  originY: 0,
  pointX: 0,
  pointY: 0,
};

export function clearSteer() {
  steer.active = false;
  steer.x = 0;
  steer.y = 0;
  steer.magnitude = 0;
}

/**
 * Notified only when the pad appears or disappears — never while it moves.
 * The pad's position is read straight off `steer` in a rAF loop, because a
 * React re-render per pointermove is exactly the cost this store exists to
 * avoid.
 */
const steerListeners = new Set();

export function subscribeSteer(listener) {
  steerListeners.add(listener);
  return () => steerListeners.delete(listener);
}

export function setSteerActive(active) {
  if (steer.active === active) return;
  steer.active = active;
  if (!active) {
    steer.magnitude = 0;
    steer.x = 0;
    steer.y = 0;
  }
  for (const listener of steerListeners) listener();
}

export function useSteerActive() {
  return useSyncExternalStore(subscribeSteer, () => steer.active);
}

/**
 * Orbit yaw for the third-person camera, in radians. 0 parks the camera
 * directly behind the world's -Z axis (the entrance view). Dragging the
 * pointer across the canvas rotates it; walking never does.
 */
export const cameraRig = { yaw: 0 };

/**
 * Pointer bookkeeping shared between CameraRig (which owns the drag listeners)
 * and WalkGround (which must ignore the click that ends a drag — otherwise
 * every camera orbit would also fling the player across the floor).
 */
export const pointerState = {
  dragged: false,
  /**
   * performance.now() of the last drag. The camera stops auto-following the
   * courier's heading for a moment afterwards, so a deliberate look-around
   * isn't immediately swung back by the next step the player takes.
   */
  lastDragAt: -Infinity,
};

const listeners = new Set();

export function subscribePlayer(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  for (const listener of listeners) listener();
}

/** Clamp a point to the circular floor so the player can't walk into the void. */
export function clampToWorld(x, z) {
  const dx = x - WORLD_CENTER[0];
  const dz = z - WORLD_CENTER[1];
  const dist = Math.hypot(dx, dz);
  if (dist <= WORLD_RADIUS) return [x, z];
  const scale = WORLD_RADIUS / dist;
  return [WORLD_CENTER[0] + dx * scale, WORLD_CENTER[1] + dz * scale];
}

/** Clearance kept between the courier and a platform's edge. */
const COLLISION_PAD = 0.5;

/**
 * Push a point out of any exhibit platform it has landed inside.
 *
 * Click-to-walk never needed this — the courier only ever headed for open
 * floor. Keyboard steering does: hold W at a pedestal and without this the
 * courier strolls straight through the middle of the exhibit, which reads as
 * the world being a painted backdrop rather than a place.
 *
 * Every district's approach mark sits a clear APPROACH_GAP outside its own
 * platform (see zoneConfig), so this can never push a player off the spot
 * the enter prompt wants them to reach.
 */
export function resolveZoneCollisions(x, z) {
  let px = x;
  let pz = z;
  for (const zone of zones) {
    const radius = zone.platformRadius + COLLISION_PAD;
    const dx = px - zone.position[0];
    const dz = pz - zone.position[2];
    const dist = Math.hypot(dx, dz);
    if (dist >= radius) continue;
    if (dist < 1e-4) {
      // Dead centre: no direction to push along, so pick one.
      px = zone.position[0];
      pz = zone.position[2] + radius;
    } else {
      const scale = radius / dist;
      px = zone.position[0] + dx * scale;
      pz = zone.position[2] + dz * scale;
    }
  }
  return [px, pz];
}

/** Collision first, then the world edge — the world clamp must have the last
 *  word, or a push-out could place the courier outside the floor. */
export function resolvePosition(x, z) {
  const [rx, rz] = resolveZoneCollisions(x, z);
  return clampToWorld(rx, rz);
}

export function setWalkTarget(x, z, intentZoneId = null) {
  // Tapping a pedestal walks you to its edge rather than into it.
  const [cx, cz] = resolvePosition(x, z);
  player.target.set(cx, 0, cz);
  player.moving = true;
  player.intentZoneId = intentZoneId;
  if (!player.hasMoved) {
    player.hasMoved = true;
    emit();
  }
}

/** Walk to a zone's approach mark — the spot just in front of its platform. */
export function walkToZone(id) {
  const zone = getZoneById(id);
  if (!zone) return;
  setWalkTarget(zone.approach[0], zone.approach[1], id);
}

export function resetPlayer() {
  player.position.set(PLAYER_SPAWN[0], 0, PLAYER_SPAWN[2]);
  player.target.copy(player.position);
  player.heading = Math.PI;
  player.moving = false;
  player.hasMoved = false;
  player.intentZoneId = null;
  player.autoFacing = false;
  player.pace = 0;
  cameraRig.yaw = 0;
  pointerState.dragged = false;
  pointerState.lastDragAt = -Infinity;
  clearKeys();
  setSteerActive(false);
  emit();
}

/** Reactive read of the one-shot "player has walked at least once" latch. */
export function usePlayerHasMoved() {
  return useSyncExternalStore(subscribePlayer, () => player.hasMoved);
}
