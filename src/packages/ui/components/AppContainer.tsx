import React from 'react';
import { AppContent } from './AppContainer/AppContent';

// Re-export types for external use
export type { AppVariant, VariantFeatures as FeatureConfig } from '@/shared/hooks/useAppVariant';

// Main app container
export default function AppContainer() {
  const [resetCounter, setResetCounter] = React.useState(0);

  // Listen for controlled component reset requests from recovery strategies
  React.useEffect(() => {
    const handler = () => setResetCounter(c => c + 1);
    window.addEventListener('archicomm:component-reset', handler as EventListener);
    return () => window.removeEventListener('archicomm:component-reset', handler as EventListener);
  }, []);

  return (
    <>
      {/* Main app content - key change forces controlled remount */}
      <AppContent key={resetCounter} />

      {/* Performance monitor disabled to reduce overhead */}
      {/* Development tools can be accessed via browser console debug utilities */}
    </>
  );
}
