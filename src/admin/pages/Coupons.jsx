import { useState } from 'react';
import { api, errorText } from '../../shared/lib/api.js';
import { Btn, Card, Empty, ErrorNote, Input, Loading, PageHead, Select, Table, money, useApi, useToast, cx } from '../ui.jsx';

const describe = (c) => (c.type === 'percent' ? `${c.value}% off` : c.type === 'fixed' ? `${money(c.value / 100, 0)} off` : 'Free shipping');

export default function Coupons() {
  const toast = useToast();
  const { data, error, loading, reload } = useApi('/admin/coupons');
  const [f, setF] = useState({ code: '', description: '', type: 'percent', value: '10', minSubtotal: '0', maxUses: '', perUserOnce: false });
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true); setErr({});
    try {
      await api.post('/admin/coupons', { ...f, value: Number(f.value || 0), minSubtotal: Number(f.minSubtotal || 0), maxUses: f.maxUses ? Number(f.maxUses) : null });
      toast(`${f.code.toUpperCase()} created`);
      setF({ ...f, code: '', description: '' });
      reload();
    } catch (x) { setErr(x.fields || {}); toast(errorText(x), 'bad'); } finally { setBusy(false); }
  };
  const toggle = async (c) => { try { await api.patch(`/admin/coupons/${c.code}`, { active: !c.active }); reload(); } catch (x) { toast(errorText(x), 'bad'); } };
  const remove = async (c) => { try { await api.del(`/admin/coupons/${c.code}`); toast(`${c.code} deleted`); reload(); } catch (x) { toast(errorText(x), 'bad'); } };

  return (
    <div className="space-y-5">
      <PageHead title="Coupons" sub="Codes customers can enter at checkout. The server validates every rule." />
      <Card title="Create a code">
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-4">
          <Input label="Code" required placeholder="SUMMER20" value={f.code} error={err.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} />
          <Select label="Type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
            <option value="percent">Percent off</option><option value="fixed">Fixed amount ($)</option><option value="shipping">Free shipping</option>
          </Select>
          {f.type !== 'shipping' && <Input label={f.type === 'percent' ? 'Percent' : 'Amount ($)'} type="number" min="0" value={f.value} error={err.value} onChange={(e) => setF({ ...f, value: e.target.value })} />}
          <Input label="Min. spend ($)" type="number" min="0" value={f.minSubtotal} onChange={(e) => setF({ ...f, minSubtotal: e.target.value })} />
          <Input label="Description" className="sm:col-span-2" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Shown to the customer" />
          <Input label="Max uses (blank = unlimited)" type="number" min="1" value={f.maxUses} onChange={(e) => setF({ ...f, maxUses: e.target.value })} />
          <label className="flex items-end gap-2 pb-2.5 text-sm text-mute"><input type="checkbox" checked={f.perUserOnce} onChange={(e) => setF({ ...f, perUserOnce: e.target.checked })} className="h-4 w-4 accent-[var(--color-accent)]" /> Once per customer</label>
          <div className="sm:col-span-4"><Btn type="submit" tone="primary" loading={busy}>Create code</Btn></div>
        </form>
      </Card>
      {error && <ErrorNote>{error}</ErrorNote>}
      <Card pad={false}>
        {!data && loading ? <Loading /> : data.coupons.length === 0 ? <Empty>No codes yet.</Empty> : (
          <Table head={['Code', 'Offer', 'Rules', 'Used', 'Status', '']}>
            {data.coupons.map((c) => (
              <tr key={c.code} className={cx(!c.active && 'opacity-50')}>
                <td className="px-5 py-3 font-mono text-accent">{c.code}</td>
                <td className="px-5 py-3"><p className="text-ink">{describe(c)}</p><p className="text-xs text-faint">{c.description}</p></td>
                <td className="px-5 py-3 text-xs text-mute">{c.minSubtotal ? `Min ${money(c.minSubtotal, 0)}` : 'No minimum'}{c.perUserOnce && ' · once per customer'}</td>
                <td className="tabular px-5 py-3 font-mono text-mute">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ''}</td>
                <td className="px-5 py-3"><Btn size="sm" tone="ghost" onClick={() => toggle(c)}>{c.active ? 'Active' : 'Paused'}</Btn></td>
                <td className="px-5 py-3 text-right"><Btn size="sm" tone="danger" onClick={() => remove(c)}>Delete</Btn></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
