import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Minus, Trash2, ShoppingBag, CheckCircle2, Loader2 } from 'lucide-react';
import { cn, formatPrice } from '../utils/helpers';
import Button from './Button';
import { useCart } from '../context/CartContext';
import { useUI } from '../context/UIContext';

const CartDrawer = () => {
  const navigate = useNavigate();
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, subtotal, shipping, tax, total, clearCart } = useCart();
  const { showToast, closeSearch } = useUI();
  const drawerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => document.body.style.overflow = '';
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, setIsOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-bg/60 backdrop-blur-sm pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-hidden="true"
          />

          <motion.aside
            ref={drawerRef}
            className="fixed right-0 top-0 h-full w-full max-w-md lg:max-w-xl bg-bg border-l border-border/50 shadow-[0_0_60px_-20px_rgba(0,0,0,0.5)] z-[9999] flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
          >
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border/50">
              <motion.h2 className="text-xl font-display font-bold text-text" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                Shopping Cart
                <span className="ml-2 text-sm font-body font-normal text-text-muted">({items.length})</span>
              </motion.h2>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg bg-surface hover:bg-surface-hover border border-border/50 text-text-muted hover:text-text transition-all"
                aria-label="Close cart"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {items.length === 0 ? (
                <motion.div
                  className="flex flex-col items-center justify-center h-full min-h-[300px] text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <ShoppingBag className="w-16 h-16 text-text-subtle mb-4 opacity-50" />
                  <p className="text-text-muted mb-2">Your vault is empty</p>
                  <p className="text-text-subtle text-sm mb-6">Add some futuristic gear to get started</p>
                  <Button size="lg" onClick={() => setIsOpen(false)} leftIcon={<ShoppingBag className="w-5 h-5" />}>
                    START SHOPPING
                  </Button>
                </motion.div>
              ) : (
                <motion.ul className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                  {items.map((item, index) => (
                    <motion.li
                      key={item.cartItemId || `drawer-${item.id}-${item.selectedColor}`}
                      className="flex gap-4 p-3 bg-surface/50 rounded-xl border border-border/50"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + index * 0.05 }}
                      layout
                    >
                      <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body font-medium text-text truncate">{item.name}</p>
                        {item.selectedColor && (
                          <p className="text-xs text-text-muted capitalize">{item.selectedColor}</p>
                        )}
                        <p className="text-sm font-display font-semibold text-accent mt-1">{formatPrice(item.price)}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.selectedColor, item.quantity - 1)}
                            className="p-1.5 rounded-lg bg-surface border border-border/50 text-text-muted hover:text-text hover:bg-surface-hover transition-all"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-10 text-center text-sm font-body font-medium text-text">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.selectedColor, item.quantity + 1)}
                            disabled={item.quantity >= (item.stockCount || 99)}
                            className="p-1.5 rounded-lg bg-surface border border-border/50 text-text-muted hover:text-text hover:bg-surface-hover transition-all disabled:opacity-40"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => removeItem(item.id, item.selectedColor)}
                        className="p-2 rounded-lg bg-error/10 text-error hover:bg-error/20 transition-colors self-start"
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 className="w-5 h-5" />
                      </motion.button>
                    </motion.li>
                  ))}
                </motion.ul>
              )}
            </div>

            {items.length > 0 && (
              <motion.div
                className="border-t border-border/50 p-4 sm:p-6 space-y-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-text-muted"><span>Subtotal</span><span className="text-text">{formatPrice(subtotal)}</span></div>
                  <div className="flex justify-between text-text-muted"><span>Shipping</span><span className="text-text">{shipping === 0 ? 'Free' : formatPrice(shipping)}</span></div>
                  <div className="flex justify-between text-text-muted"><span>Estimated Tax</span><span className="text-text">{formatPrice(tax)}</span></div>
                  <div className="h-px bg-border/50" />
                  <div className="flex justify-between text-lg font-display font-semibold text-text"><span>Total</span><span>{formatPrice(total)}</span></div>
                </div>

                <Button
                  size="lg"
                  fullWidth
                  leftIcon={<ShoppingBag className="w-5 h-5" />}
                  onClick={() => { setIsOpen(false); navigate('/checkout'); }}
                >
                  PROCEED TO CHECKOUT
                </Button>

                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={() => setIsOpen(false)}
                >
                  CONTINUE SHOPPING
                </Button>

                <p className="text-xs text-text-subtle text-center">
                  Secure checkout • 2-year warranty • 30-day returns
                </p>
              </motion.div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;