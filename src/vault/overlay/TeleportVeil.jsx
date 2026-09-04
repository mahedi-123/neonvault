import { AnimatePresence, motion } from 'motion/react';
import { TRAVEL_MS, useWorldState } from '../state/worldStore';
import { getWorldById } from '../worlds/index.js';

/**
 * What a teleport looks like.
 *
 * The veil exists for one unglamorous reason: the scene cannot cross-fade
 * between worlds. Two worlds mean two sets of lights, two skies and two
 * floors, and holding both in the graph long enough to blend them would cost
 * a second of stutter on exactly the devices that can least afford it. So
 * the swap is instant and hidden, and this is what hides it.
 *
 * Three beats, timed off the same TRAVEL_MS the world store uses so the
 * flash lands on the frame the world actually changes:
 *
 *   charge  — an iris closes in from the edges in the world you are leaving
 *   flash   — full white; the scene is rebuilt behind it
 *   arrive  — the iris opens again in the colours of where you landed
 *
 * The colours come from the two palettes, so leaving the tech world is a
 * violet collapse and arriving in the cosmetics one is a blush bloom. A
 * single white wipe both ways would read as a page load.
 */
const TeleportVeil = () => {
  const travel = useWorldState((s) => s.travel);
  const worldId = useWorldState((s) => s.worldId);
  const pendingWorldId = useWorldState((s) => s.pendingWorldId);

  const active = travel !== 'idle';
  // During 'charging' the player is still in the old world; from 'flash'
  // onward `worldId` is already the destination.
  const from = getWorldById(worldId ?? 'tech').palette;
  const to = getWorldById(pendingWorldId ?? worldId ?? 'tech').palette;
  const tint = travel === 'charging' ? from : to;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="teleport"
          className="pointer-events-none fixed inset-0 z-[60]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          aria-hidden="true"
        >
          {/* The iris. A radial gradient whose transparent middle shrinks to
              nothing, which reads as the world closing around you rather than
              as a rectangle fading in. */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 50% 50%, transparent 0%, transparent 22%, ${tint.portal.a}55 46%, ${tint.background} 78%)`,
            }}
            initial={{ scale: 2.6, opacity: 0 }}
            animate={
              travel === 'charging'
                ? { scale: 1, opacity: 1 }
                : travel === 'flash'
                  ? { scale: 0.35, opacity: 1 }
                  : { scale: 2.8, opacity: 0 }
            }
            transition={{
              duration:
                (travel === 'charging'
                  ? TRAVEL_MS.charge
                  : travel === 'flash'
                    ? TRAVEL_MS.flash
                    : TRAVEL_MS.arrive) / 1000,
              ease: travel === 'arriving' ? [0.16, 1, 0.3, 1] : [0.7, 0, 0.84, 0],
            }}
          />

          {/* The flash itself. Only fully opaque for the beat the world is
              being rebuilt — long enough to hide the swap, short enough that
              it reads as a transition and not as a loading screen. */}
          <motion.div
            className="absolute inset-0"
            style={{ background: tint.scheme === 'light' ? '#ffffff' : '#f2ecff' }}
            initial={{ opacity: 0 }}
            animate={{
              opacity: travel === 'flash' ? 1 : travel === 'charging' ? 0.08 : 0,
            }}
            transition={{ duration: travel === 'flash' ? 0.14 : 0.4 }}
          />

          {/* Streaks pulling toward the middle — the cue that this is travel
              with a direction, not a dissolve. */}
          {travel !== 'arriving' && (
            <div className="absolute inset-0 overflow-hidden">
              {Array.from({ length: 14 }).map((_, i) => {
                const angle = (i / 14) * 360;
                return (
                  <motion.span
                    key={i}
                    className="absolute left-1/2 top-1/2 origin-left"
                    style={{
                      width: '52%',
                      height: 2,
                      transform: `rotate(${angle}deg)`,
                      background: `linear-gradient(to right, transparent, ${tint.portal.b})`,
                    }}
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: [0, 0.9, 0] }}
                    transition={{
                      duration: 0.6,
                      delay: (i % 5) * 0.05,
                      repeat: Infinity,
                      ease: 'easeIn',
                    }}
                  />
                );
              })}
            </div>
          )}

          <AnimatePresence>
            {travel === 'arriving' && (
              <motion.p
                className="absolute inset-x-0 bottom-24 text-center font-display text-sm font-bold uppercase tracking-[0.3em]"
                style={{ color: tint.accent }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: [0, 1, 1, 0], y: 0 }}
                transition={{ duration: TRAVEL_MS.arrive / 1000, times: [0, 0.2, 0.7, 1] }}
              >
                {getWorldById(worldId ?? 'tech').label}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TeleportVeil;
