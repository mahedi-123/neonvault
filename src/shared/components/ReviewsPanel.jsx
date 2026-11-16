import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, backend, errorText } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Btn, Field, Notice, Panel, Spinner, Stars, cx, date } from './ui.jsx';

/** Real product reviews: rating breakdown, list, and write/edit your own. */
export default function ReviewsPanel({ product }) {
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ rating: 5, title: '', body: '' });
  const [writing, setWriting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErr, setFieldErr] = useState({});
  const [done, setDone] = useState('');

  const load = useCallback(async () => {
    if (!backend.online) { setData({ reviews: [], distribution: [], rating: product.rating, reviewCount: product.reviewCount, offline: true }); return; }
    try { setData(await api.get(`/products/${product.id}/reviews`)); } catch (e) { setError(errorText(e)); }
  }, [product.id, product.rating, product.reviewCount]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setFieldErr({}); setError('');
    try {
      const r = await api.post(`/products/${product.id}/reviews`, form);
      setDone(r.verified ? 'Thanks! Your review is live with a Verified Purchase badge.' : 'Thanks! Your review is live.');
      setWriting(false);
      await load();
    } catch (err) {
      setFieldErr(err.fields || {}); setError(errorText(err));
    } finally { setSaving(false); }
  };

  if (!data) return <div className="flex items-center gap-3 py-8 text-text-muted"><Spinner /> Loading reviews…</div>;
  const total = data.distribution.reduce((s, d) => s + d.count, 0);
  const mine = data.reviews.find((r) => r.mine);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="flex items-center gap-4">
          <div className="font-display text-5xl font-bold text-text">{Number(data.rating || 0).toFixed(1)}</div>
          <div>
            <Stars value={data.rating} size="h-5 w-5" />
            <p className="mt-1 text-sm text-text-muted">{Number(data.reviewCount || 0).toLocaleString()} ratings</p>
          </div>
        </div>
        {total > 0 && (
          <div className="space-y-1.5" aria-label="Rating breakdown from written reviews">
            {data.distribution.map((d) => (
              <div key={d.stars} className="flex items-center gap-3 text-xs text-text-muted">
                <span className="w-6">{d.stars}★</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border/60">
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${(d.count / total) * 100}%` }} />
                </span>
                <span className="w-6 text-right">{d.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {done && <Notice tone="success">{done}</Notice>}
      {data.offline ? (
        <Notice>Written reviews appear when the store backend is running.</Notice>
      ) : !isAuthenticated ? (
        <Notice><Link to="/sign-in" className="text-accent underline-offset-4 hover:underline">Sign in</Link> to write a review. Buyers get a Verified Purchase badge.</Notice>
      ) : !writing ? (
        <Btn variant="secondary" onClick={() => { setWriting(true); setDone(''); if (mine) setForm({ rating: mine.rating, title: mine.title, body: mine.body }); }}>
          {mine ? 'Edit your review' : 'Write a review'}
        </Btn>
      ) : (
        <Panel>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <span className="mb-1.5 block text-xs uppercase tracking-[0.14em] text-text-muted">Your rating</span>
              <Stars value={form.rating} size="h-7 w-7" onChange={(rating) => setForm({ ...form, rating })} label="Choose a rating" />
            </div>
            <Field label="Title (optional)" name="title" maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Field as="textarea" label="Review" name="body" maxLength={2000} required value={form.body} error={fieldErr.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="What did you love? What could be better?" />
            {error && !Object.keys(fieldErr).length && <Notice tone="error">{error}</Notice>}
            <div className="flex gap-3">
              <Btn type="submit" loading={saving}>Publish review</Btn>
              <Btn variant="ghost" onClick={() => setWriting(false)}>Cancel</Btn>
            </div>
          </form>
        </Panel>
      )}

      {error && !writing && <Notice tone="error">{error}</Notice>}

      <ul className="space-y-3">
        {data.reviews.length === 0 && !data.offline && <li className="text-sm text-text-muted">No written reviews yet — be the first.</li>}
        {data.reviews.map((r) => (
          <li key={r.id} className={cx('rounded-xl border bg-surface/50 p-4', r.mine ? 'border-accent/40' : 'border-border')}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-accent/10 font-display text-sm font-bold text-accent">{r.author.slice(0, 1)}</span>
                <div>
                  <p className="text-sm font-medium text-text">{r.author}{r.mine && <span className="ml-2 text-xs text-accent">(you)</span>}</p>
                  <Stars value={r.rating} size="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-muted">
                {r.verified && <span className="rounded-full border border-accent/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent">Verified purchase</span>}
                {date(r.createdAt)}
              </div>
            </div>
            {r.title && <p className="mb-1 font-medium text-text">{r.title}</p>}
            <p className="whitespace-pre-line text-sm leading-relaxed text-text-muted">{r.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
