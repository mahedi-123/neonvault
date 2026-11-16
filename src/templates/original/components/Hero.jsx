import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import { ArrowRight, ChevronDown, RotateCcw, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { formatPrice } from '../utils/helpers';
import Button from './Button';
import Badge from './Badge';
import EnterVaultButton from './EnterVaultButton';
import { getBestSellers, products } from '../data/products';
import { clipReveal, fadeUp, maskReveal, staggerContainer, useMagnetic } from '../lib/motion';

const trustPoints = [
  { icon: Truck, label: 'Free shipping over $200' },
  { icon: RotateCcw, label: '30-day returns' },
  { icon: ShieldCheck, label: '2-year warranty' },
];

const Hero = () => {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const rafRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  const [cursorReady, setCursorReady] = useState(() => window.matchMedia('(pointer: fine)').matches);

  const heroProduct = useMemo(() => getBestSellers()[0] ?? products[0], []);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)');
    const handleChange = (e) => setCursorReady(e.matches);
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const cursorEffectsEnabled = cursorReady && !prefersReducedMotion;

  // Pointer position, normalized to [-0.5, 0.5] on both axes, spring-smoothed
  // so tilt/lighting glide rather than snap to the raw mouse delta.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springPointerX = useSpring(pointerX, { stiffness: 150, damping: 20, mass: 0.6 });
  const springPointerY = useSpring(pointerY, { stiffness: 150, damping: 20, mass: 0.6 });

  const tiltX = useTransform(springPointerY, [-0.5, 0.5], [4, -4]);
  const tiltY = useTransform(springPointerX, [-0.5, 0.5], [-4, 4]);
  const glowX = useTransform(springPointerX, [-0.5, 0.5], [-28, 28]);
  const glowY = useTransform(springPointerY, [-0.5, 0.5], [-28, 28]);

  const handlePointerMove = useCallback((e) => {
    if (!cursorEffectsEnabled || rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const rect = heroRef.current?.getBoundingClientRect();
      if (!rect) return;
      pointerX.set((e.clientX - rect.left) / rect.width - 0.5);
      pointerY.set((e.clientY - rect.top) / rect.height - 0.5);
    });
  }, [cursorEffectsEnabled, pointerX, pointerY]);

  const handlePointerLeave = useCallback(() => {
    pointerX.set(0);
    pointerY.set(0);
  }, [pointerX, pointerY]);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  // Scroll-linked exit: hero content and product drift/fade at different
  // rates as the page scrolls past it — a single, bounded parallax moment,
  // not a page-wide scroll-jack.
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const textY = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const productY = useTransform(scrollYProgress, [0, 1], [0, -110]);
  const productOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const bgY = useTransform(scrollYProgress, [0, 1], [0, 50]);
  // Ramps in over the back half of the scroll-out so the glow is already
  // building by the time Product Showcase's own top glow starts — the two
  // never touch in the DOM, but their timing overlaps to read as one handoff.
  const handoffGlowOpacity = useTransform(scrollYProgress, [0.5, 1], [0, 1]);

  const textScrollStyle = prefersReducedMotion ? undefined : { y: textY, opacity: textOpacity };
  const productScrollStyle = prefersReducedMotion ? undefined : { y: productY, opacity: productOpacity };
  const bgScrollStyle = prefersReducedMotion ? undefined : { y: bgY };

  const productTiltStyle = cursorEffectsEnabled
    ? { rotateX: tiltX, rotateY: tiltY, transformPerspective: 1200 }
    : {};

  const { ref: magneticRef, style: magneticStyle, handlers: magneticHandlers } = useMagnetic({
    strength: 0.25,
    max: 10,
    enabled: cursorEffectsEnabled,
  });

  const heroImage = heroProduct?.images?.[0];
  const heroTagVariant = heroProduct?.tagVariant === 'primary' ? 'bestseller' : heroProduct?.tagVariant === 'accent' ? 'new' : 'limited';

  return (
    <section
      ref={heroRef}
      onMouseMove={handlePointerMove}
      onMouseLeave={handlePointerLeave}
      className="relative flex min-h-[100svh] items-center overflow-hidden bg-bg"
      style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(139,92,246,0.06), transparent)' }}
      aria-label="NEON VAULT — buy the future"
    >
      <motion.div
        className="absolute inset-0"
        style={{
          ...(bgScrollStyle || {}),
          // Tapers the grid/mesh/noise/vignette out before the section's hard
          // bottom edge so it fades into Product Showcase's own atmosphere
          // instead of cutting off flush at the boundary.
          maskImage: 'linear-gradient(to bottom, black 0%, black 78%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 78%, transparent 100%)',
        }}
        aria-hidden="true"
      >
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute inset-0 noise-overlay" />
        <div className="absolute inset-0 vignette" />

        <div
          className="absolute top-1/3 left-1/4 w-[420px] h-[420px] rounded-full bg-accent/5 blur-[120px] opacity-25"
          style={prefersReducedMotion ? undefined : { animation: 'float 22s ease-in-out infinite' }}
        />
        <div className="absolute bottom-1/4 right-1/5 w-[320px] h-[320px] rounded-full bg-accent/5 blur-[100px] opacity-15" />
      </motion.div>

      {/* Handoff glow: builds through the back half of the scroll-out, giving
          Product Showcase's top glow something to visually pick up from. */}
      <motion.div
        className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[560px] h-[220px] rounded-full bg-accent/10 blur-[110px]"
        style={prefersReducedMotion ? { opacity: 0.15 } : { opacity: handoffGlowOpacity }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28">
        <motion.div
          variants={staggerContainer(0.14, 0.1)}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 items-center gap-12 md:grid-cols-[1.15fr_0.85fr] md:gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12"
        >
          {/* Text column */}
          <motion.div style={textScrollStyle} className="relative z-10">
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface/60 backdrop-blur-xl border border-border/50 text-text-muted text-sm font-body mb-8"
            >
              <Sparkles className="w-4 h-4 text-accent" aria-hidden="true" />
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" aria-hidden="true" />
              <span>NEW DROP // 48 HOURS ONLY</span>
            </motion.div>

            <motion.h1
              variants={staggerContainer(0.12)}
              className="text-[clamp(2.75rem,8vw,6.5rem)] font-display font-extrabold text-text leading-[0.95] tracking-tight text-balance"
            >
              <span className="block overflow-hidden">
                <motion.span variants={maskReveal} className="block">BUY THE</motion.span>
              </span>
              <span className="block overflow-hidden">
                <motion.span variants={maskReveal} className="block text-gradient-accent">FUTURE.</motion.span>
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 max-w-xl text-lg sm:text-xl text-text-muted font-body leading-relaxed"
            >
              Curated premium technology for those who refuse to compromise. Smart gadgets, gaming gear, and lifestyle tech — all in one vault.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center gap-4">
              <motion.div
                ref={magneticRef}
                style={magneticStyle}
                {...magneticHandlers}
                className="inline-flex"
              >
                <Button size="xl" leftIcon={<ArrowRight className="w-5 h-5" />} onClick={() => navigate('/shop')}>
                  EXPLORE COLLECTION
                </Button>
              </motion.div>
              <Button variant="secondary" size="xl" onClick={() => navigate('/new-drops')}>
                VIEW NEW DROPS
              </Button>
              <EnterVaultButton onClick={() => navigate('/vault')} />
            </motion.div>

            <motion.div variants={fadeUp} className="mt-16 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-text-muted">
              {trustPoints.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-text-subtle" aria-hidden="true" />
                  <span>{label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Product column */}
          <motion.div style={productScrollStyle} className="relative">
            {cursorEffectsEnabled && (
              <motion.div
                className="absolute inset-0 -z-10 rounded-full bg-accent/20 blur-[90px]"
                style={{ x: glowX, y: glowY, opacity: 0.35 }}
                aria-hidden="true"
              />
            )}

            <motion.div
              style={productTiltStyle}
              variants={staggerContainer(0.15, 0.25)}
              className="relative mx-auto w-full max-w-sm md:max-w-none lg:max-w-md"
            >
              <motion.div
                variants={clipReveal}
                whileHover={prefersReducedMotion ? undefined : { y: -6 }}
                transition={{ type: 'spring', stiffness: 250, damping: 20 }}
                className="relative aspect-[4/5] rounded-[2rem] overflow-hidden bg-card border border-border/60 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]"
              >
                {heroProduct?.tag && (
                  <div className="absolute top-5 left-5 z-10">
                    <Badge variant={heroTagVariant} dot>{heroProduct.tag}</Badge>
                  </div>
                )}
                {heroImage && (
                  <img
                    src={heroImage}
                    alt={heroProduct?.name ? `${heroProduct.name} — featured product` : 'Featured product'}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="eager"
                    width="800"
                    height="800"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-bg/70 via-transparent to-transparent" />
              </motion.div>

              {heroProduct && (
                <motion.div
                  variants={fadeUp}
                  className="absolute -bottom-6 left-6 right-6 flex items-center justify-between gap-4 px-5 py-4 rounded-2xl bg-surface/80 backdrop-blur-xl border border-border/60 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5)]"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-display font-semibold text-text truncate">{heroProduct.name}</p>
                    <p className="text-xs text-text-muted truncate">{heroProduct.shortDescription}</p>
                  </div>
                  <span className="shrink-0 text-lg font-display font-semibold text-accent">
                    {formatPrice(heroProduct.price)}
                  </span>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        style={prefersReducedMotion ? undefined : { opacity: textOpacity }}
        aria-hidden="true"
      >
        <motion.div
          className="flex flex-col items-center gap-2 text-text-subtle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.8 }}
        >
          <span className="text-xs font-body tracking-wider">SCROLL TO EXPLORE</span>
          <motion.div
            animate={prefersReducedMotion ? undefined : { y: [0, 6, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
