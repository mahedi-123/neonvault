import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { zones } from '../zoneConfig';
import { setHovered, useVaultStore } from '../state/vaultStore';
import { walkToZone } from '../state/playerStore';
import { useMagnetic } from '../../lib/motion';
import { cn } from '../../utils/helpers';

const NavItem = ({ zone, active, hovered, magnetic }) => {
  const { ref, style, handlers } = useMagnetic({ strength: 0.2, max: 8, enabled: magnetic });

  return (
    <motion.div ref={ref} style={style} {...handlers}>
      <button
        type="button"
        onClick={() => walkToZone(zone.id)}
        onMouseEnter={() => setHovered(zone.id)}
        onMouseLeave={() => setHovered(null)}
        className={cn(
          'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          active || hovered ? 'bg-surface-hover text-text' : 'text-text-muted hover:text-text'
        )}
      >
        <span
          className={cn(
            'font-body text-[10px] tracking-[0.1em] tabular-nums transition-colors',
            active ? 'text-accent' : 'text-text-subtle group-hover:text-text-muted'
          )}
        >
          {String(zone.index).padStart(2, '0')}
        </span>
        <span className="whitespace-nowrap font-body text-xs font-medium uppercase tracking-[0.12em]">{zone.label}</span>
        <span
          className={cn(
            'ml-auto h-1 w-1 rounded-full transition-all duration-300',
            active ? 'scale-150 bg-accent' : hovered ? 'bg-text-muted' : 'bg-transparent'
          )}
        />
      </button>
    </motion.div>
  );
};

/**
 * The World Navigator — the authoritative, always-present accessible control
 * for reaching a zone. Real keyboard-operable <button> elements; tapping the
 * exhibit itself is a redundant second way to trigger the same walk.
 *
 * These no longer jump the camera. They send the courier walking to that
 * zone's approach mark, and the exhibit opens on arrival like any other —
 * one way for the world to work, whether you point at the floor, pick from
 * this list, or tab to it with a keyboard. The walk is flagged with the
 * destination's id so exhibits crossed on the way don't hijack the trip.
 *
 * Desktop: a quiet numbered index docked to the side. Mobile: a horizontal,
 * swipeable strip of tap targets — no hover dependency either way.
 */
const ZoneNav = () => {
  const prefersReducedMotion = useReducedMotion();
  const mode = useVaultStore((s) => s.mode);
  const hoveredZoneId = useVaultStore((s) => s.hoveredZoneId);
  const activeZoneId = useVaultStore((s) => s.activeZoneId);
  const visible = mode === 'overview';

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Desktop: vertical index docked to the right edge */}
          <motion.nav
            key="world-nav-desktop"
            aria-label="Explore vault zones"
            className="pointer-events-auto fixed right-4 top-1/2 z-10 hidden max-h-[80vh] w-60 -translate-y-1/2 lg:block"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.4 }}
          >
            <div className="rounded-2xl border border-border/50 bg-surface/60 p-2 backdrop-blur-xl">
              <p className="px-3 pb-2 pt-1.5 font-body text-[10px] font-semibold uppercase tracking-[0.24em] text-text-subtle">
                World
              </p>
              <div className="max-h-[62vh] space-y-0.5 overflow-y-auto overscroll-contain pr-0.5 [scrollbar-width:thin]">
                {zones.map((zone) => (
                  <NavItem
                    key={zone.id}
                    zone={zone}
                    active={activeZoneId === zone.id}
                    hovered={hoveredZoneId === zone.id}
                    magnetic={!prefersReducedMotion}
                  />
                ))}
              </div>
            </div>
          </motion.nav>

          {/* Mobile: horizontal guided strip, no hover state needed. Edge
              fades hint there's more to scroll to rather than the strip
              looking like it's just cut off; scroll-snap keeps each tap
              landing on a settled, fully-legible pill. */}
          <motion.nav
            key="world-nav-mobile"
            aria-label="Explore vault zones"
            className="pointer-events-auto fixed inset-x-0 bottom-0 z-10 w-full overflow-hidden lg:hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.4 }}
          >
            <div
              className="[mask-image:linear-gradient(to_right,transparent_0,black_20px,black_calc(100%-20px),transparent_100%)]"
            >
              <div className="flex w-full snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {zones.map((zone) => (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => walkToZone(zone.id)}
                    className={cn(
                      'flex min-h-[44px] shrink-0 snap-center items-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2.5 font-body text-xs font-medium uppercase tracking-[0.12em] backdrop-blur-xl transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                      activeZoneId === zone.id
                        ? 'border-accent/50 bg-accent/15 text-text'
                        : 'border-border/50 bg-surface/70 text-text-muted'
                    )}
                  >
                    <span className="text-text-subtle">{String(zone.index).padStart(2, '0')}</span>
                    {zone.label}
                  </button>
                ))}
                {/* Trailing spacer so the last pill can reach snap-center
                    instead of stopping flush against the screen edge. */}
                <div className="w-px shrink-0" aria-hidden="true" />
              </div>
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  );
};

export default ZoneNav;
