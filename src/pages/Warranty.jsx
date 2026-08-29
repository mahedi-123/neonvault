import { motion } from 'framer-motion';
import { Shield, RotateCcw, Wrench, Clock, CheckCircle2, AlertCircle, Mail, Headphones, Keyboard, MousePointer, Cpu, Globe } from 'lucide-react';

const Warranty = () => {
  const sections = [
    {
      id: 'coverage',
      title: 'STANDARD 2-YEAR WARRANTY',
      icon: Shield,
      content: `Every NEONVAULT product includes a **2-year manufacturer warranty** from the date of delivery, covering defects in materials and workmanship under normal use.

**What's Covered:**
• Manufacturing defects (component failure, soldering issues, firmware bugs)
• Premature battery degradation (< 80% capacity within 2 years)
• Display defects (dead pixels, backlight bleeding, color accuracy)
• Connectivity issues (Bluetooth, Wi-Fi, wired) not caused by external factors
• Mechanical failures (buttons, switches, hinges, ports)

**What's Not Covered:**
• Accidental damage (drops, spills, crushing)
• Cosmetic wear (scratches, scuffs, discoloration from normal use)
• Damage from unauthorized repairs or modifications
• Use with incompatible voltage, accessories, or software
• Normal battery wear beyond 80% capacity threshold
• Loss or theft`,
    },
    {
      id: 'claims',
      title: 'HOW TO FILE A CLAIM',
      icon: Wrench,
      content: `**Online (Fastest):** Visit warranty.neonvault.com with your order number. Upload photos/video of the issue. Most claims approved within 24 hours.

**Email:** warranty@neonvault.com with order number, issue description, and photos.

**Phone:** +1 (555) 000-0000, option 3 for warranty support (Mon-Fri 9AM-6PM PST).

**Required Information:**
1. Order number or proof of purchase
2. Product serial number (on box or device)
3. Clear description of the issue
4. Photos/video demonstrating the defect
5. Troubleshooting steps already attempted`,
    },
    {
      id: 'resolution',
      title: 'CLAIM RESOLUTION OPTIONS',
      icon: CheckCircle2,
      content: `Once approved, we offer:
      
**Repair:** Free repair at our authorized service center. Shipping both ways covered. Typical turnaround: 7-14 business days.

**Replacement:** New or refurbished equivalent unit shipped immediately. Prepaid return label for defective unit. No charge.

**Refund:** Full purchase price refunded if repair/replacement not feasible (discontinued products). Original payment method.

**Advanced Replacement:** For critical devices (headphones, keyboards, mice), we can ship a replacement before receiving the defective unit. Requires temporary authorization hold on your card.`,
    },
    {
      id: 'categories',
      title: 'CATEGORY-SPECIFIC COVERAGE',
      icon: Cpu,
      content: `**Audio (Headphones, Earbuds, Speakers):**
• Drivers, ANC circuitry, Bluetooth modules: 2 years
• Ear cushions, cables, tips: 90 days (wear items)
• Battery (wireless): 2 years or 300 cycles to 80% capacity

**Keyboards & Mice:**
• Switches (mechanical/optical): 2 years or 50M actuations
• PCB, controller, lighting: 2 years
• Keycaps, feet, cables: 90 days (wear items)
• Battery (wireless): 2 years or 300 cycles

**Wearables (Rings, Watches, Bands):**
• Sensors, display, haptics: 2 years
• Battery: 2 years to 80% capacity
• Bands/straps: 90 days (wear items)
• Water resistance seals: 1 year (test annually)

**Smart Home & Accessories:**
• Hubs, controllers, sensors: 2 years
• Power adapters, cables: 1 year
• Mounts, stands: Lifetime (structural only)`,
    },
    {
      id: 'extended',
      title: 'EXTENDED WARRANTY (NEONVAULT CARE+)',
      icon: Shield,
      content: `**Optional 3-Year Extension:** Available at checkout for $29-79 depending on product.

**Additional Benefits:**
• Accidental damage protection (2 claims, $49 service fee each)
• Battery replacement guarantee (1 free replacement in years 3-4)
• Priority support line (dedicated queue)
• Free express shipping for warranty claims
• Loaner device during repair (select categories)

**Purchase Window:** Can be added within 30 days of purchase via your account.`,
    },
    {
      id: 'international',
      title: 'INTERNATIONAL WARRANTY',
      icon: Globe,
      content: `Warranty is valid worldwide where NEONVAULT officially operates. For other countries:
      
• Contact local authorized distributor for service
• Or ship to our US service center (customer pays shipping both ways)
• Proof of purchase from authorized retailer required
• Regional laws may provide additional consumer protections`,
    },
    {
      id: 'exclusions',
      title: 'COMMON EXCLUSIONS',
      icon: AlertCircle,
      content: `• Damage from liquids, extreme temperatures, fire, natural disasters
• Unauthorized disassembly, repair, or firmware modification
• Use with non-certified chargers, cables, or accessories
• Software issues from beta/unsupported OS versions
• Consumable degradation beyond stated thresholds
• Products purchased from unauthorized resellers (gray market)
• Commercial/industrial use beyond rated specifications`,
    },
  ];

  return (
    <div className="min-h-screen pt-20 lg:pt-24 pb-20">
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <div className="absolute inset-0 noise-overlay" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div className="mb-16" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-6 mx-auto">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-text leading-tight text-center mb-4">
            WARRANTY
          </h1>
          <p className="text-lg text-text-muted text-center max-w-2xl mx-auto">
            2-year manufacturer warranty on all products. Optional Care+ for accidental damage protection.
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
          <h3 className="text-xl font-display font-bold text-text mb-3">File a Warranty Claim</h3>
          <p className="text-text-muted mb-6 max-w-xl mx-auto">Fast, free, and hassle-free. Most claims resolved in 24 hours.</p>
          <a href="/contact" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-bg rounded-xl font-body font-medium hover:bg-accent-dim transition-colors">
            START A CLAIM
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </motion.div>
      </div>
    </div>
  );
};

export default Warranty;