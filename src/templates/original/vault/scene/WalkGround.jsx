import { useCallback, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils } from 'three';
import { WORLD_CENTER, WORLD_RADIUS } from '../zoneConfig';
import { player, pointerState, setWalkTarget } from '../state/playerStore';
import { getSnapshot } from '../state/vaultStore';

const CYAN = '#22d3ee';

/**
 * The floor's click surface plus the destination marker that lands on it.
 *
 * The mesh is invisible but still raycastable (three tests geometry, not
 * material opacity), so it captures taps anywhere on the disc without
 * painting anything — VaultFloor draws the actual visible ground. It sits
 * under the zones' own hit volumes, so tapping an exhibit still resolves to
 * that exhibit rather than to the floor behind it.
 */
const WalkGround = () => {
  const markerRef = useRef(null);
  const ringOuterRef = useRef(null);
  const ringInnerRef = useRef(null);
  const pulse = useRef(0);
  const visibility = useRef(0);

  const handleClick = useCallback((e) => {
    // A click that ends a camera drag is not a walk order.
    if (pointerState.dragged) return;
    if (getSnapshot().mode !== 'overview') return;
    e.stopPropagation();
    setWalkTarget(e.point.x, e.point.z);
  }, []);

  const handleOver = useCallback(() => {
    if (getSnapshot().mode !== 'overview') return;
    document.body.style.cursor = 'pointer';
  }, []);

  const handleOut = useCallback(() => {
    document.body.style.cursor = '';
  }, []);

  useFrame((_, delta) => {
    const marker = markerRef.current;
    if (!marker) return;

    const dt = Math.min(delta, 0.1);
    const active = player.moving && getSnapshot().mode === 'overview';

    marker.position.set(player.target.x, 0.05, player.target.z);
    visibility.current = MathUtils.damp(visibility.current, active ? 1 : 0, 8, dt);

    if (active) pulse.current = (pulse.current + dt * 1.6) % 1;
    else pulse.current = 0;

    const grow = 0.55 + pulse.current * 0.75;
    if (ringOuterRef.current) {
      ringOuterRef.current.scale.setScalar(grow);
      ringOuterRef.current.material.opacity = visibility.current * (1 - pulse.current) * 0.7;
    }
    if (ringInnerRef.current) {
      ringInnerRef.current.material.opacity = visibility.current * 0.85;
    }
  });

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[WORLD_CENTER[0], 0.01, WORLD_CENTER[1]]}
        onClick={handleClick}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
      >
        <circleGeometry args={[WORLD_RADIUS + 0.5, 64]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Destination marker: a steady inner disc with an expanding ring
          washing outward from it, so the eye can find where it just tapped
          without the marker competing with the zones' own floor pools. */}
      <group ref={markerRef}>
        <mesh ref={ringInnerRef} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.2, 0.3, 28]} />
          <meshBasicMaterial color={CYAN} transparent opacity={0} toneMapped={false} depthWrite={false} />
        </mesh>
        <mesh ref={ringOuterRef} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.42, 0.52, 32]} />
          <meshBasicMaterial color={CYAN} transparent opacity={0} toneMapped={false} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
};

export default WalkGround;
