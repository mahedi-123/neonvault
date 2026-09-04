import { useSyncExternalStore } from 'react';

/**
 * Minimal external store for the vault's scene/camera state, shared between
 * the R3F canvas and the DOM overlay without routing through React Context
 * (which would re-render unrelated overlay chrome on every hover tick).
 *
 * mode:
 *   'entering'  — cinematic establishing shot, no input accepted
 *   'intro'     — guide dialog stepping through how the world works
 *   'overview'  — free roam: the player walks, the camera follows
 *   'diving'    — an exhibit was triggered, camera is moving onto it
 *   'zone'      — camera settled, exhibition panel open
 *   'returning' — camera easing back onto the player's shoulder
 *   'gate'      — the world picker is up; no world is loaded behind it yet
 *
 * Reads inside useFrame should call getSnapshot() directly (no subscription,
 * no re-render). Reads that drive DOM/JSX should go through useVaultStore().
 */

export const INTRO_STEPS = [
  'Welcome to THE NEON VAULT — a private showroom for the gear worth owning.',
  'Thirteen districts sit on this floor, ringed by the transit line. Some are stocked and priced; a few are still being fitted out.',
  'Past the shield at the rim the city runs on without you — this floor is one plaza in it, not the whole of it.',
  'Pick how you want to move in a moment, then walk up to a district and it will ask whether you want to go in. That is the whole tour.',
];

const initialState = {
  mode: 'gate',
  introStep: 0,
  hoveredZoneId: null,
  activeZoneId: null,
  /**
   * Zone the player is standing inside right now. Drives the minimap's
   * caption and the "enter this exhibit?" prompt.
   *
   * Standing in a zone no longer enters it. Walking past an exhibit used to
   * take the camera off you and open a product panel unasked, which made
   * simply crossing the floor feel like it kept grabbing the wheel — so
   * proximity now only offers, and the player confirms.
   */
  nearZoneId: null,
  /**
   * True while the courier is standing at the travel gate. Same contract as
   * nearZoneId: proximity only ever *offers*, and the player confirms.
   */
  nearPortal: false,
};

let state = { ...initialState };

const listeners = new Set();

function emit() {
  for (const listener of listeners) listener();
}

function setState(partial) {
  state = { ...state, ...partial };
  emit();
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot() {
  return state;
}

export function setHovered(id) {
  if (state.hoveredZoneId === id) return;
  if (state.mode !== 'overview' && id !== null) return;
  setState({ hoveredZoneId: id });
}

export function setNearZone(id) {
  if (state.nearZoneId === id) return;
  setState({ nearZoneId: id });
}

export function setNearPortal(near) {
  if (state.nearPortal === near) return;
  setState({ nearPortal: near });
}


/** The player picked a world at the gate. The establishing shot runs next. */
export function beginWorld() {
  setState({ mode: 'entering', introStep: 0, nearZoneId: null, nearPortal: false });
}

/**
 * Arrived somewhere by gate. Straight to free roam — no establishing shot and
 * no briefing.
 *
 * The first entry into a world gets the cinematic because it is the first
 * thing you ever see. A teleport does not: you have just watched a gate wind
 * up, a flash, and the name of where you landed, and following that with a
 * slow orbit and four lines of guide copy every single time you use a door
 * would be exhausting.
 */
export function arriveInWorld() {
  setState({ mode: 'overview', introStep: 0, nearZoneId: null, nearPortal: false, activeZoneId: null });
}

/** Back to the picker — from the in-world gate, or on a fresh visit. */
export function openGate() {
  setState({ mode: 'gate', nearZoneId: null, nearPortal: false, activeZoneId: null });
}

/** Establishing shot finished — hand over to the guide. */
export function beginIntro() {
  if (state.mode !== 'entering') return;
  setState({ mode: 'intro', introStep: 0 });
}

export function nextIntroStep() {
  if (state.mode !== 'intro') return;
  if (state.introStep >= INTRO_STEPS.length - 1) {
    finishIntro();
    return;
  }
  setState({ introStep: state.introStep + 1 });
}

export function finishIntro() {
  if (state.mode !== 'intro' && state.mode !== 'entering') return;
  setState({ mode: 'overview', introStep: 0 });
}

/**
 * The player accepted a zone's enter prompt. Camera dives; the panel waits
 * for arrive(). Only ever called from an explicit confirmation — never from
 * proximity alone.
 */
export function approachZone(id) {
  if (state.mode !== 'overview') return;
  if (!id || state.activeZoneId === id) return;
  setState({ mode: 'diving', activeZoneId: id, hoveredZoneId: null });
}

export function arrive() {
  if (state.mode !== 'diving') return;
  setState({ mode: 'zone' });
}

export function startReturn() {
  if (state.mode !== 'zone' && state.mode !== 'diving') return;
  setState({ mode: 'returning', hoveredZoneId: null });
}

/** Camera is back on the player's shoulder — free roam resumes. */
export function settleOverview() {
  setState({ mode: 'overview', activeZoneId: null, hoveredZoneId: null });
}

/** Re-arms the whole experience — called on every fresh mount of the vault,
 * since the store is a module singleton that would otherwise still hold
 * whatever mode a previous visit to /vault left it in. */
export function resetVault() {
  state = { ...initialState };
  emit();
}

const identity = (s) => s;

export function useVaultStore(selector = identity) {
  return useSyncExternalStore(subscribe, () => selector(state));
}
