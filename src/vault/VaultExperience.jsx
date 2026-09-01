import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import VaultCanvas from './scene/VaultCanvas';
import VaultOverlayUI from './overlay/VaultOverlayUI';
import VaultDomFallback from './fallback/VaultDomFallback';
import { resetVault } from './state/vaultStore';
import { resetPlayer } from './state/playerStore';
import { resetControls } from './state/controlStore';
import { useVaultKeyboard } from './hooks/useVaultKeyboard';
import { useVaultPointer } from './hooks/useVaultPointer';
import { scrollLock } from '../utils/helpers';

/**
 * The actual 3D bundle — this whole module is what gets code-split behind
 * React.lazy() in VaultRoute. Combines the canvas and its DOM overlay, locks
 * page scroll (the vault is a fixed full-viewport scene, not a scroll page),
 * and re-arms the entrance sequence on every fresh mount.
 */
const VaultExperience = ({ isTouch }) => {
  const location = useLocation();
  const [contextLost, setContextLost] = useState(false);

  // WASD / arrows to walk, E to enter an exhibit, Esc to leave one.
  useVaultKeyboard();
  // Press-and-drag: steers the courier or orbits the camera, depending on
  // which scheme the player picked on the way in.
  useVaultPointer();

  useEffect(() => {
    resetVault();
    // The player is a module singleton too — without this, a second visit
    // would start wherever the last one left the courier standing.
    resetPlayer();
    // Ask again on every visit. The previous answer is remembered and
    // pre-marked, so returning is one click — but a scheme chosen weeks ago
    // on a different device is not something to silently reinstate.
    resetControls();
    scrollLock(true);
    return () => scrollLock(false);
  }, []);

  const handleContextLost = useCallback(() => setContextLost(true), []);

  // App.jsx's route-level AnimatePresence keeps this component mounted for
  // the outer page-transition's exit animation even after the URL has moved
  // on (e.g. clicking a product inside the exhibition panel navigates to
  // /product/:id). useLocation() here reads the router's live location —
  // independent of the frozen `location` App.jsx's <Routes> matched against
  // — so the full-viewport portal disappears the instant the URL changes,
  // rather than staying pinned over whatever page loads next until that
  // outer exit animation happens to finish.
  if (location.pathname !== '/vault') {
    scrollLock(false);
    return null;
  }

  if (contextLost) {
    return <VaultDomFallback reason="error" />;
  }

  // Portalled to <body>: App.jsx's page-transition wrapper applies a
  // transform to animate route changes, and a transformed ancestor creates a
  // new containing block for `position: fixed` descendants — without this,
  // the vault's full-viewport takeover would be fixed to that wrapper's box
  // instead of the actual viewport.
  return createPortal(
    <div className="fixed inset-0 z-[45] bg-bg">
      <VaultCanvas isTouch={isTouch} onContextLost={handleContextLost} />
      <VaultOverlayUI isTouch={isTouch} />
    </div>,
    document.body
  );
};

export default VaultExperience;
