// src/lib/recovery/strategies/AutoSaveStrategy.ts
// Auto-save recovery strategy that preserves user work during errors
// Highest priority strategy that saves current design and audio data before other recovery attempts
// RELEVANT FILES: src/services/canvas/CanvasPersistence.ts, src/services/storage.ts, src/hooks/useAutoSave.ts

import { RecoveryStrategy, RecoveryContext, RecoveryResult } from '../ErrorRecoverySystem';
import { AppError } from '../../errorStore';
import { CanvasPersistence } from '@services/canvas/CanvasPersistence';
import { storage } from '@services/storage';
import { logger } from '../../logger';

export class AutoSaveStrategy implements RecoveryStrategy {
  public readonly name = 'auto-save';
  public readonly priority = 1; // Highest priority

  public canHandle(error: AppError): boolean {
    // Auto-save should always run first to preserve user work
    return true;
  }

  public async execute(error: AppError, context: RecoveryContext): Promise<RecoveryResult> {
    logger.info('Starting auto-save recovery strategy', { errorId: error.id });

    const savedData: string[] = [];
    const failedData: string[] = [];

    try {
      // Save design data if available
      if (context.currentDesignData && context.projectId) {
        await this.saveDesignData(context.currentDesignData, context.projectId, savedData, failedData);
      }

      // Save audio data if available
      if (context.currentAudioData) {
        await this.saveAudioData(context.currentAudioData, context.sessionId, savedData, failedData);
      }

      // Save user preferences
      if (context.userPreferences) {
        await this.saveUserPreferences(context.userPreferences, savedData, failedData);
      }

      // Create emergency backup with error context
      await this.createEmergencyBackup(error, context, savedData, failedData);

      // Determine success based on what we were able to save
      const success = savedData.length > 0;
      const message = this.buildResultMessage(savedData, failedData);

      logger.info('Auto-save recovery completed', {
        success,
        savedData,
        failedData,
        errorId: error.id
      });

      return {
        success,
        strategy: this.name,
        message,
        preservedData: {
          saved: savedData,
          failed: failedData,
          timestamp: Date.now()
        }
      };
    } catch (saveError) {
      logger.error('Auto-save recovery failed', saveError);
      return {
        success: false,
        strategy: this.name,
        message: `Auto-save failed: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`
      };
    }
  }

  private async saveDesignData(
    designData: any,
    projectId: string,
    savedData: string[],
    failedData: string[]
  ): Promise<void> {
    try {
      const persistence = new CanvasPersistence(projectId);
      await persistence.saveDesign(designData);
      savedData.push('Design data');
      logger.info('Design data saved during auto-save recovery');
    } catch (error) {
      failedData.push('Design data');
      logger.warn('Failed to save design data during auto-save', error);

      // Try fallback to localStorage
      try {
        const emergencyKey = `recovery_design_${projectId}_${Date.now()}`;
        await storage.setItem(emergencyKey, JSON.stringify(designData));
        savedData.push('Design data (emergency backup)');
        logger.info('Design data saved to emergency backup');
      } catch (backupError) {
        logger.error('Emergency design backup failed', backupError);
      }
    }
  }

  private async saveAudioData(
    audioData: any,
    sessionId: string,
    savedData: string[],
    failedData: string[]
  ): Promise<void> {
    try {
      const audioKey = `recovery_audio_${sessionId}`;
      await storage.setItem(audioKey, JSON.stringify(audioData));
      savedData.push('Audio data');
      logger.info('Audio data saved during auto-save recovery');
    } catch (error) {
      failedData.push('Audio data');
      logger.warn('Failed to save audio data during auto-save', error);
    }
  }

  private async saveUserPreferences(
    preferences: Record<string, any>,
    savedData: string[],
    failedData: string[]
  ): Promise<void> {
    try {
      const preferencesKey = `recovery_preferences_${Date.now()}`;
      await storage.setItem(preferencesKey, JSON.stringify(preferences));
      savedData.push('User preferences');
      logger.info('User preferences saved during auto-save recovery');
    } catch (error) {
      failedData.push('User preferences');
      logger.warn('Failed to save user preferences during auto-save', error);
    }
  }

  private async createEmergencyBackup(
    error: AppError,
    context: RecoveryContext,
    savedData: string[],
    failedData: string[]
  ): Promise<void> {
    try {
      const emergencyBackup = {
        timestamp: Date.now(),
        errorId: error.id,
        errorCategory: error.category,
        sessionId: context.sessionId,
        projectId: context.projectId,
        hasDesignData: !!context.currentDesignData,
        hasAudioData: !!context.currentAudioData,
        hasPreferences: !!context.userPreferences
      };

      await storage.setItem('recovery_emergency_backup', JSON.stringify(emergencyBackup));
      savedData.push('Emergency recovery info');
      logger.info('Emergency backup created during auto-save recovery');
    } catch (error) {
      failedData.push('Emergency recovery info');
      logger.warn('Failed to create emergency backup', error);
    }
  }

  private buildResultMessage(savedData: string[], failedData: string[]): string {
    if (savedData.length === 0) {
      return 'Unable to save any data during recovery';
    }

    let message = `Saved: ${savedData.join(', ')}`;

    if (failedData.length > 0) {
      message += `. Failed to save: ${failedData.join(', ')}`;
    }

    return message;
  }
}
