/**
 * Server-Sent Events hub. The storefront keeps one EventSource open and gets
 * live stock changes (everyone) and order status changes (only the owner).
 */
export function createHub() {
  const clients = new Set();
  const hb = setInterval(() => {
    for (const c of clients) c.res.write(': hb\n\n');
  }, 25e3);
  hb.unref?.();

  return {
    attach(req, res) {
      let same = 0;
      for (const c of clients) if (c.ip === req.ip) same++;
      if (same >= 8) { res.status(429).json({ error: 'Too many live connections.' }); return; }
      res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
      res.flushHeaders?.();
      res.write('retry: 4000\n\n');
      const c = { res, ip: req.ip, sid: req.sessionToken || null, userId: req.user?.id || null, admin: req.user?.role === 'admin' };
      clients.add(c);
      req.on('close', () => clients.delete(c));
    },
    /** to: 'all' | { userId } | 'admins' */
    send(event, data, to = 'all') {
      const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      for (const c of clients) {
        if (to === 'all' || (to === 'admins' && c.admin) || (to?.userId && (c.userId === to.userId || c.admin))) c.res.write(msg);
      }
    },
    /** Signed out (or password changed): stop sending that user's private events. */
    forget({ sid, userId }) {
      for (const c of clients) {
        if ((sid && c.sid === sid) || (userId && c.userId === userId)) { c.userId = null; c.admin = false; }
      }
    },
    get size() { return clients.size; },
    close() { clearInterval(hb); for (const c of clients) c.res.end(); clients.clear(); },
  };
}
