import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Clock, Loader2, Tag, TrendingUp, Zap } from 'lucide-react';
import { cn, formatPrice } from '../utils/helpers';
import Button from './Button';
import Badge from './Badge';
import ProductCard from './ProductCard';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useUI } from '../context/UIContext';
import { getLimitedProducts, getNewDrops } from '../data/products';
import { viewportOnce } from '../lib/motion';

const DropRoom = () => {
  const { addItem } = useCart();
  const { toggleItem, isInWishlist } = useWishlist();
  const { showToast } = useUI();

  const limitedProducts = getLimitedProducts();
  const newDrops = getNewDrops();

  const nextDropDate = new Date();
  nextDropDate.setDate(nextDropDate.getDate() + 3);
  nextDropDate.setHours(10, 0, 0, 0);

  const getTimeRemaining = () => {
    const now = new Date();
    const diff = nextDropDate - now;
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / 1000 / 60) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  };

  const [time, setTime] = useState(getTimeRemaining());

  useEffect(() => {
    const interval = setInterval(() => setTime(getTimeRemaining()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAddToCart = (product) => {
    addItem(product);
    showToast(`${product.name} added to cart`, 'success');
  };

  const handleWishlist = (product) => {
    toggleItem(product);
    showToast(isInWishlist(product.id) ? 'Removed from wishlist' : 'Added to wishlist', isInWishlist(product.id) ? 'info' : 'success');
  };

  return (
    <section className="relative py-20 lg:py-32 overflow-hidden" aria-labelledby="drop-room-heading">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/5 to-transparent" />
      <div className="absolute inset-0 grid-pattern opacity-20" />
      <div className="absolute inset-0 noise-overlay" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Badge variant="limited" className="mb-4 inline-flex" dot>
            <Zap className="w-3 h-3 mr-1" /> DROP ROOM
          </Badge>
          <h2 id="drop-room-heading" className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-text leading-tight mb-6">
            NEXT DROP IN
          </h2>
          <p className="text-lg text-text-muted max-w-xl mx-auto">
            Exclusive limited editions. First come, first served. No restocks.
          </p>
        </motion.div>

        <motion.div
          className="mx-auto max-w-2xl mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
        >
          <div className="bg-surface/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-accent/10 via-transparent to-accent/10" />
            <div className="relative flex items-center justify-center gap-4 sm:gap-6 flex-wrap">
              {[
                { label: 'DAYS', value: time.days, unit: 'd' },
                { label: 'HOURS', value: time.hours, unit: 'h' },
                { label: 'MINUTES', value: time.minutes, unit: 'm' },
                { label: 'SECONDS', value: time.seconds, unit: 's' },
              ].map((item, index) => (
                <motion.div
                  key={item.label}
                  className="flex flex-col items-center"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + index * 0.1, type: 'spring', damping: 15, stiffness: 100 }}
                >
                  <div className="relative">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-xl bg-bg border border-border/50 flex items-center justify-center font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-text">
                      {String(item.value).padStart(2, '0')}
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs font-body text-text-muted uppercase tracking-wider bg-bg px-1">
                      {item.label}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.5 }}
        >
          <h3 className="text-2xl font-display font-bold text-text mb-6">LIVE INVENTORY</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {limitedProducts.map((product, index) => (
              <motion.article
                key={product.id}
                className="group relative bg-card border border-border/50 rounded-2xl overflow-hidden transition-all duration-300 hover:border-accent/30 hover:shadow-[0_20px_60px_-20px_rgba(139,92,246,0.15)]"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportOnce}
                transition={{ delay: Math.min(index, 6) * 0.08 }}
              >
                <div className="relative aspect-square overflow-hidden">
                  <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-bg/80 via-transparent to-transparent" />
                  <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                    <Badge variant="limited" dot>LIMITED</Badge>
                    <div className="flex gap-1.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleWishlist(product); }}
                        className="p-2 rounded-full bg-bg/80 backdrop-blur-sm border border-border/50 text-text-muted hover:text-text hover:border-border-hover transition-all"
                        aria-label="Wishlist"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                      </button>
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="bg-bg/90 backdrop-blur-sm rounded-lg p-3">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-text-muted">STOCK REMAINING</span>
                        <span className="font-body font-semibold text-warning">{product.stockCount}</span>
                      </div>
                      <div className="h-2 bg-surface rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-accent rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(5, (product.stockCount / 100) * 100)}%` }}
                          transition={{ delay: 0.5 + index * 0.1, duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 pt-3">
                  <p className="text-xs font-body font-medium text-text-muted uppercase tracking-wider mb-1">
                    {product.category.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </p>
                  <h4 className="text-lg font-display font-medium text-text mb-1 line-clamp-1">{product.name}</h4>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-display font-bold text-accent">{formatPrice(product.price)}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }}
                      disabled={!product.inStock}
                      className="px-3 py-1.5 text-xs font-body font-medium bg-accent text-bg rounded-lg hover:bg-accent-dim transition-colors disabled:opacity-40"
                    >
                      ADD
                    </button>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </motion.div>

        {newDrops.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-2xl font-display font-bold text-text mb-6">NEW THIS WEEK</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {newDrops.slice(0, 6).map((product, index) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default DropRoom;