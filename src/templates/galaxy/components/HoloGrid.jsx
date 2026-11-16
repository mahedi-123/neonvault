import { cn } from '../utils/helpers';

/**
 * Animated section backdrop: a perspective floor grid drifting toward the
 * viewer, a slow light sweep across it, and a soft horizon glow.
 *
 * Replaces the static `.grid-pattern` wallpaper that every section on the
 * home page shared. That pattern was doing the right job — giving flat
 * sections some texture — but it was identical and motionless everywhere, so
 * five stacked sections read as one very long section. This keeps the same
 * restraint (it is still just a backdrop) while giving each one a horizon of
 * its own and something quietly moving in it.
 *
 * Purely decorative and inert: aria-hidden, pointer-events-none, and all
 * motion is CSS that stops under prefers-reduced-motion.
 */
const HoloGrid = ({ className = '', tone = 'violet', flip = false }) => (
  <div
    className={cn('holo-grid pointer-events-none absolute inset-0 overflow-hidden', className)}
    data-tone={tone}
    data-flip={flip ? 'true' : undefined}
    aria-hidden="true"
  >
    <div className="holo-grid-floor" />
    <div className="holo-grid-sweep" />
    <div className="holo-grid-horizon" />
  </div>
);

export default HoloGrid;
