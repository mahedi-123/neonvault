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
    nv-btn relative isolate inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-body font-medium uppercase tracking-[0.12em]
    transition-[background-color,border-color,color,box-shadow,transform] duration-300 ease-out
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg
    disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none
    ${fullWidth ? 'w-full' : ''}
  `;

  // Vault language: a solid mint pill for the one primary action, glass
  // pills for everything else. The sheen sweep lives in index.css (.nv-btn).
  const variants = {
    primary: 'nv-btn-solid bg-mint text-[#05061a] hover:bg-white active:scale-[0.98] shadow-[0_0_30px_-6px_rgba(140,170,255,0.65)]',
    secondary: 'bg-bg/50 text-text border border-accent/25 backdrop-blur-md hover:border-accent/60 hover:shadow-[0_10px_34px_-12px_rgba(138,180,255,0.6)] active:scale-[0.98]',
    ghost: 'bg-transparent text-text-muted hover:text-text hover:bg-surface active:scale-[0.98]',
    outline: 'bg-transparent text-text border border-border hover:border-accent/50 hover:text-accent active:scale-[0.98]',
    destructive: 'bg-error/10 text-error border border-error/30 hover:bg-error/20 active:scale-[0.98]',
  };

  const sizes = {
    sm: 'px-3.5 py-1.5 text-[10px] gap-1.5',
    md: 'px-5 py-2.5 text-xs gap-2',
    lg: 'px-7 py-3.5 text-xs gap-2.5',
    xl: 'px-9 py-4 text-sm gap-3',
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