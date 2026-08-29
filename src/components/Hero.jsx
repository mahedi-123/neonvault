import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, MousePointer, Sparkles } from 'lucide-react';
import { cn } from '../utils/helpers';
import Button from './Button';

const Hero = () => {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      const rect = heroRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMousePos({
        x: ((e.clientX - rect.left) / rect.width - 0.5) * 2,
        y: ((e.clientY - rect.top) / rect.height - 0.5) * 2,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const floatingProducts = [
    { id: 1, img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop', x: -15, y: -10, rotation: -8, delay: 0 },
    { id: 2, img: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=400&h=400&fit=crop', x: 65, y: -20, rotation: 5, delay: 0.2 },
    { id: 3, img: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400&h=400&fit=crop', x: -10, y: 55, rotation: 12, delay: 0.4 },
    { id: 4, img: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop', x: 55, y: 60, rotation: -5, delay: 0.6 },
    { id: 5, img: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=400&h=400&fit=crop', x: 25, y: 20, rotation: 3, delay: 0.8 },
  ];

  return (
    <motion.section
      ref={heroRef}
      className={cn(
        'relative min-h-screen flex items-center justify-center',
        'overflow-hidden',
        'bg-bg'
      )}
      style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,255,136,0.04), transparent)' }}
    >
      <div className="absolute inset-0 grid-pattern opacity-20" />
      <div className="absolute inset-0 mesh-gradient" />
      <div className="absolute inset-0 noise-overlay" />
      <div className="absolute inset-0 vignette" />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/5 blur-[150px] opacity-30 animate-pulse" aria-hidden="true" />
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[100px] opacity-20" style={{ animation: 'float 20s ease-in-out infinite' }} aria-hidden="true" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-accent/5 blur-[100px] opacity-15" style={{ animation: 'float 25s ease-in-out infinite reverse' }} aria-hidden="true" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <motion.div
          className="relative z-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface/60 backdrop-blur-xl border border-border/50 text-text-muted text-sm font-body mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <Sparkles className="w-4 h-4 text-accent" />
            <span>NEW DROP // 48 HOURS ONLY</span>
          </motion.div>

          <motion.h1
            className="text-6xl sm:text-7xl lg:text-9xl font-display font-extrabold text-text leading-[0.95] tracking-tight text-balance"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <span className="block">BUY THE</span>
            <span className="block text-gradient-accent">FUTURE.</span>
          </motion.h1>

          <motion.p
            className="mt-6 max-w-xl text-lg sm:text-xl text-text-muted font-body leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            Curated premium technology for those who refuse to compromise. Smart gadgets, gaming gear, and lifestyle tech — all in one vault.
          </motion.p>

          <motion.div
            className="mt-10 flex flex-wrap items-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            <Button size="xl" leftIcon={<ArrowRight className="w-5 h-5" />} onClick={() => navigate('/shop')}>
              EXPLORE COLLECTION
            </Button>
            <Button variant="secondary" size="xl" onClick={() => navigate('/new-drops')}>
              VIEW NEW DROPS
            </Button>
          </motion.div>

          <motion.div
            className="mt-16 flex items-center gap-8 text-sm text-text-muted"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span>Free shipping over $200</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12V7H5"/><path d="M16 7l-4-4"/><path d="M8 7l4-4"/><path d="M3 22v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/></svg>
              <span>30-day returns</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h12"/><path d="M10 16h4"/></svg>
              <span>2-year warranty</span>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-text-subtle animate-bounce"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          style={{ animationDelay: '2s' }}
        >
          <MousePointer className="w-6 h-6" />
          <span className="text-xs font-body">Scroll to explore</span>
        </motion.div>

        <div
          className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-8 lg:gap-16"
          style={{
            transform: `translateX(calc(-50% + ${mousePos.x * 30}px)) translateY(${mousePos.y * 20}px)`,
            transition: 'transform 0.1s linear'
          }}
          aria-hidden="true"
        >
          {floatingProducts.map((product, index) => (
            <motion.div
              key={product.id}
              className="relative"
              style={{
                transform: `translateX(${product.x}%) translateY(${product.y}%) rotate(${product.rotation}deg)`,
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.5 + product.delay, duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
              animate={{ y: [0, -15, 0], rotate: [product.rotation, product.rotation + 2, product.rotation] }}
              transition={{ duration: 6 + index, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="relative w-52 h-52 lg:w-64 lg:h-64 rounded-2xl overflow-hidden bg-surface border border-border/50 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5)]">
                <img src={product.img} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="absolute -bottom-3 -left-3 -right-3 h-3 bg-gradient-to-r from-accent/30 via-transparent to-accent/30 rounded-t-2xl blur-lg" />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
};

export default Hero;