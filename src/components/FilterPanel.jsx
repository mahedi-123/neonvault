import { motion } from 'framer-motion';
import { X, ChevronDown, ChevronUp, SlidersHorizontal, Tag, DollarSign, TrendingUp, Sparkles, Filter as FilterIcon, CheckCircle } from 'lucide-react';
import { cn } from '../utils/helpers';
import Button from './Button';
import { useFilters } from '../context/FilterContext';
import { categories } from '../data/products';

const FilterPanel = ({ isOpen, onClose, className = '' }) => {
  const {
    selectedCategories,
    setSelectedCategories,
    toggleCategory,
    priceRange,
    setPriceRange,
    sortBy,
    setSortBy,
    inStockOnly,
    setInStockOnly,
    showNew,
    setShowNew,
    showLimited,
    setShowLimited,
    showBestSellers,
    setShowBestSellers,
    clearFilters,
    hasActiveFilters,
    activeFilterCount,
  } = useFilters();

  const handlePriceChange = (e, index) => {
    const value = parseInt(e.target.value) || 0;
    const newRange = [...priceRange];
    newRange[index] = Math.max(0, Math.min(1000, value));
    newRange[0] = Math.min(newRange[0], newRange[1]);
    newRange[1] = Math.max(newRange[0], newRange[1]);
    setPriceRange(newRange);
  };

  const sortOptions = [
    { value: 'featured', label: 'Featured' },
    { value: 'price-asc', label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
    { value: 'rating', label: 'Top Rated' },
    { value: 'newest', label: 'Newest First' },
  ];

  return (
    <>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-40 bg-bg/60 backdrop-blur-sm lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <motion.aside
        className={cn(
          'fixed right-0 top-0 h-full w-full max-w-sm bg-bg border-l border-border/50 z-50 flex flex-col shadow-[0_0_60px_-20px_rgba(0,0,0,0.5)]',
          'lg:relative lg:max-w-none lg:w-auto lg:border-0 lg:shadow-none lg:bg-transparent lg:flex-row lg:items-start lg:h-auto lg:p-0',
          className
        )}
        initial={{ x: '100vw' }}
        animate={{ x: isOpen ? 0 : '100vw' }}
        exit={{ x: '100vw' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
      >
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border/50 lg:hidden">
          <h2 className="text-lg font-display font-bold text-text flex items-center gap-2">
            <FilterIcon className="w-5 h-5 text-accent" />
            Filters
            {hasActiveFilters && (
              <span className="text-sm font-body bg-accent/10 text-accent px-2 py-0.5 rounded-full">{activeFilterCount}</span>
            )}
          </h2>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-2 rounded-lg bg-surface hover:bg-surface-hover border border-border/50 text-text-muted hover:text-text transition-all"
            aria-label="Close filters"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-0 lg:border-0 lg:bg-transparent space-y-8">
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-body font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Categories
              </h3>
            </div>
            <div className="space-y-2">
              {categories.filter(c => c.id !== 'all').map(cat => (
                <label key={cat.id} className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-text">{cat.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-subtle">{cat.count}</span>
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat.id)}
                      onChange={() => toggleCategory(cat.id)}
                      className="w-4 h-4 rounded border-border text-accent bg-surface focus:ring-accent focus:ring-2"
                    />
                  </div>
                </label>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h3 className="text-sm font-body font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Price Range
            </h3>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={priceRange[0]}
                onChange={e => handlePriceChange(e, 0)}
                min={0}
                max={1000}
                placeholder="Min"
                className="flex-1 px-3 py-2 bg-surface border border-border/50 rounded-lg text-text placeholder:text-text-subtle text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <span className="text-text-muted">—</span>
              <input
                type="number"
                value={priceRange[1]}
                onChange={e => handlePriceChange(e, 1)}
                min={0}
                max={1000}
                placeholder="Max"
                className="flex-1 px-3 py-2 bg-surface border border-border/50 rounded-lg text-text placeholder:text-text-subtle text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={1000}
                value={priceRange[0]}
                onChange={e => handlePriceChange(e, 0)}
                className="flex-1 accent-accent"
              />
              <input
                type="range"
                min={0}
                max={1000}
                value={priceRange[1]}
                onChange={e => handlePriceChange(e, 1)}
                className="flex-1 accent-accent"
              />
            </div>
            <p className="text-xs text-text-subtle">${priceRange[0]} — ${priceRange[1]}</p>
          </motion.div>

          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-sm font-body font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Sort By
            </h3>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border/50 rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent appearance-none bg-no-repeat bg-right"
              style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%238b8b9a%27 stroke-width=%272%27%3E%3Cpath d=%27M6 9l6 6 6-6%27/%3E%3C/svg%3E")', backgroundPosition: 'right 12px center' }}
            >
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </motion.div>

          <motion.div
            className="space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <h3 className="text-sm font-body font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              Tags
            </h3>
            <div className="space-y-2">
              {[
                { key: 'inStockOnly', label: 'In Stock Only', icon: CheckCircle, value: inStockOnly, onChange: setInStockOnly },
                { key: 'showNew', label: 'New Arrivals', icon: Sparkles, value: showNew, onChange: setShowNew },
                { key: 'showLimited', label: 'Limited Edition', icon: Tag, value: showLimited, onChange: setShowLimited },
                { key: 'showBestSellers', label: 'Best Sellers', icon: TrendingUp, value: showBestSellers, onChange: setShowBestSellers },
              ].map(filter => (
                <label key={filter.key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filter.value}
                    onChange={e => filter.onChange(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-accent bg-surface focus:ring-accent focus:ring-2"
                  />
                  <span className="text-sm text-text">{filter.label}</span>
                </label>
              ))}
            </div>
          </motion.div>

          {hasActiveFilters && (
            <motion.div
              className="pt-4 border-t border-border/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Button variant="secondary" fullWidth onClick={clearFilters} leftIcon={<X className="w-4 h-4" />}>
                CLEAR ALL FILTERS
              </Button>
            </motion.div>
          )}
        </div>
      </motion.aside>
    </>
  );
};

export default FilterPanel;