import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { isLite } from '../lib/quality';

/**
 * Liquid image hover. ONE WebGL canvas for the whole site: when the pointer
 * enters an image container marked [data-liquid], the canvas is slipped into
 * that container on top of its image and redraws the photo through a shader —
 * a ripple that follows the pointer, a slow liquid drift, and an RGB split
 * that grows with pointer speed. It fades out and parks itself on leave.
 * Only ever one context, and it only renders while something is hovered.
 */

const VERT = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uTex; uniform vec2 uMouse; uniform vec2 uVel; uniform float uTime;
uniform float uHover; uniform float uBoxAspect; uniform float uImgAspect;
vec2 cover(vec2 uv){
  vec2 s = uBoxAspect > uImgAspect ? vec2(1.0, uImgAspect / uBoxAspect) : vec2(uBoxAspect / uImgAspect, 1.0);
  return (uv - 0.5) * s + 0.5;
}
void main(){
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  vec2 m = vec2(uMouse.x, uMouse.y);
  vec2 d = (uv - m) * vec2(uBoxAspect, 1.0);
  float dist = length(d);
  float ripple = sin(dist * 38.0 - uTime * 6.0) * exp(-dist * 5.0) * 0.014 * uHover;
  uv += normalize(d + 1e-5) * ripple;
  uv += vec2(sin(uv.y * 9.0 + uTime * 1.3), cos(uv.x * 8.0 + uTime * 1.1)) * 0.004 * uHover;
  // gentle bulge under the pointer
  uv -= d / vec2(uBoxAspect, 1.0) * exp(-dist * 7.0) * 0.06 * uHover;
  vec2 split = uVel * 0.02 * uHover + vec2(0.0015 * uHover, 0.0);
  vec2 c = cover(uv);
  vec3 col;
  col.r = texture(uTex, cover(uv + split)).r;
  col.g = texture(uTex, c).g;
  col.b = texture(uTex, cover(uv - split)).b;
  float glow = exp(-dist * 9.0) * 0.18 * uHover;
  col += vec3(0.37, 0.92, 0.83) * glow;
  o = vec4(col * uHover, uHover);
}`;

const LiquidHover = () => {
  const { pathname } = useLocation();
  const enabled = pathname !== '/vault';

  useEffect(() => {
    if (!enabled || isLite()) return undefined;
    if (!window.matchMedia('(pointer: fine)').matches) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const canvas = document.createElement('canvas');
    canvas.className = 'nv-liquid';
    const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) return undefined;

    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    let prog;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
    } catch (err) {
      console.warn('[liquid] disabled', err);
      return undefined;
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (n) => gl.getUniformLocation(prog, n);
    const u = {
      mouse: U('uMouse'), vel: U('uVel'), time: U('uTime'), hover: U('uHover'),
      box: U('uBoxAspect'), img: U('uImgAspect'),
    };
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // CORS-clean copies of the photos (the page's own <img>s stay untouched)
    const cache = new Map();
    const loadClean = (src) => {
      if (!cache.has(src)) {
        cache.set(src, new Promise((resolve) => {
          const im = new Image();
          im.crossOrigin = 'anonymous';
          im.onload = () => resolve(im);
          im.onerror = () => resolve(null);
          im.src = src;
        }));
      }
      return cache.get(src);
    };

    let host = null;
    let texSrc = '';
    let imgAspect = 1;
    let ready = false;
    let hover = 0;
    let target = 0;
    const mouse = { x: 0.5, y: 0.5, vx: 0, vy: 0, lx: 0.5, ly: 0.5 };
    let raf = 0;
    const t0 = performance.now();

    const currentImg = () => host && [...host.querySelectorAll('img')].reverse().find((im) => im.complete && im.naturalWidth);

    const upload = async (im) => {
      const src = im.currentSrc || im.src;
      if (src === texSrc) return;
      texSrc = src;
      ready = false;
      const clean = await loadClean(src);
      if (!clean || texSrc !== src) return;
      try {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, clean);
        imgAspect = clean.naturalWidth / clean.naturalHeight;
        ready = true;
      } catch {
        ready = false;
      }
    };

    const frame = (now) => {
      raf = 0;
      if (!host) return;
      hover += (target - hover) * 0.12;
      const im = currentImg();
      if (im) upload(im);
      const w = host.clientWidth;
      const h = host.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
      mouse.vx += ((mouse.x - mouse.lx) * 4 - mouse.vx) * 0.2;
      mouse.vy += ((mouse.y - mouse.ly) * 4 - mouse.vy) * 0.2;
      mouse.lx = mouse.x;
      mouse.ly = mouse.y;
      canvas.style.opacity = ready ? '1' : '0';
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (ready) {
        gl.uniform2f(u.mouse, mouse.x, mouse.y);
        gl.uniform2f(u.vel, mouse.vx, mouse.vy);
        gl.uniform1f(u.time, (now - t0) / 1000);
        gl.uniform1f(u.hover, hover);
        gl.uniform1f(u.box, w / Math.max(h, 1));
        gl.uniform1f(u.img, imgAspect);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      if (target === 0 && hover < 0.01) {
        canvas.remove();
        host = null;
        texSrc = '';
        ready = false;
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

    const onMove = (e) => {
      const t = e.target instanceof Element ? e.target.closest('[data-liquid]') : null;
      if (t && !t.querySelector('img')) return;
      if (t !== host) {
        if (t) {
          host = t;
          hover = 0;
          texSrc = '';
          ready = false;
          canvas.style.opacity = '0';
          // above the photo, below the card's own badges and buttons
          const firstImg = t.querySelector('img');
          const anchor = firstImg?.parentElement === t ? firstImg.nextSibling : t.firstChild?.nextSibling;
          t.insertBefore(canvas, anchor || null);
          target = 1;
        } else {
          target = 0;
        }
      }
      if (host && t === host) {
        const r = host.getBoundingClientRect();
        mouse.x = (e.clientX - r.left) / r.width;
        mouse.y = (e.clientY - r.top) / r.height;
        target = 1;
      }
      kick();
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      canvas.remove();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [enabled]);

  return null;
};

export default LiquidHover;
