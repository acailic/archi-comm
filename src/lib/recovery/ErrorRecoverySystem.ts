// src/lib/recovery/ErrorRecoverySystem.ts
// Core error recovery system that implements progressive fallback strategies
// Provides centralized error recovery with escalating strategies from auto-save to hard reset
// RELEVANT FILES: src/lib/errorStore.ts, src/lib/logger.ts, src/services/canvas/CanvasPersistence.ts, src/shared/contracts/index.ts

import { AppError } from '../errorStore';
import { logger } from '../logger';
import { DesignData, AudioData } from '../../shared/contracts';

// Recovery strategy interface for implementing different recovery approaches
export interface RecoveryStrategy {
  name: string;
  priority: number; // Lower numbers = higher priority
  canHandle(error: AppError): boolean;
  execute(error: AppError, context: RecoveryContext): Promise<RecoveryResult>;
}

// Context data available during recovery operations
export interface RecoveryContext {
  currentDesignData?: DesignData;
  currentAudioData?: AudioData;
  projectId?: string;
  userPreferences?: Record<string, any>;
  sessionId: string;
}

// Result of a recovery operation
export interface RecoveryResult {
  success: boolean;
  strategy: string;
  message: string;
  requiresUserAction?: boolean;
  nextAction?: 'reload' | 'reset' | 'continue';
  preservedData?: any;
}

// Recovery attempt tracking for history and debugging
export interface RecoveryAttempt {
  timestamp: number;
  error: AppError;
  strategy: string;
  result: RecoveryResult;
  duration: number;
}

// Recovery progress information for UI updates
export interface RecoveryProgress {
  strategy: string;
  step: string;
  progress: number; // 0-100
  message: string;
  canCancel: boolean;
}

// Main error recovery system - singleton implementation
export class ErrorRecoverySystem {
  private static instance: ErrorRecoverySystem;
  private strategies = new Map<string, RecoveryStrategy>();
  private recoveryInProgress = false;
  private recoveryHistory: RecoveryAttempt[] = [];
  private eventEmitter = new EventTarget();
  private contextProvider?: () => Promise<RecoveryContext>;

  private constructor() {
    logger.info('ErrorRecoverySystem initialized');
  }

  public static getInstance(): ErrorRecoverySystem {
    if (!ErrorRecoverySystem.instance) {
      ErrorRecoverySystem.instance = new ErrorRecoverySystem();
    }
    return ErrorRecoverySystem.instance;
  }

  // Register a new recovery strategy
  public registerStrategy(strategy: RecoveryStrategy): void {
    this.strategies.set(strategy.name, strategy);
    logger.info(`Recovery strategy registered: ${strategy.name} (priority: ${strategy.priority})`);
  }

  // Set the context provider for gathering current application state
  public setContextProvider(provider: () => Promise<RecoveryContext>): void {
    this.contextProvider = provider;
  }

  // Main entry point for error recovery
  public async handleError(error: AppError): Promise<RecoveryResult> {
    if (this.recoveryInProgress) {
      logger.warn('Recovery already in progress, ignoring new error', { errorId: error.id });
      return {
        success: false,
        strategy: 'none',
        message: 'Recovery already in progress',
      };
    }

    this.recoveryInProgress = true;
    const startTime = Date.now();

    try {
      // Get current application context
      const context = await this.getRecoveryContext();

      // Collect applicable strategies sorted by priority
      const applicableStrategies = Array.from(this.strategies.values())
        .filter(s => s.canHandle(error))
        .sort((a, b) => a.priority - b.priority);

      if (applicableStrategies.length === 0) {
        throw new Error('No suitable recovery strategy found');
      }

      logger.info(
        `Starting recovery with ${applicableStrategies.length} strategy(ies)`,
        { errorId: error.id, strategies: applicableStrategies.map(s => s.name) }
      );
      this.emitRecoveryEvent('recovery-started', { strategy: applicableStrategies[0].name, error });

      let lastResult: RecoveryResult | null = null;

      for (let i = 0; i < applicableStrategies.length; i++) {
        const strategy = applicableStrategies[i];
        const total = applicableStrategies.length;
        const beforeProgress = Math.floor((i / total) * 100);

        // Emit progress before attempt
        this.emitRecoveryEvent('strategy-progress', {
          strategy: strategy.name,
          index: i,
          total,
          progress: {
            strategy: strategy.name,
            step: 'Attempting',
            progress: beforeProgress,
            message: `Trying ${strategy.name} (${i + 1}/${total})`,
            canCancel: false,
          } as RecoveryProgress,
        });

        const result = await this.executeStrategy(strategy, error, context);

        // Record this attempt
        const attemptDuration = Date.now() - startTime;
        this.recordRecoveryAttempt(error, strategy.name, result, attemptDuration);

        lastResult = result;

        const afterProgress = Math.floor(((i + 1) / total) * 100);
        // Emit progress after attempt
        this.emitRecoveryEvent('strategy-progress', {
          strategy: strategy.name,
          index: i,
          total,
          progress: {
            strategy: strategy.name,
            step: 'Completed',
            progress: afterProgress,
            message: `Completed ${strategy.name} (${i + 1}/${total})`,
            canCancel: false,
          } as RecoveryProgress,
        });

        // Success: stop and return
        if (result.success) {
          const duration = Date.now() - startTime;
          this.emitRecoveryEvent('recovery-completed', { result, duration });
          logger.info('Recovery completed: success', { strategy: strategy.name, duration });
          return result;
        }

        // If strategy advises reload/reset, stop immediately
        if (result.nextAction === 'reload' || result.nextAction === 'reset') {
          const duration = Date.now() - startTime;
          this.emitRecoveryEvent('recovery-completed', { result, duration });
          logger.info('Recovery completed with next action', {
            strategy: strategy.name,
            nextAction: result.nextAction,
            duration,
          });
          return result;
        }
        // Otherwise continue to next strategy
      }

      // No strategy succeeded
      const duration = Date.now() - startTime;
      const fallback: RecoveryResult =
        lastResult ?? {
          success: false,
          strategy: 'none',
          message: 'No applicable recovery strategies succeeded',
          nextAction: 'continue',
        };
      this.emitRecoveryEvent('recovery-completed', { result: fallback, duration });
      logger.info('Recovery completed: failure', { duration });
      return fallback;
    } catch (recoveryError) {
      const duration = Date.now() - startTime;
      const result: RecoveryResult = {
        success: false,
        strategy: 'unknown',
        message: `Recovery system failed: ${recoveryError instanceof Error ? recoveryError.message : 'Unknown error'}`,
      };

      this.recordRecoveryAttempt(error, 'failed', result, duration);
      logger.error('Recovery system failed', recoveryError);
      this.emitRecoveryEvent('recovery-failed', { error: recoveryError, duration });

      return result;
    } finally {
      this.recoveryInProgress = false;
    }
  }

  // Get current recovery context from registered provider
  private async getRecoveryContext(): Promise<RecoveryContext> {
    if (this.contextProvider) {
      try {
        return await this.contextProvider();
      } catch (error) {
        logger.warn('Context provider failed, using minimal context', error);
      }
    }

    // Fallback context with session ID
    return {
      sessionId: `recovery_${Date.now()}`,
    };
  }

  // Select the best recovery strategy for the given error
  private selectStrategy(error: AppError): RecoveryStrategy | null {
    const applicableStrategies = Array.from(this.strategies.values())
      .filter(strategy => strategy.canHandle(error))
      .sort((a, b) => a.priority - b.priority);

    return applicableStrategies[0] || null;
  }

  // Execute a specific recovery strategy with progress tracking
  private async executeStrategy(
    strategy: RecoveryStrategy,
    error: AppError,
    context: RecoveryContext
  ): Promise<RecoveryResult> {
    this.emitRecoveryEvent('strategy-started', {
      strategy: strategy.name,
      progress: { strategy: strategy.name, step: 'Initializing', progress: 0, message: 'Starting recovery...', canCancel: false }
    });

    try {
      const result = await strategy.execute(error, context);
      this.emitRecoveryEvent('strategy-completed', { strategy: strategy.name, result });
      return result;
    } catch (strategyError) {
      logger.error(`Recovery strategy ${strategy.name} failed`, strategyError);
      return {
        success: false,
        strategy: strategy.name,
        message: `Strategy failed: ${strategyError instanceof Error ? strategyError.message : 'Unknown error'}`,
      };
    }
  }

  // Record recovery attempt for history tracking
  private recordRecoveryAttempt(
    error: AppError,
    strategy: string,
    result: RecoveryResult,
    duration: number
  ): void {
    const attempt: RecoveryAttempt = {
      timestamp: Date.now(),
      error,
      strategy,
      result,
      duration,
    };

    this.recoveryHistory.push(attempt);

    // Keep only last 50 attempts to prevent memory buildup
    if (this.recoveryHistory.length > 50) {
      this.recoveryHistory.shift();
    }
  }

  // Emit recovery events for UI and monitoring
  private emitRecoveryEvent(type: string, data: any): void {
    const event = new CustomEvent(type, { detail: data });
    this.eventEmitter.dispatchEvent(event);
  }

  // Public API for accessing recovery state and history
  public getRecoveryHistory(): RecoveryAttempt[] {
    return [...this.recoveryHistory];
  }

  public isRecoveryInProgress(): boolean {
    return this.recoveryInProgress;
  }

  public addEventListener(type: string, listener: EventListener): void {
    this.eventEmitter.addEventListener(type, listener);
  }

  public removeEventListener(type: string, listener: EventListener): void {
    this.eventEmitter.removeEventListener(type, listener);
  }

  // Get registered strategies for debugging
  public getStrategies(): RecoveryStrategy[] {
    return Array.from(this.strategies.values()).sort((a, b) => a.priority - b.priority);
  }
}
