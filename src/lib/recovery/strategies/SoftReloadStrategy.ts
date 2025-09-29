import { RecoveryStrategy, RecoveryContext, RecoveryResult } from '../ErrorRecoverySystem';
import { AppError } from '../../errorStore';
import { logger } from '@lib/logging/logger';

const STORAGE_KEY = 'recovery:soft-reload';

interface StoredRecoveryPayload {
  timestamp: number;
  design?: unknown;
  sessionId: string;
}

export class SoftReloadStrategy implements RecoveryStrategy {
  readonly name = 'soft-reload';
  readonly priority = 2;

  canHandle(error: AppError): boolean {
    return error.severity === 'high' || error.category === 'react' || error.category === 'runtime';
  }

  async execute(_error: AppError, context: RecoveryContext): Promise<RecoveryResult> {
    try {
      this.preserveDesign(context);
      this.flagReload(context.sessionId);
      this.triggerReload();

      return {
        success: true,
        strategy: this.name,
        message: 'Attempting to recover by reloading the application.',
        nextAction: 'reload',
      };
    } catch (error) {
      logger.error('Soft reload strategy failed', error);
      return {
        success: false,
        strategy: this.name,
        message: error instanceof Error ? error.message : 'Soft reload failed',
        requiresUserAction: true,
        nextAction: 'reset',
      };
    }
  }

  private preserveDesign(context: RecoveryContext) {
    if (!context.currentDesignData || typeof window === 'undefined') {
      return;
    }

    try {
      const payload: StoredRecoveryPayload = {
        timestamp: Date.now(),
        design: context.currentDesignData,
        sessionId: context.sessionId,
      };

      window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(payload));
      logger.info('Design data preserved for soft reload');
    } catch (error) {
      logger.warn('Failed to preserve design data for reload', error);
    }
  }

  private flagReload(sessionId: string) {
    if (typeof window === 'undefined') return;

    try {
      const flag = {
        timestamp: Date.now(),
        sessionId,
        strategy: this.name,
      };
      window.localStorage?.setItem(`${STORAGE_KEY}:flag`, JSON.stringify(flag));
    } catch (error) {
      logger.warn('Failed to set recovery flag', error);
    }
  }

  private triggerReload() {
    if (typeof window === 'undefined') {
      throw new Error('Window object not available');
    }

    const reload = () => window.location.reload();

    // Attempt immediate reload and ensure a fallback after 5 seconds
    const fallback = window.setTimeout(() => reload(), 5000);
    try {
      reload();
    } catch (error) {
      logger.warn('Immediate reload failed, waiting for fallback', error);
    }

    window.setTimeout(() => window.clearTimeout(fallback), 6000);
  }

  static consumeRecoveryData(): { hasRecovery: boolean; recoveryData?: StoredRecoveryPayload } {
    if (typeof window === 'undefined') {
      return { hasRecovery: false };
    }

    try {
      const rawData = window.localStorage?.getItem(STORAGE_KEY);
      const rawFlag = window.localStorage?.getItem(`${STORAGE_KEY}:flag`);

      if (!rawData || !rawFlag) {
        return { hasRecovery: false };
      }

      window.localStorage?.removeItem(STORAGE_KEY);
      window.localStorage?.removeItem(`${STORAGE_KEY}:flag`);

      const parsed: StoredRecoveryPayload = JSON.parse(rawData);
      return { hasRecovery: true, recoveryData: parsed };
    } catch (error) {
      logger.warn('Failed to consume recovery data', error);
      return { hasRecovery: false };
    }
  }

  static async restoreDataAfterReload(payload: StoredRecoveryPayload): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      if (payload.design) {
        window.localStorage?.setItem('recovered_design', JSON.stringify(payload.design));
      }
    } catch (error) {
      logger.warn('Failed to restore design data after reload', error);
    }
  }
}
