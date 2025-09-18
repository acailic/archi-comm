// src/lib/recovery/strategies/SoftReloadStrategy.ts
// Soft reload strategy that restarts the application while preserving user data
// Lower priority strategy for React errors, chunk load errors, and high severity errors
// RELEVANT FILES: src/lib/config/environment.ts, src/services/storage.ts

import { RecoveryStrategy, RecoveryContext, RecoveryResult } from '../ErrorRecoverySystem';
import { AppError } from '../../errorStore';
import { storage } from '@services/storage';
import { CanvasPersistence } from '@services/canvas/CanvasPersistence';
import { logger } from '@lib/logging/logger';

export class SoftReloadStrategy implements RecoveryStrategy {
  public readonly name = 'soft-reload';
  public readonly priority = 4; // Lower priority strategy

  public canHandle(error: AppError): boolean {
    // Handle React errors, chunk load errors, and high severity errors
    const reactErrorKeywords = ['chunk', 'loading', 'react', 'component', 'render'];
    const errorMessage = error.message.toLowerCase();

    return error.category === 'react' ||
           error.severity === 'high' ||
           reactErrorKeywords.some(keyword => errorMessage.includes(keyword));
  }

  public async execute(error: AppError, context: RecoveryContext): Promise<RecoveryResult> {
    logger.info('Starting soft reload recovery strategy', { errorId: error.id });

    try {
      // First ensure current data is preserved
      await this.preserveDataForReload(error, context);

      // Set recovery flags for post-reload restoration
      await this.setRecoveryFlags(context);

      // Determine and execute reload method
      const reloadMethod = this.determineReloadMethod();
      await this.executeReload(reloadMethod);

      // This code should never be reached after a successful reload
      logger.warn('Soft reload did not trigger page refresh');

      return {
        success: false,
        strategy: this.name,
        message: 'Soft reload failed to trigger page refresh',
        requiresUserAction: true,
        nextAction: 'reset'
      };
    } catch (reloadError) {
      logger.error('Soft reload recovery failed', reloadError);
      return {
        success: false,
        strategy: this.name,
        message: `Soft reload failed: ${reloadError instanceof Error ? reloadError.message : 'Unknown error'}`,
        requiresUserAction: true,
        nextAction: 'reset'
      };
    }
  }

  private async preserveDataForReload(error: AppError, context: RecoveryContext): Promise<void> {
    try {
      const emergencyData = {
        timestamp: Date.now(),
        errorId: error.id,
        sessionId: context.sessionId,
        projectId: context.projectId,
        preservedDesign: context.currentDesignData,
        preservedAudio: context.currentAudioData,
        preservedPreferences: context.userPreferences
      };

      // Use sessionStorage for data that should survive reload
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem('recovery_emergency_data', JSON.stringify(emergencyData));
      }

      // Also save to localStorage as backup
      await storage.setItem('recovery_emergency_data_backup', JSON.stringify(emergencyData));

      logger.info('Data preserved for soft reload', {
        sessionId: context.sessionId,
        hasDesign: !!context.currentDesignData,
        hasAudio: !!context.currentAudioData
      });
    } catch (error) {
      logger.error('Failed to preserve data for reload', error);
      throw new Error('Data preservation failed');
    }
  }

  private async setRecoveryFlags(context: RecoveryContext): Promise<void> {
    try {
      const recoveryFlag = {
        timestamp: Date.now(),
        sessionId: context.sessionId,
        strategy: this.name,
        shouldRestore: true
      };

      // Set flags in both storages
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem('recovery_flag', JSON.stringify(recoveryFlag));
      }

      await storage.setItem('recovery_flag_backup', JSON.stringify(recoveryFlag));

      logger.info('Recovery flags set for post-reload restoration');
    } catch (error) {
      logger.error('Failed to set recovery flags', error);
      throw new Error('Recovery flag setup failed');
    }
  }

  private determineReloadMethod(): 'web' | 'tauri' {
    // Check if we're running in Tauri environment
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      return 'tauri';
    }
    return 'web';
  }

  private async executeReload(method: 'web' | 'tauri'): Promise<void> {
    logger.info(`Executing ${method} reload`);

    if (method === 'tauri') {
      await this.executeTauriReload();
    } else {
      await this.executeWebReload();
    }
  }

  private async executeTauriReload(): Promise<void> {
    try {
      // Check if Tauri app restart API is available
      const tauri = (window as any).__TAURI__;

      if (tauri?.app?.relaunch) {
        logger.info('Using Tauri app relaunch');
        await tauri.app.relaunch();
      } else if (tauri?.process?.relaunch) {
        logger.info('Using Tauri process relaunch');
        await tauri.process.relaunch();
      } else {
        logger.warn('Tauri restart API not available, falling back to web reload');
        await this.executeWebReload();
      }
    } catch (tauriError) {
      logger.warn('Tauri reload failed, falling back to web reload', tauriError);
      await this.executeWebReload();
    }
  }

  private async executeWebReload(): Promise<void> {
    try {
      // Use standard web reload
      if (typeof window !== 'undefined' && window.location) {
        logger.info('Executing web page reload');
        window.location.reload();
      } else {
        throw new Error('Window location not available');
      }
    } catch (webError) {
      logger.error('Web reload failed', webError);
      throw new Error('Page reload failed');
    }
  }

  // Static method to check for recovery data on app startup
  public static async checkForRecoveryData(): Promise<{
    hasRecovery: boolean;
    recoveryData?: any;
  }> {
    try {
      // Check sessionStorage first (preferred for reloads)
      let recoveryData = null;
      let recoveryFlag = null;

      if (typeof window !== 'undefined' && window.sessionStorage) {
        const sessionData = sessionStorage.getItem('recovery_emergency_data');
        const sessionFlag = sessionStorage.getItem('recovery_flag');

        if (sessionData && sessionFlag) {
          recoveryData = JSON.parse(sessionData);
          recoveryFlag = JSON.parse(sessionFlag);
        }
      }

      // Fallback to localStorage
      if (!recoveryData) {
        const backupData = await storage.getItem('recovery_emergency_data_backup');
        const backupFlag = await storage.getItem('recovery_flag_backup');

        if (backupData && backupFlag) {
          recoveryData = JSON.parse(backupData);
          recoveryFlag = JSON.parse(backupFlag);
        }
      }

      if (recoveryData && recoveryFlag?.shouldRestore) {
        logger.info('Recovery data found on startup', {
          timestamp: recoveryData.timestamp,
          sessionId: recoveryData.sessionId
        });

        return {
          hasRecovery: true,
          recoveryData
        };
      }

      return { hasRecovery: false };
    } catch (error) {
      logger.error('Failed to check for recovery data', error);
      return { hasRecovery: false };
    }
  }

  // Static method to restore data after reload
  public static async restoreDataAfterReload(recoveryData: any): Promise<void> {
    try {
      logger.info('Restoring data after soft reload', {
        sessionId: recoveryData.sessionId
      });

      // Restore design data if available
      if (recoveryData.preservedDesign && recoveryData.projectId) {
        const p = new CanvasPersistence(recoveryData.projectId);
        await p.saveDesign(recoveryData.preservedDesign, { backup: true });
      }

      // Restore audio data if available
      if (recoveryData.preservedAudio) {
        await storage.setItem('current_audio', JSON.stringify(recoveryData.preservedAudio));
      }

      // Restore user preferences if available
      if (recoveryData.preservedPreferences) {
        await storage.setItem('user_preferences', JSON.stringify(recoveryData.preservedPreferences));
      }

      // Clean up recovery data
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem('recovery_emergency_data');
        sessionStorage.removeItem('recovery_flag');
      }

      await storage.removeItem('recovery_emergency_data_backup');
      await storage.removeItem('recovery_flag_backup');

      logger.info('Data restoration completed after soft reload');
    } catch (error) {
      logger.error('Failed to restore data after reload', error);
      throw error;
    }
  }
}
