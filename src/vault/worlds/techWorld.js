import { getFeaturedProducts, getLimitedProducts, getNewDrops, products } from '../../data/products.js';
import { TECH_PALETTE } from './palettes.js';

/**
 * NEON VAULT — the technology world, and the one everything else was
 * measured against. Thirteen districts on two rings inside a 31-unit disc.
 *
 * Lifted out of zoneConfig unchanged when the vault grew from one world to
 * several: the numbers here are the ones that were tuned over the whole
 * build, and re-deriving them for the sake of a tidier file would have been
 * a silent redesign.
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



/** [x, z] of the floor disc's centre. CORE stands here. */
const WORLD_CENTER = [0, -12];
const WORLD_RADIUS = 31;

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

export const TECH_WORLD = {
  id: 'tech',
  label: 'NEON VAULT',
  kicker: 'TECHNOLOGY',
  tagline: 'A private showroom for the gear worth owning.',
  palette: TECH_PALETTE,
  center: WORLD_CENTER,
  radius: WORLD_RADIUS,
  spawn: [0, 0, 14],
  /* Bearing 45 at radius 28.5 clears the outer ring by eleven units — the
     districts sit at 22.5 and 67.5, so this is the widest gap on that side
     and the gate is the first thing you see when you turn right at spawn. */
  portal: { angle: 45, radius: 28.5 },
  entry: { eye: [0, 34, 44], target: [0, 2, -10] },
  mobileEntry: { eye: [0, 26, 34], target: [0, 2, -8] },
  zones: rawZones,
};
