import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLiveLocation } from '../lib/liveLocation';
import { ArrowLeft, ArrowRight, ShoppingBag, Star } from 'lucide-react';
import VaultEngine from './engine/VaultEngine';
import VaultAudio, { TRACKS } from './engine/VaultAudio';
import { T, totalUnits, unitForCard, sectionFactors } from './engine/timeline';
import ScrambleText from '../components/ScrambleText';
import VaultDomFallback from './fallback/VaultDomFallback';
import { products as ALL_PRODUCTS, categories } from '../data/products';
import { useCart } from '../context/CartContext';
import { useUI } from '../context/UIContext';
import { formatPrice, scrollLock } from '../utils/helpers';
import './vault.css';

const REAL_CATEGORIES = categories.filter((c) => c.id !== 'all' && c.count > 0);
const FILTERS = [{ id: 'all', name: 'Everything' }, ...REAL_CATEGORIES];

/**
 * The vault: a single scroll-driven WebGL film. Scrolling the (invisible)
 * scroller drives a timeline — logo ring → dive through a particle forest →
 * hero → a helix of product cards around an iridescent spine. All 3D lives in
 * VaultEngine; this component owns the DOM layer, input, sound and commerce.
 */
const VaultExperience = ({ lite = false }) => {
  const routeLocation = useLocation();
  // live URL, not the frozen one an exiting route sees (see lib/liveLocation)
  const location = useLiveLocation() ?? routeLocation;
  const navigate = useNavigate();
  const { addItem, itemCount, items, setIsOpen, isOpen: cartOpen } = useCart();
  const cartOpenRef = useRef(cartOpen);
  const cartClosedAtRef = useRef(0);
  useEffect(() => {
    // The drawer handles Esc itself and may close before our listener runs,
    // so remember when it closed and ignore that same keypress.
    if (cartOpenRef.current && !cartOpen) cartClosedAtRef.current = performance.now();
    cartOpenRef.current = cartOpen;
  }, [cartOpen]);
  const { showToast } = useUI();

  const canvasRef = useRef(null);
  const scrollerRef = useRef(null);
  const overlayRef = useRef(null);
  const engineRef = useRef(null);
  const audioRef = useRef(null);
  const lastIndexRef = useRef(-1);

  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [entered, setEntered] = useState(false);
  const [muted, setMuted] = useState(true);
  const [track, setTrack] = useState(0);
  const [filter, setFilter] = useState('all');
  const [active, setActive] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [failed, setFailed] = useState(false);

  const list = useMemo(
    () => (filter === 'all' ? ALL_PRODUCTS : ALL_PRODUCTS.filter((p) => p.category === filter)),
    [filter],
  );
  const listRef = useRef(list);
  useEffect(() => { listRef.current = list; }, [list]);
  const cartCount = typeof itemCount === 'number' ? itemCount : (items || []).reduce((n, i) => n + i.quantity, 0);

  /* ---------- engine + audio lifecycle */
  useEffect(() => {
    scrollLock(true);
    let engine;
    try {
      engine = new VaultEngine(canvasRef.current, {
        lite,
        onProgress: (p) => setProgress((prev) => Math.max(prev, 0.35 + p * 0.65)),
      });
    } catch (err) {
      console.error('[vault] WebGL init failed', err);
      setFailed(true);
      return () => scrollLock(false);
    }
    engineRef.current = engine;
    // QA hook: ?nvtest exposes the engine so automated checks can jump the timeline
    if (new URLSearchParams(window.location.search).has('nvtest')) window.__nvEngine = engine;
    audioRef.current = new VaultAudio();
    setProgress(0.35);

    let cancelled = false;
    const fonts = Promise.race([
      Promise.all([document.fonts?.ready, document.fonts?.load('500 52px Unbounded')].map((pr) => pr?.catch?.(() => {}))),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
    const minTime = new Promise((r) => setTimeout(r, 1400));
    fonts
      // never let a slow image host or font CDN trap the visitor on the loader
      .then(() => Promise.all([
        Promise.race([engine.preload(listRef.current, 5), new Promise((r) => setTimeout(r, 7000))]),
        minTime,
      ]))
      .then(() => { if (!cancelled) { setProgress(1); setTimeout(() => !cancelled && setReady(true), 350); } });

    const unsub = engine.subscribe((st) => {
      const el = overlayRef.current;
      if (el) {
        const f = sectionFactors(st.s, st.count);
        el.style.setProperty('--intro', f.intro.toFixed(3));
        el.style.setProperty('--hero', f.hero.toFixed(3));
        el.style.setProperty('--prod', f.products.toFixed(3));
        el.style.setProperty('--outro', f.outro.toFixed(3));
        el.dataset.prod = f.products > 0.5 ? '1' : '0';
        el.dataset.hero = f.hero > 0.5 ? '1' : '0';
        el.dataset.outro = f.outro > 0.5 ? '1' : '0';
        const rail = st.count > 1 ? st.rawIndex / (st.count - 1) : 0;
        el.style.setProperty('--rail', rail.toFixed(4));
      }
      audioRef.current?.setVelocity(st.vel);
      if (st.index !== lastIndexRef.current) {
        lastIndexRef.current = st.index;
        setActive(st.index);
        if (st.s > T.DIVE_END - 0.2) audioRef.current?.sfx('card');
      }
    });

    const onResize = () => engine.resize();
    window.addEventListener('resize', onResize);
    return () => {
      cancelled = true;
      unsub();
      window.removeEventListener('resize', onResize);
      engine.dispose();
      audioRef.current?.dispose();
      engineRef.current = null;
      scrollLock(false);
    };
  }, [lite]);

  /* ---------- products into the helix */
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setProducts(list);
    lastIndexRef.current = -1;
    const sc = scrollerRef.current;
    if (sc && sc.scrollTop / sc.clientHeight > T.HERO_OUT) {
      sc.scrollTo({ top: unitForCard(0) * sc.clientHeight, behavior: 'auto' });
      engine.jumpTo(unitForCard(0) - 0.3);
    }
  }, [list]);

  /* ---------- input */
  const onScroll = useCallback(() => {
    const sc = scrollerRef.current;
    if (!sc || !engineRef.current) return;
    engineRef.current.setScroll(sc.scrollTop / sc.clientHeight);
  }, []);

  const toNdc = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1];
  };

  const onPointerMove = useCallback((e) => {
    const engine = engineRef.current;
    if (!engine) return;
    const [x, y] = toNdc(e);
    engine.setPointer(x, y);
    if (e.pointerType === 'mouse') {
      const hit = engine.pick(x, y);
      engine.setHovered(hit);
      setHovering((prev) => {
        if (!prev && hit >= 0) audioRef.current?.sfx('tick');
        return hit >= 0;
      });
    }
  }, []);

  // dolly the camera into the card, flash, then route to the product
  const flyingRef = useRef(false);
  const openProduct = useCallback((p) => {
    if (!p || flyingRef.current) return;
    flyingRef.current = true;
    overlayRef.current?.classList.add('is-leaving');
    audioRef.current?.sfx('click');
    engineRef.current?.flyInto();
    setTimeout(() => navigate(`/product/${p.id}`), 720);
  }, [navigate]);

  const scrollToCard = useCallback((i) => {
    const sc = scrollerRef.current;
    if (!sc) return;
    sc.scrollTo({ top: unitForCard(i) * sc.clientHeight, behavior: 'smooth' });
  }, []);

  const onCanvasClick = useCallback((e) => {
    const engine = engineRef.current;
    if (!engine || e.target.closest('[data-ui]')) return;
    const [x, y] = toNdc(e);
    const hit = engine.pick(x, y);
    if (hit < 0) return;
    audioRef.current?.sfx('click');
    if (hit === lastIndexRef.current) openProduct(listRef.current[hit]);
    else scrollToCard(hit);
  }, [openProduct, scrollToCard]);

  useEffect(() => {
    const onKey = (e) => {
      if (!entered) return;
      if (e.key === 'Escape') {
        // Esc closes the cart drawer first; only a second Esc leaves the vault
        if (cartOpenRef.current || performance.now() - cartClosedAtRef.current < 500) return;
        navigate('/');
        return;
      }
      const sc = scrollerRef.current;
      if (!sc || sc.scrollTop / sc.clientHeight < T.DIVE_END - 0.3) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        scrollToCard(Math.min(lastIndexRef.current + 1, listRef.current.length - 1));
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollToCard(Math.max(lastIndexRef.current - 1, 0));
      } else if (e.key === 'Enter' && listRef.current[lastIndexRef.current]) {
        openProduct(listRef.current[lastIndexRef.current]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [entered, navigate, scrollToCard, openProduct]);

  /* ---------- actions */
  const enter = async (withSound) => {
    audioRef.current?.sfx('click');
    setEntered(true);
    setMuted(!withSound);
    await audioRef.current?.start(!withSound);
    scrollerRef.current?.focus({ preventScroll: true });
  };

  const toggleSound = async () => {
    const next = !muted;
    setMuted(next);
    await audioRef.current?.start(next);
    if (!next) audioRef.current?.sfx('click');
  };

  const changeTrack = (dir) => {
    const next = (track + dir + TRACKS.length) % TRACKS.length;
    setTrack(next);
    audioRef.current?.setTrack(next);
    audioRef.current?.sfx('tick');
  };

  const pickFilter = (id) => {
    audioRef.current?.sfx('click');
    setFilter(id);
  };

  const product = list[Math.min(active, list.length - 1)];
  const addToCart = () => {
    if (!product) return;
    addItem(product, 1, product.colors?.[0]?.name);
    audioRef.current?.sfx('click');
    showToast?.(`${product.name} added to cart`, 'success');
  };

  // Leaving the route: release the page scroll straight away instead of
  // waiting for the outer page transition to unmount us.
  const onVaultRoute = location.pathname === '/vault';
  useEffect(() => {
    if (!onVaultRoute) scrollLock(false);
  }, [onVaultRoute]);

  // Route-transition guard: App's AnimatePresence keeps this mounted briefly
  // after the URL changes; hide the full-screen portal immediately.
  if (!onVaultRoute) return null;
  if (failed) return <VaultDomFallback reason="error" />;

  const total = totalUnits(list.length);

  return createPortal(
    <div className={`vault-root fixed inset-0 z-[45] bg-[#05080b] ${hovering ? 'cursor-pointer' : ''}`}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />

      <div
        ref={scrollerRef}
        tabIndex={-1}
        className={`vault-scroller absolute inset-0 outline-none ${entered ? 'overflow-y-auto' : 'overflow-hidden'}`}
        onScroll={onScroll}
        onPointerMove={onPointerMove}
        onClick={onCanvasClick}
      >
        <div style={{ height: `${(total + 1) * 100}vh` }} aria-hidden="true" />

        {/* DOM layer — fixed inside the scroller so wheel events over it still scroll */}
        <div ref={overlayRef} className="vault-overlay fixed inset-0 pointer-events-none select-none" data-entered={entered ? '1' : '0'}>
          {/* top bar */}
          <header className="vault-top absolute inset-x-0 top-0 flex items-start justify-between p-4 sm:p-6">
            <button data-ui type="button" onClick={() => navigate('/')} className="vault-pill pointer-events-auto" aria-label="Exit the vault">
              <ArrowLeft className="h-3.5 w-3.5" /> <span>EXIT</span>
            </button>
            <div className="flex items-center gap-2">
              <button data-ui type="button" onClick={toggleSound} className="vault-pill pointer-events-auto" aria-label={muted ? 'Turn sound on' : 'Turn sound off'} aria-pressed={!muted}>
                <span className={`vault-bars ${muted ? 'is-muted' : ''}`} aria-hidden="true"><i /><i /><i /><i /></span>
              </button>
              <div className="vault-pill vault-pill-wide pointer-events-auto">
                <button data-ui type="button" onClick={() => navigate('/shop')}>SHOP</button>
                <span className="vault-pill-line" aria-hidden="true" />
                <button data-ui type="button" onClick={() => setIsOpen?.(true)} className="inline-flex items-center gap-1.5">
                  CART{cartCount > 0 && <span className="vault-count">{cartCount}</span>}
                </button>
              </div>
            </div>
          </header>

          {/* intro */}
          <div className="vault-intro absolute inset-x-0 top-[18%] text-center" style={{ opacity: 'var(--intro, 1)' }}>
            <p className="vault-mono vault-blink">SCROLL DOWN</p>
          </div>

          {/* hero */}
          <section className="vault-hero absolute inset-0 flex items-center px-6 sm:px-12 lg:px-[12vw]" style={{ opacity: 'var(--hero, 0)' }}>
            <div className="grid w-full items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
              <h1 className="vault-hero-title">
                <span className="block">CURATED</span>
                <span className="block">FUTURE</span>
                <span className="block">ARTIFACTS</span>
              </h1>
              <div className="vault-mono vault-hero-copy space-y-5 lg:pl-[8vw]">
                <p>THE NEON VAULT · EST. 2026</p>
                <p>WE COLLECT THE SHARPEST HARDWARE ON EARTH AND LOCK IT AWAY IN ONE PLACE</p>
                <p>{ALL_PRODUCTS.length} ARTIFACTS · {REAL_CATEGORIES.length} CATEGORIES · ONE DIVE</p>
              </div>
            </div>
          </section>

          {/* products */}
          <div className="vault-products" style={{ opacity: 'var(--prod, 0)' }}>
            {product && (
              <aside data-ui className="vault-panel pointer-events-auto" aria-live="polite">
                <p className="vault-mono text-[11px] text-[#7fe0d2]">
                  [ {String(active + 1).padStart(2, '0')} / {String(list.length).padStart(2, '0')} ] · {product.category.toUpperCase()}
                </p>
                <ScrambleText as="h2" text={product.name} trigger={product.id} className="vault-panel-title" />
                <p className="vault-mono vault-panel-desc">{product.shortDescription}</p>
                <div className="flex items-baseline gap-3">
                  <span className="vault-price">{formatPrice(product.price)}</span>
                  {product.originalPrice && <span className="vault-mono text-xs text-white/40 line-through">{formatPrice(product.originalPrice)}</span>}
                  <span className="vault-mono ml-auto inline-flex items-center gap-1 text-xs text-white/60">
                    <Star className="h-3 w-3 fill-current text-[#c4d94a]" /> {product.rating}
                  </span>
                </div>
                <div className="mt-1 flex gap-2">
                  <button type="button" className="vault-btn vault-btn-solid" onClick={addToCart} disabled={!product.inStock}>
                    <ShoppingBag className="h-3.5 w-3.5" /> {product.inStock ? 'ADD TO CART' : 'SOLD OUT'}
                  </button>
                  <button type="button" className="vault-btn" onClick={() => openProduct(product)}>
                    VIEW <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </aside>
            )}

            <nav data-ui className="vault-filters pointer-events-auto" aria-label="Filter the vault">
              <p className="vault-mono mb-3 text-white/90">WHAT ARE YOU LOOKING FOR?</p>
              <ul className="space-y-1.5">
                {FILTERS.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => pickFilter(f.id)}
                      onMouseEnter={() => audioRef.current?.sfx('tick')}
                      className={`vault-filter ${filter === f.id ? 'is-active' : ''}`}
                      aria-pressed={filter === f.id}
                    >
                      -&gt; {f.name.toUpperCase()}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="vault-rail" aria-hidden="true"><span /></div>
          </div>

          {/* player */}
          <div data-ui className="vault-player pointer-events-auto" style={{ opacity: entered ? 1 : 0 }}>
            <button type="button" onClick={() => changeTrack(-1)} aria-label="Previous track">&lt;&lt;</button>
            <span className="vault-player-title">
              <ScrambleText text={TRACKS[track].title} trigger={track} /> <span className="text-white/35">--</span> NEON VAULT
            </span>
            <button type="button" onClick={() => changeTrack(1)} aria-label="Next track">&gt;&gt;</button>
          </div>

          {/* outro */}
          <section className="vault-outro absolute inset-0 flex flex-col items-center justify-center gap-6 px-6 text-center" style={{ opacity: 'var(--outro, 0)' }}>
            <p className="vault-mono text-[#7fe0d2]">THE ARTIFACT TREE · END OF THE VAULT</p>
            <h2 className="vault-hero-title !text-[clamp(2.2rem,6vw,5rem)]">SEEN ENOUGH?</h2>
            <div data-ui className="vault-outro-actions flex flex-wrap justify-center gap-3">
              <button type="button" className="vault-btn vault-btn-solid" onClick={() => navigate('/shop')}>BROWSE THE FULL SHOP <ArrowRight className="h-3.5 w-3.5" /></button>
              <button type="button" className="vault-btn" onClick={() => scrollerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}>BACK TO THE SURFACE</button>
            </div>
          </section>
        </div>
      </div>

      {/* loader */}
      <div className={`vault-loader ${entered ? 'is-gone' : ''}`} aria-hidden={entered}>
        <div className="vault-loader-ring" style={{ '--p': progress }}>
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="54" className="track" />
            <circle cx="60" cy="60" r="54" className="bar" pathLength="1" />
          </svg>
          <span className="vault-mono">{Math.round(progress * 100)}</span>
        </div>
        <div className={`vault-loader-actions ${ready ? 'is-ready' : ''}`}>
          <p className="vault-mono text-white/50">BEST WITH HEADPHONES</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button type="button" className="vault-btn vault-btn-solid" onClick={() => enter(true)} disabled={!ready}>ENTER WITH SOUND</button>
            <button type="button" className="vault-btn" onClick={() => enter(false)} disabled={!ready}>ENTER MUTED</button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default VaultExperience;
