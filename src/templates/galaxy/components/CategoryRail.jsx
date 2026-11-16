import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import { categories, products } from '../data/products';
import SectionHeading from './SectionHeading';

/**
 * "Shop by category" as a pinned horizontal rail: on desktop the section
 * sticks and vertical scrolling slides the category cards sideways (the
 * reference's signature scroll move). On phones and under reduced motion it
 * is a plain swipeable row with snap points — no scroll-jacking.
 */
const CategoryRail = () => {
  const reduced = useReducedMotion();
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const [distance, setDistance] = useState(0);
  const [pinned, setPinned] = useState(false);

  const items = useMemo(
    () => categories
      .filter((c) => c.id !== 'all' && c.count > 0)
      .map((c) => ({ ...c, product: products.find((p) => p.category === c.id) })),
    [],
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px) and (min-height: 620px)');
    const measure = () => {
      const on = mq.matches && !reduced;
      setPinned(on);
      if (trackRef.current) setDistance(Math.max(0, trackRef.current.scrollWidth - window.innerWidth + 64));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    mq.addEventListener('change', measure);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      mq.removeEventListener('change', measure);
      window.removeEventListener('resize', measure);
    };
  }, [reduced]);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });
  const smooth = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 });
  const x = useTransform(smooth, [0, 1], [0, -distance]);
  const bar = useTransform(smooth, [0, 1], [0, 1]);

  return (
    <section
      ref={sectionRef}
      className="relative"
      style={pinned ? { height: `calc(100vh + ${distance}px)` } : undefined}
      aria-labelledby="categories-heading"
    >
      <div className={pinned ? 'sticky top-0 flex h-screen flex-col justify-center overflow-hidden' : 'py-16 sm:py-20'}>
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading index={1} eyebrow="Shop by category" title="Chart your system" id="categories-heading" className="!mb-8" />
        </div>

        <motion.div
          ref={trackRef}
          style={pinned ? { x } : undefined}
          className={
            pinned
              ? 'flex w-max gap-6 pl-[max(2rem,calc((100vw-80rem)/2+2rem))] pr-16'
              : 'flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] sm:px-6'
          }
        >
          {items.map((c, i) => (
            <Link
              key={c.id}
              to={`/shop?category=${c.id}`}
              data-tilt="9"
              data-cursor="view"
              className="nv-tilt nv-glass-card group relative block h-[420px] w-[78vw] max-w-[320px] shrink-0 snap-start overflow-hidden rounded-[1.75rem] sm:w-[300px] lg:h-[min(460px,64vh)] lg:w-[330px] lg:max-w-none"
            >
              {c.product?.images?.[0] && (
                <img
                  src={c.product.images[0]}
                  alt=""
                  loading="lazy"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  className="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-700 group-hover:scale-110 group-hover:opacity-90"
                />
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-bg/10" />
              <span className="nv-glare" />
              <span className="absolute left-5 top-5 font-body text-[11px] tracking-[0.2em] text-accent">
                {String(i + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
              </span>
              <span className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full border border-accent/30 bg-bg/40 text-text transition-all duration-500 group-hover:rotate-45 group-hover:border-accent group-hover:bg-mint group-hover:text-bg">
                <ArrowUpRight className="h-4 w-4" />
              </span>
              <span className="absolute inset-x-5 bottom-5">
                <span className="block font-body text-[10px] uppercase tracking-[0.22em] text-text-muted">
                  [ {c.count} artifact{c.count === 1 ? '' : 's'} ]
                </span>
                <span className="mt-1 block font-display text-4xl uppercase leading-none text-text transition-colors group-hover:text-accent">
                  {c.name}
                </span>
              </span>
            </Link>
          ))}
        </motion.div>

        {pinned && (
          <div className="mx-auto mt-10 w-full max-w-7xl px-8" aria-hidden="true">
            <div className="h-px w-full bg-border">
              <motion.div className="h-px origin-left bg-gradient-to-r from-accent via-accent-secondary to-moss" style={{ scaleX: bar }} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default CategoryRail;
