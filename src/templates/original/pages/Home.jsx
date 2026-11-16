import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, TrendingUp, Package, Heart, Zap, ArrowRight } from 'lucide-react';
import Button from '../components/Button';
import ProductGrid from '../components/ProductGrid';
import Hero from '../components/Hero';
import ProductShowcase from '../components/ProductShowcase';
import HoloGrid from '../components/HoloGrid';
import SectionHeading from '../components/SectionHeading';
import StatStrip from '../components/StatStrip';
import Ticker from '../components/Ticker';
import EnterVaultButton from '../components/EnterVaultButton';
import { Reveal, hoverLift, staggerContainer, viewportOnce } from '../lib/motion';
import { getNewDrops, getBestSellers } from '../data/products';

const features = [
  {
    icon: Sparkles,
    title: 'Curated Selection',
    description: 'Every product is hand-picked by our team of tech enthusiasts and experts.',
  },
  {
    icon: TrendingUp,
    title: 'Latest Technology',
    description: 'Access to the newest releases before they hit mainstream retailers.',
  },
  {
    icon: Package,
    title: 'Free Shipping',
    description: 'Complimentary express shipping on all orders over $200.',
  },
  {
    icon: Heart,
    title: '2-Year Warranty',
    description: 'Peace of mind with extended warranty on every purchase.',
  },
];

const stats = [
  { value: 13, label: 'Districts in the vault', suffix: '' },
  { value: 48, label: 'Hours per drop window', suffix: 'h' },
  { value: 2, label: 'Year warranty, everything', suffix: 'yr' },
  { value: 200, label: 'Free shipping over', prefix: '$' },
];

const tickerItems = [
  'FREE EXPRESS SHIPPING OVER $200',
  'NEW DROP EVERY THURSDAY',
  '30-DAY NO-QUESTIONS RETURNS',
  '2-YEAR WARRANTY AS STANDARD',
  'AUTHENTICATED STOCK ONLY',
  'WALK THE VAULT IN 3D',
];

const cardTransition = { duration: 0.5, ease: [0.16, 1, 0.3, 1] };

/**
 * Trim a run of products to something that fills whole rows.
 *
 * The grid is four-up on desktop, so five products left one card marooned
 * beside three empty columns — which reads as a layout bug rather than as a
 * short list. Falls back to the raw list when there are fewer than four, so
 * a thin category still shows what it has.
 */
const fillRows = (list, perRow = 4) =>
  list.length >= perRow ? list.slice(0, Math.floor(list.length / perRow) * perRow) : list;

const Home = () => {
  const navigate = useNavigate();
  const newDrops = fillRows(getNewDrops());
  const bestSellers = fillRows(getBestSellers());

  return (
    <>
      <Hero />

      <Ticker items={tickerItems} />

      <ProductShowcase />

      {/* 01 — why this shop */}
      <section className="relative overflow-hidden py-16 sm:py-20 lg:py-32" aria-labelledby="features-heading">
        <HoloGrid tone="violet" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            index={1}
            eyebrow="Why the vault"
            title="Built on trust"
            id="features-heading"
          />

          <motion.div
            variants={staggerContainer(0.09)}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4 lg:gap-8"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={{
                  hidden: { opacity: 0, y: 24 },
                  visible: { opacity: 1, y: 0, transition: cardTransition },
                }}
                whileHover={hoverLift}
                className="group relative overflow-hidden rounded-2xl border border-border/50 bg-surface/50 p-5 transition-colors duration-300 hover:border-accent/40 sm:p-6 lg:p-8"
              >
                {/* Corner tick — a small piece of instrument chrome that only
                    resolves on hover, so the grid rewards a pointer without
                    shouting at everyone who scrolls past. */}
                <span className="pointer-events-none absolute right-4 top-4 h-3 w-3 border-r border-t border-accent/0 transition-colors duration-300 group-hover:border-accent/70" />

                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors duration-300 group-hover:bg-accent group-hover:text-bg lg:h-14 lg:w-14">
                  <feature.icon className="h-6 w-6 lg:h-7 lg:w-7" aria-hidden="true" />
                </div>
                <h3 className="mb-2 font-display text-lg font-bold text-text lg:text-xl">{feature.title}</h3>
                <p className="text-sm text-text-muted sm:text-base">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>

          <StatStrip stats={stats} className="mt-12 sm:mt-16 lg:mt-20" />
        </div>
      </section>

      {/* 02 — new drops */}
      <section className="relative overflow-hidden py-16 sm:py-20 lg:py-32" aria-labelledby="new-drops-heading">
        <HoloGrid tone="cyan" flip />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            index={2}
            eyebrow="New drops"
            title="Just landed"
            id="new-drops-heading"
            action={
              <Button
                variant="secondary"
                size="lg"
                leftIcon={<Zap className="h-5 w-5" />}
                onClick={() => navigate('/new-drops')}
                className="w-full sm:w-auto"
              >
                VIEW ALL NEW DROPS
              </Button>
            }
          />

          <Reveal intensity="subtle">
            <ProductGrid initialProducts={newDrops} />
          </Reveal>
        </div>
      </section>

      {/* 03 — best sellers */}
      <section className="relative overflow-hidden py-16 sm:py-20 lg:py-32" aria-labelledby="bestsellers-heading">
        <HoloGrid tone="violet" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            index={3}
            eyebrow="Best sellers"
            title="Top rated"
            id="bestsellers-heading"
            action={
              <Button
                variant="secondary"
                size="lg"
                leftIcon={<Heart className="h-5 w-5" />}
                onClick={() => navigate('/best-sellers')}
                className="w-full sm:w-auto"
              >
                VIEW ALL BEST SELLERS
              </Button>
            }
          />

          <Reveal intensity="subtle">
            <ProductGrid initialProducts={bestSellers} />
          </Reveal>
        </div>
      </section>

      <Ticker items={tickerItems} reverse speed={42} />

      {/* 04 — closing call to action */}
      <section
        className="relative overflow-hidden border-y border-border/50 bg-surface/30 py-20 sm:py-24 lg:py-32"
        aria-labelledby="cta-heading"
      >
        <HoloGrid tone="cyan" />

        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <Reveal intensity="strong">
            <p className="mb-4 font-body text-xs font-semibold uppercase tracking-[0.24em] text-accent-secondary">
              Join the vault
            </p>
            <h2
              id="cta-heading"
              className="mb-6 font-display text-[clamp(2.25rem,8vw,4rem)] font-extrabold uppercase leading-[0.95] tracking-tight text-text"
            >
              Ready to buy the future?
            </h2>
            <p className="mx-auto mb-10 max-w-xl text-base text-text-muted sm:text-lg">
              Get early access to drops, exclusive deals, and the run of thirteen
              districts you can actually walk through.
            </p>

            {/* The 3D world is the thing this site has that others don't, so
                it gets the animated door here too — not buried in the hero. */}
            <div className="flex flex-col items-center justify-center gap-5 sm:flex-row sm:gap-4">
              <EnterVaultButton onClick={() => navigate('/vault')} />
              <Button
                variant="secondary"
                size="xl"
                rightIcon={<ArrowRight className="h-5 w-5" />}
                onClick={() => navigate('/shop')}
                className="w-full sm:w-auto"
              >
                EXPLORE CATALOG
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
};

export default Home;
