import { motion } from 'framer-motion';
import { Truck, Shield, RotateCcw, Globe, Clock, CheckCircle2, MapPin, AlertCircle } from 'lucide-react';

const Shipping = () => {
  const sections = [
    {
      id: 'domestic',
      title: 'DOMESTIC SHIPPING (USA)',
      icon: Truck,
      content: `**Standard Shipping:** 3-5 business days — Free on orders over $200, otherwise $9.99
      
**Express Shipping:** 1-2 business days — $19.99
      
**Overnight Shipping:** Next business day (orders placed before 12 PM PST) — $34.99
      
**Processing Time:** Orders placed before 12 PM PST ship same business day. Orders after 12 PM ship next business day. Pre-orders ship on the estimated date shown on the product page.`,
    },
    {
      id: 'international',
      title: 'INTERNATIONAL SHIPPING',
      icon: Globe,
      content: `We ship to 50+ countries worldwide. Shipping rates and delivery times vary by destination:

**Canada & Mexico:** 5-10 business days — Starting at $19.99
      
**Europe:** 7-14 business days — Starting at $24.99
      
**Asia Pacific:** 7-15 business days — Starting at $29.99
      
**Rest of World:** 10-20 business days — Starting at $34.99

**Customs & Duties:** International orders may be subject to import duties, taxes, and fees levied by the destination country. These are the buyer's responsibility and are not included in our shipping charges. We cannot predict or control these charges.`,
    },
    {
      id: 'tracking',
      title: 'ORDER TRACKING',
      icon: MapPin,
      content: `Once your order ships, you'll receive a shipping confirmation email with a tracking number. You can track your package:
      
• Via the link in your shipping confirmation email
• In your NEONVAULT account under Order History
• Directly on the carrier's website (UPS, FedEx, DHL, USPS)

Tracking information typically updates within 24 hours of shipment. If tracking hasn't updated after 48 hours, contact support.`,
    },
    {
      id: 'delivery',
      title: 'DELIVERY & SIGNATURE REQUIREMENTS',
      icon: CheckCircle2,
      content: `**Standard Delivery:** Left at door/mailbox if safe. No signature required.

**Signature Required:** Orders over $500, international shipments, and express/overnight services require adult signature. If no one is available, the carrier will leave a notice and reattempt delivery.

**Delivery Issues:** If your tracking shows delivered but you haven't received it:
1. Check with neighbors/building management
2. Check around the property (porch, garage, side door)
3. Contact the carrier directly with your tracking number
4. If still missing after 48 hours, contact NEONVAULT support`,
    },
    {
      id: 'problems',
      title: 'SHIPPING PROBLEMS',
      icon: AlertCircle,
      content: `**Lost Packages:** We investigate with the carrier. Most are located within 5 business days. If confirmed lost, we'll send a replacement or issue a full refund.

**Damaged in Transit:** Take photos of the damaged package and contents. Contact us within 48 hours with photos for immediate replacement.

**Wrong Address:** If you provided an incorrect address, we cannot reroute after shipment. You'll need to contact the carrier directly. If returned to us, we'll issue a refund minus shipping costs.

**Delayed Shipments:** Weather, carrier delays, or customs holds can cause delays. We'll notify you of any known delays. Contact support if your order hasn't arrived within 5 business days of the estimated delivery date.`,
    },
    {
      id: 'pickup',
      title: 'IN-STORE PICKUP',
      icon: Clock,
      content: `Currently available at our San Francisco flagship location only. Select "Store Pickup" at checkout. You'll receive a notification when your order is ready (typically within 2 hours during business hours). Bring your order confirmation and government-issued ID. Orders held for 7 days.`,
    },
  ];

  return (
    <div className="min-h-screen pt-20 lg:pt-24 pb-20">
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <div className="absolute inset-0 noise-overlay" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div className="mb-16" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-6 mx-auto">
            <Truck className="w-8 h-8" />
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-text leading-tight text-center mb-4">
            SHIPPING INFORMATION
          </h1>
          <p className="text-lg text-text-muted text-center max-w-2xl mx-auto">
            Fast, reliable delivery worldwide. Free standard shipping on orders over $200.
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
          <h3 className="text-xl font-display font-bold text-text mb-3">Still Have Questions?</h3>
          <p className="text-text-muted mb-6 max-w-xl mx-auto">Our support team can help with specific shipping inquiries or delivery issues.</p>
          <a href="/contact" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-bg rounded-xl font-body font-medium hover:bg-accent-dim transition-colors">
            CONTACT SUPPORT
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </motion.div>
      </div>
    </div>
  );
};

export default Shipping;