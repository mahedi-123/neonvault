import { useSyncExternalStore } from 'react';
import { DEFAULT_WORLD_ID, WORLDS, worldExists } from '../worlds/index.js';
import { setActiveWorld } from '../zoneConfig.js';
import { resetPlayer } from './playerStore.js';
import { arriveInWorld } from './vaultStore.js';

/**
 * Which world the player is in, and the state machine for moving between
 * them.
 *
 * A teleport is not a route change. The scene, the courier and the camera all
 * have to be torn down and rebuilt in another world's colours, and the moment
 * that happens has to be hidden behind the flash — otherwise the player
 * watches the old world pop out of existence. So travel runs as a sequence
 * the transition can time itself against:
 *
 *   idle     — standing in a world
 *   charging — the gate has been used and is winding up; camera pushes in
 *   flash    — the screen is white; THIS is when the world actually swaps
 *   arriving — new world is up and fading in from the flash
 *
 * The swap happens on the 'flash' edge and nowhere else. Every phase length
 * lives in TRAVEL_MS so the veil, the camera push and the scene remount are
 * reading one clock rather than three that drift apart.
 */

export const TRAVEL_MS = {
  charge: 900,
  flash: 420,
  arrive: 900,
};

const STORAGE_KEY = 'neonvault.last-world';

function loadLastWorld() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw && worldExists(raw) ? raw : null;
  } catch {
    return null;
  }
}

function remember(id) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* remembering is a convenience, never a requirement */
  }
}

let state = {
  /** null until the player has chosen at the gate. */
  worldId: null,
  lastVisited: loadLastWorld(),
  travel: 'idle',
  /** Where we are going, while travel is in flight. */
  pendingWorldId: null,
};

const listeners = new Set();
const emit = () => { for (const l of listeners) l(); };

function setState(partial) {
  state = { ...state, ...partial };
  emit();
}

export const subscribeWorld = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getWorldState = () => state;

/** First entry, straight from the gate — no travel animation, there is
 *  nowhere to travel from. */
export function enterWorld(id) {
  const target = worldExists(id) ? id : DEFAULT_WORLD_ID;
  setActiveWorld(target);
  // Order matters: the player store reads PLAYER_SPAWN, so it can only be
  // reset once the exports point at the new world. Without this the courier
  // arrives carrying the last world's coordinates — which, between a 31-unit
  // disc and a 22-unit one, drops them in the middle of a district or
  // outside the floor entirely.
  resetPlayer();
  remember(target);
  setState({ worldId: target, lastVisited: target, travel: 'idle', pendingWorldId: null });
}

let timers = [];
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

/**
 * Travel from the world the player is in to another one.
 *
 * Returns false for a no-op (already there, or already travelling) so the
 * caller can leave the gate open rather than starting a transition that
 * would end where it began.
 */
export function travelTo(id) {
  if (!worldExists(id)) return false;
  if (state.travel !== 'idle') return false;
  if (id === state.worldId) return false;

  clearTimers();
  setState({ travel: 'charging', pendingWorldId: id });

  timers.push(setTimeout(() => {
    // Mid-flash: the screen is opaque, so this is the only moment the world
    // can change without the player seeing the seam.
    setActiveWorld(id);
    resetPlayer();
    // The picker is still the active mode behind the flash — leaving it there
    // means it reappears the moment the veil lifts, which reads as the travel
    // having failed. Landing IS the answer to the question it asked.
    arriveInWorld();
    remember(id);
    setState({ worldId: id, lastVisited: id, travel: 'flash' });

    timers.push(setTimeout(() => {
      setState({ travel: 'arriving' });
      timers.push(setTimeout(() => {
        setState({ travel: 'idle', pendingWorldId: null });
      }, TRAVEL_MS.arrive));
    }, TRAVEL_MS.flash));
  }, TRAVEL_MS.charge));

  return true;
}

/** Back to the gate, and re-arm the whole thing for a fresh visit. */
export function resetWorlds() {
  clearTimers();
  state = {
    worldId: null,
    lastVisited: loadLastWorld(),
    travel: 'idle',
    pendingWorldId: null,
  };
  emit();
}

const identity = (s) => s;

export function useWorldState(selector = identity) {
  return useSyncExternalStore(subscribeWorld, () => selector(state));
}

export { WORLDS };
