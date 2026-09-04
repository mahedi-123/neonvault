import { COSMETICS_PALETTE } from './palettes.js';

/**
 * AURA LAB — cosmetics.
 *
 * A smaller disc than the tech world on purpose. NEON VAULT is 31 units
 * across because it holds thirteen districts and wants you to feel the
 * distance; this is a counter, not a city block, and five districts spread
 * over the same ground would just be a long walk between four objects.
 *
 * One ring rather than two, for the same reason: with this few exhibits a
 * second ring hides nothing and reveals nothing, it only costs steps.
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

/* Nothing here is stocked yet — the catalogue is entirely technology. The
   districts are built and walkable anyway, which is the same bet the tech
   world's five unstocked districts make: a shop with visible room to grow
   reads better than four things in a field, and filling one later is a data
   change rather than a layout change. */
const rawZones = [
  {
    id: 'the-mirror',
    variant: 'mirror',
    label: 'THE MIRROR',
    index: 1,
    description:
      'The centre of the lab — a lit ring that shows you what everything here is for.',
    position: [WORLD_CENTER[0], 0, WORLD_CENTER[1]],
    platformRadius: 3.2,
    accent: 'mixed',
    focusPose: {
      eye: [0, 3.2, -1.4],
      target: [0, 2.6, -8.6],
    },
    comingSoon: true,
    getProducts: () => [],
  },
  {
    id: 'colour-bar',
    variant: 'lipstick',
    label: 'COLOUR BAR',
    index: 2,
    description: 'Lip, cheek and eye — the whole spectrum, laid out in a row.',
    position: at(0, RING),
    platformRadius: 2.5,
    accent: 'rose',
    comingSoon: true,
    getProducts: () => [],
  },
  {
    id: 'skin-lab',
    variant: 'serum',
    label: 'SKIN LAB',
    index: 3,
    description: 'Serums, acids and the slow work of looking after your face.',
    position: at(90, RING),
    platformRadius: 2.5,
    accent: 'gold',
    comingSoon: true,
    getProducts: () => [],
  },
  {
    id: 'fragrance-hall',
    variant: 'fragrance',
    label: 'FRAGRANCE HALL',
    index: 4,
    description: 'Scent, kept behind glass and released one bottle at a time.',
    position: at(180, RING),
    platformRadius: 2.6,
    accent: 'rose',
    comingSoon: true,
    getProducts: () => [],
  },
  {
    id: 'tool-rail',
    variant: 'brushes',
    label: 'THE TOOL RAIL',
    index: 5,
    description: 'Brushes, sponges and the instruments that do the applying.',
    position: at(270, RING),
    platformRadius: 2.4,
    accent: 'gold',
    comingSoon: true,
    getProducts: () => [],
  },
];

export const COSMETICS_WORLD = {
  id: 'cosmetics',
  label: 'AURA LAB',
  kicker: 'COSMETICS',
  tagline: 'Colour, skin and scent, under one very good light.',
  palette: COSMETICS_PALETTE,
  center: WORLD_CENTER,
  radius: WORLD_RADIUS,
  spawn: [0, 0, 10],
  portal: { angle: 45, radius: 18 },
  entry: { eye: [0, 24, 30], target: [0, 2, -7] },
  mobileEntry: { eye: [0, 19, 24], target: [0, 2, -6] },
  zones: rawZones,
};
