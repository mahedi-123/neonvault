import { motion } from 'framer-motion';
import { Gift, Mail, CreditCard, Clock, CheckCircle2, Smartphone, Wifi, Shield, Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '../utils/helpers';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import { useState } from 'react';

const GiftCards = () => {
  const [step, setStep] = useState('denomination');
  const [selectedAmount, setSelectedAmount] = useState(100);
  const [formData, setFormData] = useState({
    recipientEmail: '',
    recipientName: '',
    senderName: '',
    message: '',
    sendDate: '',
  });
  const [status, setStatus] = useState('idle');

  const denominations = [25, 50, 100, 250, 500, 1000];
  const customAmounts = [150, 200, 300, 750];

  const handleAmountSelect = (amount) => {
    setSelectedAmount(amount);
    setStep('details');
  };

  const handleCustomAmount = (e) => {
    const amount = parseInt(e.target.value) || 0;
    if (amount >= 25 && amount <= 2000) {
      setSelectedAmount(amount);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.recipientEmail || !formData.senderName) return;
    setStatus('submitting');
    await new Promise(r => setTimeout(r, 1500));
    setStatus('success');
    setStep('success');
  };

  const formatCurrency = (amount) => `$${amount.toLocaleString()}`;

  return (
    <div className="min-h-screen pt-20 lg:pt-24 pb-20">
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <div className="absolute inset-0 noise-overlay" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.section className="mb-16" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="text-center max-w-3xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-6 mx-auto">
              <Gift className="w-8 h-8" />
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-text leading-tight mb-4">
              GIFT CARDS
            </h1>
            <p className="text-lg text-text-muted leading-relaxed">
              The perfect gift for tech enthusiasts. Instant delivery, never expires, redeemable on everything.
            </p>
          </div>
        </motion.section>

        {step === 'denomination' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}>
            <h2 className="text-2xl font-display font-bold text-text text-center mb-8">CHOOSE AN AMOUNT</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {denominations.map((amount) => (
                <motion.button
                  key={amount}
                  onClick={() => handleAmountSelect(amount)}
                  className={cn(
                    'p-6 bg-surface/50 border-2 rounded-2xl transition-all text-center',
                    selectedAmount === amount
                      ? 'border-accent bg-accent/5 text-text'
                      : 'border-border/50 text-text-muted hover:text-text hover:border-border-hover'
                  )}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + amount * 0.001 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="text-3xl font-display font-bold">{formatCurrency(amount)}</span>
                </motion.button>
              ))}
            </div>
            <div className="text-center">
              <p className="text-text-muted mb-4">Or enter a custom amount ($25 - $2,000)</p>
              <div className="max-w-xs mx-auto">
                <Input
                  type="number"
                  placeholder="Custom amount"
                  value={customAmounts.includes(selectedAmount) ? selectedAmount : ''}
                  onChange={handleCustomAmount}
                  onBlur={() => handleCustomAmount({ target: { value: selectedAmount } })}
                  className="text-center text-2xl font-display font-bold"
                />
              </div>
            </div>
          </motion.div>
        )}

        {step === 'details' && (
          <motion.form onSubmit={handleSubmit} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-display font-bold text-text">GIFT CARD DETAILS</h2>
              <Button variant="ghost" size="sm" onClick={() => setStep('denomination')} leftIcon={<ArrowRight className="w-4 h-4 rotate-180" />}>
                CHANGE AMOUNT
              </Button>
            </div>

            <div className="mb-8 p-6 bg-accent/5 border border-accent/20 rounded-2xl text-center">
              <p className="text-text-muted mb-2">SELECTED AMOUNT</p>
              <p className="text-4xl font-display font-bold text-accent">{formatCurrency(selectedAmount)}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <Input
                label="Recipient's Email"
                type="email"
                name="recipientEmail"
                value={formData.recipientEmail}
                onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
                placeholder="friend@example.com"
                required
                autoComplete="email"
              />
              <Input
                label="Recipient's Name (optional)"
                name="recipientName"
                value={formData.recipientName}
                onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                placeholder="Alex"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <Input
                label="Your Name"
                name="senderName"
                value={formData.senderName}
                onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                placeholder="Jordan"
                required
              />
              <Input
                label="Delivery Date"
                type="date"
                name="sendDate"
                value={formData.sendDate}
                onChange={(e) => setFormData({ ...formData, sendDate: e.target.value })}
                defaultValue={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="mb-8">
              <label className="block text-sm font-body font-medium text-text-muted mb-3">Personal Message (optional)</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 bg-surface border border-border/50 rounded-xl text-text placeholder:text-text-subtle font-body focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                placeholder="Happy Birthday! Thought you'd love picking out something from NEONVAULT..."
                maxLength={500}
              />
              <p className="text-xs text-text-subtle mt-1 text-right">{formData.message.length}/500</p>
            </div>

            <div className="flex items-center gap-4">
              <Button type="submit" size="lg" loading={status === 'submitting'} disabled={status === 'submitting' || !formData.recipientEmail || !formData.senderName} className="flex-1">
                {status === 'submitting' ? 'SENDING...' : 'SEND GIFT CARD'}
              </Button>
              <Button variant="secondary" size="lg" onClick={() => setStep('denomination')}>
                BACK
              </Button>
            </div>
          </motion.form>
        )}

        {step === 'success' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', damping: 20, stiffness: 150 }} className="text-center">
            <motion.div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 15, stiffness: 100, delay: 0.2 }}>
              <CheckCircle2 className="w-10 h-10 text-accent" />
            </motion.div>
            <h2 className="text-3xl font-display font-bold text-text mb-4">GIFT CARD SENT!</h2>
            <p className="text-text-muted mb-8 max-w-md mx-auto">
              Your ${formatCurrency(selectedAmount)} gift card has been delivered to <strong>{formData.recipientEmail}</strong>.
              {formData.sendDate !== new Date().toISOString().split('T')[0] && ` Scheduled for ${new Date(formData.sendDate).toLocaleDateString()}.`}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" onClick={() => { setStep('denomination'); setFormData({ recipientEmail: '', recipientName: '', senderName: '', message: '', sendDate: '' }); setStatus('idle'); }}>
                SEND ANOTHER
              </Button>
              <Button variant="secondary" size="lg" onClick={() => window.location.href = '/'}>
                CONTINUE SHOPPING
              </Button>
            </div>
          </motion.div>
        )}

        <motion.section className="mt-24" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
          <h2 className="text-3xl font-display font-bold text-text text-center mb-12">WHY NEONVAULT GIFT CARDS?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Mail, title: 'Instant Delivery', desc: 'Delivered via email in seconds. Schedule for a future date if you prefer.' },
              { icon: Smartphone, title: 'Mobile Wallet Ready', desc: 'Add to Apple Wallet or Google Pay for easy in-store redemption.' },
              { icon: Shield, title: 'Never Expires', desc: 'No expiration dates, no fees. Full value forever.' },
              { icon: Wifi, title: 'Redeem Anywhere', desc: 'Use online at neonvault.com or at our San Francisco flagship store.' },
              { icon: CreditCard, title: 'Combine & Split', desc: 'Use multiple gift cards on one order. Partial redemption supported.' },
              { icon: Clock, title: 'Balance Tracking', desc: 'Check remaining balance anytime at neonvault.com/balance.' },
              { icon: Gift, title: 'Personalized', desc: 'Add a custom message. We\'ll include it in the beautiful email template.' },
              { icon: Sparkles, title: 'Vault Perks Apply', desc: 'Gift card purchases earn Vault Points for the recipient on their first order.' },
            ].map((item, index) => (
              <motion.div key={item.title} className="p-6 bg-surface/50 border border-border/50 rounded-2xl text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + index * 0.05 }}>
                <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center text-accent mx-auto mb-4">
                  <item.icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-display font-bold text-text mb-2">{item.title}</h3>
                <p className="text-text-muted text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section className="mt-16" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}>
          <h2 className="text-3xl font-display font-bold text-text text-center mb-12">FAQ</h2>
          <div className="max-w-3xl mx-auto space-y-4">
            {[
              { q: 'Do gift cards expire?', a: 'Never. NEONVAULT gift cards have no expiration date and no maintenance fees.' },
              { q: 'Can I schedule delivery for a specific date?', a: 'Yes! Choose any future date during checkout. The recipient will receive it that morning.' },
              { q: 'Can I use a gift card with a promo code?', a: 'Yes, gift cards can be combined with most promotional discounts at checkout.' },
              { q: 'What if the recipient doesn\'t receive it?', a: 'Check spam/junk folders first. If still missing, contact support@neonvault.com and we\'ll resend instantly.' },
              { q: 'Can I get a refund on a gift card?', a: 'Gift cards are non-refundable per our Terms of Service, except where required by law.' },
              { q: 'How do I check my balance?', a: 'Visit neonvault.com/balance and enter your gift card code, or log into your account.' },
            ].map((faq, index) => (
              <motion.details key={index} className="p-6 bg-surface/50 border border-border/50 rounded-xl" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + index * 0.03 }}>
                <summary className="flex items-center justify-between cursor-pointer list-none text-text font-body font-medium">
                  {faq.q}
                  <svg className="w-5 h-5 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                </summary>
                <div className="mt-4 text-text-muted">{faq.a}</div>
              </motion.details>
            ))}
          </div>
        </motion.section>

        <motion.section className="mt-16 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
          <h2 className="text-2xl font-display font-bold text-text mb-6">CORPORATE & BULK ORDERS</h2>
          <p className="text-text-muted mb-8 max-w-xl mx-auto">
            Need gift cards for your team, clients, or event? We offer volume discounts, custom branding, and dedicated support.
          </p>
          <a href="mailto:corporate@neonvault.com" className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-bg rounded-xl font-body font-medium text-lg hover:bg-accent-dim transition-colors">
            CONTACT SALES TEAM
            <ArrowRight className="w-6 h-6" />
          </a>
        </motion.section>
      </div>
    </div>
  );
};

export default GiftCards;