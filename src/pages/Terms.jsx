import { motion } from 'framer-motion';
import { FileText, Shield, CreditCard, Truck, RotateCcw, Gavel, Globe, AlertCircle, Settings, Mail } from 'lucide-react';

const sectionIcons = {
  acceptance: FileText,
  'use-of-site': Shield,
  orders: CreditCard,
  shipping: Truck,
  returns: RotateCcw,
  warranty: Shield,
  'intellectual-property': FileText,
  'user-content': FileText,
  disclaimers: AlertCircle,
  indemnification: Shield,
  'governing-law': Gavel,
  changes: Settings,
  contact: Mail,
};

const Terms = () => {
  const sections = [
    {
      id: 'acceptance',
      title: 'ACCEPTANCE OF TERMS',
      content: `By accessing and using NEONVAULT ("the Site"), you agree to be bound by these Terms of Service ("Terms") and all applicable laws and regulations. If you do not agree with any part of these Terms, you may not use the Site. We reserve the right to modify these Terms at any time. Continued use after changes constitutes acceptance.`,
    },
    {
      id: 'use-of-site',
      title: 'USE OF THE SITE',
      content: `You must be at least 16 years old to use this Site. You agree to:
      
• Provide accurate, current, and complete information when creating an account or making purchases.
• Maintain the security of your account credentials.
• Use the Site only for lawful purposes and in accordance with these Terms.
• Not attempt to gain unauthorized access to any systems, accounts, or data.
• Not use automated tools (bots, scrapers) to access the Site without permission.
• Not interfere with or disrupt the Site's operation or other users' experience.`,
    },
    {
      id: 'orders',
      title: 'ORDERS & PAYMENTS',
      content: `**Product Availability:** All orders are subject to availability. We reserve the right to limit quantities or cancel orders if products are unavailable or pricing errors occur.

**Pricing:** Prices are in USD and subject to change without notice. Pricing errors will be corrected and you will be notified before charging.

**Payment:** We accept major credit cards, PayPal, and Apple Pay via secure processors (Stripe). Payment is authorized at checkout and captured upon shipment.

**Order Confirmation:** An order confirmation email is sent upon successful payment. This constitutes an offer to purchase, which we accept upon shipment.

**Taxes & Duties:** Applicable sales tax is calculated at checkout. International orders may incur customs duties and taxes, which are the buyer's responsibility.`,
    },
    {
      id: 'shipping',
      title: 'SHIPPING & DELIVERY',
      content: `**Processing:** Orders typically ship within 1-2 business days. Pre-orders and backorders have estimated ship dates shown on product pages.

**Shipping Options:** Standard (3-5 business days), Express (1-2 business days), and International (5-15 business days). Free standard shipping on orders over $200.

**Risk of Loss:** Risk transfers to you upon delivery to the carrier. We are not responsible for carrier delays once shipped.

**Delivery Issues:** Report missing or damaged packages within 48 hours of delivery for investigation.`,
    },
    {
      id: 'returns',
      title: 'RETURNS & EXCHANGES',
      content: `**30-Day Returns:** Most items may be returned within 30 days of delivery for a full refund (original condition, all packaging).

**Exceptions:** Final sale items, opened software, personalized products, and gift cards are non-returnable.

**Process:** Initiate returns via your account or contact support. Return shipping is free for defective items; otherwise, a $15 restocking fee applies.

**Refunds:** Processed within 5-10 business days of receiving the return. Original shipping costs are non-refundable unless the return is due to our error.

**Exchanges:** Available for size/color variants. Contact support to arrange an exchange.`,
    },
    {
      id: 'warranty',
      title: 'WARRANTY',
      content: `**Standard Warranty:** All products carry a 2-year manufacturer warranty against defects in materials and workmanship.

**Coverage:** Repair or replacement at our discretion. Does not cover damage from misuse, accidents, unauthorized modifications, or normal wear.

**Claims:** Contact support with order number and issue description. Proof of purchase required. Shipping for warranty claims is covered by NEONVAULT.

**Extended Warranty:** Optional extended coverage available at checkout for select products.`,
    },
    {
      id: 'intellectual-property',
      title: 'INTELLECTUAL PROPERTY',
      content: `All content on this Site (text, graphics, logos, images, software) is the property of NEONVAULT or its licensors and protected by copyright, trademark, and other laws. You may not reproduce, distribute, modify, or create derivative works without written permission. Product names, logos, and brands are trademarks of their respective owners.`,
    },
    {
      id: 'user-content',
      title: 'USER CONTENT',
      content: `You retain ownership of content you submit (reviews, photos, feedback). By submitting, you grant NEONVAULT a worldwide, royalty-free, perpetual license to use, display, modify, and distribute such content for marketing and operational purposes. You represent you have rights to all submitted content and it does not violate laws or third-party rights.`,
    },
    {
      id: 'disclaimers',
      title: 'DISCLAIMERS & LIMITATION OF LIABILITY',
      content: `**As-Is Basis:** The Site and products are provided "as is" and "as available" without warranties of any kind, express or implied.

**No Guarantee:** We do not warrant uninterrupted, error-free, or secure access. Product specifications may vary slightly from descriptions.

**Limitation:** NEONVAULT is not liable for indirect, incidental, special, consequential, or punitive damages (including lost profits, data, or business interruption) arising from use of the Site or products, even if advised of the possibility.

**Maximum Liability:** Our total liability for any claim shall not exceed the amount paid by you for the relevant product or service in the 12 months preceding the claim.`,
    },
    {
      id: 'indemnification',
      title: 'INDEMNIFICATION',
      content: `You agree to indemnify and hold NEONVAULT harmless from any claims, damages, losses, and expenses (including legal fees) arising from your use of the Site, violation of these Terms, or infringement of any third-party rights.`,
    },
    {
      id: 'governing-law',
      title: 'GOVERNING LAW & DISPUTES',
      content: `These Terms are governed by the laws of the State of California, USA, without regard to conflict of laws. Any disputes will be resolved through binding arbitration in San Francisco, CA, under JAMS rules. You may also bring claims in small claims court. Class actions and jury trials are waived to the fullest extent permitted by law.`,
    },
    {
      id: 'changes',
      title: 'CHANGES TO TERMS',
      content: `We may update these Terms at any time. Material changes will be posted on this page with a revised "Last Updated" date. Your continued use after changes constitutes acceptance. If you disagree, discontinue use and close your account.`,
    },
    {
      id: 'contact',
      title: 'CONTACT',
      content: `For questions about these Terms:
      
**Email:** legal@neonvault.com  
**Address:** NEONVAULT Legal, 123 Innovation Drive, San Francisco, CA 94105`,
    },
  ];

  return (
    <div className="min-h-screen pt-20 lg:pt-24 pb-20">
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <div className="absolute inset-0 noise-overlay" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div className="mb-16" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-6 mx-auto">
            <FileText className="w-8 h-8" />
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-text leading-tight text-center mb-4">
            TERMS OF SERVICE
          </h1>
          <p className="text-lg text-text-muted text-center max-w-2xl mx-auto">
            Please read these terms carefully before using NEONVAULT. Your use constitutes agreement to these terms.
          </p>
          <p className="text-sm text-text-subtle text-center mt-4">Last Updated: August 2026</p>
        </motion.div>

        <motion.div className="space-y-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}>
{sections.map((section, index) => {
            const Icon = sectionIcons[section.id] || FileText;
            return (
              <motion.section key={section.id} id={section.id} className="p-8 bg-surface/50 border border-border/50 rounded-2xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + index * 0.05 }}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent flex-shrink-0 mt-1">
                    <Icon className="w-6 h-6" />
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
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};

export default Terms;