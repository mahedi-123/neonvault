import { useState } from 'react';
import { api, errorText } from '../../shared/lib/api.js';
import { Btn, Card, Input, PageHead, useApi, useToast, when } from '../ui.jsx';

export default function Settings({ user, onSignOut }) {
  const toast = useToast();
  const [f, setF] = useState({ currentPassword: '', newPassword: '' });
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const audit = useApi('/admin/audit');
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr({});
    try { await api.post('/me/password', f); setF({ currentPassword: '', newPassword: '' }); toast('Password changed — other sessions signed out'); } catch (x) { setErr(x.fields || {}); toast(errorText(x), 'bad'); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-5">
      <PageHead title="Settings" sub={`Signed in as ${user.email}`}><Btn tone="danger" onClick={onSignOut}>Sign out</Btn></PageHead>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Change password">
          <form onSubmit={submit} className="space-y-3">
            <Input label="Current password" type="password" autoComplete="current-password" required value={f.currentPassword} error={err.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} />
            <Input label="New password" type="password" autoComplete="new-password" required value={f.newPassword} error={err.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} />
            <Btn type="submit" tone="primary" loading={busy}>Update password</Btn>
          </form>
        </Card>
        <Card title="Store rules">
          <ul className="space-y-2 text-sm text-mute">
            <li>Tax <span className="text-ink">8%</span> on the discounted subtotal</li>
            <li>Free standard shipping from <span className="text-ink">$200</span>, otherwise <span className="text-ink">$15</span></li>
            <li>Test cards: any number works · ending <span className="font-mono text-ink">0002</span> declines · <span className="font-mono text-ink">9995</span> insufficient funds</li>
            <li>Change these in <span className="font-mono text-ink">server/config.js</span></li>
          </ul>
        </Card>
        <Card title="Data">
          <p className="mb-4 text-sm text-mute">Download a complete, consistent copy of the store database (orders, customers, products). Safe to run while the store is live.</p>
          <a href="/api/admin/backup" className="inline-flex h-10 items-center rounded-lg border border-line-2 bg-panel-2 px-4 text-sm text-ink hover:border-accent/50">Download backup (.db)</a>
        </Card>
      </div>
      <Card title="Audit log" pad={false}>
        <ul className="max-h-[420px] divide-y divide-line overflow-y-auto text-sm">
          {(audit.data?.entries || []).map((a) => (
            <li key={a.id} className="flex flex-wrap justify-between gap-2 px-5 py-2.5"><span className="text-ink"><span className="font-mono text-accent">{a.action}</span> {a.target}</span><span className="text-xs text-faint">{a.email} · {when(a.created_at)}</span></li>
          ))}
          {audit.data?.entries.length === 0 && <li className="px-5 py-6 text-faint">No admin actions yet.</li>}
        </ul>
      </Card>
    </div>
  );
}
