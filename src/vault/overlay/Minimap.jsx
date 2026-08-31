import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { WORLD_CENTER, WORLD_RADIUS, zones } from '../zoneConfig';
import { player, walkToZone } from '../state/playerStore';
import { useVaultStore } from '../state/vaultStore';

const [CX, CZ] = WORLD_CENTER;

/** World (x, z) → the map's -1..1 viewBox. */
const toMap = (x, z) => [(x - CX) / WORLD_RADIUS, (z - CZ) / WORLD_RADIUS];

/**
 * The floor plan. Two jobs: tell the player where they are on a floor whose
 * far side is behind them, and let them jump straight to a zone they can see
 * but have not walked to yet.
 *
 * The player dot is written with setAttribute inside a rAF loop rather than
 * through React state — it moves every frame, and re-rendering the overlay at
 * frame rate would make the whole DOM chrome the most expensive thing on
 * screen. The dots that don't move stay ordinary JSX.
 */
const Minimap = () => {
  const dotRef = useRef(null);
  const headingRef = useRef(null);
  const mode = useVaultStore((s) => s.mode);
  const nearZoneId = useVaultStore((s) => s.nearZoneId);
  const visible = mode === 'overview' || mode === 'intro';

  useEffect(() => {
    if (!visible) return undefined;
    let raf = 0;
    const tick = () => {
      const dot = dotRef.current;
      if (dot) {
        const [mx, my] = toMap(player.position.x, player.position.z);
        dot.setAttribute('cx', String(mx));
        dot.setAttribute('cy', String(my));
        const cone = headingRef.current;
        if (cone) {
          // Map Y grows with world +Z, so the heading needs no sign flip —
          // but it does need converting from "radians about Y" to SVG degrees.
          const deg = (player.heading * 180) / Math.PI;
          cone.setAttribute(
            'transform',
            `translate(${mx} ${my}) rotate(${-deg})`
          );
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  const nearZone = nearZoneId ? zones.find((z) => z.id === nearZoneId) : null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="minimap"
          className="pointer-events-none fixed bottom-4 left-4 z-10 hidden lg:block"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.4 }}
        >
          <div className="pointer-events-auto rounded-2xl border border-border/50 bg-surface/70 p-3 backdrop-blur-xl">
            <svg viewBox="-1.12 -1.12 2.24 2.24" className="h-36 w-36" role="img" aria-label="Vault floor plan">
              {/* Floor */}
              <circle cx="0" cy="0" r="1" fill="rgba(139,92,246,0.07)" stroke="rgba(139,92,246,0.35)" strokeWidth="0.014" />
              <circle cx="0" cy="0" r="0.62" fill="none" stroke="rgba(139,92,246,0.16)" strokeWidth="0.01" />
              <circle cx="0" cy="0" r="0.28" fill="none" stroke="rgba(139,92,246,0.16)" strokeWidth="0.01" />

              {/* Zones — clickable, so the map doubles as fast travel */}
              {zones.map((zone) => {
                const [zx, zy] = toMap(zone.position[0], zone.position[2]);
                const isNear = zone.id === nearZoneId;
                return (
                  <g key={zone.id} className="cursor-pointer">
                    <circle
                      cx={zx}
                      cy={zy}
                      r={isNear ? 0.075 : 0.05}
                      fill={zone.accent === 'cyan' ? '#22d3ee' : '#8b5cf6'}
                      opacity={isNear ? 1 : 0.75}
                    />
                    {/* Oversized invisible hit target — the visible dots are
                        far too small to click reliably at this scale. */}
                    <circle
                      cx={zx}
                      cy={zy}
                      r="0.14"
                      fill="transparent"
                      onClick={() => walkToZone(zone.id)}
                    >
                      <title>{`Walk to ${zone.label}`}</title>
                    </circle>
                  </g>
                );
              })}

              {/* Player: facing cone under a bright dot */}
              <polygon
                ref={headingRef}
                points="0,-0.19 -0.075,0.05 0.075,0.05"
                fill="#e6f9ff"
                opacity="0.5"
              />
              <circle ref={dotRef} cx="0" cy="0" r="0.055" fill="#ffffff" />
            </svg>

            <p className="mt-2 text-center font-body text-[10px] font-semibold uppercase tracking-[0.22em] text-text-subtle">
              {nearZone ? (
                <span className="text-accent-secondary">{nearZone.label}</span>
              ) : (
                'Navigate'
              )}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Minimap;
