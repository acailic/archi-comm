// src/lib/recovery/strategies/ComponentResetStrategy.ts
// Component Reset strategy that triggers a controlled React remount without a full page reload
// Priority 2: runs after AutoSave, before backup/soft reload strategies

import { RecoveryStrategy, RecoveryContext, RecoveryResult } from '../ErrorRecoverySystem';
import { AppError } from '../../errorStore';
import { logger } from '../../logger';

export class ComponentResetStrategy implements RecoveryStrategy {
  public readonly name = 'component-reset';
  public readonly priority = 2; // After auto-save

  public canHandle(error: AppError): boolean {
    // Prefer for React/global rendering issues at high/critical severity
    const relevantCategories = ['react', 'global'];
    const relevantSeverities = ['high', 'critical'];
    return relevantCategories.includes(error.category) || relevantSeverities.includes(error.severity);
  }

  public async execute(error: AppError, context: RecoveryContext): Promise<RecoveryResult> {
    try {
      logger.info('Dispatching component reset event for controlled remount', { errorId: error.id });

      // Emit a custom event that the root listens to in order to remount key components
      const detail = { reason: 'error-recovery', errorId: error.id, timestamp: Date.now() };
      const evt = new CustomEvent('archicomm:component-reset', { detail });
      window.dispatchEvent(evt);

      // Small delay to allow event handlers to run
      await new Promise(resolve => setTimeout(resolve, 10));

      return {
        success: true,
        strategy: this.name,
        message: 'Triggered controlled component remount',
        nextAction: 'continue'
      };
    } catch (e) {
      logger.warn('Component reset strategy failed to dispatch event', e);
      return {
        success: false,
        strategy: this.name,
        message: 'Failed to trigger component reset'
      };
    }
  }
}

