import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, errorText } from '../shared/lib/api.js';

export const cx = (...c) => c.filter(Boolean).join(' ');
export const money = (n, digits = 2) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n || 0);
export const num = (n) => new Intl.NumberFormat('en-US').format(n || 0);
export const when = (iso) => {
  const d = new Date(iso);
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
};

/** GET with loading/error state and a reload(). */
export function useApi(path, deps = []) {
  const [state, setState] = useState({ data: null, error: '', loading: true });
  const seq = useRef(0);
  const load = useCallback(async () => {
    const n = ++seq.current;
    setState((s) => ({ ...s, loading: true }));
    try {
      const data = await api.get(path);
      if (n === seq.current) setState({ data, error: '', loading: false });
    } catch (e) {
      if (n === seq.current) setState({ data: null, error: errorText(e), loading: false });
    }
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
  return { ...state, reload: load };
}

/* ------------------------------------------------------------- toasts */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function Toasts({ children }) {
  const [list, setList] = useState([]);
  const push = useCallback((text, tone = 'ok') => {
    const id = Math.random();
    setList((l) => [...l, { id, text, tone }]);
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 4200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(360px,calc(100vw-32px))] flex-col gap-2" aria-live="polite">
        {list.map((t) => (
          <div key={t.id} className={cx('anim-in rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur',
            t.tone === 'bad' ? 'border-bad/40 bg-bad/10 text-bad' : 'border-accent/30 bg-panel/90 text-ink')}>{t.text}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* --------------------------------------------------------- primitives */
export const Card = ({ title, action, className, children, pad = true }) => (
  <section className={cx('rounded-2xl border border-line bg-panel', className)}>
    {(title || action) && (
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-mute">{title}</h2>
        {action}
      </header>
    )}
    <div className={pad ? 'p-5' : ''}>{children}</div>
  </section>
);

export function Btn({ tone = 'default', size = 'md', loading, className, children, ...p }) {
  return (
    <button type="button" disabled={loading || p.disabled} className={cx(
      'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
      size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm',
      tone === 'primary' && 'bg-accent text-bg hover:bg-accent/85',
      tone === 'default' && 'border border-line-2 bg-panel-2 text-ink hover:border-accent/50',
      tone === 'ghost' && 'text-mute hover:bg-panel-2 hover:text-ink',
      tone === 'danger' && 'border border-bad/40 text-bad hover:bg-bad/10',
      className)} {...p}>
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />}
      {children}
    </button>
  );
}

export const Input = ({ label, error, className, ...p }) => (
  <label className={cx('block text-xs', className)}>
    {label && <span className="mb-1 block uppercase tracking-[0.14em] text-faint">{label}</span>}
    <input className={cx('h-10 w-full rounded-lg border bg-bg px-3 text-sm text-ink placeholder:text-faint focus:border-accent/60 focus:outline-none',
      error ? 'border-bad/60' : 'border-line-2')} aria-invalid={!!error || undefined} {...p} />
    {error && <span className="mt-1 block text-bad">{error}</span>}
  </label>
);

export const Select = ({ label, className, children, ...p }) => (
  <label className={cx('block text-xs', className)}>
    {label && <span className="mb-1 block uppercase tracking-[0.14em] text-faint">{label}</span>}
    <select className="h-10 w-full rounded-lg border border-line-2 bg-bg px-3 text-sm text-ink focus:border-accent/60 focus:outline-none" {...p}>{children}</select>
  </label>
);

const TONE = {
  pending: 'text-warn border-warn/30', paid: 'text-accent border-accent/30', processing: 'text-accent-2 border-accent-2/40',
  shipped: 'text-accent border-accent/60', delivered: 'text-good border-good/40', cancelled: 'text-bad border-bad/30', refunded: 'text-mute border-line-2',
  unpaid: 'text-warn border-warn/30',
};
export const Status = ({ value }) => (
  <span className={cx('inline-flex h-6 items-center rounded-full border px-2.5 font-mono text-[10px] uppercase tracking-wider', TONE[value] || 'border-line-2 text-mute')}>{value}</span>
);

export const Empty = ({ children }) => <p className="px-5 py-10 text-center text-sm text-faint">{children}</p>;
export const Loading = () => <div className="flex items-center gap-3 p-6 text-sm text-mute"><span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-r-transparent" /> Loading…</div>;
export const ErrorNote = ({ children }) => <p role="alert" className="rounded-lg border border-bad/40 bg-bad/5 px-4 py-3 text-sm text-bad">{children}</p>;

/** Plain table with a horizontal scroller so wide data never widens the page. */
export const Table = ({ head, children }) => (
  <div className="scroll-x">
    <table className="w-full min-w-[640px] text-left text-sm">
      <thead><tr className="border-b border-line text-[10px] uppercase tracking-[0.16em] text-faint">{head.map((h) => <th key={h} className="whitespace-nowrap px-5 py-3 font-medium">{h}</th>)}</tr></thead>
      <tbody className="divide-y divide-line">{children}</tbody>
    </table>
  </div>
);

export function PageHead({ title, sub, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-mute">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
