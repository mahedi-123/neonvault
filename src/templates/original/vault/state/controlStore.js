import { useSyncExternalStore } from 'react';

/**
 * Which control scheme the player picked, and whether the picker is open.
 *
 * Two schemes, deliberately not one adaptive mess:
 *
 *  • 'drag'    — press and hold on the world, then move the pointer: the
 *                courier walks the way you pull, as fast as you pull. Works
 *                identically with a mouse and with a finger, which is the
 *                point — one control that does not need a separate mobile
 *                design.
 *  • 'classic' — WASD (or the arrows) on a keyboard, tap-the-floor on touch,
 *                with drag reserved for looking around.
 *
 * Both schemes leave every other input alone: tapping the floor still walks
 * you there under 'drag', and the keyboard still works under either. The
 * choice only decides what a press-and-drag on the world means, because that
 * is the one gesture the two schemes genuinely cannot share.
 */

export const SCHEME_DRAG = 'drag';
export const SCHEME_CLASSIC = 'classic';

const STORAGE_KEY = 'neonvault.control-scheme';

/**
 * A stored choice is a convenience, never a requirement: private windows,
 * cleared site data and browsers set to block storage all throw here rather
 * than returning null, and none of that should stop somebody walking around.
 */
function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === SCHEME_DRAG || raw === SCHEME_CLASSIC ? raw : null;
  } catch {
    return null;
  }
}

function store(scheme) {
  try {
    localStorage.setItem(STORAGE_KEY, scheme);
  } catch {
    /* not being able to remember the choice is not worth an error */
  }
}

let state = {
  /** null while the picker is up — nothing may steer until it is answered. */
  scheme: null,
  /** The previous visit's choice, used to pre-select an option in the picker. */
  remembered: loadStored(),
  pickerOpen: false,
};

const listeners = new Set();

function emit() {
  for (const listener of listeners) listener();
}

function setState(partial) {
  state = { ...state, ...partial };
  emit();
}

export function subscribeControls(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Frame-loop and event-handler reads: no subscription, no re-render. */
export function getControls() {
  return state;
}

export function chooseScheme(scheme) {
  store(scheme);
  setState({ scheme, remembered: scheme, pickerOpen: false });
}

export function openControlPicker() {
  setState({ pickerOpen: true });
}

export function closeControlPicker() {
  // Closing without choosing falls back to whatever is remembered, and to
  // drag-to-move for a first-time visitor — never to "no controls at all".
  setState({ pickerOpen: false, scheme: state.scheme ?? state.remembered ?? SCHEME_DRAG });
}

/** Re-arms the picker for a fresh visit to the vault. */
export function resetControls() {
  state = { scheme: null, remembered: loadStored(), pickerOpen: false };
  emit();
}

const identity = (s) => s;

export function useControls(selector = identity) {
  return useSyncExternalStore(subscribeControls, () => selector(state));
}
