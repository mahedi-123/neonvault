import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ENTRY_POSE, MOBILE_ENTRY_POSE } from '../zoneConfig';
import VaultSky from './VaultSky';
import VaultFloor from './VaultFloor';
import Skyline from './Skyline';
import WorldBarrier from './WorldBarrier';
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
      camera={{ position: entryPose.eye, fov: isTouch ? 55 : 48, near: 0.1, far: 520 }}
      className="!fixed inset-0"
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.3;
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          onContextLost?.();
        }, { once: true });
      }}
    >
      {/* Fallback clear colour, matched to the sky's horizon band so a frame
          rendered before the dome is ready doesn't flash black. */}
      <color attach="background" args={['#191140']} />
      {/* Thinned right down along with the world's growth. At the old
          density the far side of a 62-unit-wide floor was solid fog — you
          could not see a district until you were nearly standing in it,
          which is the opposite of somewhere you want to explore. This keeps
          distance readable as haze rather than as a wall. Thinned again when
          the city went in outside the barrier: at 0.0085 the nearest towers
          were already half-dissolved, which defeats the point of putting
          something out there to look at. */}
      <fogExp2 attach="fog" args={['#2a1e52', 0.0062]} />

      <VaultSky />
      {/* Everything past the walkable floor: the city, the plate it stands
          on, and the shield that marks where you have to stop. Drawn before
          the districts so the transparent shield sorts against a backdrop
          that is already there. */}
      <Skyline isTouch={isTouch} />

      {/* Fill — soft ambient so nothing goes fully black. The ground half is
          a lit teal rather than near-black: it is what stops the underside
          of every object reading as a hole in the floor. */}
      <hemisphereLight args={['#9484d8', '#1e3149', 1.15]} />
      {/* Key — the dominant light, defines the main highlight direction */}
      <directionalLight position={[7, 14, 8]} intensity={1.0} color="#d8cbff" />
      {/* Rim — behind the districts (far -Z), backlights every silhouette so
          dark objects separate from the backdrop */}
      <directionalLight position={[-4, 12, -46]} intensity={0.85} color="#9fe1f2" />
      {/* Two broad, very soft washes standing in for bounce off the floor —
          cheaper than any global-illumination pass and enough to keep the
          middle of the disc from falling away between the lit pools. */}
      <pointLight position={[0, 9, 10]} intensity={0.5} color="#22d3ee" distance={60} decay={1.6} />
      <pointLight position={[0, 9, -34]} intensity={0.45} color="#8b5cf6" distance={60} decay={1.6} />

      <VaultFloor isTouch={isTouch} />
      <WorldBarrier isTouch={isTouch} />
      <WorldProps isTouch={isTouch} />
      <ZoneField isTouch={isTouch} />
      <WalkGround />
      <Player isTouch={isTouch} />
      <CameraRig isTouch={isTouch} />
    </Canvas>
  );
};

export default VaultCanvas;
