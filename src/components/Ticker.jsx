import { cn } from '../utils/helpers';

/**
 * An edge-to-edge scrolling strip of short phrases, in the spirit of a
 * departures board or a stock crawl.
 *
 * Two jobs. It breaks up a home page that was five near-identical stacked
 * sections, and it is the one piece of page furniture that is always moving,
 * which is most of what makes a static layout read as a live system.
 *
 * The item list is rendered twice and the track translated by exactly -50%,
 * so the second copy arrives precisely where the first began and the loop has
 * no seam. Anything else — a gap, a fade, an odd multiple — shows a visible
 * jump once a cycle.
 */
const Ticker = ({ items, className = '', reverse = false, speed = 34 }) => {
  if (!items?.length) return null;

  return (
    <div
      className={cn(
        'ticker relative w-full overflow-hidden border-y border-border/50 bg-bg/60 py-3',
        // Edges fade rather than cut, so items enter and leave rather than
        // popping in at a hard boundary.
        '[mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]',
        className
      )}
      aria-hidden="true"
    >
      <div
        className={cn('ticker-track flex w-max items-center gap-10 px-5', reverse && 'ticker-track-reverse')}
        style={{ '--ticker-duration': `${speed}s` }}
      >
        {[0, 1].map((copy) => (
          <div key={copy} className="flex items-center gap-10">
            {items.map((item, i) => (
              <span
                key={`${copy}-${item}-${i}`}
                className="flex shrink-0 items-center gap-10 whitespace-nowrap font-body text-xs font-medium uppercase tracking-[0.22em] text-text-muted sm:text-sm"
              >
                {item}
                <span className="h-1 w-1 shrink-0 rounded-full bg-accent/70" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Ticker;
