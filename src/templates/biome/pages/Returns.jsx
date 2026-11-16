import { motion } from 'motion/react';
import { RotateCcw, Shield, Truck, Clock, CheckCircle2, AlertCircle, CreditCard, Box, Globe } from 'lucide-react';

const Returns = () => {
  const sections = [
    {
      id: 'policy',
      title: 'RETURN POLICY OVERVIEW',
      icon: RotateCcw,
      content: `**30-Day Returns:** Most items can be returned within 30 days of delivery for a full refund to your original payment method.

**Condition Requirements:** Items must be in new, unused condition with all original packaging, accessories, manuals, and tags attached.

**Free Return Shipping:** Defective, damaged, or incorrect items qualify for free return shipping with a prepaid label.

**Standard Returns:** A $15 restocking fee applies to change-of-mind returns. The fee is deducted from your refund.`,
    },
    {
      id: 'exceptions',
      title: 'NON-RETURNABLE ITEMS',
      icon: AlertCircle,
      content: `The following items cannot be returned unless defective:
      
• **Final Sale Items:** Marked as "Final Sale" on the product page
• **Opened Software/Licenses:** Digital codes, software licenses, subscription activations
• **Personalized Products:** Custom engravings, configurations, or made-to-order items
• **Gift Cards:** Digital and physical gift cards
• **Hygiene Products:** Earbuds, wearables with broken seals (unless defective)
• **Consumables:** Batteries, cables, accessories once opened`,
    },
    {
      id: 'process',
      title: 'HOW TO INITIATE A RETURN',
      icon: Box,
      content: `**Step 1:** Log into your NEONVAULT account and go to Order History, or visit returns.neonvault.com with your order number and email.

**Step 2:** Select the item(s) to return and choose a reason. You'll see if your return qualifies for free shipping.

**Step 3:** Print the prepaid return label (emailed instantly) or request a mailed label (3-5 business days).

**Step 4:** Pack the item securely in its original packaging with all accessories. Attach the label.

**Step 5:** Drop off at any authorized carrier location (UPS, FedEx, USPS). Keep your drop-off receipt.

**Step 6:** Track your return. Refunds process within 5-10 business days after we receive and inspect the item.`,
    },
    {
      id: 'exchanges',
      title: 'EXCHANGES',
      icon: RotateCcw,
      content: `**Size/Color Exchanges:** Available for in-stock variants. Initiate a return for the original item and place a new order for the desired variant. We'll waive the restocking fee.

**Defective Exchanges:** Contact support for immediate replacement shipping. No need to return the defective item first for orders under $200.

**Out of Stock:** If your desired variant is out of stock, we'll notify you when it's available or issue a full refund.`,
    },
    {
      id: 'refunds',
      title: 'REFUND TIMELINES',
      icon: CreditCard,
      content: `**Credit/Debit Cards:** 5-10 business days after we receive the return. Appears on your statement within 1-2 billing cycles.

**PayPal:** 3-5 business days to your PayPal balance.

**Apple Pay:** 5-10 business days to the original card.

**Store Credit:** Instant upon return receipt (optional, offered for exchanges).

**Gift Returns:** Refund issued as NEONVAULT store credit (no restocking fee).`,
    },
    {
      id: 'international',
      title: 'INTERNATIONAL RETURNS',
      icon: Globe,
      content: `International returns are accepted within 30 days but have different terms:

• Return shipping is the customer's responsibility (no prepaid labels)
• Ship to: NEONVAULT Returns, 123 Innovation Drive, San Francisco, CA 94105, USA
• Include your order number and RMA number inside the package
• Customs forms must declare "Returned Goods - Value $0" to avoid import fees
• Refunds exclude original shipping and any import duties paid
• Processing: 10-15 business days after receipt`,
    },
    {
      id: 'warranty-returns',
      title: 'WARRANTY CLAIMS VS. RETURNS',
      icon: Shield,
      content: `**Within 30 Days:** You can choose standard return (full refund) or warranty claim (repair/replacement).

**After 30 Days:** Warranty claims only. Contact support with order number, issue description, and photos. We'll authorize repair or replacement.

**Accidental Damage:** Not covered by warranty. Third-party protection plans available at checkout.`,
    },
  ];

  return (
    <div className="min-h-screen pt-20 lg:pt-24 pb-20">
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <div className="absolute inset-0 noise-overlay" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div className="mb-16" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-6 mx-auto">
            <RotateCcw className="w-8 h-8" />
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-text leading-tight text-center mb-4">
            RETURNS & EXCHANGES
          </h1>
          <p className="text-lg text-text-muted text-center max-w-2xl mx-auto">
            30-day hassle-free returns. Free return shipping on defective items.
          </p>
        </motion.div>

        <motion.div className="space-y-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}>
          {sections.map((section, index) => (
            <motion.section key={section.id} id={section.id} className="p-8 bg-surface/50 border border-border/50 rounded-2xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + index * 0.05 }}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent flex-shrink-0 mt-1">
                  <section.icon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold text-text mb-4">{section.title}</h2>
                  <div className="prose prose-invert max-w-none text-text-muted leading-relaxed space-y-4">
                    {section.content.split('\n\n').map((para, i) => (
                      <p key={i} className="whitespace-pre-wrap">{para}</p>
                    ))}
                  </div>
                </div>
              </div>
            </motion.section>
          ))}
        </motion.div>

        <motion.div className="mt-16 p-8 bg-accent/5 border border-accent/20 rounded-2xl text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
          <h3 className="text-xl font-display font-bold text-text mb-3">Need to Start a Return?</h3>
          <p className="text-text-muted mb-6 max-w-xl mx-auto">Visit our returns center or contact support for assistance.</p>
          <a href="/contact" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-bg rounded-xl font-body font-medium hover:bg-accent-dim transition-colors">
            START A RETURN
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </motion.div>
      </div>
    </div>
  );
};

export default Returns;