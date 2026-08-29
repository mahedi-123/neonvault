import { motion } from 'framer-motion';
import { HelpCircle, Search, ChevronDown, ChevronUp, Mail, Truck, RotateCcw, Shield, CreditCard, User, Settings } from 'lucide-react';
import { useState } from 'react';

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(-1);

  const faqs = [
    {
      category: 'Orders & Payments',
      icon: CreditCard,
      items: [
        { q: 'Can I modify or cancel my order after placing it?', a: 'Orders can be modified or cancelled within 30 minutes of placement. After that, they enter processing and cannot be changed. Contact support immediately if you need to make changes.' },
        { q: 'What payment methods do you accept?', a: 'We accept Visa, Mastercard, American Express, Discover, PayPal, and Apple Pay. All payments are processed securely through Stripe.' },
        { q: 'Do you offer financing or payment plans?', a: 'Yes, we offer 0% APR financing through Affirm for orders over $100 (subject to credit approval). Select Affirm at checkout.' },
        { q: 'Why was my order cancelled?', a: 'Orders may be cancelled due to inventory issues, payment verification failure, or suspected fraud. You\'ll receive an email with the specific reason and a full refund.' },
        { q: 'Do you charge sales tax?', a: 'Sales tax is calculated based on your shipping address and applicable state/local laws. Tax appears at checkout before payment.' },
      ],
    },
    {
      category: 'Shipping & Delivery',
      icon: Truck,
      items: [
        { q: 'How long does shipping take?', a: 'Standard: 3-5 business days (free over $200). Express: 1-2 days ($19.99). Overnight: next day ($34.99). International: 7-20 days depending on destination.' },
        { q: 'Do you ship internationally?', a: 'Yes, to 50+ countries. Rates start at $19.99. Customs duties and taxes are the buyer\'s responsibility and not included in shipping costs.' },
        { q: 'Can I change my shipping address after ordering?', a: 'Contact support within 30 minutes of placing your order. After processing begins, address changes are not possible.' },
        { q: 'What if my package is lost or damaged?', a: 'Contact support within 48 hours of the delivery date with photos. We\'ll investigate with the carrier and send a replacement or issue a refund.' },
        { q: 'Do you offer in-store pickup?', a: 'Currently available only at our San Francisco flagship store. Select "Store Pickup" at checkout. Orders ready within 2 hours during business hours.' },
      ],
    },
    {
      category: 'Returns & Exchanges',
      icon: RotateCcw,
      items: [
        { q: 'What is your return policy?', a: '30-day returns on most items in new condition with original packaging. Free return shipping for defective items. $15 restocking fee for change-of-mind returns.' },
        { q: 'How do I start a return?', a: 'Log into your account > Order History > Start Return, or visit returns.neonvault.com with your order number and email.' },
        { q: 'Can I exchange an item for a different color/size?', a: 'Yes! Initiate a return for the original and place a new order. We\'ll waive the restocking fee for exchanges.' },
        { q: 'How long do refunds take?', a: '5-10 business days after we receive the return. Credit cards: 1-2 billing cycles. PayPal: 3-5 days. Store credit: instant.' },
        { q: 'What items cannot be returned?', a: 'Final sale items, opened software/licenses, personalized products, gift cards, and hygiene products with broken seals (unless defective).' },
      ],
    },
    {
      category: 'Warranty & Support',
      icon: Shield,
      items: [
        { q: 'What does the warranty cover?', a: '2-year manufacturer warranty covers defects in materials and workmanship. Includes premature battery degradation (<80% capacity), display defects, connectivity issues, and mechanical failures.' },
        { q: 'How do I file a warranty claim?', a: 'Visit warranty.neonvault.com with your order number, or email warranty@neonvault.com. Most claims approved within 24 hours.' },
        { q: 'Is accidental damage covered?', a: 'Standard warranty does not cover accidental damage. NEONVAULT Care+ (optional at checkout) covers 2 accidental damage claims with a $49 service fee.' },
        { q: 'Do you offer repair services?', a: 'Yes, free warranty repairs at our authorized service center. Shipping both ways covered. Out-of-warranty repairs available for a fee.' },
        { q: 'How do I contact support?', a: 'Email: support@neonvault.com | Phone: +1 (555) 000-0000 | Live Chat: Available on site Mon-Fri 9AM-6PM PST.' },
      ],
    },
    {
      category: 'Account & Privacy',
      icon: User,
      items: [
        { q: 'How do I create an account?', a: 'Click "Account" in the navigation, then "Create Account." You can also create one during checkout.' },
        { q: 'How do I reset my password?', a: 'Click "Forgot Password" on the login page. A reset link will be sent to your email.' },
        { q: 'How do I delete my account?', a: 'Go to Account Settings > Privacy > Delete Account. This action is irreversible and removes all order history.' },
        { q: 'Is my personal data secure?', a: 'Yes. We use TLS 1.3 encryption, PCI DSS compliant payment processing, and follow GDPR/CCPA guidelines. See our Privacy Policy for details.' },
        { q: 'How do I unsubscribe from marketing emails?', a: 'Click "Unsubscribe" at the bottom of any marketing email, or update preferences in Account Settings > Notifications.' },
      ],
    },
    {
      category: 'Products',
      icon: Settings,
      items: [
        { q: 'Are your products authentic?', a: '100%. We are an authorized retailer for all brands we carry. Every product comes with the manufacturer\'s original warranty.' },
        { q: 'Do you price match?', a: 'We match prices from authorized retailers on identical in-stock items. Contact support with the competitor\'s link before purchasing.' },
        { q: 'Can I pre-order upcoming products?', a: 'Yes! Pre-orders are available for select upcoming releases. Payment is captured at checkout. Estimated ship dates are shown on the product page.' },
        { q: 'Do you sell refurbished/open-box items?', a: 'Occasionally. These are clearly marked as "Refurbished" or "Open Box" with a 90-day warranty and discounted pricing.' },
        { q: 'How do I check product compatibility?', a: 'Compatibility details are in the Specifications tab on each product page. For specific questions, contact support with your device details.' },
      ],
    },
  ];

  return (
    <div className="min-h-screen pt-20 lg:pt-24 pb-20">
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <div className="absolute inset-0 noise-overlay" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div className="mb-16" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-6 mx-auto">
            <HelpCircle className="w-8 h-8" />
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-text leading-tight text-center mb-4">
            FREQUENTLY ASKED QUESTIONS
          </h1>
          <p className="text-lg text-text-muted text-center max-w-2xl mx-auto">
            Quick answers to common questions. Can't find what you need? Contact our support team.
          </p>
        </motion.div>

        <motion.div className="space-y-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}>
          {faqs.map((cat, catIndex) => (
            <motion.div key={cat.category} className="bg-surface/50 border border-border/50 rounded-2xl overflow-hidden" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + catIndex * 0.05 }}>
              <div className="p-6 border-b border-border/50">
                <h2 className="flex items-center gap-3 text-xl font-display font-bold text-text">
                  <cat.icon className="w-6 h-6 text-accent" />
                  {cat.category}
                </h2>
              </div>
              <div className="divide-y divide-border/50">
                {cat.items.map((faq, faqIndex) => (
                  <motion.details
                    key={faq.q}
                    className="group p-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + catIndex * 0.05 + faqIndex * 0.03 }}
                    open={openIndex === faqIndex}
                    onToggle={() => setOpenIndex(openIndex === faqIndex ? -1 : faqIndex)}
                  >
                    <summary className="flex items-center justify-between cursor-pointer list-none text-text font-body font-medium">
                      {faq.q}
                      <motion.svg
                        className="w-5 h-5 text-text-muted transition-transform"
                        animate={{ rotate: openIndex === faqIndex ? 180 : 0 }}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </motion.svg>
                    </summary>
                    <div className="mt-4 text-text-muted leading-relaxed">{faq.a}</div>
                  </motion.details>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div className="mt-16 p-8 bg-accent/5 border border-accent/20 rounded-2xl text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
          <h3 className="text-xl font-display font-bold text-text mb-3">Still Need Help?</h3>
          <p className="text-text-muted mb-6 max-w-xl mx-auto">Our support team is here for you. Reach out anytime.</p>
          <a href="/contact" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-bg rounded-xl font-body font-medium hover:bg-accent-dim transition-colors">
            CONTACT SUPPORT
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </motion.div>
      </div>
    </div>
  );
};

export default FAQ;