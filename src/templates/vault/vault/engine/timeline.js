/**
 * Scroll timeline for the vault, measured in "screens" (1 unit = 1 viewport
 * height of scroll). Every part of the experience — camera, logo ring, DOM
 * overlays, audio — reads its progress from these numbers, so retiming a
 * section only ever means editing this file.
 */
export const T = {
  INTRO_END: 0.9,      // logo ring alone, "scroll down"
  DESCENT_END: 5.0,    // falling through the particle forest
  HERO_IN: 4.6,        // forest clears, ring grows, hero copy fades in
  HERO_OUT: 6.9,       // hero copy leaves
  DIVE_END: 7.7,       // camera has dived down to the spine
  PRODUCTS_START: 8.0, // first card is centred here
  STEP: 0.8,           // scroll per product card
  OUTRO: 1.5,          // tail after the last card (shop CTA)
};

export const totalUnits = (count) =>
  T.PRODUCTS_START + Math.max(0, count - 1) * T.STEP + T.OUTRO;

export const unitForCard = (i) => T.PRODUCTS_START + i * T.STEP;

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const seg = (s, a, b) => clamp01((s - a) / (b - a));
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const lerp = (a, b, t) => a + (b - a) * t;

/** Raw (continuous) card index for a scroll position. */
export const rawCardIndex = (s, count) =>
  Math.min(Math.max((s - T.PRODUCTS_START) / T.STEP, 0), Math.max(0, count - 1));

/** Card index with a soft magnet toward whole numbers, so cards settle. */
export const magnetIndex = (raw) => {
  const i = Math.floor(raw);
  const f = raw - i;
  const sm = f * f * (3 - 2 * f);
  return i + lerp(f, sm, 0.75);
};

/** Opacity factors for the DOM layers. */
export const sectionFactors = (s, count) => {
  const intro = 1 - seg(s, 0.15, T.INTRO_END);
  const hero = seg(s, T.HERO_IN + 0.5, T.HERO_IN + 1.1) * (1 - seg(s, T.HERO_OUT - 0.5, T.HERO_OUT));
  const products = seg(s, T.DIVE_END - 0.3, T.PRODUCTS_START);
  const lastCard = unitForCard(Math.max(0, count - 1));
  const outro = seg(s, lastCard + 0.45, lastCard + 1.1);
  return { intro, hero, products: products * (1 - outro), outro };
};
