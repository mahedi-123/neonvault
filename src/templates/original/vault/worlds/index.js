import { TECH_WORLD } from './techWorld.js';
import { COSMETICS_WORLD } from './cosmeticsWorld.js';
import { APPAREL_WORLD } from './apparelWorld.js';

/**
 * The world registry, and the one place a world's walkable geometry is
 * derived from its layout table.
 *
 * A layout only states where a district *is*. Three things every district
 * needs are computed from that rather than written by hand, because writing
 * them by hand is how they drift:
 *
 *   approach     — the spot the courier walks to, one clear gap outside the
 *                  platform, on the side facing the middle of the world.
 *   focusPose    — where the camera parks when you go in.
 *   triggerRadius— how close you have to be for the district to offer itself.
 *
 * scripts/check-zones.mjs asserts the result holds for every world: marks
 * inside the disc, platforms inside the disc, no two districts' trigger
 * radii overlapping, and the spawn point standing in open floor. Adding a
 * world means adding an entry here and running that.
 */

const APPROACH_GAP = 1.7;

function deriveZones(world) {
  const [cx, cz] = world.center;

  return world.zones.map((zone) => {
    // Unit vector pointing from the district back toward the middle of the
    // world. The centre district is the middle, so it faces the entrance.
    const dx = cx - zone.position[0];
    const dz = cz - zone.position[2];
    const len = Math.hypot(dx, dz);
    const ux = len < 0.001 ? 0 : dx / len;
    const uz = len < 0.001 ? 1 : dz / len;

    const reach = zone.platformRadius + APPROACH_GAP;
    const approach = [zone.position[0] + ux * reach, zone.position[2] + uz * reach];

    const focusReach = zone.platformRadius + 4.2;
    const focusPose = zone.focusPose ?? {
      eye: [zone.position[0] + ux * focusReach, 3.4, zone.position[2] + uz * focusReach],
      target: [zone.position[0], 2.0, zone.position[2]],
    };

    return {
      ...zone,
      worldId: world.id,
      comingSoon: zone.comingSoon ?? false,
      approach,
      focusPose,
      triggerRadius: zone.platformRadius + 2.6,
    };
  });
}

/** Polar position of the world's travel gate, resolved from its bearing. */
function derivePortal(world) {
  const a = (world.portal.angle * Math.PI) / 180;
  return {
    ...world.portal,
    position: [
      world.center[0] + Math.sin(a) * world.portal.radius,
      0,
      world.center[1] + Math.cos(a) * world.portal.radius,
    ],
  };
}

function build(world) {
  const zones = deriveZones(world);
  const portal = derivePortal(world);
  return {
    ...world,
    zones,
    portal,
    // Where the courier stands to use the gate: one gap short of it, on the
    // side facing the middle of the world, so you arrive looking through it.
    portalApproach: (() => {
      const dx = world.center[0] - portal.position[0];
      const dz = world.center[1] - portal.position[2];
      const len = Math.hypot(dx, dz) || 1;
      return [portal.position[0] + (dx / len) * 3.4, portal.position[2] + (dz / len) * 3.4];
    })(),
    getZoneById: (id) => zones.find((z) => z.id === id),
  };
}

export const WORLDS = [TECH_WORLD, COSMETICS_WORLD, APPAREL_WORLD].map(build);

export const DEFAULT_WORLD_ID = 'tech';

export const getWorldById = (id) => WORLDS.find((w) => w.id === id) ?? WORLDS[0];

export const worldExists = (id) => WORLDS.some((w) => w.id === id);
