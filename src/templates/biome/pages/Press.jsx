import { motion } from 'motion/react';
import { Camera, Newspaper, Download, Mail, Sparkles, Award, Globe, Users, Clock, CheckCircle2 } from 'lucide-react';
import Button from '../components/Button';
import { maskReveal } from '../lib/motion';

const Press = () => {
  const pressKit = [
    { title: 'Logos & Brand Assets', desc: 'Primary, secondary, and monochrome logos in SVG/PNG. Brand guidelines included.', icon: Sparkles },
    { title: 'Product Photography', desc: 'High-res lifestyle and studio shots for all current products. Updated monthly.', icon: Camera },
    { title: 'Founder Bios & Headshots', desc: 'Leadership team bios, high-res headshots, and background information.', icon: Users },
    { title: 'Company Fact Sheet', desc: 'Key metrics, milestones, investor info, and market positioning.', icon: Globe },
    { title: 'Press Releases Archive', desc: 'All official announcements, product launches, and partnership news.', icon: Newspaper },
  ];

  const coverage = [
    {
      outlet: 'The Verge',
      date: '2026-07-15',
      title: 'NEONVAULT\'s Curated Approach Is What Tech Retail Needs',
      url: '#',
      quote: '"Finally, a retailer that respects my time and intelligence. Every product earns its place."',
    },
    {
      outlet: 'TechCrunch',
      date: '2026-06-22',
      title: 'How NEONVAULT Built a $50M Business Without Ads',
      url: '#',
      quote: '"Their community-first model proves you don\'t need growth hacks when you have genuine curation."',
    },
    {
      outlet: 'Wired',
      date: '2026-05-10',
      title: 'The Best Mechanical Keyboards of 2026, According to NEONVAULT',
      url: '#',
      quote: '"Their switch guide is the most comprehensive we\'ve seen. A masterclass in technical accessibility."',
    },
    {
      outlet: 'Engadget',
      date: '2026-04-05',
      title: 'NEONVAULT Care+ Redefines Extended Warranties',
      url: '#',
      quote: '"Actually covers what matters — accidental damage, battery replacement, loaner devices."',
    },
    {
      outlet: 'PC Gamer',
      date: '2026-03-18',
      title: 'Wireless Gaming Latency: NEONVAULT\'s Testing Lab Sets New Standard',
      url: '#',
      quote: '"Their methodology is rigorous. 20 mice, click-to-photon measurement, published data."',
    },
    {
      outlet: 'CNET',
      date: '2026-02-28',
      title: 'Smart Ring vs Watch: 90 Days of Real-World Testing',
      url: '#',
      quote: '"Rare to see a retailer invest this deeply in independent, long-form testing."',
    },
  ];

  const assets = [
    { name: 'Primary Logo (SVG)', size: '12 KB', format: 'SVG' },
    { name: 'Primary Logo (PNG, 4K)', size: '2.4 MB', format: 'PNG' },
    { name: 'Logomark Only (SVG)', size: '8 KB', format: 'SVG' },
    { name: 'Brand Guidelines (PDF)', size: '1.8 MB', format: 'PDF' },
    { name: 'Color Palette (ASE)', size: '4 KB', format: 'ASE' },
    { name: 'Typography Specs (PDF)', size: '600 KB', format: 'PDF' },
    { name: 'Product Hero Shots (ZIP)', size: '850 MB', format: 'ZIP' },
    { name: 'Lifestyle Photography (ZIP)', size: '1.2 GB', format: 'ZIP' },
    { name: 'Founder Headshots (ZIP)', size: '45 MB', format: 'ZIP' },
    { name: 'Fact Sheet (PDF)', size: '320 KB', format: 'PDF' },
  ];

  return (
    <div className="min-h-screen pt-20 lg:pt-24 pb-20">
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <div className="absolute inset-0 noise-overlay" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.section className="mb-24" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-full text-sm font-body font-medium mb-6">
              <Newspaper className="w-4 h-4" /> PRESS KIT
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-text leading-tight mb-6">
              <span className="block overflow-hidden">
                <motion.span variants={maskReveal} initial="hidden" animate="visible" className="block">PRESS & MEDIA RESOURCES</motion.span>
              </span>
            </h1>
            <p className="text-lg text-text-muted leading-relaxed">
              Everything you need to cover NEONVAULT. Assets, fact sheets, and direct contact for inquiries.
            </p>
          </div>
        </motion.section>

        <motion.section className="mb-24" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ delay: 0.1, duration: 0.5 }}>
          <h2 className="text-3xl font-display font-bold text-text text-center mb-12">PRESS KIT CONTENTS</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {pressKit.map((item, index) => (
              <motion.div key={item.title} className="p-6 bg-surface/50 border border-border/50 rounded-2xl" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ delay: 0.1 + index * 0.05 }}>
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-4">
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-display font-bold text-text mb-2">{item.title}</h3>
                <p className="text-text-muted">{item.desc}</p>
                <Button variant="ghost" size="sm" className="mt-4" leftIcon={<Download className="w-4 h-4" />}>
                  DOWNLOAD
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section className="mb-24" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ delay: 0.2, duration: 0.5 }}>
          <h2 className="text-3xl font-display font-bold text-text text-center mb-12">RECENT COVERAGE</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {coverage.map((item, index) => (
              <motion.article key={item.title} className="p-6 bg-surface/50 border border-border/50 rounded-2xl" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ delay: 0.1 + index * 0.05 }}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-body font-medium">{item.outlet}</span>
                  <time className="text-text-muted text-sm">{new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</time>
                </div>
                <h3 className="text-lg font-display font-bold text-text mb-2">{item.title}</h3>
                <p className="text-text-muted mb-4 italic">"{item.quote}"</p>
                <a href={item.url} className="text-accent hover:underline text-sm font-body font-medium">Read Article →</a>
              </motion.article>
            ))}
          </div>
        </motion.section>

        <motion.section className="mb-24" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ delay: 0.3, duration: 0.5 }}>
          <h2 className="text-3xl font-display font-bold text-text text-center mb-12">BRAND ASSETS QUICK DOWNLOAD</h2>
          <div className="max-w-3xl mx-auto">
            <div className="space-y-3">
              {assets.map((asset, index) => (
                <motion.div key={asset.name} className="flex items-center justify-between p-4 bg-surface/50 border border-border/50 rounded-xl" initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ delay: 0.1 + index * 0.03 }}>
                  <div className="flex items-center gap-4">
                    <span className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                      {asset.format === 'SVG' ? <Sparkles className="w-5 h-5" /> : asset.format === 'PDF' ? <Newspaper className="w-5 h-5" /> : asset.format === 'ZIP' ? <Download className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
                    </span>
                    <div>
                      <p className="font-body font-medium text-text">{asset.name}</p>
                      <p className="text-xs text-text-muted">{asset.size} • {asset.format}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" leftIcon={<Download className="w-4 h-4" />}>DOWNLOAD</Button>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section className="text-center" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ delay: 0.4, duration: 0.5 }}>
          <h2 className="text-3xl font-display font-bold text-text mb-6">MEDIA INQUIRIES</h2>
          <p className="text-lg text-text-muted mb-8 max-w-xl mx-auto">
            For interview requests, product samples, event invites, or partnership proposals.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="mailto:press@neonvault.com" className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-bg rounded-xl font-body font-medium text-lg hover:bg-accent-dim transition-colors">
              EMAIL PRESS TEAM
              <Mail className="w-6 h-6" />
            </a>
            <a href="mailto:partnerships@neonvault.com" className="inline-flex items-center gap-2 px-8 py-4 bg-surface border border-border/50 text-text rounded-xl font-body font-medium text-lg hover:bg-surface-hover hover:border-border-hover transition-colors">
              PARTNERSHIPS
              <Users className="w-6 h-6" />
            </a>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default Press;