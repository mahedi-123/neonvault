import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { api, backend, track } from '../lib/api.js';
import { boot } from '../lib/boot.js';
import { load, save } from '../lib/storage.js';
import { getProductById } from '../data/products.js';
import { onLive } from '../lib/live.js';

/**
 * Cart. Always kept in this browser so it survives reloads; when signed in it
 * also syncs to the account (so it follows you to other devices) and is merged
 * with any guest cart on sign-in. Prices and stock come from the live catalog,
 * and the server re-prices everything again at checkout.
 */
const CartContext = createContext(null);
const KEY = 'neonvault_cart';

const fromProduct = (product, quantity, color) => ({
  id: product.id,
  cartItemId: `${product.id}-${color || 'default'}`,
  name: product.name,
  price: product.price,
  image: product.images?.[0],
  quantity,
  selectedColor: color || product.colors?.[0]?.name || null,
  stockCount: product.stockCount,
});

/** Refresh price/stock/name from the catalog; drop items that no longer exist. */
const reconcile = (items) => items.flatMap((it) => {
  const p = getProductById(it.id);
  if (!p) return backend.online ? [] : [it];
  return [{ ...it, name: p.name, price: p.price, image: p.images?.[0] || it.image, stockCount: p.stockCount, quantity: Math.max(1, Math.min(it.quantity, p.stockCount || it.quantity)) }];
});

const toServer = (items) => items.map((i) => ({ productId: i.id, color: i.selectedColor || null, quantity: i.quantity }));
const fromServer = (rows) => rows.flatMap((r) => {
  const p = getProductById(r.productId);
  return p ? [fromProduct(p, r.quantity, r.color)] : [];
});

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => reconcile(load(KEY, [])));
  const [isOpen, setIsOpen] = useState(false);
  const signedIn = useRef(!!boot.user);
  const skipSync = useRef(false);
  // never push before the account cart has been pulled once (or we could overwrite it)
  const pulled = useRef(!(backend.online && boot.user));

  useEffect(() => { save(KEY, items); }, [items]);

  // pull the account cart on load / sign-in; clear on sign-out
  const pull = useCallback(async () => {
    try {
      const { items: rows } = await api.get('/me/cart');
      skipSync.current = true;
      setItems(reconcile(fromServer(rows)));
    } catch { /* stay with the local cart */ } finally {
      pulled.current = true;
    }
  }, []);

  useEffect(() => {
    if (backend.online && boot.user) pull();
    const onAuth = (e) => {
      signedIn.current = !!e.detail.user;
      if (e.detail.user) { pulled.current = false; pull(); }
      else { skipSync.current = true; setItems([]); }
    };
    window.addEventListener('nv:auth', onAuth);
    return () => window.removeEventListener('nv:auth', onAuth);
  }, [pull]);

  // push changes to the account (debounced)
  useEffect(() => {
    if (!backend.online || !signedIn.current) return undefined;
    if (skipSync.current) { skipSync.current = false; return undefined; }
    if (!pulled.current) return undefined;
    const t = setTimeout(() => { api.put('/me/cart', { items: toServer(items) }).catch(() => {}); }, 500);
    return () => clearTimeout(t);
  }, [items]);

  // live stock: clamp quantities when something sells out elsewhere
  useEffect(() => onLive((type, d) => {
    if (type !== 'stock') return;
    setItems((prev) => (prev.some((i) => i.id === d.id) ? reconcile(prev) : prev));
  }), []);

  const addItem = useCallback((product, quantity = 1, selectedColor = null) => {
    const color = selectedColor || product.colors?.[0]?.name || null;
    setItems((prev) => {
      const i = prev.findIndex((it) => it.id === product.id && it.selectedColor === color);
      const max = Math.min(20, product.stockCount || 20);
      if (i >= 0) return prev.map((it, k) => (k === i ? { ...it, quantity: Math.min(max, it.quantity + quantity) } : it));
      return [...prev, fromProduct(product, Math.min(max, quantity), color)];
    });
    track('add_to_cart', { productId: product.id });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((id, selectedColor) => {
    setItems((prev) => prev.filter((it) => !(it.id === id && it.selectedColor === selectedColor)));
  }, []);

  const updateQuantity = useCallback((id, selectedColor, quantity) => {
    if (quantity <= 0) { removeItem(id, selectedColor); return; }
    setItems((prev) => prev.map((it) => (it.id === id && it.selectedColor === selectedColor
      ? { ...it, quantity: Math.min(quantity, it.stockCount || 99, 20) } : it)));
  }, [removeItem]);

  const clearCart = useCallback(() => setItems([]), []);

  const subtotal = useMemo(() => items.reduce((s, it) => s + it.price * it.quantity, 0), [items]);
  const itemCount = useMemo(() => items.reduce((s, it) => s + it.quantity, 0), [items]);
  // same rules the server applies (it has the final say at checkout)
  const shipping = subtotal >= 200 ? 0 : subtotal > 0 ? 15 : 0;
  const tax = Math.round(subtotal * 0.08 * 100) / 100;
  const total = subtotal + shipping + tax;

  const value = useMemo(() => ({
    items, isOpen, setIsOpen, addItem, removeItem, updateQuantity, clearCart, subtotal, itemCount, shipping, tax, total,
    toServerItems: () => toServer(items),
  }), [items, isOpen, addItem, removeItem, updateQuantity, clearCart, subtotal, itemCount, shipping, tax, total]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
