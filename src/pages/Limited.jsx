import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Zap, Shield, Clock, Crown, Sparkles, AlertCircle } from 'lucide-react';
import { getLimitedProducts } from '../data/products';
import ProductGrid from '../components/ProductGrid';
import Badge from '../components/Badge';

const Limited = () => {
  const limitedProducts = getLimitedProducts();

  return (
    <div className="min-h-screen pt-20 lg:pt-24 pb-20">
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <div className="absolute inset-0 noise-overlay" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.section className="mb-16" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <Badge variant="warning" className="mb-4 inline-flex" dot>
                <Zap className="w-3 h-3 mr-1" /> LIMITED EDITION
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-text leading-tight mb-4">
                LIMITED EDITIONS
              </h1>
              <p className="text-lg text-text-muted max-w-2xl">
                Exclusive runs, numbered editions, and collaborations. Once they're gone, they're gone forever.
              </p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="flex flex-wrap gap-3">
                <div className="p-4 bg-surface/50 border border-border/50 rounded-xl">
                  <p className="text-2xl font-display font-bold text-accent">{limitedProducts.length}</p>
                  <p className="text-xs text-text-muted">Active Editions</p>
                </div>
                <div className="p-4 bg-surface/50 border border-border/50 rounded-xl">
                  <p className="text-2xl font-display font-bold text-text">24-72h</p>
                  <p className="text-xs text-text-muted">Typical Sellout</p>
                </div>
                <div className="p-4 bg-surface/50 border border-border/50 rounded-xl">
                  <p className="text-2xl font-display font-bold text-text">#1-500</p>
                  <p className="text-xs text-text-muted">Numbered Units</p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.section>

        <motion.section className="mb-16" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}>
          <h2 className="text-3xl font-display font-bold text-text text-center mb-12">WHAT MAKES IT LIMITED</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { icon: Crown, title: 'Numbered Editions', desc: 'Every unit individually numbered (#001-500). Certificate of authenticity included.' },
              { icon: Sparkles, title: 'Exclusive Colorways', desc: 'Colors and finishes not available in standard production runs.' },
              { icon: Shield, title: 'Lifetime Warranty', desc: 'Extended lifetime warranty on all limited editions. Priority repair queue.' },
              { icon: Zap, title: 'Early Access', desc: 'Vault members get 24-hour early access before public release.' },
              { icon: AlertCircle, title: 'No Restocks', desc: 'Once sold out, never reproduced. True scarcity guaranteed.' },
              { icon: Clock, title: 'Timed Drops', desc: 'Scheduled releases with countdown. Fair access for all time zones.' },
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

        <motion.section className="mb-16" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
          <div className="p-8 bg-accent/5 border border-accent/20 rounded-2xl text-center">
            <h2 className="text-2xl font-display font-bold text-text mb-4">NEVER MISS A DROP</h2>
            <p className="text-text-muted mb-6 max-w-xl mx-auto">Join the Vault for 24-hour early access, drop notifications, and members-only editions.</p>
            <Link to="/shop?category=all" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-bg rounded-xl font-body font-medium hover:bg-accent-dim transition-colors">
              JOIN THE VAULT
              <Sparkles className="w-5 h-5" />
            </Link>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
          <h2 className="text-3xl font-display font-bold text-text text-center mb-8">CURRENT EDITIONS</h2>
          <ProductGrid initialProducts={limitedProducts} />
        </motion.section>
      </div>
    </div>
  );
};

export default Limited;