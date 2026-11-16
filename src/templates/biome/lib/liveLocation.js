import { createContext, useContext } from 'react';

/**
 * The router's *live* location.
 *
 * App renders <Routes location={location}> inside an AnimatePresence page
 * transition, and <Routes location> re-provides React Router's location
 * context — so a page that is animating out keeps seeing its own, frozen URL
 * from useLocation(). Full-screen takeovers (the vault) need the real current
 * URL to get out of the way the instant the visitor leaves.
 */
export const LiveLocationContext = createContext(null);
export const useLiveLocation = () => useContext(LiveLocationContext);
