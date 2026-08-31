import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { useVaultStore } from '../state/vaultStore';
import { usePlayerHasMoved } from '../state/playerStore';
import { getZoneById } from '../zoneConfig';
import ZoneNav from './ZoneNav';
import ZonePanel from './ZonePanel';
import IntroDialog from './IntroDialog';
import Minimap from './Minimap';
import EnterPrompt from './EnterPrompt';

/**
 * The one-time "you can move" prompt. Shown after the briefing ends and
 * removed for good the first time the player actually walks — a control hint
 * that stays on screen after you have used the control is just clutter.
 */
const WalkHint = () => {
  const mode = useVaultStore((s) => s.mode);
  const hasMoved = usePlayerHasMoved();
  const visible = mode === 'overview' && !hasMoved;

  return (
    <AnimatePresence>
      {visible && (
        <motion.p
          key="walk-hint"
          className="pointer-events-none fixed inset-x-0 bottom-24 z-10 text-center font-body text-xs uppercase tracking-[0.2em] text-text-muted lg:bottom-12"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: [0, 1, 1, 0.55, 1] }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 2.4, times: [0, 0.15, 0.6, 0.8, 1], repeat: Infinity }}
        >
          <span className="hidden lg:inline">Use WASD, or tap the floor to walk</span>
          <span className="lg:hidden">Tap the floor to walk</span>
        </motion.p>
      )}
    </AnimatePresence>
  );
};

/** All DOM chrome for the vault: breadcrumb, skip link, guide, minimap,
 *  zone navigator and the exhibition panel. */
const VaultOverlayUI = () => {
  const activeZoneId = useVaultStore((s) => s.activeZoneId);
  const zone = activeZoneId ? getZoneById(activeZoneId) : null;

  return (
    <div className="pointer-events-none fixed inset-0 z-10">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:gap-3 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="pointer-events-auto min-w-0 rounded-full border border-border/50 bg-surface/70 px-3 py-2 backdrop-blur-xl sm:px-4"
        >
          <p className="truncate font-display text-[10px] font-semibold uppercase tracking-[0.15em] text-text-muted sm:text-xs sm:tracking-[0.2em]">
            <span className="hidden text-accent sm:inline">THE NEON VAULT </span>
            <span className="text-accent sm:hidden">VAULT</span>
            <span className="text-text-subtle"> / {zone ? zone.label : 'WORLD'}</span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="shrink-0"
        >
          <Link
            to="/shop"
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-surface/70 px-3 py-2 font-body text-xs font-medium text-text-muted backdrop-blur-xl transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg sm:gap-2 sm:px-4 sm:text-sm"
          >
            <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Skip — view products normally</span>
            <span className="sm:hidden">Skip</span>
          </Link>
        </motion.div>
      </div>

      <IntroDialog />
      <Minimap />
      <EnterPrompt />
      <WalkHint />
      <ZoneNav />
      <ZonePanel />
    </div>
  );
};

export default VaultOverlayUI;
