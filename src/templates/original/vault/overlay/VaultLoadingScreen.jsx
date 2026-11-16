import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { motion } from 'motion/react';

/** Shown while the three.js/fiber/drei chunk downloads — brand-consistent, no 3D loader. */
const VaultLoadingScreen = () => {
  const location = useLocation();
  // Same escape hatch as VaultExperience: don't stay pinned over the next
  // page if the route changed while this Suspense fallback was still up.
  if (location.pathname !== '/vault') return null;

  return createPortal(
    <div className="fixed inset-0 z-[45] flex flex-col items-center justify-center gap-6 bg-bg">
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <div className="absolute inset-0 mesh-gradient" />

      <motion.div
        className="relative font-display text-sm font-semibold uppercase tracking-[0.3em] text-text-muted"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="text-accent">ENTERING</span> THE VAULT
      </motion.div>
      <div className="relative h-px w-40 overflow-hidden bg-border/50">
        <motion.div
          className="h-full w-1/3 bg-gradient-to-r from-transparent via-accent to-transparent"
          animate={{ x: ['-120%', '340%'] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </div>,
    document.body
  );
};

export default VaultLoadingScreen;
