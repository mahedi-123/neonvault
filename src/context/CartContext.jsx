import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getLocalStorage, setLocalStorage } from '../utils/helpers';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => getLocalStorage('neonvault_cart', []));
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setLocalStorage('neonvault_cart', items);
  }, [items]);

  const addItem = useCallback((product, quantity = 1, selectedColor = null) => {
    setItems(prev => {
      const existingIndex = prev.findIndex(
        item => item.id === product.id && item.selectedColor === selectedColor
      );
      if (existingIndex >= 0) {
        return prev.map((item, index) =>
          index === existingIndex
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, {
        id: product.id,
        cartItemId: `${product.id}-${selectedColor || 'default'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: product.name,
        price: product.price,
        image: product.images[0],
        quantity,
        selectedColor: selectedColor || product.colors[0]?.name || null,
        stockCount: product.stockCount,
      }];
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((id, selectedColor) => {
    setItems(prev => prev.filter(item => !(item.id === id && item.selectedColor === selectedColor)));
  }, []);

  const updateQuantity = useCallback((id, selectedColor, quantity) => {
    if (quantity <= 0) {
      removeItem(id, selectedColor);
      return;
    }
    setItems(prev => prev.map(item =>
      item.id === id && item.selectedColor === selectedColor
        ? { ...item, quantity: Math.min(quantity, item.stockCount || 99) }
        : item
    ));
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const subtotal = useMemo(() =>
    items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const itemCount = useMemo(() =>
    items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const shipping = subtotal > 200 ? 0 : (subtotal > 0 ? 15 : 0);
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  const value = useMemo(() => ({
    items,
    isOpen,
    setIsOpen,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    subtotal,
    itemCount,
    shipping,
    tax,
    total,
  }), [items, isOpen, addItem, removeItem, updateQuantity, clearCart, subtotal, itemCount, shipping, tax, total]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};