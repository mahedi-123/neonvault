import { useCallback, useEffect, useState } from 'react';
import { api, detectBackend, errorText } from '../shared/lib/api.js';
import { Btn, Input, Toasts, useToast, cx, money } from './ui.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Orders from './pages/Orders.jsx';
import Products from './pages/Products.jsx';
import Coupons from './pages/Coupons.jsx';
import { Customers, Inbox, Reviews, Marketing } from './pages/People.jsx';
import Settings from './pages/Settings.jsx';

const NAV = [
  ['overview', 'Overview', 'M3 12h4l3-8 4 16 3-8h4'],
  ['orders', 'Orders', 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0'],
  ['products', 'Products', 'M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8'],
  ['coupons', 'Coupons', 'M20 12V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v5a2 2 0 0 1 0 4v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1a2 2 0 0 1 0-4zM9 9h.01M15 15h.01M15 9l-6 6'],
  ['customers', 'Customers', 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8'],
  ['reviews', 'Reviews', 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z'],
  ['inbox', 'Inbox', 'M22 12h-6l-2 3h-4l-2-3H2M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z'],
  ['marketing', 'Marketing', 'M4 4h16v16H4zM4 4l8 8 8-8'],
  ['settings', 'Settings', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z'],
];

const readHash = () => {
  const [page, qs] = location.hash.replace(/^#\/?/, '').split('?');
  return { page: NAV.some(([id]) => id === page) ? page : 'overview', params: Object.fromEntries(new URLSearchParams(qs || '')) };
};

export default function App() {
  return <Toasts><Gate /></Toasts>;
}

function Gate() {
  const [state, setState] = useState({ phase: 'loading', user: null });
  const check = useCallback(async () => {
    if (!(await detectBackend(3000))) return setState({ phase: 'offline', user: null });
    try {
      const { user } = await api.get('/auth/me');
      setState({ phase: user?.role === 'admin' ? 'in' : 'login', user, notAdmin: user && user.role !== 'admin' });
    } catch { setState({ phase: 'login', user: null }); }
  }, []);
  useEffect(() => { check(); }, [check]);

  if (state.phase === 'loading') return <Center><span className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-r-transparent" /></Center>;
  if (state.phase === 'offline') {
    return (
      <Center>
        <div className="max-w-sm text-center">
          <Logo />
          <p className="mt-6 text-ink">The store backend isn't running.</p>
          <p className="mt-2 text-sm text-mute">Start everything with <span className="font-mono text-accent">npm run dev</span> (or START-WINDOWS.bat), then reload.</p>
        </div>
      </Center>
    );
  }
  if (state.phase === 'login') return <Login notAdmin={state.notAdmin} onIn={check} />;
  return <Shell user={state.user} onSignOut={async () => { await api.post('/auth/logout').catch(() => {}); check(); }} />;
}

const Center = ({ children }) => <div className="grid min-h-screen place-items-center p-6">{children}</div>;
const Logo = () => (
  <div className="flex items-center gap-2.5">
    <span className="grid h-8 w-8 place-items-center rounded-lg border border-accent/40 bg-accent/10"><span className="h-2.5 w-2.5 rotate-45 rounded-[2px] bg-accent" /></span>
    <span className="text-sm font-semibold tracking-[0.28em]">NEON<span className="text-accent">VAULT</span></span>
  </div>
);

function Login({ onIn, notAdmin }) {
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const { user } = await api.post('/auth/login', f);
      if (user.role !== 'admin') { setErr('This account is not an admin.'); await api.post('/auth/logout').catch(() => {}); return; }
      onIn();
    } catch (x) { setErr(errorText(x)); } finally { setBusy(false); }
  };
  return (
    <Center>
      <form onSubmit={submit} className="anim-in w-full max-w-sm space-y-5 rounded-2xl border border-line bg-panel p-7">
        <Logo />
        <div><h1 className="text-xl font-semibold text-ink">Admin sign in</h1><p className="mt-1 text-sm text-mute">Your first login is in <span className="font-mono text-ink">server/data/admin-login.txt</span>.</p></div>
        {notAdmin && !err && <p className="rounded-lg border border-warn/40 bg-warn/5 px-3 py-2 text-sm text-warn">You're signed in as a customer. Sign in with an admin account.</p>}
        <Input label="Email" type="email" autoComplete="username" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <Input label="Password" type="password" autoComplete="current-password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        {err && <p role="alert" className="text-sm text-bad">{err}</p>}
        <Btn type="submit" tone="primary" className="w-full" loading={busy}>Sign in</Btn>
        <a href="/" className="block text-center text-xs text-faint hover:text-mute">← Back to the store</a>
      </form>
    </Center>
  );
}

function Shell({ user, onSignOut }) {
  const toast = useToast();
  const [{ page, params }, setRoute] = useState(readHash);
  const [tick, setTick] = useState(0);
  const [menu, setMenu] = useState(false);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const on = () => setRoute(readHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  // live store events → refresh the current page and toast
  useEffect(() => {
    const es = new EventSource('/api/events', { withCredentials: true });
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    es.addEventListener('order:new', (e) => { const d = JSON.parse(e.data); toast(`New order ${d.number} · ${money(d.total)}`); setTick((t) => t + 1); });
    es.addEventListener('message:new', (e) => { const d = JSON.parse(e.data); toast(`New message from ${d.from}`); setTick((t) => t + 1); });
    es.addEventListener('order', () => setTick((t) => t + 1));
    return () => es.close();
  }, [toast]);

  const go = (id, p) => {
    location.hash = `/${id}${p ? `?${new URLSearchParams(p)}` : ''}`;
    setMenu(false);
    window.scrollTo(0, 0);
  };

  const pageEl = {
    overview: <Dashboard go={go} tick={tick} />, orders: <Orders params={params} tick={tick} />, products: <Products tick={tick} />,
    coupons: <Coupons />, customers: <Customers />, reviews: <Reviews />, inbox: <Inbox tick={tick} />, marketing: <Marketing />,
    settings: <Settings user={user} onSignOut={onSignOut} />,
  }[page];

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[232px_1fr]">
      <aside className={cx('fixed inset-y-0 left-0 z-30 flex w-[232px] flex-col border-r border-line bg-bg/95 backdrop-blur transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0', menu ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-16 items-center px-5"><Logo /></div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2" aria-label="Admin sections">
          {NAV.map(([id, label, d]) => (
            <button key={id} type="button" onClick={() => go(id)} aria-current={page === id ? 'page' : undefined}
              className={cx('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors', page === id ? 'bg-accent/10 text-accent' : 'text-mute hover:bg-panel hover:text-ink')}>
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
              {label}
            </button>
          ))}
        </nav>
        <div className="border-t border-line p-4 text-xs">
          <p className="flex items-center gap-2 text-mute"><span className={cx('h-1.5 w-1.5 rounded-full', live ? 'bg-good' : 'bg-faint')} />{live ? 'Live updates on' : 'Reconnecting…'}</p>
          <p className="mt-1 truncate text-faint">{user.email}</p>
          <a href="/" className="mt-3 inline-block text-accent hover:underline">View store →</a>
        </div>
      </aside>
      {menu && <button type="button" aria-label="Close menu" className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setMenu(false)} />}
      <div className="min-w-0">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-line bg-bg/90 px-4 backdrop-blur lg:hidden">
          <Btn tone="ghost" size="sm" onClick={() => setMenu(true)} aria-label="Open menu">☰</Btn>
          <Logo />
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8" key={page}>{pageEl}</main>
      </div>
    </div>
  );
}
