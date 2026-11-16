import { TEMPLATES, switchTemplate } from './templates.js';

/**
 * Design switcher — a small pill in the bottom-left corner that opens a list
 * of the shipped designs. Built as plain DOM inside a shadow root so none of
 * the three designs' global styles can restyle it (and it can't leak into
 * them). Alt+T opens it from the keyboard; Esc closes. Hidden inside the
 * full-screen vault so it never sits on the 3D HUD.
 */
const CSS = `
:host { all: initial; position: fixed; z-index: 2147483000;
  left: calc(14px + env(safe-area-inset-left, 0px)); bottom: calc(14px + env(safe-area-inset-bottom, 0px));
  font: 500 11px/1.3 "JetBrains Mono", "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #e8f6f3; letter-spacing: .08em; }
:host([hidden]) { display: none; }
* { box-sizing: border-box; }
button { font: inherit; color: inherit; letter-spacing: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
:host-context(.nv-cursor-on) button { cursor: none; }
.pill { display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 12px 0 8px; border-radius: 999px;
  background: rgba(6, 12, 14, .72); border: 1px solid rgba(94, 234, 212, .28);
  -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
  box-shadow: 0 8px 30px rgba(0,0,0,.45); text-transform: uppercase; transition: border-color .25s, transform .25s; }
.pill:hover, .pill[aria-expanded="true"] { border-color: rgba(94, 234, 212, .7); }
.pill:active { transform: scale(.97); }
.dot { width: 18px; height: 18px; border-radius: 50%; display: grid; place-items: center;
  background: radial-gradient(circle at 35% 35%, #c9fff4, #5eead4 45%, #0f766e); box-shadow: 0 0 12px rgba(94,234,212,.6); }
.dot::after { content: ""; width: 6px; height: 6px; border-radius: 2px; background: #03100d; transform: rotate(45deg); }
.k { opacity: .55; }
.chev { opacity: .7; transition: transform .25s; }
.pill[aria-expanded="true"] .chev { transform: rotate(180deg); }
.panel { position: absolute; left: 0; bottom: 44px; width: min(290px, calc(100vw - 28px)); padding: 6px; border-radius: 16px;
  background: rgba(6, 12, 14, .9); border: 1px solid rgba(94, 234, 212, .25);
  -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); box-shadow: 0 20px 60px rgba(0,0,0,.6);
  opacity: 0; transform: translateY(8px) scale(.98); transform-origin: bottom left; pointer-events: none;
  transition: opacity .2s, transform .25s cubic-bezier(.2,.8,.2,1); }
.panel.open { opacity: 1; transform: none; pointer-events: auto; }
.head { padding: 8px 10px 6px; font-size: 10px; letter-spacing: .2em; opacity: .55; text-transform: uppercase; }
.opt { width: 100%; display: grid; grid-template-columns: 22px 1fr auto; align-items: center; gap: 10px; text-align: left;
  padding: 10px; border-radius: 11px; transition: background .2s; }
.opt:hover, .opt:focus-visible { background: rgba(94, 234, 212, .09); outline: none; }
.opt[aria-current="true"] { background: rgba(94, 234, 212, .14); }
.num { font-size: 10px; opacity: .5; }
.name { display: block; font: 600 13px/1.2 "Space Grotesk", system-ui, sans-serif; letter-spacing: .01em; text-transform: none; }
.note { display: block; margin-top: 3px; font-size: 10px; letter-spacing: .02em; opacity: .6; text-transform: none; }
.on { width: 8px; height: 8px; border-radius: 50%; background: #5eead4; box-shadow: 0 0 10px #5eead4; }
.foot { padding: 6px 10px 8px; font-size: 10px; opacity: .45; letter-spacing: .04em; }
@media (prefers-reduced-motion: reduce) { .panel, .pill, .chev { transition: none; } }
`;

export function mountSwitcher(activeId, onSwitch) {
  const host = document.createElement('div');
  host.id = 'nv-template-switcher';
  host.setAttribute('data-cursor', '');
  const root = host.attachShadow({ mode: 'open' });
  const active = TEMPLATES.find((t) => t.id === activeId) || TEMPLATES[0];

  root.innerHTML = `<style>${CSS}</style>
    <div class="panel" role="menu" aria-label="Design templates">
      <div class="head">Design template</div>
      ${TEMPLATES.map((t, i) => `
        <button class="opt" role="menuitemradio" data-id="${t.id}" aria-checked="${t.id === active.id}" aria-current="${t.id === active.id}" tabindex="-1">
          <span class="num">0${i + 1}</span>
          <span><span class="name">${t.name}</span><span class="note">${t.note}</span></span>
          ${t.id === active.id ? '<span class="on" aria-hidden="true"></span>' : '<span></span>'}
        </button>`).join('')}
      <div class="foot">Alt + T to open · your choice is remembered</div>
    </div>
    <button class="pill" aria-haspopup="menu" aria-expanded="false" title="Switch design (Alt+T)">
      <span class="dot" aria-hidden="true"></span>
      <span><span class="k">Design ·</span> ${active.name}</span>
      <svg class="chev" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 6.5 5 3.5l3 3" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>
    </button>`;

  const pill = root.querySelector('.pill');
  const panel = root.querySelector('.panel');
  const opts = [...root.querySelectorAll('.opt')];
  let open = false;

  const setOpen = (v, focus) => {
    open = v;
    panel.classList.toggle('open', v);
    pill.setAttribute('aria-expanded', String(v));
    opts.forEach((o) => { o.tabIndex = v ? 0 : -1; });
    if (v && focus) (opts.find((o) => o.dataset.id === active.id) || opts[0]).focus();
  };

  pill.addEventListener('click', () => setOpen(!open, true));
  opts.forEach((o) => o.addEventListener('click', () => {
    if (o.dataset.id === active.id) { setOpen(false); return; }
    onSwitch?.(o.dataset.id);
    switchTemplate(o.dataset.id);
  }));
  root.addEventListener('keydown', (e) => {
    if (!open) return;
    const i = opts.indexOf(root.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = (i + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length;
      opts[n].focus();
    }
  });
  window.addEventListener('keydown', (e) => {
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyT') { e.preventDefault(); host.hidden = false; setOpen(!open, true); }
    else if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false); pill.focus(); }
  }, true);
  window.addEventListener('pointerdown', (e) => { if (open && !e.composedPath().includes(host)) setOpen(false); });

  // hide on the full-screen vault (path or hash routing)
  const inVault = () => /(^|#)\/vault\/?(?:$|[?#])/.test(location.pathname) || /^#\/vault\/?(?:$|\?)/.test(location.hash);
  let last = '';
  const sync = () => {
    const key = location.pathname + location.hash;
    if (key === last) return;
    last = key;
    host.hidden = inVault();
    if (host.hidden) setOpen(false);
  };
  sync();
  setInterval(sync, 400);

  document.body.appendChild(host);
}
