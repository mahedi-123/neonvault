import { useEffect, useRef, useState } from 'react';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/[]{}=+*#%&';

/**
 * Decodes its text from random glyphs whenever `text` (or `trigger`) changes —
 * the glitchy title reveal from the vault. With `onView` it waits until the
 * element scrolls into view, and replays on hover when `hover` is set. Writes
 * straight to the DOM so the animation never re-renders React.
 */
const ScrambleText = ({
  text, trigger, duration = 700, className, as: Tag = 'span', onView = false, hover = false, ...rest
}) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(!onView);
  const [replay, setReplay] = useState(0);

  useEffect(() => {
    if (!onView || visible) return undefined;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setVisible(true); return undefined; }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); io.disconnect(); }
    }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, [onView, visible]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!visible || reduced) { el.textContent = text; return undefined; }
    let raf;
    const start = performance.now();
    const chars = [...text];
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      el.textContent = chars
        .map((ch, i) => {
          if (ch === ' ') return ' ';
          const reveal = i / chars.length;
          return p >= reveal * 0.7 + 0.3 ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        })
        .join('');
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); el.textContent = text; };
  }, [text, trigger, duration, visible, replay]);

  return (
    <Tag
      ref={ref}
      className={className}
      aria-label={text}
      onMouseEnter={hover ? () => setReplay((n) => n + 1) : undefined}
      {...rest}
    >
      {text}
    </Tag>
  );
};

export default ScrambleText;
