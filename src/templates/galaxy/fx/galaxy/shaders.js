/* GLSL for the galaxy. Kept in one place so the engine reads as pure scene logic. */

/**
 * Stars. Positions are generated once on the CPU as (radius, angle, height);
 * the GPU rotates them with the spiral pattern, adds an epicyclic wobble,
 * then bends them around the pointer like a gravitational lens and rides a
 * shockwave when the visitor clicks.
 */
export const starVert = /* glsl */ `
uniform float uTime;
uniform float uScale;      // viewport height * 0.5 * size factor
uniform float uBright;
uniform float uPattern;    // pattern speed of the arms (rad/s)
uniform vec2  uMouse;      // pointer in NDC
uniform float uLens;       // 0..1
uniform float uAspect;
uniform vec3  uPulse;      // xy: centre (NDC), z: radius (aspect-corrected units)
uniform float uPulseLife;
uniform float uWarp;

attribute vec4 aOrbit;     // r, angle, height, kind (0 disk, 1 bulge, 2 bar, 3 halo, 4 arm haze)
attribute vec3 aColor;
attribute float aSize;
attribute float aSeed;

varying vec3 vColor;
varying float vAlpha;
varying float vSoft;

void main() {
  float r = aOrbit.x;
  vSoft = step(3.5, aOrbit.w);
  float kind = aOrbit.w;
  // arms keep their shape (density-wave pattern speed); the bulge spins faster,
  // the bar turns rigidly, and every star wobbles a little on its own epicycle
  float spin = kind == 1.0 ? uPattern * 2.4 : uPattern;
  float wob = 0.035 * sin(uTime * (0.25 + aSeed * 0.35) + aSeed * 61.0) * step(kind, 0.5);
  float ang = aOrbit.y + uTime * spin + wob;
  vec3 p;
  if (kind == 2.0) {
    // bar: aOrbit.x / aOrbit.y hold its local x/z, rotated rigidly
    float a = uTime * uPattern;
    p = vec3(r * cos(a) - aOrbit.y * sin(a), aOrbit.z, r * sin(a) + aOrbit.y * cos(a));
  } else {
    p = vec3(cos(ang) * r, aOrbit.z + 0.02 * sin(uTime * 0.6 + aSeed * 30.0) * step(kind, 0.5), sin(ang) * r);
  }

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec4 clip = projectionMatrix * mv;
  float ring = 0.0;
  float wave = 0.0;

  if (clip.w > 0.0) {
    vec2 ndc = clip.xy / clip.w;
    // gravitational lensing around the pointer: deflection ~ Re^2 / d,
    // and stars near the Einstein radius brighten into a ring
    vec2 d = (ndc - uMouse) * vec2(uAspect, 1.0);
    float dist = length(d);
    float Re = 0.09 * uLens;
    vec2 dir = d / max(dist, 1e-4);
    float bend = Re * Re / max(dist, 0.02);
    ndc += dir * bend / vec2(uAspect, 1.0);
    ring = uLens * exp(-pow((dist - Re * 1.15) / 0.03, 2.0));

    // click shockwave
    vec2 dp = (ndc - uPulse.xy) * vec2(uAspect, 1.0);
    float pd = length(dp);
    wave = uPulseLife * exp(-pow((pd - uPulse.z) / 0.06, 2.0));
    ndc += (dp / max(pd, 1e-4)) * wave * 0.03 / vec2(uAspect, 1.0);

    // hyperspace: everything streams out from the centre of the view
    ndc *= 1.0 + uWarp * 0.35 * length(ndc);
    clip.xy = ndc * clip.w;
  }
  gl_Position = clip;

  float depth = max(-mv.z, 0.05);
  float s = aSize * uScale / depth;
  s *= 1.0 + ring * 1.8 + wave * 2.5;
  float tw = mix(0.78 + 0.22 * sin(uTime * (1.3 + aSeed * 2.7) + aSeed * 47.0), 1.0, vSoft);
  vAlpha = uBright * clamp(s / 1.6, 0.12, 1.0) * smoothstep(0.15, 0.9, depth);
  // haze fades out when the camera is inside it, so it never smears the view
  vAlpha *= mix(1.0, smoothstep(1.0, 4.0, depth), vSoft);
  gl_PointSize = clamp(s, 1.6, mix(64.0, 220.0, vSoft));
  vColor = aColor * (tw + ring * 2.2 + wave * 2.0);
}
`;

export const starFrag = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying float vSoft;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c) * 2.0;
  float core = exp(-d * d * 9.0);
  float halo = exp(-d * 3.2) * 0.28;
  float a = mix(core + halo, exp(-d * d * 3.5) * (1.0 - d), vSoft) * vAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vColor, a);
}
`;

/** Distant sky: a slowly turning shell of faint stars and far-off galaxies. */
export const skyVert = /* glsl */ `
uniform float uTime;
uniform float uScale;
uniform float uWarp;
attribute float aSize;
attribute float aSeed;
attribute vec3 aColor;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec4 clip = projectionMatrix * mv;
  if (clip.w > 0.0) {
    vec2 ndc = clip.xy / clip.w;
    ndc *= 1.0 + uWarp * 0.6 * length(ndc);
    clip.xy = ndc * clip.w;
  }
  gl_Position = clip;
  float tw = 0.6 + 0.4 * sin(uTime * (0.6 + aSeed * 2.0) + aSeed * 90.0);
  gl_PointSize = clamp(aSize * uScale * 0.012, 1.0, 6.0);
  vAlpha = 0.55 + 0.45 * tw;
  vColor = aColor;
}
`;

export const skyFrag = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = exp(-d * d * 6.0) * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor, a);
}
`;

/** Billboard quads: nebula clouds (fbm noise) and the core glow. */
export const billboardVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const nebulaFrag = /* glsl */ `
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uSeed;
uniform float uOpacity;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; }
  return v;
}
void main() {
  vec2 p = vUv - 0.5;
  float r = length(p) * 2.0;
  float t = uTime * 0.02;
  vec2 q = p * 3.0 + uSeed;
  float n = fbm(q + vec2(fbm(q + t), fbm(q - t + 4.0)));
  float shape = smoothstep(1.0, 0.15, r) * smoothstep(0.3, 0.75, n);
  vec3 col = mix(uColorA, uColorB, smoothstep(0.35, 0.8, n));
  gl_FragColor = vec4(col, shape * uOpacity);
}
`;

export const glowFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  float r = length(vUv - 0.5) * 2.0;
  float a = exp(-r * r * 5.0) * 0.85 + exp(-r * 14.0) * 0.6;
  gl_FragColor = vec4(uColor, a * uOpacity * smoothstep(1.0, 0.85, r));
}
`;

/** Hyperspace streaks, drawn in camera space only while warping. */
export const warpVert = /* glsl */ `
uniform float uTime;
uniform float uWarp;
attribute float aEnd;
attribute float aSeed;
varying float vAlpha;
void main() {
  vec3 p = position;
  float speed = 40.0 + aSeed * 50.0;
  float z = mod(p.z + uTime * speed * (0.4 + uWarp), 70.0) - 72.0;
  z += aEnd * (2.0 + 22.0 * uWarp * uWarp);
  gl_Position = projectionMatrix * vec4(p.xy, z, 1.0);
  vAlpha = uWarp * (0.35 + 0.65 * aEnd) * smoothstep(-72.0, -50.0, z);
}
`;

export const warpFrag = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;
void main() { gl_FragColor = vec4(uColor, vAlpha); }
`;
