import { useState } from 'react';
import { api, backend, errorText } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

/** "Sold out — email me when it's back." The admin restock sends the emails. */
export default function BackInStock({ product }) {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [state, setState] = useState({ status: 'idle', text: '' });
  if (!backend.online) return <p className="text-sm text-error">Sold out</p>;
  const submit = async (e) => {
    e.preventDefault();
    setState({ status: 'busy', text: '' });
    try {
      await api.post(`/products/${product.id}/notify`, { email });
      setState({ status: 'done', text: `We'll email ${email} the moment ${product.name} is back.` });
    } catch (err) { setState({ status: 'error', text: errorText(err) }); }
  };
  return (
    <div className="rounded-2xl border border-error/30 bg-error/5 p-4">
      <p className="mb-3 text-sm font-medium text-error">Sold out — get notified when it's back</p>
      {state.status === 'done' ? (
        <p className="text-sm text-accent" role="status">{state.text}</p>
      ) : (
        <form onSubmit={submit} className="flex gap-2">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" aria-label="Email for restock alert"
            className="min-w-0 flex-1 rounded-xl border border-border bg-bg/60 px-4 py-2.5 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-accent/60" />
          <button type="submit" disabled={state.status === 'busy'} className="rounded-xl bg-accent px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-bg disabled:opacity-50">Notify me</button>
        </form>
      )}
      {state.status === 'error' && <p className="mt-2 text-xs text-error" role="alert">{state.text}</p>}
    </div>
  );
}
