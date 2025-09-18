import React from 'react';
import { RecoveryProvider } from '@/lib/recovery/RecoveryContext';
import { AppContent } from './AppContainer/AppContent';

// Re-export types for external use
export type { AppVariant, FeatureConfig } from './AppContainer/AppContent';

// Main app container with recovery provider
export default function AppContainer() {
  const [resetCounter, setResetCounter] = React.useState(0);

  // Listen for controlled component reset requests from recovery strategies
  React.useEffect(() => {
    const handler = () => setResetCounter(c => c + 1);
    window.addEventListener('archicomm:component-reset', handler as EventListener);
    return () => window.removeEventListener('archicomm:component-reset', handler as EventListener);
  }, []);

  return (
    <RecoveryProvider>
      {/* key change forces controlled remount */}
      <AppContent key={resetCounter} />
    </RecoveryProvider>
  );
}
