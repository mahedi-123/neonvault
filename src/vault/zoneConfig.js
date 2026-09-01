// Explicit .js extension (the rest of the app omits it and lets Vite
// resolve). This module is also imported by scripts/check-zones.mjs, which
// runs under plain Node ESM where extensionless paths do not resolve.
import { getFeaturedProducts, getLimitedProducts, getNewDrops, products } from '../data/products.js';

/**
 * The NEON VAULT world: its size, its camera rig, and the districts laid out
 * on it. Positions are world units on the floor (y is up). Nothing here
 * duplicates product data — each district points at the existing selectors
 * in src/data/products.js, or declares itself unstocked.
 */

const audioProducts = () =>
  products.filter(
    p => p.category === 'audio' || p.category === 'headphones'
  );

const computingProducts = () =>
  products.filter(
    p =>
      ['keyboards', 'mice', 'accessories', 'displays', 'streaming'].includes(
        p.category
      )
  );

const gamingProducts = () =>
  products.filter(p => p.category === 'gaming');

const wearablesProducts = () =>
  products.filter(p => p.category === 'wearables');

const smartHomeProducts = () =>
  products.filter(p => p.category === 'smart-home');


/* =========================================================
   WORLD

   The floor is a disc, not an infinite plane — the player is clamped
   inside it so there is no edge to walk off and no void to get lost in.

   Grown from a 21-unit disc holding eight districts to a 31-unit one
   holding thirteen. The old floor had every exhibit visible from the
   spawn point, which made "explore" a word for "look around once"; at
   this size the far districts are genuinely over the horizon and the
   minimap starts earning its place.
   ========================================================= */

/** [x, z] of the floor disc's centre. CORE stands here. */
export const WORLD_CENTER = [0, -12];
export const WORLD_RADIUS = 31;

/** Where the courier starts: outside the outer ring, facing in, so the
 *  first thing they see is the whole city rather than the inside of it. */
export const PLAYER_SPAWN = [0, 0, 14];

/** Ring radii the districts are laid out on, measured from WORLD_CENTER. */
const INNER_RING = 12;
const OUTER_RING = 24;

/** Polar helper — angle is measured from +Z (the entrance direction),
 *  turning toward +X, which keeps the layout table below readable as a
 *  compass rather than as raw coordinates. */
const at = (angleDeg, radius) => {
  const a = (angleDeg * Math.PI) / 180;
  return [
    WORLD_CENTER[0] + Math.sin(a) * radius,
    0,
    WORLD_CENTER[1] + Math.cos(a) * radius,
  ];
};


/* =========================================================
   CAMERA
   ========================================================= */

export const ENTRY_POSE = {
  eye: [0, 34, 44],
  target: [0, 2, -10],
};

export const MOBILE_ENTRY_POSE = {
  eye: [0, 26, 34],
  target: [0, 2, -8],
};

/**
 * Third-person rig: how far behind and above the courier the camera rides,
 * how high up their body it aims, and how far it sits off their shoulder.
 *
 * `shoulder` exists because every approach mark puts the courier directly
 * between the camera and the exhibit — dead-centre framing meant walking up
 * to a watch or a keyboard and seeing your own back instead of the product.
 * Offsetting the whole rig sideways slides the courier into the left of the
 * frame and leaves the exhibit ahead of them clear.
 */
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


/* =========================================================
   DISTRICTS

   CORE holds the centre. Four high-traffic categories sit on the inner
   ring where you meet them first; the rest spread around the outer ring.
   Ring positions are 45° apart inside and 45° apart outside, offset by
   22.5° from each other, so nothing on one ring hides anything on the
   other from the spawn point.

   `comingSoon` districts are built and walkable but hold no stock yet —
   they exist so the world reads as a shop with room to grow rather than
   eight things in a field, and so adding a category later is a data
   change rather than a layout change.
   ========================================================= */

const rawZones = [
  /* ---------- centre ---------- */
  {
    id: 'core',
    variant: 'core',
    label: 'CORE',
    index: 1,
    description:
      'The heart of the vault — our most coveted technology, gathered under one light.',
    position: [WORLD_CENTER[0], 0, WORLD_CENTER[1]],
    platformRadius: 3.5,
    accent: 'mixed',
    // CORE keeps a hand-authored pose: its architecture is monumental and
    // wants to be met head-on from a distance, not framed like a product.
    focusPose: {
      eye: [0, 3.4, -4.6],
      target: [0, 3.0, -12.6],
    },
    getProducts: () => getFeaturedProducts().slice(0, 5),
  },

  /* ---------- inner ring ---------- */
  {
    id: 'new-drops',
    variant: 'newdrops',
    label: 'NEW DROPS',
    index: 2,
    description:
      'Just landed. The newest arrivals, before they reach the main floor.',
    position: at(0, INNER_RING),
    platformRadius: 2.6,
    accent: 'violet',
    getProducts: () => getNewDrops().slice(0, 5),
  },
  {
    id: 'gaming',
    variant: 'gaming',
    label: 'GAMING',
    index: 3,
    description: 'Competitive-grade gear, built for zero compromise.',
    position: at(90, INNER_RING),
    platformRadius: 2.8,
    accent: 'cyan',
    getProducts: () => gamingProducts().slice(0, 5),
  },
  {
    id: 'vault-limited',
    variant: 'vault',
    label: 'VAULT / LIMITED',
    index: 4,
    description:
      'Rare drops, held back from the main floor. Once gone, they are gone.',
    position: at(180, INNER_RING),
    platformRadius: 3.1,
    accent: 'cyan',
    getProducts: () => getLimitedProducts().slice(0, 5),
  },
  {
    id: 'audio-lab',
    variant: 'audio',
    label: 'AUDIO LAB',
    index: 5,
    description: 'Precision sound, engineered for immersion.',
    position: at(270, INNER_RING),
    platformRadius: 2.6,
    accent: 'cyan',
    getProducts: () => audioProducts().slice(0, 5),
  },

  /* ---------- outer ring ---------- */
  {
    id: 'handhelds',
    variant: 'handhelds',
    label: 'HANDHELDS',
    index: 6,
    description:
      'Phones, tablets and the pocket-sized machines that run the rest of it.',
    position: at(22.5, OUTER_RING),
    platformRadius: 2.5,
    accent: 'violet',
    comingSoon: true,
    getProducts: () => [],
  },
  {
    id: 'computing-lab',
    variant: 'computing',
    label: 'COMPUTING LAB',
    index: 7,
    description: 'Precision instruments for people who work at the edge.',
    position: at(67.5, OUTER_RING),
    platformRadius: 2.7,
    accent: 'violet',
    getProducts: () => computingProducts().slice(0, 5),
  },
  {
    id: 'creator-studio',
    variant: 'creator',
    label: 'CREATOR STUDIO',
    index: 8,
    description:
      'Cameras, glass and light — the room where the work gets made.',
    position: at(112.5, OUTER_RING),
    platformRadius: 2.7,
    accent: 'violet',
    comingSoon: true,
    getProducts: () => [],
  },
  {
    id: 'power-cell',
    variant: 'power',
    label: 'POWER CELL',
    index: 9,
    description: 'Cells, chargers and the quiet business of staying on.',
    position: at(157.5, OUTER_RING),
    platformRadius: 2.5,
    accent: 'cyan',
    comingSoon: true,
    getProducts: () => [],
  },
  {
    id: 'flight-deck',
    variant: 'drones',
    label: 'FLIGHT DECK',
    index: 10,
    description: 'Drones and personal mobility — everything that leaves the floor.',
    position: at(202.5, OUTER_RING),
    platformRadius: 2.8,
    accent: 'cyan',
    comingSoon: true,
    getProducts: () => [],
  },
  {
    id: 'smart-home',
    variant: 'smarthome',
    label: 'SMART HOME',
    index: 11,
    description:
      'A quietly intelligent home, built around one connected core.',
    position: at(247.5, OUTER_RING),
    platformRadius: 2.5,
    accent: 'cyan',
    getProducts: () => smartHomeProducts().slice(0, 5),
  },
  {
    id: 'wearables',
    variant: 'wearables',
    label: 'WEARABLES',
    index: 12,
    description: 'Technology worn close — quiet, precise, always on.',
    position: at(292.5, OUTER_RING),
    platformRadius: 2.4,
    accent: 'violet',
    getProducts: () => wearablesProducts().slice(0, 5),
  },
  {
    id: 'vision-xr',
    variant: 'vision',
    label: 'VISION / XR',
    index: 13,
    description:
      'Headsets and glasses — the shelf where the screen stops being a screen.',
    position: at(337.5, OUTER_RING),
    platformRadius: 2.6,
    accent: 'violet',
    comingSoon: true,
    getProducts: () => [],
  },
];


/* =========================================================
   DERIVED WALKABLE PROPERTIES

   approach:      the mark on the floor the courier walks to — on the side
                  facing the middle of the world, since that is where
                  everybody arrives from.
   triggerRadius: step inside this and the district offers to let you in.
   focusPose:     where the camera parks once you accept, derived from the
                  approach direction so all thirteen frame consistently.

   Hand-placing these stopped being necessary at this world size: on the
   old cramped floor an approach mark could land inside a NEIGHBOUR's
   trigger radius and open the wrong exhibit, which needed a lookup table
   of angled marks. The two-ring layout leaves ~13 units between the
   closest pair, comfortably more than their two radii combined, so the
   simple derivation is safe again. `npm run check:zones` — see
   scripts/check-zones.mjs — asserts that, and should be re-run if these
   positions are ever retuned.
   ========================================================= */

const APPROACH_GAP = 1.7;

export const zones = rawZones.map(zone => {
  // Unit vector pointing from the district back toward the middle of the
  // world. CORE is the middle, so it faces the entrance instead.
  const dx = WORLD_CENTER[0] - zone.position[0];
  const dz = WORLD_CENTER[1] - zone.position[2];
  const len = Math.hypot(dx, dz);
  const ux = len < 0.001 ? 0 : dx / len;
  const uz = len < 0.001 ? 1 : dz / len;

  const reach = zone.platformRadius + APPROACH_GAP;
  const approach = [
    zone.position[0] + ux * reach,
    zone.position[2] + uz * reach,
  ];

  const focusReach = zone.platformRadius + 4.2;
  const focusPose = zone.focusPose ?? {
    eye: [
      zone.position[0] + ux * focusReach,
      3.4,
      zone.position[2] + uz * focusReach,
    ],
    target: [zone.position[0], 2.0, zone.position[2]],
  };

  return {
    ...zone,
    comingSoon: zone.comingSoon ?? false,
    approach,
    focusPose,
    triggerRadius: zone.platformRadius + 2.6,
  };
});


/* =========================================================
   HELPER
   ========================================================= */

export const getZoneById = id =>
  zones.find(z => z.id === id);
