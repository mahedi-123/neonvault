import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Heart, Eye, Maximize2, Loader2 } from 'lucide-react';
import { cn, formatPrice, formatNumber } from '../utils/helpers';
import Button from './Button';
import Badge from './Badge';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useUI } from '../context/UIContext';

const ProductCard = ({ product, variant = 'default', priority = false }) => {
  const [hovered, setHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const cardRef = useRef(null);
  const { addItem } = useCart();
  const { toggleItem, isInWishlist } = useWishlist();
  const { openQuickView, showToast } = useUI();
  const safeShowToast = showToast || (() => {});

  const inWishlist = isInWishlist(product.id);
  const maxImages = Math.min(product.images.length, 3);

  useEffect(() => {
    if (!hovered || maxImages <= 1) return;
    const interval = setInterval(() => {
      setActiveImage(prev => (prev + 1) % maxImages);
    }, 3000);
    return () => clearInterval(interval);
  }, [hovered, maxImages]);

  const handleAddToCart = (e) => {
    e.stopPropagation();
    e.preventDefault();
    addItem(product);
    safeShowToast(`${product.name} added to cart`, 'success');
  };

  const handleWishlist = (e) => {
    e.stopPropagation();
    e.preventDefault();
    toggleItem(product);
    safeShowToast(inWishlist ? 'Removed from wishlist' : 'Added to wishlist', inWishlist ? 'info' : 'success');
  };

  const handleQuickView = (e) => {
    e.stopPropagation();
    e.preventDefault();
    openQuickView(product);
  };

  const cardVariants = {
    default: 'group relative flex flex-col h-full',
    compact: 'group relative flex flex-col h-auto min-h-[320px]',
    featured: 'group relative flex flex-col h-full',
  };

  const imageWrapperVariants = {
    default: 'relative aspect-square overflow-hidden bg-surface',
    compact: 'relative aspect-[4/3] overflow-hidden bg-surface',
    featured: 'relative aspect-[3/4] overflow-hidden bg-surface',
  };

  const contentVariants = {
    default: 'flex-1 flex flex-col p-4 pt-3',
    compact: 'flex-1 flex flex-col p-3 pt-2',
    featured: 'flex-1 flex flex-col p-5 pt-4',
  };

  const TagBadge = ({ tag, tagVariant }) => {
    if (!tag) return null;
    return (
      <Badge variant={tagVariant === 'primary' ? 'bestseller' : tagVariant === 'accent' ? 'new' : 'limited'} dot>
        {tag}
      </Badge>
    );
  };

  return (
    <Link
      to={`/product/${product.id}`}
      ref={cardRef}
      className={cn(
        'block',
        cardVariants[variant],
        'bg-card border border-border/50 rounded-xl overflow-hidden transition-all duration-300 hover:border-accent/30 hover:shadow-[0_20px_60px_-20px_rgba(0,255,136,0.15)]'
      )}
      onClick={(e) => {
        if (e.target.closest('button')) e.preventDefault();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setActiveImage(0); }}
      >
        <div className={cn(imageWrapperVariants[variant], 'relative')}>
          <AnimatePresence mode="wait">
            <motion.img
              key={activeImage}
              src={product.images[activeImage]}
              alt={product.name}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onLoad={() => setImageLoaded(true)}
              loading="lazy"
            />
          </AnimatePresence>

          {!imageLoaded && (
            <div className="absolute inset-0 bg-surface flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-text-subtle animate-spin" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-bg/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="absolute top-3 left-3 right-3 flex items-start justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <TagBadge tag={product.tag} tagVariant={product.tagVariant} />
            <div className="flex gap-1.5">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleWishlist(e); }}
                className={cn(
                  'p-2 rounded-full bg-bg/80 backdrop-blur-sm border border-border/50',
                  'text-text-muted hover:text-text hover:border-border-hover',
                  'transition-all duration-200',
                  inWishlist && 'text-accent border-accent/50'
                )}
                aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart className={cn('w-4 h-4', inWishlist && 'fill-current')} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleQuickView(e); }}
                className="p-2 rounded-full bg-bg/80 backdrop-blur-sm border border-border/50 text-text-muted hover:text-text hover:border-border-hover transition-all duration-200"
                aria-label="Quick view"
              >
                <Eye className="w-4 h-4" />
              </motion.button>
            </div>
          </div>

          {maxImages > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {product.images.slice(0, 3).map((_, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.3 }}
                  whileTap={{ scale: 0.8 }}
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); setActiveImage(i); }}
                  className={cn(
                    'w-2 h-2 rounded-full border-2 transition-all duration-200',
                    i === activeImage
                      ? 'bg-accent border-accent scale-125'
                      : 'bg-bg/60 border-border/50 hover:bg-bg/80'
                  )}
                  aria-label={`View image ${i + 1}`}
                />
              ))}
            </div>
          )}

          {!product.inStock && (
            <div className="absolute inset-0 bg-bg/90 flex items-center justify-center z-10 pointer-events-none">
              <Badge variant="outOfStock" className="text-sm px-4 py-2">OUT OF STOCK</Badge>
            </div>
          )}
        </div>

        <div className={cn(contentVariants[variant])}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-xs font-body font-medium text-text-muted uppercase tracking-wider">
              {product.category.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </p>
            <div className="flex items-center gap-1 text-xs text-text-muted">
              <svg className="w-3.5 h-3.5 fill-current text-accent" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <span>{product.rating.toFixed(1)}</span>
              <span className="text-text-subtle">({formatNumber(product.reviewCount)})</span>
            </div>
          </div>

          <h3 className="text-lg font-display font-medium text-text mb-1 line-clamp-1 group-hover:text-accent transition-colors">
            {product.name}
          </h3>

          <p className="text-sm text-text-muted mb-3 line-clamp-2 flex-1">
            {product.shortDescription}
          </p>

          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-display font-semibold text-text">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-sm text-text-subtle line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleAddToCart(e); }}
              disabled={!product.inStock}
              className="px-4 py-2 text-xs font-body font-medium bg-accent text-bg rounded-lg hover:bg-accent-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
            </motion.button>
          </div>

          {product.stockCount && product.stockCount < 20 && product.inStock && (
            <p className="mt-2 text-xs text-warning flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
              Only {product.stockCount} left
            </p>
          )}
        </div>

        {!product.inStock && (
          <div className="absolute inset-0 bg-bg/90 flex items-center justify-center z-10 pointer-events-none">
            <Badge variant="outOfStock" className="text-sm px-4 py-2">OUT OF STOCK</Badge>
          </div>
        )}
      </motion.div>
    </Link>
  );
};

export default ProductCard;