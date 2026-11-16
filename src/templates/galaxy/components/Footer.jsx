import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { MessageSquare, Camera, PlayCircle, MessageCircle, GitBranch, Mail, ArrowRight } from 'lucide-react';
import { cn } from '../utils/helpers';
import { useNewsletter } from '../../../shared/lib/forms.js';

const Footer = () => {
  const newsletter = useNewsletter('footer');
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    Shop: [
      { label: 'All Products', href: '/shop' },
      { label: 'New Drops', href: '/new-drops' },
      { label: 'Best Sellers', href: '/best-sellers' },
      { label: 'Limited Editions', href: '/limited' },
      { label: 'Gift Cards', href: '/gift-cards' },
    ],
    Support: [
      { label: 'Track Order', href: '/track' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'Shipping Info', href: '/shipping' },
      { label: 'Returns & Exchanges', href: '/returns' },
      { label: 'Warranty', href: '/warranty' },
      { label: 'FAQ', href: '/faq' },
    ],
    Company: [
      { label: 'About NEONVAULT', href: '/about' },
      { label: 'Journal', href: '/journal' },
      { label: 'Careers', href: '/careers' },
      { label: 'Press', href: '/press' },
      { label: 'Sustainability', href: '/sustainability' },
    ],
    Legal: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookies' },
      { label: 'Accessibility', href: '/accessibility' },
    ],
  };

  const socialLinks = [
    { icon: MessageSquare, href: 'https://twitter.com', label: 'Twitter' },
    { icon: Camera, href: 'https://instagram.com', label: 'Instagram' },
    { icon: PlayCircle, href: 'https://youtube.com', label: 'YouTube' },
    { icon: MessageCircle, href: 'https://discord.com', label: 'Discord' },
    { icon: GitBranch, href: 'https://github.com', label: 'GitHub' },
  ];

  return (
    <footer className="relative border-t border-border/50" aria-labelledby="footer-heading">
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <div className="absolute inset-0 noise-overlay" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12 mb-16">
          <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Link to="/" className="flex items-center gap-2 text-xl font-display font-bold text-text mb-6">
              <span className="tracking-[0.35em]">NEON<span className="text-accent">VAULT</span></span>
            </Link>
            <p className="text-text-muted mb-6 max-w-xs">
              Premium futuristic technology for those who refuse to compromise. Curated smart gadgets, gaming gear, and lifestyle tech.
            </p>
            <form className="flex gap-2 max-w-xs" aria-label="Newsletter signup" onSubmit={newsletter.onSubmit} noValidate>
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-5 py-3 bg-bg/50 border border-accent/20 rounded-full text-text placeholder:text-text-subtle text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                aria-label="Email address"
              />
              <button type="submit" className="p-3 bg-mint text-bg rounded-full hover:bg-white transition-colors shadow-[0_0_20px_-4px_rgba(138,180,255,0.8)]" aria-label="Subscribe">
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
            <p className={`text-xs mt-3 ${newsletter.status === 'error' ? 'text-error' : newsletter.status === 'done' ? 'text-accent' : 'text-text-subtle'}`} role="status">{newsletter.text || 'No spam. Unsubscribe anytime.'}</p>
          </motion.div>

          {Object.entries(footerLinks).map(([category, links], catIndex) => (
            <motion.nav
              key={category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + catIndex * 0.05, duration: 0.4 }}
              aria-label={category}
            >
              <h3 className="text-sm font-body font-semibold text-text-muted uppercase tracking-wider mb-4">{category}</h3>
              <ul className="space-y-3">
                {links.map((link, linkIndex) => (
                  <motion.li key={link.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + catIndex * 0.05 + linkIndex * 0.03 }}>
                    <Link
                      to={link.href}
                      className="text-sm text-text-muted hover:text-text hover:text-accent transition-colors"
                    >
                      {link.label}
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </motion.nav>
          ))}
        </div>

        {/* giant wordmark — a light follows the pointer through the letters */}
        <div className="-mx-4 mb-12 overflow-hidden sm:-mx-6 lg:-mx-8" aria-hidden="true">
          <div data-spotlight className="nv-wordmark text-center" data-text="NEONVAULT">NEONVAULT</div>
        </div>

        <motion.div
          className="pt-8 border-t border-border/50 flex flex-col lg:flex-row items-center justify-between gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <p className="text-sm text-text-subtle">
            &copy; {currentYear} NEONVAULT. All rights reserved. BUY THE FUTURE.
          </p>

          <div className="flex items-center gap-4">
            {socialLinks.map((social, index) => (
              <motion.a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="tap-safe p-2 rounded-full bg-bg/40 hover:bg-accent/10 border border-accent/15 text-text-muted hover:text-accent hover:border-accent/50 transition-all"
                aria-label={social.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <social.icon className="w-5 h-5" />
              </motion.a>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="mt-8 pt-8 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-subtle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-start">
            <span>Made with precision</span>
            <span className="text-accent">♥</span>
            <span>for the future</span>
          </div>
          <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-end">
            <Link to="/privacy" className="hover:text-text transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-text transition-colors">Terms</Link>
            <Link to="/cookies" className="hover:text-text transition-colors">Cookies</Link>
            <Link to="/accessibility" className="hover:text-text transition-colors">Accessibility</Link>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;