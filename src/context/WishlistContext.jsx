import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getLocalStorage, setLocalStorage } from '../utils/helpers';

const WishlistContext = createContext(null);

export const WishlistProvider = ({ children }) => {
  const [items, setItems] = useState(() => getLocalStorage('neonvault_wishlist', []));

  useEffect(() => {
    setLocalStorage('neonvault_wishlist', items);
  }, [items]);

  const addItem = useCallback((product) => {
    setItems(prev => {
      if (prev.some(item => item.id === product.id)) return prev;
      return [...prev, {
        id: product.id,
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice,
        image: product.images[0],
        tag: product.tag,
        tagVariant: product.tagVariant,
        inStock: product.inStock,
      }];
    });
  }, []);

  const removeItem = useCallback((id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const toggleItem = useCallback((product) => {
    setItems(prev => {
      if (prev.some(item => item.id === product.id)) {
        return prev.filter(item => item.id !== product.id);
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice,
        image: product.images[0],
        tag: product.tag,
        tagVariant: product.tagVariant,
        inStock: product.inStock,
      }];
    });
  }, []);

  const isInWishlist = useCallback((id) => items.some(item => item.id === id), [items]);

  const clearWishlist = useCallback(() => setItems([]), []);

  const count = useMemo(() => items.length, [items]);

  const value = useMemo(() => ({
    items,
    addItem,
    removeItem,
    toggleItem,
    isInWishlist,
    clearWishlist,
    count,
  }), [items, addItem, removeItem, toggleItem, isInWishlist, clearWishlist, count]);

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within WishlistProvider');
  return context;
};