import { motion } from 'framer-motion';
import { Shield, User, Database, Lock, Globe, Mail, Settings } from 'lucide-react';

const sectionIcons = {
  introduction: Shield,
  'information-collect': User,
  'how-we-use': Database,
  'data-sharing': Lock,
  cookies: Settings,
  'data-security': Shield,
  'your-rights': User,
  international: Globe,
  children: User,
  changes: Settings,
  contact: Mail,
};

const Privacy = () => {
  const sections = [
    {
      id: 'introduction',
      title: 'INTRODUCTION',
      content: `Welcome to NEONVAULT. We respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you visit our website, make purchases, or interact with our services. By using NEONVAULT, you agree to the collection and use of information in accordance with this policy.`,
    },
    {
      id: 'information-collect',
      title: 'INFORMATION WE COLLECT',
      content: `We collect several types of information to provide and improve our services:
      
**Personal Data:** Name, email address, shipping/billing addresses, phone number, payment information, and account credentials when you create an account or make a purchase.

**Usage Data:** Information about how you use our website, including IP address, browser type, pages visited, time spent on pages, and referral sources.

**Order Data:** Purchase history, order details, product preferences, and communication records.

**Technical Data:** Cookies, device identifiers, and similar tracking technologies to enhance your experience and analyze site performance.`,
    },
    {
      id: 'how-we-use',
      title: 'HOW WE USE YOUR INFORMATION',
      content: `We use your data for the following purposes:
      
• **Order Processing:** To fulfill and manage your orders, process payments, and arrange shipping.
• **Account Management:** To create and maintain your account, enable login, and provide personalized features.
• **Customer Support:** To respond to inquiries, provide technical support, and resolve issues.
• **Marketing:** With your consent, to send promotional emails, product updates, and exclusive offers.
• **Analytics:** To understand user behavior, improve our website, and optimize product offerings.
• **Security:** To detect and prevent fraud, unauthorized access, and other security threats.
• **Legal Compliance:** To comply with applicable laws, regulations, and legal obligations.`,
    },
    {
      id: 'data-sharing',
      title: 'DATA SHARING & DISCLOSURE',
      content: `We do not sell your personal information. We may share data only in these circumstances:
      
**Service Providers:** Trusted third parties who perform services on our behalf (payment processing, shipping, analytics, email delivery) under strict confidentiality agreements.

**Legal Requirements:** When required by law, court order, or government regulation.

**Business Transfers:** In connection with a merger, acquisition, or sale of assets, with appropriate notice.

**Consent:** With your explicit permission for specific purposes.`,
    },
    {
      id: 'cookies',
      title: 'COOKIES & TRACKING',
      content: `Our website uses cookies and similar technologies to:
      
• **Essential Cookies:** Required for site functionality (session management, cart, secure checkout).
• **Analytics Cookies:** Help us understand how visitors interact with our site (Google Analytics).
• **Marketing Cookies:** Enable personalized advertising and remarketing (with consent).
• **Preference Cookies:** Remember your settings (currency, language, region).

You can manage cookie preferences through your browser settings or our cookie banner. Disabling essential cookies may impair site functionality.`,
    },
    {
      id: 'data-security',
      title: 'DATA SECURITY',
      content: `We implement industry-standard security measures to protect your data:
      
• **Encryption:** TLS 1.3 for data in transit, AES-256 for data at rest.
• **PCI DSS Compliance:** Payment data processed through certified providers (Stripe).
• **Access Controls:** Role-based access, multi-factor authentication for staff.
• **Regular Audits:** Security assessments, penetration testing, and vulnerability scans.
• **Data Retention:** Personal data retained only as long as necessary for stated purposes or legal requirements.`,
    },
    {
      id: 'your-rights',
      title: 'YOUR RIGHTS',
      content: `Depending on your jurisdiction, you may have the right to:
      
• **Access:** Request a copy of your personal data.
• **Rectification:** Correct inaccurate or incomplete data.
• **Erasure:** Request deletion of your data (subject to legal obligations).
• **Restriction:** Limit processing of your data.
• **Portability:** Receive your data in a structured, commonly used format.
• **Objection:** Object to processing for marketing or legitimate interests.
• **Withdraw Consent:** Withdraw consent for marketing communications at any time.

To exercise these rights, contact us at privacy@neonvault.com. We respond within 30 days.`,
    },
    {
      id: 'international',
      title: 'INTERNATIONAL TRANSFERS',
      content: `Your data may be transferred to and processed in countries other than your own (including the United States). We ensure appropriate safeguards (Standard Contractual Clauses, adequacy decisions) for such transfers in compliance with GDPR and other applicable laws.`,
    },
    {
      id: 'children',
      title: 'CHILDREN\'S PRIVACY',
      content: `Our services are not directed to individuals under 16. We do not knowingly collect personal data from children. If you believe we have collected data from a minor, contact us immediately for deletion.`,
    },
    {
      id: 'changes',
      title: 'CHANGES TO THIS POLICY',
      content: `We may update this Privacy Policy periodically. Material changes will be communicated via email or prominent site notice. The "Last Updated" date at the top indicates the latest revision. Continued use after changes constitutes acceptance.`,
    },
    {
      id: 'contact',
      title: 'CONTACT US',
      content: `For privacy inquiries, data requests, or concerns:
      
**Email:** privacy@neonvault.com  
**Address:** NEONVAULT Privacy Team, 123 Innovation Drive, San Francisco, CA 94105  
**Phone:** +1 (555) 000-0000

Our Data Protection Officer can be reached at dpo@neonvault.com.`,
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
            PRIVACY POLICY
          </h1>
          <p className="text-lg text-text-muted text-center max-w-2xl mx-auto">
            Your privacy matters. This policy explains how we collect, use, and protect your personal information.
          </p>
          <p className="text-sm text-text-subtle text-center mt-4">Last Updated: August 2026</p>
        </motion.div>

        <motion.div className="space-y-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}>
          {sections.map((section, index) => {
            const Icon = sectionIcons[section.id] || Shield;
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

        <motion.div className="mt-16 p-8 bg-accent/5 border border-accent/20 rounded-2xl text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
          <h3 className="text-xl font-display font-bold text-text mb-3">Questions About Your Data?</h3>
          <p className="text-text-muted mb-6 max-w-xl mx-auto">We're transparent about our practices. Reach out to our privacy team for any concerns or requests.</p>
          <a href="/contact" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-bg rounded-xl font-body font-medium hover:bg-accent-dim transition-colors">
            CONTACT PRIVACY TEAM
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </motion.div>
      </div>
    </div>
  );
};

export default Privacy;