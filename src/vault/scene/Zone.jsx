import { useCallback, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { AdditiveBlending, CanvasTexture, DoubleSide, MathUtils } from 'three';
import { cn } from '../../utils/helpers';
import { getSnapshot, setHovered, useVaultStore } from '../state/vaultStore';
import { pointerState, walkToZone } from '../state/playerStore';
import { zones } from '../zoneConfig';

const VIOLET = '#8b5cf6';
const CYAN = '#22d3ee';
const ACCENT_HEX = { violet: VIOLET, cyan: CYAN, mixed: VIOLET };
const LABEL_HEIGHT = {
  core: 7.8, audio: 4.45, gaming: 4.65, vault: 4.15,
  computing: 3.1, wearables: 2.7, smarthome: 2.5, newdrops: 4.5,
};
/**
 * Approximate top of each variant's own geometry — used only to keep the new
 * label→exhibit beam (below) from running down the inside of a solid
 * object. A flat fraction of LABEL_HEIGHT put the beam entirely inside
 * Audio Lab's tower (fully hidden — a label was tuned with only ~0.5 units
 * of clearance above its object, not enough for a naive fraction-based
 * beam). These are read off each variant's own mesh positions/sizes above.
 */
const OBJECT_TOP_HEIGHT = {
  core: 3.7, audio: 3.6, gaming: 4.1, vault: 3.2,
  computing: 1.8, wearables: 2.75, smarthome: 1.4, newdrops: 3.7,
};

/**
 * Two soft radial-alpha textures shared by every zone's floor glow (built
 * once, module-level cache — 8 pools cost two small canvases, not sixteen).
 * CORE_POOL is a bright, long-plateau glow for the main pool — deliberately
 * hot at the center this pass, per direction to read as an obvious spotlight
 * rather than a subtle tint. HALO_POOL is a much softer, longer-tailed
 * texture for a second, larger, dimmer layer stacked underneath the main
 * pool (see Zone below) — faking the spread of real bloom without a
 * postprocessing pass, which isn't in this project's dependencies.
 */
let sharedGlowTexture = null;
function getGlowTexture() {
  if (sharedGlowTexture) return sharedGlowTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.16, 'rgba(255,255,255,0.95)');
  gradient.addColorStop(0.38, 'rgba(255,255,255,0.5)');
  gradient.addColorStop(0.68, 'rgba(255,255,255,0.15)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  sharedGlowTexture = new CanvasTexture(canvas);
  return sharedGlowTexture;
}

let sharedHaloTexture = null;
function getHaloTexture() {
  if (sharedHaloTexture) return sharedHaloTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,0.5)');
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.22)');
  gradient.addColorStop(0.75, 'rgba(255,255,255,0.06)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  sharedHaloTexture = new CanvasTexture(canvas);
  return sharedHaloTexture;
}

/**
 * Each zone's own platform-relative pool size, capped by how close its
 * nearest neighbor actually is (computed once from the static zone
 * positions — the positions themselves are untouched). A flat multiplier
 * either left tightly-spaced zones (Smart Home / Vault-Limited, 7.28 units
 * apart) overlapping into each other, or forced every pool small to avoid
 * that. This lets zones with room read as wide as the reference while the
 * few tight pairs still stay visually separate.
 */
const NEAREST_NEIGHBOR_DIST = zones.reduce((acc, a) => {
  let min = Infinity;
  for (const b of zones) {
    if (b.id === a.id) continue;
    const dx = a.position[0] - b.position[0];
    const dz = a.position[2] - b.position[2];
    const d = Math.hypot(dx, dz);
    if (d < min) min = d;
  }
  acc[a.id] = min;
  return acc;
}, {});

/**
 * CORE — the vault's central chamber. Scale contrast is the whole idea: the
 * artifact stays modest, the architecture around it is monumental — that
 * gap is what makes a museum centerpiece read as precious, not the object's
 * own size.
 *
 *   FOREGROUND — a single processional light channel on the approach.
 *   MIDGROUND  — an elevated dais → a tapered pedestal → the artifact,
 *                with open space around it (nothing else shares this layer).
 *   BACKGROUND — a monumental doorway roughly 7 units tall (pylons + a
 *                lintel, all ~1.9 units deep so the opening's sides are
 *                visible as real mass), opening onto a niche recessed a
 *                full 3.4 units behind the frame's face — far enough that
 *                fog genuinely darkens it, reading as "a darker interior"
 *                rather than a lit rectangle glued to a wall. A dim point
 *                light sits just in front of the niche itself — the
 *                "subtle light inside" the depth calls for.
 *
 * All CORE-only lighting is distance-limited so it stays local and doesn't
 * change how neighbouring zones read.
 */
function CoreGeometry({ factorRef, isTouch }) {
  const spireGroupRef = useRef(null);
  const spireMatRef = useRef(null);
  const glowMatRef = useRef(null);
  const pedestalMatRef = useRef(null);
  const pedestalRingMatRef = useRef(null);
  const pylonMatRefs = useRef([]);
  const pylonSeamRefs = useRef([]);
  const lintelMatRef = useRef(null);
  const nicheMatRef = useRef(null);
  const channelMatRef = useRef(null);

  useFrame((_, delta) => {
    const f = factorRef.current;
    if (spireGroupRef.current && !isTouch) spireGroupRef.current.rotation.y += delta * 0.08;
    if (spireMatRef.current) spireMatRef.current.emissiveIntensity = 0.38 * f;
    if (glowMatRef.current) glowMatRef.current.opacity = Math.min(1, 0.75 * f);
    if (pedestalMatRef.current) pedestalMatRef.current.emissiveIntensity = 0.14 * f;
    if (pedestalRingMatRef.current) pedestalRingMatRef.current.opacity = Math.min(0.85, 0.5 * f);
    pylonMatRefs.current.forEach((m) => { if (m) m.emissiveIntensity = 0.025 * f; });
    pylonSeamRefs.current.forEach((m) => { if (m) m.opacity = Math.min(0.45, 0.26 * f); });
    if (lintelMatRef.current) lintelMatRef.current.emissiveIntensity = 0.025 * f;
    if (nicheMatRef.current) nicheMatRef.current.emissiveIntensity = 0.025 * f;
    if (channelMatRef.current) channelMatRef.current.opacity = Math.min(0.45, 0.26 * f);
  });

  return (
    <group>
      {/* FOREGROUND — one processional channel on the approach axis */}
      <mesh position={[0, 0.31, 1.15]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.07, 2.1]} />
        <meshBasicMaterial ref={channelMatRef} color={VIOLET} transparent opacity={0.28} toneMapped={false} />
      </mesh>

      {/* MIDGROUND — elevated dais */}
      <mesh position={[0, 0.47, 0]}>
        <cylinderGeometry args={[1.95, 2.08, 0.34, 40]} />
        <meshStandardMaterial color="#0a0912" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Pedestal — one tapered plinth (base wider than top) instead of
          three stacked pieces, so the hierarchy reads at a glance: dais,
          then plinth, then artifact. */}
      <mesh position={[0, 1.17, 0]}>
        <cylinderGeometry args={[0.42, 0.85, 1.0, 32]} />
        <meshStandardMaterial ref={pedestalMatRef} color="#0d0c15" metalness={0.6} roughness={0.4} emissive={VIOLET} emissiveIntensity={0.05} />
      </mesh>
      <mesh position={[0, 1.68, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.43, 0.5, 40]} />
        <meshBasicMaterial ref={pedestalRingMatRef} color={VIOLET} transparent opacity={0.4} toneMapped={false} />
      </mesh>

      {/* The artifact — a touch taller than wide for more vertical presence,
          standing on the pedestal with open space all around it */}
      <group ref={spireGroupRef} position={[0, 2.62, 0]}>
        <mesh scale={[1, 1.2, 1]}>
          <icosahedronGeometry args={[0.92, 0]} />
          <meshStandardMaterial ref={spireMatRef} color="#131018" metalness={0.7} roughness={0.28} emissive={VIOLET} emissiveIntensity={0.38} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.32, 24, 24]} />
          <meshBasicMaterial ref={glowMatRef} color={CYAN} transparent opacity={0.45} toneMapped={false} />
        </mesh>
      </group>

      {/* BACKGROUND — the doorway. Pylons ~5.8 units tall and 1.9 deep (the
          depth is what makes the opening's sides read as real thickness,
          not a cut-out), a lintel spanning them, and a niche recessed a
          full 3.4 units behind the frame — genuinely deeper space, not a
          plane pretending to be one. */}
      <group position={[0, 0, -4.3]}>
        {[-1, 1].map((side, i) => (
          <group key={side}>
            <mesh position={[side * 2.05, 2.9, 0]}>
              <boxGeometry args={[1.2, 5.8, 1.9]} />
              <meshStandardMaterial
                ref={(m) => { pylonMatRefs.current[i] = m; }}
                color="#09080e"
                metalness={0.5}
                roughness={0.55}
                emissive={VIOLET}
                emissiveIntensity={0.02}
              />
            </mesh>
            <mesh position={[side * 1.42, 2.9, 0.92]}>
              <boxGeometry args={[0.03, 5.0, 0.02]} />
              <meshBasicMaterial ref={(m) => { pylonSeamRefs.current[i] = m; }} color={VIOLET} transparent opacity={0.3} toneMapped={false} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 6.4, 0]}>
          <boxGeometry args={[4.7, 1.2, 1.9]} />
          <meshStandardMaterial ref={lintelMatRef} color="#09080e" metalness={0.5} roughness={0.55} emissive={VIOLET} emissiveIntensity={0.02} />
        </mesh>
        <mesh position={[0, 2.85, -3.35]}>
          <planeGeometry args={[2.6, 3.6]} />
          <meshStandardMaterial ref={nicheMatRef} color="#0c0b18" metalness={0.15} roughness={0.9} emissive={CYAN} emissiveIntensity={0.08} />
        </mesh>
      </group>

      {/* Scoped chamber lighting — distance-limited so it stays local to
          CORE. A deliberate brightness hierarchy (artifact > pedestal >
          doorway edges > floor > niche) instead of an even flood: the
          doorway is raked from one high side corner on purpose — an
          asymmetric light is what makes the pylons/lintel read as thick,
          gradiented architecture rather than a flat, evenly-lit wall. */}
      {/* Artifact + pedestal top — the brightest, most direct light. Pushed
          harder this pass — CORE is the room's one hero light and needs to
          be unmistakable from the overview, not just technically brighter
          on paper. */}
      <pointLight position={[0, 4.6, 2.6]} color={VIOLET} intensity={2.6} distance={11} decay={2} />
      {/* Pedestal front + immediate floor contact around it */}
      <pointLight position={[0, 1.3, 1.8]} color={VIOLET} intensity={1.1} distance={6.5} decay={2} />
      {/* Pedestal far side — a subtle cool rim so it doesn't go flat/silhouette on the side the key misses */}
      <pointLight position={[-1.8, 1.9, -0.6]} color={CYAN} intensity={0.45} distance={5} decay={2} />
      {/* Doorway, eye-level — the focus camera sits close and low, so the
          gradient has to land at ~2-3 units up, not near the lintel. Pulled
          back from the pylon face (a tight source right on the surface
          reads as one bright dot, not a rake) so the falloff spreads across
          the face's width instead: brighter on the near/right edge, fading
          across to the left pylon and into depth. */}
      <pointLight position={[3.6, 3.1, -1.7]} color={VIOLET} intensity={6.5} distance={8} decay={2} />
      {/* Doorway, upper — a secondary top-corner wash for the lintel/upper pylon, seen from farther overview distances */}
      <pointLight position={[2.6, 6.9, -3.6]} color={VIOLET} intensity={1.3} distance={7} decay={2} />
      {/* Doorway threshold — the outer-wall-to-niche transition step, offset off-axis rather than a symmetric flood */}
      <pointLight position={[-0.8, 2.6, -3.6]} color={CYAN} intensity={0.65} distance={6.5} decay={2} />
      {/* Recessed niche — the deepest, dimmest glow in the hierarchy; the
          niche material's own flat emissive is deliberately low (see above)
          so this point light's radial falloff — not a uniform surface glow
          — is what reads as "recessed", brighter center fading at the edges */}
      <pointLight position={[0, 2.85, -7.3]} color={CYAN} intensity={0.85} distance={4.5} decay={2} />
    </group>
  );
}

/** AUDIO LAB — a resonator tower passed through two solid archways, built
 *  from real lit material rather than thin decorative loops, so the "sound
 *  wave" motif reads as something you could walk under, not a ring floating
 *  in space. A thin emissive seam on each arch's inner face is the only
 *  glowing accent. */
function AudioGeometry({ factorRef, accentColor }) {
  const towerMatRef = useRef(null);
  const archMatRefs = useRef([]);
  const seamMatRefs = useRef([]);

  useFrame(() => {
    const f = factorRef.current;
    if (towerMatRef.current) towerMatRef.current.emissiveIntensity = 0.2 * f;
    archMatRefs.current.forEach((m) => { if (m) m.emissiveIntensity = 0.08 * f; });
    seamMatRefs.current.forEach((m, i) => {
      if (m) m.opacity = Math.min(1, (0.5 + i * 0.2) * f);
    });
  });

  return (
    <group>
      <mesh position={[0, 1.9, 0]}>
        <cylinderGeometry args={[0.5, 0.62, 3.4, 24]} />
        <meshStandardMaterial ref={towerMatRef} color="#0f0e14" metalness={0.65} roughness={0.35} emissive={accentColor} emissiveIntensity={0.18} />
      </mesh>
      {[1.15, 1.75].map((radius, i) => (
        <group key={radius}>
          <mesh position={[0, 1.05 + i * 0.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[radius, 0.16, 16, 48]} />
            <meshStandardMaterial
              ref={(m) => { archMatRefs.current[i] = m; }}
              color="#0d0c12"
              metalness={0.55}
              roughness={0.45}
              emissive={accentColor}
              emissiveIntensity={0.06}
            />
          </mesh>
          <mesh position={[0, 1.05 + i * 0.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[radius, 0.02, 10, 48]} />
            <meshBasicMaterial ref={(m) => { seamMatRefs.current[i] = m; }} color={accentColor} transparent opacity={0.5} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** GAMING — two leaning gateway slabs framing a glowing seam and a floating panel. */
function GamingGeometry({ factorRef, accentColor }) {
  const seamMatRef = useRef(null);
  const panelMatRef = useRef(null);
  const slabMatRefs = useRef([]);

  useFrame(() => {
    const f = factorRef.current;
    if (seamMatRef.current) seamMatRef.current.opacity = Math.min(1, 0.6 * f);
    if (panelMatRef.current) panelMatRef.current.emissiveIntensity = 0.3 * f;
    slabMatRefs.current.forEach((m) => { if (m) m.emissiveIntensity = 0.12 * f; });
  });

  return (
    <group>
      {[-1, 1].map((side, i) => (
        <mesh key={side} position={[side * 1.3, 1.55, 0]} rotation={[0, 0, -side * 0.14]}>
          <boxGeometry args={[0.5, 3.1, 1.9]} />
          <meshStandardMaterial
            ref={(m) => { slabMatRefs.current[i] = m; }}
            color="#0e0d13"
            metalness={0.7}
            roughness={0.3}
            emissive={accentColor}
            emissiveIntensity={0.1}
          />
        </mesh>
      ))}

      <mesh position={[0, 1.55, 0]}>
        <boxGeometry args={[0.06, 2.8, 0.06]} />
        <meshBasicMaterial ref={seamMatRef} color={accentColor} transparent opacity={0.6} toneMapped={false} />
      </mesh>

      <mesh position={[0, 3.55, -0.28]} rotation={[-0.18, 0, 0]}>
        <boxGeometry args={[1.8, 1.1, 0.06]} />
        <meshStandardMaterial ref={panelMatRef} color="#07070a" metalness={0.88} roughness={0.1} emissive={accentColor} emissiveIntensity={0.25} />
      </mesh>
    </group>
  );
}

/** VAULT / LIMITED — a heavy circular drum set inside a recessed rim wall. */
function VaultGeometry({ factorRef, accentColor }) {
  const drumMatRef = useRef(null);
  const ringMatRefs = useRef([]);

  useFrame(() => {
    const f = factorRef.current;
    if (drumMatRef.current) drumMatRef.current.emissiveIntensity = 0.14 * f;
    ringMatRefs.current.forEach((m, i) => {
      if (m) m.opacity = Math.min(1, (0.5 + i * 0.2) * f);
    });
  });

  return (
    <group>
      <mesh position={[0, 0.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.0, 0.2, 12, 48]} />
        <meshStandardMaterial color="#0c0b10" metalness={0.2} roughness={0.85} />
      </mesh>

      <group rotation={[Math.PI / 2, 0, 0]} position={[0, 1.9, 0]}>
        <mesh>
          <cylinderGeometry args={[1.3, 1.3, 0.55, 40]} />
          <meshStandardMaterial ref={drumMatRef} color="#0e0d13" metalness={0.8} roughness={0.22} emissive={accentColor} emissiveIntensity={0.1} />
        </mesh>
        {[0.75, 1.05].map((radius, i) => (
          <mesh key={radius} position={[0, 0, 0.29]}>
            <torusGeometry args={[radius, 0.03, 12, 64]} />
            <meshBasicMaterial ref={(m) => { ringMatRefs.current[i] = m; }} color={accentColor} transparent opacity={0.5} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** COMPUTING LAB — terraced instrument slabs, stepping up like a bench of tools. */
function ComputingGeometry({ factorRef, accentColor }) {
  const edgeMatRefs = useRef([]);
  const bodyMatRefs = useRef([]);
  const tiers = [
    { y: 0.5, w: 3.0, d: 1.7, rot: 0 },
    { y: 1.1, w: 2.2, d: 1.6, rot: 0.05 },
    { y: 1.7, w: 1.5, d: 1.4, rot: -0.05 },
  ];

  useFrame(() => {
    const f = factorRef.current;
    edgeMatRefs.current.forEach((m) => { if (m) m.opacity = Math.min(1, 0.55 * f); });
    bodyMatRefs.current.forEach((m) => { if (m) m.emissiveIntensity = 0.12 * f; });
  });

  return (
    <group>
      {tiers.map((tier, i) => (
        <group key={i} position={[0, tier.y, 0]} rotation={[0, tier.rot, 0]}>
          <mesh>
            <boxGeometry args={[tier.w, 0.22, tier.d]} />
            <meshStandardMaterial
              ref={(m) => { bodyMatRefs.current[i] = m; }}
              color="#0d0c12"
              metalness={0.7}
              roughness={0.3}
              emissive={accentColor}
              emissiveIntensity={0.1}
            />
          </mesh>
          <mesh position={[0, 0.12, tier.d / 2 - 0.02]}>
            <boxGeometry args={[tier.w - 0.2, 0.02, 0.03]} />
            <meshBasicMaterial ref={(m) => { edgeMatRefs.current[i] = m; }} color={accentColor} transparent opacity={0.5} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** WEARABLES — a slender, human-scale pedestal with two slow gyroscopic halo rings. */
function WearablesGeometry({ factorRef, accentColor, isTouch }) {
  const outerRingRef = useRef(null);
  const innerRingRef = useRef(null);
  const ringMatRefs = useRef([]);
  const stemMatRef = useRef(null);

  useFrame((_, delta) => {
    const f = factorRef.current;
    if (!isTouch) {
      if (outerRingRef.current) outerRingRef.current.rotation.z += delta * 0.15;
      if (innerRingRef.current) innerRingRef.current.rotation.x += delta * 0.2;
    }
    if (stemMatRef.current) stemMatRef.current.emissiveIntensity = 0.15 * f;
    ringMatRefs.current.forEach((m, i) => { if (m) m.opacity = Math.min(1, (0.55 + i * 0.15) * f); });
  });

  return (
    <group>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.14, 0.2, 1.6, 16]} />
        <meshStandardMaterial ref={stemMatRef} color="#100e15" metalness={0.7} roughness={0.3} emissive={accentColor} emissiveIntensity={0.12} />
      </mesh>
      <group ref={outerRingRef} position={[0, 1.85, 0]} rotation={[0.5, 0, 0.2]}>
        <mesh>
          <torusGeometry args={[0.85, 0.025, 10, 56]} />
          <meshBasicMaterial ref={(m) => { ringMatRefs.current[0] = m; }} color={accentColor} transparent opacity={0.6} toneMapped={false} />
        </mesh>
      </group>
      <group ref={innerRingRef} position={[0, 1.85, 0]} rotation={[1.1, 0.3, 0]}>
        <mesh>
          <torusGeometry args={[0.6, 0.02, 10, 48]} />
          <meshBasicMaterial ref={(m) => { ringMatRefs.current[1] = m; }} color={accentColor} transparent opacity={0.5} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/** SMART HOME — a low central hub with three small satellite pavilions. */
function SmartHomeGeometry({ factorRef, accentColor }) {
  const hubMatRef = useRef(null);
  const satMatRefs = useRef([]);
  const beamMatRefs = useRef([]);

  useFrame(() => {
    const f = factorRef.current;
    if (hubMatRef.current) hubMatRef.current.emissiveIntensity = 0.16 * f;
    satMatRefs.current.forEach((m) => { if (m) m.emissiveIntensity = 0.1 * f; });
    beamMatRefs.current.forEach((m) => { if (m) m.opacity = Math.min(0.8, 0.4 * f); });
  });

  return (
    <group>
      <mesh position={[0, 0.75, 0]}>
        <sphereGeometry args={[0.62, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial ref={hubMatRef} color="#0f0e14" metalness={0.6} roughness={0.35} emissive={accentColor} emissiveIntensity={0.14} />
      </mesh>
      {[0, 1, 2].map((i) => {
        const angle = (i / 3) * Math.PI * 2 + 0.4;
        const r = 1.7;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        return (
          <group key={i}>
            <mesh position={[x, 0.35, z]}>
              <boxGeometry args={[0.45, 0.7, 0.45]} />
              <meshStandardMaterial
                ref={(m) => { satMatRefs.current[i] = m; }}
                color="#0c0b10"
                metalness={0.6}
                roughness={0.35}
                emissive={accentColor}
                emissiveIntensity={0.1}
              />
            </mesh>
            <mesh position={[x * 0.5, 0.42, z * 0.5]} rotation={[0, -angle, 0]}>
              <boxGeometry args={[Math.max(0.05, r * 0.86), 0.015, 0.015]} />
              <meshBasicMaterial ref={(m) => { beamMatRefs.current[i] = m; }} color={accentColor} transparent opacity={0.4} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** NEW DROPS — a tall, bright beacon marking what just arrived. */
function NewDropsGeometry({ factorRef, accentColor }) {
  const beaconMatRef = useRef(null);
  const pulseMatRef = useRef(null);
  const pulseRef = useRef(null);
  const clock = useRef(0);

  useFrame((_, delta) => {
    const f = factorRef.current;
    clock.current += delta;
    if (beaconMatRef.current) beaconMatRef.current.emissiveIntensity = 0.3 * f;
    const pulse = 0.5 + Math.sin(clock.current * 1.6) * 0.15;
    if (pulseMatRef.current) pulseMatRef.current.opacity = Math.min(1, pulse * f);
    if (pulseRef.current) pulseRef.current.scale.setScalar(1 + Math.sin(clock.current * 1.6) * 0.04);
  });

  return (
    <group>
      <mesh position={[0, 1.9, 0]}>
        <coneGeometry args={[0.55, 3.6, 6]} />
        <meshStandardMaterial ref={beaconMatRef} color="#120f18" metalness={0.7} roughness={0.28} emissive={accentColor} emissiveIntensity={0.25} />
      </mesh>
      <mesh ref={pulseRef} position={[0, 2.7, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.7, 0.03, 12, 48]} />
        <meshBasicMaterial ref={pulseMatRef} color={accentColor} transparent opacity={0.5} toneMapped={false} />
      </mesh>
    </group>
  );
}

const GEOMETRY_BY_VARIANT = {
  core: CoreGeometry,
  audio: AudioGeometry,
  gaming: GamingGeometry,
  vault: VaultGeometry,
  computing: ComputingGeometry,
  wearables: WearablesGeometry,
  smarthome: SmartHomeGeometry,
  newdrops: NewDropsGeometry,
};

/**
 * One zone: shared platform + accent ring + point light + distinctive upper
 * architecture (delegated to a variant component) + a DOM label anchored in
 * 3D space. All hover/active/subdued visual response is driven by mutating
 * refs inside useFrame (reading the store via getSnapshot(), no subscription)
 * so hovering never triggers a React re-render of the 3D subtree — only the
 * Html label (real DOM) re-renders on state change, via useVaultStore.
 */
const Zone = ({ config, isTouch }) => {
  const groupRef = useRef(null);
  const platformRingMatRef = useRef(null);
  const lightRef = useRef(null);
  const poolMatRef = useRef(null);
  const haloMatRef = useRef(null);
  const floorLightRef = useRef(null);
  const beamCoreMatRef = useRef(null);
  const beamGlowMatRef = useRef(null);
  const hotspotMatRef = useRef(null);
  const factorRef = useRef(0);

  const accentColor = ACCENT_HEX[config.accent] ?? VIOLET;
  const labelHeight = LABEL_HEIGHT[config.variant] ?? 4;
  const GeometryComponent = GEOMETRY_BY_VARIANT[config.variant];
  const glowTexture = getGlowTexture();
  const haloTexture = getHaloTexture();
  // CORE is the room's one landmark exhibit — its floor pool reads larger
  // and stronger than every other zone's, which all share the same
  // (smaller, subordinate) treatment as each other. Radius is platform-
  // relative but capped by how close the nearest neighbor actually is, so
  // the wide reference-style pools can't collide for the couple of zones
  // that sit close together. Sized deliberately large this pass — the
  // brief explicitly wants pools "immediately noticeable," not subtle.
  const isCore = config.variant === 'core';
  const nearestDist = NEAREST_NEIGHBOR_DIST[config.id] ?? 10;
  const poolRadius = isCore
    ? Math.max(config.platformRadius * 2.0, Math.min(config.platformRadius * 3.0, nearestDist * 0.75))
    : Math.max(config.platformRadius * 1.6, Math.min(config.platformRadius * 2.4, nearestDist * 0.5));
  const haloRadius = Math.min(poolRadius * 1.6, nearestDist * 0.85);
  // The label → exhibit "spotlight" connector: a thin vertical beam running
  // from just below the DOM label down to a bright hotspot just above the
  // exhibit's own geometry, terminating before the floor pool takes over.
  // Anchored to OBJECT_TOP_HEIGHT (not a flat fraction of labelHeight) so it
  // clears each variant's actual silhouette instead of running down the
  // inside of it. Clamped to a minimum sliver for the couple of zones
  // (Gaming, Audio Lab) whose label sits very close above its own object.
  const objectTop = OBJECT_TOP_HEIGHT[config.variant] ?? labelHeight * 0.45;
  const beamTop = labelHeight - 0.18;
  const beamBottom = Math.min(beamTop - 0.45, objectTop + 0.22);
  const beamHeight = Math.max(0.3, beamTop - beamBottom);
  const beamCenterY = (beamTop + beamBottom) / 2;

  const isActive = useVaultStore((s) => s.activeZoneId === config.id);
  const isHovered = useVaultStore((s) => s.hoveredZoneId === config.id);
  const mode = useVaultStore((s) => s.mode);
  const zoneEngaged = mode === 'diving' || mode === 'zone' || mode === 'returning';
  const subdued = zoneEngaged && !isActive;

  // Label border/glow tinted by the zone's own accent — so the floating
  // marker visibly reads as the SAME light source as the beam/pool below it,
  // not a generic UI chrome color. Hex + alpha suffix (8-digit hex) rather
  // than an rgba() conversion since accentColor is already a hex string.
  const isVault = config.variant === 'vault';
  const labelStyle = {
    borderColor: isActive
      ? `${accentColor}cc`
      : isHovered
        ? `${accentColor}b3`
        : subdued
          ? `${accentColor}35`
          : `${accentColor}99`,
    boxShadow: isActive
      ? `0 0 40px -6px ${accentColor}b3, 0 0 14px -2px ${accentColor}`
      : subdued
        ? 'none'
        : `0 0 24px -7px ${accentColor}b3, 0 0 8px -3px ${accentColor}66`,
    backgroundColor: subdued
      ? 'rgba(5, 5, 10, 0.62)'
      : isVault
        ? 'rgba(2, 13, 18, 0.94)'
        : 'rgba(6, 5, 12, 0.9)',
    color: subdued ? undefined : '#f2f5ff',
    textShadow: subdued ? undefined : `0 0 9px ${accentColor}66`,
  };

  useFrame((_, delta) => {
    const snap = getSnapshot();
    const active = snap.activeZoneId === config.id;
    const hovered = snap.hoveredZoneId === config.id;
    const engaged = snap.mode === 'diving' || snap.mode === 'zone' || snap.mode === 'returning';

    // Restrained response curve: a small readable lift on hover, a slightly
    // stronger one when active, everything else settles back — no bounce.
    let targetFactor;
    if (snap.mode === 'entering') targetFactor = 0;
    else if (engaged) targetFactor = active ? 1.3 : 0.22;
    else targetFactor = hovered ? 0.95 : 0.58;
    factorRef.current = MathUtils.damp(factorRef.current, targetFactor, 4.5, delta);

    let targetScale;
    if (snap.mode === 'entering') targetScale = 0.15;
    else if (engaged) targetScale = active ? 1.05 : 0.94;
    else targetScale = hovered ? 1.025 : 1;

    if (groupRef.current) {
      const nextScale = MathUtils.damp(groupRef.current.scale.x, targetScale, 4.5, delta);
      groupRef.current.scale.setScalar(nextScale);
    }
    if (platformRingMatRef.current) platformRingMatRef.current.opacity = Math.min(1, 0.5 * factorRef.current);
    // Object-facing light — this is what keeps each exhibit's own geometry
    // from disappearing into black; pushed hard this pass since a soft
    // floor pool alone doesn't reach the object's upper facets.
    if (lightRef.current) lightRef.current.intensity = (isCore ? 1.7 : 1.15) + factorRef.current * (isCore ? 2.8 : 2.15);
    if (poolMatRef.current) {
      // Deliberately bright — direction was explicit that a barely-visible
      // tint is the wrong target: the pool must read as an obvious lit
      // island the instant you look at the overview, not something you have
      // to look for.
      const cap = isCore ? 1.0 : 0.85;
      const scale = isCore ? 1.35 : 1.05;
      poolMatRef.current.opacity = Math.min(cap, scale * factorRef.current);
    }
    if (haloMatRef.current) {
      const cap = isCore ? 0.55 : 0.32;
      const scale = isCore ? 0.7 : 0.42;
      haloMatRef.current.opacity = Math.min(cap, scale * factorRef.current);
    }
    if (floorLightRef.current) {
      floorLightRef.current.intensity = (isCore ? 1.7 : 0.95) + factorRef.current * (isCore ? 2.5 : 1.65);
    }
    if (beamCoreMatRef.current) {
      const cap = isCore ? 0.95 : 0.82;
      const scale = isCore ? 1.05 : 0.92;
      beamCoreMatRef.current.opacity = Math.min(cap, scale * factorRef.current);
    }
    if (beamGlowMatRef.current) {
      const cap = isCore ? 0.55 : 0.42;
      const scale = isCore ? 0.65 : 0.52;
      beamGlowMatRef.current.opacity = Math.min(cap, scale * factorRef.current);
    }
    if (hotspotMatRef.current) {
      const cap = isCore ? 0.95 : 0.75;
      const scale = isCore ? 1.1 : 0.85;
      hotspotMatRef.current.opacity = Math.min(cap, scale * factorRef.current);
    }
  });

  const handlePointerOver = useCallback((e) => {
    e.stopPropagation();
    if (getSnapshot().mode !== 'overview') return;
    setHovered(config.id);
    document.body.style.cursor = 'pointer';
  }, [config.id]);

  const handlePointerOut = useCallback((e) => {
    e.stopPropagation();
    setHovered(null);
    document.body.style.cursor = '';
  }, []);

  // Clicking an exhibit walks the courier to it rather than cutting the
  // camera there — the world is walkable now, and a click that teleported the
  // view would be a second, contradictory way to move through it.
  const handleClick = useCallback((e) => {
    // The click that ends a camera drag is not a walk order — same guard
    // WalkGround uses, since a drag can just as easily finish over an exhibit.
    if (pointerState.dragged) return;
    e.stopPropagation();
    if (getSnapshot().mode !== 'overview') return;
    walkToZone(config.id);
  }, [config.id]);

  return (
    <group position={config.position}>
      <group
        ref={groupRef}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        {/* Generous invisible hit area — fills the gaps between the sparse
            decorative geometry so hover/click never feels finicky. */}
        <mesh position={[0, labelHeight * 0.5, 0]} visible={false}>
          <cylinderGeometry args={[config.platformRadius + 0.6, config.platformRadius + 0.6, labelHeight + 1, 16]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        {/* Stepped foundation — a wider, shorter base tier under the main
            platform so every zone reads as a built dais, not a shape resting
            on a disc. Shared across all zones: the common architectural
            language the different upper structures sit on top of. */}
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[config.platformRadius + 0.75, config.platformRadius + 0.95, 0.1, 48]} />
          <meshStandardMaterial color="#050409" metalness={0.4} roughness={0.65} />
        </mesh>
        <mesh position={[0, 0.15, 0]}>
          <cylinderGeometry args={[config.platformRadius, config.platformRadius, 0.3, 48]} />
          <meshStandardMaterial color="#0b0a0f" metalness={0.55} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.32, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[config.platformRadius - 0.18, config.platformRadius - 0.1, 64]} />
          <meshBasicMaterial ref={platformRingMatRef} color={accentColor} transparent opacity={0.5} toneMapped={false} />
        </mesh>

        {/* Floor glow pool — sits just ABOVE the platform's own top surface
            (0.3), not below it. A first pass put this under the opaque
            foundation/platform, which for several zones is wider than the
            pool itself — meaning only the gradient's faint outer tail was
            ever visible, never its bright-to-mid range, and the platform
            surface stayed a neutral, unlit grey. Sitting a hair above it
            (0.31, still below the accent ring at 0.32 so the two transparent
            surfaces don't fight for draw order) lets the additive falloff
            actually wash over the platform itself — "the floor carries the
            light" — while depth-testing still hides it correctly behind the
            taller opaque object/architecture standing on top of it. Paired
            with an actual point light so the effect is corroborated by real
            3D lighting, not just a flat texture; raycast is disabled so its
            (deliberately generous) radius can never intercept a
            neighboring zone's hover/click. */}
        {/* Halo — a second, larger, much softer layer underneath the main
            pool. Real bloom isn't available (no postprocessing package in
            this project) so this fakes its spread: additive blending means
            layering two glows costs nothing extra in sort-order correctness
            and reads as the light's own atmosphere bleeding further out
            than the crisper inner pool does. */}
        <mesh position={[0, 0.305, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <circleGeometry args={[haloRadius, 48]} />
          <meshBasicMaterial
            ref={haloMatRef}
            map={haloTexture}
            color={accentColor}
            transparent
            opacity={0}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, 0.31, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <circleGeometry args={[poolRadius, 48]} />
          <meshBasicMaterial
            ref={poolMatRef}
            map={glowTexture}
            color={accentColor}
            transparent
            opacity={0}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        {/* decay=1 (linear) rather than the physical default of 2 — a much
            more gradual falloff across the pool's width, which is what
            reads as atmospheric spill rather than a point-light hotspot. */}
        <pointLight ref={floorLightRef} position={[0, 0.5, 0]} color={accentColor} intensity={0} distance={poolRadius * 1.6} decay={1} />

        {/* Sits near the label, not at a fixed mid-height — an overhead
            light is what makes top-facing surfaces read as "receiving a
            spotlight from above" rather than an ambient fill; it's also
            what the new beam below visually represents. */}
        <pointLight ref={lightRef} position={[0, beamTop, 0]} color={accentColor} intensity={0.35} distance={12} decay={1.6} />

        {/* The label → exhibit spotlight connector. Two concentric,
            open-ended cylinders (a slim bright core + a fatter, softer
            sheath) rather than a texture — additive blending on a thin
            shape already reads as a soft glowing line, and this avoids
            fighting a cylinder's UV unwrap for a gradient. A single bright
            hotspot disc marks where the beam "lands" on the exhibit, then
            the floor pool/halo above take over from there. */}
        <mesh position={[0, beamCenterY, 0]} raycast={() => null}>
          <cylinderGeometry args={[isCore ? 0.16 : 0.11, isCore ? 0.16 : 0.11, beamHeight, 10, 1, true]} />
          <meshBasicMaterial
            ref={beamGlowMatRef}
            color={accentColor}
            transparent
            opacity={0}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
            side={DoubleSide}
          />
        </mesh>
        <mesh position={[0, beamCenterY, 0]} raycast={() => null}>
          <cylinderGeometry args={[isCore ? 0.05 : 0.035, isCore ? 0.05 : 0.035, beamHeight, 8, 1, true]} />
          <meshBasicMaterial
            ref={beamCoreMatRef}
            color={accentColor}
            transparent
            opacity={0}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
            side={DoubleSide}
          />
        </mesh>
        <mesh position={[0, beamBottom, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <circleGeometry args={[isCore ? 0.55 : 0.42, 24]} />
          <meshBasicMaterial
            ref={hotspotMatRef}
            map={glowTexture}
            color={accentColor}
            transparent
            opacity={0}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>

        <GeometryComponent factorRef={factorRef} accentColor={accentColor} isTouch={isTouch} />
      </group>

      {/* No generic backdrop wall: each exhibit now stands in open space,
          matching the reference composition. CORE keeps its own architecture. */}

      <Html
        position={[0, labelHeight, 0]}
        center
        distanceFactor={7.5}
        zIndexRange={[10, 0]}
        occlude={false}
      >
        <div
          style={labelStyle}
          className={cn(
            'pointer-events-none select-none whitespace-nowrap rounded-full border-2 px-6 py-3 font-body font-semibold uppercase tracking-[0.12em] backdrop-blur-xl transition-all duration-300 flex items-center gap-3',
            isVault ? 'text-[18px]' : 'text-[18px]',
            isActive
              ? 'scale-110 text-text'
              : isHovered
                ? 'scale-105 text-text'
                : subdued
                  ? 'opacity-40 text-text-subtle'
                  : 'text-text'
          )}
        >
          <span
            className="text-[13px] font-bold"
            style={{ color: subdued ? undefined : accentColor }}
          >
            {String(config.index).padStart(2, '0')}
          </span>
          {config.label}
        </div>
      </Html>
    </group>
  );
};

export default Zone;
