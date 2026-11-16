import { useEffect } from 'react';
import { track } from './api.js';

/** First-party page analytics (feeds the admin dashboard's funnel and design stats). */
export function useAnalytics(location) {
  const path = location.pathname;
  useEffect(() => {
    track('page_view', { path });
    if (path === '/vault') track('vault_enter');
  }, [path]);
}
