import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ArrowRight, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import { formatPrice } from '../utils/helpers';
import Button from './Button';
import Badge from './Badge';
import EnterVaultButton from './EnterVaultButton';
import MyceliumField from '../fx/myceliumField';
import { startMorph, vaultPortal } from '../fx/transitions';
import { isLite } from '../lib/quality';
import { getBestSellers, products } from '../data/products';
import { fadeUp, staggerContainer } from '../lib/motion';

const trustPoints = [
  { icon: Truck, label: 'Free shipping over $200' },
  { icon: RotateCcw, label: '30-day returns' },
  { icon: ShieldCheck, label: '2-year warranty' },
];

const LINES = ['BUY THE', 'FUTURE.'];
// teal → violet → moss across the accent line, one colour per letter
const ACCENT = ['#5eead4', '#7fe3dc', '#a5c9f0', '#c4b5fd', '#c9c08a', '#c4d94a', '#c4d94a'];

/**
 * Home hero. The background is MYCELIUM BLOOM (src/fx/myceliumField.js): a
 * spore field that grows a glowing network around the pointer and blooms on
 * click. The headline letters feel the same lens — each one lifts and lights
 * up as the pointer passes near it.
 */
const Hero = () => {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const canvasRef = useRef(null);
  const gpuRef = useRef(null);
  const fieldRef = useRef(null);
  const charsRef = useRef([]);
  const charPosRef = useRef([]);
  const reduced = useReducedMotion();

  const heroProduct = useMemo(() => getBestSellers()[0] ?? products[0], []);

  /* field lifecycle — runs only while the hero is on screen */
  useEffect(() => {
    const canvas = canvasRef.current;
    const section = heroRef.current;
    if (!canvas || !section) return undefined;
    const field = new MyceliumField(canvas, {
      gpuCanvas: gpuRef.current,
      lite: isLite(),
      reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    });
    fieldRef.current = field;

    let inView = true;
    const sync = () => (inView && !document.hidden ? field.start() : field.stop());
    const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); }, { threshold: 0.02 });
    io.observe(section);
    document.addEventListener('visibilitychange', sync);

    const measure = () => {
      const sr = section.getBoundingClientRect();
      charPosRef.current = charsRef.current.map((el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2 };
      });
    };
    let resizeRaf = 0;
    const onResize = () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => { field.resize(); measure(); });
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(canvas);
    // letters animate in; measure once they have landed
    const t = setTimeout(measure, 1400);
    document.fonts?.ready.then(measure);
    sync();

    return () => {
      clearTimeout(t);
      cancelAnimationFrame(resizeRaf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', sync);
      field.dispose();
      fieldRef.current = null;
    };
  }, []);

  const local = (e) => {
    const r = heroRef.current.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  const onPointerMove = (e) => {
    const [x, y] = local(e);
    fieldRef.current?.setPointer(x, y);
    if (reduced || e.pointerType !== 'mouse') return;
    const pos = charPosRef.current;
    for (let i = 0; i < pos.length; i++) {
      const c = pos[i];
      const el = charsRef.current[i];
      if (!c || !el) continue;
      const d = Math.hypot(x - c.x, y - c.y);
      const p = Math.max(0, 1 - d / 260);
      el.style.setProperty('--p', (p * p).toFixed(3));
      el.style.setProperty('--dx', ((c.x - x) / 260).toFixed(3));
    }
  };

  const onPointerLeave = () => {
    fieldRef.current?.leave();
    charsRef.current.forEach((el) => el?.style.setProperty('--p', '0'));
  };

  const onPointerDown = (e) => {
    if (e.target.closest('a, button, [data-tilt]')) return;
    const [x, y] = local(e);
    fieldRef.current?.burst(x, y);
  };

  const onPointerUp = (e) => {
    if (e.pointerType !== 'mouse') fieldRef.current?.leave();
  };

  // scroll-out: copy rises and fades, product drifts slower
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const textY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const productY = useTransform(scrollYProgress, [0, 1], [0, -130]);
  const fieldOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.25]);

  let charIndex = 0;
  const heroImage = heroProduct?.images?.[0];

  return (
    <section
      ref={heroRef}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      className="nv-hero relative -mt-16 flex min-h-[100svh] items-center overflow-hidden bg-bg lg:-mt-20"
      aria-label="NEON VAULT — buy the future"
    >
      <motion.div className="absolute inset-0" style={reduced ? undefined : { opacity: fieldOpacity }} aria-hidden="true">
        <canvas ref={gpuRef} className="absolute inset-0 h-full w-full" />
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      </motion.div>
      {/* legibility + hand-off into the page below */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_18%_50%,rgba(5,8,11,0.78),transparent_70%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" aria-hidden="true" />

      {/* HUD corners */}
      <div className="nv-hud pointer-events-none absolute bottom-8 left-4 hidden font-body text-[10px] uppercase tracking-[0.2em] text-text-subtle md:block lg:left-8" aria-hidden="true">
        <p>NV—01 / ARCHIVE ONLINE</p>
        <p className="text-accent/70">23.81°N 90.41°E</p>
      </div>
      <div className="pointer-events-none absolute bottom-8 right-4 hidden font-body text-[10px] uppercase tracking-[0.2em] text-text-subtle md:block lg:right-8" aria-hidden="true">
        MOVE TO GROW · CLICK TO BLOOM
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-28">
        <motion.div
          variants={staggerContainer(0.14, 0.15)}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 items-center gap-14 md:grid-cols-[1.2fr_0.8fr] md:gap-8 lg:gap-14"
        >
          <motion.div style={reduced ? undefined : { y: textY, opacity: textOpacity }} className="relative">
            <motion.div variants={fadeUp} className="nv-chip mb-8">
              <span className="nv-chip-dot" aria-hidden="true" />
              NEW DROP // 48 HOURS ONLY
            </motion.div>

            <h1 className="nv-hero-title" aria-label="Buy the future.">
              {LINES.map((line, li) => (
                <span key={line} className="block overflow-hidden pb-[0.06em]" aria-hidden="true">
                  <span className="nv-hero-line block" style={{ animationDelay: `${0.25 + li * 0.14}s` }}>
                    {[...line].map((ch) => {
                      const idx = charIndex++;
                      return (
                        <span
                          key={idx}
                          ref={(el) => { charsRef.current[idx] = el; }}
                          className={`nv-char ${li === 1 ? 'nv-char-accent' : ''}`}
                          style={li === 1 ? { '--c': ACCENT[Math.min(idx - LINES[0].length, ACCENT.length - 1)] } : undefined}
                        >
                          {ch === ' ' ? ' ' : ch}
                        </span>
                      );
                    })}
                  </span>
                </span>
              ))}
            </h1>

            <motion.p variants={fadeUp} className="mt-7 max-w-xl font-body text-sm uppercase leading-relaxed tracking-[0.08em] text-text-muted sm:text-base">
              Curated premium technology for those who refuse to compromise — smart gadgets, gaming gear and lifestyle tech, grown in one vault.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center gap-4">
              <span data-magnetic="0.2" className="inline-flex">
                <Button size="xl" rightIcon={<ArrowRight className="h-4 w-4" />} onClick={() => navigate('/shop')}>
                  Explore collection
                </Button>
              </span>
              <Button variant="secondary" size="xl" onClick={() => navigate('/new-drops')}>
                New drops
              </Button>
              <EnterVaultButton
                onClick={(e) => {
                  const btn = e.currentTarget;
                  const hr = heroRef.current.getBoundingClientRect();
                  const br = btn.getBoundingClientRect();
                  // every spore is sucked into the door, then light floods out of it
                  fieldRef.current?.implode(br.left - hr.left + br.width / 2, br.top - hr.top + br.height / 2);
                  vaultPortal(btn, () => navigate('/vault'));
                }}
              />
            </motion.div>

            <motion.ul variants={fadeUp} className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-3 font-body text-[11px] uppercase tracking-[0.14em] text-text-muted">
              {trustPoints.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-accent/70" aria-hidden="true" />
                  {label}
                </li>
              ))}
            </motion.ul>
          </motion.div>

          {/* featured product — glass card with tilt + glare */}
          <motion.div style={reduced ? undefined : { y: productY }} className="relative">
            <div className="nv-orbit" aria-hidden="true"><span /><span /></div>
            <motion.button
              type="button"
              variants={fadeUp}
              onClick={(e) => {
                if (!heroProduct) return;
                startMorph(e.currentTarget.querySelector('img'));
                navigate(`/product/${heroProduct.id}`);
              }}
              data-tilt="10"
              data-cursor="view"
              className="nv-tilt nv-glass-card group relative mx-auto block aspect-[4/5] w-full max-w-sm overflow-hidden rounded-[2rem] text-left md:max-w-none lg:max-w-md"
              aria-label={heroProduct ? `${heroProduct.name}, ${formatPrice(heroProduct.price)} — view product` : 'Featured product'}
            >
              {heroImage && (
                <img
                  src={heroImage}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="eager"
                  fetchPriority="high"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  width="800"
                  height="1000"
                />
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-bg via-bg/10 to-transparent" />
              <span className="nv-glare" />
              {heroProduct?.tag && (
                <span className="absolute left-5 top-5"><Badge variant="new" dot>{heroProduct.tag}</Badge></span>
              )}
              {heroProduct && (
                <span className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4">
                  <span className="min-w-0">
                    <span className="block font-body text-[10px] uppercase tracking-[0.2em] text-accent">[ featured artifact ]</span>
                    <span className="mt-1 block truncate font-display text-3xl text-text">{heroProduct.name}</span>
                    <span className="block truncate font-body text-[11px] uppercase text-text-muted">{heroProduct.shortDescription}</span>
                  </span>
                  <span className="shrink-0 font-display text-2xl text-accent">{formatPrice(heroProduct.price)}</span>
                </span>
              )}
            </motion.button>
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 font-body text-[10px] uppercase tracking-[0.3em] text-text-subtle"
        style={reduced ? undefined : { opacity: textOpacity }}
        aria-hidden="true"
      >
        <span className="nv-scroll-cue">Scroll down</span>
      </motion.div>
    </section>
  );
};

export default Hero;
