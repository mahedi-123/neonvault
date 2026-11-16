import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { api, backend } from '../lib/api.js';
import { boot } from '../lib/boot.js';
import { load, save } from '../lib/storage.js';

/**
 * Accounts. With the backend online this is real auth (scrypt-hashed
 * passwords, httpOnly session cookie, addresses in the database). Offline it
 * falls back to the old browser-only demo account so previews still work.
 *
 * Saved cards are only ever a label + last 4 digits kept in this browser —
 * full card numbers are never stored anywhere.
 */
const AuthContext = createContext(null);
const LOCAL_USER = 'neonvault_user';
const cardsKey = (u) => `neonvault_cards_${u?.id || 'guest'}`;

export const announceAuth = (user) => window.dispatchEvent(new CustomEvent('nv:auth', { detail: { user } }));

const guestSnapshot = () => ({
  cart: load('neonvault_cart', []).map((i) => ({ productId: i.id, color: i.selectedColor || null, quantity: Math.min(20, i.quantity || 1) })),
  wishlist: load('neonvault_wishlist', []).map((i) => i.id),
});

const withLocalExtras = (u, addresses = []) => u && ({ ...u, addresses, paymentMethods: load(cardsKey(u), []) });

export const AuthProvider = ({ children }) => {
  const online = backend.online;
  const [user, setUser] = useState(() => (online ? withLocalExtras(boot.user) : load(LOCAL_USER, null)));
  const [isLoading, setIsLoading] = useState(online && !!boot.user);

  const refreshAddresses = useCallback(async (u) => {
    if (!online || !u) return;
    try {
      const { addresses } = await api.get('/me/addresses');
      setUser((prev) => (prev ? { ...prev, addresses } : prev));
    } catch { /* keep what we have */ }
  }, [online]);

  useEffect(() => {
    if (!online) { setIsLoading(false); return; }
    if (boot.user) refreshAddresses(boot.user).finally(() => setIsLoading(false));
  }, [online, refreshAddresses]);

  useEffect(() => { if (!online) save(LOCAL_USER, user); }, [online, user]);

  const signedIn = useCallback(async (u) => {
    const full = withLocalExtras(u, []);
    setUser(full);
    announceAuth(u);
    await refreshAddresses(u);
    return full;
  }, [refreshAddresses]);

  const signUp = useCallback(async (data) => {
    if (!online) {
      const u = {
        id: `user_${Date.now()}`, email: data.email, firstName: data.firstName, lastName: data.lastName,
        phone: data.phone || '', createdAt: new Date().toISOString(), addresses: [], paymentMethods: [],
      };
      setUser(u);
      return u;
    }
    const { user: u } = await api.post('/auth/register', { ...data, guest: guestSnapshot() });
    return signedIn(u);
  }, [online, signedIn]);

  const signIn = useCallback(async (email, password) => {
    if (!online) {
      const stored = load(LOCAL_USER, null);
      if (stored && stored.email === email) { setUser(stored); return stored; }
      throw new Error('Invalid email or password');
    }
    const { user: u } = await api.post('/auth/login', { email, password, guest: guestSnapshot() });
    return signedIn(u);
  }, [online, signedIn]);

  const signOut = useCallback(async () => {
    if (online) { try { await api.post('/auth/logout'); } catch { /* cookie may already be gone */ } }
    setUser(null);
    announceAuth(null);
  }, [online]);

  const updateProfile = useCallback(async (updates) => {
    if (!user) return;
    if (!online) { setUser({ ...user, ...updates }); return; }
    const { user: u } = await api.patch('/me', {
      firstName: updates.firstName || undefined, lastName: updates.lastName || undefined,
      phone: updates.phone ?? undefined, marketingOptIn: updates.marketingOptIn,
    });
    setUser((prev) => ({ ...prev, ...u }));
  }, [online, user]);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    await api.post('/me/password', { currentPassword, newPassword });
  }, []);

  const addAddress = useCallback(async (a) => {
    if (!user) return;
    const [firstName, ...rest] = String(a.fullName || `${a.firstName || ''} ${a.lastName || ''}`).trim().split(/\s+/);
    const addr = {
      label: a.label || 'Home', firstName: a.firstName || firstName || user.firstName, lastName: a.lastName || rest.join(' ') || user.lastName,
      line1: a.line1 || a.address1, line2: a.line2 || a.address2 || '', city: a.city, state: a.state || '', zip: a.zip || a.zipCode || '',
      country: a.country || 'US', phone: a.phone || user.phone || '', isDefault: !!a.isDefault,
    };
    if (!online) { setUser({ ...user, addresses: [...(user.addresses || []), { id: `addr_${Date.now()}`, ...addr }] }); return; }
    const { addresses } = await api.post('/me/addresses', addr);
    setUser((prev) => ({ ...prev, addresses }));
  }, [online, user]);

  const removeAddress = useCallback(async (id) => {
    if (!user) return;
    if (!online) { setUser({ ...user, addresses: user.addresses.filter((x) => x.id !== id) }); return; }
    const { addresses } = await api.del(`/me/addresses/${id}`);
    setUser((prev) => ({ ...prev, addresses }));
  }, [online, user]);

  const addPaymentMethod = useCallback((p) => {
    if (!user) return;
    const card = { id: `pm_${Date.now()}`, type: p.type || 'Card', last4: String(p.last4 || '').slice(-4), expiry: p.expiry || '', isDefault: !!p.isDefault };
    const list = [...(user.paymentMethods || []).map((x) => (card.isDefault ? { ...x, isDefault: false } : x)), card];
    save(cardsKey(user), list);
    setUser({ ...user, paymentMethods: list });
  }, [user]);

  const removePaymentMethod = useCallback((id) => {
    if (!user) return;
    const list = (user.paymentMethods || []).filter((x) => x.id !== id);
    save(cardsKey(user), list);
    setUser({ ...user, paymentMethods: list });
  }, [user]);

  const value = useMemo(() => ({
    user, isLoading, isAuthenticated: !!user, isAdmin: user?.role === 'admin', online,
    signUp, signIn, signOut, updateProfile, changePassword, refreshSession: signedIn,
    addAddress, removeAddress, addPaymentMethod, removePaymentMethod, refreshAddresses: () => refreshAddresses(user),
  }), [user, isLoading, online, signUp, signIn, signOut, updateProfile, changePassword, addAddress, removeAddress, addPaymentMethod, removePaymentMethod, refreshAddresses, signedIn]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
