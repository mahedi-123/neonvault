import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { api, backend, errorText } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useOrderUpdates } from '../lib/live.js';
import OrderCard from '../components/OrderCard.jsx';
import { Btn, Field, Notice, Panel } from '../components/ui.jsx';

/** /track and /track/:number — look up any order with its number + email. */
export default function TrackOrder() {
  const { number: param } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [number, setNumber] = useState(param || '');
  const [email, setEmail] = useState(search.get('email') || user?.email || '');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const lookup = useCallback(async (n, mail) => {
    if (!n) return;
    setLoading(true); setError('');
    try {
      const q = mail ? `?email=${encodeURIComponent(mail)}` : '';
      const r = await api.get(`/orders/${encodeURIComponent(n.trim().toUpperCase())}${q}`);
      setOrder(r.order);
    } catch (e) {
      setOrder(null); setError(errorText(e));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (param && backend.online && (email || user)) lookup(param, email);
    // run once for deep links
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [param]);

  useOrderUpdates(useCallback((d) => { if (order && d.number === order.number) lookup(order.number, email); }, [order, email, lookup]));

  const submit = (e) => {
    e.preventDefault();
    navigate(`/track/${number.trim().toUpperCase()}`, { replace: true });
    lookup(number, email);
  };

  const cancel = async (o) => {
    setCancelling(true);
    try { setOrder((await api.post(`/orders/${o.number}/cancel`, { email })).order); } catch (e) { setError(errorText(e)); } finally { setCancelling(false); }
  };

  return (
    <div className="min-h-screen px-4 pb-24 pt-28 sm:px-6 lg:pt-32">
      <div className="mx-auto max-w-3xl space-y-8">
        <header>
          <p className="mb-3 text-xs uppercase tracking-[0.24em] text-accent">Order tracking</p>
          <h1 className="font-display text-4xl font-bold text-text sm:text-5xl">Where's my order?</h1>
          <p className="mt-3 text-text-muted">Enter the order number from your confirmation and the email you used at checkout.</p>
        </header>
        {!backend.online ? (
          <Notice>Order tracking needs the store backend. Start it with <code className="text-text">npm run dev</code>.</Notice>
        ) : (
          <Panel>
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <Field label="Order number" name="number" placeholder="NV-261024-ABCDE" value={number} onChange={(e) => setNumber(e.target.value)} required autoComplete="off" />
              <Field label="Email" name="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required={!user} autoComplete="email" />
              <Btn type="submit" loading={loading}>Track</Btn>
            </form>
          </Panel>
        )}
        {error && <Notice tone="error">{error}</Notice>}
        {order && <OrderCard order={order} defaultOpen onCancel={cancel} cancelling={cancelling} />}
        {user && <p className="text-sm text-text-muted">All your orders are also in <Link to="/account?tab=orders" className="text-accent hover:underline">your account</Link>.</p>}
      </div>
    </div>
  );
}
