import { forwardRef } from 'react';
import { cn } from '../utils/helpers';

const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  ...props
}, ref) => {
  const baseStyles = `
    inline-flex items-center justify-center gap-2 font-body font-medium
    transition-all duration-200 ease-out
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg
    disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none
    ${fullWidth ? 'w-full' : ''}
  `;

  const variants = {
    primary: 'bg-accent text-bg hover:bg-accent-dim active:scale-[0.98] shadow-[0_0_20px_-5px_rgba(139,92,246,0.35)]',
    secondary: 'bg-surface-hover text-text border border-border hover:bg-surface hover:border-border-hover active:scale-[0.98]',
    ghost: 'bg-transparent text-text-muted hover:text-text hover:bg-surface active:scale-[0.98]',
    outline: 'bg-transparent text-text border border-border hover:bg-surface hover:border-border-hover active:scale-[0.98]',
    destructive: 'bg-error/10 text-error border border-error/30 hover:bg-error/20 active:scale-[0.98]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-7 py-3.5 text-base gap-2.5',
    xl: 'px-10 py-4 text-lg gap-3',
  };

  return (
    <button
      ref={ref}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : leftIcon ? (
        <span aria-hidden="true">{leftIcon}</span>
      ) : null}
      {children}
      {!loading && rightIcon && <span aria-hidden="true">{rightIcon}</span>}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;