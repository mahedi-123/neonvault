import { AnimatePresence, motion } from 'motion/react';
import { Hand, Keyboard, MousePointer2, Pointer } from 'lucide-react';
import {
  SCHEME_CLASSIC,
  SCHEME_DRAG,
  chooseScheme,
  closeControlPicker,
  useControls,
} from '../state/controlStore';
import { useVaultStore } from '../state/vaultStore';

/**
 * How do you want to move?
 *
 * Asked once, on the way in, because the two schemes want the same gesture
 * and guessing wrong is worse than asking: a drag either steers the courier
 * or turns the camera, and a player who expected the other one concludes the
 * controls are broken rather than that there are two of them.
 *
 * The wording changes with the device — "hold and drag" means a thumb on a
 * phone and a held mouse button on a desktop, and neither reader should have
 * to translate the other one's instructions.
 */
const ControlPicker = ({ isTouch = false }) => {
  const mode = useVaultStore((s) => s.mode);
  const scheme = useControls((s) => s.scheme);
  const remembered = useControls((s) => s.remembered);
  const pickerOpen = useControls((s) => s.pickerOpen);

  // Never over the briefing, and never over an open exhibition panel.
  const visible = mode === 'overview' && (scheme === null || pickerOpen);

  const options = [
    {
      id: SCHEME_DRAG,
      Icon: isTouch ? Hand : MousePointer2,
      title: isTouch ? 'Touch & Drag' : 'Mouse Drag',
      lead: isTouch
        ? 'Hold anywhere and slide your finger.'
        : 'Hold the left button and pull.',
      detail: isTouch
        ? 'The courier walks the way you pull. Further out runs faster; keep it close to walk. A second finger looks around.'
        : 'The courier walks the way you pull. Further out runs faster; keep it close to walk. Right-drag looks around.',
    },
    {
      id: SCHEME_CLASSIC,
      Icon: isTouch ? Pointer : Keyboard,
      title: isTouch ? 'Tap to Walk' : 'Keyboard',
      lead: isTouch ? 'Tap a spot on the floor.' : 'WASD or the arrow keys.',
      detail: isTouch
        ? 'The courier walks over to wherever you tapped. Drag to look around.'
        : 'Hold Shift to run. Drag to look around, and you can still tap the floor to walk there.',
    },
  ];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="control-picker"
          className="pointer-events-auto fixed inset-0 z-30 flex items-end justify-center bg-bg/45 px-4 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop-blur-[2px] sm:items-center sm:py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          role="dialog"
          aria-modal="true"
          aria-label="Choose how to move"
        >
          <motion.div
            // Capped and scrollable: two stacked option cards are taller than
            // a short laptop window, and a dialog whose heading has scrolled
            // off the top of the screen is a dialog nobody can read.
            className="max-h-[86dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-2xl border border-border/60 bg-surface/95 p-5 backdrop-blur-2xl sm:p-6"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="font-body text-[10px] font-semibold uppercase tracking-[0.24em] text-text-subtle">
              Controls
            </p>
            <h2 className="mt-1 font-display text-lg font-bold text-text sm:text-xl">
              How do you want to move?
            </h2>
            <p className="mt-1 font-body text-xs text-text-muted">
              You can change this any time from the controls button.
            </p>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {options.map(({ id, Icon, title, lead, detail }, i) => (
                <motion.button
                  key={id}
                  type="button"
                  onClick={() => chooseScheme(id)}
                  autoFocus={i === 0 && !remembered}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.1 + i * 0.07 }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.985 }}
                  className="group relative flex min-h-[44px] flex-col gap-2 rounded-xl border border-border/60 bg-bg/50 p-4 text-left transition-colors hover:border-accent/60 hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                >
                  {remembered === id && (
                    <span className="absolute right-3 top-3 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 font-body text-[9px] font-semibold uppercase tracking-[0.14em] text-accent">
                      Last used
                    </span>
                  )}
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/40 bg-accent/10 text-accent transition-colors group-hover:bg-accent/20">
                    <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                  </span>
                  <span className="font-display text-sm font-bold uppercase tracking-[0.08em] text-text">
                    {title}
                  </span>
                  <span className="font-body text-xs font-medium text-accent-secondary">{lead}</span>
                  <span className="font-body text-xs leading-relaxed text-text-muted">{detail}</span>
                </motion.button>
              ))}
            </div>

            {/* Only offered once there is something to fall back to — a first
                visit has no remembered choice to dismiss down onto. */}
            {(scheme || remembered) && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => closeControlPicker()}
                  className="min-h-[44px] rounded-lg px-3 py-2 font-body text-xs font-medium uppercase tracking-[0.12em] text-text-subtle transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                >
                  Keep current
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ControlPicker;
