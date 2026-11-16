import { useEffect } from 'react';
import { clearKeys, keys } from '../state/playerStore';
import { approachZone, beginWorld, getSnapshot, nextIntroStep, openGate, startReturn } from '../state/vaultStore';
import { getWorldState } from '../state/worldStore';

/** Physical-key codes, not e.key — so the controls stay in the same place on
 *  AZERTY and Dvorak layouts, where e.key for the W position is 'z' or ','. */
const MOVEMENT = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'back',
  ArrowDown: 'back',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'run',
  ShiftRight: 'run',
};

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

/**
 * Keyboard control for the vault. Lives outside the R3F canvas because it is
 * plain window input, and because the confirm/dismiss keys act on DOM state
 * (the enter prompt, the exhibition panel) rather than on the scene.
 *
 * Held keys go into a mutable record that Player.jsx samples each frame; only
 * the discrete actions (enter, back, advance the briefing) touch the store.
 *
 * Arrow keys are preventDefault'd so the page behind the vault's fixed
 * overlay cannot scroll out from under it, and every key is released on blur —
 * otherwise alt-tabbing mid-stride leaves the courier walking forever.
 */
export function useVaultKeyboard() {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const { mode, nearZoneId, nearPortal } = getSnapshot();

      if (e.code === 'KeyE' || e.code === 'Enter') {
        if (mode === 'overview' && nearPortal) {
          e.preventDefault();
          openGate();
        } else if (mode === 'overview' && nearZoneId) {
          e.preventDefault();
          approachZone(nearZoneId);
        } else if (mode === 'intro') {
          e.preventDefault();
          nextIntroStep();
        }
        return;
      }

      if (e.code === 'Escape') {
        if (mode === 'zone' || mode === 'diving') {
          e.preventDefault();
          startReturn();
        } else if (mode === 'gate' && getWorldState().worldId) {
          // Backing out of the picker only makes sense once there is a world
          // behind it to back out into. At the very first gate there is not.
          e.preventDefault();
          beginWorld();
        }
        return;
      }

      const action = MOVEMENT[e.code];
      if (!action) return;
      // Only claim the movement keys while the player actually has the floor.
      // With an exhibition panel open the arrows belong to that panel — it is
      // a scrollable product list, and swallowing its arrow keys would trap
      // keyboard users partway down it.
      if (mode !== 'overview') return;
      e.preventDefault();
      keys[action] = true;
      if (action !== 'run') keys.active = true;
    };

    const onKeyUp = (e) => {
      const action = MOVEMENT[e.code];
      if (!action) return;
      keys[action] = false;
      keys.active = keys.forward || keys.back || keys.left || keys.right;
    };

    const onBlur = () => clearKeys();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      clearKeys();
    };
  }, []);
}
