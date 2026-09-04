import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Check } from 'lucide-react';
import { WORLDS, getWorldState, travelTo, useWorldState } from '../state/worldStore';
import { enterWorld } from '../state/worldStore';
import { beginWorld, openGate, useVaultStore } from '../state/vaultStore';

/**
 * The choice of world — shown once on arrival, and again whenever the player
 * steps through a travel gate.
 *
 * Deliberately not a 3D scene of its own. A hub world you walk around before
 * you can reach the world you actually wanted is a corridor: it costs a
 * download and thirty seconds to answer a question that is three buttons
 * wide. The gate in each world is the diegetic part; this is the menu it
 * opens, and it opens instantly.
 *
 * Each card is painted in its own world's colours, which is the only preview
 * that matters here — you are choosing between a neon dusk, a lit counter and
 * a daylit courtyard, and the swatch says that faster than any copy could.
 */

const WorldCard = ({ world, current, onPick, index }) => {
  const p = world.palette;
  const isCurrent = current === world.id;

  return (
    <motion.button
      type="button"
      onClick={() => onPick(world.id)}
      disabled={isCurrent}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.08 + index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      whileHover={isCurrent ? undefined : { y: -4 }}
      whileTap={isCurrent ? undefined : { scale: 0.99 }}
      className="group relative flex min-h-[44px] flex-col overflow-hidden rounded-2xl border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-default"
      style={{
        borderColor: isCurrent ? p.accent : 'rgba(255,255,255,0.12)',
        // The card IS the world: its own background, its own accent. Nothing
        // else in this dialog tells you what you are about to walk into.
        background: `linear-gradient(160deg, ${p.sky.horizon} 0%, ${p.background} 60%, ${p.floor.base} 100%)`,
      }}
    >
      {/* A horizon line and a few towers — the silhouette of the world, drawn
          in CSS because a canvas per card would cost three more contexts. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
        style={{
          background: `linear-gradient(to top, ${p.floor.base} 0%, transparent 100%)`,
        }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 opacity-70"
        style={{
          bottom: '52%',
          height: 26,
          backgroundImage: `repeating-linear-gradient(90deg, ${p.city.wall} 0 7px, transparent 7px 13px, ${p.city.wall} 13px 17px, transparent 17px 28px)`,
          maskImage: 'linear-gradient(to top, #000 20%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, #000 20%, transparent 100%)',
        }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full transition-transform duration-500 group-hover:scale-110"
        style={{
          bottom: '46%',
          width: 46,
          height: 46,
          border: `2px solid ${p.portal.a}`,
          boxShadow: `0 0 22px ${p.portal.a}`,
          background: `radial-gradient(circle, ${p.portal.b}66 0%, transparent 70%)`,
        }}
      />

      <span className="relative z-10 flex flex-1 flex-col justify-end gap-1 p-4 pt-24 sm:pt-36">
        <span
          className="font-body text-[10px] font-semibold uppercase tracking-[0.24em]"
          style={{ color: p.accent }}
        >
          {world.kicker}
        </span>
        <span
          className="font-display text-lg font-bold uppercase tracking-[0.06em]"
          style={{ color: p.scheme === 'light' ? '#2b2118' : '#ffffff' }}
        >
          {world.label}
        </span>
        <span
          className="font-body text-xs leading-relaxed"
          style={{ color: p.scheme === 'light' ? '#5c4a3d' : 'rgba(255,255,255,0.72)' }}
        >
          {world.tagline}
        </span>
      </span>

      <span
        className="relative z-10 flex items-center justify-between gap-2 border-t px-4 py-2.5"
        style={{
          borderColor: p.scheme === 'light' ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.12)',
          background: p.scheme === 'light' ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.28)',
        }}
      >
        <span
          className="font-body text-[10px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: p.scheme === 'light' ? '#6b574a' : 'rgba(255,255,255,0.6)' }}
        >
          {world.zones.length} districts
        </span>
        {isCurrent ? (
          <span
            className="inline-flex items-center gap-1.5 font-body text-[10px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: p.accent }}
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            You are here
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1.5 font-body text-[10px] font-semibold uppercase tracking-[0.16em] transition-transform group-hover:translate-x-0.5"
            style={{ color: p.accent }}
          >
            Enter
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        )}
      </span>
    </motion.button>
  );
};

const WorldGate = () => {
  const mode = useVaultStore((s) => s.mode);
  const worldId = useWorldState((s) => s.worldId);
  const lastVisited = useWorldState((s) => s.lastVisited);
  const travel = useWorldState((s) => s.travel);

  const visible = mode === 'gate' && travel === 'idle';

  const pick = (id) => {
    if (getWorldState().worldId === null) {
      // First entry: nothing to travel from, so the world just loads and the
      // establishing shot plays.
      enterWorld(id);
      beginWorld();
      return;
    }
    // Coming from a gate inside a world: hand off to the travel sequence,
    // which owns the timing of the swap.
    travelTo(id);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="world-gate"
          className="pointer-events-auto fixed inset-0 z-40 flex justify-center overflow-y-auto overscroll-contain bg-bg/92 px-4 py-8 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          role="dialog"
          aria-modal="true"
          aria-label="Choose a world"
        >
          <div className="my-auto w-full max-w-4xl">
            <motion.div
              className="mb-6 text-center"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <p className="font-body text-[10px] font-semibold uppercase tracking-[0.3em] text-text-subtle">
                {worldId ? 'Travel' : 'The Neon Vault'}
              </p>
              <h1 className="mt-2 font-display text-2xl font-bold text-text sm:text-3xl">
                {worldId ? 'Where to next?' : 'Choose a world'}
              </h1>
              <p className="mx-auto mt-2 max-w-md font-body text-sm text-text-muted">
                {worldId
                  ? 'The gate is open. Step through into any of them.'
                  : 'Three floors, one building. You can move between them at any gate.'}
              </p>
            </motion.div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {WORLDS.map((world, i) => (
                <WorldCard
                  key={world.id}
                  world={world}
                  current={worldId}
                  onPick={pick}
                  index={i}
                />
              ))}
            </div>

            {/* Only offered once there is a world to go back to — at the very
                first gate there is nothing behind this dialog. */}
            {worldId && (
              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  onClick={() => beginWorld()}
                  className="min-h-[44px] rounded-xl border border-border/50 px-5 py-2.5 font-body text-xs font-medium uppercase tracking-[0.14em] text-text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Stay in {WORLDS.find((w) => w.id === worldId)?.label}
                </button>
              </div>
            )}

            {!worldId && lastVisited && (
              <p className="mt-5 text-center font-body text-[11px] uppercase tracking-[0.16em] text-text-subtle">
                Last visit: {WORLDS.find((w) => w.id === lastVisited)?.label}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export { openGate };
export default WorldGate;
