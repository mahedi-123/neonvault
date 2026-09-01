import { useMemo } from 'react';
import { WORLD_CENTER, WORLD_RADIUS, zones } from '../zoneConfig';

const VIOLET = '#8b5cf6';
const CYAN = '#22d3ee';

/**
 * The vault's ground.
 *
 * Two jobs beyond "be a surface". First, legibility at walking height: the
 * floor is most of the frame down there, and a featureless plane gives no
 * sense of movement, so it carries a grid, radial spokes and lit paths that
 * slide past as you walk. Second, wayfinding: the districts sit on two
 * rings, and the floor draws those rings as actual roads plus spokes out
 * to each one, so the layout is readable from the ground rather than only
 * from the minimap.
 *
 * Everything here is flat geometry with basic materials — no textures, no
 * shadow maps — which keeps the neon reading as light rather than as paint.
 */

const SPOKE_COUNT = 16;
/** Ring roads, matched to the district ring radii in zoneConfig. */
const RING_ROADS = [12, 24];

const VaultFloor = ({ isTouch = false }) => {
  const [cx, cz] = WORLD_CENTER;

  const rings = useMemo(() => {
    const base = [6, 12, 18, 24, WORLD_RADIUS];
    return isTouch ? [12, 24, WORLD_RADIUS] : base;
  }, [isTouch]);

  const spokes = useMemo(
    () => Array.from({ length: SPOKE_COUNT }, (_, i) => (i / SPOKE_COUNT) * Math.PI * 2),
    []
  );

  // Markers standing just outside the walkable edge — they are what tells the
  // player where the world stops, instead of the floor simply ending.
  //
  // Deliberately KNEE HIGH. An earlier pass made these tall pylons, and
  // because the follow camera sits behind the player it ends up outside the
  // walkable circle whenever they near the edge — so the boundary was
  // constantly standing between the camera and the courier. Anything
  // permanently ringing the play area has to stay below the sightline.
  const pylons = useMemo(() => {
    const count = isTouch ? 24 : 44;
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const r = WORLD_RADIUS + 2.2;
      const height = 0.75 + (i % 3) * 0.2;
      return {
        key: i,
        position: [cx + Math.sin(angle) * r, height / 2, cz + Math.cos(angle) * r],
        height,
      };
    });
  }, [cx, cz, isTouch]);

  // A lit path from each district's approach mark back toward the centre, so
  // from anywhere on the floor there is a line to follow to somewhere.
  const spurs = useMemo(
    () =>
      zones
        .filter((z) => z.id !== 'core')
        .map((zone) => {
          const [ax, az] = zone.approach;
          const dx = cx - ax;
          const dz = cz - az;
          const len = Math.hypot(dx, dz);
          return {
            key: zone.id,
            // Centred halfway along the run from mark to middle.
            position: [ax + dx / 2, 0.17, az + dz / 2],
            angle: Math.atan2(dx, dz),
            length: len,
            color: zone.accent === 'cyan' ? CYAN : VIOLET,
          };
        }),
    [cx, cz]
  );

  return (
    <group>
      {/* Base disc */}
      <mesh position={[cx, -0.06, cz]}>
        <cylinderGeometry args={[WORLD_RADIUS + 3, WORLD_RADIUS + 3, 0.4, 84]} />
        <meshStandardMaterial color="#191634" metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Walkable inlay — a shade lighter than the base so the playable area
          is legible as a distinct surface from the ground camera. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.145, cz]}>
        <circleGeometry args={[WORLD_RADIUS, 84]} />
        <meshStandardMaterial color="#241f47" metalness={0.28} roughness={0.62} />
      </mesh>

      {/* Concentric rings; the two district rings are drawn heavier, as roads */}
      {rings.map((radius) => {
        const isRoad = RING_ROADS.includes(radius);
        return (
          <mesh key={`ring-${radius}`} rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.16, cz]}>
            <ringGeometry args={[radius - (isRoad ? 0.5 : 0.02), radius + (isRoad ? 0.5 : 0.02), 128]} />
            <meshBasicMaterial
              color={isRoad ? '#6f5eb0' : '#5b4f85'}
              transparent
              opacity={isRoad ? 0.16 : 0.24}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
        );
      })}

      {/* Radial spokes — these are what give walking a sense of speed */}
      {!isTouch &&
        spokes.map((angle, i) => (
          <mesh
            key={`spoke-${i}`}
            rotation={[-Math.PI / 2, 0, -angle]}
            position={[
              cx + Math.sin(angle) * (WORLD_RADIUS / 2),
              0.155,
              cz + Math.cos(angle) * (WORLD_RADIUS / 2),
            ]}
          >
            <planeGeometry args={[0.04, WORLD_RADIUS]} />
            <meshBasicMaterial
              color="#6355a0"
              transparent
              opacity={0.18}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
        ))}

      {/* Lit spur from every district back toward the middle */}
      {spurs.map((spur) => (
        <mesh
          key={`spur-${spur.key}`}
          rotation={[-Math.PI / 2, 0, -spur.angle]}
          position={spur.position}
        >
          <planeGeometry args={[0.5, spur.length]} />
          <meshBasicMaterial
            color={spur.color}
            transparent
            opacity={0.1}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Entrance walkway: a lit strip running from the spawn mark inward,
          so the first thing the player sees is somewhere to go. */}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh
          key={`path-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.17, 14.5 - i * 1.35]}
        >
          <planeGeometry args={[1.8, 0.5]} />
          <meshBasicMaterial
            color={CYAN}
            transparent
            opacity={0.26 - i * 0.02}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Approach pads — a printed mark on the floor in front of every
          district, so "walk here" is a place you can see rather than a
          radius you discover by accident. */}
      {zones.map((zone) => (
        <group key={`pad-${zone.id}`} position={[zone.approach[0], 0.17, zone.approach[1]]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.7, 0.82, 32]} />
            <meshBasicMaterial
              color={zone.accent === 'cyan' ? CYAN : VIOLET}
              transparent
              opacity={0.45}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.68, 24]} />
            <meshBasicMaterial
              color={zone.accent === 'cyan' ? CYAN : VIOLET}
              transparent
              opacity={0.1}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}

      {/* Boundary markers */}
      {pylons.map((pylon) => (
        <group key={`pylon-${pylon.key}`} position={pylon.position}>
          <mesh>
            <boxGeometry args={[0.28, pylon.height, 0.28]} />
            <meshStandardMaterial color="#241d44" metalness={0.5} roughness={0.5} />
          </mesh>
          <mesh position={[0, pylon.height / 2 + 0.04, 0]}>
            <boxGeometry args={[0.36, 0.07, 0.36]} />
            <meshBasicMaterial color={VIOLET} transparent opacity={0.85} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

export default VaultFloor;
