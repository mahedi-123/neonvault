import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ShoppingBag, Heart, User, Menu, X, ChevronDown, Sun, Moon } from 'lucide-react';
import { cn } from '../utils/helpers';
import Button from './Button';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useUI } from '../context/UIContext';
import { useAuth } from '../context/AuthContext';
import { products, categories } from '../data/products';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const megaMenuRef = useRef(null);
  const { isOpen: cartOpen, itemCount, setIsOpen } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { searchOpen, openSearch, mobileMenuOpen, setMobileMenuOpen, megaMenuOpen, setMegaMenuOpen, megaMenuCategory, setMegaMenuCategory } = useUI();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (megaMenuRef.current && !megaMenuRef.current.contains(e.target)) {
        setMegaMenuOpen(false);
        setMegaMenuCategory(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setMegaMenuOpen, setMegaMenuCategory]);

  // The vault is a full-viewport takeover with its own minimal header (see
  // VaultOverlayUI) — the standard site chrome would otherwise sit right on
  // top of it (both fixed to the same top-left corner), crowding the vault's
  // own breadcrumb. Global overlays (search, cart, command palette, toasts)
  // stay mounted in Layout regardless, so keyboard shortcuts still work.
  if (location.pathname === '/vault') return null;

  const navItems = [
    { label: 'Shop', href: '/shop', category: 'all' },
    { label: 'Collections', href: '/collections', category: null },
    { label: 'New Drops', href: '/new-drops', category: null },
    { label: 'Best Sellers', href: '/best-sellers', category: null },
    { label: 'Journal', href: '/journal', category: null },
  ];

  const categoryItems = categories.filter(c => c.id !== 'all').slice(0, 8);

  return (
    <motion.header
      className={cn(
        'fixed top-0 left-0 right-0 z-50',
        'transition-all duration-300',
        scrolled && 'bg-bg/95 backdrop-blur-xl border-b border-border/50 shadow-[0_1px_3px_rgba(0,0,0,0.3)]'
      )}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
    >
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
        <div className="flex h-16 lg:h-20 items-center justify-between gap-4">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="shrink-0">
            <Link
              to="/"
              className="flex items-center gap-2 text-xl font-display font-bold text-text"
              aria-label="NEONVAULT Home"
            >
              <span className="text-accent">NEON</span>VAULT
            </Link>
          </motion.div>

          <div className="hidden lg:flex lg:items-center lg:gap-1 lg:mx-auto">
            {navItems.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                {item.category ? (
                  <div className="relative">
                    <button
                      className={cn(
                        'px-3 py-2 text-sm font-body font-medium text-text-muted hover:text-text',
                        'transition-colors duration-200 rounded-lg',
                        'hover:bg-surface'
                      )}
                      onMouseEnter={() => {
                        setHoveredCategory(item.label);
                        setMegaMenuCategory(item.label);
                        setMegaMenuOpen(true);
                      }}
                      onMouseLeave={() => setHoveredCategory(null)}
                      aria-expanded={megaMenuOpen && megaMenuCategory === item.label}
                      aria-haspopup="true"
                    >
                      <span className="flex items-center gap-1">
                        {item.label}
                        <ChevronDown className="w-4 h-4 transition-transform" style={{ transform: megaMenuOpen && megaMenuCategory === item.label ? 'rotate(180deg)' : '' }} />
                      </span>
                    </button>
                  </div>
                ) : (
                  <Link
                    to={item.href}
                    className="px-3 py-2 text-sm font-body font-medium text-text-muted hover:text-text transition-colors duration-200 rounded-lg hover:bg-surface"
                  >
                    {item.label}
                  </Link>
                )}
              </motion.div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={openSearch}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center p-2 rounded-lg bg-surface hover:bg-surface-hover border border-border/50 text-text-muted hover:text-text transition-all duration-200"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center p-2 rounded-lg bg-surface hover:bg-surface-hover border border-border/50 text-text-muted hover:text-text transition-all duration-200 lg:hidden"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsOpen(true)}
              className="relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center p-2 rounded-lg bg-surface hover:bg-surface-hover border border-border/50 text-text-muted hover:text-text transition-all duration-200"
              aria-label={`Cart${itemCount > 0 ? `, ${itemCount} items` : ', empty'}`}
            >
              <ShoppingBag className="w-5 h-5" />
              {itemCount > 0 && (
                <motion.span
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent text-bg text-xs font-body font-bold flex items-center justify-center"
                  animate={{ scale: [1, 1.2, 1] }}
                >
                  {itemCount > 99 ? '99+' : itemCount}
                </motion.span>
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="relative hidden min-h-[44px] min-w-[44px] items-center justify-center p-2 rounded-lg bg-surface hover:bg-surface-hover border border-border/50 text-text-muted hover:text-text transition-all duration-200 sm:inline-flex"
              aria-label={`Wishlist${wishlistCount > 0 ? `, ${wishlistCount} items` : ', empty'}`}
            >
              <Heart className="w-5 h-5" />
              {wishlistCount > 0 && (
                <motion.span
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-warning text-bg text-xs font-body font-bold flex items-center justify-center"
                >
                  {wishlistCount > 99 ? '99+' : wishlistCount}
                </motion.span>
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(isAuthenticated ? '/account' : '/sign-in')}
              className="hidden min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center p-2 rounded-lg bg-surface hover:bg-surface-hover border border-border/50 text-text-muted hover:text-text transition-all duration-200 sm:inline-flex"
              aria-label={isAuthenticated ? 'My Account' : 'Sign In'}
            >
              <User className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        <AnimatePresence>
          {megaMenuOpen && megaMenuCategory && (
            <motion.div
              ref={megaMenuRef}
              className="absolute left-0 right-0 top-full bg-bg/98 backdrop-blur-xl border-b border-border/50 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5)] overflow-hidden"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              onMouseEnter={() => { setMegaMenuOpen(true); setHoveredCategory(megaMenuCategory); }}
              onMouseLeave={() => { setMegaMenuOpen(false); setMegaMenuCategory(null); }}
            >
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1">
                  <h4 className="text-sm font-body font-semibold text-text-muted uppercase tracking-wider mb-4">Categories</h4>
                  <ul className="space-y-2">
                    {categoryItems.map(cat => (
                      <li key={cat.id}>
                        <Link
                          to={`/shop?category=${cat.id}`}
                          className="flex items-center justify-between px-3 py-2 text-sm font-body text-text-muted hover:text-text rounded-lg hover:bg-surface transition-all duration-200"
                        >
                          {cat.name}
                          <span className="text-xs text-text-subtle">{cat.count}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.filter(p => p.isBestSeller || p.isNew || p.isLimited).slice(0, 6).map(product => (
                    <Link
                      key={product.id}
                      to={`/product/${product.id}`}
                      className="group flex gap-3 p-3 rounded-xl bg-surface hover:bg-surface-hover border border-border/50 transition-all duration-200"
                    >
                      <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden">
                        <img src={product.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-body font-medium text-text truncate group-hover:text-accent transition-colors">{product.name}</p>
                        <p className="text-sm font-display font-semibold text-accent mt-1">{product.price > 0 ? `$${product.price}` : 'Coming Soon'}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              className="fixed inset-0 z-50 bg-bg/98 backdrop-blur-xl flex flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              role="dialog"
              aria-modal="true"
              aria-label="Mobile menu"
            >
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border/50">
                <h2 className="text-lg font-display font-bold text-text flex items-center gap-2">
                  <Menu className="w-5 h-5 text-accent" />
                  Menu
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center p-2 rounded-lg bg-surface hover:bg-surface-hover border border-border/50 text-text-muted hover:text-text transition-all"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <nav className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-body font-semibold text-text-muted uppercase tracking-wider mb-4">Shop</h3>
                    <ul className="space-y-3">
                      {navItems.map(item => (
                        <li key={item.label}>
                          {item.category ? (
                            <button
                              className="w-full text-left px-4 py-3 text-base font-body text-text hover:text-accent transition-colors"
                              onClick={() => {
                                setMegaMenuCategory(item.label);
                                setMegaMenuOpen(true);
                                setMobileMenuOpen(false);
                              }}
                            >
                              {item.label}
                            </button>
                          ) : (
                            <Link
                              to={item.href}
                              className="block px-4 py-3 text-base font-body text-text-muted hover:text-text hover:text-accent transition-colors"
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              {item.label}
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-body font-semibold text-text-muted uppercase tracking-wider mb-4">Categories</h3>
                    <ul className="space-y-2">
                      {categoryItems.map(cat => (
                        <li key={cat.id}>
                          <Link
                            to={`/shop?category=${cat.id}`}
                            className="block px-4 py-3 text-base font-body text-text-muted hover:text-text hover:text-accent transition-colors"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            {cat.name}
                            <span className="ml-2 text-xs text-text-subtle">({cat.count})</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>

<div>
                      <h3 className="text-sm font-body font-semibold text-text-muted uppercase tracking-wider mb-4">Account</h3>
                      <ul className="space-y-3">
                        <li>
                          <button className="w-full text-left px-4 py-3 text-base font-body text-text-muted hover:text-text hover:text-accent transition-colors" onClick={() => { setMobileMenuOpen(false); setIsOpen(true); }}>
                            Cart {itemCount > 0 && `(${itemCount})`}
                          </button>
                        </li>
                        <li>
                          <button className="w-full text-left px-4 py-3 text-base font-body text-text-muted hover:text-text hover:text-accent transition-colors" onClick={() => { setMobileMenuOpen(false); navigate('/account'); }}>
                            Wishlist {wishlistCount > 0 && `(${wishlistCount})`}
                          </button>
                        </li>
                        <li>
                          <button className="w-full text-left px-4 py-3 text-base font-body text-text-muted hover:text-text hover:text-accent transition-colors" onClick={() => { setMobileMenuOpen(false); navigate(isAuthenticated ? '/account' : '/sign-in'); }}>
                            {isAuthenticated ? 'My Account' : 'Sign In'}
                          </button>
                        </li>
                      </ul>
                    </div>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.header>
  );
};

export default Navbar;