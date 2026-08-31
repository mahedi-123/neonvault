import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getLocalStorage, setLocalStorage } from '../utils/helpers';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => getLocalStorage('neonvault_user', null));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = getLocalStorage('neonvault_user', null);
    setUser(stored);
    setIsLoading(false);
  }, []);

  const signUp = useCallback((userData) => {
    const newUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone || '',
      createdAt: new Date().toISOString(),
      addresses: [],
      paymentMethods: [],
    };
    setUser(newUser);
    setLocalStorage('neonvault_user', newUser);
    return newUser;
  }, []);

  const signIn = useCallback((email, password) => {
    const stored = getLocalStorage('neonvault_user', null);
    if (stored && stored.email === email) {
      setUser(stored);
      return stored;
    }
    throw new Error('Invalid email or password');
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    setLocalStorage('neonvault_user', null);
  }, []);

  const updateProfile = useCallback((updates) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    setLocalStorage('neonvault_user', updated);
  }, [user]);

  const addAddress = useCallback((address) => {
    if (!user) return;
    const newAddress = { id: `addr_${Date.now()}`, ...address };
    const updated = { ...user, addresses: [...user.addresses, newAddress] };
    setUser(updated);
    setLocalStorage('neonvault_user', updated);
  }, [user]);

  const removeAddress = useCallback((addressId) => {
    if (!user) return;
    const updated = { ...user, addresses: user.addresses.filter(a => a.id !== addressId) };
    setUser(updated);
    setLocalStorage('neonvault_user', updated);
  }, [user]);

  const addPaymentMethod = useCallback((payment) => {
    if (!user) return;
    const newPayment = { id: `pm_${Date.now()}`, ...payment };
    const updated = { ...user, paymentMethods: [...user.paymentMethods, newPayment] };
    setUser(updated);
    setLocalStorage('neonvault_user', updated);
  }, [user]);

  const removePaymentMethod = useCallback((paymentId) => {
    if (!user) return;
    const updated = { ...user, paymentMethods: user.paymentMethods.filter(p => p.id !== paymentId) };
    setUser(updated);
    setLocalStorage('neonvault_user', updated);
  }, [user]);

  const value = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    signUp,
    signIn,
    signOut,
    updateProfile,
    addAddress,
    removeAddress,
    addPaymentMethod,
    removePaymentMethod,
  }), [
    user, isLoading,
    signUp, signIn, signOut,
    updateProfile,
    addAddress, removeAddress,
    addPaymentMethod, removePaymentMethod
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};