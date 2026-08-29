import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Plus, Minus, Heart, ShoppingBag, Check, Loader2 } from 'lucide-react';
import { cn, formatPrice } from '../utils/helpers';
import Button from './Button';
import Badge from './Badge';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useUI } from '../context/UIContext';
import { getProductById } from '../data/products';

const ProductQuickView = () => {
  const { quickViewProduct, closeQuickView } = useUI();
  const { addItem } = useCart();
  const { toggleItem, isInWishlist } = useWishlist();
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState(null);
  const [adding, setAdding] = useState(false);

  const product = quickViewProduct;

  useEffect(() => {
    if (product) {
      setActiveImage(0);
      setQuantity(1);
      setSelectedColor(product.colors[0]?.name || null);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => document.body.style.overflow = '';
  }, [product]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeQuickView();
      if (e.key === 'ArrowLeft') setActiveImage(prev => (prev - 1 + product.images.length) % product.images.length);
      if (e.key === 'ArrowRight') setActiveImage(prev => (prev + 1) % product.images.length);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [product, closeQuickView]);

  if (!product) return null;

  const inWishlist = isInWishlist(product.id);

  const handleAddToCart = async () => {
    setAdding(true);
    addItem(product, quantity, selectedColor);
    await new Promise(r => setTimeout(r, 500));
    setAdding(false);
    closeQuickView();
  };

  const handleWishlist = () => {
    toggleItem(product);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-sm flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeQuickView}
        role="dialog"
        aria-modal="true"
        aria-label={`${product.name} - Quick View`}
      >
        <motion.div
          className="relative w-full max-w-4xl max-h-[90vh] bg-bg border border-border/50 rounded-2xl overflow-hidden shadow-[0_0_60px_-20px_rgba(0,0,0,0.5)] flex"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
        >
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={closeQuickView}
            className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-surface/80 backdrop-blur-sm border border-border/50 text-text-muted hover:text-text hover:bg-surface transition-all"
            aria-label="Close quick view"
          >
            <X className="w-5 h-5" />
          </motion.button>

          <div className="w-full lg:w-1/2 relative">
            <div className="aspect-square lg:aspect-[3/4] relative overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeImage}
                  src={product.images[activeImage]}
                  alt={`${product.name} - View ${activeImage + 1}`}
                  className="w-full h-full object-cover"
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                />
              </AnimatePresence>

              {product.images.length > 1 && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setActiveImage(prev => (prev - 1 + product.images.length) % product.images.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-bg/60 backdrop-blur-sm border border-border/50 text-text-muted hover:text-text hover:bg-bg/80 transition-all"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setActiveImage(prev => (prev + 1) % product.images.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-bg/60 backdrop-blur-sm border border-border/50 text-text-muted hover:text-text hover:bg-bg/80 transition-all"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </motion.button>
                </>
              )}

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {product.images.slice(0, 5).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={cn(
                      'w-2 h-2 rounded-full border-2 transition-all',
                      i === activeImage
                        ? 'bg-accent border-accent scale-125'
                        : 'bg-bg/60 border-border/50 hover:bg-bg/80'
                    )}
                    aria-label={`View image ${i + 1}`}
                    aria-current={i === activeImage}
                  />
                ))}
              </div>

              {!product.inStock && (
                <div className="absolute inset-0 bg-bg/90 flex items-center justify-center">
                  <Badge variant="outOfStock" className="text-lg px-6 py-3">OUT OF STOCK</Badge>
                </div>
              )}
            </div>
          </div>

          <div className="w-full lg:w-1/2 p-6 lg:p-8 overflow-y-auto max-h-[90vh]">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-xs font-body font-medium text-text-muted uppercase tracking-wider mb-1">
                  {product.category.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </p>
                <motion.h2 className="text-2xl lg:text-3xl font-display font-bold text-text">
                  {product.name}
                </motion.h2>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleWishlist}
                className={cn(
                  'p-2 rounded-xl bg-surface/50 border border-border/50 transition-all',
                  inWishlist ? 'text-accent border-accent/50' : 'text-text-muted hover:text-text'
                )}
                aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart className={cn('w-5 h-5', inWishlist && 'fill-current')} />
              </motion.button>
            </div>

            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-3xl font-display font-bold text-text">{formatPrice(product.price)}</span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-lg text-text-subtle line-through">{formatPrice(product.originalPrice)}</span>
              )}
              {product.tag && <Badge variant={product.tagVariant === 'primary' ? 'bestseller' : product.tagVariant === 'accent' ? 'new' : 'limited'}>{product.tag}</Badge>}
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-1 text-sm">
                <svg className="w-4 h-4 fill-current text-accent" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                <span className="font-display font-semibold text-text">{product.rating.toFixed(1)}</span>
                <span className="text-text-muted">({product.reviewCount.toLocaleString()})</span>
              </div>
              {product.stockCount && product.stockCount < 50 && (
                <span className="text-xs text-warning flex items-center gap-1 ml-auto">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                  Only {product.stockCount} left
                </span>
              )}
            </div>

            <p className="text-text-muted mb-6 leading-relaxed">{product.description}</p>

            {product.colors.length > 1 && (
              <div className="mb-6">
                <label className="block text-sm font-body font-medium text-text-muted mb-3">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {product.colors.map(color => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color.name)}
                      className={cn(
                        'relative w-10 h-10 rounded-full border-2 transition-all',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                        selectedColor === color.name
                          ? 'border-accent scale-110 shadow-[0_0_0_3px_rgba(0,255,136,0.3)]'
                          : 'border-border/50 hover:border-border-hover'
                      )}
                      style={{ backgroundColor: color.hex }}
                      aria-label={color.name}
                      aria-pressed={selectedColor === color.name}
                    >
                      {selectedColor === color.name && <Check className="absolute inset-0 w-5 h-5 text-bg" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-body font-medium text-text-muted mb-3">Quantity</label>
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-border/50 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-2 text-text-muted hover:text-text hover:bg-surface transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                    max={product.stockCount || 99}
                    className="w-16 text-center text-text font-body font-medium bg-transparent focus:outline-none"
                    aria-label="Quantity"
                  />
                  <button
                    onClick={() => setQuantity(Math.min(product.stockCount || 99, quantity + 1))}
                    className="px-4 py-2 text-text-muted hover:text-text hover:bg-surface transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <span className="text-sm text-text-muted">Available: {product.stockCount || 'Many'}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                size="lg"
                fullWidth
                leftIcon={<ShoppingBag className="w-5 h-5" />}
                onClick={handleAddToCart}
                loading={adding}
                disabled={!product.inStock}
              >
                {adding ? 'ADDED!' : 'ADD TO CART'}
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => { /* navigate to product page */ closeQuickView(); }}
                className="w-14"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </Button>
            </div>

            <div className="mt-6 pt-6 border-t border-border/50 grid grid-cols-3 gap-4 text-sm">
              <div className="flex flex-col items-center gap-1">
                <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                <span className="text-text-subtle">Free Shipping</span>
                <span className="text-xs text-text">Over $200</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12V7H5"/><path d="M16 7l-4-4"/><path d="M8 7l4-4"/><path d="M3 22v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/></svg>
                <span className="text-text-subtle">Easy Returns</span>
                <span className="text-xs text-text">30 Days</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h12"/><path d="M10 16h4"/></svg>
                <span className="text-text-subtle">Warranty</span>
                <span className="text-xs text-text">2 Years</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProductQuickView;