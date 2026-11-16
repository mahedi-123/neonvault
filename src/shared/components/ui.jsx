/**
 * Small UI kit for the shared pages (account, tracking, reviews). It only uses
 * the colour/font tokens every design defines, so each design restyles it.
 */
import { forwardRef } from 'react';

export const cx = (...c) => c.filter(Boolean).join(' ');

export const Field = forwardRef(function Field({ label, error, hint, className, as = 'input', ...props }, ref) {
  const Tag = as;
  const id = props.id || props.name;
  return (
    <label className={cx('block', className)} htmlFor={id}>
      {label && <span className="mb-1.5 block text-xs font-body uppercase tracking-[0.14em] text-text-muted">{label}</span>}
      <Tag
        ref={ref}
        id={id}
        aria-invalid={!!error || undefined}
        className={cx(
          'w-full rounded-xl border bg-bg/60 px-4 py-3 text-sm text-text placeholder:text-text-subtle transition-colors focus:outline-none focus:ring-2 focus:ring-accent/60',
          error ? 'border-error/70' : 'border-border hover:border-border-hover',
          as === 'textarea' && 'min-h-28 resize-y',
        )}
        {...props}
      />
      {error ? <span className="mt-1.5 block text-xs text-error" role="alert">{error}</span>
        : hint ? <span className="mt-1.5 block text-xs text-text-subtle">{hint}</span> : null}
    </label>
  );
});

export function Btn({ variant = 'primary', size = 'md', loading, className, children, ...props }) {
  return (
    <button
      type="button"
      disabled={loading || props.disabled}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-full font-body font-medium uppercase tracking-[0.12em] transition-all disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'px-4 py-2 text-[11px]' : 'px-6 py-3 text-xs',
        variant === 'primary' && 'bg-accent text-bg hover:bg-accent-dim',
        variant === 'secondary' && 'border border-border bg-surface/60 text-text hover:border-accent/60',
        variant === 'ghost' && 'text-text-muted hover:text-text',
        variant === 'danger' && 'border border-error/50 text-error hover:bg-error/10',
        className,
      )}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

export const Panel = ({ className, children, ...p }) => (
  <div className={cx('rounded-2xl border border-border bg-surface/50 p-5 sm:p-6', className)} {...p}>{children}</div>
);

export const Spinner = ({ className = 'h-5 w-5' }) => (
  <svg className={cx('animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export function Stars({ value, size = 'h-4 w-4', onChange, label }) {
  return (
    <span className="inline-flex items-center gap-0.5" role={onChange ? 'radiogroup' : 'img'} aria-label={label || `${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= Math.round(value);
        const star = (
          <svg className={cx(size, on ? 'text-accent' : 'text-border')} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        );
        return onChange ? (
          <button key={n} type="button" role="radio" aria-checked={n === value} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => onChange(n)} className="p-0.5 transition-transform hover:scale-110">{star}</button>
        ) : <span key={n}>{star}</span>;
      })}
    </span>
  );
}

const STATUS_STYLE = {
  pending: 'border-warning/40 text-warning',
  paid: 'border-accent/40 text-accent',
  processing: 'border-accent-secondary/50 text-accent-secondary',
  shipped: 'border-accent/60 text-accent',
  delivered: 'border-accent bg-accent/10 text-accent',
  cancelled: 'border-error/40 text-error',
  refunded: 'border-border text-text-muted',
};
export const StatusPill = ({ status }) => (
  <span className={cx('inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-body uppercase tracking-[0.16em]', STATUS_STYLE[status] || 'border-border text-text-muted')}>
    {status}
  </span>
);

export const money = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
export const date = (iso, opts = { month: 'short', day: 'numeric', year: 'numeric' }) => new Date(iso).toLocaleDateString('en-US', opts);

export function Notice({ tone = 'info', children }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cx('rounded-xl border px-4 py-3 text-sm',
      tone === 'error' ? 'border-error/50 bg-error/5 text-error' : tone === 'success' ? 'border-accent/50 bg-accent/5 text-accent' : 'border-border bg-surface/50 text-text-muted')}>
      {children}
    </div>
  );
}
