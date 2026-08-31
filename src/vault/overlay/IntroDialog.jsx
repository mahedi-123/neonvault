import { AnimatePresence, motion } from 'motion/react';
import { INTRO_STEPS, finishIntro, nextIntroStep, useVaultStore } from '../state/vaultStore';

/**
 * The guide. A short stepped briefing that runs once, on arrival, before the
 * player is handed the controls — the same job the concierge does on a
 * physical showroom floor: say what this place is, then get out of the way.
 *
 * Deliberately skippable from the first frame. A tour you cannot skip is a
 * wall in front of the products, and returning visitors have seen it.
 */
const IntroDialog = () => {
  const mode = useVaultStore((s) => s.mode);
  const step = useVaultStore((s) => s.introStep);
  const visible = mode === 'intro';
  const isLast = step === INTRO_STEPS.length - 1;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="intro"
          className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex flex-col items-center gap-4 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-10"
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 18 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="pointer-events-auto w-full max-w-xl rounded-2xl border border-border/60 bg-surface/90 p-5 backdrop-blur-2xl sm:p-6">
            <div className="flex items-start gap-4">
              {/* Guide mark — the courier's visor, rendered flat so the
                  speaker in the dialog is visibly the figure on the floor. */}
              <div
                className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent/40 bg-accent/10"
                aria-hidden="true"
              >
                <span className="block h-1.5 w-6 rounded-full bg-accent-secondary shadow-[0_0_12px_rgba(34,211,238,0.9)]" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="mb-1.5 font-body text-[10px] font-semibold uppercase tracking-[0.24em] text-text-subtle">
                  Vault Courier
                </p>
                {/* Keyed on step so each line animates in as its own beat
                    rather than the text swapping under a static card. */}
                <AnimatePresence mode="wait">
                  <motion.p
                    key={step}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.22 }}
                    className="font-body text-sm leading-relaxed text-text sm:text-base"
                  >
                    {INTRO_STEPS[step]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5" aria-hidden="true">
                {INTRO_STEPS.map((_, i) => (
                  <span
                    key={i}
                    className={
                      i === step
                        ? 'h-1 w-5 rounded-full bg-accent transition-all duration-300'
                        : 'h-1 w-1.5 rounded-full bg-border transition-all duration-300'
                    }
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => finishIntro()}
                  className="rounded-lg px-3 py-2 font-body text-xs font-medium uppercase tracking-[0.12em] text-text-subtle transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={() => nextIntroStep()}
                  autoFocus
                  className="min-h-[44px] rounded-xl border border-accent/50 bg-accent/15 px-5 py-2.5 font-body text-xs font-semibold uppercase tracking-[0.14em] text-text transition-colors hover:bg-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                >
                  {isLast ? "Let's go" : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IntroDialog;
