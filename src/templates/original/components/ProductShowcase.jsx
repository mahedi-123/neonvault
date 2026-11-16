import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import { ArrowRight, Heart, ShoppingBag, Zap } from 'lucide-react';
import { formatPrice } from '../utils/helpers';
import Button from './Button';
import Badge from './Badge';
import { getNewDrops, products } from '../data/products';
import { clipReveal, fadeUp, maskReveal, staggerContainer } from '../lib/motion';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useUI } from '../context/UIContext';

/**
 * The cinematic handoff from Hero: a single large product spotlight rather
 * than a grid, so the page still feels like it's showing you one thing at a
 * time as you scroll, not switching into "browse mode" abruptly.
 */
const ProductShowcase = () => {
  const navigate = useNavigate();
  const sectionRef = useRef(null);
  const imageWrapRef = useRef(null);
  const rafRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  const [cursorReady, setCursorReady] = useState(() => window.matchMedia('(pointer: fine)').matches);

  const { addItem } = useCart();
  const { toggleItem, isInWishlist } = useWishlist();
  const { showToast } = useUI();

  // A new drop rather than the Hero's best-seller — the two sections spotlight
  // different products so the showcase doesn't just repeat the Hero.
  const showcaseProduct = useMemo(() => getNewDrops()[0] ?? products[1] ?? products[0], []);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)');
    const handleChange = (e) => setCursorReady(e.matches);
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const cursorEffectsEnabled = cursorReady && !prefersReducedMotion;

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springPointerX = useSpring(pointerX, { stiffness: 150, damping: 22, mass: 0.6 });
  const springPointerY = useSpring(pointerY, { stiffness: 150, damping: 22, mass: 0.6 });
  const glowX = useTransform(springPointerX, [-0.5, 0.5], [-16, 16]);
  const glowY = useTransform(springPointerY, [-0.5, 0.5], [-16, 16]);

  const handlePointerMove = useCallback((e) => {
    if (!cursorEffectsEnabled || rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const rect = imageWrapRef.current?.getBoundingClientRect();
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

  // Bounded to this section only (offset spans its own enter/exit) — a
  // section-scoped parallax moment, never a page-wide scroll-jack.
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], [0, 50]);
  const imageY = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const textY = useTransform(scrollYProgress, [0, 1], [24, -24]);
  // Fades in as the section arrives — timed to overlap with Hero's own
  // handoff glow fading in as it leaves, so the two read as one light source.
  const glowInOpacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);

  const bgScrollStyle = prefersReducedMotion ? undefined : { y: bgY };
  const imageScrollStyle = prefersReducedMotion ? undefined : { y: imageY };
  const textScrollStyle = prefersReducedMotion ? undefined : { y: textY };
  const handoffGlowStyle = prefersReducedMotion ? { opacity: 0.5 } : { opacity: glowInOpacity };

  const tagVariant = showcaseProduct?.tagVariant === 'primary'
    ? 'bestseller'
    : showcaseProduct?.tagVariant === 'accent'
      ? 'new'
      : 'limited';
  const inWishlist = showcaseProduct ? isInWishlist(showcaseProduct.id) : false;
  const showcaseImage = showcaseProduct?.images?.[0];
  const featureHighlights = showcaseProduct?.features?.slice(0, 3) ?? [];

  const handleWishlist = (e) => {
    e.stopPropagation();
    toggleItem(showcaseProduct);
    showToast(inWishlist ? 'Removed from wishlist' : 'Added to wishlist', inWishlist ? 'info' : 'success');
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    addItem(showcaseProduct);
    showToast(`${showcaseProduct.name} added to cart`, 'success');
  };

  if (!showcaseProduct) return null;

  return (
    <section
      ref={sectionRef}
      className="relative py-28 lg:py-40 overflow-hidden bg-bg"
      aria-labelledby="showcase-heading"
    >
      <motion.div className="absolute inset-0" style={bgScrollStyle} aria-hidden="true">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute inset-0 noise-overlay" />
      </motion.div>

      {/* Picks up Hero's handoff glow — same color/blur language, positioned
          at this section's top edge so the two feel like one continuous light. */}
      <motion.div
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[560px] h-[320px] rounded-full bg-accent/10 blur-[110px]"
        style={handoffGlowStyle}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={staggerContainer(0.13, 0.05)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.35 }}
          className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] items-center gap-16 lg:gap-14"
        >
          {/* Image column — left this time, reversing Hero's split for rhythm */}
          <motion.div
            ref={imageWrapRef}
            onMouseMove={handlePointerMove}
            onMouseLeave={handlePointerLeave}
            style={imageScrollStyle}
            className="relative order-2 lg:order-1"
          >
            {cursorEffectsEnabled && (
              <motion.div
                className="absolute inset-0 -z-10 rounded-full bg-accent/15 blur-[80px]"
                style={{ x: glowX, y: glowY, opacity: 0.3 }}
                aria-hidden="true"
              />
            )}

            <motion.div
              variants={clipReveal}
              whileHover={prefersReducedMotion ? undefined : { scale: 1.015 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22 }}
              className="relative aspect-[5/4] lg:aspect-[4/5] rounded-[2rem] overflow-hidden bg-card border border-border/60 shadow-[0_30px_90px_-30px_rgba(0,0,0,0.65)]"
            >
              {showcaseProduct.tag && (
                <div className="absolute top-5 left-5 z-10">
                  <Badge variant={tagVariant} dot>{showcaseProduct.tag}</Badge>
                </div>
              )}

              <div className="absolute top-5 right-5 z-10 flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleWishlist}
                  className={`tap-safe p-2.5 rounded-full bg-bg/70 backdrop-blur-sm border border-border/50 text-text-muted hover:text-text transition-all duration-200 ${inWishlist ? 'text-accent border-accent/50' : ''}`}
                  aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                  <Heart className={`w-4 h-4 ${inWishlist ? 'fill-current' : ''}`} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleAddToCart}
                  disabled={!showcaseProduct.inStock}
                  className="tap-safe p-2.5 rounded-full bg-bg/70 backdrop-blur-sm border border-border/50 text-text-muted hover:text-text transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Add to cart"
                >
                  <ShoppingBag className="w-4 h-4" />
                </motion.button>
              </div>

              {showcaseImage && (
                <img
                  src={showcaseImage}
                  alt={showcaseProduct.name ? `${showcaseProduct.name} — product showcase` : 'Featured product'}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                  width="900"
                  height="900"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-bg/70 via-transparent to-transparent" />
            </motion.div>

            {showcaseProduct && (
              <motion.div
                variants={fadeUp}
                className="absolute -bottom-6 left-6 right-6 flex items-center justify-between gap-4 px-5 py-4 rounded-2xl bg-surface/80 backdrop-blur-xl border border-border/60 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5)]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-display font-semibold text-text truncate">{showcaseProduct.name}</p>
                  <p className="text-xs text-text-muted truncate">{showcaseProduct.shortDescription}</p>
                </div>
                <span className="shrink-0 text-lg font-display font-semibold text-accent">
                  {formatPrice(showcaseProduct.price)}
                </span>
              </motion.div>
            )}
          </motion.div>

          {/* Text column */}
          <motion.div style={textScrollStyle} className="relative z-10 order-1 lg:order-2">
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface/60 backdrop-blur-xl border border-border/50 text-text-muted text-sm font-body mb-8"
            >
              <Zap className="w-4 h-4 text-accent" aria-hidden="true" />
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" aria-hidden="true" />
              <span>JUST ARRIVED // {showcaseProduct.category.toUpperCase()}</span>
            </motion.div>

            <motion.h2
              id="showcase-heading"
              variants={staggerContainer(0.12)}
              className="text-[clamp(2.5rem,6.5vw,5.5rem)] font-display font-extrabold text-text leading-[0.98] tracking-tight text-balance"
            >
              <span className="block overflow-hidden">
                <motion.span variants={maskReveal} className="block">ENGINEERED</motion.span>
              </span>
              <span className="block overflow-hidden">
                <motion.span variants={maskReveal} className="block">FOR THE</motion.span>
              </span>
              <span className="block overflow-hidden">
                <motion.span variants={maskReveal} className="block text-gradient-accent">NEXT MOVE.</motion.span>
              </span>
            </motion.h2>

            <motion.p variants={fadeUp} className="mt-6 max-w-xl text-lg text-text-muted font-body leading-relaxed">
              {showcaseProduct.description}
            </motion.p>

            {featureHighlights.length > 0 && (
              <motion.ul variants={fadeUp} className="mt-8 space-y-3">
                {featureHighlights.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-text-muted">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0" aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </motion.ul>
            )}

            <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center gap-4">
              <Button
                size="xl"
                rightIcon={<ArrowRight className="w-5 h-5" />}
                onClick={() => navigate(`/product/${showcaseProduct.id}`)}
              >
                SHOP {showcaseProduct.name}
              </Button>
              <Button variant="secondary" size="xl" onClick={() => navigate('/new-drops')}>
                ALL NEW DROPS
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default ProductShowcase;
