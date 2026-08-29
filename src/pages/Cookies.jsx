import { motion } from 'framer-motion';
import { Cookie, Shield, Database, Eye, Settings, Globe, CheckCircle2, XCircle, Mail } from 'lucide-react';

const Cookies = () => {
  const cookieCategories = [
    {
      id: 'essential',
      title: 'ESSENTIAL COOKIES',
      icon: Shield,
      required: true,
      desc: 'These cookies are strictly necessary for the website to function properly. They enable core functionality such as security, network management, accessibility, and your shopping cart. You cannot disable these.',
      cookies: [
        { name: 'session_id', purpose: 'Maintains your session across pages', expiry: 'Session' },
        { name: 'cart_items', purpose: 'Stores your shopping cart contents', expiry: '30 days' },
        { name: 'csrf_token', purpose: 'Prevents cross-site request forgery attacks', expiry: 'Session' },
        { name: 'auth_token', purpose: 'Keeps you logged in securely', expiry: '7 days' },
        { name: 'cookie_consent', purpose: 'Remembers your cookie preferences', expiry: '1 year' },
      ],
    },
    {
      id: 'analytics',
      title: 'ANALYTICS COOKIES',
      icon: Database,
      required: false,
      desc: 'These cookies help us understand how visitors interact with our website by collecting anonymous usage data. This information helps us improve the site experience and identify issues.',
      cookies: [
        { name: '_ga', purpose: 'Google Analytics - distinguishes unique users', expiry: '2 years' },
        { name: '_gid', purpose: 'Google Analytics - distinguishes unique users', expiry: '24 hours' },
        { name: '_gat', purpose: 'Google Analytics - throttles request rate', expiry: '1 minute' },
        { name: '_ga_*', purpose: 'Google Analytics 4 - persists session state', expiry: '2 years' },
      ],
    },
    {
      id: 'marketing',
      title: 'MARKETING COOKIES',
      icon: Eye,
      required: false,
      desc: 'These cookies track your browsing habits to display relevant advertisements on other sites. They may be set by us or third-party advertising partners. You can opt out without affecting site functionality.',
      cookies: [
        { name: '_fbp', purpose: 'Facebook Pixel - delivers targeted ads', expiry: '3 months' },
        { name: '_gcl_au', purpose: 'Google Ads - experiments with ad efficiency', expiry: '3 months' },
        { name: 'IDE', purpose: 'DoubleClick - serves personalized ads', expiry: '1 year' },
        { name: 'test_cookie', purpose: 'DoubleClick - checks browser cookie support', expiry: '15 minutes' },
      ],
    },
    {
      id: 'preferences',
      title: 'PREFERENCE COOKIES',
      icon: Settings,
      required: false,
      desc: 'These cookies remember your choices and preferences to provide a more personalized experience. They enable features like currency selection, language, and recently viewed products.',
      cookies: [
        { name: 'currency', purpose: 'Remembers your preferred currency', expiry: '1 year' },
        { name: 'language', purpose: 'Remembers your preferred language', expiry: '1 year' },
        { name: 'recently_viewed', purpose: 'Tracks recently viewed products for recommendations', expiry: '30 days' },
        { name: 'view_mode', purpose: 'Remembers grid/list view preference', expiry: '1 year' },
      ],
    },
  ];

  const thirdParties = [
    { name: 'Google Analytics', purpose: 'Website analytics and performance monitoring', policy: 'https://policies.google.com/privacy' },
    { name: 'Google Ads', purpose: 'Conversion tracking and remarketing', policy: 'https://policies.google.com/technologies/ads' },
    { name: 'Meta (Facebook)', purpose: 'Advertising and audience insights', policy: 'https://www.facebook.com/policy.php' },
    { name: 'Stripe', purpose: 'Payment processing and fraud prevention', policy: 'https://stripe.com/privacy' },
    { name: 'Cloudflare', purpose: 'CDN, security, and performance', policy: 'https://www.cloudflare.com/privacypolicy/' },
  ];

  const rights = [
    'Right to be informed about what cookies we use and why',
    'Right to accept or reject non-essential cookies',
    'Right to withdraw consent at any time',
    'Right to access data collected via cookies',
    'Right to request deletion of cookie data',
    'Right to lodge a complaint with a supervisory authority (EU/UK)',
  ];

  return (
    <div className="min-h-screen pt-20 lg:pt-24 pb-20">
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <div className="absolute inset-0 noise-overlay" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.section className="mb-16" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-6 mx-auto">
            <Cookie className="w-8 h-8" />
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-text leading-tight text-center mb-4">
            COOKIE POLICY
          </h1>
          <p className="text-lg text-text-muted text-center max-w-2xl mx-auto">
            This policy explains how NEONVAULT uses cookies and similar tracking technologies on our website.
          </p>
          <p className="text-sm text-text-subtle text-center mt-4">Last Updated: August 2026</p>
        </motion.section>

        <motion.section className="mb-16" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}>
          <h2 className="text-2xl font-display font-bold text-text text-center mb-8">WHAT ARE COOKIES?</h2>
          <div className="prose prose-invert max-w-none text-text-muted leading-relaxed space-y-4">
            <p>Cookies are small text files stored on your device (computer, tablet, phone) when you visit a website. They help the site remember information about your visit, making your next visit easier and the site more useful to you.</p>
            <p>We use several types of cookies for different purposes. Some are essential for the site to work; others help us improve your experience or show relevant content. You have control over which non-essential cookies you accept.</p>
          </div>
        </motion.section>

        <motion.section className="mb-16" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
          <h2 className="text-2xl font-display font-bold text-text text-center mb-8">COOKIE CATEGORIES</h2>
          <div className="space-y-8">
            {cookieCategories.map((category, catIndex) => (
              <motion.div key={category.id} className="p-6 bg-surface/50 border border-border/50 rounded-2xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + catIndex * 0.05 }}>
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${category.required ? 'bg-accent/10 text-accent' : 'bg-surface border border-border/50 text-text-muted'}`}>
                    <category.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-display font-bold text-text">{category.title}</h3>
                      {category.required && (
                        <span className="px-2 py-1 bg-accent/20 text-accent rounded-full text-xs font-body font-medium">REQUIRED</span>
                      )}
                    </div>
                    <p className="text-text-muted">{category.desc}</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-2 font-body font-medium text-text">Cookie Name</th>
                        <th className="text-left py-2 font-body font-medium text-text">Purpose</th>
                        <th className="text-left py-2 font-body font-medium text-text">Expiry</th>
                      </tr>
                    </thead>
                    <tbody>
                      {category.cookies.map((cookie, cookieIndex) => (
                        <tr key={cookie.name} className="border-b border-border/25">
                          <td className="py-3 font-mono text-text">{cookie.name}</td>
                          <td className="py-3 text-text-muted">{cookie.purpose}</td>
                          <td className="py-3 text-text-muted">{cookie.expiry}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section className="mb-16" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
          <h2 className="text-2xl font-display font-bold text-text text-center mb-8">THIRD-PARTY PROVIDERS</h2>
          <div className="space-y-4">
            {thirdParties.map((provider, index) => (
              <motion.div key={provider.name} className="p-4 bg-surface/50 border border-border/50 rounded-xl flex items-center justify-between" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + index * 0.03 }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-body font-medium text-text">{provider.name}</p>
                    <p className="text-text-muted text-sm">{provider.purpose}</p>
                  </div>
                </div>
                <a href={provider.policy} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-sm font-body font-medium">Privacy Policy →</a>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section className="mb-16" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}>
          <h2 className="text-2xl font-display font-bold text-text text-center mb-8">MANAGING YOUR PREFERENCES</h2>
          <div className="prose prose-invert max-w-none text-text-muted leading-relaxed space-y-4 max-w-2xl mx-auto">
            <p>You can manage your cookie preferences at any time:</p>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Cookie Banner:</strong> Click "Cookie Settings" in the footer or the floating button on any page.</li>
              <li><strong>Browser Settings:</strong> Most browsers allow you to block or delete cookies. See your browser's help section.</li>
              <li><strong>Opt-Out Tools:</strong> Use <a href="https://optout.aboutads.info/" className="text-accent hover:underline" target="_blank" rel="noopener">Digital Advertising Alliance</a> or <a href="https://www.networkadvertising.org/choices/" className="text-accent hover:underline" target="_blank" rel="noopener">Network Advertising Initiative</a> opt-out pages.</li>
            </ul>
            <p>Note: Disabling essential cookies will break core site functionality (cart, login, checkout).</p>
          </div>
        </motion.section>

        <motion.section className="mb-16" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
          <h2 className="text-2xl font-display font-bold text-text text-center mb-8">YOUR RIGHTS</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {rights.map((right, index) => (
              <motion.div key={index} className="flex items-center gap-3 p-4 bg-surface/50 border border-border/50 rounded-xl" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + index * 0.03 }}>
                <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
                <p className="text-text-muted">{right}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section className="text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.5 }}>
          <h2 className="text-2xl font-display font-bold text-text mb-6">CONTACT US</h2>
          <p className="text-text-muted mb-6 max-w-xl mx-auto">
            Questions about this Cookie Policy or your data? Contact our privacy team.
          </p>
          <a href="/contact" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-bg rounded-xl font-body font-medium hover:bg-accent-dim transition-colors">
            CONTACT PRIVACY TEAM
            <Mail className="w-5 h-5" />
          </a>
        </motion.section>
      </div>
    </div>
  );
};

export default Cookies;