import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Grid2x2, Layers, Search, ShoppingBag, Sparkles, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useUI } from '../context/UIContext';
import { vaultPortal } from './transitions';

/**
 * Command dock — a floating glass node at the bottom of the screen that
 * blooms into a radial ring of destinations. Works on touch and keyboard
 * (Tab through the ring, Esc to close), and stays out of the vault.
 */
const ITEMS = [
  { id: 'shop', label: 'Shop', icon: Grid2x2, to: '/shop' },
  { id: 'drops', label: 'New drops', icon: Sparkles, to: '/new-drops' },
  { id: 'collections', label: 'Collections', icon: Layers, to: '/collections' },
  { id: 'vault', label: 'Vault', icon: Box, to: '/vault', portal: true },
  { id: 'search', label: 'Search', icon: Search, action: 'search' },
  { id: 'cart', label: 'Cart', icon: ShoppingBag, action: 'cart' },
];

const CommandDock = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { itemCount, setIsOpen } = useCart();
  const { openSearch } = useUI();
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const rootRef = useRef(null);

  // stays tucked away until the visitor has scrolled past the first screen,
  // where the hero's own buttons already do this job
  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > window.innerHeight * 0.55);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onDown = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  useEffect(() => { setOpen(false); }, [pathname]);

  if (pathname === '/vault') return null;

  const run = (item, e) => {
    setOpen(false);
    if (item.action === 'search') openSearch?.();
    else if (item.action === 'cart') setIsOpen(true);
    else if (item.portal) vaultPortal(e.currentTarget, () => navigate(item.to));
    else navigate(item.to);
  };

  return (
    <div ref={rootRef} className={`nv-dock ${open ? 'is-open' : ''} ${shown || open ? 'is-shown' : ''}`}>
      <ul className="nv-dock-ring" id="nv-dock-ring" aria-hidden={!open}>
        {ITEMS.map((item, i) => {
          const Icon = item.icon;
          const a = -160 + (i * 140) / (ITEMS.length - 1); // arc above the node
          return (
            <li key={item.id} style={{ '--a': `${a}deg`, '--i': i }}>
              <button
                type="button"
                tabIndex={open ? 0 : -1}
                onClick={(e) => run(item, e)}
                className="nv-dock-item"
                aria-label={item.label}
                data-magnetic="0.3"
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                {item.id === 'cart' && itemCount > 0 && <span className="nv-dock-count">{itemCount}</span>}
                <span className="nv-dock-label">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        className="nv-dock-node"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="nv-dock-ring"
        aria-label={open ? 'Close navigation' : 'Open navigation'}
      >
        <span className="nv-dock-core" aria-hidden="true">{open ? <X className="h-4 w-4" /> : <span className="nv-dock-glyph" />}</span>
        <span className="nv-dock-text">{open ? 'CLOSE' : 'NAVIGATE'}</span>
      </button>
    </div>
  );
};

export default CommandDock;
