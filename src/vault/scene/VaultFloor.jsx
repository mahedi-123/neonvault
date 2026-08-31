import { useMemo } from 'react';
import { WORLD_CENTER, WORLD_RADIUS, zones } from '../zoneConfig';

const VIOLET = '#8b5cf6';
const CYAN = '#22d3ee';

/**
 * The vault's ground. Rewritten for the walkable world: when the camera sat
 * high and still, a bare disc with two rings was enough — but at walking
 * height the floor is most of the frame, and a featureless plane gives no
 * sense of movement. So the ground now carries structure the player passes
 * over: a concentric grid, radial spokes, a lit walkway from the entrance,
 * and an approach pad printed in front of every exhibit.
 *
 * Still no texture assets — everything here is flat geometry with basic
 * materials, which costs almost nothing and keeps the neon reading as light
 * rather than as paint.
 */

const SPOKE_COUNT = 12;

const VaultFloor = ({ isTouch = false }) => {
  const [cx, cz] = WORLD_CENTER;

  const rings = useMemo(() => {
    const base = [5, 9, 13, 17, WORLD_RADIUS];
    return isTouch ? base.filter((_, i) => i % 2 === 0 || i === base.length - 1) : base;
  }, [isTouch]);

  const spokes = useMemo(
    () =>
      Array.from({ length: SPOKE_COUNT }, (_, i) => (i / SPOKE_COUNT) * Math.PI * 2),
    []
  );

  // Markers standing just outside the walkable edge — they are what tells the
  // player where the world stops, instead of the floor simply ending.
  //
  // Deliberately KNEE HIGH. The first pass made these tall pylons, and because
  // the follow camera sits behind the player it ends up outside the walkable
  // circle whenever they near the edge — so the boundary was constantly
  // standing between the camera and the courier. Anything permanently ringing
  // the play area has to stay below the camera's sightline.
  const pylons = useMemo(() => {
    const count = isTouch ? 18 : 30;
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

  return (
    <group>
      {/* Base disc */}
      <mesh position={[cx, -0.06, cz]}>
        <cylinderGeometry args={[WORLD_RADIUS + 2.5, WORLD_RADIUS + 2.5, 0.4, 72]} />
        <meshStandardMaterial color="#0c0a14" metalness={0.35} roughness={0.72} />
      </mesh>

      {/* Walkable inlay — a hair lighter than the base so the playable area
          is legible as a distinct surface from the ground camera. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.145, cz]}>
        <circleGeometry args={[WORLD_RADIUS, 72]} />
        <meshStandardMaterial color="#12101d" metalness={0.3} roughness={0.65} />
      </mesh>

      {/* Concentric rings */}
      {rings.map((radius) => (
        <mesh key={`ring-${radius}`} rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.16, cz]}>
          <ringGeometry args={[radius - 0.02, radius + 0.02, 96]} />
          <meshBasicMaterial color="#5b4f85" transparent opacity={0.2} toneMapped={false} depthWrite={false} />
        </mesh>
      ))}

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
            <planeGeometry args={[0.03, WORLD_RADIUS]} />
            <meshBasicMaterial
              color="#463c6b"
              transparent
              opacity={0.16}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
        ))}

      {/* Entrance walkway: a lit strip running from the spawn mark toward
          CORE, so the first thing the player sees is somewhere to go. */}
      {Array.from({ length: 7 }, (_, i) => (
        <mesh
          key={`path-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.17, 6.6 - i * 1.15]}
        >
          <planeGeometry args={[1.5, 0.45]} />
          <meshBasicMaterial
            color={CYAN}
            transparent
            opacity={0.24 - i * 0.025}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Approach pads — a printed mark on the floor in front of every
          exhibit, so "walk here" is a place you can see rather than a radius
          you discover by accident. */}
      {zones.map((zone) => (
        <group key={`pad-${zone.id}`} position={[zone.approach[0], 0.17, zone.approach[1]]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.7, 0.82, 32]} />
            <meshBasicMaterial
              color={zone.accent === 'cyan' ? CYAN : VIOLET}
              transparent
              opacity={0.4}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.68, 24]} />
            <meshBasicMaterial
              color={zone.accent === 'cyan' ? CYAN : VIOLET}
              transparent
              opacity={0.09}
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
            <meshStandardMaterial color="#161127" metalness={0.5} roughness={0.5} />
          </mesh>
          <mesh position={[0, pylon.height / 2 + 0.04, 0]}>
            <boxGeometry args={[0.36, 0.07, 0.36]} />
            <meshBasicMaterial color={VIOLET} transparent opacity={0.8} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

export default VaultFloor;
