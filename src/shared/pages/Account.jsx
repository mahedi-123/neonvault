import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, backend, errorText } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { useOrderUpdates } from '../lib/live.js';
import { getProductById } from '../data/products.js';
import OrderCard from '../components/OrderCard.jsx';
import { Btn, Field, Notice, Panel, Spinner, cx, date, money } from '../components/ui.jsx';

const TABS = [
  ['overview', 'Overview'], ['orders', 'Orders'], ['addresses', 'Addresses'],
  ['payment', 'Payment'], ['wishlist', 'Wishlist'], ['security', 'Security'],
];

export default function Account() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const auth = useAuth();
  const { user, isAuthenticated, isLoading } = auth;
  const tab = TABS.some(([id]) => id === params.get('tab')) ? params.get('tab') : 'overview';
  const setTab = (id) => setParams(id === 'overview' ? {} : { tab: id }, { replace: true });

  if (isLoading) return <Shell><div className="flex items-center gap-3 text-text-muted"><Spinner /> Loading your account…</div></Shell>;
  if (!isAuthenticated) {
    return (
      <Shell>
        <Panel className="mx-auto max-w-md text-center">
          <h1 className="font-display text-3xl font-bold text-text">Sign in required</h1>
          <p className="mt-3 text-text-muted">Sign in to see your orders, addresses and wishlist.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Btn onClick={() => navigate('/sign-in')}>Sign in</Btn>
            <Btn variant="secondary" onClick={() => navigate('/track')}>Track an order</Btn>
          </div>
        </Panel>
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.24em] text-accent">Your vault</p>
          <h1 className="font-display text-4xl font-bold text-text sm:text-5xl">Hi, {user.firstName}</h1>
          <p className="mt-2 text-sm text-text-muted">Member since {date(user.createdAt, { month: 'long', year: 'numeric' })}{!backend.online && ' · offline demo account'}</p>
        </div>
        <div className="flex gap-2">
          {auth.isAdmin && <a href="/admin" className="inline-flex items-center rounded-full border border-accent/50 px-5 py-2.5 text-xs uppercase tracking-[0.14em] text-accent hover:bg-accent/10">Admin panel</a>}
          <Btn variant="secondary" size="sm" onClick={async () => { await auth.signOut(); navigate('/'); }}>Sign out</Btn>
        </div>
      </header>

      <nav className="-mx-4 mb-8 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none]" aria-label="Account sections">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}
            className={cx('shrink-0 rounded-full px-4 py-2 text-xs uppercase tracking-[0.14em] transition-colors',
              tab === id ? 'bg-accent text-bg' : 'text-text-muted hover:bg-surface hover:text-text')}>
            {label}
          </button>
        ))}
      </nav>

      {tab === 'overview' && <Overview setTab={setTab} />}
      {tab === 'orders' && <Orders />}
      {tab === 'addresses' && <Addresses />}
      {tab === 'payment' && <Payment />}
      {tab === 'wishlist' && <Wishlist />}
      {tab === 'security' && <Security />}
    </Shell>
  );
}

const Shell = ({ children }) => (
  <div className="min-h-screen px-4 pb-24 pt-28 sm:px-6 lg:pt-32">
    <div className="mx-auto max-w-5xl">{children}</div>
  </div>
);

function Overview({ setTab }) {
  const auth = useAuth();
  const { user } = auth;
  const wish = useWishlist();
  const [sum, setSum] = useState(null);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ firstName: user.firstName, lastName: user.lastName, phone: user.phone || '' });
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (backend.online) api.get('/me/summary').then(setSum).catch(() => {}); }, []);

  const stats = [
    ['Orders', sum?.orders ?? 0, 'orders'],
    ['Spent', money(sum?.spent ?? 0), 'orders'],
    ['Wishlist', wish.count, 'wishlist'],
    ['Addresses', user.addresses?.length ?? 0, 'addresses'],
  ];

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try { await auth.updateProfile(form); setEdit(false); setMsg({ tone: 'success', text: 'Profile saved.' }); } catch (err) { setMsg({ tone: 'error', text: errorText(err) }); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([label, value, to]) => (
          <button key={label} type="button" onClick={() => setTab(to)} className="rounded-2xl border border-border bg-surface/50 p-5 text-left transition-colors hover:border-accent/50">
            <span className="block text-xs uppercase tracking-[0.16em] text-text-muted">{label}</span>
            <span className="mt-2 block font-display text-2xl font-bold text-text">{value}</span>
          </button>
        ))}
      </div>
      <Panel>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-text">Profile</h2>
          {!edit && <Btn size="sm" variant="secondary" onClick={() => setEdit(true)}>Edit</Btn>}
        </div>
        {msg && <div className="mb-4"><Notice tone={msg.tone}>{msg.text}</Notice></div>}
        {edit ? (
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" name="firstName" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <Field label="Last name" name="lastName" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            <Field label="Phone" name="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Field label="Email" name="email" value={user.email} disabled hint="Contact support to change your email." />
            <div className="flex gap-3 sm:col-span-2">
              <Btn type="submit" loading={saving}>Save</Btn>
              <Btn variant="ghost" onClick={() => setEdit(false)}>Cancel</Btn>
            </div>
          </form>
        ) : (
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            {[['Name', `${user.firstName} ${user.lastName}`], ['Email', user.email], ['Phone', user.phone || '—'], ['Role', user.role === 'admin' ? 'Administrator' : 'Customer']].map(([k, v]) => (
              <div key={k}><dt className="text-text-muted">{k}</dt><dd className="mt-0.5 text-text">{v}</dd></div>
            ))}
          </dl>
        )}
      </Panel>
    </div>
  );
}

function Orders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(() => {
    if (!backend.online) { setOrders([]); return; }
    api.get('/me/orders').then((r) => setOrders(r.orders)).catch((e) => setError(errorText(e)));
  }, []);
  useEffect(load, [load]);
  useOrderUpdates(useCallback(() => load(), [load]));

  const cancel = async (o) => {
    setBusy(o.number);
    try {
      const { order } = await api.post(`/orders/${o.number}/cancel`, {});
      setOrders((list) => list.map((x) => (x.number === order.number ? order : x)));
    } catch (e) { setError(errorText(e)); } finally { setBusy(''); }
  };

  if (!orders) return <div className="flex items-center gap-3 text-text-muted"><Spinner /> Loading orders…</div>;
  return (
    <div className="space-y-4">
      {error && <Notice tone="error">{error}</Notice>}
      {backend.online && <ClaimOrder onClaimed={(o) => setOrders((list) => [o, ...list.filter((x) => x.number !== o.number)])} />}
      {!backend.online && <Notice>Order history needs the store backend running.</Notice>}
      {orders.length === 0 && backend.online && (
        <Panel className="text-center">
          <p className="text-text-muted">No orders yet.</p>
          <Link to="/shop" className="mt-4 inline-block text-sm text-accent hover:underline">Start shopping →</Link>
        </Panel>
      )}
      {orders.map((o, i) => <OrderCard key={o.number} order={o} defaultOpen={i === 0} onCancel={cancel} cancelling={busy === o.number} />)}
    </div>
  );
}

/** Guest orders placed with this account's email can be added with their order number. */
function ClaimOrder({ onClaimed }) {
  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState('');
  const [state, setState] = useState({ busy: false, error: '' });
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="text-sm text-accent hover:underline">Ordered as a guest? Add that order to your account →</button>;
  const submit = async (e) => {
    e.preventDefault();
    setState({ busy: true, error: '' });
    try {
      const { order } = await api.post('/me/orders/claim', { number });
      onClaimed(order); setOpen(false); setNumber(''); setState({ busy: false, error: '' });
    } catch (err) { setState({ busy: false, error: errorText(err) }); }
  };
  return (
    <Panel>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field label="Order number (from your confirmation email)" name="claim" placeholder="NV-261024-ABCDE" required value={number} error={state.error} onChange={(e) => setNumber(e.target.value)} />
        <Btn type="submit" loading={state.busy}>Add order</Btn>
      </form>
    </Panel>
  );
}

const emptyAddress = { label: 'Home', firstName: '', lastName: '', line1: '', line2: '', city: '', state: '', zip: '', country: 'US', phone: '', isDefault: false };

function Addresses() {
  const auth = useAuth();
  const list = auth.user.addresses || [];
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setErrors({}); setError('');
    try { await auth.addAddress(form); setForm(null); } catch (err) { setErrors(err.fields || {}); setError(errorText(err)); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((a) => (
          <Panel key={a.id} className="relative">
            <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-text-muted">
              {a.label}{a.isDefault && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] text-accent">Default</span>}
            </p>
            <p className="text-sm leading-relaxed text-text">
              {a.firstName} {a.lastName}<br />{a.line1}{a.line2 && `, ${a.line2}`}<br />{a.city}{a.state && `, ${a.state}`} {a.zip}<br />{a.country} · {a.phone}
            </p>
            <Btn size="sm" variant="ghost" className="mt-3 -ml-4" onClick={() => auth.removeAddress(a.id).catch((e2) => setError(errorText(e2)))}>Remove</Btn>
          </Panel>
        ))}
      </div>
      {error && !form && <Notice tone="error">{error}</Notice>}
      {form ? (
        <Panel>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label="Label" name="label" value={form.label} onChange={set('label')} placeholder="Home, Office…" />
            <Field label="Phone" name="phone" type="tel" required value={form.phone} error={errors.phone} onChange={set('phone')} />
            <Field label="First name" name="firstName" required value={form.firstName} error={errors.firstName} onChange={set('firstName')} />
            <Field label="Last name" name="lastName" required value={form.lastName} error={errors.lastName} onChange={set('lastName')} />
            <Field label="Address" name="line1" required className="sm:col-span-2" value={form.line1} error={errors.line1} onChange={set('line1')} />
            <Field label="Apartment, suite (optional)" name="line2" className="sm:col-span-2" value={form.line2} onChange={set('line2')} />
            <Field label="City" name="city" required value={form.city} error={errors.city} onChange={set('city')} />
            <Field label="State / Division" name="state" value={form.state} onChange={set('state')} />
            <Field label="ZIP / Post code" name="zip" value={form.zip} onChange={set('zip')} />
            <Field label="Country" name="country" value={form.country} onChange={set('country')} />
            <label className="flex items-center gap-2 text-sm text-text-muted sm:col-span-2">
              <input type="checkbox" checked={form.isDefault} onChange={set('isDefault')} className="h-4 w-4 accent-[var(--color-accent)]" /> Make this my default address
            </label>
            {error && <div className="sm:col-span-2"><Notice tone="error">{error}</Notice></div>}
            <div className="flex gap-3 sm:col-span-2">
              <Btn type="submit" loading={saving}>Save address</Btn>
              <Btn variant="ghost" onClick={() => setForm(null)}>Cancel</Btn>
            </div>
          </form>
        </Panel>
      ) : (
        <Btn variant="secondary" onClick={() => setForm({ ...emptyAddress, firstName: auth.user.firstName, lastName: auth.user.lastName, phone: auth.user.phone || '' })}>+ Add address</Btn>
      )}
    </div>
  );
}

function Payment() {
  const auth = useAuth();
  const cards = auth.user.paymentMethods || [];
  const [form, setForm] = useState(null);
  return (
    <div className="space-y-4">
      <Notice>For your security only a nickname and the last 4 digits are remembered — on this device only. Full card numbers are never stored.</Notice>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <Panel key={c.id} className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text">{c.type} •••• {c.last4}</p>
              <p className="text-xs text-text-muted">{c.expiry && `Expires ${c.expiry}`} {c.isDefault && '· Default'}</p>
            </div>
            <Btn size="sm" variant="ghost" onClick={() => auth.removePaymentMethod(c.id)}>Remove</Btn>
          </Panel>
        ))}
      </div>
      {form ? (
        <Panel>
          <form className="grid gap-4 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); auth.addPaymentMethod(form); setForm(null); }}>
            <Field label="Nickname" name="type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="Visa, bKash…" required />
            <Field label="Last 4 digits" name="last4" inputMode="numeric" pattern="\d{4}" maxLength={4} required value={form.last4} onChange={(e) => setForm({ ...form, last4: e.target.value.replace(/\D/g, '') })} />
            <Field label="Expiry (MM/YY)" name="expiry" value={form.expiry} onChange={(e) => setForm({ ...form, expiry: e.target.value })} placeholder="12/28" />
            <div className="flex gap-3 sm:col-span-3">
              <Btn type="submit">Save</Btn>
              <Btn variant="ghost" onClick={() => setForm(null)}>Cancel</Btn>
            </div>
          </form>
        </Panel>
      ) : (
        <Btn variant="secondary" onClick={() => setForm({ type: 'Visa', last4: '', expiry: '', isDefault: cards.length === 0 })}>+ Add card label</Btn>
      )}
    </div>
  );
}

function Wishlist() {
  const wish = useWishlist();
  const cart = useCart();
  if (wish.count === 0) {
    return <Panel className="text-center"><p className="text-text-muted">Your wishlist is empty.</p><Link to="/shop" className="mt-4 inline-block text-sm text-accent hover:underline">Find something →</Link></Panel>;
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {wish.items.map((i) => {
        const p = getProductById(i.id);
        return (
          <Panel key={i.id} className="flex flex-col gap-3 p-4">
            <Link to={`/product/${i.id}`} className="flex items-center gap-3">
              {i.image && <img src={i.image} alt="" className="h-16 w-16 rounded-xl object-cover" loading="lazy" />}
              <span className="min-w-0">
                <span className="block truncate text-text">{i.name}</span>
                <span className="text-sm text-accent">{money(p?.price ?? i.price)}</span>
                {p && !p.inStock && <span className="ml-2 text-xs text-error">Sold out</span>}
              </span>
            </Link>
            <div className="mt-auto flex gap-2">
              <Btn size="sm" disabled={!p?.inStock} onClick={() => p && cart.addItem(p, 1)}>Add to cart</Btn>
              <Btn size="sm" variant="ghost" onClick={() => wish.removeItem(i.id)}>Remove</Btn>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

function Security() {
  const auth = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [msg, setMsg] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  if (!backend.online) return <Notice>Password changes need the store backend running.</Notice>;
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg(null); setErrors({});
    try {
      await auth.changePassword(form.currentPassword, form.newPassword);
      setForm({ currentPassword: '', newPassword: '' });
      setMsg({ tone: 'success', text: 'Password changed. Other devices were signed out.' });
    } catch (err) { setErrors(err.fields || {}); setMsg({ tone: 'error', text: errorText(err) }); } finally { setSaving(false); }
  };
  return (
    <Panel className="max-w-lg">
      <h2 className="mb-4 font-display text-xl font-bold text-text">Change password</h2>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Current password" name="currentPassword" type="password" autoComplete="current-password" required value={form.currentPassword} error={errors.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
        <Field label="New password" name="newPassword" type="password" autoComplete="new-password" required minLength={8} value={form.newPassword} error={errors.newPassword} hint="8+ characters with letters and a number." onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        <Btn type="submit" loading={saving}>Update password</Btn>
      </form>
    </Panel>
  );
}
