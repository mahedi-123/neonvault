import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ENTRY_POSE, MOBILE_ENTRY_POSE } from '../zoneConfig';
import VaultSky from './VaultSky';
import VaultFloor from './VaultFloor';
import WorldProps from './WorldProps';
import ZoneField from './ZoneField';
import WalkGround from './WalkGround';
import Player from './Player';
import CameraRig from './CameraRig';

/**
 * The <Canvas> boundary — everything three.js-related lives under here.
 * Capped DPR, no shadow maps, no postprocessing pass; atmosphere comes from
 * the sky dome + fog + a small key/fill/rim lighting rig, not from expensive
 * render passes.
 *
 * The ambient level is deliberately higher than it was when this scene was a
 * fixed overhead view: at walking height the player is inside the world
 * rather than looking down on it, and a floor that fell to black two metres
 * ahead of the courier made the place feel unwalkable. The zones' own lights
 * still carry the contrast — this only lifts the floor off pure black.
 */
const VaultCanvas = ({ isTouch = false, onContextLost }) => {
  const [frameloop, setFrameloop] = useState(document.hidden ? 'never' : 'always');
  const entryPose = isTouch ? MOBILE_ENTRY_POSE : ENTRY_POSE;

  useEffect(() => {
    const handleVisibility = () => setFrameloop(document.hidden ? 'never' : 'always');
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  return (
    <Canvas
      frameloop={frameloop}
      dpr={[1, isTouch ? 1.5 : 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: entryPose.eye, fov: isTouch ? 55 : 48, near: 0.1, far: 200 }}
      className="!fixed inset-0"
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.45;
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          onContextLost?.();
        }, { once: true });
      }}
    >
      {/* Fallback clear colour, matched to the sky's horizon band so a frame
          rendered before the dome is ready doesn't flash black. */}
      <color attach="background" args={['#0a0715']} />
      <fogExp2 attach="fog" args={['#150c26', 0.017]} />

      <VaultSky />

      {/* Fill — soft ambient so nothing goes fully black */}
      <hemisphereLight args={['#6a58a8', '#0b0716', 0.75]} />
      {/* Key — the dominant light, defines the main highlight direction */}
      <directionalLight position={[7, 14, 8]} intensity={0.8} color="#c0acf8" />
      {/* Rim — behind the zones (far -Z), backlights every silhouette so dark
          objects separate from the backdrop */}
      <directionalLight position={[-4, 10, -34]} intensity={0.75} color="#8fd8ea" />
      <pointLight position={[0, 7, 6]} intensity={0.35} color="#22d3ee" distance={40} decay={2} />

      <VaultFloor isTouch={isTouch} />
      <WorldProps isTouch={isTouch} />
      <ZoneField isTouch={isTouch} />
      <WalkGround />
      <Player isTouch={isTouch} />
      <CameraRig isTouch={isTouch} />
    </Canvas>
  );
};

export default VaultCanvas;
