import { Box } from 'lucide-react';
import { cn } from '../utils/helpers';

/** Rising sparks. Hand-placed rather than random so they never clump, and
 *  offset in time so the button never emits a burst all at once. */
const SPARKS = [
  { left: '14%', delay: '0s' },
  { left: '33%', delay: '0.9s' },
  { left: '58%', delay: '1.7s' },
  { left: '81%', delay: '2.3s' },
];

/**
 * The hero's portal CTA — the one door into the 3D vault.
 *
 * It sits third in a row behind a solid violet primary and a filled
 * secondary, both of which carry more visual weight than a plain outlined
 * button ever could. Rather than escalate into a fourth colour of solid
 * fill (which would leave the hero with three competing primary actions),
 * this one wins on motion: it is the only thing on the page that moves on
 * its own.
 *
 * The layers are all decorative spans behind the label, so the accessible
 * button is still just a button with text in it — screen readers get
 * "Enter the vault", nothing else, and every layer is aria-hidden.
 *
 * All the animation lives in index.css under .vault-cta*, including the
 * prefers-reduced-motion opt-out.
 */
const EnterVaultButton = ({ onClick, className = '' }) => (
  <span className={cn('vault-cta-wrap', className)}>
    <span className="vault-cta-aura" aria-hidden="true" />
    <span className="vault-cta-pulse" aria-hidden="true" />

    <button
      type="button"
      onClick={onClick}
      className="vault-cta group inline-flex items-center justify-center gap-3 px-10 py-4 font-body text-lg font-medium text-text transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      {/* Orbiting border, then the face that masks it down to a rim */}
      <span className="vault-cta-ring" aria-hidden="true" />
      <span className="vault-cta-face" aria-hidden="true" />

      {/* Depth and life inside the face */}
      <span className="vault-cta-grid" aria-hidden="true" />
      {SPARKS.map((spark) => (
        <span
          key={spark.left}
          className="vault-cta-spark"
          style={{ left: spark.left, animationDelay: spark.delay }}
          aria-hidden="true"
        />
      ))}
      <span className="vault-cta-scan" aria-hidden="true" />

      {/* HUD brackets */}
      <span className="vault-cta-corner vault-cta-corner-tl" aria-hidden="true" />
      <span className="vault-cta-corner vault-cta-corner-tr" aria-hidden="true" />
      <span className="vault-cta-corner vault-cta-corner-bl" aria-hidden="true" />
      <span className="vault-cta-corner vault-cta-corner-br" aria-hidden="true" />

      <span className="vault-cta-label relative z-10 inline-flex items-center gap-3 whitespace-nowrap">
        <Box className="vault-cta-icon h-5 w-5 text-accent-secondary" aria-hidden="true" />
        ENTER THE VAULT
      </span>
    </button>
  </span>
);

export default EnterVaultButton;
