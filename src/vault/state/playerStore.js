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

export const PLAYER_SPEED = 4.6;

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
export const pointerState = { dragged: false };

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
 * Every zone's approach mark sits outside its own collision radius (see
 * zoneConfig's APPROACH table), so this can never push a player off the spot
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
  cameraRig.yaw = 0;
  pointerState.dragged = false;
  clearKeys();
  emit();
}

/** Reactive read of the one-shot "player has walked at least once" latch. */
export function usePlayerHasMoved() {
  return useSyncExternalStore(subscribePlayer, () => player.hasMoved);
}
