import { getFeaturedProducts, getLimitedProducts, getNewDrops, products } from '../data/products';

/**
 * Static zone definitions for the NEON VAULT world. Positions are world
 * units on the vault floor (y is up); poses are camera eye/target pairs
 * consumed directly by CameraRig's CameraControls.setLookAt calls. Nothing
 * here duplicates product data — each zone just points at the existing
 * selectors/filters in src/data/products.js.
 *
 * Layout: CORE sits closest to the entry point as the monumental center.
 * The other seven spread across a wide, depth-staggered arc behind and
 * around it — no two zones share an x coordinate, which keeps every zone
 * legible from the overview camera instead of stacking in screen space.
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

   The floor is a disc, not an infinite plane — the player is
   clamped inside it so there is no edge to walk off and no
   void to get lost in. Every zone sits comfortably within
   WORLD_RADIUS of WORLD_CENTER.
   ========================================================= */

/** [x, z] of the floor disc's centre. Matches VaultFloor's geometry. */
export const WORLD_CENTER = [0, -12];
export const WORLD_RADIUS = 21;

/** Where the courier is standing when the tour begins — well clear of
 *  CORE's trigger radius so the first exhibit isn't opened for them. */
export const PLAYER_SPAWN = [0, 0, 6];


/* =========================================================
   CAMERA

   The establishing shot still uses fixed poses; once the
   intro hands over, the camera is a third-person follow rig
   parameterised by these offsets instead.
   ========================================================= */

export const ENTRY_POSE = {
  eye: [0, 26, 30],
  target: [0, 2, -8],
};

export const MOBILE_ENTRY_POSE = {
  eye: [0, 20, 24],
  target: [0, 2, -6],
};

/** Third-person rig: how far behind and above the courier the camera rides,
 *  and how high up their body it aims. */
export const FOLLOW = {
  distance: 6.6,
  height: 3.5,
  lookHeight: 1.35,
};

export const MOBILE_FOLLOW = {
  distance: 7.6,
  height: 4.1,
  lookHeight: 1.45,
};


/* =========================================================
   ZONES
   ========================================================= */

const rawZones = [
  {
    id: 'core',
    variant: 'core',
    label: 'CORE',
    index: 1,
    description:
      'The heart of the vault — our most coveted technology, gathered under one light.',
    position: [0, 0, -5],
    platformRadius: 3.5,
    accent: 'mixed',
    focusPose: {
      eye: [0, 2.85, 2.4],
      target: [0, 2.75, -5.6],
    },
    getProducts: () => getFeaturedProducts().slice(0, 5),
  },

  {
    id: 'new-drops',
    variant: 'newdrops',
    label: 'NEW DROPS',
    index: 2,
    description:
      'Just landed. The newest arrivals, before they reach the main floor.',
    position: [-4.5, 0, 2],
    platformRadius: 2.3,
    accent: 'violet',
    focusPose: {
      eye: [-4.5, 3.6, 7.5],
      target: [-4.5, 2.3, 2],
    },
    getProducts: () => getNewDrops().slice(0, 5),
  },

  {
    id: 'gaming',
    variant: 'gaming',
    label: 'GAMING',
    index: 3,
    description:
      'Competitive-grade gear, built for zero compromise.',
    position: [9, 0, 0],
    platformRadius: 2.8,
    accent: 'cyan',
    focusPose: {
      eye: [9, 3.7, 5.5],
      target: [9, 2.3, 0],
    },
    getProducts: () => gamingProducts().slice(0, 5),
  },

  {
    id: 'audio-lab',
    variant: 'audio',
    label: 'AUDIO LAB',
    index: 4,
    description:
      'Precision sound, engineered for immersion.',
    position: [-11, 0, -6],
    platformRadius: 2.6,
    accent: 'cyan',
    focusPose: {
      eye: [-11, 3.7, -1],
      target: [-11, 2.3, -6],
    },
    getProducts: () => audioProducts().slice(0, 5),
  },

  {
    id: 'computing-lab',
    variant: 'computing',
    label: 'COMPUTING LAB',
    index: 5,
    description:
      'Precision instruments for people who work at the edge.',
    position: [11, 0, -9],
    platformRadius: 2.7,
    accent: 'violet',
    focusPose: {
      eye: [11, 3.7, -4],
      target: [11, 2.3, -9],
    },
    getProducts: () => computingProducts().slice(0, 5),
  },

  {
    id: 'wearables',
    variant: 'wearables',
    label: 'WEARABLES',
    index: 6,
    description:
      'Technology worn close — quiet, precise, always on.',
    position: [-7, 0, -16],
    platformRadius: 2.2,
    accent: 'violet',
    focusPose: {
      eye: [-7, 3.4, -11],
      target: [-7, 2.1, -16],
    },
    getProducts: () => wearablesProducts().slice(0, 5),
  },

  {
    id: 'smart-home',
    variant: 'smarthome',
    label: 'SMART HOME',
    index: 7,
    description:
      'A quietly intelligent home, built around one connected core.',
    position: [6, 0, -18],
    platformRadius: 2.5,
    accent: 'cyan',
    focusPose: {
      eye: [6, 3.6, -13],
      target: [6, 2.3, -18],
    },
    getProducts: () => smartHomeProducts().slice(0, 5),
  },

  {
    id: 'vault-limited',
    variant: 'vault',
    label: 'VAULT / LIMITED',
    index: 8,
    description:
      'Rare drops, held back from the main floor. Once gone, they are gone.',

    /* Moved farther back so the Vault/Limited section
       has more separation and reads clearly in overview. */
    position: [3.5, 0, -25],

    platformRadius: 3.1,
    accent: 'cyan',

    focusPose: {
      eye: [3.5, 3.8, -19],
      target: [3.5, 2.3, -25],
    },

    getProducts: () => getLimitedProducts().slice(0, 5),
  },
];


/* =========================================================
   DERIVED WALKABLE PROPERTIES

   approach:      the mark on the floor the courier walks to. Mostly the
                  entrance (+Z) side of the platform so an exhibit is never
                  approached from behind — but hand-placed rather than
                  derived, because four of the zones sit close enough that a
                  purely +Z mark would land inside a NEIGHBOUR's trigger
                  radius and open the wrong exhibit. Each mark below is
                  angled away from its nearest neighbour.
   triggerRadius: step inside this and the exhibit opens itself. Proportional
                  to the platform, so bigger zones claim more floor.

   Invariant worth preserving if these numbers are ever retuned: every
   zone's own approach mark must be the nearest trigger radius (measured as
   distance / triggerRadius, which is what Player.jsx compares).
   ========================================================= */

const APPROACH = {
  core: [0, -0.4],
  'new-drops': [-6.6, 4.6],
  gaming: [9, 4.2],
  'audio-lab': [-11, -1.8],
  'computing-lab': [13.4, -6.4],
  wearables: [-7, -12.2],
  'smart-home': [8.6, -15.6],
  'vault-limited': [0.4, -21.6],
};

export const zones = rawZones.map(zone => ({
  ...zone,
  approach: APPROACH[zone.id] ?? [
    zone.position[0],
    zone.position[2] + zone.platformRadius + 1.6,
  ],
  triggerRadius: zone.platformRadius + 2.2,
}));


/* =========================================================
   HELPER
   ========================================================= */

export const getZoneById = id =>
  zones.find(z => z.id === id);