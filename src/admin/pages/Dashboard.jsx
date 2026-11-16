import { Card, ErrorNote, Loading, PageHead, Status, money, num, useApi, cx } from '../ui.jsx';
import { RevenueChart, Funnel } from '../charts.jsx';

export default function Dashboard({ go, tick }) {
  const { data, error, loading } = useApi('/admin/stats?days=14', [tick]);
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data && loading) return <Loading />;
  const d = data;
  const wow = d.revenue.prevWeek ? ((d.revenue.week - d.revenue.prevWeek) / d.revenue.prevWeek) * 100 : null;
  const kpis = [
    { label: 'Revenue today', value: money(d.revenue.today, 0), sub: `${d.orders.today} orders` },
    { label: 'Last 7 days', value: money(d.revenue.week, 0), sub: wow == null ? `${d.orders.week} orders` : `${wow >= 0 ? '▲' : '▼'} ${Math.abs(wow).toFixed(0)}% vs prior week`, tone: wow == null ? null : wow >= 0 ? 'good' : 'bad' },
    { label: 'Avg order (30d)', value: money(d.orders.aov, 0), sub: `${d.orders.month} orders` },
    { label: 'Customers', value: num(d.customers), sub: `+${d.newCustomers} this week · ${d.subscribers} subscribers` },
  ];
  return (
    <div className="space-y-5">
      <PageHead title="Overview" sub={<><span className="mr-2 inline-block h-2 w-2 rounded-full bg-good align-middle" />{d.liveVisitors} live connection{d.liveVisitors === 1 ? '' : 's'}</>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="anim-in rounded-2xl border border-line bg-panel p-4 sm:p-5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-faint">{k.label}</p>
            <p className="tabular mt-2 font-mono text-xl text-ink sm:text-2xl">{k.value}</p>
            <p className={cx('mt-1 text-xs', k.tone === 'good' ? 'text-good' : k.tone === 'bad' ? 'text-bad' : 'text-mute')}>{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Revenue" className="lg:col-span-2"><RevenueChart series={d.series} /></Card>
        <Card title="Funnel · 7 days">
          <Funnel steps={[
            { label: 'Visitors', value: d.funnel.sessions },
            { label: 'Added to cart', value: d.funnel.carts },
            { label: 'Started checkout', value: d.funnel.checkouts },
            { label: 'Ordered', value: d.funnel.orders },
          ]} />
          <p className="mt-4 text-xs text-faint">From first-party analytics — no cookies or third parties.</p>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Orders by status" action={<button type="button" onClick={() => go('orders')} className="text-xs text-accent hover:underline">All orders →</button>}>
          <ul className="space-y-2">
            {['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'].map((s) => (
              <li key={s}>
                <button type="button" onClick={() => go('orders', { status: s })} className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 hover:bg-panel-2">
                  <Status value={s} /><span className="tabular font-mono text-sm text-ink">{d.statusCounts[s] || 0}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Top products · 30 days">
          {d.topProducts.length === 0 ? <p className="text-sm text-faint">No sales yet.</p> : (
            <ul className="space-y-3">
              {d.topProducts.map((p) => {
                const max = d.topProducts[0].revenue || 1;
                return (
                  <li key={p.id}>
                    <div className="mb-1 flex justify-between gap-2 text-sm"><span className="truncate text-ink">{p.name}</span><span className="tabular shrink-0 font-mono text-mute">{money(p.revenue, 0)}</span></div>
                    <div className="h-1.5 rounded-full bg-line"><div className="h-full rounded-full bg-accent-2" style={{ width: `${(p.revenue / max) * 100}%` }} /></div>
                    <p className="mt-1 text-[11px] text-faint">{p.units} sold</p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card title="Needs attention">
          <ul className="space-y-2 text-sm">
            {d.lowStock.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <button type="button" className="truncate text-left text-ink hover:text-accent" onClick={() => go('products')}>{p.name}</button>
                <span className={cx('tabular shrink-0 font-mono text-xs', p.stock === 0 ? 'text-bad' : 'text-warn')}>{p.stock === 0 ? 'SOLD OUT' : `${p.stock} left`}</span>
              </li>
            ))}
            {d.lowStock.length === 0 && <li className="text-faint">Stock levels look healthy.</li>}
            {d.unreadMessages > 0 && <li><button type="button" className="text-accent hover:underline" onClick={() => go('inbox')}>{d.unreadMessages} unread message{d.unreadMessages > 1 ? 's' : ''} →</button></li>}
            {d.stockAlerts > 0 && <li className="text-mute">{d.stockAlerts} customer{d.stockAlerts > 1 ? 's' : ''} waiting for restocks</li>}
          </ul>
        </Card>
      </div>

      {d.templates.length > 0 && (
        <Card title="Design usage · 30 days (page views)">
          <div className="flex flex-wrap gap-6">
            {d.templates.map((t) => <div key={t.template}><p className="text-xs uppercase tracking-wider text-faint">{t.template}</p><p className="tabular font-mono text-lg text-ink">{num(t.n)}</p></div>)}
          </div>
        </Card>
      )}
    </div>
  );
}
