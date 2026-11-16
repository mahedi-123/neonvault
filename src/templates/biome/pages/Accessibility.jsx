import { motion } from 'motion/react';
import { Accessibility as AccessibilityIcon, Eye, Keyboard, Volume2, Brain, CheckCircle2, Target, Shield, Sparkles, MousePointer, Monitor, Smartphone, Mail } from 'lucide-react';

const Accessibility = () => {
  const standards = [
    { name: 'WCAG 2.1 Level AA', desc: 'Full conformance with Web Content Accessibility Guidelines 2.1 AA standard', status: 'complete' },
    { name: 'Section 508', desc: 'U.S. federal accessibility compliance for electronic and information technology', status: 'complete' },
    { name: 'EN 301 549', desc: 'European accessibility standard for ICT products and services', status: 'complete' },
    { name: 'ADA Title III', desc: 'Americans with Disabilities Act public accommodation requirements', status: 'complete' },
  ];

  const features = [
    {
      category: 'Visual',
      icon: Eye,
      items: [
        'High contrast mode (4.5:1 minimum ratio for text, 3:1 for UI elements)',
        'Scalable text up to 200% without loss of content or function',
        'No information conveyed by color alone — icons, patterns, and labels supplement',
        'Focus indicators visible on all interactive elements (3px accent outline)',
        'Reduced motion option disables non-essential animations',
        'Dark/light mode with system preference detection',
      ],
    },
    {
      category: 'Keyboard & Motor',
      icon: Keyboard,
      items: [
        'Full keyboard navigation — all functionality accessible via Tab, Enter, Space, Arrow keys',
        'Logical tab order following visual layout',
        'Skip to main content link at top of every page',
        'Focus trapping in modals, drawers, and overlays',
        'No keyboard traps — focus can always move away',
        'Configurable timeout extensions for timed interactions',
      ],
    },
    {
      category: 'Screen Reader',
      icon: Brain,
      items: [
        'Semantic HTML5 landmarks (header, nav, main, aside, footer)',
        'ARIA labels, roles, and properties on all custom components',
        'Live regions for dynamic content (cart updates, toasts, search results)',
        'Descriptive alt text for all meaningful images',
        'Form labels properly associated with inputs',
        'Heading hierarchy (h1-h6) maintained throughout',
      ],
    },
    {
      category: 'Audio & Cognitive',
      icon: Volume2,
      items: [
        'No auto-playing audio or video',
        'Captions/transcripts for all video content',
        'Clear, consistent navigation and layout',
        'Error messages with specific, actionable guidance',
        'Form validation with inline, announced errors',
        'Simple language — Flesch-Kincaid Grade 9 or lower',
      ],
    },
  ];

  const testing = [
    { tool: 'axe-core', type: 'Automated', desc: 'Integrated in CI/CD pipeline. Runs on every PR. Zero violations required to merge.' },
    { tool: 'Lighthouse', type: 'Automated', desc: 'Accessibility score 100/100 on all pages. Part of deployment gate.' },
    { tool: 'NVDA', type: 'Manual', desc: 'Tested on Windows with Firefox/Chrome. Full user journeys verified quarterly.' },
    { tool: 'VoiceOver', type: 'Manual', desc: 'Tested on macOS Safari and iOS Safari. Mobile gestures and rotor navigation verified.' },
    { tool: 'JAWS', type: 'Manual', desc: 'Tested on Windows with Chrome/Edge. Enterprise screen reader compatibility.' },
    { tool: 'Dragon NaturallySpeaking', type: 'Manual', desc: 'Voice control navigation tested. All commands and dictation functional.' },
    { tool: 'Keyboard Only', type: 'Manual', desc: 'Every page fully navigable without mouse. Tab order, focus states, and shortcuts tested.' },
    { tool: 'ZoomText', type: 'Manual', desc: '200% and 400% magnification tested. No content clipping or loss of function.' },
  ];

  const shortcuts = [
    { keys: 'Tab', action: 'Move to next focusable element' },
    { keys: 'Shift + Tab', action: 'Move to previous focusable element' },
    { keys: 'Enter / Space', action: 'Activate buttons, links, checkboxes' },
    { keys: 'Arrow Keys', action: 'Navigate menus, tabs, carousels, sliders' },
    { keys: 'Escape', action: 'Close modals, drawers, overlays, dropdowns' },
    { keys: 'Home / End', action: 'Jump to first/last item in lists' },
    { keys: '⌘/ + K', action: 'Open command palette (global search)' },
    { keys: '⌘/ + /', action: 'Open search overlay' },
    { keys: 'S', action: 'Skip to main content (when focused on skip link)' },
  ];

  return (
    <div className="min-h-screen pt-20 lg:pt-24 pb-20">
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <div className="absolute inset-0 noise-overlay" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.section className="mb-24" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="text-center max-w-3xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-6 mx-auto">
              <AccessibilityIcon className="w-8 h-8" />
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-text leading-tight mb-4">
              ACCESSIBILITY STATEMENT
            </h1>
            <p className="text-lg text-text-muted leading-relaxed">
              NEONVAULT is committed to making our digital experience accessible to everyone. We continuously improve to meet and exceed global standards.
            </p>
            <p className="text-sm text-text-subtle text-center mt-4">Last Updated: August 2026 | Conformance: WCAG 2.1 AA</p>
          </div>
        </motion.section>

        <motion.section className="mb-24" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}>
          <h2 className="text-3xl font-display font-bold text-text text-center mb-12">COMPLIANCE STANDARDS</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {standards.map((standard, index) => (
              <motion.div key={standard.name} className="p-6 bg-surface/50 border border-border/50 rounded-2xl flex items-start gap-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + index * 0.05 }}>
                <CheckCircle2 className="w-8 h-8 text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-display font-bold text-text mb-1">{standard.name}</h3>
                  <p className="text-text-muted">{standard.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section className="mb-24" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
          <h2 className="text-3xl font-display font-bold text-text text-center mb-12">ACCESSIBILITY FEATURES</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <motion.div key={feature.category} className="p-6 bg-surface/50 border border-border/50 rounded-2xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + index * 0.05 }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-text">{feature.category}</h3>
                </div>
                <ul className="space-y-3">
                  {feature.items.map((item, itemIndex) => (
                    <motion.li key={itemIndex} className="flex items-start gap-3 text-text-muted" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + index * 0.05 + itemIndex * 0.03 }}>
                      <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section className="mb-24" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
          <h2 className="text-3xl font-display font-bold text-text text-center mb-12">KEYBOARD SHORTCUTS</h2>
          <div className="max-w-3xl mx-auto">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 px-4 font-body font-medium text-text">Shortcut</th>
                    <th className="text-left py-3 px-4 font-body font-medium text-text">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {shortcuts.map((shortcut, index) => (
                    <tr key={index} className="border-b border-border/25">
                      <td className="py-3 px-4">
                        <kbd className="px-3 py-1.5 bg-surface border border-border/50 rounded-lg text-sm text-text font-mono">{shortcut.keys}</kbd>
                      </td>
                      <td className="py-3 px-4 text-text-muted">{shortcut.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.section>

        <motion.section className="mb-24" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}>
          <h2 className="text-3xl font-display font-bold text-text text-center mb-12">TESTING METHODOLOGY</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testing.map((test, index) => (
              <motion.div key={test.tool} className="p-6 bg-surface/50 border border-border/50 rounded-2xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + index * 0.05 }}>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-body font-medium ${test.type === 'Automated' ? 'bg-accent/10 text-accent' : 'bg-surface border border-border/50 text-text-muted'}`}>
                    {test.type}
                  </span>
                  <h3 className="font-display font-bold text-text">{test.tool}</h3>
                </div>
                <p className="text-text-muted">{test.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section className="mb-24" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
          <h2 className="text-3xl font-display font-bold text-text text-center mb-12">ONGOING COMMITMENT</h2>
          <div className="max-w-3xl mx-auto space-y-6">
            {[
              'Accessibility reviews integrated into design and development workflow',
              'Quarterly audits with external accessibility consultants',
              'User testing with people with disabilities (recruiting ongoing)',
              'Accessibility training for all engineers, designers, and content creators',
              'Public accessibility roadmap with quarterly milestones',
              'Feedback channel: accessibility@neonvault.com — responses within 5 business days',
            ].map((item, index) => (
              <motion.div key={index} className="flex items-start gap-4 p-6 bg-surface/50 border border-border/50 rounded-2xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + index * 0.05 }}>
                <Target className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                <p className="text-text-muted">{item}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section className="text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.5 }}>
          <h2 className="text-2xl font-display font-bold text-text mb-6">REPORT AN ISSUE</h2>
          <p className="text-text-muted mb-6 max-w-xl mx-auto">
            Encountered an accessibility barrier? We take every report seriously and prioritize fixes.
          </p>
          <a href="mailto:accessibility@neonvault.com" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-bg rounded-xl font-body font-medium hover:bg-accent-dim transition-colors">
            EMAIL ACCESSIBILITY TEAM
            <Mail className="w-5 h-5" />
          </a>
        </motion.section>
      </div>
    </div>
  );
};

export default Accessibility;