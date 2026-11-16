import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, backend, errorText } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Btn, Field, Notice, Panel } from '../components/ui.jsx';

/** /forgot-password (request a link) and /reset-password?token=… (choose a new password). */
export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token');
  return (
    <div className="min-h-screen px-4 pb-24 pt-28 sm:px-6 lg:pt-32">
      <div className="mx-auto max-w-md space-y-6">
        <header>
          <p className="mb-3 text-xs uppercase tracking-[0.24em] text-accent">Account recovery</p>
          <h1 className="font-display text-4xl font-bold text-text">{token ? 'Choose a new password' : 'Forgot your password?'}</h1>
        </header>
        {!backend.online ? <Notice>Password reset needs the store backend running.</Notice> : token ? <NewPassword token={token} /> : <RequestLink />}
        <p className="text-sm text-text-muted"><Link to="/sign-in" className="text-accent hover:underline">← Back to sign in</Link></p>
      </div>
    </div>
  );
}

function RequestLink() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ status: 'idle', text: '' });
  const submit = async (e) => {
    e.preventDefault();
    setState({ status: 'busy', text: '' });
    try {
      await api.post('/auth/forgot', { email });
      setState({ status: 'done', text: `If an account exists for ${email}, a reset link is on its way. It works for one hour.` });
    } catch (err) { setState({ status: 'error', text: errorText(err) }); }
  };
  return (
    <Panel>
      {state.status === 'done' ? <Notice tone="success">{state.text}</Notice> : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-text-muted">Enter your account email and we'll send you a link to set a new password.</p>
          <Field label="Email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          {state.status === 'error' && <Notice tone="error">{state.text}</Notice>}
          <Btn type="submit" loading={state.status === 'busy'}>Send reset link</Btn>
        </form>
      )}
    </Panel>
  );
}

function NewPassword({ token }) {
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const [pw, setPw] = useState('');
  const [state, setState] = useState({ status: 'idle', text: '', fields: {} });
  const submit = async (e) => {
    e.preventDefault();
    setState({ status: 'busy', text: '', fields: {} });
    try {
      const { user } = await api.post('/auth/reset', { token, password: pw });
      await refreshSession(user);
      navigate('/account', { replace: true });
    } catch (err) { setState({ status: 'error', text: errorText(err), fields: err.fields || {} }); }
  };
  return (
    <Panel>
      <form onSubmit={submit} className="space-y-4">
        <Field label="New password" name="password" type="password" autoComplete="new-password" required minLength={8} value={pw}
          error={state.fields.password} hint="8+ characters with letters and a number." onChange={(e) => setPw(e.target.value)} />
        {state.status === 'error' && !state.fields.password && <Notice tone="error">{state.text}</Notice>}
        <Btn type="submit" loading={state.status === 'busy'}>Save and sign in</Btn>
      </form>
    </Panel>
  );
}
