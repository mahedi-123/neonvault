import { useEffect, useState } from 'react';
import { api, errorText } from '../../shared/lib/api.js';
import { Btn, Card, Empty, ErrorNote, Input, Loading, PageHead, Select, Status, Table, money, useApi, useToast, when, cx } from '../ui.jsx';

const FLOW = {
  pending: ['paid', 'processing', 'cancelled'], paid: ['processing', 'cancelled', 'refunded'], processing: ['shipped', 'cancelled', 'refunded'],
  shipped: ['delivered', 'refunded'], delivered: ['refunded'], cancelled: [], refunded: [],
};

export default function Orders({ params, tick }) {
  const [status, setStatus] = useState(params?.status || 'all');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(null);
  const { data, error, loading, reload } = useApi(`/admin/orders?status=${status}&q=${encodeURIComponent(query)}&limit=100`, [tick]);
  useEffect(() => { if (params?.status) setStatus(params.status); }, [params]);

  return (
    <div className="space-y-5">
      <PageHead title="Orders" sub={data ? `${data.total} order${data.total === 1 ? '' : 's'}` : ' '}>
        <a href="/api/admin/orders.csv" className="inline-flex h-10 items-center rounded-lg border border-line-2 bg-panel-2 px-4 text-sm text-ink hover:border-accent/50">Export CSV</a>
      </PageHead>
      <div className="flex flex-wrap gap-3">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40" aria-label="Status filter">
          {['all', ...Object.keys(FLOW)].map((s) => <option key={s} value={s}>{s === 'all' ? 'All statuses' : s}</option>)}
        </Select>
        <form className="flex min-w-0 flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()); }}>
          <Input className="min-w-0 flex-1" placeholder="Search order number or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search orders" />
          <Btn type="submit">Search</Btn>
        </form>
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      <Card pad={false}>
        {!data && loading ? <Loading /> : data?.orders.length === 0 ? <Empty>No orders match.</Empty> : (
          <Table head={['Order', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Placed']}>
            {data.orders.map((o) => (
              <tr key={o.number} className="cursor-pointer hover:bg-panel-2" onClick={() => setOpen(o.number)}>
                <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-accent">{o.number}</td>
                <td className="max-w-[200px] truncate px-5 py-3 text-mute">{o.email}</td>
                <td className="tabular px-5 py-3 text-mute">{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                <td className="tabular whitespace-nowrap px-5 py-3 font-mono text-ink">{money(o.total)}</td>
                <td className="px-5 py-3"><Status value={o.paymentStatus} /></td>
                <td className="px-5 py-3"><Status value={o.status} /></td>
                <td className="whitespace-nowrap px-5 py-3 text-mute">{when(o.createdAt)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {open && <OrderDrawer number={open} onClose={() => setOpen(null)} onChanged={reload} />}
    </div>
  );
}

function OrderDrawer({ number, onClose, onChanged }) {
  const toast = useToast();
  const { data, error, reload } = useApi(`/admin/orders/${number}`);
  const [tracking, setTracking] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState({});
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const o = data?.order;

  const move = async (to) => {
    setBusy(to); setErr({});
    try {
      await api.patch(`/admin/orders/${number}`, { status: to, note, trackingNumber: tracking || undefined });
      toast(`${number} → ${to}`);
      setNote(''); reload(); onChanged();
    } catch (e) { setErr(e.fields || {}); toast(errorText(e), 'bad'); } finally { setBusy(''); }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Order ${number}`}>
      <aside className="anim-in h-full w-full max-w-xl overflow-y-auto border-l border-line bg-bg p-5 sm:p-7" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-sm text-accent">{number}</p>
            {o && <p className="mt-1 text-sm text-mute">{new Date(o.createdAt).toLocaleString()} · {o.email}</p>}
          </div>
          <Btn tone="ghost" size="sm" onClick={onClose} aria-label="Close">✕</Btn>
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
        {!o ? <Loading /> : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2"><Status value={o.status} /><Status value={o.paymentStatus} /><span className="text-xs text-faint">{o.paymentMethod}</span></div>

            <Card title="Next step">
              {FLOW[o.status].length === 0 ? <p className="text-sm text-faint">This order is closed.</p> : (
                <div className="space-y-3">
                  {FLOW[o.status].includes('shipped') && (
                    <Input label="Tracking number" value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder={o.trackingNumber || 'e.g. DHL 1234567890'} error={err.trackingNumber} />
                  )}
                  <Input label="Note (optional, internal)" value={note} onChange={(e) => setNote(e.target.value)} />
                  <div className="flex flex-wrap gap-2">
                    {FLOW[o.status].map((s) => (
                      <Btn key={s} size="sm" tone={['cancelled', 'refunded'].includes(s) ? 'danger' : 'primary'} loading={busy === s} onClick={() => move(s)}>
                        Mark {s}
                      </Btn>
                    ))}
                  </div>
                  <p className="text-xs text-faint">The customer is emailed and sees the change live. Cancelling returns stock.</p>
                </div>
              )}
            </Card>

            <Card title="Items" pad={false}>
              <ul className="divide-y divide-line">
                {o.items.map((i) => (
                  <li key={`${i.productId}-${i.color}`} className="flex items-center gap-3 px-5 py-3">
                    {i.image && <img src={i.image} alt="" className="h-10 w-10 rounded-lg object-cover" />}
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm text-ink">{i.name}</span><span className="text-xs text-faint">{i.color} · ×{i.quantity}</span></span>
                    <span className="tabular font-mono text-sm text-ink">{money(i.unitPrice * i.quantity)}</span>
                  </li>
                ))}
              </ul>
              <dl className="tabular grid grid-cols-2 gap-y-1 border-t border-line px-5 py-4 font-mono text-xs text-mute">
                <dt>Subtotal</dt><dd className="text-right">{money(o.subtotal)}</dd>
                {o.discount > 0 && <><dt>Discount {o.couponCode}</dt><dd className="text-right text-accent">−{money(o.discount)}</dd></>}
                <dt>Shipping</dt><dd className="text-right">{money(o.shipping)}</dd>
                <dt>Tax</dt><dd className="text-right">{money(o.tax)}</dd>
                <dt className="text-ink">Total</dt><dd className="text-right text-ink">{money(o.total)}</dd>
              </dl>
            </Card>

            <Card title="Ship to">
              <p className="text-sm leading-relaxed text-ink">
                {o.address.firstName} {o.address.lastName}<br />{o.address.line1}{o.address.line2 && `, ${o.address.line2}`}<br />
                {o.address.city}{o.address.state && `, ${o.address.state}`} {o.address.zip} · {o.address.country}<br />
                <span className="text-mute">{o.address.phone}</span>
              </p>
              {o.trackingNumber && <p className="mt-3 text-sm text-mute">Tracking: <span className="font-mono text-ink">{o.trackingNumber}</span></p>}
            </Card>

            <Card title="Timeline">
              <ol className="space-y-3 border-l border-line pl-4">
                {o.timeline.map((e, i) => (
                  <li key={i} className="relative">
                    <span className={cx('absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full', i === o.timeline.length - 1 ? 'bg-accent' : 'bg-line-2')} />
                    <p className="text-sm text-ink"><span className="capitalize">{e.status}</span> {e.note && <span className="text-mute">— {e.note}</span>}</p>
                    <p className="text-xs text-faint">{new Date(e.at).toLocaleString()} · {e.actor}</p>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        )}
      </aside>
    </div>
  );
}
