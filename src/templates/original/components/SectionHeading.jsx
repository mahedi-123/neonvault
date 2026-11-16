import { motion } from 'motion/react';
import { maskReveal, staggerContainer, viewportOnce } from '../lib/motion';
import { cn } from '../utils/helpers';

/**
 * The home page's section headings, given a common structure: a numbered
 * index, an eyebrow, and a title that wipes up from behind a mask.
 *
 * The index is the point. Numbering the sections turns a scroll down a long
 * page into a route through a numbered building — the same device the vault
 * floor uses for its districts, so the two halves of the site read as one
 * place. The mask wipe needs the `overflow-hidden` wrapper below to work at
 * all; without it the title just slides, which is a different and much
 * cheaper-looking effect.
 */
const SectionHeading = ({ index, eyebrow, title, id, action, className = '' }) => (
  <div
    className={cn(
      'mb-10 flex flex-col gap-6 sm:mb-12 sm:flex-row sm:items-end sm:justify-between',
      className
    )}
  >
    <motion.div
      variants={staggerContainer(0.08)}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      className="min-w-0"
    >
      <div className="mb-3 flex items-center gap-3 overflow-hidden">
        <motion.span
          variants={maskReveal}
          className="font-body text-xs font-semibold tabular-nums tracking-[0.2em] text-accent"
        >
          {String(index).padStart(2, '0')}
        </motion.span>
        <motion.span
          variants={maskReveal}
          className="h-px w-8 shrink-0 bg-gradient-to-r from-accent to-transparent sm:w-12"
        />
        <motion.span
          variants={maskReveal}
          className="truncate font-body text-xs font-semibold uppercase tracking-[0.22em] text-text-subtle"
        >
          {eyebrow}
        </motion.span>
      </div>

      <div className="overflow-hidden pb-1">
        <motion.h2
          id={id}
          variants={maskReveal}
          className="font-display text-[clamp(2.25rem,7vw,4rem)] font-extrabold uppercase leading-[0.95] tracking-tight text-text"
        >
          {title}
        </motion.h2>
      </div>
    </motion.div>

    {action && (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={viewportOnce}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="shrink-0"
      >
        {action}
      </motion.div>
    )}
  </div>
);

export default SectionHeading;
