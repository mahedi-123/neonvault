import { motion } from 'framer-motion';
import { Briefcase, Users, Heart, Zap, Coffee, BookOpen, Plane, Shield, CheckCircle2, Sparkles } from 'lucide-react';

const Careers = () => {
  const benefits = [
    { icon: Heart, title: 'Health & Wellness', desc: 'Medical, dental, vision, mental health stipend, gym membership, and annual wellness retreat.' },
    { icon: Zap, title: 'Flexible Work', desc: 'Remote-first with SF flagship access. Core hours 10AM-3PM PST. Unlimited PTO with 2-week minimum.' },
    { icon: BookOpen, title: 'Learning Budget', desc: '$3,000/year for courses, conferences, certifications, books, and equipment.' },
    { icon: Coffee, title: 'Gear Allowance', desc: '$2,000 new hire setup + $1,000/year for personal tech. NEONVAULT products free for you and family.' },
    { icon: Plane, title: 'Travel & Offsites', desc: 'Annual company retreat (international), quarterly team offsites, and conference travel covered.' },
    { icon: Shield, title: 'Equity & 401k', desc: 'Competitive equity grants, 4% 401k match, and annual refresh grants for top performers.' },
  ];

  const openRoles = [
    {
      dept: 'Engineering',
      roles: [
        { title: 'Senior Frontend Engineer (React/TypeScript)', location: 'San Francisco / Remote (US)', type: 'Full-time' },
        { title: 'Backend Engineer (Node.js/PostgreSQL)', location: 'San Francisco / Remote (US)', type: 'Full-time' },
        { title: 'DevOps/Platform Engineer', location: 'San Francisco / Remote (US)', type: 'Full-time' },
        { title: 'Mobile Engineer (React Native)', location: 'Remote (US)', type: 'Full-time' },
      ],
    },
    {
      dept: 'Product & Design',
      roles: [
        { title: 'Product Designer', location: 'San Francisco / Remote (US)', type: 'Full-time' },
        { title: 'UX Researcher', location: 'Remote (US)', type: 'Full-time' },
        { title: 'Product Manager (Growth)', location: 'San Francisco', type: 'Full-time' },
      ],
    },
    {
      dept: 'Curation & Commerce',
      roles: [
        { title: 'Technical Product Curator', location: 'San Francisco', type: 'Full-time' },
        { title: 'Merchandising Analyst', location: 'San Francisco / Remote (US)', type: 'Full-time' },
        { title: 'Brand Partnerships Manager', location: 'San Francisco', type: 'Full-time' },
      ],
    },
    {
      dept: 'Operations',
      roles: [
        { title: 'Customer Experience Lead', location: 'San Francisco', type: 'Full-time' },
        { title: 'Logistics Coordinator', location: 'San Francisco', type: 'Full-time' },
        { title: 'People Operations Generalist', location: 'San Francisco', type: 'Full-time' },
      ],
    },
  ];

  const values = [
    'Curiosity over credentials — we hire for potential and passion',
    'Build in public — share work early, iterate fast, learn together',
    'User obsession — every decision starts with the community',
    'No ego — best idea wins, regardless of title or tenure',
    'Sustainable pace — marathon, not sprint. Rest is productive.',
  ];

  return (
    <div className="min-h-screen pt-20 lg:pt-24 pb-20">
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <div className="absolute inset-0 noise-overlay" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.section className="mb-24" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-full text-sm font-body font-medium mb-6">
              <Briefcase className="w-4 h-4" /> CAREERS AT NEONVAULT
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-text leading-tight mb-6">
              BUILD THE FUTURE WITH US
            </h1>
            <p className="text-lg text-text-muted leading-relaxed">
              We're a small, passionate team curating the best technology on the planet. Join us in shaping how people discover and experience the future.
            </p>
          </div>
        </motion.section>

        <motion.section className="mb-24" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}>
          <h2 className="text-3xl font-display font-bold text-text text-center mb-12">OUR VALUES</h2>
          <div className="max-w-3xl mx-auto space-y-4">
            {values.map((value, index) => (
              <motion.div key={index} className="flex items-start gap-4 p-6 bg-surface/50 border border-border/50 rounded-2xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + index * 0.05 }}>
                <CheckCircle2 className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                <p className="text-text">{value}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section className="mb-24" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
          <h2 className="text-3xl font-display font-bold text-text text-center mb-12">BENEFITS & PERKS</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div key={benefit.title} className="p-6 bg-surface/50 border border-border/50 rounded-2xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + index * 0.05 }}>
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-4">
                  <benefit.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-display font-bold text-text mb-2">{benefit.title}</h3>
                <p className="text-text-muted">{benefit.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section className="mb-24" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
          <h2 className="text-3xl font-display font-bold text-text text-center mb-12">OPEN ROLES</h2>
          {openRoles.map((dept, deptIndex) => (
            <motion.div key={dept.dept} className="mb-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + deptIndex * 0.1 }}>
              <h3 className="text-2xl font-display font-bold text-text mb-6 pb-3 border-b border-border/50">{dept.dept}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {dept.roles.map((role, roleIndex) => (
                  <motion.button key={role.title} className="p-6 bg-surface/50 border border-border/50 rounded-2xl text-left hover:border-accent/30 hover:bg-surface transition-all group" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + deptIndex * 0.1 + roleIndex * 0.03 }} whileHover={{ x: 4 }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-body font-medium">{role.type}</span>
                      <span className="px-3 py-1 bg-surface border border-border/50 rounded-full text-xs text-text-muted">{role.location}</span>
                    </div>
                    <h4 className="text-lg font-display font-semibold text-text group-hover:text-accent transition-colors">{role.title}</h4>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.section>

        <motion.section className="text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}>
          <h2 className="text-3xl font-display font-bold text-text mb-6">DON'T SEE YOUR ROLE?</h2>
          <p className="text-lg text-text-muted mb-8 max-w-xl mx-auto">
            We're always looking for exceptional people. Send your portfolio and a note about why NEONVAULT to careers@neonvault.com
          </p>
          <a href="mailto:careers@neonvault.com" className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-bg rounded-xl font-body font-medium text-lg hover:bg-accent-dim transition-colors">
            GET IN TOUCH
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </motion.section>
      </div>
    </div>
  );
};

export default Careers;