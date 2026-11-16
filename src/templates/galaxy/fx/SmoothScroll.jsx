import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { isLite } from '../lib/quality';

let lenis = null;
/** The live Lenis instance (null on touch-only, reduced-motion or the vault). */
export const getLenis = () => lenis;

/**
 * Inertial wheel scrolling for the whole site — the weighty, gliding scroll of
 * the reference. Touch keeps the platform's own native momentum (Lenis only
 * smooths the wheel), and the vault, which runs its own scroll timeline
 * inside a fixed scroller, gets no Lenis at all.
 */
const SmoothScroll = () => {
  const { pathname } = useLocation();
  const onVault = pathname === '/vault';

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (onVault || reduced || isLite()) return undefined;

    const instance = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.95,
      // Drawers, menus and overlays scroll themselves.
      allowNestedScroll: true,
      prevent: (node) => node.hasAttribute('role') && node.getAttribute('role') === 'dialog',
    });
    lenis = instance;

    let raf = 0;
    const loop = (time) => {
      instance.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // Modals lock the page by setting body overflow; follow them so the wheel
    // can't scroll the page behind an open cart drawer.
    const sync = () => {
      if (document.body.style.overflow === 'hidden') instance.stop();
      else instance.start();
    };
    const mo = new MutationObserver(sync);
    mo.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    sync();

    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      instance.destroy();
      if (lenis === instance) lenis = null;
    };
  }, [onVault]);

  // After a navigation ScrollManager jumps the window; let Lenis adopt that
  // position instead of gliding back to where the old page was.
  useEffect(() => {
    lenis?.reset();
  }, [pathname]);

  return null;
};

export default SmoothScroll;
