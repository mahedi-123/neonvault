/**
 * Layout invariants, for every world.
 *
 * A walkable world only works if a few geometric properties hold, and all of
 * them are easy to break by nudging a single number in a world's layout:
 *
 *   1. Every district's own approach mark must be the nearest trigger
 *      radius — measured as distance / triggerRadius, which is exactly what
 *      Player.jsx compares. Break this and walking up to one exhibit opens
 *      a different one.
 *   2. No two trigger radii may overlap, or the district you are "in"
 *      changes as you shuffle on the spot.
 *   3. Every approach mark and every platform must sit inside the walkable
 *      disc, or the player is clamped short of a mark they can see.
 *   4. The spawn point must not sit in any trigger radius, or the tour
 *      opens an exhibit before the player has taken a step.
 *   5. The travel gate must stand inside the disc and clear of every
 *      district — it has its own proximity prompt, and a gate overlapping an
 *      exhibit would make the two fight over the same patch of floor.
 *
 * Checked for all three worlds rather than whichever one happens to be
 * active: adding a world is a config change, and a config change that
 * silently breaks its own layout is the whole reason this file exists.
 *
 * Run with:  node scripts/check-zones.mjs
 */
import { WORLDS } from '../src/vault/worlds/index.js';

const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

/** Radius the gate occupies for the purposes of keeping clear of exhibits. */
const PORTAL_CLEARANCE = 4.6;

let failed = 0;

for (const world of WORLDS) {
  const problems = [];
  const { zones, center, radius, spawn, portal } = world;

  /** The district whose territory a point is deepest inside — Player.jsx's rule. */
  const zoneUnder = (x, z) => {
    let best = null;
    let bestScore = Infinity;
    for (const zone of zones) {
      const score = dist(x, z, zone.position[0], zone.position[2]) / zone.triggerRadius;
      if (score <= 1 && score < bestScore) {
        bestScore = score;
        best = zone;
      }
    }
    return best;
  };

  console.log(
    `\n=== ${world.label} (${world.id}) — centre [${center}] radius ${radius}, ${zones.length} districts ===`
  );

  for (const zone of zones) {
    const [ax, az] = zone.approach;

    // 1. The mark must resolve to its own district.
    const resolved = zoneUnder(ax, az);
    if (!resolved) {
      problems.push(`${zone.id}: approach mark is outside every trigger radius`);
    } else if (resolved.id !== zone.id) {
      problems.push(`${zone.id}: approach mark resolves to ${resolved.id}`);
    }

    // 3. Marks and platforms inside the disc.
    const markOut = dist(ax, az, center[0], center[1]);
    if (markOut > radius) {
      problems.push(`${zone.id}: approach mark ${markOut.toFixed(1)} from centre, past the ${radius} edge`);
    }
    const platformOut = dist(zone.position[0], zone.position[2], center[0], center[1]) + zone.platformRadius;
    if (platformOut > radius) {
      problems.push(`${zone.id}: platform reaches ${platformOut.toFixed(1)}, past the ${radius} edge`);
    }

    // 5. The gate keeps out of every district.
    const gateGap = dist(portal.position[0], portal.position[2], zone.position[0], zone.position[2]);
    const needed = zone.triggerRadius + PORTAL_CLEARANCE;
    if (gateGap < needed) {
      problems.push(
        `${zone.id}: travel gate is ${gateGap.toFixed(1)} away, needs ${needed.toFixed(1)}`
      );
    }

    console.log(
      `  ${String(zone.index).padStart(2)} ${zone.label.padEnd(16)} pos [${zone.position[0].toFixed(1)}, ${zone.position[2].toFixed(1)}]  trigger ${zone.triggerRadius.toFixed(1)}  ${zone.comingSoon ? 'coming soon' : `${zone.getProducts().length} products`}`
    );
  }

  // 2. No two trigger radii may overlap.
  for (let i = 0; i < zones.length; i += 1) {
    for (let j = i + 1; j < zones.length; j += 1) {
      const a = zones[i];
      const b = zones[j];
      const gap = dist(a.position[0], a.position[2], b.position[0], b.position[2]);
      const overlap = a.triggerRadius + b.triggerRadius;
      if (gap < overlap) {
        problems.push(
          `${a.id} and ${b.id} triggers overlap: ${gap.toFixed(1)} apart, radii sum ${overlap.toFixed(1)}`
        );
      }
    }
  }

  // 4. Spawn stands in open floor.
  const spawnZone = zoneUnder(spawn[0], spawn[2]);
  if (spawnZone) problems.push(`spawn stands inside ${spawnZone.id}'s trigger radius`);
  const spawnOut = dist(spawn[0], spawn[2], center[0], center[1]);
  if (spawnOut > radius) problems.push(`spawn is ${spawnOut.toFixed(1)} from centre, outside the disc`);

  // 5b. And the gate itself is on the floor.
  const gateOut = dist(portal.position[0], portal.position[2], center[0], center[1]);
  if (gateOut > radius) problems.push(`travel gate is ${gateOut.toFixed(1)} from centre, past the ${radius} edge`);

  if (problems.length) {
    failed += 1;
    console.log('\n  PROBLEMS:');
    for (const p of problems) console.log(`    ✗ ${p}`);
  } else {
    console.log(
      `\n  ✓ all invariants hold (spawn ${spawnOut.toFixed(1)} from centre, gate ${gateOut.toFixed(1)})`
    );
  }
}

console.log(
  failed ? `\n${failed} world(s) FAILED\n` : `\nall ${WORLDS.length} worlds pass\n`
);
process.exit(failed ? 1 : 0);
