/**
 * A world's colour, in one object.
 *
 * Every hex the 3D scene draws with used to be written into whichever
 * component happened to need it, which was fine while there was one world and
 * impossible the moment there were three. A palette is the whole visual
 * identity of a world: sky, haze, ground, city, shield, lighting and the
 * courier's own trim. Swapping it is what turns neon dusk into daylight.
 *
 * `scheme` is not decoration — it flips real decisions elsewhere. A light
 * world needs a brighter ambient floor, weaker emissive (neon on white reads
 * as a smudge), a darker HUD, and additive effects dialled back, because
 * additive blending on a pale background does nothing at all.
 */

/** Shared shape, documented once rather than repeated in each palette. */
export const PALETTE_KEYS = [
  'scheme',
  'accent',
  'accentSecondary',
  'background',
  'sky',
  'fog',
  'floor',
  'city',
  'barrier',
  'lights',
  'courier',
  'portal',
  'exposure',
  'structure',
  'emissive',
  'dais',
];

export const TECH_PALETTE = {
  scheme: 'dark',
  accent: '#8b5cf6',
  accentSecondary: '#22d3ee',
  background: '#191140',
  exposure: 1.3,
  sky: { zenith: '#150f2f', horizon: '#4a2b80', ground: '#153048' },
  fog: { color: '#2a1e52', density: 0.0062 },
  floor: {
    base: '#1a1436',
    ring: '#8b5cf6',
    grid: '#22d3ee',
    rim: '#8b5cf6',
  },
  city: {
    wall: '#2b2058',
    windowA: '#22d3ee',
    windowB: '#b98cff',
    haze: '#2a1e52',
    ground: '#1b1440',
    beacon: '#ff6ba8',
  },
  barrier: { a: '#22d3ee', b: '#8b5cf6' },
  lights: {
    hemiSky: '#9484d8',
    hemiGround: '#1e3149',
    hemiIntensity: 1.15,
    keyColor: '#d8cbff',
    keyIntensity: 1.0,
    rimColor: '#9fe1f2',
    rimIntensity: 0.85,
  },
  courier: { shell: '#1b1526', trim: '#2c2140', visor: '#22d3ee', cloak: '#8b5cf6' },
  portal: { a: '#22d3ee', b: '#8b5cf6', frame: '#2c2140' },
  /* The non-emissive bodies of everything built: lamp posts, arches, banner
     poles, transit pylons. Named rather than derived because a world's
     architecture is an art decision, not a tint of its floor. */
  structure: { body: '#2e2450', deep: '#1e1738', light: '#3a2d63', edge: '#241b45' },
  /* The two tiers of every district's dais. */
  dais: { base: '#050409', top: '#0b0a0f' },
  /* How hard emissive materials are driven. Neon at full strength on a pale
     surface reads as a smudge rather than a light, so the daylight worlds
     pull it back by more than half. */
  emissive: 1,
};

/**
 * AURA LAB — cosmetics. Porcelain, blush and champagne.
 *
 * The brief for the new worlds was "light", but light is not the same as
 * white: a fully white world has no depth cues at all and the courier reads
 * as a sticker on a page. So the ground is warm porcelain, the sky carries a
 * blush gradient, and the shadows are a cool grey-lilac — enough separation
 * to see form, nowhere near the tech world's contrast.
 */
export const COSMETICS_PALETTE = {
  scheme: 'light',
  accent: '#e0679a',
  accentSecondary: '#e8a33d',
  background: '#f3dfe6',
  // Pale worlds blow out fast; the tech world's 1.3 turns this one to paper.
  exposure: 1.05,
  sky: { zenith: '#a9c8e8', horizon: '#ffd7e2', ground: '#fff0e2' },
  fog: { color: '#fbdfe6', density: 0.0052 },
  floor: {
    base: '#f7e9ec',
    ring: '#e0679a',
    grid: '#d8a2b8',
    rim: '#e8a33d',
  },
  city: {
    wall: '#f0dfe4',
    windowA: '#e8a33d',
    windowB: '#e0679a',
    haze: '#fbdfe6',
    ground: '#efdde2',
    beacon: '#e0679a',
  },
  barrier: { a: '#e0679a', b: '#e8a33d' },
  lights: {
    hemiSky: '#fff3f6',
    hemiGround: '#d8bfc8',
    hemiIntensity: 2.1,
    keyColor: '#fff6ec',
    keyIntensity: 1.5,
    rimColor: '#ffd7e2',
    rimIntensity: 0.7,
  },
  courier: { shell: '#f3e6ea', trim: '#e6ccd6', visor: '#e0679a', cloak: '#e8a33d' },
  portal: { a: '#e0679a', b: '#e8a33d', frame: '#e6ccd6' },
  structure: { body: '#efe0e6', deep: '#dcc4d0', light: '#fbf1f4', edge: '#e6d2da' },
  dais: { base: '#d9c3cc', top: '#eddfe4' },
  emissive: 0.42,
};

/**
 * ATELIER — clothing. Sandstone, terracotta and sage.
 *
 * Warmer and drier than the cosmetics world so the two never read as the same
 * place with a hue shift: this one is a daylit courtyard, that one is a lit
 * counter. Sage is doing the work the cyan does in the tech world — the cool
 * note that stops an all-warm palette going flat.
 */
export const APPAREL_PALETTE = {
  scheme: 'light',
  accent: '#c96442',
  accentSecondary: '#6f9484',
  background: '#eadcc6',
  exposure: 1.05,
  sky: { zenith: '#9fc0da', horizon: '#f6e2c4', ground: '#e6d6bb' },
  fog: { color: '#eee0c8', density: 0.0052 },
  floor: {
    base: '#efe3d0',
    ring: '#c96442',
    grid: '#c2ab8c',
    rim: '#6f9484',
  },
  city: {
    wall: '#e5d5bb',
    windowA: '#c96442',
    windowB: '#6f9484',
    haze: '#eee0c8',
    ground: '#e3d3b8',
    beacon: '#c96442',
  },
  barrier: { a: '#6f9484', b: '#c96442' },
  lights: {
    hemiSky: '#fff8ec',
    hemiGround: '#cbb99a',
    hemiIntensity: 2.0,
    keyColor: '#fff4e2',
    keyIntensity: 1.55,
    rimColor: '#cfe3ea',
    rimIntensity: 0.65,
  },
  courier: { shell: '#ece0cd', trim: '#d6c3a5', visor: '#c96442', cloak: '#6f9484' },
  portal: { a: '#6f9484', b: '#c96442', frame: '#d6c3a5' },
  structure: { body: '#e8dac2', deep: '#d0bb99', light: '#f6ecd9', edge: '#dccdb2' },
  dais: { base: '#cdb894', top: '#e7dac0' },
  emissive: 0.45,
};
