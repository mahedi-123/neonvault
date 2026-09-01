/**
 * Layout invariants for the vault floor.
 *
 * The walkable world only works if a few geometric properties hold, and all
 * of them are easy to break by nudging a single number in zoneConfig.js:
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
 *
 * Run with:  node scripts/check-zones.mjs
 */
import {
  PLAYER_SPAWN,
  WORLD_CENTER,
  WORLD_RADIUS,
  zones,
} from '../src/vault/zoneConfig.js';

const problems = [];
const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

/** The district whose territory a point is deepest inside — Player.jsx's rule. */
function zoneUnder(x, z) {
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
}

console.log(`world: centre [${WORLD_CENTER}] radius ${WORLD_RADIUS}, ${zones.length} districts\n`);

for (const zone of zones) {
  const [ax, az] = zone.approach;

  // 1. own approach mark resolves to itself
  const under = zoneUnder(ax, az);
  if (!under) {
    problems.push(`${zone.id}: approach mark is outside its own trigger radius`);
  } else if (under.id !== zone.id) {
    problems.push(`${zone.id}: approach mark resolves to ${under.id}`);
  }

  // 3. mark and platform inside the disc
  const markOut = dist(ax, az, WORLD_CENTER[0], WORLD_CENTER[1]);
  if (markOut > WORLD_RADIUS) {
    problems.push(`${zone.id}: approach mark ${markOut.toFixed(1)} from centre, past the ${WORLD_RADIUS} edge`);
  }
  const platformOut =
    dist(zone.position[0], zone.position[2], WORLD_CENTER[0], WORLD_CENTER[1]) +
    zone.platformRadius;
  if (platformOut > WORLD_RADIUS) {
    problems.push(`${zone.id}: platform reaches ${platformOut.toFixed(1)}, past the ${WORLD_RADIUS} edge`);
  }

  console.log(
    `  ${zone.index.toString().padStart(2)} ${zone.label.padEnd(16)} ` +
      `pos [${zone.position[0].toFixed(1)}, ${zone.position[2].toFixed(1)}]  ` +
      `trigger ${zone.triggerRadius.toFixed(1)}  ` +
      `${zone.comingSoon ? 'coming soon' : `${zone.getProducts().length} products`}`
  );
}

// 2. no two trigger radii overlap
for (let i = 0; i < zones.length; i += 1) {
  for (let j = i + 1; j < zones.length; j += 1) {
    const a = zones[i];
    const b = zones[j];
    const d = dist(a.position[0], a.position[2], b.position[0], b.position[2]);
    const sum = a.triggerRadius + b.triggerRadius;
    if (d < sum) {
      problems.push(
        `${a.id} / ${b.id}: trigger radii overlap (${d.toFixed(1)} apart, need ${sum.toFixed(1)})`
      );
    }
  }
}

// 4. spawn is clear
const spawnZone = zoneUnder(PLAYER_SPAWN[0], PLAYER_SPAWN[2]);
if (spawnZone) problems.push(`spawn sits inside ${spawnZone.id}'s trigger radius`);
const spawnOut = dist(PLAYER_SPAWN[0], PLAYER_SPAWN[2], WORLD_CENTER[0], WORLD_CENTER[1]);
if (spawnOut > WORLD_RADIUS) problems.push(`spawn is ${spawnOut.toFixed(1)} from centre, outside the disc`);

console.log('');
if (problems.length) {
  for (const p of problems) console.error(`FAIL  ${p}`);
  process.exit(1);
}
console.log(`all layout invariants hold (spawn ${spawnOut.toFixed(1)} from centre)`);
