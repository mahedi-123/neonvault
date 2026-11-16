import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Check, CreditCard, Truck, User, Mail, MapPin, Lock, Loader2, X } from 'lucide-react';
import { cn } from '../utils/helpers';

// checkout shows exact cents so it always matches what is charged
const formatPrice = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api, backend, track, errorText } from '../../../shared/lib/api.js';
import { useUI } from '../context/UIContext';

const Checkout = () => {
  const navigate = useNavigate();
  const { items, subtotal, shipping, tax, total, clearCart, toServerItems } = useCart();
  const { user } = useAuth();
  const { showToast } = useUI();

  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [localNumber] = useState(`NV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
  const [order, setOrder] = useState(null);
  const orderNumber = order?.number || localNumber;
  const [submitError, setSubmitError] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [quote, setQuote] = useState(null);
  const [couponMsg, setCouponMsg] = useState(null);
  const [applying, setApplying] = useState(false);
  // one key per checkout attempt so a double-click can never create two orders
  const [idempotencyKey] = useState(() => (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`));

  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    apartment: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
    shippingMethod: 'standard',
    paymentMethod: 'card',
    cardNumber: '',
    cardExpiry: '',
    cardCvc: '',
    cardName: '',
    saveInfo: false,
  });

  useEffect(() => { track('checkout_start'); }, []);

  // prefill from the signed-in account and its default address
  useEffect(() => {
    if (!user) return;
    const a = user.addresses?.find((x) => x.isDefault) || user.addresses?.[0];
    setFormData((f) => ({
      ...f,
      email: f.email || user.email,
      firstName: f.firstName || a?.firstName || user.firstName || '',
      lastName: f.lastName || a?.lastName || user.lastName || '',
      phone: f.phone || a?.phone || user.phone || '',
      address: f.address || a?.line1 || '',
      apartment: f.apartment || a?.line2 || '',
      city: f.city || a?.city || '',
      state: f.state || a?.state || '',
      zipCode: f.zipCode || a?.zip || '',
      country: a?.country || f.country,
    }));
  }, [user]);

  // server-priced totals once a code is applied (re-quoted when the cart changes)
  const requote = async (code) => {
    if (!backend.online || !code) { setQuote(null); return; }
    setApplying(true);
    try {
      const q = await api.post('/cart/quote', { items: toServerItems(), couponCode: code, email: formData.email || undefined });
      setQuote(q);
      setCouponMsg({ ok: true, text: `${q.coupon.code} applied — ${q.coupon.description}` });
    } catch (e) {
      setQuote(null);
      setCouponMsg({ ok: false, text: errorText(e) });
    } finally { setApplying(false); }
  };
  useEffect(() => { if (quote?.coupon && items.length) requote(quote.coupon.code); }, [items]); // eslint-disable-line react-hooks/exhaustive-deps
  const t = quote ? quote : { subtotal, shipping, tax, total, discount: 0 };

  const [errors, setErrors] = useState({});

  const steps = [
    { id: 1, title: 'Information', icon: User },
    { id: 2, title: 'Shipping', icon: Truck },
    { id: 3, title: 'Payment', icon: CreditCard },
    { id: 4, title: 'Review', icon: Check },
  ];

  const validateStep = (stepNum) => {
    const newErrors = {};
    if (stepNum === 1) {
      if (!formData.email) newErrors.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email';
    }
    if (stepNum === 2) {
      if (!formData.firstName) newErrors.firstName = 'First name is required';
      if (!formData.lastName) newErrors.lastName = 'Last name is required';
      if (!formData.address) newErrors.address = 'Address is required';
      if (!formData.city) newErrors.city = 'City is required';
      if (!formData.state) newErrors.state = 'State is required';
      if (!formData.zipCode) newErrors.zipCode = 'ZIP code is required';
      if (!formData.phone) newErrors.phone = 'Phone is required';
    }
    if (stepNum === 3 && formData.paymentMethod === 'card') {
      if (!formData.cardNumber) newErrors.cardNumber = 'Card number is required';
      else if (formData.cardNumber.replace(/\s/g, '').length < 15) newErrors.cardNumber = 'Invalid card number';
      if (!formData.cardExpiry) newErrors.cardExpiry = 'Expiry date is required';
      if (!formData.cardCvc) newErrors.cardCvc = 'CVC is required';
      else if (formData.cardCvc.length < 3) newErrors.cardCvc = 'Invalid CVC';
      if (!formData.cardName) newErrors.cardName = 'Name on card is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(step)) return;

    if (step < 4) {
      setStep(step + 1);
      return;
    }

    setProcessing(true);
    setSubmitError('');
    if (!backend.online) {
      // static preview: no backend to take the order
      await new Promise(r => setTimeout(r, 1200));
      setProcessing(false);
      setOrderConfirmed(true);
      clearCart();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    try {
      const { order: placed } = await api.post('/orders', {
        email: formData.email,
        items: toServerItems(),
        address: {
          firstName: formData.firstName, lastName: formData.lastName, line1: formData.address, line2: formData.apartment,
          city: formData.city, state: formData.state, zip: formData.zipCode, country: formData.country, phone: formData.phone,
        },
        shippingMethod: 'standard',
        couponCode: quote?.coupon?.code,
        // card details never leave the browser — only the last 4 digits for the receipt
        payment: { method: formData.paymentMethod, ...(formData.paymentMethod === 'card' ? { last4: formData.cardNumber.replace(/\D/g, '').slice(-4) } : {}) },
        saveAddress: !!(user && formData.saveInfo),
        idempotencyKey,
      });
      setOrder(placed);
      setOrderConfirmed(true);
      clearCart();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err.problems?.length) setSubmitError(`${err.message} Some items sold out or changed — update your cart and try again.`);
      else setSubmitError(err.message);
      if (err.status === 402) setStep(3);
    } finally {
      setProcessing(false);
    }
  };

  const goBack = () => setStep(step - 1);

  if (items.length === 0 && !orderConfirmed) {
    return (
      <div className="min-h-screen pt-20 lg:pt-24 flex items-center justify-center">
        <motion.div className="text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <svg className="w-16 h-16 mx-auto text-text-subtle mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1 4 4v4"/></svg>
          <h1 className="text-2xl font-display font-bold text-text mb-2">Your cart is empty</h1>
          <p className="text-text-muted mb-6">Add some products before checking out</p>
          <Button size="lg" onClick={() => navigate('/shop')} leftIcon={<ChevronRight className="w-5 h-5" />}>
            CONTINUE SHOPPING
          </Button>
        </motion.div>
      </div>
    );
  }

  if (orderConfirmed) {
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 3);

    return (
      <div className="min-h-screen pt-20 lg:pt-24 pb-20 flex items-center justify-center">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <div className="absolute inset-0 noise-overlay" />

        <motion.div
          className="relative max-w-md w-full mx-auto px-4 text-center"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 150 }}
        >
          <motion.div
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 15, stiffness: 100, delay: 0.2 }}
          >
            <Check className="w-10 h-10 text-accent" />
          </motion.div>

          <motion.h1 className="text-3xl sm:text-4xl font-display font-extrabold text-text mb-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            ORDER CONFIRMED
          </motion.h1>

          <motion.p className="text-text-muted mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            Thank you for your order! We've sent a confirmation to <strong>{formData.email}</strong>.
          </motion.p>

          <motion.div className="bg-surface/50 border border-border/50 rounded-2xl p-6 mb-8 text-left" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/50">
              <span className="text-text-muted">Order Number</span>
              <span className="font-body font-mono font-semibold text-text">{orderNumber}</span>
            </div>
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/50">
              <span className="text-text-muted">Estimated Delivery</span>
              <span className="font-body font-semibold text-text">{estimatedDelivery.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Total</span>
              <span className="font-display font-bold text-accent text-xl">{formatPrice(order ? order.total : total)}</span>
            </div>
          </motion.div>

          <motion.div className="flex flex-col gap-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Button size="lg" onClick={() => navigate('/')}>
              CONTINUE SHOPPING
            </Button>
            <Button variant="secondary" size="lg" onClick={() => navigate(order ? `/track/${order.number}?email=${encodeURIComponent(order.email)}` : '/account?tab=orders')}>
              VIEW ORDER DETAILS
            </Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 lg:pt-24 pb-20">
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <div className="absolute inset-0 noise-overlay" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-text leading-tight mb-2">
            CHECKOUT
          </h1>
          <p className="text-lg text-text-muted">Complete your purchase securely</p>
        </motion.div>

        <motion.div
          className="hidden lg:flex items-center justify-center gap-4 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          {steps.map((s, i) => (
            <motion.div key={s.id} className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center font-body font-bold text-sm transition-all',
                step > s.id ? 'bg-accent text-bg' : step === s.id ? 'bg-accent/10 text-accent border border-accent/30' : 'bg-surface border border-border/50 text-text-muted'
              )}>
                {step > s.id ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
              </div>
              {i < steps.length - 1 && <div className={cn('w-16 h-px', step > s.id ? 'bg-accent' : 'bg-border/50')} />}
            </motion.div>
          ))}
        </motion.div>

        <form onSubmit={handleSubmit} className="lg:grid lg:grid-cols-12 lg:gap-8">
          <motion.div
            className="lg:col-span-7 space-y-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {step === 1 && (
                  <section aria-labelledby="contact-heading" className="space-y-6">
                    <h2 id="contact-heading" className="text-xl font-display font-bold text-text mb-6">Contact Information</h2>
                    <Input
                      label="Email"
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      error={errors.email}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </section>
                )}

                {step === 2 && (
                  <section aria-labelledby="shipping-heading" className="space-y-6">
                    <h2 id="shipping-heading" className="text-xl font-display font-bold text-text mb-6">Shipping Address</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="First Name"
                        value={formData.firstName}
                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                        error={errors.firstName}
                        placeholder="John"
                      />
                      <Input
                        label="Last Name"
                        value={formData.lastName}
                        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                        error={errors.lastName}
                        placeholder="Doe"
                      />
                    </div>
                    <Input
                      label="Address"
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      error={errors.address}
                      placeholder="123 Main Street"
                    />
                    <Input
                      label="Apartment, suite, etc. (optional)"
                      value={formData.apartment}
                      onChange={e => setFormData({ ...formData, apartment: e.target.value })}
                      placeholder="Apt 4B"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Input
                        label="City"
                        value={formData.city}
                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                        error={errors.city}
                        placeholder="New York"
                      />
                      <Input
                        label="State"
                        value={formData.state}
                        onChange={e => setFormData({ ...formData, state: e.target.value })}
                        error={errors.state}
                        placeholder="NY"
                      />
                      <Input
                        label="ZIP Code"
                        value={formData.zipCode}
                        onChange={e => setFormData({ ...formData, zipCode: e.target.value })}
                        error={errors.zipCode}
                        placeholder="10001"
                      />
                    </div>
                    <Input
                      label="Phone"
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      error={errors.phone}
                      placeholder="+1 (555) 000-0000"
                      autoComplete="tel"
                    />
                    <Input
                      label="Country"
                      value={formData.country}
                      onChange={e => setFormData({ ...formData, country: e.target.value })}
                      placeholder="United States"
                    />
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.saveInfo}
                        onChange={e => setFormData({ ...formData, saveInfo: e.target.checked })}
                        className="w-4 h-4 rounded border-border text-accent bg-surface focus:ring-accent focus:ring-2"
                      />
                      <span className="text-sm text-text-muted">{user ? 'Save this address to my account' : 'Save this information for next time'}</span>
                    </label>
                  </section>
                )}

                {step === 3 && (
                  <section aria-labelledby="payment-heading" className="space-y-6">
                    <h2 id="payment-heading" className="text-xl font-display font-bold text-text mb-6">Payment Method</h2>
                    <div className="space-y-3">
                      {['card', 'cod', 'paypal', 'apple'].map(method => (
                        <label key={method} className={cn(
                          'flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer',
                          formData.paymentMethod === method
                            ? 'border-accent/50 bg-accent/5'
                            : 'border-border/50 hover:border-border-hover'
                        )}>
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={method}
                            checked={formData.paymentMethod === method}
                            onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                            className="w-4 h-4 text-accent border-border focus:ring-accent focus:ring-2"
                          />
                          <div className="flex-1">
                            <p className="font-body font-medium text-text capitalize">{method === 'card' ? 'Credit / Debit Card' : method === 'cod' ? 'Cash on Delivery' : method === 'paypal' ? 'PayPal' : 'Apple Pay'}</p>
                            <p className="text-sm text-text-muted">{method === 'cod' ? 'Pay in cash when your order arrives' : method === 'card' ? 'Test card 4242 4242 4242 4242 · ends in 0002 = declined' : 'Secure payment processing'}</p>
                          </div>
                        </label>
                      ))}
                    </div>

                    {formData.paymentMethod === 'card' && (
                      <div className="space-y-4 mt-4 p-4 rounded-xl bg-surface/50 border border-border/50">
                        <Input
                          label="Card Number"
                          value={formData.cardNumber}
                          onChange={e => setFormData({ ...formData, cardNumber: e.target.value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim() })}
                          error={errors.cardNumber}
                          placeholder="4242 4242 4242 4242"
                          autoComplete="cc-number"
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            label="Expiry (MM/YY)"
                            value={formData.cardExpiry}
                            onChange={e => {
                              let val = e.target.value.replace(/\D/g, '');
                              if (val.length >= 2) val = val.slice(0, 2) + '/' + val.slice(2, 4);
                              setFormData({ ...formData, cardExpiry: val });
                            }}
                            error={errors.cardExpiry}
                            placeholder="12/28"
                            autoComplete="cc-exp"
                          />
                          <Input
                            label="CVC"
                            value={formData.cardCvc}
                            onChange={e => setFormData({ ...formData, cardCvc: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                            error={errors.cardCvc}
                            placeholder="123"
                            autoComplete="cc-csc"
                          />
                        </div>
                        <Input
                          label="Name on Card"
                          value={formData.cardName}
                          onChange={e => setFormData({ ...formData, cardName: e.target.value })}
                          error={errors.cardName}
                          placeholder="JOHN DOE"
                          autoComplete="cc-name"
                        />
                      </div>
                    )}

                    {formData.paymentMethod === 'paypal' && (
                      <div className="p-4 rounded-xl bg-surface/50 border border-border/50 text-center text-text-muted">
                        <svg className="w-12 h-12 mx-auto text-text-muted mb-2" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12c0 1.66-1.34 3-3 3H5.17l1.59-1.59L5 12l1.76-1.76L5.17 9H18c1.66 0 3 1.34 3 3z"/></svg>
                        <p>You will be redirected to PayPal to complete your purchase.</p>
                      </div>
                    )}

                    {formData.paymentMethod === 'apple' && (
                      <div className="p-4 rounded-xl bg-surface/50 border border-border/50 text-center text-text-muted">
                        <svg className="w-12 h-12 mx-auto text-text-muted mb-2" viewBox="0 0 24 24" fill="currentColor"><path d="M18.5 5.5h-15A3.5 3.5 0 0 0 0 9v10a3.5 3.5 0 0 0 3.5 3.5h15a3.5 3.5 0 0 0 3.5-3.5v-10a3.5 3.5 0 0 0-3.5-3.5zM15 14.5c0 1.38-1.12 2.5-2.5 2.5S10 15.88 10 14.5 11.12 12 12.5 12s2.5 1.12 2.5 2.5zm-5-7c-1.38 0-2.5 1.12-2.5 2.5S8.62 12 10 12s2.5-1.12 2.5-2.5S11.38 5 10 5zm0 11c-1.38 0-2.5-1.12-2.5-2.5S8.62 7 10 7s2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                        <p>Authenticate with Face ID or Touch ID to complete your purchase.</p>
                      </div>
                    )}
                  </section>
                )}

                {step === 4 && (
                  <section aria-labelledby="review-heading" className="space-y-6">
                    <h2 id="review-heading" className="text-xl font-display font-bold text-text mb-6">Review Order</h2>

                    <div className="space-y-3 mb-6">
                      {items.map(item => (
                        <div key={item.cartItemId || `review-${item.id}-${item.selectedColor}`} className="flex gap-3 p-3 rounded-xl bg-surface/50 border border-border/50">
                          <img src={item.image} alt={item.name} className="w-16 h-16 rounded-lg object-cover" />
                          <div className="flex-1 min-w-0">
                            <p className="font-body font-medium text-text truncate">{item.name}</p>
                            <p className="text-sm text-text-muted">{item.selectedColor} • Qty: {item.quantity}</p>
                          </div>
                          <span className="font-display font-semibold text-text">{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="bg-surface/50 border border-border/50 rounded-2xl p-6">
                      <h3 className="font-body font-semibold text-text mb-4">Order Summary</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-text-muted"><span>Subtotal</span><span className="text-text">{formatPrice(t.subtotal)}</span></div>
                        {t.discount > 0 && <div className="flex justify-between text-accent"><span>Discount ({quote.coupon.code})</span><span>−{formatPrice(t.discount)}</span></div>}
                        <div className="flex justify-between text-text-muted"><span>Shipping</span><span className="text-text">{t.shipping === 0 ? 'Free' : formatPrice(t.shipping)}</span></div>
                        <div className="flex justify-between text-text-muted"><span>Tax</span><span className="text-text">{formatPrice(t.tax)}</span></div>
                        <div className="h-px bg-border/50 my-2" />
                        <div className="flex justify-between text-lg font-display font-semibold text-text"><span>Total</span><span>{formatPrice(t.total)}</span></div>
                      </div>
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 mt-1 rounded border-border text-accent bg-surface focus:ring-accent focus:ring-2" required />
                      <div className="text-sm text-text-muted">
                        I agree to the <Link to="/terms" className="text-accent hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-accent hover:underline">Privacy Policy</Link>.
                      </div>
                    </label>
                  </section>
                )}
              </motion.div>
            </AnimatePresence>

            {submitError && (
              <div role="alert" className="flex items-start gap-3 p-4 rounded-xl border border-error/40 bg-error/5 text-sm text-error">
                <X className="w-5 h-5 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <motion.div
              className="flex items-center justify-between pt-4 border-t border-border/50"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {step > 1 && (
                <Button variant="secondary" onClick={goBack} leftIcon={<ChevronRight className="w-5 h-5" />} className="rotate-180">
                  BACK
                </Button>
              )}
              {step < 4 ? (
                <Button size="lg" onClick={handleSubmit} loading={processing} rightIcon={<ChevronRight className="w-5 h-5" />} disabled={processing}>
                  {step === 3 ? 'REVIEW ORDER' : 'CONTINUE'}
                </Button>
              ) : (
                <Button size="lg" onClick={handleSubmit} loading={processing} rightIcon={<Lock className="w-5 h-5" />} disabled={processing}>
                  {processing ? 'PROCESSING...' : 'PLACE ORDER'}
                </Button>
              )}
            </motion.div>
          </motion.div>

          <motion.aside
            className="lg:col-span-5 lg:sticky lg:top-24"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
          >
            <div className="bg-surface/50 border border-border/50 rounded-2xl p-6 sticky top-24">
              <h3 className="font-display font-bold text-text mb-4">Order Summary</h3>
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {items.map(item => (
                  <div key={item.cartItemId || `sidebar-${item.id}-${item.selectedColor}`} className="flex gap-3">
                    <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-body font-medium text-text truncate">{item.name}</p>
                      <p className="text-xs text-text-muted">{item.selectedColor} × {item.quantity}</p>
                    </div>
                    <span className="font-display font-medium text-text">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {backend.online && (
                <div className="border-t border-border/50 pt-4 mb-4">
                  <div className="flex gap-2">
                    <input
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); requote(couponCode.trim()); } }}
                      placeholder="Promo code"
                      aria-label="Promo code"
                      className="flex-1 min-w-0 px-4 py-2.5 bg-bg/50 border border-border/50 rounded-xl text-sm text-text placeholder:text-text-subtle uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    {quote?.coupon ? (
                      <button type="button" onClick={() => { setQuote(null); setCouponCode(''); setCouponMsg(null); }} className="px-4 py-2.5 rounded-xl border border-border/50 text-xs text-text-muted hover:text-text">Remove</button>
                    ) : (
                      <button type="button" disabled={!couponCode.trim() || applying} onClick={() => requote(couponCode.trim())} className="px-4 py-2.5 rounded-xl bg-accent/10 border border-accent/30 text-xs font-medium text-accent disabled:opacity-40">{applying ? '…' : 'Apply'}</button>
                    )}
                  </div>
                  {couponMsg && <p className={cn('mt-2 text-xs', couponMsg.ok ? 'text-accent' : 'text-error')} role="status">{couponMsg.text}</p>}
                  {!couponMsg && <p className="mt-2 text-xs text-text-subtle">Try VAULT10 or FREESHIP</p>}
                </div>
              )}

              <div className="border-t border-border/50 pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-text-muted"><span>Subtotal</span><span className="text-text">{formatPrice(t.subtotal)}</span></div>
                        {t.discount > 0 && <div className="flex justify-between text-accent"><span>Discount ({quote.coupon.code})</span><span>−{formatPrice(t.discount)}</span></div>}
                <div className="flex justify-between text-text-muted"><span>Shipping</span><span className="text-text">{t.shipping === 0 ? 'Free' : formatPrice(t.shipping)}</span></div>
                <div className="flex justify-between text-text-muted"><span>Estimated Tax</span><span className="text-text">{formatPrice(t.tax)}</span></div>
                <div className="h-px bg-border/50 my-2" />
                <div className="flex justify-between text-lg font-display font-semibold text-text"><span>Total</span><span>{formatPrice(t.total)}</span></div>
              </div>

              <div className="mt-4 pt-4 border-t border-border/50 text-xs text-text-subtle">
                <p>Secure checkout • 256-bit encryption</p>
                <p className="mt-1">Your information is protected</p>
              </div>
            </div>
          </motion.aside>
        </form>
      </div>
    </div>
  );
};

export default Checkout;