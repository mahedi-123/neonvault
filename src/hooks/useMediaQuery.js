import { useEffect, useState } from 'react';

/**
 * Subscribe to a CSS media query from JavaScript.
 *
 * For the cases where a component's behaviour — not just its styling — has to
 * change at a breakpoint. Anything that can be expressed in CSS should stay
 * in CSS; this is for the times an inline style or a prop would otherwise
 * override the responsive classes and win.
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = (e) => setMatches(e.matches);
    // Re-read on subscribe: the viewport can change between the initial
    // render and this effect (rotation, a resized window, hydration).
    setMatches(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);

  return matches;
}

/** Tailwind's `lg:` breakpoint, so JS and CSS agree on where "desktop" starts. */
export const LG_QUERY = '(min-width: 1024px)';

export const useIsLgUp = () => useMediaQuery(LG_QUERY);
