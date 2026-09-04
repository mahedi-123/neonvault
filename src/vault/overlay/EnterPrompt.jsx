import { AnimatePresence, motion } from 'motion/react';
import { CornerDownLeft, Orbit } from 'lucide-react';
import { getZoneById } from '../zoneConfig';
import { approachZone, openGate, useVaultStore } from '../state/vaultStore';

/**
 * The offer that appears when the courier is standing in a zone.
 *
 * Proximity used to enter the exhibit outright, which meant crossing the
 * floor kept taking the camera off the player and opening product panels
 * they had not asked for. Standing somewhere is not the same as choosing to
 * go in, so the world now asks and waits.
 *
 * Two ways to accept, both spelled out: the button, or the E key (handled in
 * useVaultKeyboard so it also works while the pointer is elsewhere). Walking
 * back out is the third answer, and needs no control at all.
 */
const EnterPrompt = () => {
  const mode = useVaultStore((s) => s.mode);
  const nearZoneId = useVaultStore((s) => s.nearZoneId);
  const nearPortal = useVaultStore((s) => s.nearPortal);
  const zone = nearZoneId ? getZoneById(nearZoneId) : null;
  // The gate wins when the courier is standing at both. Nothing is ever
  // placed close enough for that to happen today, but a prompt that silently
  // loses to another prompt is the kind of thing that only shows up after a
  // layout change, by which time nobody remembers this line.
  const showPortal = mode === 'overview' && nearPortal;
  const visible = mode === 'overview' && !!zone && !showPortal;

  return (
    <AnimatePresence>
      {showPortal && (
        <motion.div
          key="portal-prompt"
          className="pointer-events-none fixed inset-x-0 bottom-20 z-20 flex justify-center px-4 lg:bottom-10"
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.97 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="pointer-events-auto flex items-center gap-4 rounded-2xl border border-border/60 bg-surface/90 py-3 pl-5 pr-3 backdrop-blur-2xl">
            <div className="min-w-0">
              <p className="font-body text-[10px] font-semibold uppercase tracking-[0.24em] text-text-subtle">
                <span className="text-accent">GATE</span> TRANSIT
              </p>
              <p className="mt-0.5 truncate font-body text-sm text-text">
                Travel to another world?
              </p>
            </div>
            <button
              type="button"
              onClick={() => openGate()}
              className="flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl border border-accent/50 bg-accent/15 px-4 font-body text-xs font-semibold uppercase tracking-[0.14em] text-text transition-colors hover:bg-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <Orbit className="h-4 w-4" aria-hidden="true" />
              Open
              <kbd className="hidden items-center gap-1 rounded border border-border/70 bg-bg/60 px-1.5 py-0.5 font-body text-[10px] font-medium tracking-normal text-text-muted lg:inline-flex">
                <CornerDownLeft className="h-3 w-3" aria-hidden="true" />E
              </kbd>
            </button>
          </div>
        </motion.div>
      )}
      {visible && zone && (
        <motion.div
          // Keyed on the zone so moving from one exhibit straight into the
          // next re-animates rather than silently swapping the label out.
          key={zone.id}
          className="pointer-events-none fixed inset-x-0 bottom-20 z-20 flex justify-center px-4 lg:bottom-10"
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.97 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="pointer-events-auto flex items-center gap-4 rounded-2xl border border-border/60 bg-surface/90 py-3 pl-5 pr-3 backdrop-blur-2xl">
            <div className="min-w-0">
              <p className="font-body text-[10px] font-semibold uppercase tracking-[0.24em] text-text-subtle">
                <span className="text-accent">{String(zone.index).padStart(2, '0')}</span>{' '}
                {zone.label}
              </p>
              <p className="mt-0.5 truncate font-body text-sm text-text">
                Want to enter this exhibit?
              </p>
            </div>

            <button
              type="button"
              onClick={() => approachZone(zone.id)}
              className="flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl border border-accent/50 bg-accent/15 px-4 font-body text-xs font-semibold uppercase tracking-[0.14em] text-text transition-colors hover:bg-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              Enter
              {/* The key hint is desktop-only — there is no E to press on a
                  phone, and claiming otherwise is worse than saying nothing. */}
              <kbd className="hidden items-center gap-1 rounded border border-border/70 bg-bg/60 px-1.5 py-0.5 font-body text-[10px] font-medium tracking-normal text-text-muted lg:inline-flex">
                <CornerDownLeft className="h-3 w-3" aria-hidden="true" />E
              </kbd>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EnterPrompt;
