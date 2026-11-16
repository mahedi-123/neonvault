import { useState } from 'react';
import { api, backend, errorText } from './api.js';

/**
 * Newsletter signup for any <form> that contains an email input.
 * Returns the submit handler plus a status message to render.
 */
export function useNewsletter(source = 'footer') {
  const [state, setState] = useState({ status: 'idle', text: '' });
  const onSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.querySelector('input[type="email"]');
    const email = input?.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setState({ status: 'error', text: 'Enter a valid email address.' }); return; }
    if (!backend.online) { setState({ status: 'done', text: 'Thanks! (Preview mode — start the backend to save signups.)' }); form.reset(); return; }
    setState({ status: 'busy', text: '' });
    try {
      const r = await api.post('/newsletter', { email, source });
      setState({ status: 'done', text: r.alreadySubscribed ? "You're already on the list." : "You're in. Check your inbox for 15% off." });
      form.reset();
    } catch (err) { setState({ status: 'error', text: errorText(err) }); }
  };
  return { ...state, onSubmit };
}

/** Sends the contact form to the store inbox (Admin → Messages). */
export async function sendContact(data) {
  if (!backend.online) { await new Promise((r) => setTimeout(r, 800)); return; }
  await api.post('/contact', data);
}
