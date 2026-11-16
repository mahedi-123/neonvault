import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const FilterContext = createContext(null);

export const FilterProvider = ({ children }) => {
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [sortBy, setSortBy] = useState('featured');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showLimited, setShowLimited] = useState(false);
  const [showBestSellers, setShowBestSellers] = useState(false);

  const toggleCategory = useCallback((category) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedCategories([]);
    setPriceRange([0, 1000]);
    setSortBy('featured');
    setInStockOnly(false);
    setShowNew(false);
    setShowLimited(false);
    setShowBestSellers(false);
  }, []);

  const hasActiveFilters = useMemo(() =>
    selectedCategories.length > 0 ||
    priceRange[0] > 0 ||
    priceRange[1] < 1000 ||
    inStockOnly ||
    showNew ||
    showLimited ||
    showBestSellers,
    [selectedCategories, priceRange, inStockOnly, showNew, showLimited, showBestSellers]
  );

  const activeFilterCount = useMemo(() => {
    let count = selectedCategories.length;
    if (priceRange[0] > 0 || priceRange[1] < 1000) count++;
    if (inStockOnly) count++;
    if (showNew) count++;
    if (showLimited) count++;
    if (showBestSellers) count++;
    return count;
  }, [selectedCategories, priceRange, inStockOnly, showNew, showLimited, showBestSellers]);

  const value = useMemo(() => ({
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
  }), [
    selectedCategories, priceRange, sortBy, inStockOnly,
    showNew, showLimited, showBestSellers,
    toggleCategory, clearFilters, hasActiveFilters, activeFilterCount
  ]);

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilters = () => {
  const context = useContext(FilterContext);
  if (!context) throw new Error('useFilters must be used within FilterProvider');
  return context;
};