import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Filter, X, Grid, List, ChevronDown, Heart } from 'lucide-react';
import { cn, formatPrice } from '../utils/helpers';
import Button from '../components/Button';
import Badge from '../components/Badge';
import ProductGrid from '../components/ProductGrid';
import FilterPanel from '../components/FilterPanel';
import { useFilters } from '../context/FilterContext';
import { products, categories } from '../data/products';

const BestSellers = () => {
  const [viewMode, setViewMode] = useState('grid');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

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

  // Pre-filter for best sellers only
  let filteredProducts = products.filter(p => p.isBestSeller);

  if (selectedCategories.length > 0) {
    filteredProducts = filteredProducts.filter(p => selectedCategories.includes(p.category));
  }

  if (priceRange[0] > 0 || priceRange[1] < 1000) {
    filteredProducts = filteredProducts.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);
  }

  if (inStockOnly) {
    filteredProducts = filteredProducts.filter(p => p.inStock);
  }

  if (showNew) {
    filteredProducts = filteredProducts.filter(p => p.isNew);
  }

  if (showLimited) {
    filteredProducts = filteredProducts.filter(p => p.isLimited);
  }

  // Note: We don't filter by showBestSellers since all products here are already best sellers

  switch (sortBy) {
    case 'price-asc':
      filteredProducts = [...filteredProducts].sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      filteredProducts = [...filteredProducts].sort((a, b) => b.price - a.price);
      break;
    case 'rating':
      filteredProducts = [...filteredProducts].sort((a, b) => b.rating - a.rating);
      break;
    case 'newest':
      filteredProducts = [...filteredProducts].sort((a, b) => (b.isNew === a.isNew ? 0 : b.isNew ? 1 : -1));
      break;
    case 'featured':
    default:
      filteredProducts = [...filteredProducts].sort((a, b) => {
        const aScore = (a.isBestSeller ? 3 : 0) + (a.isNew ? 2 : 0) + (a.isLimited ? 1 : 0);
        const bScore = (b.isBestSeller ? 3 : 0) + (b.isNew ? 2 : 0) + (b.isLimited ? 1 : 0);
        return bScore - aScore;
      });
      break;
  }

  const sortOptions = [
    { value: 'featured', label: 'Featured' },
    { value: 'price-asc', label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
    { value: 'rating', label: 'Top Rated' },
    { value: 'newest', label: 'Newest First' },
  ];

  return (
    <div className="min-h-screen pt-20 lg:pt-24 pb-20">
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <div className="absolute inset-0 noise-overlay" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Badge variant="bestseller" className="mb-4 inline-flex" dot>
            <TrendingUp className="w-3 h-3 mr-1" /> BEST SELLERS
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-text leading-tight mb-4">
            TOP RATED
          </h1>
          <p className="text-lg text-text-muted max-w-2xl">
            Our most loved products — tried, tested, and trusted by the community.
          </p>
        </motion.div>

        <motion.div
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm text-text-muted">
              {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
            </span>

            {hasActiveFilters && (
              <div className="flex items-center gap-2 flex-wrap">
                {selectedCategories.map(cat => (
                  <Badge key={cat} variant="primary" className="gap-1" onRemove={() => toggleCategory(cat)}>
                    {categories.find(c => c.id === cat)?.name || cat}
                    <X className="w-3 h-3" />
                  </Badge>
                ))}
                {(priceRange[0] > 0 || priceRange[1] < 1000) && (
                  <Badge key="price" variant="primary" className="gap-1" onRemove={() => setPriceRange([0, 1000])}>
                    ${priceRange[0]} - ${priceRange[1]}
                    <X className="w-3 h-3" />
                  </Badge>
                )}
                {inStockOnly && <Badge key="stock" variant="primary" className="gap-1" onRemove={() => setInStockOnly(false)}>In Stock Only<X className="w-3 h-3" /></Badge>}
                {showNew && <Badge key="new" variant="accent" className="gap-1" onRemove={() => setShowNew(false)}>New<X className="w-3 h-3" /></Badge>}
                {showLimited && <Badge key="limited" variant="warning" className="gap-1" onRemove={() => setShowLimited(false)}>Limited<X className="w-3 h-3" /></Badge>}
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} leftIcon={<X className="w-4 h-4" />}>
                    Clear All
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto lg:ml-0">
            <div className="relative">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="appearance-none bg-surface border border-border/50 rounded-lg px-4 py-2 pr-10 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
              >
                {sortOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle pointer-events-none" />
            </div>

            <div className="flex items-center gap-1 bg-surface border border-border/50 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={cn('p-2 rounded-md transition-colors', viewMode === 'grid' ? 'bg-accent text-bg' : 'text-text-muted hover:text-text')}
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn('p-2 rounded-md transition-colors', viewMode === 'list' ? 'bg-accent text-bg' : 'text-text-muted hover:text-text')}
                aria-label="List view"
                aria-pressed={viewMode === 'list'}
              >
                <List className="w-5 h-5" />
              </button>
            </div>

            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Filter className="w-4 h-4" />}
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden"
            >
              Filters {hasActiveFilters && <span className="w-5 h-5 rounded-full bg-accent text-bg text-xs font-bold flex items-center justify-center ml-1">{activeFilterCount}</span>}
            </Button>
          </div>
        </motion.div>

        <motion.div
          className="lg:grid lg:grid-cols-12 lg:gap-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <FilterPanel isOpen={mobileFilterOpen} onClose={() => setMobileFilterOpen(false)} className="lg:col-span-3" />

          <div className="lg:col-span-9">
            <ProductGrid
              initialProducts={filteredProducts}
              className={cn(viewMode === 'list' && 'grid-cols-1')}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default BestSellers;