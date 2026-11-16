import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { api, backend } from '../lib/api.js';
import { boot } from '../lib/boot.js';
import { load, save } from '../lib/storage.js';
import { getProductById } from '../data/products.js';

/** Wishlist — local for guests, stored on the account when signed in. */
const WishlistContext = createContext(null);
const KEY = 'neonvault_wishlist';

const entry = (p) => ({
  id: p.id, name: p.name, price: p.price, originalPrice: p.originalPrice, image: p.images?.[0],
  tag: p.tag, tagVariant: p.tagVariant, inStock: p.inStock,
});

export const WishlistProvider = ({ children }) => {
  const [items, setItems] = useState(() => load(KEY, []).map((i) => (getProductById(i.id) ? entry(getProductById(i.id)) : i)));
  const [account, setAccount] = useState(!!boot.user);

  useEffect(() => { save(KEY, items); }, [items]);

  const pull = useCallback(async () => {
    try {
      const { items: list } = await api.get('/me/wishlist');
      setItems(list.map(entry));
    } catch { /* keep local */ }
  }, []);

  useEffect(() => {
    if (backend.online && boot.user) pull();
    const onAuth = (e) => {
      setAccount(!!e.detail.user);
      if (e.detail.user) pull(); else setItems([]);
    };
    window.addEventListener('nv:auth', onAuth);
    return () => window.removeEventListener('nv:auth', onAuth);
  }, [pull]);

  const remote = useCallback((method, id) => {
    if (backend.online && account) api[method](`/me/wishlist/${encodeURIComponent(id)}`).catch(() => {});
  }, [account]);

  const addItem = useCallback((product) => {
    setItems((prev) => (prev.some((i) => i.id === product.id) ? prev : [...prev, entry(product)]));
    remote('put', product.id);
  }, [remote]);

  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    remote('del', id);
  }, [remote]);

  const isInWishlist = useCallback((id) => items.some((i) => i.id === id), [items]);

  const toggleItem = useCallback((product) => {
    if (items.some((i) => i.id === product.id)) removeItem(product.id);
    else addItem(product);
  }, [items, addItem, removeItem]);

  const clearWishlist = useCallback(() => {
    items.forEach((i) => remote('del', i.id));
    setItems([]);
  }, [items, remote]);

  const value = useMemo(() => ({
    items, addItem, removeItem, toggleItem, isInWishlist, clearWishlist, count: items.length,
  }), [items, addItem, removeItem, toggleItem, isInWishlist, clearWishlist]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
};
