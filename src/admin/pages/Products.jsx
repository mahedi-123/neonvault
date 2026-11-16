import { useState } from 'react';
import { api, errorText } from '../../shared/lib/api.js';
import { Btn, Card, Empty, ErrorNote, Input, Loading, PageHead, Table, money, useApi, useToast, cx } from '../ui.jsx';

export default function Products({ tick }) {
  const toast = useToast();
  const { data, error, loading, reload } = useApi('/admin/products', [tick]);
  const [filter, setFilter] = useState('');
  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState('');
  const [adding, setAdding] = useState(false);

  const set = (id, k, v) => setEdits((e) => ({ ...e, [id]: { ...e[id], [k]: v } }));
  const save = async (p) => {
    const e = edits[p.id];
    if (!e) return;
    setSaving(p.id);
    try {
      const body = {};
      if (e.price != null && e.price !== '') body.price = Number(e.price);
      if (e.stock != null && e.stock !== '') { body.stock = Math.max(0, Math.round(Number(e.stock))); body.expectedStock = p.stockCount; }
      const r = await api.patch(`/admin/products/${p.id}`, body);
      toast(r.notified ? `${p.name} saved · ${r.notified} restock email${r.notified > 1 ? 's' : ''} sent` : `${p.name} saved`);
      setEdits((x) => { const n = { ...x }; delete n[p.id]; return n; });
      reload();
    } catch (err) { toast(errorText(err), 'bad'); if (err.status === 409) reload(); } finally { setSaving(''); }
  };
  const toggle = async (p) => {
    try { await api.patch(`/admin/products/${p.id}`, { active: !p.active }); toast(`${p.name} ${p.active ? 'hidden from' : 'shown in'} the store`); reload(); } catch (err) { toast(errorText(err), 'bad'); }
  };

  const list = (data?.products || []).filter((p) => !filter || `${p.name} ${p.category} ${p.id}`.toLowerCase().includes(filter.toLowerCase()));
  const value = (data?.products || []).reduce((s, p) => s + p.price * p.stockCount, 0);

  return (
    <div className="space-y-5">
      <PageHead title="Products" sub={data ? `${data.products.length} products · ${money(value, 0)} inventory at retail` : ' '}>
        <Btn tone="primary" onClick={() => setAdding((a) => !a)}>{adding ? 'Close' : '+ New product'}</Btn>
      </PageHead>
      {adding && <NewProduct onDone={() => { setAdding(false); reload(); }} />}
      <Input placeholder="Filter by name, category or id" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter products" className="max-w-sm" />
      {error && <ErrorNote>{error}</ErrorNote>}
      <Card pad={false}>
        {!data && loading ? <Loading /> : list.length === 0 ? <Empty>No products.</Empty> : (
          <Table head={['Product', 'Price', 'Stock', 'Sold', 'Waiting', 'Rating', 'Visible', '']}>
            {list.map((p) => {
              const e = edits[p.id] || {};
              const dirty = e.price != null || e.stock != null;
              return (
                <tr key={p.id} className={cx(!p.active && 'opacity-50')}>
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-3">
                      {p.images?.[0] && <img src={p.images[0]} alt="" className="h-9 w-9 rounded-lg object-cover" loading="lazy" />}
                      <div className="min-w-0"><p className="truncate text-ink">{p.name}</p><p className="font-mono text-[10px] text-faint">{p.category}</p></div>
                    </div>
                  </td>
                  <td className="px-5 py-2.5"><input type="number" min="0" step="1" aria-label={`${p.name} price`} className="tabular h-8 w-24 rounded-md border border-line-2 bg-bg px-2 font-mono text-sm text-ink focus:border-accent/60 focus:outline-none" value={e.price ?? p.price} onChange={(ev) => set(p.id, 'price', ev.target.value)} /></td>
                  <td className="px-5 py-2.5"><input type="number" min="0" step="1" aria-label={`${p.name} stock`} className={cx('tabular h-8 w-20 rounded-md border bg-bg px-2 font-mono text-sm focus:border-accent/60 focus:outline-none', p.stockCount === 0 ? 'border-bad/50 text-bad' : p.stockCount <= 10 ? 'border-warn/40 text-warn' : 'border-line-2 text-ink')} value={e.stock ?? p.stockCount} onChange={(ev) => set(p.id, 'stock', ev.target.value)} /></td>
                  <td className="tabular px-5 py-2.5 font-mono text-mute">{p.sold}</td>
                  <td className="tabular px-5 py-2.5 font-mono text-mute">{p.waiting || '—'}</td>
                  <td className="tabular px-5 py-2.5 font-mono text-mute">{p.rating.toFixed(1)}</td>
                  <td className="px-5 py-2.5">
                    <button type="button" role="switch" aria-checked={p.active} aria-label={`${p.name} visible`} onClick={() => toggle(p)} className={cx('relative h-5 w-9 rounded-full transition-colors', p.active ? 'bg-accent' : 'bg-line-2')}>
                      <span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-bg transition-all', p.active ? 'left-[18px]' : 'left-0.5')} />
                    </button>
                  </td>
                  <td className="px-5 py-2.5 text-right">{dirty && <Btn size="sm" tone="primary" loading={saving === p.id} onClick={() => save(p)}>Save</Btn>}</td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
    </div>
  );
}

function NewProduct({ onDone }) {
  const toast = useToast();
  const [f, setF] = useState({ id: '', name: '', category: 'accessories', price: '', stock: '10', image: '', shortDescription: '' });
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr({});
    try {
      await api.post('/admin/products', { ...f, price: Number(f.price), stock: Number(f.stock), image: f.image || undefined });
      toast(`${f.name} created`); onDone();
    } catch (x) { setErr(x.fields || {}); toast(errorText(x), 'bad'); } finally { setBusy(false); }
  };
  const bind = (k) => ({ value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }), error: err[k] });
  return (
    <Card title="New product">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3">
        <Input label="Name" required {...bind('name')} onChange={(e) => setF({ ...f, name: e.target.value, id: f.id || '' })} />
        <Input label="URL id" required placeholder="nova-x-speaker" {...bind('id')} />
        <Input label="Category" required {...bind('category')} />
        <Input label="Price ($)" type="number" min="0" required {...bind('price')} />
        <Input label="Stock" type="number" min="0" {...bind('stock')} />
        <Input label="Image URL" type="url" {...bind('image')} />
        <Input label="Short description" className="sm:col-span-3" {...bind('shortDescription')} />
        <div className="sm:col-span-3"><Btn type="submit" tone="primary" loading={busy}>Create product</Btn></div>
      </form>
    </Card>
  );
}
