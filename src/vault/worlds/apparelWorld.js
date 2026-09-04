import { APPAREL_PALETTE } from './palettes.js';

/**
 * ATELIER — clothing.
 *
 * Same disc size as the cosmetics world so the two read as siblings, but the
 * centre is a runway rather than a mirror: a clothing floor is organised
 * around watching something move, and the middle of the world is the one
 * place every district can see.
 */

const WORLD_CENTER = [0, -8];
const WORLD_RADIUS = 22;
/* 12.5, not 11. The centre district is the biggest thing in either world —
   a 5-metre runway, a 4-metre mirror ring — and at 11 its trigger radius
   reached into its ring neighbours', so standing between them would flip
   which district you were "in" as you shuffled. check-zones asserts the
   gap; it is what caught this. */
const RING = 12.5;

const at = (angleDeg, radius) => {
  const a = (angleDeg * Math.PI) / 180;
  return [
    WORLD_CENTER[0] + Math.sin(a) * radius,
    0,
    WORLD_CENTER[1] + Math.cos(a) * radius,
  ];
};

const rawZones = [
  {
    id: 'the-runway',
    variant: 'runway',
    label: 'THE RUNWAY',
    index: 1,
    description:
      'The middle of the floor, where whatever just landed gets its walk.',
    position: [WORLD_CENTER[0], 0, WORLD_CENTER[1]],
    platformRadius: 3.4,
    accent: 'mixed',
    focusPose: {
      eye: [0, 3.4, -1.0],
      target: [0, 2.4, -8.8],
    },
    comingSoon: true,
    getProducts: () => [],
  },
  {
    id: 'outerwear',
    variant: 'rail',
    label: 'OUTERWEAR',
    index: 2,
    description: 'Coats, shells and everything built for the weather outside.',
    position: at(0, RING),
    platformRadius: 2.6,
    accent: 'clay',
    comingSoon: true,
    getProducts: () => [],
  },
  {
    id: 'denim-yard',
    variant: 'stack',
    label: 'DENIM YARD',
    index: 3,
    description: 'Raw, washed and everything folded in between.',
    position: at(90, RING),
    platformRadius: 2.4,
    accent: 'sage',
    comingSoon: true,
    getProducts: () => [],
  },
  {
    id: 'footwear',
    variant: 'footwear',
    label: 'FOOTWEAR',
    index: 4,
    description: 'One pair per plinth, lit like the objects they are.',
    position: at(180, RING),
    platformRadius: 2.5,
    accent: 'clay',
    comingSoon: true,
    getProducts: () => [],
  },
  {
    id: 'the-carry',
    variant: 'bags',
    label: 'THE CARRY',
    index: 5,
    description: 'Bags, belts and the hardware that holds an outfit together.',
    position: at(270, RING),
    platformRadius: 2.4,
    accent: 'sage',
    comingSoon: true,
    getProducts: () => [],
  },
];

export const APPAREL_WORLD = {
  id: 'apparel',
  label: 'ATELIER',
  kicker: 'CLOTHING',
  tagline: 'Rails, plinths and a courtyard to walk them in.',
  palette: APPAREL_PALETTE,
  center: WORLD_CENTER,
  radius: WORLD_RADIUS,
  spawn: [0, 0, 10],
  portal: { angle: 45, radius: 18 },
  entry: { eye: [0, 24, 30], target: [0, 2, -7] },
  mobileEntry: { eye: [0, 19, 24], target: [0, 2, -6] },
  zones: rawZones,
};
