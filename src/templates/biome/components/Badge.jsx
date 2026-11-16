import { cn } from '../utils/helpers';

const Badge = ({ children, variant = 'default', className = '', dot = false }) => {
  const variants = {
    default: 'bg-surface-hover text-text-muted border border-border',
    primary: 'bg-accent/10 text-accent border border-accent/30',
    accent: 'bg-accent text-bg',
    warning: 'bg-warning/10 text-warning border border-warning/30',
    error: 'bg-error/10 text-error border border-error/30',
    success: 'bg-green-500/10 text-green-500 border border-green-500/30',
    new: 'bg-accent/10 text-accent border border-accent/30',
    limited: 'bg-warning/10 text-warning border border-warning/30',
    bestseller: 'bg-accent text-bg',
    outOfStock: 'bg-error/10 text-error border border-error/30',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-body font-medium',
        'rounded-full border',
        variants[variant],
        className
      )}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" aria-hidden="true" />}
      {children}
    </span>
  );
};

export default Badge;