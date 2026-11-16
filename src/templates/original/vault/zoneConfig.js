// Explicit .js extension (the rest of the app omits it and lets Vite
// resolve). This module is also imported by scripts/check-zones.mjs, which
// runs under plain Node ESM where extensionless paths do not resolve.
import { DEFAULT_WORLD_ID, WORLDS, getWorldById } from './worlds/index.js';

/**
 * The world the player is currently standing in, as flat exports.
 *
 * Every part of the vault — the player store's clamping, the camera rig, the
 * floor, the minimap, the skyline — was written against a single world's
 * constants imported from here. Rather than thread a world object through
 * fifteen files and their frame loops, this module stays the one place they
 * ask, and `setActiveWorld` re-points it.
 *
 * These are `let` bindings on purpose. ES module exports are live: an
 * importer that wrote `import { zones } from '../zoneConfig'` sees the new
 * array the moment this module reassigns it, with no import churn and no
 * subscription. The one rule that comes with that — and it is a real trap —
 * is that a consumer must not capture these at module scope
 * (`const CX = WORLD_CENTER[0]` at the top of a file), because that snapshots
 * whichever world happened to be active when the module first evaluated.
 * Read them inside the component or the frame loop instead.
 */

let active = getWorldById(DEFAULT_WORLD_ID);

export let activeWorld = active;
export let zones = active.zones;
export let WORLD_CENTER = active.center;
export let WORLD_RADIUS = active.radius;
export let PLAYER_SPAWN = active.spawn;
export let WORLD_PORTAL = active.portal;
export let PORTAL_APPROACH = active.portalApproach;
export let PALETTE = active.palette;
export let ENTRY_POSE = active.entry;
export let MOBILE_ENTRY_POSE = active.mobileEntry;

/**
 * Point every export at another world. Called during a teleport, before the
 * scene remounts — never mid-frame, or the player would be clamped against
 * one world's edge using another world's centre for a frame.
 */
export function setActiveWorld(id) {
  active = getWorldById(id);
  activeWorld = active;
  zones = active.zones;
  WORLD_CENTER = active.center;
  WORLD_RADIUS = active.radius;
  PLAYER_SPAWN = active.spawn;
  WORLD_PORTAL = active.portal;
  PORTAL_APPROACH = active.portalApproach;
  PALETTE = active.palette;
  ENTRY_POSE = active.entry;
  MOBILE_ENTRY_POSE = active.mobileEntry;
  return active;
}

export const getActiveWorld = () => active;

export const getZoneById = (id) => zones.find((z) => z.id === id);

export { WORLDS };


/* =========================================================
   CAMERA

   World-independent: how the rig sits behind the courier is a property of
   the camera, not of the place they are standing.

   `shoulder` exists because every approach mark puts the courier directly
   between the camera and the exhibit — dead-centre framing meant walking up
   to a watch or a keyboard and seeing your own back instead of the product.
   Offsetting the whole rig sideways slides the courier into the left of the
   frame and leaves the exhibit ahead of them clear.
   ========================================================= */

export const FOLLOW = {
  // Pulled back a notch from 6.6/3.5. The tighter rig framed the courier
  // beautifully and the world barely at all: on a floor this size you spend
  // most of your time deciding where to go next, and that decision needs
  // more of the room in frame than one district at a time.
  distance: 8.0,
  height: 4.1,
  lookHeight: 1.45,
  shoulder: 1.25,
};

export const MOBILE_FOLLOW = {
  // Wider again on a phone, where the same field of view has a third of the
  // screen width to put it in.
  distance: 9.0,
  height: 4.8,
  lookHeight: 1.55,
  shoulder: 0.95,
};
