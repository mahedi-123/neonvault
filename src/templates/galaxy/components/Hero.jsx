import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ArrowRight, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import Button from './Button';
import EnterVaultButton from './EnterVaultButton';
import OrbitCarousel from './OrbitCarousel';
import { warp } from '../fx/GalaxyCanvas';
import { startMorph, vaultPortal } from '../fx/transitions';
import { getBestSellers, products } from '../data/products';
import { fadeUp, staggerContainer } from '../lib/motion';

const trustPoints = [
  { icon: Truck, label: 'Free shipping over $200' },
  { icon: RotateCcw, label: '30-day returns' },
  { icon: ShieldCheck, label: '2-year warranty' },
];

const LINES = ['BUY THE', 'FUTURE.'];
// starlight → nebula → stellar gold across the accent line, one colour per letter
const ACCENT = ['#8ab4ff', '#a7b6ff', '#c9b2ff', '#f0abfc', '#f7b6cf', '#ffd27a', '#ffd27a'];

/**
 * Home hero. The 3D Milky Way (fx/GalaxyCanvas) fills the background and
 * bends around the pointer like a gravitational lens; the headline letters
 * feel the same pull — each one lifts and lights up as the pointer passes.
 */
const Hero = () => {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const charsRef = useRef([]);
  const charPosRef = useRef([]);
  const reduced = useReducedMotion();

  // five featured artifacts for the orbit: best sellers first, then new
  const orbitProducts = useMemo(() => {
    const seen = new Set();
    return [...getBestSellers(), ...products.filter((p) => p.isNew), ...products]
      .filter((p) => (seen.has(p.id) ? false : seen.add(p.id)))
      .slice(0, 6);
  }, []);

  /* letter positions for the pointer glow */
  useEffect(() => {
    const section = heroRef.current;
    if (!section) return undefined;
    const measure = () => {
      const sr = section.getBoundingClientRect();
      charPosRef.current = charsRef.current.map((el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2 };
      });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(section);
    // letters animate in; measure once they have landed
    const t = setTimeout(measure, 1400);
    document.fonts?.ready.then(measure);
    return () => { clearTimeout(t); ro.disconnect(); };
  }, []);

  const local = (e) => {
    const r = heroRef.current.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  const onPointerMove = (e) => {
    const [x, y] = local(e);
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
    charsRef.current.forEach((el) => el?.style.setProperty('--p', '0'));
  };

  // scroll-out: copy rises and fades, product drifts slower
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const textY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const productY = useTransform(scrollYProgress, [0, 1], [0, -130]);

  let charIndex = 0;

  return (
    <section
      ref={heroRef}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      data-biome="teal"
      className="nv-hero relative -mt-16 flex min-h-[100svh] items-center overflow-hidden lg:-mt-20"
      aria-label="NEON VAULT — buy the future"
    >
      {/* legibility + hand-off into the page below */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_16%_50%,rgba(4,3,12,0.7),transparent_70%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" aria-hidden="true" />

      {/* HUD corners */}
      <div className="nv-hud pointer-events-none absolute bottom-8 left-4 hidden font-body text-[10px] uppercase tracking-[0.2em] text-text-subtle md:block lg:left-8" aria-hidden="true">
        <p>NV—01 / LOCKED ON SAGITTARIUS A*</p>
        <p className="text-accent/70">RA 17h45m40s · DEC −29°00′28″</p>
      </div>
      <div className="pointer-events-none absolute bottom-8 right-4 hidden font-body text-[10px] uppercase tracking-[0.2em] text-text-subtle md:block lg:right-8" aria-hidden="true">
        MOVE TO BEND LIGHT · CLICK FOR A SUPERNOVA
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
              Curated premium technology for those who refuse to compromise — smart gadgets, gaming gear and lifestyle tech, charted across one galaxy.
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
                  // the galaxy jumps to hyperspace as the vault door opens
                  warp({ duration: 1.2, travel: false });
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

          {/* featured products on a draggable 3D orbit */}
          <motion.div variants={fadeUp} style={reduced ? undefined : { y: productY }} className="relative">
            <OrbitCarousel
              products={orbitProducts}
              onOpen={(p, img) => {
                startMorph(img);
                navigate(`/product/${p.id}`);
              }}
            />
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
