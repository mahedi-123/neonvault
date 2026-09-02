import { useCallback, useMemo, useRef } from 'react';
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
  core: 7.8, audio: 4.2, gaming: 3.5, vault: 4.15,
  computing: 3.4, wearables: 3.9, smarthome: 3.0, newdrops: 4.2,
  handhelds: 3.9, vision: 4.3, power: 4.0, creator: 4.2, drones: 4.0,
};
/**
 * Approximate top of each variant's own geometry — used only to keep the
 * label→exhibit beam (below) from running down the inside of a solid
 * object. A flat fraction of LABEL_HEIGHT put the beam entirely inside
 * Audio Lab's tower (fully hidden — a label was tuned with only ~0.5 units
 * of clearance above its object, not enough for a naive fraction-based
 * beam). These are read off each variant's own mesh positions/sizes above.
 *
 * Re-measured when the exhibits became recognisable objects rather than
 * abstract sculptures: the headphone stand, the gamepad and the pod are all
 * shorter than the towers they replaced, and the workstation, watch and
 * house are all taller. Both tables have to move together — a label left at
 * the old height either floats detached above a short exhibit or sinks into
 * a tall one.
 */
const OBJECT_TOP_HEIGHT = {
  core: 3.7, audio: 2.95, gaming: 2.5, vault: 3.3,
  computing: 2.3, wearables: 3.0, smarthome: 1.7, newdrops: 3.1,
  handhelds: 2.9, vision: 3.2, power: 2.9, creator: 3.4, drones: 2.9,
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
function CoreGeometry({ factorRef, isTouch, lite = false }) {
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
      <pointLight position={[0, 4.6, 2.6]} color={VIOLET} intensity={lite ? 3.4 : 2.6} distance={11} decay={2} />
      {/* Doorway, eye-level — the focus camera sits close and low, so the
          gradient has to land at ~2-3 units up, not near the lintel. Pulled
          back from the pylon face (a tight source right on the surface
          reads as one bright dot, not a rake) so the falloff spreads across
          the face's width instead: brighter on the near/right edge, fading
          across to the left pylon and into depth. */}
      <pointLight position={[3.6, 3.1, -1.7]} color={VIOLET} intensity={6.5} distance={8} decay={2} />

      {/* The rest of the hierarchy is a luxury. Seven point lights in one
          district is more than the entire rest of the scene can afford on a
          low-tier device, so lite keeps the two that carry the composition —
          the artifact key above and the doorway rake — and lets the five
          supporting lights go. What they were doing was shaping gradients
          that a phone cannot afford to resolve anyway. */}
      {!lite && (
        <>
          {/* Pedestal front + immediate floor contact around it */}
          <pointLight position={[0, 1.3, 1.8]} color={VIOLET} intensity={1.1} distance={6.5} decay={2} />
          {/* Pedestal far side — a subtle cool rim so it doesn't go flat/silhouette on the side the key misses */}
          <pointLight position={[-1.8, 1.9, -0.6]} color={CYAN} intensity={0.45} distance={5} decay={2} />
          {/* Doorway, upper — a secondary top-corner wash for the lintel/upper pylon, seen from farther overview distances */}
          <pointLight position={[2.6, 6.9, -3.6]} color={VIOLET} intensity={1.3} distance={7} decay={2} />
          {/* Doorway threshold — the outer-wall-to-niche transition step, offset off-axis rather than a symmetric flood */}
          <pointLight position={[-0.8, 2.6, -3.6]} color={CYAN} intensity={0.65} distance={6.5} decay={2} />
          {/* Recessed niche — the deepest, dimmest glow in the hierarchy; the
              niche material's own flat emissive is deliberately low (see above)
              so this point light's radial falloff — not a uniform surface glow
              — is what reads as "recessed", brighter center fading at the edges */}
          <pointLight position={[0, 2.85, -7.3]} color={CYAN} intensity={0.85} distance={4.5} decay={2} />
        </>
      )}
    </group>
  );
}

/* =========================================================
   THE EXHIBITS

   Each zone shows the KIND OF THING it sells, not an abstract
   monument. The first pass gave every zone a generic sculpture — a
   tower, a cone, some stacked slabs — which looked coherent but told
   a shopper nothing: you had to read the floating label to know
   whether you were standing in front of headphones or a keyboard. On
   a floor you navigate by walking, the object has to be the sign.

   So: Audio is headphones over a live equaliser, Gaming is a
   gamepad, Computing is a workstation, Wearables is a watch on a
   stand, Smart Home is a house, Vault is a vault door, New Drops is
   a supply pod still settling from its landing.

   Shared contract for every variant below:
     factorRef.current  0 → ~1.3, the zone's own attention level
                        (idle / hovered / active). Everything
                        emissive scales off it so an unvisited zone
                        stays quiet and the one you are at burns.
     accentColor        the zone's violet or cyan.
     isTouch            drop per-frame detail on phones.

   All motion is written straight to refs inside useFrame — none of
   it goes through React state, so eight animated exhibits cost zero
   re-renders.
   ========================================================= */

/** AUDIO LAB — studio headphones on a stand, over a live spectrum
 *  analyser, with sound rings washing up from the base. */
function AudioGeometry({ factorRef, accentColor, isTouch = false }) {
  const bandMatRef = useRef(null);
  const cupMatRefs = useRef([]);
  const barRefs = useRef([]);
  const barMatRefs = useRef([]);
  const waveRefs = useRef([]);
  const waveMatRefs = useRef([]);
  const clock = useRef(0);

  const BAR_COUNT = isTouch ? 7 : 11;
  const WAVE_COUNT = isTouch ? 2 : 3;
  const BAR_BASE = 0.22;
  const BAR_UNIT = 1;

  const bars = useMemo(
    () =>
      Array.from({ length: BAR_COUNT }, (_, i) => {
        // A shallow arc facing the approach side, so the analyser reads as
        // a row of levels from wherever you walk up rather than a picket
        // fence seen edge-on.
        const spread = 1.5;
        const t = BAR_COUNT === 1 ? 0.5 : i / (BAR_COUNT - 1);
        const angle = -spread / 2 + t * spread;
        return {
          key: i,
          x: Math.sin(angle) * 1.25,
          z: Math.cos(angle) * 1.25,
          rot: angle,
        };
      }),
    [BAR_COUNT]
  );

  useFrame((_, delta) => {
    const f = factorRef.current;
    clock.current += delta;
    const t = clock.current;

    if (bandMatRef.current) bandMatRef.current.emissiveIntensity = 0.24 * f;
    cupMatRefs.current.forEach((m) => {
      if (m) m.emissiveIntensity = 0.34 * f;
    });

    barRefs.current.forEach((bar, i) => {
      if (!bar) return;
      // Three summed sines at unrelated rates: neighbouring bars never
      // march in step, which is what separates "spectrum" from "wave".
      const raw =
        Math.sin(t * 2.1 + i * 0.7) * 0.5 +
        Math.sin(t * 3.3 + i * 1.31) * 0.3 +
        Math.sin(t * 1.2 + i * 0.37) * 0.2;
      const h = 0.14 + Math.abs(raw) * 1.0;
      bar.scale.y = h;
      bar.position.y = BAR_BASE + (h * BAR_UNIT) / 2;
    });
    barMatRefs.current.forEach((m) => {
      if (m) m.opacity = Math.min(1, 0.9 * f);
    });

    waveRefs.current.forEach((w, i) => {
      if (!w) return;
      const phase = (t * 0.42 + i / WAVE_COUNT) % 1;
      w.position.y = 0.12 + phase * 2.5;
      w.scale.setScalar(0.55 + phase * 1.5);
      const m = waveMatRefs.current[i];
      // Fades as it climbs, so the ring dissolves instead of popping out.
      if (m) m.opacity = (1 - phase) * 0.5 * Math.min(1, f);
    });
  });

  return (
    <group>
      {/* Stand */}
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.62, 0.72, 0.28, 20]} />
        <meshStandardMaterial color="#100e18" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.1, 0.14, 1.8, 12]} />
        <meshStandardMaterial color="#191331" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Headphones: a half-torus headband with a cup hanging off each end */}
      <group position={[0, 2.28, 0]}>
        <mesh rotation={[0, 0, 0]}>
          <torusGeometry args={[0.62, 0.075, 10, 28, Math.PI]} />
          <meshStandardMaterial
            ref={bandMatRef}
            color="#1a1430"
            metalness={0.65}
            roughness={0.32}
            emissive={accentColor}
            emissiveIntensity={0.2}
          />
        </mesh>
        {[-1, 1].map((side, i) => (
          <group key={side} position={[side * 0.62, -0.1, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.3, 0.34, 0.26, 20]} />
              <meshStandardMaterial
                ref={(m) => {
                  cupMatRefs.current[i] = m;
                }}
                color="#141024"
                metalness={0.6}
                roughness={0.35}
                emissive={accentColor}
                emissiveIntensity={0.3}
              />
            </mesh>
            {/* Lit driver ring on the outer face of each cup */}
            <mesh position={[side * 0.14, 0, 0]} rotation={[0, side * (Math.PI / 2), 0]}>
              <ringGeometry args={[0.16, 0.24, 20]} />
              <meshBasicMaterial color={accentColor} transparent opacity={0.8} toneMapped={false} side={DoubleSide} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Spectrum analyser */}
      {bars.map((bar, i) => (
        <mesh
          key={bar.key}
          ref={(m) => {
            barRefs.current[i] = m;
          }}
          position={[bar.x, BAR_BASE, bar.z]}
          rotation={[0, bar.rot, 0]}
        >
          <boxGeometry args={[0.11, BAR_UNIT, 0.11]} />
          <meshBasicMaterial
            ref={(m) => {
              barMatRefs.current[i] = m;
            }}
            color={accentColor}
            transparent
            opacity={0.9}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* Sound rings rising off the plinth */}
      {Array.from({ length: WAVE_COUNT }, (_, i) => (
        <mesh
          key={`wave-${i}`}
          ref={(m) => {
            waveRefs.current[i] = m;
          }}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[0.8, 0.018, 8, 40]} />
          <meshBasicMaterial
            ref={(m) => {
              waveMatRefs.current[i] = m;
            }}
            color={accentColor}
            transparent
            opacity={0}
            toneMapped={false}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/** GAMING — an oversized gamepad hanging in the air, face buttons
 *  firing in sequence like an attract-mode demo. */
function GamingGeometry({ factorRef, accentColor, isTouch = false }) {
  const padRef = useRef(null);
  const bodyMatRefs = useRef([]);
  const buttonMatRefs = useRef([]);
  const stickRefs = useRef([]);
  const screenMatRef = useRef(null);
  const clock = useRef(0);

  // Diamond layout, the arrangement every controller since the SNES has used.
  const BUTTONS = [
    { x: 0, y: 0.16 },
    { x: 0.17, y: 0 },
    { x: 0, y: -0.16 },
    { x: -0.17, y: 0 },
  ];

  useFrame((_, delta) => {
    const f = factorRef.current;
    clock.current += delta;
    const t = clock.current;

    if (padRef.current) {
      padRef.current.position.y = 2.2 + Math.sin(t * 0.9) * 0.09;
      padRef.current.rotation.y = Math.sin(t * 0.45) * 0.28;
      padRef.current.rotation.z = Math.sin(t * 0.7 + 1) * 0.05;
    }

    bodyMatRefs.current.forEach((m) => {
      if (m) m.emissiveIntensity = 0.14 * f;
    });
    if (screenMatRef.current) screenMatRef.current.opacity = Math.min(0.9, 0.7 * f);

    // Buttons light one after another — a controller nobody is holding
    // still needs to look like it is being played.
    buttonMatRefs.current.forEach((m, i) => {
      if (!m) return;
      const beat = (t * 1.7 + i * 0.25) % 1;
      const flash = beat < 0.22 ? 1 - beat / 0.22 : 0;
      m.opacity = Math.min(1, (0.28 + flash * 0.72) * f);
    });

    if (!isTouch) {
      stickRefs.current.forEach((s, i) => {
        if (!s) return;
        // Thumbsticks lean as if someone were steering.
        s.rotation.x = Math.sin(t * 1.6 + i * 2.1) * 0.24;
        s.rotation.z = Math.cos(t * 1.3 + i * 1.4) * 0.24;
      });
    }
  });

  return (
    <group>
      {/* Column the pad floats above */}
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.16, 0.34, 1.4, 12]} />
        <meshStandardMaterial color="#150f28" metalness={0.65} roughness={0.35} />
      </mesh>

      {/* Scaled well down from where this started. Built at full world
          units the pad measured over two metres across — wider than the
          courier is tall — and walking up to GAMING put a wall of plastic
          across the whole frame. It still reads as an oversized hero prop
          at this size, which is the intent; it just no longer eats the
          room. */}
      <group ref={padRef} position={[0, 2.2, 0]} scale={0.62}>
        {/* Body */}
        <mesh>
          <boxGeometry args={[1.5, 0.44, 0.72]} />
          <meshStandardMaterial
            ref={(m) => {
              bodyMatRefs.current[0] = m;
            }}
            color="#171128"
            metalness={0.7}
            roughness={0.3}
            emissive={accentColor}
            emissiveIntensity={0.12}
          />
        </mesh>

        {/* Grips, angled down and out */}
        {[-1, 1].map((side, i) => (
          <mesh key={side} position={[side * 0.82, -0.34, 0.04]} rotation={[0, 0, side * 0.42]}>
            <capsuleGeometry args={[0.19, 0.5, 3, 10]} />
            <meshStandardMaterial
              ref={(m) => {
                bodyMatRefs.current[i + 1] = m;
              }}
              color="#171128"
              metalness={0.7}
              roughness={0.3}
              emissive={accentColor}
              emissiveIntensity={0.12}
            />
          </mesh>
        ))}

        {/* Shoulder bumpers */}
        {[-1, 1].map((side) => (
          <mesh key={`b${side}`} position={[side * 0.52, 0.2, -0.34]}>
            <boxGeometry args={[0.42, 0.12, 0.14]} />
            <meshStandardMaterial color="#241a44" metalness={0.6} roughness={0.35} />
          </mesh>
        ))}

        {/* D-pad — a plus made of two crossed bars */}
        <group position={[-0.44, 0.24, 0.12]}>
          <mesh>
            <boxGeometry args={[0.32, 0.05, 0.1]} />
            <meshBasicMaterial color={accentColor} transparent opacity={0.75} toneMapped={false} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.1, 0.05, 0.32]} />
            <meshBasicMaterial color={accentColor} transparent opacity={0.75} toneMapped={false} />
          </mesh>
        </group>

        {/* Face buttons */}
        <group position={[0.46, 0.24, 0.06]}>
          {BUTTONS.map((b, i) => (
            <mesh key={i} position={[b.x, 0, -b.y]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.065, 0.065, 0.06, 12]} />
              <meshBasicMaterial
                ref={(m) => {
                  buttonMatRefs.current[i] = m;
                }}
                color={accentColor}
                transparent
                opacity={0.4}
                toneMapped={false}
              />
            </mesh>
          ))}
        </group>

        {/* Thumbsticks */}
        {[-0.2, 0.2].map((x, i) => (
          <group
            key={x}
            ref={(g) => {
              stickRefs.current[i] = g;
            }}
            position={[x, 0.2, 0.24]}
          >
            <mesh position={[0, 0.07, 0]}>
              <cylinderGeometry args={[0.1, 0.08, 0.14, 12]} />
              <meshStandardMaterial color="#2a1f4d" metalness={0.6} roughness={0.4} />
            </mesh>
          </group>
        ))}

        {/* Centre status strip */}
        <mesh position={[0, 0.235, -0.14]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.34, 0.08]} />
          <meshBasicMaterial
            ref={screenMatRef}
            color={accentColor}
            transparent
            opacity={0.7}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}

/** VAULT / LIMITED — a bank vault door: rotating lock wheel, dial
 *  rings, and bolts that throw and retract on a slow cycle. */
function VaultGeometry({ factorRef, accentColor }) {
  const doorMatRef = useRef(null);
  const wheelRef = useRef(null);
  const ringMatRefs = useRef([]);
  const boltRefs = useRef([]);
  const boltMatRefs = useRef([]);
  const clock = useRef(0);

  const BOLTS = 6;

  useFrame((_, delta) => {
    const f = factorRef.current;
    clock.current += delta;
    const t = clock.current;

    if (doorMatRef.current) doorMatRef.current.emissiveIntensity = 0.16 * f;
    if (wheelRef.current) wheelRef.current.rotation.z -= delta * 0.32;
    ringMatRefs.current.forEach((m, i) => {
      if (m) m.opacity = Math.min(1, (0.45 + i * 0.18) * f);
    });

    // Throw / hold / retract / hold — a four-beat cycle, so the door reads
    // as a mechanism doing something rather than a wheel spinning forever.
    const cycle = (t * 0.22) % 1;
    let extend;
    if (cycle < 0.2) extend = cycle / 0.2;
    else if (cycle < 0.5) extend = 1;
    else if (cycle < 0.7) extend = 1 - (cycle - 0.5) / 0.2;
    else extend = 0;

    boltRefs.current.forEach((bolt) => {
      if (bolt) bolt.position.x = 1.28 + extend * 0.3;
    });
    boltMatRefs.current.forEach((m) => {
      if (m) m.opacity = Math.min(1, (0.3 + extend * 0.6) * f);
    });
  });

  return (
    <group>
      {/* Recessed rim wall around the door */}
      <mesh position={[0, 0.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.0, 0.2, 12, 48]} />
        <meshStandardMaterial color="#0c0b10" metalness={0.2} roughness={0.85} />
      </mesh>

      {/* The door faces +Z, which is the side every approach mark is on */}
      <group position={[0, 1.95, 0]} rotation={[Math.PI / 2, 0, 0]}>
        {/* Door frame */}
        <mesh>
          <torusGeometry args={[1.5, 0.16, 12, 44]} />
          <meshStandardMaterial color="#12101c" metalness={0.7} roughness={0.35} />
        </mesh>

        {/* Door slab */}
        <mesh>
          <cylinderGeometry args={[1.32, 1.32, 0.5, 44]} />
          <meshStandardMaterial
            ref={doorMatRef}
            color="#0e0d13"
            metalness={0.82}
            roughness={0.2}
            emissive={accentColor}
            emissiveIntensity={0.12}
          />
        </mesh>

        {/* Dial rings on the face */}
        {[0.55, 0.9, 1.15].map((radius, i) => (
          <mesh key={radius} position={[0, 0.26, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[radius, 0.025, 10, 56]} />
            <meshBasicMaterial
              ref={(m) => {
                ringMatRefs.current[i] = m;
              }}
              color={accentColor}
              transparent
              opacity={0.5}
              toneMapped={false}
            />
          </mesh>
        ))}

        {/* Lock wheel: hub plus five spokes, turning slowly */}
        <group ref={wheelRef} position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh>
            <cylinderGeometry args={[0.17, 0.17, 0.16, 14]} />
            <meshStandardMaterial color="#2b2050" metalness={0.75} roughness={0.28} />
          </mesh>
          {Array.from({ length: 5 }, (_, i) => {
            const a = (i / 5) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0]} rotation={[0, 0, a]}>
                <boxGeometry args={[0.62, 0.07, 0.07]} />
                <meshStandardMaterial
                  color="#38287a"
                  metalness={0.7}
                  roughness={0.3}
                  emissive={accentColor}
                  emissiveIntensity={0.3}
                />
              </mesh>
            );
          })}
        </group>

        {/* Locking bolts around the rim */}
        {Array.from({ length: BOLTS }, (_, i) => {
          const a = (i / BOLTS) * Math.PI * 2;
          return (
            <group key={i} rotation={[0, 0, a]}>
              <mesh
                ref={(m) => {
                  boltRefs.current[i] = m;
                }}
                position={[1.28, 0, 0]}
              >
                <boxGeometry args={[0.4, 0.13, 0.13]} />
                <meshBasicMaterial
                  ref={(m) => {
                    boltMatRefs.current[i] = m;
                  }}
                  color={accentColor}
                  transparent
                  opacity={0.5}
                  toneMapped={false}
                />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}

/** COMPUTING LAB — a workstation: a monitor scrolling code over a
 *  keyboard whose keys ripple as if being typed on. */
function ComputingGeometry({ factorRef, accentColor, isTouch = false }) {
  const screenMatRef = useRef(null);
  const codeRefs = useRef([]);
  const codeMatRefs = useRef([]);
  const keyMatRefs = useRef([]);
  const bodyMatRefs = useRef([]);
  const clock = useRef(0);

  const CODE_LINES = isTouch ? 4 : 7;
  const KEYS = 8;
  const SCREEN_H = 1.02;

  const codeWidths = useMemo(
    // Fixed pseudo-random widths — ragged like real code, identical every
    // mount so the exhibit doesn't reshuffle when React remounts it.
    () => [0.72, 0.44, 0.86, 0.3, 0.62, 0.5, 0.78, 0.38, 0.66, 0.52],
    []
  );

  useFrame((_, delta) => {
    const f = factorRef.current;
    clock.current += delta;
    const t = clock.current;

    if (screenMatRef.current) screenMatRef.current.opacity = Math.min(0.5, 0.4 * f);
    bodyMatRefs.current.forEach((m) => {
      if (m) m.emissiveIntensity = 0.1 * f;
    });

    codeRefs.current.forEach((line, i) => {
      if (!line) return;
      // Wraps within the screen's own height, so text scrolls up the
      // display instead of sliding out past its bezel.
      const phase = ((t * 0.18 + i / CODE_LINES) % 1);
      line.position.y = -SCREEN_H / 2 + phase * SCREEN_H;
      const m = codeMatRefs.current[i];
      if (m) {
        // Dim at both ends of the travel so lines fade in and out rather
        // than appearing and vanishing at the bezel.
        const edge = Math.min(phase, 1 - phase) / 0.15;
        m.opacity = Math.min(1, edge) * 0.85 * Math.min(1, f);
      }
    });

    keyMatRefs.current.forEach((m, i) => {
      if (!m) return;
      const beat = (t * 2.4 + i * 0.37) % 1;
      const strike = beat < 0.14 ? 1 - beat / 0.14 : 0;
      m.opacity = Math.min(1, (0.18 + strike * 0.8) * f);
    });
  });

  return (
    <group>
      {/* Desk */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[2.6, 0.12, 1.35]} />
        <meshStandardMaterial
          ref={(m) => {
            bodyMatRefs.current[0] = m;
          }}
          color="#100e18"
          metalness={0.6}
          roughness={0.4}
          emissive={accentColor}
          emissiveIntensity={0.08}
        />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 1.1, 0.22, 0]}>
          <boxGeometry args={[0.12, 0.45, 1.1]} />
          <meshStandardMaterial color="#0d0b14" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}

      {/* Monitor stand */}
      <mesh position={[0, 0.78, -0.3]}>
        <cylinderGeometry args={[0.07, 0.11, 0.44, 10]} />
        <meshStandardMaterial color="#1d1638" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Monitor */}
      <group position={[0, 1.62, -0.3]} rotation={[-0.12, 0, 0]}>
        <mesh>
          <boxGeometry args={[2.0, 1.2, 0.08]} />
          <meshStandardMaterial
            ref={(m) => {
              bodyMatRefs.current[1] = m;
            }}
            color="#0b0912"
            metalness={0.75}
            roughness={0.25}
            emissive={accentColor}
            emissiveIntensity={0.1}
          />
        </mesh>
        {/* Screen wash */}
        <mesh position={[0, 0, 0.045]}>
          <planeGeometry args={[1.86, 1.06]} />
          <meshBasicMaterial
            ref={screenMatRef}
            color={accentColor}
            transparent
            opacity={0.4}
            toneMapped={false}
          />
        </mesh>
        {/* Scrolling code lines */}
        {Array.from({ length: CODE_LINES }, (_, i) => {
          const w = codeWidths[i % codeWidths.length] * 1.5;
          return (
            <mesh
              key={i}
              ref={(m) => {
                codeRefs.current[i] = m;
              }}
              position={[-0.75 + w / 2, 0, 0.05]}
            >
              <planeGeometry args={[w, 0.055]} />
              <meshBasicMaterial
                ref={(m) => {
                  codeMatRefs.current[i] = m;
                }}
                color={accentColor}
                transparent
                opacity={0}
                toneMapped={false}
              />
            </mesh>
          );
        })}
      </group>

      {/* Keyboard */}
      <group position={[0, 0.6, 0.42]} rotation={[-0.08, 0, 0]}>
        <mesh>
          <boxGeometry args={[1.7, 0.07, 0.56]} />
          <meshStandardMaterial color="#151024" metalness={0.65} roughness={0.35} />
        </mesh>
        {Array.from({ length: KEYS }, (_, i) => (
          <mesh key={i} position={[-0.72 + (i % 4) * 0.48, 0.05, i < 4 ? -0.13 : 0.13]}>
            <boxGeometry args={[0.36, 0.03, 0.18]} />
            <meshBasicMaterial
              ref={(m) => {
                keyMatRefs.current[i] = m;
              }}
              color={accentColor}
              transparent
              opacity={0.2}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** WEARABLES — a smartwatch on a wrist stand, its face sweeping a
 *  heartbeat arc, with one slow gyro halo left over from the old
 *  pedestal for continuity with the rest of the floor. */
function WearablesGeometry({ factorRef, accentColor, isTouch = false }) {
  const haloRef = useRef(null);
  const haloMatRef = useRef(null);
  const caseMatRef = useRef(null);
  const faceMatRef = useRef(null);
  const sweepRef = useRef(null);
  const pulseRef = useRef(null);
  const pulseMatRef = useRef(null);
  const clock = useRef(0);

  useFrame((_, delta) => {
    const f = factorRef.current;
    clock.current += delta;
    const t = clock.current;

    if (!isTouch && haloRef.current) haloRef.current.rotation.z += delta * 0.16;
    if (haloMatRef.current) haloMatRef.current.opacity = Math.min(1, 0.5 * f);
    if (caseMatRef.current) caseMatRef.current.emissiveIntensity = 0.2 * f;
    if (faceMatRef.current) faceMatRef.current.opacity = Math.min(0.85, 0.7 * f);

    // Second hand sweeping the dial.
    if (sweepRef.current) sweepRef.current.rotation.z = -t * 1.1;

    // Health-ring pulse: a quick double beat, then rest — the rhythm is
    // what makes it read as a heart rate rather than a loading spinner.
    const beat = (t * 0.75) % 1;
    const thump =
      beat < 0.1 ? beat / 0.1 : beat < 0.22 ? 1 - (beat - 0.1) / 0.12 : beat < 0.3 ? (beat - 0.22) / 0.08 * 0.6 : beat < 0.45 ? 0.6 - (beat - 0.3) / 0.15 * 0.6 : 0;
    if (pulseRef.current) pulseRef.current.scale.setScalar(1 + thump * 0.16);
    if (pulseMatRef.current) pulseMatRef.current.opacity = Math.min(1, (0.3 + thump * 0.65) * f);
  });

  return (
    <group>
      {/* Plinth + the curved "wrist" the watch is displayed on */}
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.52, 0.6, 0.24, 18]} />
        <meshStandardMaterial color="#100e18" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.02, 0]}>
        <cylinderGeometry args={[0.09, 0.12, 1.55, 12]} />
        <meshStandardMaterial color="#1c1638" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Strap: a torus standing upright, with the case set into its top.
          Scaled up as a unit — at true wrist proportions the watch was a
          detail on a pole next to a two-metre courier, and the zone read as
          an empty plinth from anywhere but right on top of it. */}
      {/* Tilted toward the approach side, the way a watch sits in a shop
          cradle. Lying flat, the dial faced straight up and everything on
          it — the sweep hand, the activity ring — was invisible to anyone
          standing in front of the plinth. */}
      <group position={[0, 2.0, 0]} scale={2} rotation={[-0.42, 0, 0]}>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.36, 0.055, 10, 30]} />
          <meshStandardMaterial color="#1a1430" metalness={0.5} roughness={0.45} />
        </mesh>

        {/* Watch case */}
        <group position={[0, 0.38, 0]}>
          <mesh>
            <boxGeometry args={[0.46, 0.12, 0.52]} />
            <meshStandardMaterial
              ref={caseMatRef}
              color="#171128"
              metalness={0.75}
              roughness={0.25}
              emissive={accentColor}
              emissiveIntensity={0.18}
            />
          </mesh>

          {/* Dial */}
          <mesh position={[0, 0.062, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.4, 0.46]} />
            <meshBasicMaterial
              ref={faceMatRef}
              color={accentColor}
              transparent
              opacity={0.7}
              toneMapped={false}
            />
          </mesh>

          {/* Activity ring, beating */}
          <mesh ref={pulseRef} position={[0, 0.066, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.13, 0.17, 24]} />
            <meshBasicMaterial
              ref={pulseMatRef}
              color="#ffffff"
              transparent
              opacity={0.5}
              toneMapped={false}
            />
          </mesh>

          {/* Sweeping hand */}
          <group ref={sweepRef} position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <mesh position={[0, 0.09, 0]}>
              <planeGeometry args={[0.022, 0.18]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.9} toneMapped={false} />
            </mesh>
          </group>

          {/* Crown */}
          <mesh position={[0.25, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.035, 0.035, 0.06, 10]} />
            <meshStandardMaterial color="#2c2150" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      </group>

      {/* Gyro halo */}
      <group ref={haloRef} position={[0, 2.5, 0]} rotation={[0.5, 0, 0.2]}>
        <mesh>
          <torusGeometry args={[1.05, 0.024, 10, 48]} />
          <meshBasicMaterial
            ref={haloMatRef}
            color={accentColor}
            transparent
            opacity={0.5}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}

/** SMART HOME — a house with rooms lighting themselves, and satellite
 *  devices trading pulses with it along visible links. */
const SMART_HOME_SATS = 3;
const SMART_HOME_RADIUS = 1.85;

function SmartHomeGeometry({ factorRef, accentColor, isTouch = false }) {
  const wallMatRef = useRef(null);
  const roofMatRef = useRef(null);
  const windowMatRefs = useRef([]);
  const nodeGroupRef = useRef(null);
  const pulseRefs = useRef([]);
  const pulseMatRefs = useRef([]);
  const linkMatRefs = useRef([]);
  const clock = useRef(0);

  const SATS = SMART_HOME_SATS;
  const RADIUS = SMART_HOME_RADIUS;

  const sats = useMemo(
    () =>
      Array.from({ length: SMART_HOME_SATS }, (_, i) => {
        const angle = (i / SMART_HOME_SATS) * Math.PI * 2 + 0.4;
        return {
          key: i,
          angle,
          x: Math.cos(angle) * SMART_HOME_RADIUS,
          z: Math.sin(angle) * SMART_HOME_RADIUS,
        };
      }),
    []
  );

  useFrame((_, delta) => {
    const f = factorRef.current;
    clock.current += delta;
    const t = clock.current;

    if (wallMatRef.current) wallMatRef.current.emissiveIntensity = 0.1 * f;
    if (roofMatRef.current) roofMatRef.current.emissiveIntensity = 0.16 * f;

    // Each window runs on its own slow cycle — rooms in a real house are
    // never all on or all off together.
    windowMatRefs.current.forEach((m, i) => {
      if (!m) return;
      const lit = 0.5 + Math.sin(t * (0.5 + i * 0.23) + i * 2.1) * 0.5;
      m.opacity = Math.min(1, (0.2 + lit * 0.75) * f);
    });

    if (!isTouch && nodeGroupRef.current) nodeGroupRef.current.rotation.y += delta * 0.12;

    linkMatRefs.current.forEach((m) => {
      if (m) m.opacity = Math.min(0.6, 0.3 * f);
    });

    // A dot runs the length of each link, hub → device, staggered.
    pulseRefs.current.forEach((p, i) => {
      if (!p) return;
      const phase = ((t * 0.55 + i / SATS) % 1);
      p.position.x = 0.35 + phase * (RADIUS - 0.5);
      const m = pulseMatRefs.current[i];
      if (m) m.opacity = Math.sin(phase * Math.PI) * 0.95 * Math.min(1, f);
    });
  });

  return (
    <group>
      {/* House */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[1.25, 1.0, 1.15]} />
          <meshStandardMaterial
            ref={wallMatRef}
            color="#141024"
            metalness={0.5}
            roughness={0.45}
            emissive={accentColor}
            emissiveIntensity={0.08}
          />
        </mesh>

        {/* Roof — a 4-sided cone is a pyramid; turned 45° to square it up */}
        <mesh position={[0, 1.32, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[1.02, 0.66, 4]} />
          <meshStandardMaterial
            ref={roofMatRef}
            color="#221844"
            metalness={0.55}
            roughness={0.4}
            emissive={accentColor}
            emissiveIntensity={0.14}
          />
        </mesh>

        {/* Windows on the approach face, plus a door */}
        {[
          { x: -0.32, y: 0.68, w: 0.3, h: 0.26 },
          { x: 0.32, y: 0.68, w: 0.3, h: 0.26 },
          { x: 0, y: 0.26, w: 0.26, h: 0.5 },
        ].map((win, i) => (
          <mesh key={i} position={[win.x, win.y, 0.582]}>
            <planeGeometry args={[win.w, win.h]} />
            <meshBasicMaterial
              ref={(m) => {
                windowMatRefs.current[i] = m;
              }}
              color={accentColor}
              transparent
              opacity={0.6}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>

      {/* Satellite devices, slowly orbiting the house */}
      <group ref={nodeGroupRef}>
        {sats.map((sat, i) => (
          <group key={sat.key} rotation={[0, -sat.angle, 0]}>
            {/* Link line from hub to device */}
            <mesh position={[RADIUS / 2, 0.5, 0]}>
              <boxGeometry args={[RADIUS - 0.7, 0.012, 0.012]} />
              <meshBasicMaterial
                ref={(m) => {
                  linkMatRefs.current[i] = m;
                }}
                color={accentColor}
                transparent
                opacity={0.3}
                toneMapped={false}
              />
            </mesh>

            {/* Travelling data pulse */}
            <mesh
              ref={(m) => {
                pulseRefs.current[i] = m;
              }}
              position={[0.35, 0.5, 0]}
            >
              <sphereGeometry args={[0.055, 8, 6]} />
              <meshBasicMaterial
                ref={(m) => {
                  pulseMatRefs.current[i] = m;
                }}
                color="#ffffff"
                transparent
                opacity={0}
                toneMapped={false}
              />
            </mesh>

            {/* The device itself — a little smart speaker */}
            <group position={[RADIUS, 0.28, 0]}>
              <mesh>
                <cylinderGeometry args={[0.2, 0.24, 0.55, 14]} />
                <meshStandardMaterial color="#100d1c" metalness={0.6} roughness={0.4} />
              </mesh>
              <mesh position={[0, 0.29, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.19, 14]} />
                <meshBasicMaterial color={accentColor} transparent opacity={0.75} toneMapped={false} />
              </mesh>
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}

/** NEW DROPS — a supply pod still hovering in its landing beam, with
 *  touchdown rings washing out across the floor and chevrons running
 *  down the beam. The whole read is "this one just arrived". */
function NewDropsGeometry({ factorRef, accentColor, isTouch = false }) {
  const podRef = useRef(null);
  const podMatRef = useRef(null);
  const beamMatRef = useRef(null);
  const ringRefs = useRef([]);
  const ringMatRefs = useRef([]);
  const chevronRefs = useRef([]);
  const chevronMatRefs = useRef([]);
  const clock = useRef(0);

  const RINGS = isTouch ? 2 : 3;
  const CHEVRONS = 3;
  const POD_Y = 2.45;

  useFrame((_, delta) => {
    const f = factorRef.current;
    clock.current += delta;
    const t = clock.current;

    if (podRef.current) {
      podRef.current.position.y = POD_Y + Math.sin(t * 1.1) * 0.13;
      podRef.current.rotation.y += delta * 0.5;
    }
    if (podMatRef.current) podMatRef.current.emissiveIntensity = 0.34 * f;
    if (beamMatRef.current) beamMatRef.current.opacity = Math.min(0.34, 0.26 * f);

    // Touchdown rings: each starts small and bright at the pad and washes
    // outward, so there is always one mid-flight.
    ringRefs.current.forEach((r, i) => {
      if (!r) return;
      const phase = ((t * 0.5 + i / RINGS) % 1);
      r.scale.setScalar(0.35 + phase * 1.9);
      const m = ringMatRefs.current[i];
      if (m) m.opacity = (1 - phase) * 0.65 * Math.min(1, f);
    });

    // Chevrons running down the beam — the arrow of "incoming".
    chevronRefs.current.forEach((c, i) => {
      if (!c) return;
      const phase = ((t * 0.7 + i / CHEVRONS) % 1);
      c.position.y = POD_Y - 0.45 - phase * 1.65;
      // Each chevron is two bars, so its materials live at 2i and 2i+1 —
      // fading only one of them would leave half an arrow behind.
      const alpha = Math.sin(phase * Math.PI) * 0.8 * Math.min(1, f);
      const a = chevronMatRefs.current[i * 2];
      const b = chevronMatRefs.current[i * 2 + 1];
      if (a) a.opacity = alpha;
      if (b) b.opacity = alpha;
    });
  });

  return (
    <group>
      {/* Landing pad */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.85, 0.95, 0.2, 20]} />
        <meshStandardMaterial color="#120f1e" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Landing beam — wide at the floor, narrow at the pod */}
      <mesh position={[0, 1.25, 0]}>
        <cylinderGeometry args={[0.32, 0.92, 2.3, 22, 1, true]} />
        <meshBasicMaterial
          ref={beamMatRef}
          color={accentColor}
          transparent
          opacity={0.26}
          toneMapped={false}
          side={DoubleSide}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Touchdown rings */}
      {Array.from({ length: RINGS }, (_, i) => (
        <mesh
          key={`ring-${i}`}
          ref={(m) => {
            ringRefs.current[i] = m;
          }}
          position={[0, 0.22, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.8, 0.92, 40]} />
          <meshBasicMaterial
            ref={(m) => {
              ringMatRefs.current[i] = m;
            }}
            color={accentColor}
            transparent
            opacity={0}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Chevrons descending the beam */}
      {Array.from({ length: CHEVRONS }, (_, i) => (
        <group
          key={`chev-${i}`}
          ref={(g) => {
            chevronRefs.current[i] = g;
          }}
          position={[0, POD_Y - 0.45, 0]}
        >
          {[-1, 1].map((side, s) => (
            <mesh key={side} position={[side * 0.16, 0, 0]} rotation={[0, 0, side * 0.7]}>
              <boxGeometry args={[0.34, 0.05, 0.05]} />
              <meshBasicMaterial
                ref={(m) => {
                  chevronMatRefs.current[i * 2 + s] = m;
                }}
                color={accentColor}
                transparent
                opacity={0}
                toneMapped={false}
              />
            </mesh>
          ))}
        </group>
      ))}

      {/* The pod */}
      <group ref={podRef} position={[0, POD_Y, 0]}>
        <mesh>
          <octahedronGeometry args={[0.62, 0]} />
          <meshStandardMaterial
            ref={podMatRef}
            color="#1a1334"
            metalness={0.7}
            roughness={0.26}
            emissive={accentColor}
            emissiveIntensity={0.3}
          />
        </mesh>
        {/* Banding around the pod's waist */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.44, 0.035, 8, 28]} />
          <meshBasicMaterial color={accentColor} transparent opacity={0.85} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/** HANDHELDS — a phone standing on a dock with its UI scrolling, a tablet
 *  orbiting alongside it. */
function HandheldsGeometry({ factorRef, accentColor, isTouch = false }) {
  const phoneRef = useRef(null);
  const tabletRef = useRef(null);
  const screenMatRef = useRef(null);
  const tabletScreenMatRef = useRef(null);
  const rowRefs = useRef([]);
  const rowMatRefs = useRef([]);
  const bodyMatRefs = useRef([]);
  const clock = useRef(0);

  const ROWS = isTouch ? 4 : 6;
  const SCREEN_H = 1.5;

  useFrame((_, delta) => {
    const f = factorRef.current;
    clock.current += delta;
    const t = clock.current;

    if (phoneRef.current) {
      phoneRef.current.position.y = 1.95 + Math.sin(t * 0.85) * 0.07;
      phoneRef.current.rotation.y = Math.sin(t * 0.4) * 0.22;
    }
    if (tabletRef.current) {
      // Orbits the phone rather than sitting beside it — one moving object
      // is what stops a shelf of slabs reading as furniture.
      tabletRef.current.rotation.y = t * 0.35;
    }
    bodyMatRefs.current.forEach((m) => {
      if (m) m.emissiveIntensity = 0.16 * f;
    });
    if (screenMatRef.current) screenMatRef.current.opacity = Math.min(0.75, 0.6 * f);
    if (tabletScreenMatRef.current) tabletScreenMatRef.current.opacity = Math.min(0.6, 0.5 * f);

    rowRefs.current.forEach((row, i) => {
      if (!row) return;
      const phase = (t * 0.22 + i / ROWS) % 1;
      row.position.y = -SCREEN_H / 2 + phase * SCREEN_H;
      const m = rowMatRefs.current[i];
      if (m) {
        const edge = Math.min(phase, 1 - phase) / 0.16;
        m.opacity = Math.min(1, edge) * 0.9 * Math.min(1, f);
      }
    });
  });

  return (
    <group>
      {/* Dock */}
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.85, 0.98, 0.32, 22]} />
        <meshStandardMaterial color="#1b1638" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.85, 0]}>
        <cylinderGeometry args={[0.09, 0.13, 1.1, 12]} />
        <meshStandardMaterial color="#2a2150" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Phone */}
      <group ref={phoneRef} position={[0, 1.95, 0]}>
        <mesh>
          <boxGeometry args={[0.9, 1.75, 0.09]} />
          <meshStandardMaterial
            ref={(m) => {
              bodyMatRefs.current[0] = m;
            }}
            color="#1d1740"
            metalness={0.78}
            roughness={0.22}
            emissive={accentColor}
            emissiveIntensity={0.15}
          />
        </mesh>
        <mesh position={[0, 0, 0.05]}>
          <planeGeometry args={[0.78, 1.56]} />
          <meshBasicMaterial
            ref={screenMatRef}
            color={accentColor}
            transparent
            opacity={0.6}
            toneMapped={false}
          />
        </mesh>
        {/* Scrolling UI rows */}
        {Array.from({ length: ROWS }, (_, i) => (
          <mesh
            key={i}
            ref={(m) => {
              rowRefs.current[i] = m;
            }}
            position={[0, 0, 0.056]}
          >
            <planeGeometry args={[0.54, 0.1]} />
            <meshBasicMaterial
              ref={(m) => {
                rowMatRefs.current[i] = m;
              }}
              color="#ffffff"
              transparent
              opacity={0}
              toneMapped={false}
            />
          </mesh>
        ))}
        {/* Camera bump */}
        <mesh position={[-0.28, 0.66, -0.07]}>
          <cylinderGeometry args={[0.1, 0.1, 0.05, 12]} />
          <meshStandardMaterial color="#0f0c22" metalness={0.9} roughness={0.15} />
        </mesh>
      </group>

      {/* Orbiting tablet */}
      <group ref={tabletRef} position={[0, 1.85, 0]}>
        <group position={[1.5, 0, 0]} rotation={[0, -0.5, 0.12]}>
          <mesh>
            <boxGeometry args={[1.12, 0.78, 0.06]} />
            <meshStandardMaterial
              ref={(m) => {
                bodyMatRefs.current[1] = m;
              }}
              color="#1d1740"
              metalness={0.75}
              roughness={0.25}
              emissive={accentColor}
              emissiveIntensity={0.14}
            />
          </mesh>
          <mesh position={[0, 0, 0.035]}>
            <planeGeometry args={[1.0, 0.66]} />
            <meshBasicMaterial
              ref={tabletScreenMatRef}
              color={accentColor}
              transparent
              opacity={0.5}
              toneMapped={false}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/** VISION / XR — a headset on a stand, ringed by holographic panels that
 *  swing around it as if you were wearing the thing. */
function VisionGeometry({ factorRef, accentColor, isTouch = false }) {
  const panelGroupRef = useRef(null);
  const visorMatRef = useRef(null);
  const shellMatRef = useRef(null);
  const panelMatRefs = useRef([]);
  const headsetRef = useRef(null);
  const clock = useRef(0);

  const PANELS = isTouch ? 3 : 5;

  useFrame((_, delta) => {
    const f = factorRef.current;
    clock.current += delta;
    const t = clock.current;

    if (headsetRef.current) headsetRef.current.position.y = 2.7 + Math.sin(t * 0.9) * 0.06;
    if (panelGroupRef.current) panelGroupRef.current.rotation.y = t * 0.28;
    if (shellMatRef.current) shellMatRef.current.emissiveIntensity = 0.18 * f;
    // The visor breathes — the one part of a headset that looks alive.
    if (visorMatRef.current) {
      visorMatRef.current.opacity = Math.min(1, (0.85 + Math.sin(t * 1.4) * 0.15) * f);
    }
    panelMatRefs.current.forEach((m, i) => {
      if (!m) return;
      const wave = 0.5 + Math.sin(t * 1.1 + i * 1.2) * 0.5;
      m.opacity = Math.min(0.85, (0.3 + wave * 0.5) * f);
    });
  });

  return (
    <group>
      {/* Stand */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.8, 0.92, 0.3, 20]} />
        <meshStandardMaterial color="#1b1638" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.25, 0]}>
        <cylinderGeometry args={[0.1, 0.14, 2.0, 12]} />
        <meshStandardMaterial color="#2a2150" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Headset. Raised clear of the courier's head — at chest height it sat
          directly behind them from the approach mark and was simply hidden. */}
      <group ref={headsetRef} position={[0, 2.7, 0]}>
        <mesh>
          <boxGeometry args={[1.3, 0.62, 0.6]} />
          <meshStandardMaterial
            ref={shellMatRef}
            color="#2c2263"
            metalness={0.7}
            roughness={0.3}
            emissive={accentColor}
            emissiveIntensity={0.16}
          />
        </mesh>
        {/* Visor */}
        <mesh position={[0, 0.02, 0.31]}>
          <planeGeometry args={[1.14, 0.42]} />
          <meshBasicMaterial
            ref={visorMatRef}
            color={accentColor}
            transparent
            opacity={0.6}
            toneMapped={false}
          />
        </mesh>
        {/* Head strap */}
        <mesh position={[0, 0.02, -0.15]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.46, 0.06, 8, 22, Math.PI]} />
          <meshStandardMaterial color="#241c48" metalness={0.5} roughness={0.45} />
        </mesh>
      </group>

      {/* Holographic panels orbiting the headset */}
      <group ref={panelGroupRef} position={[0, 2.7, 0]}>
        {Array.from({ length: PANELS }, (_, i) => {
          const angle = (i / PANELS) * Math.PI * 2;
          const r = 1.7;
          return (
            <group
              key={i}
              position={[Math.sin(angle) * r, Math.sin(i * 1.7) * 0.35, Math.cos(angle) * r]}
              rotation={[0, angle, 0]}
            >
              <mesh>
                <planeGeometry args={[0.9, 0.62]} />
                <meshBasicMaterial
                  ref={(m) => {
                    panelMatRefs.current[i] = m;
                  }}
                  color={accentColor}
                  transparent
                  opacity={0.3}
                  toneMapped={false}
                  side={DoubleSide}
                  depthWrite={false}
                />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}

/** POWER CELL — a charging column whose cell fills, tops out, discharges to
 *  a bank of coils, and starts again. */
function PowerGeometry({ factorRef, accentColor, isTouch = false }) {
  const fillRef = useRef(null);
  const fillMatRef = useRef(null);
  const shellMatRef = useRef(null);
  const arcRefs = useRef([]);
  const arcMatRefs = useRef([]);
  const coilMatRefs = useRef([]);
  const clock = useRef(0);

  const COILS = isTouch ? 3 : 4;
  const CELL_H = 2.0;

  useFrame((_, delta) => {
    const f = factorRef.current;
    clock.current += delta;
    const t = clock.current;

    // Charge ramps over 4s, holds full, then dumps — a cycle you can read
    // at a glance, unlike a bar that just oscillates.
    const cycle = (t * 0.16) % 1;
    let charge;
    if (cycle < 0.65) charge = cycle / 0.65;
    else if (cycle < 0.8) charge = 1;
    else charge = 1 - (cycle - 0.8) / 0.2;

    if (fillRef.current) {
      fillRef.current.scale.y = Math.max(0.02, charge);
      fillRef.current.position.y = 0.65 + (charge * CELL_H) / 2;
    }
    if (fillMatRef.current) fillMatRef.current.opacity = Math.min(1, 0.85 * f);
    if (shellMatRef.current) shellMatRef.current.emissiveIntensity = (0.08 + charge * 0.3) * f;

    // Coils light in sequence only while the cell is dumping.
    const dumping = cycle >= 0.8;
    coilMatRefs.current.forEach((m, i) => {
      if (!m) return;
      const seq = dumping ? Math.max(0, 1 - Math.abs(((cycle - 0.8) / 0.2) * COILS - i)) : 0;
      m.opacity = Math.min(1, (0.2 + seq * 0.8) * f);
    });

    arcRefs.current.forEach((arc, i) => {
      if (!arc) return;
      arc.rotation.y = t * (1.6 + i * 0.4) + i;
      const m = arcMatRefs.current[i];
      if (m) m.opacity = Math.min(1, (0.15 + charge * 0.55) * f);
    });
  });

  return (
    <group>
      {/* Base */}
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[1.15, 1.3, 0.56, 22]} />
        <meshStandardMaterial color="#1b1638" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Cell shell */}
      <mesh position={[0, 1.65, 0]}>
        <cylinderGeometry args={[0.62, 0.62, CELL_H, 20, 1, true]} />
        <meshStandardMaterial
          ref={shellMatRef}
          color="#221a4a"
          metalness={0.6}
          roughness={0.3}
          emissive={accentColor}
          emissiveIntensity={0.12}
          side={DoubleSide}
        />
      </mesh>
      {/* Cell cap */}
      <mesh position={[0, 2.76, 0]}>
        <cylinderGeometry args={[0.7, 0.66, 0.22, 20]} />
        <meshStandardMaterial color="#2e2560" metalness={0.75} roughness={0.25} />
      </mesh>

      {/* The charge itself — a column scaled from its base */}
      <mesh ref={fillRef} position={[0, 0.65, 0]}>
        <cylinderGeometry args={[0.5, 0.5, CELL_H, 18]} />
        <meshBasicMaterial
          ref={fillMatRef}
          color={accentColor}
          transparent
          opacity={0.85}
          toneMapped={false}
        />
      </mesh>

      {/* Energy arcs spinning around the cell */}
      {[0, 1].map((i) => (
        <group
          key={i}
          ref={(g) => {
            arcRefs.current[i] = g;
          }}
          position={[0, 1.65, 0]}
          rotation={[i === 0 ? 0.4 : -0.35, 0, i === 0 ? 0.3 : -0.25]}
        >
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.95 + i * 0.22, 0.022, 8, 40]} />
            <meshBasicMaterial
              ref={(m) => {
                arcMatRefs.current[i] = m;
              }}
              color={accentColor}
              transparent
              opacity={0.4}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}

      {/* Discharge coils around the base */}
      {Array.from({ length: COILS }, (_, i) => {
        const angle = (i / COILS) * Math.PI * 2 + 0.5;
        const r = 1.75;
        return (
          <group key={i} position={[Math.sin(angle) * r, 0.35, Math.cos(angle) * r]}>
            <mesh>
              <cylinderGeometry args={[0.22, 0.26, 0.7, 12]} />
              <meshStandardMaterial color="#1d1740" metalness={0.6} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.38, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.2, 12]} />
              <meshBasicMaterial
                ref={(m) => {
                  coilMatRefs.current[i] = m;
                }}
                color={accentColor}
                transparent
                opacity={0.3}
                toneMapped={false}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** CREATOR STUDIO — a cinema camera on a tripod inside a ring light, with a
 *  boom mic overhead and a recording tally that blinks. */
function CreatorGeometry({ factorRef, accentColor, isTouch = false, lite = false }) {
  const ringRef = useRef(null);
  const ringMatRef = useRef(null);
  const bodyMatRef = useRef(null);
  const lensRef = useRef(null);
  const tallyMatRef = useRef(null);
  const boomRef = useRef(null);
  const clock = useRef(0);

  useFrame((_, delta) => {
    const f = factorRef.current;
    clock.current += delta;
    const t = clock.current;

    if (ringRef.current) ringRef.current.rotation.z = t * 0.12;
    if (ringMatRef.current) {
      // A ring light is the brightest object in any studio — held near the
      // top of its range rather than scaled down with the rest, because a
      // dim ring light just reads as a dark hoop.
      ringMatRef.current.opacity = Math.min(1, (0.85 + Math.sin(t * 0.9) * 0.12) * f);
    }
    if (bodyMatRef.current) bodyMatRef.current.emissiveIntensity = 0.14 * f;
    // The lens racks focus — a slow in-and-out, the way a camera hunts.
    if (lensRef.current) lensRef.current.position.z = 0.52 + Math.sin(t * 0.7) * 0.07;
    if (boomRef.current) boomRef.current.rotation.z = -0.5 + Math.sin(t * 0.45) * 0.09;
    if (tallyMatRef.current) {
      // A hard on/off blink, not a fade — tally lights do not dim.
      tallyMatRef.current.opacity = ((t * 1.2) % 1) < 0.5 ? Math.min(1, f) : 0.08;
    }
  });

  return (
    <group>
      {/* Tripod */}
      {[0, 1, 2].map((i) => {
        const angle = (i / 3) * Math.PI * 2 + 0.3;
        return (
          <mesh
            key={i}
            position={[Math.sin(angle) * 0.42, 0.62, Math.cos(angle) * 0.42]}
            rotation={[Math.cos(angle) * 0.3, 0, -Math.sin(angle) * 0.3]}
          >
            <cylinderGeometry args={[0.045, 0.06, 1.3, 8]} />
            <meshStandardMaterial color="#2a2150" metalness={0.65} roughness={0.35} />
          </mesh>
        );
      })}

      {/* Camera body */}
      <group position={[0, 1.6, 0]}>
        <mesh>
          <boxGeometry args={[0.95, 0.7, 0.95]} />
          <meshStandardMaterial
            ref={bodyMatRef}
            color="#2b2159"
            metalness={0.7}
            roughness={0.3}
            emissive={accentColor}
            emissiveIntensity={0.12}
          />
        </mesh>
        {/* Lens */}
        <mesh ref={lensRef} position={[0, 0, 0.52]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.26, 0.3, 0.5, 18]} />
          <meshStandardMaterial color="#15102e" metalness={0.85} roughness={0.15} />
        </mesh>
        <mesh position={[0, 0, 0.8]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.2, 18]} />
          <meshBasicMaterial color={accentColor} transparent opacity={0.7} toneMapped={false} />
        </mesh>
        {/* Top handle */}
        <mesh position={[0, 0.44, 0]}>
          <boxGeometry args={[0.7, 0.09, 0.16]} />
          <meshStandardMaterial color="#2e2560" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Record tally */}
        <mesh position={[0.3, 0.22, 0.49]}>
          <circleGeometry args={[0.055, 10]} />
          <meshBasicMaterial ref={tallyMatRef} color="#ff3366" transparent opacity={1} toneMapped={false} />
        </mesh>
      </group>

      {/* Ring light framing the camera */}
      <group ref={ringRef} position={[0, 1.85, -0.5]}>
        <mesh>
          <torusGeometry args={[1.55, 0.075, 10, isTouch ? 28 : 44]} />
          <meshStandardMaterial
            color="#3a2d6e"
            metalness={0.5}
            roughness={0.4}
            emissive="#efe6ff"
            emissiveIntensity={0.55}
          />
        </mesh>
        <mesh>
          <torusGeometry args={[1.55, 0.045, 8, isTouch ? 28 : 44]} />
          <meshBasicMaterial
            ref={ringMatRef}
            color="#fbf7ff"
            transparent
            opacity={0.9}
            toneMapped={false}
          />
        </mesh>
      </group>
      {!lite && <pointLight position={[0, 1.85, 0.5]} color="#efe6ff" intensity={1.8} distance={9} decay={2} />}

      {/* Boom mic */}
      <group ref={boomRef} position={[-1.5, 2.7, 0.3]} rotation={[0, 0, -0.5]}>
        <mesh position={[0.9, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.035, 0.035, 1.8, 8]} />
          <meshStandardMaterial color="#2a2150" metalness={0.65} roughness={0.35} />
        </mesh>
        <mesh position={[1.8, 0, 0]}>
          <capsuleGeometry args={[0.11, 0.34, 4, 10]} />
          <meshStandardMaterial color="#191238" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

/** FLIGHT DECK — a quadcopter hovering over a landing pad, rotors spinning,
 *  with pad lights running a landing sequence. */
function DronesGeometry({ factorRef, accentColor, isTouch = false }) {
  const droneRef = useRef(null);
  const rotorRefs = useRef([]);
  const bodyMatRef = useRef(null);
  const beamMatRef = useRef(null);
  const padMatRefs = useRef([]);
  const clock = useRef(0);

  const PAD_LIGHTS = isTouch ? 4 : 8;
  const ARMS = [
    [1, 1],
    [1, -1],
    [-1, -1],
    [-1, 1],
  ];

  useFrame((_, delta) => {
    const f = factorRef.current;
    clock.current += delta;
    const t = clock.current;

    if (droneRef.current) {
      // Hover drift on two axes at unrelated rates — a single sine reads
      // like an elevator, two read like something holding station.
      droneRef.current.position.y = 2.35 + Math.sin(t * 1.15) * 0.14;
      droneRef.current.position.x = Math.sin(t * 0.53) * 0.18;
      droneRef.current.rotation.z = Math.sin(t * 0.53) * -0.07;
      droneRef.current.rotation.y = Math.sin(t * 0.31) * 0.35;
    }
    // Fast enough to blur into a disc, alternating direction per pair the
    // way a real quad's rotors do.
    rotorRefs.current.forEach((r, i) => {
      if (r) r.rotation.y += delta * (i % 2 === 0 ? 34 : -34);
    });

    if (bodyMatRef.current) bodyMatRef.current.emissiveIntensity = 0.2 * f;
    if (beamMatRef.current) beamMatRef.current.opacity = Math.min(0.22, 0.18 * f);

    padMatRefs.current.forEach((m, i) => {
      if (!m) return;
      const seq = (t * 0.9 + i / PAD_LIGHTS) % 1;
      const on = seq < 0.3 ? 1 - seq / 0.3 : 0;
      m.opacity = Math.min(1, (0.22 + on * 0.75) * f);
    });
  });

  return (
    <group>
      {/* Landing pad */}
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[1.85, 2.0, 0.24, 26]} />
        <meshStandardMaterial color="#1b1638" metalness={0.55} roughness={0.45} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.25, 0]}>
        <ringGeometry args={[1.05, 1.2, 32]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.5} toneMapped={false} />
      </mesh>
      {/* Pad edge lights running a landing sequence */}
      {Array.from({ length: PAD_LIGHTS }, (_, i) => {
        const angle = (i / PAD_LIGHTS) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.sin(angle) * 1.62, 0.26, Math.cos(angle) * 1.62]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[0.13, 10]} />
            <meshBasicMaterial
              ref={(m) => {
                padMatRefs.current[i] = m;
              }}
              color={accentColor}
              transparent
              opacity={0.3}
              toneMapped={false}
            />
          </mesh>
        );
      })}

      {/* Downwash beam */}
      <mesh position={[0, 1.3, 0]}>
        <cylinderGeometry args={[0.5, 1.25, 2.0, 20, 1, true]} />
        <meshBasicMaterial
          ref={beamMatRef}
          color={accentColor}
          transparent
          opacity={0.18}
          toneMapped={false}
          side={DoubleSide}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* The drone */}
      <group ref={droneRef} position={[0, 2.35, 0]}>
        {/* Fuselage */}
        <mesh>
          <boxGeometry args={[0.62, 0.24, 0.9]} />
          <meshStandardMaterial
            ref={bodyMatRef}
            color="#1e1745"
            metalness={0.72}
            roughness={0.28}
            emissive={accentColor}
            emissiveIntensity={0.18}
          />
        </mesh>
        {/* Gimbal camera slung underneath */}
        <mesh position={[0, -0.2, 0.3]}>
          <sphereGeometry args={[0.15, 12, 10]} />
          <meshStandardMaterial color="#15102e" metalness={0.85} roughness={0.18} />
        </mesh>
        <mesh position={[0, -0.2, 0.44]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.075, 10]} />
          <meshBasicMaterial color={accentColor} transparent opacity={0.9} toneMapped={false} />
        </mesh>

        {/* Arms, motors and rotors */}
        {ARMS.map(([sx, sz], i) => (
          <group key={i} position={[sx * 0.62, 0, sz * 0.62]}>
            <mesh position={[-sx * 0.3, 0, -sz * 0.3]} rotation={[0, Math.atan2(sx, sz), 0]}>
              <boxGeometry args={[0.1, 0.07, 0.72]} />
              <meshStandardMaterial color="#241c48" metalness={0.6} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.06, 0]}>
              <cylinderGeometry args={[0.12, 0.14, 0.16, 10]} />
              <meshStandardMaterial color="#2e2560" metalness={0.7} roughness={0.3} />
            </mesh>
            <group
              ref={(g) => {
                rotorRefs.current[i] = g;
              }}
              position={[0, 0.16, 0]}
            >
              {/* Two thin blades read as a spinning disc once they blur */}
              {[0, Math.PI / 2].map((a) => (
                <mesh key={a} rotation={[0, a, 0]}>
                  <boxGeometry args={[0.9, 0.012, 0.09]} />
                  <meshBasicMaterial
                    color={accentColor}
                    transparent
                    opacity={0.4}
                    toneMapped={false}
                  />
                </mesh>
              ))}
            </group>
            {/* Nav light: green forward, red aft, as on the real thing */}
            <mesh position={[0, -0.05, 0]}>
              <sphereGeometry args={[0.045, 8, 6]} />
              <meshBasicMaterial color={sz > 0 ? '#3ef2a0' : '#ff3366'} toneMapped={false} />
            </mesh>
          </group>
        ))}
      </group>
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
  handhelds: HandheldsGeometry,
  vision: VisionGeometry,
  power: PowerGeometry,
  creator: CreatorGeometry,
  drones: DronesGeometry,
};

/**
 * One zone: shared platform + accent ring + point light + distinctive upper
 * architecture (delegated to a variant component) + a DOM label anchored in
 * 3D space. All hover/active/subdued visual response is driven by mutating
 * refs inside useFrame (reading the store via getSnapshot(), no subscription)
 * so hovering never triggers a React re-render of the 3D subtree — only the
 * Html label (real DOM) re-renders on state change, via useVaultStore.
 */
const Zone = ({ config, isTouch, lite = false }) => {
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
  // Turn the exhibit to face the mark the player actually walks to.
  // Several of the approach marks are angled away from +Z to dodge a
  // neighbour's trigger radius (see zoneConfig's APPROACH table), so an
  // exhibit with a front — the vault door, the house, the monitor — would
  // otherwise be presented edge-on or from behind to everyone who walks up.
  // The platform, pool and label all stay unrotated; they are radially
  // symmetric, so only the object itself needs turning.
  const faceAngle = Math.atan2(
    config.approach[0] - config.position[0],
    config.approach[1] - config.position[2]
  );
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
    // Idle sits higher than it used to. Everything emissive in every exhibit
    // scales off this number, and once the sky and ambient were lifted, a
    // district resting at 0.58 stopped out-glowing its own surroundings — the
    // exhibits went from reading as lit displays to unlit props on a lit floor.
    else targetFactor = hovered ? 1.05 : 0.75;
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
        {/* Two point lights per district, thirteen districts. On the tier
            that can afford them they are what makes an exhibit read as a lit
            display; on the tier that cannot, they are twenty-six extra
            iterations in every fragment shader in the scene, and the raised
            hemisphere in VaultCanvas stands in for them. */}
        {!lite && (
          <pointLight ref={floorLightRef} position={[0, 0.5, 0]} color={accentColor} intensity={0} distance={poolRadius * 1.6} decay={1} />
        )}

        {/* Sits near the label, not at a fixed mid-height — an overhead
            light is what makes top-facing surfaces read as "receiving a
            spotlight from above" rather than an ambient fill; it's also
            what the new beam below visually represents. */}
        {!lite && (
          <pointLight ref={lightRef} position={[0, beamTop, 0]} color={accentColor} intensity={0.35} distance={12} decay={1.6} />
        )}

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

        <group rotation={[0, faceAngle, 0]}>
          <GeometryComponent factorRef={factorRef} accentColor={accentColor} isTouch={isTouch} lite={lite} />
        </group>
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
