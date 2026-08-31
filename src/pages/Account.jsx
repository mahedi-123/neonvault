import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Truck, Shield, RotateCcw, CreditCard, User, Mail, MapPin, Lock, ChevronRight, LogOut, Edit2, Trash2, Plus, Heart, Clock } from 'lucide-react';
import { cn, formatPrice } from '../utils/helpers';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useUI } from '../context/UIContext';

const Account = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, signOut, updateProfile, addAddress, removeAddress, addPaymentMethod, removePaymentMethod } = useAuth();
  const { items } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { showToast } = useUI();

  const [activeTab, setActiveTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'orders', label: 'Orders', icon: Truck },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
    { id: 'payment', label: 'Payment Methods', icon: CreditCard },
    { id: 'wishlist', label: 'Wishlist', icon: Heart },
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-20 lg:pt-24 flex items-center justify-center">
        <motion.div className="text-center max-w-md mx-auto px-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <motion.div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 15, stiffness: 100 }}>
            <motion.svg className="w-10 h-10 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" initial={{ rotate: -180 }} animate={{ rotate: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </motion.svg>
          </motion.div>
          <motion.h1 className="text-3xl font-display font-bold text-text mb-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            Sign In Required
          </motion.h1>
          <motion.p className="text-text-muted mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            You need to be signed in to access your account dashboard.
          </motion.p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/sign-in')}
            className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-bg rounded-xl font-body font-medium text-lg hover:bg-accent-dim transition-colors"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            Sign In
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      </div>
    );
  }

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleProfileSave = () => {
    updateProfile(formData);
    showToast('Profile updated successfully', 'success');
    setEditing(false);
  };

  const handleAddressSubmit = (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const address = {
      fullName: formData.get('fullName'),
      address1: formData.get('address1'),
      address2: formData.get('address2'),
      city: formData.get('city'),
      state: formData.get('state'),
      zipCode: formData.get('zipCode'),
      country: formData.get('country'),
      phone: formData.get('phone'),
      isDefault: formData.get('isDefault') === 'on',
    };
    addAddress(address);
    showToast('Address added successfully', 'success');
    form.reset();
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const payment = {
      type: formData.get('type'),
      last4: formData.get('last4'),
      expiry: formData.get('expiry'),
      isDefault: formData.get('isDefault') === 'on',
    };
    addPaymentMethod(payment);
    showToast('Payment method added successfully', 'success');
    form.reset();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 lg:pt-24 flex items-center justify-center">
        <motion.div className="text-center" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
          <svg className="w-12 h-12 mx-auto text-accent animate-spin mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" strokeDasharray="50" strokeDashoffset="25" />
          </svg>
          <p className="text-text-muted">Loading your account...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 lg:pt-24 pb-20">
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <div className="absolute inset-0 noise-overlay" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div className="mb-12" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-text leading-tight mb-4">
            MY ACCOUNT
          </h1>
          <p className="text-lg text-text-muted">Manage your profile, orders, addresses, and preferences.</p>
        </motion.div>

        <motion.div className="lg:grid lg:grid-cols-4 lg:gap-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}>
          <aside className="lg:col-span-1">
            <motion.div className="bg-surface/50 border border-border/50 rounded-2xl p-6 lg:p-8 sticky top-24" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1, duration: 0.5 }}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                  <User className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold text-text">{user.firstName} {user.lastName}</h2>
                  <p className="text-text-muted text-sm">{user.email}</p>
                </div>
              </div>

              <nav className="space-y-2 mb-8">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all',
                      activeTab === tab.id
                        ? 'bg-accent/10 text-accent border-l-4 border-accent'
                        : 'text-text-muted hover:text-text hover:bg-surface/50'
                    )}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span className="font-body font-medium">{tab.label}</span>
                  </button>
                ))}
              </nav>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { signOut(); showToast('Signed out successfully', 'info'); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-text-muted hover:text-error hover:bg-error/10 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-body font-medium">Sign Out</span>
              </motion.button>
            </motion.div>
          </aside>

          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                {activeTab === 'overview' && (
                  <section className="space-y-8">
                    <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                      <motion.div className="p-6 bg-surface/50 border border-border/50 rounded-2xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                            <Truck className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-sm text-text-muted">Total Orders</p>
                            <p className="text-2xl font-display font-bold text-text">0</p>
                          </div>
                        </div>
                      </motion.div>
                      <motion.div className="p-6 bg-surface/50 border border-border/50 rounded-2xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                            <Heart className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-sm text-text-muted">Wishlist Items</p>
                            <p className="text-2xl font-display font-bold text-text">{1}</p>
                          </div>
                        </div>
                      </motion.div>
                      <motion.div className="p-6 bg-surface/50 border border-border/50 rounded-2xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                            <Shield className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-sm text-text-muted">Saved Addresses</p>
                            <p className="text-2xl font-display font-bold text-text">{0}</p>
                          </div>
                        </div>
                      </motion.div>
                      <motion.div className="p-6 bg-surface/50 border border-border/50 rounded-2xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                            <CreditCard className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-sm text-text-muted">Payment Methods</p>
                            <p className="text-2xl font-display font-bold text-text">{0}</p>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>

                    <motion.div className="p-6 bg-surface/50 border border-border/50 rounded-2xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-display font-bold text-text">Profile Information</h2>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setEditing(!editing)}
                          className="px-4 py-2 bg-surface border border-border/50 rounded-lg text-sm text-text-muted hover:text-text hover:bg-surface-hover transition-all"
                        >
                          {editing ? 'Cancel' : 'Edit Profile'}
                        </motion.button>
                      </div>
                      {editing ? (
                        <form onSubmit={e => { e.preventDefault(); handleProfileSave(); }} className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input label="First Name" name="firstName" value={formData.firstName} onChange={handleInputChange} placeholder="John" required />
                            <Input label="Last Name" name="lastName" value={formData.lastName} onChange={handleInputChange} placeholder="Doe" required />
                          </div>
                          <Input label="Email" type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="john@example.com" required />
                          <Input label="Phone" type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="+1 (555) 000-0000" />
                          <div className="flex gap-4 pt-2">
                            <Button type="submit" size="lg">Save Changes</Button>
                            <Button type="button" variant="secondary" size="lg" onClick={() => setEditing(false)}>Cancel</Button>
                          </div>
                        </form>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-text-muted">
                          <div>
                            <p className="text-sm">First Name</p>
                            <p className="font-body font-medium text-text">{user.firstName}</p>
                          </div>
                          <div>
                            <p className="text-sm">Last Name</p>
                            <p className="font-body font-medium text-text">{user.lastName}</p>
                          </div>
                          <div>
                            <p className="text-sm">Email</p>
                            <p className="font-body font-medium text-text">{user.email}</p>
                          </div>
                          <div>
                            <p className="text-sm">Phone</p>
                            <p className="font-body font-medium text-text">{user.phone || 'Not provided'}</p>
                          </div>
                          <div>
                            <p className="text-sm">Member Since</p>
                            <p className="font-body font-medium text-text">{new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </section>
                )}

                {activeTab === 'orders' && (
                  <section className="space-y-8">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                      <h2 className="text-2xl font-display font-bold text-text mb-6">Order History</h2>
                      <motion.div className="bg-surface/50 border border-border/50 rounded-2xl p-8 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Truck className="w-16 h-16 mx-auto text-text-subtle mb-4 opacity-50" />
                        <p className="text-text-muted mb-4">No orders yet</p>
                        <p className="text-text-subtle text-sm mb-6">Your order history will appear here once you make a purchase.</p>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => navigate('/shop')}
                          className="px-8 py-3 bg-accent text-bg rounded-xl font-body font-medium hover:bg-accent-dim transition-colors"
                        >
                          Start Shopping
                        </motion.button>
                      </motion.div>
                    </motion.div>
                  </section>
                )}

                {activeTab === 'addresses' && (
                  <section className="space-y-8">
                    <motion.div className="flex items-center justify-between mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                      <h2 className="text-2xl font-display font-bold text-text">Saved Addresses</h2>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setEditing(true)}
                        className="px-4 py-2 bg-accent text-bg rounded-xl font-body font-medium hover:bg-accent-dim transition-colors"
                      >
                        <Plus className="w-5 h-5 mr-2" /> Add Address
                      </motion.button>
                    </motion.div>

                    {user.addresses.length === 0 ? (
                      <motion.div className="bg-surface/50 border border-border/50 rounded-2xl p-12 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <MapPin className="w-16 h-16 mx-auto text-text-subtle mb-4 opacity-50" />
                        <p className="text-text-muted mb-4">No saved addresses</p>
                        <p className="text-text-subtle text-sm mb-6">Add an address to speed up checkout</p>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setEditing(true)}
                          className="px-8 py-3 bg-accent text-bg rounded-xl font-body font-medium hover:bg-accent-dim transition-colors"
                        >
                          <Plus className="w-5 h-5 mr-2" /> Add Your First Address
                        </motion.button>
                      </motion.div>
                    ) : (
                      <motion.div className="grid grid-cols-1 sm:grid-cols-2 gap-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        {1}
                      </motion.div>
                    )}
                  </section>
                )}

                {activeTab === 'payment' && (
                  <section className="space-y-8">
                    <motion.div className="flex items-center justify-between mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                      <h2 className="text-2xl font-display font-bold text-text">Payment Methods</h2>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setEditing(true)}
                        className="px-4 py-2 bg-accent text-bg rounded-xl font-body font-medium hover:bg-accent-dim transition-colors"
                      >
                        <Plus className="w-5 h-5 mr-2" /> Add Payment Method
                      </motion.button>
                    </motion.div>

                    {user.paymentMethods.length === 0 ? (
                      <motion.div className="bg-surface/50 border border-border/50 rounded-2xl p-12 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <CreditCard className="w-16 h-16 mx-auto text-text-subtle mb-4 opacity-50" />
                        <p className="text-text-muted mb-4">No payment methods saved</p>
                        <p className="text-text-subtle text-sm mb-6">Add a payment method for faster checkout</p>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setEditing(true)}
                          className="px-8 py-3 bg-accent text-bg rounded-xl font-body font-medium hover:bg-accent-dim transition-colors"
                        >
                          <Plus className="w-5 h-5 mr-2" /> Add Payment Method
                        </motion.button>
                      </motion.div>
                    ) : (
                      <motion.div className="grid grid-cols-1 sm:grid-cols-2 gap-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        {1}
                      </motion.div>
                    )}
                  </section>
                )}

                {activeTab === 'wishlist' && (
                  <section className="space-y-8">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                      <h2 className="text-2xl font-display font-bold text-text mb-6">My Wishlist</h2>
                      {wishlistCount === 0 ? (
                        <motion.div className="bg-surface/50 border border-border/50 rounded-2xl p-12 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                          <Heart className="w-16 h-16 mx-auto text-text-subtle mb-4 opacity-50" />
                          <p className="text-text-muted mb-4">Your wishlist is empty</p>
                          <p className="text-text-subtle text-sm mb-6">Save items you love for later</p>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate('/shop')}
                            className="px-8 py-3 bg-accent text-bg rounded-xl font-body font-medium hover:bg-accent-dim transition-colors"
                          >
                            Start Shopping
                            <ChevronRight className="w-5 h-5 ml-2" />
                          </motion.button>
                        </motion.div>
                      ) : (
                        <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                          {1}
                        </motion.div>
                      )}
                    </motion.div>
                  </section>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Account;