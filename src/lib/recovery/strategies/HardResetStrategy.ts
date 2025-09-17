// src/lib/recovery/strategies/HardResetStrategy.ts
// Hard Reset strategy: clears application storage and reloads the page/app
// Priority 5: last resort after other recovery strategies

import { RecoveryStrategy, RecoveryContext, RecoveryResult } from '../ErrorRecoverySystem';
import { AppError } from '../../errorStore';
import { logger } from '../../logger';
import { designsStore } from '@services/storage';

export class HardResetStrategy implements RecoveryStrategy {
  public readonly name = 'hard-reset';
  public readonly priority = 5; // Lowest priority, last resort

  public canHandle(error: AppError): boolean {
    // Only for severe failures or when explicitly forced
    const severe = error.severity === 'critical' || error.severity === 'high';
    const forced = Boolean((error.context?.additionalData as any)?.forceHardReset);
    return severe || forced;
  }

  public async execute(error: AppError, _context: RecoveryContext): Promise<RecoveryResult> {
    logger.warn('Executing HARD RESET due to unrecoverable error', { errorId: error.id });

    try {
      // Try to clear all relevant storages
      try { localStorage.clear(); } catch (e) { logger.warn('localStorage.clear failed', e); }
      try { sessionStorage.clear(); } catch (e) { logger.warn('sessionStorage.clear failed', e); }

      try {
        await designsStore.clear();
      } catch (e) {
        logger.warn('IndexedDB (localforage) clear failed', e);
      }

      // As an extra attempt, try clearing default localforage instance if present
      try {
        const lf = (await import('localforage')).default;
        await lf.clear();
      } catch {
        // Optional best-effort; ignore if not available
      }

      // Reload application
      if (typeof window !== 'undefined' && window.location) {
        // Return before actual reload to avoid dangling promises
        setTimeout(() => {
          try {
            window.location.reload();
          } catch (e) {
            logger.error('window.location.reload failed during hard reset', e);
          }
        }, 0);
      }

      return {
        success: true,
        strategy: this.name,
        message: 'Application storage cleared; reloading',
        nextAction: 'reload'
      };
    } catch (e) {
      logger.error('Hard reset failed', e);
      return {
        success: false,
        strategy: this.name,
        message: 'Hard reset encountered an error'
      };
    }
  }
}
