import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Btn, StatusPill, cx, date, money } from './ui.jsx';

const STEPS = ['placed', 'paid', 'processing', 'shipped', 'delivered'];
const LABEL = { placed: 'Placed', paid: 'Paid', processing: 'Preparing', shipped: 'Shipped', delivered: 'Delivered' };

/** Progress rail: placed → paid → preparing → shipped → delivered. */
export function OrderProgress({ order }) {
  if (['cancelled', 'refunded'].includes(order.status)) {
    return <p className="text-sm text-text-muted">This order was {order.status} on {date(order.updatedAt)}.</p>;
  }
  const reached = new Set(order.timeline.map((t) => t.status));
  // cash on delivery skips "paid" until delivery
  const steps = order.paymentMethod === 'cod' ? STEPS.filter((s) => s !== 'paid') : STEPS;
  const current = Math.max(0, ...steps.map((s, i) => (reached.has(s) || order.status === s ? i : -1)));
  return (
    <ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }} aria-label="Order progress">
      {steps.map((s, i) => (
        <li key={s} className="min-w-0">
          <span className={cx('block h-1.5 rounded-full transition-colors', i <= current ? 'bg-accent' : 'bg-border/60')} />
          <span className={cx('mt-2 block truncate text-[10px] uppercase tracking-[0.14em]', i <= current ? 'text-text' : 'text-text-subtle')}>{LABEL[s]}</span>
        </li>
      ))}
    </ol>
  );
}

export default function OrderCard({ order, onCancel, cancelling, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const canCancel = ['pending', 'paid'].includes(order.status) && onCancel;
  return (
    <article className="rounded-2xl border border-border bg-surface/50">
      <button type="button" className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 p-5 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-sm text-text">{order.number}</span>
          <span className="text-xs text-text-muted">{date(order.createdAt)} · {order.items.reduce((s, i) => s + i.quantity, 0)} items</span>
        </span>
        <StatusPill status={order.status} />
        <span className="font-display text-lg font-semibold text-text">{money(order.total)}</span>
        <svg className={cx('h-4 w-4 text-text-muted transition-transform', open && 'rotate-180')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="space-y-5 border-t border-border px-5 pb-5 pt-5">
          <OrderProgress order={order} />
          {order.trackingNumber && <p className="text-sm text-text-muted">Tracking number: <span className="font-mono text-text">{order.trackingNumber}</span></p>}
          <ul className="space-y-3">
            {order.items.map((i) => (
              <li key={`${i.productId}-${i.color}`} className="flex items-center gap-3">
                {i.image && <img src={i.image} alt="" className="h-12 w-12 rounded-lg object-cover" loading="lazy" />}
                <span className="min-w-0 flex-1">
                  <Link to={`/product/${i.productId}`} className="block truncate text-sm text-text hover:text-accent">{i.name}</Link>
                  <span className="text-xs text-text-muted">{i.color ? `${i.color} · ` : ''}Qty {i.quantity}</span>
                </span>
                <span className="text-sm text-text">{money(i.unitPrice * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="grid grid-cols-2 gap-y-1 text-sm text-text-muted sm:max-w-xs sm:ml-auto">
            <dt>Subtotal</dt><dd className="text-right text-text">{money(order.subtotal)}</dd>
            {order.discount > 0 && <><dt>Discount {order.couponCode && `(${order.couponCode})`}</dt><dd className="text-right text-accent">−{money(order.discount)}</dd></>}
            <dt>Shipping</dt><dd className="text-right text-text">{order.shipping ? money(order.shipping) : 'Free'}</dd>
            <dt>Tax</dt><dd className="text-right text-text">{money(order.tax)}</dd>
            <dt className="font-medium text-text">Total</dt><dd className="text-right font-medium text-text">{money(order.total)}</dd>
          </dl>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-text-muted">
            <span>Ships to {order.address.firstName} {order.address.lastName}, {order.address.city} · {order.paymentMethod === 'cod' ? 'Cash on delivery' : `Paid by ${order.paymentMethod}`}</span>
            {canCancel && <Btn size="sm" variant="danger" loading={cancelling} onClick={() => onCancel(order)}>Cancel order</Btn>}
          </div>
        </div>
      )}
    </article>
  );
}
