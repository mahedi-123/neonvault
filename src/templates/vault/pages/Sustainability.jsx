import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Leaf, Truck, Recycle, Shield, Zap, TreePine, Package, RotateCcw, CheckCircle2, Target, Download } from 'lucide-react';
import { maskReveal } from '../lib/motion';

const Sustainability = () => {
  const pillars = [
    {
      icon: Leaf,
      title: 'Carbon-Neutral Shipping',
      desc: 'All standard shipping is carbon-neutral via verified offsets (reforestation, renewable energy). Express shipping offers carbon-neutral upgrade at checkout. We\'ve offset 2,400+ metric tons CO₂e since 2023.',
      metric: '2,400+ tons CO₂e offset',
    },
    {
      icon: Package,
      title: 'Eco-Friendly Packaging',
      desc: '100% recycled and recyclable packaging. FSC-certified boxes, soy-based inks, compostable mailers for small items. Zero single-use plastic. Packaging engineered for minimal volume.',
      metric: '0% single-use plastic',
    },
    {
      icon: RotateCcw,
      title: 'Circular Economy',
      desc: '2-year warranty extends product life. Free repair program keeps gear in use. Trade-in program (launching 2027) for credit toward upgrades. Refurbished items sold with warranty.',
      metric: '2-year standard warranty',
    },
    {
      icon: Zap,
      title: 'Energy-Efficient Operations',
      desc: 'SF flagship runs on 100% renewable energy (solar + grid offsets). Cloud infrastructure on carbon-neutral providers (AWS/GCP). Office waste diversion rate: 92%.',
      metric: '100% renewable energy',
    },
    {
      icon: TreePine,
      title: 'Responsible Sourcing',
      desc: 'We partner only with brands committed to ethical supply chains. Conflict-free minerals, fair labor audits, RBA compliance. Quarterly supplier sustainability assessments.',
      metric: '100% RBA-compliant brands',
    },
    {
      icon: Recycle,
      title: 'E-Waste Responsibility',
      desc: 'Free recycling for any brand\'s electronics at our SF location. Partner with certified e-Stewards recyclers. 50,000+ lbs diverted from landfill since 2023.',
      metric: '50,000+ lbs recycled',
    },
  ];

  const commitments = [
    { year: '2026', title: 'PLASTIC-FREE PACKAGING', desc: 'Achieved 100% plastic-free outbound packaging across all product lines.', status: 'complete', icon: CheckCircle2 },
    { year: '2026', title: 'CARBON-NEUTRAL SHIPPING', desc: 'All standard shipping carbon-neutral via Gold Standard verified offsets.', status: 'complete', icon: CheckCircle2 },
    { year: '2027', title: 'TRADE-IN PROGRAM LAUNCH', desc: 'Customers receive credit for used NEONVAULT gear. Refurbished resale with warranty.', status: 'in-progress', icon: Target },
    { year: '2027', title: 'SUPPLIER TRANSPARENCY DASHBOARD', desc: 'Public dashboard showing factory audits, carbon data, and labor conditions for all partners.', status: 'planned', icon: Target },
    { year: '2028', title: 'NET-ZERO OPERATIONS', desc: 'Scope 1, 2, and 3 emissions net-zero. Science-based targets validated by SBTi.', status: 'planned', icon: Target },
    { year: '2030', title: 'FULL CIRCULARITY', desc: 'Every product designed for disassembly, repair, and material recovery. Zero waste to landfill.', status: 'planned', icon: Target },
  ];

  const certifications = [
    { name: 'Gold Standard', desc: 'Carbon offset verification', logo: '🏆' },
    { name: 'FSC Certified', desc: 'Responsible forestry', logo: '🌲' },
    { name: 'e-Stewards', desc: 'Ethical e-waste recycling', logo: '♻️' },
    { name: 'RBA Member', desc: 'Responsible Business Alliance', logo: '🤝' },
    { name: '1% for the Planet', desc: 'Annual revenue donation', logo: '🌍' },
    { name: 'Climate Neutral', desc: 'Corporate certification (pending)', logo: '🌱' },
  ];

  return (
    <div className="min-h-screen pt-20 lg:pt-24 pb-20">
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <div className="absolute inset-0 noise-overlay" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.section className="mb-24" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-full text-sm font-body font-medium mb-6">
              <Leaf className="w-4 h-4" /> SUSTAINABILITY
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-text leading-tight mb-6">
              <span className="block overflow-hidden">
                <motion.span variants={maskReveal} initial="hidden" animate="visible" className="block">BETTER TECH, BETTER PLANET</motion.span>
              </span>
            </h1>
            <p className="text-lg text-text-muted leading-relaxed">
              We believe premium technology shouldn't come at the cost of our future. Every decision — from packaging to partnerships — is measured by its long-term impact.
            </p>
          </div>
        </motion.section>

        <motion.section className="mb-24" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ delay: 0.1, duration: 0.5 }}>
          <h2 className="text-3xl font-display font-bold text-text text-center mb-12">OUR SIX PILLARS</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {pillars.map((pillar, index) => (
              <motion.div key={pillar.title} className="p-8 bg-surface/50 border border-border/50 rounded-2xl" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ delay: 0.1 + index * 0.05 }}>
                <div className="flex gap-4">
                  <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
                    <pillar.icon className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-display font-bold text-text">{pillar.title}</h3>
                      <span className="px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-body font-medium">{pillar.metric}</span>
                    </div>
                    <p className="text-text-muted leading-relaxed">{pillar.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section className="mb-24" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ delay: 0.2, duration: 0.5 }}>
          <h2 className="text-3xl font-display font-bold text-text text-center mb-12">OUR ROADMAP</h2>
          <div className="relative max-w-3xl mx-auto">
            <div className="absolute left-8 top-0 bottom-0 w-px bg-border/50" />
            {commitments.map((commitment, index) => (
              <motion.div key={commitment.title} className="relative pl-20 pb-12" initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ delay: 0.1 + index * 0.05 }}>
                <div className={`absolute left-0 top-2 w-16 h-16 rounded-full border-2 flex items-center justify-center z-10 ${
                  commitment.status === 'complete' ? 'bg-accent border-accent' :
                  commitment.status === 'in-progress' ? 'bg-accent/20 border-accent' : 'bg-surface border-border/50'
                }`}>
                  <span className="text-sm font-display font-bold text-bg">
                    {commitment.status === 'complete' ? '✓' : commitment.year.slice(-2)}
                  </span>
                </div>
                <div className="bg-surface/50 border border-border/50 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-body font-medium">{commitment.year}</span>
                    <commitment.icon className="w-5 h-5 text-accent" />
                    <h3 className="text-xl font-display font-bold text-text">{commitment.title}</h3>
                  </div>
                  <p className="text-text-muted">{commitment.desc}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-body font-medium ${
                      commitment.status === 'complete' ? 'bg-green/20 text-green' :
                      commitment.status === 'in-progress' ? 'bg-accent/20 text-accent' : 'bg-surface border border-border/50 text-text-muted'
                    }`}>
                      {commitment.status === 'complete' ? 'COMPLETE' : commitment.status === 'in-progress' ? 'IN PROGRESS' : 'PLANNED'}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section className="mb-24" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ delay: 0.3, duration: 0.5 }}>
          <h2 className="text-3xl font-display font-bold text-text text-center mb-12">CERTIFICATIONS & PARTNERSHIPS</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {certifications.map((cert, index) => (
              <motion.div key={cert.name} className="p-6 bg-surface/50 border border-border/50 rounded-2xl text-center" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ delay: 0.1 + index * 0.05 }}>
                <div className="text-4xl mb-4">{cert.logo}</div>
                <h3 className="text-lg font-display font-bold text-text mb-1">{cert.name}</h3>
                <p className="text-text-muted text-sm">{cert.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section className="text-center" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ delay: 0.4, duration: 0.5 }}>
          <h2 className="text-3xl font-display font-bold text-text mb-6">VIEW OUR IMPACT REPORT</h2>
          <p className="text-lg text-text-muted mb-8 max-w-xl mx-auto">
            Annual transparency report with full metrics, methodology, and third-party verification.
          </p>
          <Link to="/contact" className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-bg rounded-xl font-body font-medium text-lg hover:bg-accent-dim transition-colors">
            DOWNLOAD 2026 REPORT
            <Download className="w-6 h-6" />
          </Link>
        </motion.section>
      </div>
    </div>
  );
};

export default Sustainability;