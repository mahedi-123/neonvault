import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Command, X, ChevronRight, ShoppingBag, Heart, Sparkles, Package, BookOpen } from 'lucide-react';
import { cn } from '../utils/helpers';
import { useUI } from '../context/UIContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { products } from '../data/products';

const commands = [
  { id: 'search', label: 'Search Products', description: 'Find products by name or category', icon: Search, shortcut: '⌘K', action: 'search' },
  { id: 'shop', label: 'Go to Shop', description: 'Browse all products', icon: Package, shortcut: 'G S', action: 'navigate', href: '/shop' },
  { id: 'drops', label: 'New Drops', description: 'View latest releases', icon: Sparkles, shortcut: 'G D', action: 'navigate', href: '/new-drops' },
  { id: 'bestsellers', label: 'Best Sellers', description: 'Top rated products', icon: Heart, shortcut: 'G B', action: 'navigate', href: '/best-sellers' },
  { id: 'cart', label: 'Open Cart', description: 'View and edit your cart', icon: ShoppingBag, shortcut: '⌘C', action: 'cart' },
  { id: 'wishlist', label: 'Open Wishlist', description: 'View saved items', icon: Heart, shortcut: '⌘W', action: 'wishlist' },
];

const CommandPalette = () => {
  const navigate = useNavigate();
  const { commandPaletteOpen, closeCommandPalette, setCommandPaletteOpen } = useUI();
  const { itemCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.description.toLowerCase().includes(query.toLowerCase()) ||
    cmd.shortcut.toLowerCase().includes(query.toLowerCase())
  );

  const productResults = query.length > 1
    ? products.filter(p =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.category.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5)
    : [];

  useEffect(() => {
    if (commandPaletteOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
      setQuery('');
    } else {
      document.body.style.overflow = '';
    }
    return () => document.body.style.overflow = '';
  }, [commandPaletteOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!commandPaletteOpen) return;
      const totalItems = filteredCommands.length + productResults.length;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, totalItems - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        executeCommand(selectedIndex);
      } else if (e.key === 'Escape') {
        closeCommandPalette();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, filteredCommands, productResults, selectedIndex, closeCommandPalette]);

  const executeCommand = (index) => {
    if (index < filteredCommands.length) {
      const cmd = filteredCommands[index];
      switch (cmd.action) {
        case 'search':
          // handled by search overlay
          break;
        case 'navigate':
          navigate(cmd.href);
          break;
        case 'cart':
          // cart opens via context
          break;
        case 'wishlist':
          // wishlist action
          break;
      }
      closeCommandPalette();
    } else {
      const productIndex = index - filteredCommands.length;
      if (productResults[productIndex]) {
        navigate(`/product/${productResults[productIndex].id}`);
        closeCommandPalette();
      }
    }
  };

  const handleItemClick = (index) => {
    executeCommand(index);
  };

  if (!commandPaletteOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-bg/60 backdrop-blur-sm flex items-start justify-center pt-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeCommandPalette}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <motion.div
          className="w-full max-w-2xl bg-bg border border-border/50 rounded-2xl shadow-[0_0_60px_-20px_rgba(0,0,0,0.5)] overflow-hidden"
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-subtle">
              <Command className="w-5 h-5" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a command or search..."
              className="w-full px-12 py-4 pl-12 text-lg bg-transparent border-none focus:outline-none text-text placeholder:text-text-subtle font-body"
              autoComplete="off"
              spellCheck="false"
            />
            <kbd className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 bg-surface border border-border/50 rounded text-xs text-text-muted font-body">
              <span>⌘</span>K
            </kbd>
          </div>

          <div className="border-t border-border/50 max-h-[500px] overflow-y-auto">
            {filteredCommands.length > 0 && (
              <>
                <div className="px-4 py-2 text-xs font-body font-semibold text-text-muted uppercase tracking-wider">COMMANDS</div>
                {filteredCommands.map((cmd, index) => (
                  <motion.button
                    key={cmd.id}
                    className={cn(
                      'w-full px-4 py-3 flex items-center gap-3 text-left transition-colors',
                      index === selectedIndex ? 'bg-surface/50' : 'hover:bg-surface/30'
                    )}
                    onClick={() => handleItemClick(index)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', index === selectedIndex ? 'bg-accent/10 text-accent' : 'bg-surface text-text-muted')}>
                      <cmd.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-body font-medium text-text truncate">{cmd.label}</p>
                      <p className="text-xs text-text-subtle truncate">{cmd.description}</p>
                    </div>
                    <kbd className="px-2 py-1 bg-surface border border-border/50 rounded text-xs text-text-subtle font-body">{cmd.shortcut}</kbd>
                    <ChevronRight className={cn('w-4 h-4 flex-shrink-0', index === selectedIndex ? 'text-accent' : 'text-text-subtle')} />
                  </motion.button>
                ))}
              </>
            )}

            {productResults.length > 0 && (
              <>
                <div className="px-4 py-2 text-xs font-body font-semibold text-text-muted uppercase tracking-wider border-t border-border/50">PRODUCTS</div>
                {productResults.map((product, index) => (
                  <motion.button
                    key={product.id}
                    className={cn(
                      'w-full px-4 py-3 flex items-center gap-3 text-left transition-colors',
                      index + filteredCommands.length === selectedIndex ? 'bg-surface/50' : 'hover:bg-surface/30'
                    )}
                    onClick={() => handleItemClick(index + filteredCommands.length)}
                    onMouseEnter={() => setSelectedIndex(index + filteredCommands.length)}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (index + filteredCommands.length) * 0.03 }}
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative">
                      <img src={product.images[0]} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-body font-medium text-text truncate">{product.name}</p>
                      <p className="text-xs text-text-subtle truncate capitalize">{product.category.replace('-', ' ')}</p>
                    </div>
                    <span className="text-sm font-display font-semibold text-accent">${product.price}</span>
                  </motion.button>
                ))}
              </>
            )}

            {(filteredCommands.length === 0 && productResults.length === 0 && query) && (
              <div className="px-4 py-8 text-center text-text-muted">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No commands or products found for "{query}"</p>
              </div>
            )}

            {(!query || query.length <= 1) && productResults.length === 0 && (
              <div className="px-4 py-4 text-center text-text-subtle border-t border-border/50">
                <p>Press <kbd className="px-1.5 py-0.5 bg-surface border border-border/50 rounded text-xs font-body">⌘K</kbd> to close</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CommandPalette;