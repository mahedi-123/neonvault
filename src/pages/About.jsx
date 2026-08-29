import { motion } from 'framer-motion';
import { Sparkles, Target, Users, Award, Zap, Leaf, Heart, Globe, Rocket, Shield, Clock, Package } from 'lucide-react';

const About = () => {
  const values = [
    { icon: Sparkles, title: 'Curated Excellence', desc: 'Every product is hand-selected by our team of engineers, designers, and tech enthusiasts. We test hundreds of devices so you don\'t have to.' },
    { icon: Target, title: 'No Compromise', desc: 'We only carry products that meet our exacting standards for performance, build quality, and innovation. No filler, no fluff.' },
    { icon: Users, title: 'Community First', desc: 'Built by tech enthusiasts, for tech enthusiasts. Your feedback drives our curation. Join the Vault Discord to shape future drops.' },
    { icon: Award, title: 'Authenticity Guaranteed', desc: 'Authorized retailer for every brand. Full manufacturer warranties. Zero gray market, zero counterfeits, zero compromises.' },
    { icon: Zap, title: 'Future-Forward', desc: 'We spotlight emerging technology before it hits mainstream. Be the first to experience what\'s next.' },
    { icon: Leaf, title: 'Sustainable Practices', desc: 'Eco-friendly packaging, carbon-neutral shipping options, and a 2-year warranty that extends product lifecycles.' },
  ];

  const milestones = [
    { year: '2022', title: 'FOUNDED', desc: 'NEONVAULT launches in San Francisco with a mission: curate the best future-tech under one roof.' },
    { year: '2023', title: 'FIRST FLAGSHIP', desc: 'Physical retail location opens in SoMa. Community events, product demos, and workshops begin.' },
    { year: '2024', title: '100K CUSTOMERS', desc: 'Milestone reached. Expanded to 50+ countries. Launched NEONVAULT Care+ extended warranty.' },
    { year: '2025', title: 'VAULT PICKS AI', desc: 'Personalized recommendation engine launches. Drop Room early-access program debuts.' },
    { year: '2026', title: 'TODAY', desc: '200+ curated products. 15 brand partnerships. Growing community of 500K+ tech enthusiasts.' },
  ];

  const team = [
    { name: 'Alex Chen', role: 'Founder & CEO', bio: 'Former Apple hardware engineer. Obsessed with mechanical keyboards and hi-fi audio.' },
    { name: 'Maya Rodriguez', role: 'Head of Curation', bio: 'Tech journalist turned buyer. 10+ years reviewing consumer electronics for major publications.' },
    { name: 'James Park', role: 'CTO', bio: 'Ex-Stripe, Shopify. Builds the tech that makes NEONVAULT fast, secure, and personal.' },
    { name: 'Sarah Kim', role: 'Community Lead', bio: 'Discord moderator turned community manager. Runs our Drop Room events and AMAs.' },
    { name: 'David Okonkwo', role: 'Logistics Director', bio: 'Supply chain expert. Ensures your gear arrives fast, safe, and carbon-neutral.' },
    { name: 'Priya Sharma', role: 'Design Director', bio: 'RISD grad. Crafts the NEONVAULT aesthetic across digital and physical touchpoints.' },
  ];

  return (
    <div className="min-h-screen pt-20 lg:pt-24 pb-20">
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <div className="absolute inset-0 noise-overlay" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.section className="mb-24" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-full text-sm font-body font-medium mb-6">
              <Sparkles className="w-4 h-4" /> ABOUT NEONVAULT
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-text leading-tight mb-6">
              BUY THE FUTURE
            </h1>
            <p className="text-lg text-text-muted leading-relaxed">
              NEONVAULT is a curated destination for premium futuristic technology. We believe the best gear shouldn't be hard to find.
            </p>
          </div>
        </motion.section>

        <motion.section className="mb-24" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}>
          <h2 className="text-3xl font-display font-bold text-text text-center mb-12">OUR VALUES</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((value, index) => (
              <motion.div key={value.title} className="p-6 bg-surface/50 border border-border/50 rounded-2xl group hover:border-accent/30 transition-colors" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + index * 0.05 }}>
                <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-4 group-hover:bg-accent group-hover:text-bg transition-colors">
                  <value.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-display font-bold text-text mb-2">{value.title}</h3>
                <p className="text-text-muted leading-relaxed">{value.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section className="mb-24" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
          <h2 className="text-3xl font-display font-bold text-text text-center mb-12">OUR JOURNEY</h2>
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-px bg-border/50" />
            {milestones.map((milestone, index) => (
              <motion.div key={milestone.year} className="relative pl-20 pb-12 flex items-start" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + index * 0.1 }}>
                <div className="absolute left-0 top-2 flex items-center justify-center w-16 h-16 bg-bg border-2 border-accent rounded-full z-10">
                  <span className="text-accent font-display font-bold text-2xl">{milestone.year.slice(-2)}</span>
                </div>
                <div className="bg-surface/50 border border-border/50 rounded-2xl p-6 flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <span className="px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-body font-medium">{milestone.year}</span>
                    <h3 className="text-xl font-display font-bold text-text">{milestone.title}</h3>
                  </div>
                  <p className="text-text-muted">{milestone.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section className="mb-24" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
          <h2 className="text-3xl font-display font-bold text-text text-center mb-12">MEET THE TEAM</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {team.map((member, index) => (
              <motion.div key={member.name} className="p-6 bg-surface/50 border border-border/50 rounded-2xl text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + index * 0.05 }}>
                <div className="w-24 h-24 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mx-auto mb-4">
                  <span className="text-3xl font-display font-bold">{member.name.charAt(0)}</span>
                </div>
                <h3 className="text-xl font-display font-bold text-text mb-1">{member.name}</h3>
                <p className="text-accent text-sm font-body font-medium mb-3">{member.role}</p>
                <p className="text-text-muted text-sm">{member.bio}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section className="text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}>
          <h2 className="text-3xl font-display font-bold text-text mb-6">JOIN THE VAULT</h2>
          <p className="text-lg text-text-muted mb-8 max-w-xl mx-auto">
            Be the first to access exclusive drops, insider content, and community events. 500K+ members and growing.
          </p>
          <a href="/shop?category=all" className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-bg rounded-xl font-body font-medium text-lg hover:bg-accent-dim transition-colors">
            CREATE YOUR ACCOUNT
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </motion.section>
      </div>
    </div>
  );
};

export default About;