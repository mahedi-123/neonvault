import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, TrendingUp, Clock, Loader2, ChevronRight } from 'lucide-react';
import { cn } from '../utils/helpers';
import Button from './Button';
import Badge from './Badge';
import ProductCard from './ProductCard';
import { useUI } from '../context/UIContext';
import { useFilters } from '../context/FilterContext';
import { searchProducts, getProductsByCategory } from '../data/products';
import { debounce } from '../utils/helpers';

const SearchOverlay = () => {
  const { searchOpen, closeSearch, searchQuery, setSearchQuery } = useUI();
  const { selectedCategories, toggleCategory, clearFilters } = useFilters();
  const inputRef = useRef(null);
  const [results, setResults] = useState([]);
  const [recentSearches, setRecentSearches] = useState(() => JSON.parse(localStorage.getItem('neonvault_recent_searches') || '[]'));
  const [trendingSearches] = useState(['NEON X1', 'VOID Keyboard', 'ARC Mouse', 'PULSE Ring', 'APEX Earbuds']);
  const [isLoading, setIsLoading] = useState(false);

  const debouncedSearch = useRef(
    debounce((query) => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setIsLoading(true);
      setTimeout(() => {
        const found = searchProducts(query);
        setResults(found.slice(0, 8));
        setIsLoading(false);
      }, 150);
    }, 150)
  ).current;

  useEffect(() => {
    if (searchOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = '';
    }
    return () => document.body.style.overflow = '';
  }, [searchOpen]);

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (!recentSearches.includes(searchQuery)) {
        const updated = [searchQuery, ...recentSearches.slice(0, 4)];
        setRecentSearches(updated);
        localStorage.setItem('neonvault_recent_searches', JSON.stringify(updated));
      }
      closeSearch();
    }
  };

  const selectSuggestion = (query) => {
    setSearchQuery(query);
    const updated = [query, ...recentSearches.filter(s => s !== query).slice(0, 4)];
    setRecentSearches(updated);
    localStorage.setItem('neonvault_recent_searches', JSON.stringify(updated));
    closeSearch();
  };

  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('neonvault_recent_searches');
  };

  if (!searchOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-bg/98 backdrop-blur-xl flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        role="dialog"
        aria-modal="true"
        aria-label="Search"
      >
        <motion.div
          className="flex items-center justify-between p-4 sm:p-6 border-b border-border/50"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="relative flex-1 max-w-4xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-subtle" />
            <input
              ref={inputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && closeSearch()}
              onSubmit={handleSearch}
              className="w-full bg-surface border border-border/50 focus:border-accent focus:ring-2 focus:ring-accent rounded-xl px-12 py-4 text-lg text-text placeholder:text-text-subtle font-body"
              placeholder="Search products, categories... (Press / to open)"
              autoComplete="off"
              autoFocus
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={closeSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-text-muted hover:text-text transition-colors"
              aria-label="Close search"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 bg-surface border border-border/50 rounded-lg text-xs text-text-muted font-body">
            <span>⌘</span>K
          </kbd>
        </motion.div>

        <motion.div
          className="flex-1 overflow-y-auto p-4 sm:p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          {!searchQuery.trim() && (
            <>
              {(recentSearches.length > 0 || trendingSearches.length > 0) && (
                <div className="space-y-8">
                  {recentSearches.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-body font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Recent Searches
                        </h3>
                        <button onClick={clearRecent} className="text-xs text-text-subtle hover:text-text transition-colors">Clear</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {recentSearches.map((term, i) => (
                          <motion.button
                            key={`recent-${term}`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => selectSuggestion(term)}
                            className="px-4 py-2 bg-surface border border-border/50 rounded-xl text-sm text-text hover:bg-surface-hover hover:border-border-hover transition-all"
                          >
                            <Search className="w-4 h-4 mr-2 text-text-subtle" />
                            {term}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-body font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2 mb-4">
                      <TrendingUp className="w-4 h-4 text-accent" />
                      Trending
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {trendingSearches.map((term, i) => (
                        <motion.button
                          key={`trending-${term}`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => selectSuggestion(term)}
                          className="px-4 py-2 bg-surface border border-border/50 rounded-xl text-sm text-text hover:bg-surface-hover hover:border-border-hover transition-all"
                        >
                          <TrendingUp className="w-4 h-4 mr-2 text-accent" />
                          {term}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-body font-semibold text-text-muted uppercase tracking-wider mb-4">Categories</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      {['headphones', 'keyboards', 'mice', 'wearables', 'smart-home', 'gaming', 'audio', 'accessories'].map(cat => (
                        <button
                          key={`cat-${cat}`}
                          onClick={() => { toggleCategory(cat); selectSuggestion(''); }}
                          className={cn(
                            'p-4 rounded-xl text-left border transition-all',
                            selectedCategories.includes(cat)
                              ? 'bg-accent/10 border-accent/50 text-text'
                              : 'bg-surface border-border/50 text-text-muted hover:text-text hover:border-border-hover'
                          )}
                        >
                          <p className="font-body font-medium capitalize">{cat.replace('-', ' ')}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {searchQuery.trim() && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-body font-semibold text-text-muted uppercase tracking-wider">
                  {isLoading ? 'Searching...' : `Found ${results.length} result${results.length !== 1 ? 's' : ''}`}
                </h3>
                {isLoading && <Loader2 className="w-5 h-5 text-accent animate-spin" />}
              </div>

              {results.length === 0 && !isLoading ? (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 mx-auto text-text-subtle mb-4" />
                  <p className="text-text-muted">No products found for "{searchQuery}"</p>
                  <p className="text-text-subtle text-sm mt-1">Try different keywords or browse categories</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {results.map(product => (
                    <ProductCard key={product.id} product={product} variant="compact" />
                  ))}
                </div>
              )}

              {results.length > 0 && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { /* navigate to full results */ closeSearch(); }}
                  className="mt-8 w-full py-4 bg-surface border border-border/50 rounded-xl text-text font-body font-medium hover:bg-surface-hover hover:border-border-hover transition-all flex items-center justify-center gap-2"
                >
                  View all results
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              )}
            </div>
          )}
        </motion.div>

        <motion.div
          className="p-4 border-t border-border/50 text-center text-sm text-text-subtle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <kbd className="px-2 py-1 bg-surface border border-border/50 rounded">Esc</kbd> to close &nbsp;
          <kbd className="px-2 py-1 bg-surface border border-border/50 rounded">/</kbd> to search
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SearchOverlay;