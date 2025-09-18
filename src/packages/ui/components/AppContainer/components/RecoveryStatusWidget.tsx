import React from 'react';
import { isDevelopment } from '@/lib/environment';
import type { AppVariant } from '../AppContent';

interface RecoveryStatusWidgetProps {
  variant: AppVariant;
  isRecovering: boolean;
}

export function RecoveryStatusWidget({ variant, isRecovering }: RecoveryStatusWidgetProps) {
  if (!isDevelopment()) {
    return null;
  }

  return (
    <div style={{ position: 'fixed', bottom: 8, right: 8, fontSize: 11, opacity: 0.5 }}>
      Variant: {variant} | Recovery: {isRecovering ? 'Active' : 'Ready'}
    </div>
  );
}
