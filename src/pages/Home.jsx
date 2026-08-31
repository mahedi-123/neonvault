import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, TrendingUp, Package, Heart, Zap } from 'lucide-react';
import { cn } from '../utils/helpers';
import Button from '../components/Button';
import Badge from '../components/Badge';
import ProductCard from '../components/ProductCard';
import ProductGrid from '../components/ProductGrid';
import Hero from '../components/Hero';
import ProductShowcase from '../components/ProductShowcase';
import { getNewDrops, getBestSellers, getLimitedProducts, products } from '../data/products';

const Home = () => {
  const navigate = useNavigate();
  const newDrops = getNewDrops();
  const bestSellers = getBestSellers();
  const limitedProducts = getLimitedProducts();

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

  return (
    <>
      <Hero />
      <ProductShowcase />

      <section className="relative py-20 lg:py-32" aria-labelledby="features-heading">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <div className="absolute inset-0 noise-overlay" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="group p-6 lg:p-8 bg-surface/50 border border-border/50 rounded-2xl transition-all duration-300 hover:border-accent/30 hover:shadow-[0_20px_60px_-20px_rgba(139,92,246,0.12)]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.1 }}
              >
                <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-4 group-hover:bg-accent group-hover:text-bg transition-colors">
                  <feature.icon className="w-6 h-6 lg:w-7 lg:h-7" />
                </div>
                <h3 className="text-lg lg:text-xl font-display font-bold text-text mb-2">{feature.title}</h3>
                <p className="text-text-muted">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="relative py-20 lg:py-32" aria-labelledby="new-drops-heading">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <div className="absolute inset-0 noise-overlay" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge variant="accent" className="mb-4 inline-flex" dot>
                <Zap className="w-3 h-3 mr-1" /> NEW DROPS
              </Badge>
              <h2 id="new-drops-heading" className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-text leading-tight">
                JUST LANDED
              </h2>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Button
                variant="secondary"
                size="lg"
                leftIcon={<Package className="w-5 h-5" />}
                onClick={() => navigate('/new-drops')}
              >
                VIEW ALL NEW DROPS
              </Button>
            </motion.div>
          </div>

          <ProductGrid
            initialProducts={newDrops}
            className="mb-16"
          />
        </div>
      </section>

      <section className="relative py-20 lg:py-32" aria-labelledby="bestsellers-heading">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <div className="absolute inset-0 noise-overlay" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge variant="bestseller" className="mb-4 inline-flex" dot>
                <TrendingUp className="w-3 h-3 mr-1" /> BEST SELLERS
              </Badge>
              <h2 id="bestsellers-heading" className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-text leading-tight">
                TOP RATED
              </h2>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Button
                variant="secondary"
                size="lg"
                leftIcon={<Heart className="w-5 h-5" />}
                onClick={() => navigate('/best-sellers')}
              >
                VIEW ALL BEST SELLERS
              </Button>
            </motion.div>
          </div>

          <ProductGrid
            initialProducts={bestSellers}
            className="mb-16"
          />
        </div>
      </section>

      <section className="relative py-20 lg:py-32 bg-surface/30 border-y border-border/50" aria-labelledby="cta-heading">
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="absolute inset-0 noise-overlay" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="primary" className="mb-4 inline-flex" dot>
              <Sparkles className="w-3 h-3 mr-1" /> JOIN THE VAULT
            </Badge>
            <h2 id="cta-heading" className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-text leading-tight mb-6">
              READY TO BUY THE FUTURE?
            </h2>
            <p className="text-lg text-text-muted mb-10 max-w-xl mx-auto">
              Join thousands of tech enthusiasts. Get early access to drops, exclusive deals, and insider content.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="xl" leftIcon={<Sparkles className="w-5 h-5" />} onClick={() => navigate('/shop?category=all')}>
                CREATE ACCOUNT
              </Button>
              <Button variant="secondary" size="xl" onClick={() => navigate('/shop')}>
                EXPLORE CATALOG
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
};

export default Home;