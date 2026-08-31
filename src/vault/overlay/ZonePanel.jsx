import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import Button from '../../components/Button';
import ProductCard from '../../components/ProductCard';
import { staggerContainer, fadeUp, useMagnetic } from '../../lib/motion';
import { getZoneById } from '../zoneConfig';
import { startReturn, useVaultStore } from '../state/vaultStore';

/**
 * The exhibition panel: shown once the camera arrives at a zone. Composed
 * like a museum placard — index, title, one line of editorial copy — over a
 * featured product with a smaller supporting set alongside it, rather than a
 * uniform product grid. Uses ProductCard directly (not ProductGrid) since
 * ProductGrid reads the global shop filters, which would silently thin out
 * or reorder this zone's fixed curated set if a shopper left filters active
 * on /shop.
 */
const ZonePanel = () => {
  const mode = useVaultStore((s) => s.mode);
  const activeZoneId = useVaultStore((s) => s.activeZoneId);
  const visible = mode === 'zone' && !!activeZoneId;
  const zone = activeZoneId ? getZoneById(activeZoneId) : null;
  const [featured, ...supporting] = zone ? zone.getProducts() : [];
  const { ref: backRef, style: backStyle, handlers: backHandlers } = useMagnetic({ strength: 0.2, max: 9 });

  return (
    <AnimatePresence>
      {visible && zone && (
        <motion.div
          key={zone.id}
          className="pointer-events-auto fixed inset-x-0 bottom-0 z-10 max-h-[82vh] overflow-y-auto"
          initial={{ opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 28 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mx-auto max-w-6xl px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-10">
            <motion.div
              variants={staggerContainer(0.08, 0.05)}
              initial="hidden"
              animate="visible"
              className="rounded-3xl border border-border/50 bg-surface/85 p-5 shadow-[0_-20px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur-2xl sm:p-8"
            >
              <div className="mb-6 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
                <motion.div variants={fadeUp}>
                  <p className="mb-2 flex items-center gap-2 font-body text-xs font-semibold uppercase tracking-[0.24em] text-text-subtle">
                    <span className="text-accent">{String(zone.index).padStart(2, '0')}</span>
                    EXHIBIT
                  </p>
                  <h2 className="font-display text-2xl font-bold uppercase leading-[0.95] tracking-tight text-text sm:text-3xl lg:text-4xl">
                    {zone.label}
                  </h2>
                  <p className="mt-3 max-w-lg font-body text-sm text-text-muted sm:text-base">{zone.description}</p>
                </motion.div>
                <motion.div variants={fadeUp}>
                  <motion.div ref={backRef} style={backStyle} {...backHandlers} className="flex sm:inline-flex">
                    <Button
                      variant="secondary"
                      leftIcon={<ArrowLeft className="w-4 h-4" />}
                      onClick={() => startReturn()}
                      fullWidth
                      className="sm:w-auto"
                    >
                      BACK TO THE FLOOR
                    </Button>
                  </motion.div>
                </motion.div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-12">
                {featured && (
                  <motion.div variants={fadeUp} className="lg:col-span-5">
                    <ProductCard product={featured} variant="featured" priority />
                  </motion.div>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:col-span-7">
                  {supporting.map((product) => (
                    <motion.div key={product.id} variants={fadeUp}>
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ZonePanel;
