import { useEffect, useReducer } from 'react';
import { backend } from './api.js';
import { getProductById, patchProductStock } from '../data/products.js';

/**
 * One EventSource for the whole tab. Stock and rating changes are written
 * straight into the shared catalog objects, then announced so any mounted
 * component showing that product re-renders.
 */
let es;
const listeners = new Set();
export const onLive = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = (type, data) => listeners.forEach((fn) => fn(type, data));

export function startLive() {
  if (es || !backend.online || typeof EventSource === 'undefined') return;
  const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
  es = new EventSource(`${base}/events`, { withCredentials: true });
  es.addEventListener('stock', (e) => {
    const d = JSON.parse(e.data);
    patchProductStock(d.id, d.stockCount);
    emit('stock', d);
  });
  es.addEventListener('rating', (e) => {
    const d = JSON.parse(e.data);
    const p = getProductById(d.id);
    if (p) { p.rating = d.rating; p.reviewCount = d.reviewCount; }
    emit('rating', d);
  });
  es.addEventListener('order', (e) => emit('order', JSON.parse(e.data)));
}

/** Re-render when this product's live data changes; returns the (mutated) product. */
export function useLiveProduct(id) {
  const [, bump] = useReducer((x) => x + 1, 0);
  useEffect(() => onLive((type, d) => { if ((type === 'stock' || type === 'rating') && d.id === id) bump(); }), [id]);
  return getProductById(id);
}

/** Subscribe to live order updates (signed-in owner). */
export function useOrderUpdates(fn) {
  useEffect(() => onLive((type, d) => { if (type === 'order') fn(d); }), [fn]);
}
