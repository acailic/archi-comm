// src/lib/recovery/strategies/BackupRestoreStrategy.ts
// Backup restoration strategy for recovering from corrupted or lost data
// Mid-priority strategy that attempts to restore from valid backups when data corruption occurs
// RELEVANT FILES: src/services/canvas/CanvasPersistence.ts, src/lib/logging/errorStore.ts

import { RecoveryStrategy, RecoveryContext, RecoveryResult } from '../ErrorRecoverySystem';
import { AppError } from '../../errorStore';
import { CanvasPersistence } from '@services/canvas/CanvasPersistence';
import { storage, designsStore } from '@services/storage';
import { logger } from '@lib/logging/logger';

export class BackupRestoreStrategy implements RecoveryStrategy {
  public readonly name = 'backup-restore';
  public readonly priority = 3; // Mid-priority strategy

  public canHandle(error: AppError): boolean {
    // Handle data corruption, persistence failures, and critical errors
    const relevantCategories = ['persistence', 'data', 'critical'];
    const relevantSeverities = ['critical', 'high'];

    return relevantCategories.includes(error.category) ||
           relevantSeverities.includes(error.severity);
  }

  public async execute(error: AppError, context: RecoveryContext): Promise<RecoveryResult> {
    logger.info('Starting backup restore recovery strategy', { errorId: error.id });

    try {
      const restoredData: string[] = [];
      const failedRestores: string[] = [];

      // Attempt to restore design data from backup
      if (context.projectId) {
        await this.restoreDesignBackup(context.projectId, restoredData, failedRestores);
      }

      // Attempt to restore user preferences from backup
      await this.restoreUserPreferences(restoredData, failedRestores);

      // Attempt to restore audio data if session information is available
      if (context.sessionId) {
        await this.restoreAudioData(context.sessionId, restoredData, failedRestores);
      }

      // Check for emergency backups from previous recovery attempts
      await this.restoreEmergencyBackups(restoredData, failedRestores);

      const success = restoredData.length > 0;
      const message = this.buildResultMessage(restoredData, failedRestores, success);

      logger.info('Backup restore recovery completed', {
        success,
        restoredData,
        failedRestores,
        errorId: error.id
      });

      return {
        success,
        strategy: this.name,
        message,
        requiresUserAction: !success,
        nextAction: success ? 'continue' : 'reset',
        preservedData: {
          restored: restoredData,
          failed: failedRestores,
          timestamp: Date.now()
        }
      };
    } catch (restoreError) {
      logger.error('Backup restore recovery failed', restoreError);
      return {
        success: false,
        strategy: this.name,
        message: `Backup restore failed: ${restoreError instanceof Error ? restoreError.message : 'Unknown error'}`,
        requiresUserAction: true,
        nextAction: 'reset'
      };
    }
  }

  private async restoreDesignBackup(
    projectId: string,
    restoredData: string[],
    failedRestores: string[]
  ): Promise<void> {
    try {
      const persistence = new CanvasPersistence(projectId);

      // Get available backups sorted by timestamp
      const backupMetadata = persistence.listBackups();

      if (backupMetadata.length === 0) {
        failedRestores.push('Design data (no backups found)');
        return;
      }

      // Try to restore from the most recent valid backup
      for (const backup of backupMetadata) {
        try {
          const restoredDesign = await persistence.restoreFromBackup(backup.timestamp);

          if (this.validateRestoredDesign(restoredDesign)) {
            // Save the restored data as the current project
            await persistence.saveDesign(restoredDesign);
            restoredData.push(`Design data (from ${new Date(backup.timestamp).toLocaleString()})`);
            logger.info('Design data restored from backup', {
              backupTimestamp: backup.timestamp,
              projectId
            });
            return;
          }
        } catch (backupError) {
          logger.warn('Failed to restore from backup', {
            timestamp: backup.timestamp,
            error: backupError
          });
        }
      }

      failedRestores.push('Design data (all backups corrupted)');
    } catch (error) {
      failedRestores.push('Design data (backup system error)');
      logger.error('Design backup restoration failed', error);
    }
  }

  private async restoreUserPreferences(
    restoredData: string[],
    failedRestores: string[]
  ): Promise<void> {
    try {
      // Look for preference backups with recovery prefix
      const keys = await this.getStorageKeysWithPrefix('recovery_preferences_');

      if (keys.length === 0) {
        failedRestores.push('User preferences (no backups found)');
        return;
      }

      // Try the most recent preferences backup
      const mostRecentKey = keys.sort().reverse()[0];
      const preferencesData = await storage.getItem(mostRecentKey);

      if (preferencesData) {
        const preferences = JSON.parse(preferencesData);

        // Restore to main preferences storage
        await storage.setItem('user_preferences', JSON.stringify(preferences));
        restoredData.push('User preferences');
        logger.info('User preferences restored from backup', { backupKey: mostRecentKey });
      } else {
        failedRestores.push('User preferences (backup corrupted)');
      }
    } catch (error) {
      failedRestores.push('User preferences (restore error)');
      logger.error('User preferences restoration failed', error);
    }
  }

  private async restoreAudioData(
    sessionId: string,
    restoredData: string[],
    failedRestores: string[]
  ): Promise<void> {
    try {
      const audioKey = `recovery_audio_${sessionId}`;
      const audioData = await storage.getItem(audioKey);

      if (audioData) {
        // Validate and restore audio data
        const parsedAudioData = JSON.parse(audioData);

        if (this.validateAudioData(parsedAudioData)) {
          // Restore to main audio storage
          await storage.setItem('current_audio', audioData);
          restoredData.push('Audio data');
          logger.info('Audio data restored from backup', { sessionId });
        } else {
          failedRestores.push('Audio data (invalid format)');
        }
      } else {
        failedRestores.push('Audio data (no backup found)');
      }
    } catch (error) {
      failedRestores.push('Audio data (restore error)');
      logger.error('Audio data restoration failed', error);
    }
  }

  private async restoreEmergencyBackups(
    restoredData: string[],
    failedRestores: string[]
  ): Promise<void> {
    try {
      const emergencyBackup = await storage.getItem('recovery_emergency_backup');

      if (emergencyBackup) {
        const backupInfo = JSON.parse(emergencyBackup);
        logger.info('Found emergency backup', backupInfo);

        // Emergency backup contains metadata, not actual data
        // Use it to guide further recovery attempts
        restoredData.push('Emergency recovery info');
      }
    } catch (error) {
      logger.warn('Failed to restore emergency backup', error);
    }
  }

  private async getStorageKeysWithPrefix(prefix: string): Promise<string[]> {
    try {
      const keys = await designsStore.keys();
      return keys.filter(k => k.startsWith(prefix));
    } catch {
      try {
        const lsKeys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(prefix)) lsKeys.push(key);
        }
        return lsKeys;
      } catch {
        return [];
      }
    }
  }

  private validateRestoredDesign(design: any): boolean {
    // Basic validation of restored design data
    return design &&
           typeof design === 'object' &&
           (design.nodes || design.edges || design.elements);
  }

  private validateAudioData(audioData: any): boolean {
    // Basic validation of restored audio data
    return audioData &&
           typeof audioData === 'object' &&
           (audioData.url || audioData.blob || audioData.data);
  }

  private buildResultMessage(
    restoredData: string[],
    failedRestores: string[],
    success: boolean
  ): string {
    if (!success) {
      return 'Unable to restore any data from backups. Consider hard reset.';
    }

    let message = `Restored from backup: ${restoredData.join(', ')}`;

    if (failedRestores.length > 0) {
      message += `. Failed to restore: ${failedRestores.join(', ')}`;
    }

    return message;
  }
}
