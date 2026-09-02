import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

/** Sampling window. Long enough to ride out a shader compile or a GC pause,
 *  short enough that a struggling device is rescued within a couple of seconds. */
const WINDOW_MS = 1500;
/** Below this, give back pixels. Above it, the device has headroom to spare. */
const FLOOR_FPS = 40;
const CEILING_FPS = 56;
/** Never go below this fraction of the device's own pixel ratio. */
const MIN_SCALE = 0.55;
const STEP = 0.15;

/**
 * Keeps the frame rate honest by trading resolution for it.
 *
 * The static tier (src/lib/quality.js) is an estimate from what the browser
 * will admit about the hardware, and it is wrong in both directions all the
 * time: a fast phone under-reports its cores, a cheap laptop over-reports
 * them, and either way a hot device throttles halfway through a session.
 * So the scene measures what it actually gets and adjusts.
 *
 * Resolution is the only dial this touches, deliberately. It is the biggest
 * single lever on a fill-rate-bound scene, it is free to change at any
 * moment, and — unlike removing lights or objects — it never triggers a
 * shader recompile, which would itself cause the stutter this is trying to
 * prevent. Anything structural is decided once, up front.
 */
const QualityGovernor = ({ maxDpr }) => {
  const setDpr = useThree((state) => state.setDpr);
  const frames = useRef(0);
  const elapsed = useRef(0);
  const scale = useRef(1);
  /** Skip the first window: mount, shader compilation and texture upload all
   *  land in it, and judging the device by its worst second is unfair. */
  const warmup = useRef(true);

  useFrame((_, delta) => {
    frames.current += 1;
    elapsed.current += delta * 1000;
    if (elapsed.current < WINDOW_MS) return;

    const fps = (frames.current * 1000) / elapsed.current;
    frames.current = 0;
    elapsed.current = 0;

    if (warmup.current) {
      warmup.current = false;
      return;
    }

    let next = scale.current;
    if (fps < FLOOR_FPS) next = Math.max(MIN_SCALE, scale.current - STEP);
    // Only climb back while comfortably clear of the floor, so a device
    // hovering at the boundary settles instead of oscillating between two
    // resolutions every second and a half.
    else if (fps > CEILING_FPS && scale.current < 1) next = Math.min(1, scale.current + STEP);

    if (next !== scale.current) {
      scale.current = next;
      setDpr(maxDpr * next);
    }
  });

  return null;
};

export default QualityGovernor;
