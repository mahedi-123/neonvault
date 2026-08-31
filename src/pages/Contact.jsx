import { motion } from 'motion/react';
import { Mail, MapPin, Phone, MessageSquare, Loader2, Check } from 'lucide-react';
import { cn } from '../utils/helpers';
import Button from '../components/Button';
import Input from '../components/Input';
import { useState } from 'react';
import { viewportOnce } from '../lib/motion';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [status, setStatus] = useState('idle');
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email address';
    if (!formData.subject.trim()) newErrors.subject = 'Subject is required';
    if (!formData.message.trim()) newErrors.message = 'Message is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setStatus('submitting');
    await new Promise(r => setTimeout(r, 1500));
    setStatus('success');
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const contactInfo = [
    { icon: Mail, title: 'Email Us', detail: 'support@neonvault.com', href: 'mailto:support@neonvault.com' },
    { icon: MapPin, title: 'Visit Us', detail: '123 Innovation Drive, San Francisco, CA 94105', href: null },
    { icon: Phone, title: 'Call Us', detail: '+1 (555) 000-0000', href: 'tel:+15550000000' },
    { icon: MessageSquare, title: 'Live Chat', detail: 'Available Mon-Fri 9AM-6PM PST', href: null },
  ];

  return (
    <div className="min-h-screen pt-20 lg:pt-24 pb-20">
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <div className="absolute inset-0 noise-overlay" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div className="mb-16" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="text-accent font-body font-medium uppercase tracking-wider">GET IN TOUCH</span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-text leading-tight mt-2 mb-4">
            CONTACT NEONVAULT
          </h1>
          <p className="text-lg text-text-muted max-w-2xl">
            Have questions about our products, orders, or partnerships? Our team of tech specialists is here to help.
          </p>
        </motion.div>

        <motion.div className="grid lg:grid-cols-3 gap-8 lg:gap-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}>
          <div className="lg:col-span-1 space-y-8">
            {contactInfo.map((item, index) => (
              <motion.div key={item.title} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + index * 0.1 }} className="p-6 bg-surface/50 border border-border/50 rounded-2xl">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-4">
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="font-display font-semibold text-text mb-2">{item.title}</h3>
                {item.href ? (
                  <a href={item.href} className="text-text-muted hover:text-accent transition-colors">{item.detail}</a>
                ) : (
                  <p className="text-text-muted">{item.detail}</p>
                )}
              </motion.div>
            ))}
          </div>

          <div className="lg:col-span-2">
            <motion.form onSubmit={handleSubmit} className="space-y-6 p-8 bg-surface/50 border border-border/50 rounded-2xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
              <h2 className="text-2xl font-display font-bold text-text mb-6">Send Us a Message</h2>

              <div className="grid sm:grid-cols-2 gap-6">
                <Input
                  label="Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  error={errors.name}
                  placeholder="John Doe"
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  error={errors.email}
                  placeholder="john@example.com"
                  required
                />
              </div>

              <Input
                label="Subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                error={errors.subject}
                placeholder="Order inquiry / Product question / Partnership / Other"
                required
              />

              <div>
                <label className="block text-sm font-body font-medium text-text-muted mb-2">Message</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={6}
                  className={cn(
                    'w-full px-4 py-3 bg-surface border rounded-xl text-text placeholder:text-text-subtle font-body',
                    'focus:outline-none focus:ring-2 focus:ring-accent transition-all',
                    errors.message ? 'border-error' : 'border-border/50'
                  )}
                  placeholder="Tell us how we can help..."
                  required
                  aria-invalid={!!errors.message}
                  aria-describedby={errors.message ? 'message-error' : undefined}
                />
                {errors.message && <p id="message-error" className="mt-1 text-sm text-error" role="alert">{errors.message}</p>}
              </div>

              <div className="flex items-center gap-4">
                <Button type="submit" size="lg" leftIcon={status === 'submitting' ? <Loader2 className="w-5 h-5 animate-spin" /> : status === 'success' ? <Check className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />} loading={status === 'submitting'} disabled={status === 'submitting'}>
                  {status === 'submitting' ? 'SENDING...' : status === 'success' ? 'SENT!' : 'SEND MESSAGE'}
                </Button>
                {status === 'success' && (
                  <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-sm text-accent font-body font-medium">
                    Message sent successfully! We'll get back to you within 24 hours.
                  </motion.span>
                )}
              </div>
            </motion.form>
          </div>
        </motion.div>

        <motion.div className="mt-20" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={viewportOnce} transition={{ duration: 0.5 }}>
          <h2 className="text-2xl font-display font-bold text-text mb-8 text-center">FREQUENTLY ASKED QUESTIONS</h2>
          <div className="max-w-3xl mx-auto space-y-4">
            {[
              { q: 'How long does shipping take?', a: 'Standard shipping takes 3-5 business days. Express shipping (1-2 days) is available at checkout. Free standard shipping on orders over $200.' },
              { q: 'What is your return policy?', a: 'We offer 30-day hassle-free returns. Items must be in original condition with all packaging. Return shipping is free for defective items.' },
              { q: 'Do you offer international shipping?', a: 'Yes, we ship to 50+ countries. Duties and taxes are calculated at checkout. Delivery times vary by region.' },
              { q: 'What warranty do your products have?', a: 'All products come with a 2-year manufacturer warranty. Extended warranty options are available at checkout.' },
              { q: 'How can I track my order?', a: 'Once your order ships, you\'ll receive a tracking number via email. You can also check order status in your account.' },
            ].map((faq, i) => (
              <motion.details key={i} className="group p-6 bg-surface/50 border border-border/50 rounded-xl" initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={viewportOnce} transition={{ delay: Math.min(i, 5) * 0.05 }}>
                <summary className="flex items-center justify-between cursor-pointer list-none text-text font-body font-medium">
                  {faq.q}
                  <svg className="w-5 h-5 text-text-muted group-open:rotate-180 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                </summary>
                <div className="mt-4 text-text-muted leading-relaxed">{faq.a}</div>
              </motion.details>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Contact;