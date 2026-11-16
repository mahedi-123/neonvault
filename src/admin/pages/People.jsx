import { useState } from 'react';
import { api, errorText } from '../../shared/lib/api.js';
import { Btn, Card, Empty, ErrorNote, Input, Loading, PageHead, Table, money, useApi, useToast, when, cx } from '../ui.jsx';

export function Customers() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const { data, error, loading } = useApi(`/admin/customers?q=${encodeURIComponent(query)}`);
  return (
    <div className="space-y-5">
      <PageHead title="Customers" sub={data ? `${data.customers.length} accounts` : ' '} />
      <form className="flex max-w-md gap-2" onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()); }}>
        <Input className="flex-1" placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search customers" />
        <Btn type="submit">Search</Btn>
      </form>
      {error && <ErrorNote>{error}</ErrorNote>}
      <Card pad={false}>
        {!data && loading ? <Loading /> : data.customers.length === 0 ? <Empty>No customers yet.</Empty> : (
          <Table head={['Name', 'Email', 'Orders', 'Spent', 'Joined', 'Last sign-in']}>
            {data.customers.map((c) => (
              <tr key={c.id}>
                <td className="px-5 py-3 text-ink">{c.firstName} {c.lastName}{c.role === 'admin' && <span className="ml-2 rounded-full border border-accent/40 px-2 py-0.5 text-[10px] text-accent">ADMIN</span>}</td>
                <td className="px-5 py-3 text-mute">{c.email}</td>
                <td className="tabular px-5 py-3 font-mono text-mute">{c.orders}</td>
                <td className="tabular px-5 py-3 font-mono text-ink">{money(c.spent, 0)}</td>
                <td className="px-5 py-3 text-mute">{when(c.createdAt)}</td>
                <td className="px-5 py-3 text-mute">{c.lastLoginAt ? when(c.lastLoginAt) : '—'}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}

export function Inbox({ tick }) {
  const toast = useToast();
  const { data, error, loading, reload } = useApi('/admin/messages', [tick]);
  const mark = async (m) => { try { await api.patch(`/admin/messages/${m.id}`, { handled: !m.handled }); reload(); } catch (x) { toast(errorText(x), 'bad'); } };
  return (
    <div className="space-y-5">
      <PageHead title="Inbox" sub="Messages from the contact form." />
      {error && <ErrorNote>{error}</ErrorNote>}
      {!data && loading ? <Loading /> : data.messages.length === 0 ? <Card><Empty>No messages.</Empty></Card> : (
        <div className="space-y-3">
          {data.messages.map((m) => (
            <Card key={m.id} className={cx(m.handled && 'opacity-60')}>
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div><p className="text-ink">{m.subject || '(no subject)'}</p><p className="text-xs text-mute">{m.name} · <a className="text-accent hover:underline" href={`mailto:${m.email}`}>{m.email}</a> · {when(m.created_at)}</p></div>
                <Btn size="sm" tone={m.handled ? 'ghost' : 'default'} onClick={() => mark(m)}>{m.handled ? 'Reopen' : 'Mark handled'}</Btn>
              </div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-mute">{m.body}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function Reviews() {
  const toast = useToast();
  const { data, error, loading, reload } = useApi('/admin/reviews');
  const toggle = async (r) => { try { await api.patch(`/admin/reviews/${r.id}`, { hidden: !r.hidden }); toast(r.hidden ? 'Review restored' : 'Review hidden'); reload(); } catch (x) { toast(errorText(x), 'bad'); } };
  return (
    <div className="space-y-5">
      <PageHead title="Reviews" sub="Hide spam or abusive reviews. Hidden reviews don't count toward ratings." />
      {error && <ErrorNote>{error}</ErrorNote>}
      {!data && loading ? <Loading /> : data.reviews.length === 0 ? <Card><Empty>No written reviews yet.</Empty></Card> : (
        <div className="space-y-3">
          {data.reviews.map((r) => (
            <Card key={r.id} className={cx(r.hidden && 'opacity-50')}>
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-ink"><span className="font-mono text-accent">{'★'.repeat(r.rating)}<span className="text-line-2">{'★'.repeat(5 - r.rating)}</span></span> {r.title}</p>
                  <p className="text-xs text-mute">{r.author} on {r.productName} · {when(r.createdAt)}{r.verified && ' · verified purchase'}</p>
                </div>
                <Btn size="sm" tone={r.hidden ? 'default' : 'danger'} onClick={() => toggle(r)}>{r.hidden ? 'Show' : 'Hide'}</Btn>
              </div>
              <p className="text-sm text-mute">{r.body}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function Marketing() {
  const subs = useApi('/admin/subscribers');
  const emails = useApi('/admin/emails');
  const [open, setOpen] = useState(null);
  return (
    <div className="space-y-5">
      <PageHead title="Marketing & email" sub="Newsletter list and every email the store has sent.">
        <a href="/api/admin/subscribers.csv" className="inline-flex h-10 items-center rounded-lg border border-line-2 bg-panel-2 px-4 text-sm text-ink hover:border-accent/50">Export subscribers</a>
      </PageHead>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title={`Subscribers${subs.data ? ` · ${subs.data.subscribers.length}` : ''}`} pad={false}>
          {!subs.data ? <Loading /> : subs.data.subscribers.length === 0 ? <Empty>No subscribers yet.</Empty> : (
            <ul className="max-h-[480px] divide-y divide-line overflow-y-auto">
              {subs.data.subscribers.map((s) => <li key={s.email} className="flex justify-between gap-3 px-5 py-2.5 text-sm"><span className="truncate text-ink">{s.email}</span><span className="shrink-0 text-xs text-faint">{s.source} · {when(s.created_at)}</span></li>)}
            </ul>
          )}
        </Card>
        <Card title="Outbox" pad={false}>
          {!emails.data ? <Loading /> : emails.data.emails.length === 0 ? <Empty>Nothing sent yet.</Empty> : (
            <ul className="max-h-[480px] divide-y divide-line overflow-y-auto">
              {emails.data.emails.map((m) => (
                <li key={m.id}>
                  <button type="button" className="w-full px-5 py-2.5 text-left hover:bg-panel-2" onClick={() => setOpen(open === m.id ? null : m.id)} aria-expanded={open === m.id}>
                    <p className="truncate text-sm text-ink">{m.subject}</p>
                    <p className="text-xs text-faint">{m.kind} → {m.to_addr} · {when(m.created_at)}</p>
                  </button>
                  {open === m.id && <pre className="mx-5 mb-3 whitespace-pre-wrap rounded-lg bg-bg p-3 font-mono text-xs text-mute">{m.body}</pre>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <p className="text-xs text-faint">Emails are recorded here and printed in the server console. Connect an email provider in server/lib/mailer.js to deliver them.</p>
    </div>
  );
}
