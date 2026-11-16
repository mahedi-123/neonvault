/**
 * How much machine we think we are running on.
 *
 * Two tiers, decided once per page load:
 *
 *   'full' — everything: per-exhibit lighting, the whole skyline, antialiasing,
 *            full device pixel ratio, every decorative animation.
 *   'lite' — the same world, cheaper: a handful of scene lights instead of
 *            forty, a smaller city, no antialiasing, capped resolution, and
 *            no backdrop blur or infinite background animations in the DOM.
 *
 * Nothing here is a guess about *brand*. The signals are the ones the platform
 * actually exposes, and every one of them can be wrong — which is why the
 * vault also watches its own frame rate at runtime (QualityGovernor) and drops
 * resolution when the numbers disagree with this estimate. This is the
 * starting point, not the verdict.
 */

export const TIER_FULL = 'full';
export const TIER_LITE = 'lite';

/** ?quality=lite / ?quality=full — an escape hatch for testing either path. */
function forcedTier() {
  try {
    const value = new URLSearchParams(window.location.search).get('quality');
    return value === TIER_LITE || value === TIER_FULL ? value : null;
  } catch {
    return null;
  }
}

function detectTier() {
  if (typeof window === 'undefined') return TIER_FULL;

  const forced = forcedTier();
  if (forced) return forced;

  // Chrome-only, absent elsewhere; the fallbacks are deliberately optimistic
  // so a browser that reports nothing is not punished for it.
  const cores = navigator.hardwareConcurrency || 8;
  const memory = navigator.deviceMemory || 8;

  // The user explicitly asked for less data/effort. Honour it.
  if (navigator.connection?.saveData) return TIER_LITE;

  // Four cores or 4GB is the rough line under which a fragment-heavy scene
  // stops holding 60fps. Phones frequently land here — including fast ones,
  // which is fine: lite still looks like the same world, and the frame-rate
  // governor gives resolution back when the device turns out to cope.
  if (cores <= 4 || memory <= 4) return TIER_LITE;

  return TIER_FULL;
}

let tier = null;

export function getTier() {
  if (tier === null) tier = detectTier();
  return tier;
}

export const isLite = () => getTier() === TIER_LITE;

/**
 * Publish the tier to CSS as `<html data-quality="lite">`.
 *
 * The DOM half of the site has its own costs that have nothing to do with
 * WebGL — 39 backdrop-blurred surfaces and a handful of never-ending
 * background animations — and those are most cheaply switched off in a
 * stylesheet rather than by re-rendering React.
 */
export function applyQualityAttribute() {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.quality = getTier();
}
