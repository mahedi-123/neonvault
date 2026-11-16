import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Sparkles } from 'lucide-react';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import ProductCard from '../../components/ProductCard';
import { Reveal, staggerContainer, fadeUp } from '../../lib/motion';
import { zones } from '../zoneConfig';

const REASON_COPY = {
  'no-webgl': 'Your browser doesn’t support the 3D experience here, so we’ve laid the vault out as a page instead.',
  'reduced-motion': 'Motion is reduced on this device, so we’ve laid the vault out as a page instead of an animated scene.',
  'low-tier': 'We’ve laid the vault out as a page for the smoothest experience on this device.',
  error: 'The 3D experience hit a snag, so we’ve laid the vault out as a page instead.',
};

/**
 * Zero-canvas version of the same four zones. Used for unsupported/low-tier
 * devices, prefers-reduced-motion, and as the runtime error fallback — one
 * fallback UI covers every failure mode. Every product/description here is
 * identical to what the 3D experience shows, just without the camera.
 */
const VaultDomFallback = ({ reason }) => {
  const navigate = useNavigate();
  const note = REASON_COPY[reason];

  return (
    <div className="relative min-h-screen bg-bg pb-24 pt-20 lg:pt-24">
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <div className="absolute inset-0 mesh-gradient" />
      <div className="absolute inset-0 noise-overlay" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal as={motion.div} className="mb-16 max-w-2xl">
          <Badge variant="accent" dot className="mb-4 inline-flex">
            <Sparkles className="mr-1 w-3 h-3" /> THE NEON VAULT
          </Badge>
          <h1 className="text-4xl font-display font-extrabold leading-[0.98] tracking-tight text-text sm:text-5xl lg:text-6xl">
            EXPLORE THE <span className="text-gradient-accent">VAULT.</span>
          </h1>
          {note && <p className="mt-4 font-body text-sm text-text-subtle">{note}</p>}
          <p className="mt-4 max-w-xl font-body text-lg text-text-muted">
            Eight zones of curated technology — no headset, no controllers, just the page.
          </p>
          <div className="mt-8">
            <Button rightIcon={<ArrowRight className="w-5 h-5" />} onClick={() => navigate('/shop')}>
              BROWSE THE FULL SHOP
            </Button>
          </div>
        </Reveal>

        <div className="space-y-16">
          {zones.map((zone) => {
            const zoneProducts = zone.getProducts();
            return (
              <Reveal as={motion.section} key={zone.id} aria-labelledby={`${zone.id}-heading`}>
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="mb-2 flex items-center gap-2 font-body text-xs font-semibold uppercase tracking-[0.24em] text-text-subtle">
                      <span className="text-accent">{String(zone.index).padStart(2, '0')}</span>
                      {zone.label}
                    </p>
                    <h2 id={`${zone.id}-heading`} className="text-2xl font-display font-bold text-text sm:text-3xl">
                      {zone.description}
                    </h2>
                  </div>
                </div>

                {zoneProducts.length > 0 ? (
                  <motion.div
                    variants={staggerContainer(0.08)}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
                  >
                    {zoneProducts.map((product) => (
                      <motion.div key={product.id} variants={fadeUp}>
                        <ProductCard product={product} />
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <p className="text-text-subtle">More arriving soon.</p>
                )}
              </Reveal>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VaultDomFallback;
