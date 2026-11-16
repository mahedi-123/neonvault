/**
 * GPU spore layer for the hero — tens of thousands of spores simulated
 * entirely on the GPU (WebGL2, float textures ping-ponged through a
 * simulation shader) and drawn as additive glowing points behind the
 * Canvas2D mycelium layer. Same physics as the CPU field: flow field, the
 * pointer lens (swirl + halo), click shockwaves and the vault implode.
 *
 * Returns null from create() when WebGL2 or float render targets are not
 * available; the hero then simply runs on the Canvas2D layer alone.
 */

const QUAD_VS = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const SIM_FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uState;
uniform vec2 uRes; uniform vec2 uMouse; uniform vec2 uMouseVel;
uniform float uLens; uniform float uR; uniform float uTime; uniform float uF60;
uniform vec4 uWave; uniform vec3 uAttract;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec4 s = texture(uState, vUv);
  vec2 p = s.xy * uRes; vec2 v = s.zw;
  float k = 0.0019;
  float a = (sin(p.x * k + uTime * 0.13) + sin(p.y * k * 1.3 - uTime * 0.11) + sin((p.x + p.y) * k * 0.6 + uTime * 0.07)) * 1.7;
  float sp = 0.35 + hash(vUv) * 0.4;
  v += (vec2(cos(a), sin(a)) * sp - vec2(0.0, 0.05) - v) * 0.035 * uF60;
  vec2 d = p - uMouse; float dl = length(d) + 0.001;
  if (dl < uR) {
    float prox = 1.0 - dl / uR; float fk = prox * uLens * uF60;
    v += vec2(-d.y, d.x) / dl * 0.28 * fk;
    v += d / dl * (uR * 0.5 - dl) * 0.005 * fk;
    v += uMouseVel * 0.0008 * fk;
  }
  if (uWave.w > 0.0) {
    vec2 e = p - uWave.xy; float el = length(e) + 0.001; float band = abs(el - uWave.z);
    if (band < 30.0) v += e / el * (1.0 - band / 30.0) * 3.0 * uWave.w * uF60;
  }
  if (uAttract.z > 0.0) v += (uAttract.xy - p) * 0.02 * uAttract.z * uF60;
  v *= 0.965;
  p += v * uF60;
  p = mod(p + 20.0, uRes + 40.0) - 20.0;
  o = vec4(p / uRes, v);
}`;

const DRAW_VS = `#version 300 es
precision highp float;
uniform sampler2D uState; uniform int uSide; uniform vec2 uRes; uniform vec2 uMouse;
uniform float uR; uniform float uDpr; uniform float uTime; uniform float uLens;
out vec3 vCol; out float vA;
float hash(float n){ return fract(sin(n) * 43758.5453); }
void main(){
  int id = gl_VertexID;
  ivec2 c = ivec2(id % uSide, id / uSide);
  vec4 s = texelFetch(uState, c, 0);
  vec2 p = s.xy * uRes;
  float h = hash(float(id) * 1.37);
  float h2 = hash(float(id) * 7.11);
  vec3 teal = vec3(0.37, 0.92, 0.83), violet = vec3(0.65, 0.55, 0.98), moss = vec3(0.77, 0.85, 0.29);
  vCol = h < 0.62 ? teal : (h < 0.84 ? violet : moss);
  float prox = max(0.0, 1.0 - length(p - uMouse) / uR) * uLens;
  float tw = 0.55 + 0.45 * sin(uTime * (0.7 + h2 * 2.0) + h * 60.0);
  vA = (0.18 + h2 * 0.35) * tw + prox * 0.8;
  gl_PointSize = (0.8 + h2 * h2 * 2.2 + prox * 2.5) * uDpr;
  vec2 ndc = (p / uRes) * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
}`;

const DRAW_FS = `#version 300 es
precision highp float;
in vec3 vCol; in float vA; out vec4 o;
void main(){
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.0, d) * vA;
  o = vec4(vCol * a, a);
}`;

function program(gl, vs, fs) {
  const mk = (t, src) => {
    const s = gl.createShader(t);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}

export default class SporeGPU {
  static create(canvas, opts) {
    try {
      const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
      if (!gl || !gl.getExtension('EXT_color_buffer_float')) return null;
      return new SporeGPU(canvas, gl, opts);
    } catch (err) {
      console.warn('[spores] GPU layer disabled', err);
      return null;
    }
  }

  constructor(canvas, gl, { side = 256, dpr = 1 } = {}) {
    this.canvas = canvas;
    this.gl = gl;
    this.side = side;
    this.dpr = dpr;
    this.n = side * side;
    this.attract = null;
    this.sim = program(gl, QUAD_VS, SIM_FS);
    this.draw = program(gl, DRAW_VS, DRAW_FS);
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.sim, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.emptyVao = gl.createVertexArray();

    const init = new Float32Array(this.n * 4);
    for (let i = 0; i < this.n; i++) {
      init[i * 4] = Math.random();
      init[i * 4 + 1] = Math.random();
    }
    this.tex = [0, 1].map(() => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, side, side, 0, gl.RGBA, gl.FLOAT, init);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      return t;
    });
    this.fbo = this.tex.map((t) => {
      const f = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      return f;
    });
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('float FBO incomplete');
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.cur = 0;
    const U = (p, names) => Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(p, n)]));
    this.us = U(this.sim, ['uState', 'uRes', 'uMouse', 'uMouseVel', 'uLens', 'uR', 'uTime', 'uF60', 'uWave', 'uAttract']);
    this.ud = U(this.draw, ['uState', 'uSide', 'uRes', 'uMouse', 'uR', 'uDpr', 'uTime', 'uLens']);
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
  }

  implode(x, y) { this.attract = { x, y }; }

  /** state: { t, dt, mx, my, mvx, mvy, lens, R, wave:{x,y,r,life}|null, attractK } */
  step(st) {
    const { gl } = this;
    if (gl.isContextLost()) return;
    const f60 = st.dt * 60;
    // simulate
    gl.useProgram(this.sim);
    gl.bindVertexArray(this.vao);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo[1 - this.cur]);
    gl.viewport(0, 0, this.side, this.side);
    gl.disable(gl.BLEND);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex[this.cur]);
    const u = this.us;
    gl.uniform1i(u.uState, 0);
    gl.uniform2f(u.uRes, this.w, this.h);
    gl.uniform2f(u.uMouse, st.mx, st.my);
    gl.uniform2f(u.uMouseVel, st.mvx, st.mvy);
    gl.uniform1f(u.uLens, st.lens);
    gl.uniform1f(u.uR, st.R);
    gl.uniform1f(u.uTime, st.t);
    gl.uniform1f(u.uF60, f60);
    const wv = st.wave;
    gl.uniform4f(u.uWave, wv ? wv.x : 0, wv ? wv.y : 0, wv ? wv.r : 0, wv ? wv.life : 0);
    gl.uniform3f(u.uAttract, this.attract?.x || 0, this.attract?.y || 0, this.attract ? st.attractK : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.cur = 1 - this.cur;

    // draw
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(this.draw);
    gl.bindVertexArray(this.emptyVao);
    gl.bindTexture(gl.TEXTURE_2D, this.tex[this.cur]);
    const d = this.ud;
    gl.uniform1i(d.uState, 0);
    gl.uniform1i(d.uSide, this.side);
    gl.uniform2f(d.uRes, this.w, this.h);
    gl.uniform2f(d.uMouse, st.mx, st.my);
    gl.uniform1f(d.uR, st.R);
    gl.uniform1f(d.uDpr, this.dpr);
    gl.uniform1f(d.uTime, st.t);
    gl.uniform1f(d.uLens, st.lens);
    gl.drawArrays(gl.POINTS, 0, this.n);
  }

  dispose() {
    const { gl } = this;
    this.tex.forEach((t) => gl.deleteTexture(t));
    this.fbo.forEach((f) => gl.deleteFramebuffer(f));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
