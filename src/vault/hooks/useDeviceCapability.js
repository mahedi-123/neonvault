import { useEffect, useState } from 'react';

function detectWebGL() {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return !!gl;
  } catch {
    return false;
  }
}

function computeCapability() {
  if (typeof window === 'undefined') {
    return { supported: false, reason: 'ssr', isTouch: false };
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pointerFine = window.matchMedia('(pointer: fine)').matches;
  const webgl = detectWebGL();
  const lowTier = (navigator.hardwareConcurrency || 4) <= 2;

  let reason = null;
  if (!webgl) reason = 'no-webgl';
  else if (reducedMotion) reason = 'reduced-motion';
  else if (lowTier) reason = 'low-tier';

  return {
    supported: webgl && !reducedMotion && !lowTier,
    reason,
    isTouch: !pointerFine,
  };
}

/**
 * Synchronous, zero-download capability check. Must resolve before the 3D
 * bundle is ever dynamically imported — devices that fail this never pay for
 * the three.js/fiber/drei download.
 */
export function useDeviceCapability() {
  const [capability, setCapability] = useState(computeCapability);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const recompute = () => setCapability(computeCapability());
    mq.addEventListener('change', recompute);
    return () => mq.removeEventListener('change', recompute);
  }, []);

  return capability;
}
