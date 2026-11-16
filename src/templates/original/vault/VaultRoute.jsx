import { lazy, Suspense, useEffect } from 'react';
import { useDeviceCapability } from './hooks/useDeviceCapability';
import VaultDomFallback from './fallback/VaultDomFallback';
import VaultLoadingScreen from './overlay/VaultLoadingScreen';
import VaultErrorBoundary from './VaultErrorBoundary';

// The three.js/@react-three chunk is only ever requested from here — every
// other route (Home, Shop, Product, Checkout, ...) never pays for it.
const VaultExperience = lazy(() => import('./VaultExperience'));

const VaultRoute = () => {
  const capability = useDeviceCapability();

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'THE NEON VAULT — Enter the Experience';
    return () => { document.title = previousTitle; };
  }, []);

  if (!capability.supported) {
    return <VaultDomFallback reason={capability.reason} />;
  }

  return (
    <VaultErrorBoundary fallback={<VaultDomFallback reason="error" />}>
      <Suspense fallback={<VaultLoadingScreen />}>
        <VaultExperience isTouch={capability.isTouch} lite={capability.lite} />
      </Suspense>
    </VaultErrorBoundary>
  );
};

export default VaultRoute;
