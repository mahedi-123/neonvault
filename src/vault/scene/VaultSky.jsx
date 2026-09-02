import { useMemo } from 'react';
import { BackSide, Color } from 'three';

const VERT = /* glsl */ `
  varying vec3 vWorldPos;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vWorldPos;
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uGround;
  void main() {
    float h = normalize(vWorldPos).y;
    // Ground haze up to the horizon band, then the band fading to zenith.
    vec3 col = mix(uGround, uHorizon, smoothstep(-0.35, 0.02, h));
    col = mix(col, uZenith, smoothstep(0.02, 0.55, h));
    gl_FragColor = vec4(col, 1.0);
  }
`;

/**
 * A dusk gradient dome instead of a flat black background.
 *
 * The point is depth: with a solid clear colour, everything past the lit
 * districts fell into the same undifferentiated void and the world had no
 * horizon to walk toward. A violet band low on the sky gives the floor an
 * edge to sit against.
 *
 * Lifted a full stop from the first pass, which read as near-black outside
 * the lit pools — closer to "power cut" than to a showroom after hours.
 * The target is twilight: enough sky to see the far side of the floor and
 * tell where the ground ends, while the exhibits' own neon stays the
 * brightest thing in frame. The zenith is still the darkest band, so
 * looking up is still looking into the dark.
 *
 * Rendered with fog disabled and depth writes off — it is a backdrop, not
 * geometry, and must never occlude or be tinted by the scene's fog.
 */
const VaultSky = ({ lite = false }) => {
  const uniforms = useMemo(
    () => ({
      uZenith: { value: new Color('#150f2f') },
      uHorizon: { value: new Color('#4a2b80') },
      uGround: { value: new Color('#153048') },
    }),
    []
  );

  return (
    // renderOrder + depthTest:false draws the dome first and lets everything
    // else paint over it, rather than relying on depth sorting to keep a
    // dome that large behind the scene it surrounds.
    <mesh frustumCulled={false} renderOrder={-1000}>
      {/* Big enough to enclose the city outside the barrier. At the old
          80-unit radius the far towers punched straight through the dome. */}
      <sphereGeometry args={[300, lite ? 16 : 32, lite ? 10 : 16]} />
      <shaderMaterial
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        side={BackSide}
        depthWrite={false}
        depthTest={false}
        fog={false}
        toneMapped={false}
      />
    </mesh>
  );
};

export default VaultSky;
