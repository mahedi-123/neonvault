import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Heart, Eye, Loader2 } from 'lucide-react';
import { cn, formatPrice } from '../utils/helpers';
import Button from './Button';
import Badge from './Badge';
import ProductCard from './ProductCard';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useUI } from '../context/UIContext';
import { getBestSellers, products } from '../data/products';

const VaultPicks = () => {
  const { addItem } = useCart();
  const { toggleItem, isInWishlist } = useWishlist();
  const { showToast } = useUI();

  const picks = [
    {
      product: products.find(p => p.id === 'nx1-headphones'),
      reason: 'Because you viewed premium audio',
      reasonIcon: Sparkles,
    },
    {
      product: products.find(p => p.id === 'void-keyboard'),
      reason: 'Popular with mechanical keyboard enthusiasts',
      reasonIcon: Heart,
    },
    {
      product: products.find(p => p.id === 'arc-mouse'),
      reason: 'Your setup is missing a competitive mouse',
      reasonIcon: ArrowRight,
    },
    {
      product: products.find(p => p.id === 'pulse-ring'),
      reason: 'Trending in wearable tech',
      reasonIcon: Eye,
    },
    {
      product: products.find(p => p.id === 'apex-earbuds'),
      reason: 'Best seller in your region',
      reasonIcon: Sparkles,
    },
    {
      product: products.find(p => p.id === 'nexus-hub'),
      reason: 'Complete your smart home setup',
      reasonIcon: ArrowRight,
    },
  ].filter(p => p.product);

  const handleAddToCart = (product) => {
    addItem(product);
    showToast(`${product.name} added to cart`, 'success');
  };

  const handleWishlist = (product) => {
    toggleItem(product);
    showToast(isInWishlist(product.id) ? 'Removed from wishlist' : 'Added to wishlist', isInWishlist(product.id) ? 'info' : 'success');
  };

  return (
    <section className="relative py-20 lg:py-32" aria-labelledby="vault-picks-heading">
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <div className="absolute inset-0 noise-overlay" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Badge variant="primary" className="mb-4 inline-flex" dot>
            <Sparkles className="w-3 h-3 mr-1" /> VAULT PICKS
          </Badge>
          <h2 id="vault-picks-heading" className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-text leading-tight mb-4">
            CURATED FOR YOU
          </h2>
          <p className="text-lg text-text-muted max-w-2xl">
            Hand-selected based on your browsing history, trending products, and what completes your setup.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
        >
          {picks.map((pick, index) => (
            <motion.article
              key={pick.product.id}
              className="group relative bg-card border border-border/50 rounded-2xl overflow-hidden transition-all duration-300 hover:border-accent/30 hover:shadow-[0_20px_60px_-20px_rgba(0,255,136,0.15)]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.08 }}
            >
              <div className="relative aspect-square overflow-hidden">
                <img src={pick.product.images[0]} alt={pick.product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-bg/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="absolute top-3 left-3 right-3 flex items-start justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {pick.product.tag && <Badge variant={pick.product.tagVariant === 'primary' ? 'bestseller' : pick.product.tagVariant === 'accent' ? 'new' : 'limited'}>{pick.product.tag}</Badge>}
                  <div className="flex gap-1.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleWishlist(pick.product); }}
                      className="p-2 rounded-full bg-bg/80 backdrop-blur-sm border border-border/50 text-text-muted hover:text-text hover:border-border-hover transition-all"
                      aria-label="Wishlist"
                    >
                      <Heart className={cn('w-4 h-4', isInWishlist(pick.product.id) && 'fill-current text-accent')} />
                    </button>
                  </div>
                </div>

                <div className="absolute bottom-3 left-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAddToCart(pick.product); }}
                    disabled={!pick.product.inStock}
                    className="flex-1 px-3 py-2 text-xs font-body font-medium bg-accent text-bg rounded-lg hover:bg-accent-dim transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1 4 4v4"/></svg>
                    ADD
                  </button>
                </div>
              </div>

              <div className="p-4 pt-3">
                <div className="flex items-center gap-2 text-xs text-accent mb-3">
                  <pick.reasonIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  <p className="font-body font-medium line-clamp-1">{pick.reason}</p>
                </div>

                <p className="text-xs font-body font-medium text-text-muted uppercase tracking-wider mb-1">
                  {pick.product.category.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </p>
                <h4 className="text-lg font-display font-medium text-text mb-1 line-clamp-1 group-hover:text-accent transition-colors">
                  {pick.product.name}
                </h4>

                <div className="flex items-baseline justify-between pt-2 border-t border-border/50">
                  <span className="text-xl font-display font-bold text-accent">{formatPrice(pick.product.price)}</span>
                  <div className="flex items-center gap-1 text-xs text-text-muted">
                    <svg className="w-3.5 h-3.5 fill-current text-accent" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    <span>{pick.product.rating.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>

        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Button variant="secondary" size="lg" leftIcon={<Sparkles className="w-5 h-5" />}>
            REFRESH RECOMMENDATIONS
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default VaultPicks;