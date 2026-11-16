import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { BookOpen, Calendar, Clock, Tag, ArrowRight, Sparkles, Headphones, Keyboard, MousePointer, Cpu, Zap } from 'lucide-react';
import { formatPrice } from '../utils/helpers';
import { products } from '../data/products';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { maskReveal } from '../lib/motion';

const Journal = () => {
  const articles = [
    {
      slug: 'mechanical-keyboards-guide-2026',
      category: 'GUIDES',
      title: 'The Ultimate Mechanical Keyboard Guide 2026',
      excerpt: 'Switch types, form factors, mounting styles, and our top picks for every budget and use case.',
      author: 'Maya Rodriguez',
      date: '2026-08-15',
      readTime: '12 min read',
      image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e49f?w=800&h=450&fit=crop',
      tags: ['Keyboards', 'Switches', 'Buying Guide'],
      featured: true,
    },
    {
      slug: 'anc-headphones-shootout',
      category: 'REVIEWS',
      title: 'ANC Headphones Shootout: XM5 vs QC Ultra vs Momentum 4',
      excerpt: 'We tested the top three noise-cancelling flagships for 40 hours. Here\'s which one actually wins.',
      author: 'Alex Chen',
      date: '2026-08-10',
      readTime: '8 min read',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=450&fit=crop',
      tags: ['Audio', 'ANC', 'Comparison'],
      featured: false,
    },
    {
      slug: 'ergonomic-mouse-science',
      category: 'DEEP DIVES',
      title: 'The Science of Ergonomic Mice: Vertical vs Trackball vs Traditional',
      excerpt: 'Biomechanics, RSI prevention, and why your wrist angle matters more than you think.',
      author: 'Dr. Sarah Kim',
      date: '2026-08-05',
      readTime: '15 min read',
      image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=800&h=450&fit=crop',
      tags: ['Ergonomics', 'Health', 'Mice'],
      featured: false,
    },
    {
      slug: 'mechanical-switch-deep-dive',
      category: 'GUIDES',
      title: 'Mechanical Switch Deep Dive: Linear, Tactile, Clicky — Which Is Right for You?',
      excerpt: 'Actuation force, travel distance, sound profiles, and our favorite switches in each category.',
      author: 'Maya Rodriguez',
      date: '2026-07-28',
      readTime: '10 min read',
      image: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&h=450&fit=crop',
      tags: ['Keyboards', 'Switches', 'Education'],
      featured: false,
    },
    {
      slug: 'wireless-gaming-latency-test',
      category: 'TESTING',
      title: 'Wireless Gaming Latency Test: 2.4GHz vs Bluetooth vs Wired',
      excerpt: 'We measured click-to-photon latency across 20 mice. The results might surprise you.',
      author: 'James Park',
      date: '2026-07-22',
      readTime: '6 min read',
      image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b7b4f?w=800&h=450&fit=crop',
      tags: ['Gaming', 'Latency', 'Testing'],
      featured: false,
    },
    {
      slug: 'smart-ring-vs-watch',
      category: 'COMPARISONS',
      title: 'Smart Ring vs Smart Watch: Which Wearable Actually Improves Your Health?',
      excerpt: 'Oura Ring Gen 3 vs Apple Watch Ultra 2 vs Whoop 4.0 — 90 days of real-world testing.',
      author: 'Priya Sharma',
      date: '2026-07-15',
      readTime: '11 min read',
      image: 'https://images.unsplash.com/photo-1579586337278-3f43654af0e6?w=800&h=450&fit=crop',
      tags: ['Wearables', 'Health', 'Comparison'],
      featured: false,
    },
    {
      slug: 'desk-setup-essentials-2026',
      category: 'SETUPS',
      title: 'Desk Setup Essentials 2026: Monitor Arms, Cable Management, Lighting',
      excerpt: 'The accessories that transform a desk into a command center. Our editors\' personal picks.',
      author: 'Team NEONVAULT',
      date: '2026-07-08',
      readTime: '9 min read',
      image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&h=450&fit=crop',
      tags: ['Setups', 'Accessories', 'Productivity'],
      featured: false,
    },
    {
      slug: 'mechanical-keyboard-maintenance',
      category: 'HOW-TO',
      title: 'How to Clean and Maintain Your Mechanical Keyboard',
      excerpt: 'Deep cleaning, switch lubing, stabilizer tuning, and keeping your board feeling factory-fresh.',
      author: 'Maya Rodriguez',
      date: '2026-07-01',
      readTime: '7 min read',
      image: 'https://images.unsplash.com/photo-1601445638532-3c6f6c3aa1d2?w=800&h=450&fit=crop',
      tags: ['Keyboards', 'Maintenance', 'DIY'],
      featured: false,
    },
  ];

  const categories = ['All', 'Guides', 'Reviews', 'Deep Dives', 'Testing', 'Comparisons', 'Setups', 'How-To'];

  return (
    <div className="min-h-screen pt-20 lg:pt-24 pb-20">
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <div className="absolute inset-0 noise-overlay" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.section className="mb-16" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-full text-sm font-body font-medium mb-6">
              <BookOpen className="w-4 h-4" /> THE NEONVAULT JOURNAL
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-text leading-tight mb-6">
              <span className="block overflow-hidden">
                <motion.span variants={maskReveal} initial="hidden" animate="visible" className="block">DEEP DIVES, REVIEWS, & GUIDES</motion.span>
              </span>
            </h1>
            <p className="text-lg text-text-muted leading-relaxed">
              Expert analysis, hands-on testing, and buying guides for the tech that matters. Written by engineers, journalists, and enthusiasts.
            </p>
          </div>
        </motion.section>

        <motion.div className="mb-12 flex flex-wrap gap-2" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ delay: 0.1, duration: 0.5 }}>
          {categories.map((cat, i) => (
            <motion.button
              key={cat}
              className={`px-4 py-2 rounded-full text-sm font-body font-medium transition-all ${
                i === 0 ? 'bg-accent text-bg' : 'bg-surface/50 border border-border/50 text-text-muted hover:text-text hover:border-border-hover'
              }`}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: 0.1 + i * 0.03 }}
            >
              {cat}
            </motion.button>
          ))}
        </motion.div>

        <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-8" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ delay: 0.2, duration: 0.5 }}>
          {articles.map((article, index) => (
            <motion.article
              key={article.slug}
              className={`group relative overflow-hidden rounded-2xl bg-surface/50 border border-border/50 ${article.featured ? 'lg:col-span-2' : ''}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: 0.15 + index * 0.05 }}
              whileHover={{ y: -4, boxShadow: '0 20px 60px -20px rgba(0,0,0,0.3)' }}
            >
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={article.image}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bg/90 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <Badge variant="accent" className="mb-2 inline-flex" dot>
                    {article.category}
                  </Badge>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-4 text-xs text-text-muted mb-3">
                  <time dateTime={article.date}>
                    <Calendar className="w-3.5 h-3.5 mr-1" />
                    {new Date(article.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </time>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    {article.readTime}
                  </span>
                </div>
                <h2 className="text-xl lg:text-2xl font-display font-bold text-text mb-2 group-hover:text-accent transition-colors line-clamp-2">
                  {article.title}
                </h2>
                <p className="text-text-muted mb-4 line-clamp-2">{article.excerpt}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent text-sm font-display font-bold">
                      {article.author.charAt(0)}
                    </div>
                    <span className="font-body font-medium text-text-sm">{article.author}</span>
                  </div>
                  <Button variant="ghost" size="sm" leftIcon={<ArrowRight className="w-4 h-4" />}>
                    READ MORE
                  </Button>
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>

        <motion.div className="mt-16 p-8 bg-accent/5 border border-accent/20 rounded-2xl text-center" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ delay: 0.3, duration: 0.5 }}>
          <h3 className="text-xl font-display font-bold text-text mb-3">Want Early Access?</h3>
          <p className="text-text-muted mb-6 max-w-xl mx-auto">Journal subscribers get articles 48 hours early, plus exclusive video content and author AMAs.</p>
          <Link to="/shop?category=all" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-bg rounded-xl font-body font-medium hover:bg-accent-dim transition-colors">
            SUBSCRIBE FREE
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default Journal;