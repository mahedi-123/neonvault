/* GLSL for the vault. Kept as plain strings so Vite needs no plugin. */

export const particleVert = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uFocus;
  uniform float uVel;
  attribute float aSize;
  attribute float aSeed;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vBlur;

  void main() {
    vec3 p = position;
    float t = uTime * (0.15 + aSeed * 0.25);
    p.x += sin(t + aSeed * 31.0) * (0.25 + aSeed * 0.5);
    p.z += cos(t * 0.8 + aSeed * 17.0) * (0.25 + aSeed * 0.4);
    p.y += sin(t * 0.6 + aSeed * 7.0) * 0.35 + uVel * aSeed * 0.6;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float dist = -mv.z;
    float blur = clamp(abs(dist - uFocus) / 14.0, 0.0, 1.0);
    vBlur = blur;
    float size = aSize * (1.0 + blur * 2.6);
    gl_PointSize = size * uPixelRatio * (60.0 / max(dist, 0.1));
    gl_Position = projectionMatrix * mv;

    vColor = aColor;
    // Fade sprites that are about to hit the lens, and very distant ones.
    vAlpha = smoothstep(0.4, 2.5, dist) * (1.0 - smoothstep(60.0, 95.0, dist));
    vAlpha *= mix(1.0, 0.35, blur);
    vAlpha *= 0.65 + 0.35 * sin(uTime * (0.6 + aSeed) + aSeed * 40.0);
  }
`;

export const particleFrag = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vBlur;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    // sharp dot when in focus, soft bokeh disc with a bright rim when not
    float core = 1.0 - smoothstep(0.18, 0.5, d);
    float disc = smoothstep(0.5, 0.42, d) * (0.55 + 0.45 * smoothstep(0.2, 0.46, d));
    float a = mix(core, disc, vBlur) * vAlpha;
    gl_FragColor = vec4(vColor * (1.0 + (1.0 - vBlur) * 0.6), a);
  }
`;

export const cardVert = /* glsl */ `
  uniform float uBend;
  uniform float uTime;
  uniform float uActive;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vec3 p = position;
    float bx = (uv.x - 0.5);
    p.z += -bx * bx * 2.2 * uBend;
    p.z += sin(uv.y * 3.14159 + uTime * 1.5) * 0.04 * (1.0 - uActive);
    vec4 world = modelMatrix * vec4(p, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

export const cardFrag = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uHasMap;
  uniform vec2 uPlane;      // plane size in world units
  uniform float uTime;
  uniform float uActive;    // 1 when centred
  uniform float uHover;
  uniform float uShift;     // RGB split from scroll velocity
  uniform float uOpacity;
  uniform vec3 uTint;
  uniform vec3 uRim;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float sdRound(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    vec2 p = (vUv - 0.5) * uPlane;
    float d = sdRound(p, uPlane * 0.5, 0.22);
    if (d > 0.0) discard;

    // liquid wobble + rgb split on the image
    vec2 uv = vUv;
    uv += vec2(sin(uv.y * 9.0 + uTime * 1.2), cos(uv.x * 7.0 + uTime)) * 0.004 * (1.0 - uActive);
    vec2 sh = vec2(uShift * 0.012, 0.0);
    vec3 img;
    img.r = texture2D(uMap, uv + sh).r;
    img.g = texture2D(uMap, uv).g;
    img.b = texture2D(uMap, uv - sh).b;
    if (uHasMap < 0.5) {
      img = mix(vec3(0.03, 0.06, 0.07), uTint * 0.4, vUv.y) + hash(vUv * 300.0 + uTime) * 0.05;
    }

    // side cards are frosted & tinted; the centred card is clear
    float frost = 1.0 - uActive;
    vec3 tinted = mix(img, img * uTint * 1.4 + uTint * 0.05, 0.55 * frost + 0.12);
    float lum = dot(img, vec3(0.299, 0.587, 0.114));
    tinted = mix(tinted, vec3(lum) * uTint * 1.3, 0.35 * frost);
    tinted *= 0.55 + 0.45 * uActive + uHover * 0.25;

    // scanlines + grain
    tinted *= 0.94 + 0.06 * sin(vUv.y * 600.0 + uTime * 4.0);
    tinted += (hash(vUv * 900.0 + fract(uTime)) - 0.5) * 0.03;

    // glass rim
    float rim = smoothstep(-0.12, 0.0, d);
    float fres = pow(1.0 - abs(dot(normalize(vNormalW), normalize(vViewDir))), 2.0);
    vec3 col = tinted + uRim * (rim * (0.9 + uHover) + fres * 0.6);
    // sheen sweep
    float sweep = smoothstep(0.08, 0.0, abs(vUv.x + vUv.y * 0.4 - fract(uTime * 0.12) * 2.2 + 0.4));
    col += sweep * 0.12 * (0.4 + uActive);

    gl_FragColor = vec4(col, uOpacity * (0.82 + 0.18 * uActive));
  }
`;

export const finalPass = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uCA: { value: 0.0015 },
    uFlash: { value: 0 },
    uEdge: { value: null },
    uAspect: { value: 1 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uCA;
    uniform float uFlash;
    uniform vec3 uEdge;
    uniform float uAspect;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 c = vUv - 0.5;
      float r = length(c * vec2(uAspect, 1.0));
      vec2 off = c * uCA * (1.0 + r * 2.0);
      vec3 col;
      col.r = texture2D(tDiffuse, vUv + off).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - off).b;
      // teal glow creeping in from the corners (the reference's signature frame)
      float edge = smoothstep(0.45, 1.05, r);
      col += uEdge * edge * 0.4;
      col *= 1.0 - smoothstep(0.75, 1.25, r) * 0.55;
      col += (hash(vUv * 1000.0 + uTime) - 0.5) * 0.018;
      col = mix(col, vec3(0.75, 0.95, 1.0), uFlash);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};
