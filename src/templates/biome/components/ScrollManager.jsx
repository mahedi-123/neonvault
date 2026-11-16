import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Scroll position handling across route changes.
 *
 * A single-page app does not reset the scroll position when the URL changes —
 * the browser only does that on a real document load. So following any link
 * from halfway down a page landed you halfway down the next one, and links in
 * the footer (which is as far down as a page goes) dropped you at the bottom
 * of the destination looking at its footer, with the actual page above you.
 *
 * Rules:
 *   • A new navigation starts at the top of the page.
 *   • Back and forward return you to where you were on that entry, which is
 *     what a browser does and what the gesture means.
 *   • A URL with a hash goes to that element instead.
 *
 * Always instant, never smooth: the app sets `scroll-behavior: smooth`
 * globally for in-page anchors, and inheriting it here would animate a
 * several-thousand-pixel scroll through a page the visitor never asked to
 * see.
 */

/**
 * Saved offsets by history entry key. Module scope because this component is
 * mounted inside the route transition and remounts on every navigation — a
 * ref would be wiped exactly when it is needed.
 */
const positions = new Map();

/**
 * The key of the route that currently owns the scroll position.
 *
 * The page transition briefly has two ScrollManagers mounted: the incoming
 * route mounts before the outgoing one unmounts. Without this, the outgoing
 * instance's scroll listener was still live when the incoming page reset to
 * the top, so it dutifully recorded 0 over the offset it was supposed to be
 * remembering — and going back always landed at the top.
 */
let activeKey = null;

/** Frames a POP restore keeps re-applying while the page finishes laying out. */
const MAX_RESTORE_FRAMES = 12;

const ScrollManager = () => {
  const location = useLocation();
  const navigationType = useNavigationType();

  /**
   * The key this instance belongs to, captured at mount.
   *
   * It cannot be read from useLocation() on the way out: the page transition
   * keeps the outgoing route mounted through its exit animation, and context
   * has already moved on to the incoming URL by then — so saving on cleanup
   * would file this page's scroll offset under the next page's key.
   */
  const keyRef = useRef(location.key);
  const rafRef = useRef(0);

  // Mounts with the incoming page, so this is the moment the new content
  // appears. Layout effect, so the correction lands before the browser paints.
  useLayoutEffect(() => {
    // Claim ownership before anything scrolls, so the outgoing route's
    // listener ignores the reset below.
    activeKey = keyRef.current;
    const saved = positions.get(keyRef.current);

    if (navigationType === 'POP' && typeof saved === 'number') {
      /**
       * Re-apply over the next few frames rather than once.
       *
       * A restore issued before the returning page has its final height gets
       * silently clamped to whatever the document can scroll at that instant
       * — which, for a page still laying out, is often 0. Retrying until the
       * offset sticks costs a handful of frames and fixes it without having
       * to guess a timeout.
       */
      let frames = 0;
      const settle = () => {
        window.scrollTo({ top: saved, left: 0, behavior: 'instant' });
        frames += 1;
        if (
          Math.abs(window.scrollY - saved) > 2 &&
          frames < MAX_RESTORE_FRAMES &&
          // Abandon if the visitor has already navigated on.
          activeKey === keyRef.current
        ) {
          rafRef.current = requestAnimationFrame(settle);
        }
      };
      settle();
      return;
    }

    if (location.hash) {
      const target = document.querySelector(location.hash);
      if (target) {
        target.scrollIntoView({ behavior: 'instant', block: 'start' });
        return;
      }
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    // Mount-only: the incoming page is a fresh instance per navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  useEffect(() => {
    const key = keyRef.current;
    const record = () => {
      // Only the route on screen may record. A stale instance recording
      // during the transition is exactly the bug this guard exists for.
      if (activeKey !== key) return;
      positions.set(key, window.scrollY);
    };
    window.addEventListener('scroll', record, { passive: true });
    // No final record on cleanup: by the time this unmounts the next page has
    // already reset the scroll, so the offset here is the new page's, not
    // this one's. The listener above has kept the value current while the
    // route was actually on screen.
    return () => window.removeEventListener('scroll', record);
  }, []);

  return null;
};

export default ScrollManager;
