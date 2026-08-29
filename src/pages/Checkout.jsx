import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Check, CreditCard, Truck, User, Mail, MapPin, Lock, Loader2, X } from 'lucide-react';
import { cn, formatPrice } from '../utils/helpers';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import { useCart } from '../context/CartContext';
import { useUI } from '../context/UIContext';

const Checkout = () => {
  const { items, subtotal, shipping, tax, total, clearCart } = useCart();
  const { showToast } = useUI();

  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [orderNumber] = useState(`NV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`);

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
    if (stepNum === 3) {
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
    await new Promise(r => setTimeout(r, 2000));
    setProcessing(false);
    setOrderConfirmed(true);
    clearCart();
  };

  const goBack = () => setStep(step - 1);

  if (items.length === 0 && !orderConfirmed) {
    return (
      <div className="min-h-screen pt-20 lg:pt-24 flex items-center justify-center">
        <motion.div className="text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <svg className="w-16 h-16 mx-auto text-text-subtle mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1 4 4v4"/></svg>
          <h1 className="text-2xl font-display font-bold text-text mb-2">Your cart is empty</h1>
          <p className="text-text-muted mb-6">Add some products before checking out</p>
          <Button size="lg" onClick={() => window.location.href = '/shop'} leftIcon={<ChevronRight className="w-5 h-5" />}>
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
              <span className="font-display font-bold text-accent text-xl">{formatPrice(total)}</span>
            </div>
          </motion.div>

          <motion.div className="flex flex-col gap-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Button size="lg" onClick={() => window.location.href = '/'}>
              CONTINUE SHOPPING
            </Button>
            <Button variant="secondary" size="lg" onClick={() => { /* view order */ }}>
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
                      <span className="text-sm text-text-muted">Save this information for next time</span>
                    </label>
                  </section>
                )}

                {step === 3 && (
                  <section aria-labelledby="payment-heading" className="space-y-6">
                    <h2 id="payment-heading" className="text-xl font-display font-bold text-text mb-6">Payment Method</h2>
                    <div className="space-y-3">
                      {['card', 'paypal', 'apple'].map(method => (
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
                            <p className="font-body font-medium text-text capitalize">{method === 'card' ? 'Credit / Debit Card' : method === 'paypal' ? 'PayPal' : 'Apple Pay'}</p>
                            <p className="text-sm text-text-muted">Secure payment processing</p>
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
                        <div className="flex justify-between text-text-muted"><span>Subtotal</span><span className="text-text">{formatPrice(subtotal)}</span></div>
                        <div className="flex justify-between text-text-muted"><span>Shipping</span><span className="text-text">{shipping === 0 ? 'Free' : formatPrice(shipping)}</span></div>
                        <div className="flex justify-between text-text-muted"><span>Tax</span><span className="text-text">{formatPrice(tax)}</span></div>
                        <div className="h-px bg-border/50 my-2" />
                        <div className="flex justify-between text-lg font-display font-semibold text-text"><span>Total</span><span>{formatPrice(total)}</span></div>
                      </div>
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 mt-1 rounded border-border text-accent bg-surface focus:ring-accent focus:ring-2" required />
                      <div className="text-sm text-text-muted">
                        I agree to the <a href="/terms" className="text-accent hover:underline">Terms of Service</a> and <a href="/privacy" className="text-accent hover:underline">Privacy Policy</a>.
                      </div>
                    </label>
                  </section>
                )}
              </motion.div>
            </AnimatePresence>

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

              <div className="border-t border-border/50 pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-text-muted"><span>Subtotal</span><span className="text-text">{formatPrice(subtotal)}</span></div>
                <div className="flex justify-between text-text-muted"><span>Shipping</span><span className="text-text">{shipping === 0 ? 'Free' : formatPrice(shipping)}</span></div>
                <div className="flex justify-between text-text-muted"><span>Estimated Tax</span><span className="text-text">{formatPrice(tax)}</span></div>
                <div className="h-px bg-border/50 my-2" />
                <div className="flex justify-between text-lg font-display font-semibold text-text"><span>Total</span><span>{formatPrice(total)}</span></div>
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