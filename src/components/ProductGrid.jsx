import { motion } from 'framer-motion';
import ProductCard from './ProductCard';
import { useFilters } from '../context/FilterContext';
import { getProductsByCategory, searchProducts, products } from '../data/products';
import { cn } from '../utils/helpers';

const ProductGrid = ({ 
  initialProducts, 
  category = 'all', 
  searchQuery = '',
  className = '',
  showLoadMore = false,
  itemsPerPage = 12 
}) => {
  const { selectedCategories, priceRange, sortBy, inStockOnly, showNew, showLimited, showBestSellers } = useFilters();

  let filteredProducts = initialProducts || products;

  if (category !== 'all') {
    filteredProducts = filteredProducts.filter(p => p.category === category);
  }

  if (searchQuery) {
    filteredProducts = searchProducts(searchQuery);
  }

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

  const displayProducts = showLoadMore ? filteredProducts.slice(0, itemsPerPage) : filteredProducts;

  return (
    <>
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6', className)} role="list" aria-label="Products">
        {displayProducts.map((product, index) => (
          <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03, duration: 0.4 }}>
            <ProductCard product={product} />
          </motion.div>
        ))}
      </div>

      {displayProducts.length === 0 && (
        <motion.div className="text-center py-16" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <svg className="w-16 h-16 mx-auto text-text-subtle mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <p className="text-text-muted">No products found</p>
          <p className="text-text-subtle text-sm mt-1">Try adjusting your filters or search terms</p>
        </motion.div>
      )}

      {showLoadMore && filteredProducts.length > itemsPerPage && (
        <motion.div className="text-center mt-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <button className="px-8 py-3 bg-surface border border-border/50 rounded-xl text-text font-body font-medium hover:bg-surface-hover hover:border-border-hover transition-all">
            LOAD MORE ({filteredProducts.length - itemsPerPage} remaining)
          </button>
        </motion.div>
      )}
    </>
  );
};

export default ProductGrid;