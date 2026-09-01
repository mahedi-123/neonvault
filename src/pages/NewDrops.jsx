import { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Filter, X, ChevronDown } from 'lucide-react';
import Button from '../components/Button';
import Badge from '../components/Badge';
import ProductGrid from '../components/ProductGrid';
import HoloGrid from '../components/HoloGrid';
import FilterPanel from '../components/FilterPanel';
import ViewToggle from '../components/ViewToggle';
import { useFilters } from '../context/FilterContext';
import { products, categories } from '../data/products';
import { fadeUp, maskReveal, staggerContainer } from '../lib/motion';

const NewDrops = () => {
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

  // Pre-filter for new products only
  let filteredProducts = products.filter(p => p.isNew);

  if (selectedCategories.length > 0) {
    filteredProducts = filteredProducts.filter(p => selectedCategories.includes(p.category));
  }

  if (priceRange[0] > 0 || priceRange[1] < 1000) {
    filteredProducts = filteredProducts.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);
  }

  if (inStockOnly) {
    filteredProducts = filteredProducts.filter(p => p.inStock);
  }

  if (showLimited) {
    filteredProducts = filteredProducts.filter(p => p.isLimited);
  }

  if (showBestSellers) {
    filteredProducts = filteredProducts.filter(p => p.isBestSeller);
  }

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
    <div className="relative min-h-screen overflow-hidden pt-20 lg:pt-24 pb-20">
      <HoloGrid tone="cyan" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div className="mb-12" variants={staggerContainer(0.1)} initial="hidden" animate="visible">
          <motion.div variants={fadeUp}>
            <Badge variant="accent" className="mb-4 inline-flex" dot>
              <Sparkles className="w-3 h-3 mr-1" /> NEW DROPS
            </Badge>
          </motion.div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-text leading-tight mb-4">
            <span className="block overflow-hidden">
              <motion.span variants={maskReveal} className="block">JUST LANDED</motion.span>
            </span>
          </h1>
          <motion.p variants={fadeUp} className="text-lg text-text-muted max-w-2xl">
            Our latest arrivals — fresh from the vault. Be the first to grab them.
          </motion.p>
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
                {showLimited && <Badge key="limited" variant="warning" className="gap-1" onRemove={() => setShowLimited(false)}>Limited<X className="w-3 h-3" /></Badge>}
                {showBestSellers && <Badge key="bestseller" variant="bestseller" className="gap-1" onRemove={() => setShowBestSellers(false)}>Best Sellers<X className="w-3 h-3" /></Badge>}
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

            <ViewToggle viewMode={viewMode} onChange={setViewMode} />

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
              viewMode={viewMode}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default NewDrops;