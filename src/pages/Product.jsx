import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Minus, Heart, ShoppingBag, Truck, Shield, RotateCcw, Check, Loader2, X } from 'lucide-react';
import { cn, formatPrice } from '../utils/helpers';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useUI } from '../context/UIContext';
import { getProductById, products } from '../data/products';

const Product = () => {
  const { id } = useParams();
  const product = getProductById(id);
  const { addItem } = useCart();
  const { toggleItem, isInWishlist } = useWishlist();
  const { openQuickView, showToast } = useUI();

  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState(null);
  const [activeTab, setActiveTab] = useState('description');
  const [adding, setAdding] = useState(false);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    if (product) {
      setActiveImage(0);
      setQuantity(1);
      setSelectedColor(product.colors[0]?.name || null);
    }
  }, [product, id]);

  const inWishlist = product ? isInWishlist(product.id) : false;

  const handleAddToCart = async () => {
    if (!product) return;
    setAdding(true);
    addItem(product, quantity, selectedColor);
    await new Promise(r => setTimeout(r, 500));
    setAdding(false);
    showToast(`${product.name} added to cart`, 'success');
  };

  const handleBuyNow = async () => {
    if (!product) return;
    setAdding(true);
    addItem(product, quantity, selectedColor);
    await new Promise(r => setTimeout(r, 300));
    setAdding(false);
    window.location.href = '/checkout';
  };

  const handleWishlist = () => {
    if (!product) return;
    toggleItem(product);
    showToast(inWishlist ? 'Removed from wishlist' : 'Added to wishlist', inWishlist ? 'info' : 'success');
  };

  if (!product) {
    return (
      <div className="min-h-screen pt-20 lg:pt-24 flex items-center justify-center">
        <div className="text-center">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
            <Loader2 className="w-12 h-12 mx-auto text-accent animate-spin mb-4" />
            <p className="text-text-muted">Loading product...</p>
          </motion.div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'description', label: 'Description', icon: null },
    { id: 'specs', label: 'Specifications', icon: null },
    { id: 'reviews', label: `Reviews (${product.reviewCount})`, icon: null },
    { id: 'shipping', label: 'Shipping & Returns', icon: null },
  ];

  return (
    <div className="min-h-screen pt-20 lg:pt-24 pb-20">
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <div className="absolute inset-0 noise-overlay" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.nav className="mb-8" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm text-text-muted flex-wrap">
            <li><a href="/" className="hover:text-text transition-colors">Home</a></li>
            <li><span className="mx-2">/</span></li>
            <li><a href="/shop" className="hover:text-text transition-colors">Shop</a></li>
            <li><span className="mx-2">/</span></li>
            <li><a href={`/shop?category=${product.category}`} className="hover:text-text transition-colors capitalize">{product.category.replace('-', ' ')}</a></li>
            <li><span className="mx-2">/</span></li>
            <li className="text-text truncate max-w-xs">{product.name}</li>
          </ol>
        </motion.nav>

        <motion.div
          className="grid lg:grid-cols-2 gap-8 lg:gap-12 mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="relative">
            <div className="aspect-square lg:aspect-[3/4] rounded-2xl overflow-hidden bg-surface">
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
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-bg/80 backdrop-blur-sm border border-border/50 text-text-muted hover:text-text hover:bg-bg transition-all hidden lg:flex"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setActiveImage(prev => (prev + 1) % product.images.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-bg/80 backdrop-blur-sm border border-border/50 text-text-muted hover:text-text hover:bg-bg transition-all hidden lg:flex"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </motion.button>
                </>
              )}

              {!product.inStock && (
                <div className="absolute inset-0 bg-bg/90 flex items-center justify-center">
                  <Badge variant="outOfStock" className="text-lg px-6 py-3">OUT OF STOCK</Badge>
                </div>
              )}
            </div>

            {product.images.length > 1 && (
              <motion.div
                className="flex gap-3 mt-4 overflow-x-auto pb-2 lg:hidden"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={cn(
                      'flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 transition-all',
                      i === activeImage ? 'border-accent scale-105' : 'border-border/50 hover:border-border-hover'
                    )}
                    aria-label={`View image ${i + 1}`}
                    aria-current={i === activeImage}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </motion.div>
            )}

            {product.images.length > 1 && (
              <motion.div
                className="hidden lg:flex gap-3 mt-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {product.images.slice(0, 6).map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={cn(
                      'flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all',
                      i === activeImage ? 'border-accent scale-105' : 'border-border/50 hover:border-border-hover'
                    )}
                    aria-label={`View image ${i + 1}`}
                    aria-current={i === activeImage}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </motion.div>
            )}

            <div className="flex items-center justify-center gap-4 mt-6 lg:mt-8">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleWishlist}
                className={cn(
                  'p-3 rounded-xl bg-surface border border-border/50 transition-all',
                  inWishlist ? 'text-accent border-accent/50' : 'text-text-muted hover:text-text'
                )}
                aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart className={cn('w-6 h-6', inWishlist && 'fill-current')} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => openQuickView(product)}
                className="p-3 rounded-xl bg-surface border border-border/50 text-text-muted hover:text-text hover:bg-surface-hover transition-all"
                aria-label="Quick view"
              >
                <RotateCcw className="w-6 h-6" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => { /* share */ }}
                className="p-3 rounded-xl bg-surface border border-border/50 text-text-muted hover:text-text hover:bg-surface-hover transition-all"
                aria-label="Share"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l-1.82 1.83 4.78 4.78 4.78-4.78-1.83-1.83"/></svg>
              </motion.button>
            </div>
          </div>

          <div className="lg:sticky lg:top-24">
            <div className="space-y-6">
              <div>
                <p className="text-xs font-body font-medium text-text-muted uppercase tracking-wider mb-2">
                  {product.category.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </p>
                <motion.h1 className="text-3xl lg:text-4xl font-display font-bold text-text leading-tight mb-4">
                  {product.name}
                </motion.h1>

                <div className="flex items-center gap-4 flex-wrap mb-4">
                  <div className="flex items-center gap-1">
                    <svg className="w-5 h-5 fill-current text-accent" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    <span className="font-display font-semibold text-text">{product.rating.toFixed(1)}</span>
                    <span className="text-text-muted">({product.reviewCount.toLocaleString()} reviews)</span>
                  </div>
                  {product.tag && <Badge variant={product.tagVariant === 'primary' ? 'bestseller' : product.tagVariant === 'accent' ? 'new' : 'limited'}>{product.tag}</Badge>}
                </div>

                <motion.div className="flex items-baseline gap-3 flex-wrap mb-6">
                  <span className="text-4xl font-display font-bold text-text">{formatPrice(product.price)}</span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-xl text-text-subtle line-through">{formatPrice(product.originalPrice)}</span>
                  )}
                </motion.div>

                <p className="text-text-muted leading-relaxed mb-6">{product.description}</p>

                {product.colors.length > 1 && (
                  <div className="mb-6">
                    <label className="block text-sm font-body font-medium text-text-muted mb-3">Color</label>
                    <div className="flex gap-2 flex-wrap">
                      {product.colors.map(color => (
                        <button
                          key={color.name}
                          onClick={() => setSelectedColor(color.name)}
                          className={cn(
                            'relative w-12 h-12 rounded-full border-2 transition-all',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                            selectedColor === color.name
                              ? 'border-accent scale-110 shadow-[0_0_0_3px_rgba(0,255,136,0.3)]'
                              : 'border-border/50 hover:border-border-hover'
                          )}
                          style={{ backgroundColor: color.hex }}
                          aria-label={color.name}
                          aria-pressed={selectedColor === color.name}
                        >
                          {selectedColor === color.name && <Check className="absolute inset-0 w-6 h-6 text-bg" />}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-sm text-text-muted capitalize">{selectedColor} selected</p>
                  </div>
                )}

                <div className="mb-6">
                  <label className="block text-sm font-body font-medium text-text-muted mb-3">Quantity</label>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center border border-border/50 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="px-5 py-3 text-text-muted hover:text-text hover:bg-surface transition-colors"
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
                        className="w-20 text-center text-text font-body font-medium text-lg bg-transparent focus:outline-none"
                        aria-label="Quantity"
                      />
                      <button
                        onClick={() => setQuantity(Math.min(product.stockCount || 99, quantity + 1))}
                        className="px-5 py-3 text-text-muted hover:text-text hover:bg-surface transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    {product.stockCount && product.stockCount < 50 && (
                      <span className="text-sm text-warning flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                        Only {product.stockCount} left in stock
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 mb-8">
                  <Button
                    size="xl"
                    fullWidth
                    flex={1}
                    leftIcon={<ShoppingBag className="w-5 h-5" />}
                    onClick={handleAddToCart}
                    loading={adding}
                    disabled={!product.inStock}
                  >
                    {adding ? 'ADDING...' : 'ADD TO CART'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="xl"
                    fullWidth
                    flex={1}
                    onClick={handleBuyNow}
                    disabled={!product.inStock || adding}
                  >
                    BUY NOW
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 rounded-xl bg-surface/50 border border-border/50">
                    <Truck className="w-6 h-6 mx-auto text-accent mb-2" />
                    <p className="text-xs font-body font-medium text-text-muted">Free Shipping</p>
                    <p className="text-xs text-text">Over $200</p>
                  </div>
                  <div className="p-4 rounded-xl bg-surface/50 border border-border/50">
                    <RotateCcw className="w-6 h-6 mx-auto text-accent mb-2" />
                    <p className="text-xs font-body font-medium text-text-muted">Easy Returns</p>
                    <p className="text-xs text-text">30 Days</p>
                  </div>
                  <div className="p-4 rounded-xl bg-surface/50 border border-border/50">
                    <Shield className="w-6 h-6 mx-auto text-accent mb-2" />
                    <p className="text-xs font-body font-medium text-text-muted">Warranty</p>
                    <p className="text-xs text-text">2 Years</p>
                  </div>
                </div>
              </div>

              <motion.div
                className="border-t border-border/50 pt-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex gap-4 border-b border-border/50 mb-4" role="tablist">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      role="tab"
                      aria-selected={activeTab === tab.id}
                      aria-controls={`${tab.id}-panel`}
                      id={`${tab.id}-tab`}
                      className={cn(
                        'px-4 py-3 text-sm font-body font-medium border-b-2 transition-all',
                        activeTab === tab.id
                          ? 'border-accent text-text'
                          : 'border-transparent text-text-muted hover:text-text'
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    id={`${activeTab}-panel`}
                    role="tabpanel"
                    aria-labelledby={`${activeTab}-tab`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="py-6"
                  >
                    {activeTab === 'description' && (
                      <div className="prose prose-invert max-w-none text-text-muted leading-relaxed">
                        <p>{product.description}</p>
                        <h4 className="text-text font-display font-semibold mt-6 mb-3">Key Features</h4>
                        <ul className="list-disc list-inside space-y-2">
                          {product.features.map((feature, i) => (
                            <li key={i}>{feature}</li>
                          ))}
                        </ul>
                        <h4 className="text-text font-display font-semibold mt-6 mb-3">What's in the Box</h4>
                        <ul className="list-disc list-inside space-y-2">
                          {product.includes.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {activeTab === 'specs' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Object.entries(product.specs).map(([key, value]) => (
                          <div key={key} className="p-4 rounded-xl bg-surface/50 border border-border/50">
                            <p className="text-xs font-body font-medium text-text-muted uppercase tracking-wider mb-1">{key}</p>
                            <p className="text-text">{value}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeTab === 'reviews' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="text-4xl font-display font-bold text-text">{product.rating.toFixed(1)}</div>
                            <div>
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <svg key={i} className="w-5 h-5 fill-current text-accent" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                ))}
                              </div>
                              <p className="text-sm text-text-muted">{product.reviewCount.toLocaleString()} reviews</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          {[1, 2, 3].map(i => (
                            <motion.div key={i} className="p-4 rounded-xl bg-surface/50 border border-border/50" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-display font-bold">U</div>
                                  <div>
                                    <p className="font-body font-medium text-text">User{100 + i}</p>
                                    <div className="flex items-center gap-1 text-xs">
                                      {[...Array(5)].map((_, j) => (
                                        <svg key={j} className="w-4 h-4 fill-current text-accent" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                <span className="text-xs text-text-muted">2 days ago</span>
                              </div>
                              <p className="text-text-muted">Great product! The quality is exceptional and it arrived faster than expected. Highly recommend for anyone looking for premium tech.</p>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeTab === 'shipping' && (
                      <div className="space-y-6 text-text-muted leading-relaxed">
                        <div>
                          <h4 className="text-text font-display font-semibold mb-3">Shipping</h4>
                          <p>Free standard shipping on orders over $200. Express shipping available at checkout. Orders typically ship within 1-2 business days.</p>
                        </div>
                        <div>
                          <h4 className="text-text font-display font-semibold mb-3">Returns</h4>
                          <p>30-day hassle-free returns. Items must be in original condition with all packaging. Return shipping is free for defective items.</p>
                        </div>
                        <div>
                          <h4 className="text-text font-display font-semibold mb-3">Warranty</h4>
                          <p>All products come with a 2-year manufacturer warranty. Extended warranty options available at checkout.</p>
                        </div>
                        <div>
                          <h4 className="text-text font-display font-semibold mb-3">International</h4>
                          <p>We ship to 50+ countries. Duties and taxes calculated at checkout. Delivery times vary by region.</p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Product;