import { AppError } from '../errorStore';
import { logger } from '@lib/logging/logger';
import { getRecoveryConfig } from '@/lib/config/performance-config';

export interface RecoveryStrategy {
  name: string;
  priority: number;
  canHandle(error: AppError): boolean;
  execute(error: AppError, context: RecoveryContext): Promise<RecoveryResult>;
}

export interface RecoveryContext {
  sessionId: string;
  projectId?: string;
  currentDesignData?: unknown;
  currentAudioData?: unknown;
}

export interface RecoveryResult {
  success: boolean;
  strategy: string;
  message: string;
  requiresUserAction?: boolean;
  nextAction?: 'reload' | 'reset' | 'continue';
  preservedData?: unknown;
}

export interface RecoveryAttempt {
  timestamp: number;
  errorId: string;
  strategy: string;
  success: boolean;
  duration: number;
  message: string;
}

export interface RecoveryProgress {
  strategy: string;
  step: string;
  progress: number;
  message: string;
  canCancel: boolean;
}

export type RecoveryEvent =
  | { type: 'started'; strategy: string; error: AppError }
  | { type: 'progress'; progress: RecoveryProgress }
  | { type: 'completed'; result: RecoveryResult; duration: number }
  | { type: 'failed'; error: unknown; duration: number };

export class ErrorRecoverySystem {
  private static instance: ErrorRecoverySystem;

  static getInstance(): ErrorRecoverySystem {
    if (!ErrorRecoverySystem.instance) {
      ErrorRecoverySystem.instance = new ErrorRecoverySystem();
    }
    return ErrorRecoverySystem.instance;
  }

  private strategies = new Map<string, RecoveryStrategy>();
  private listeners = new Set<(event: RecoveryEvent) => void>();
  private history: RecoveryAttempt[] = [];
  private contextProvider?: () => RecoveryContext | Promise<RecoveryContext>;
  private recoveryInProgress = false;
  private lastAttemptAt = 0;

  private constructor() {
    logger.info('ErrorRecoverySystem ready');
  }

  subscribe(listener: (event: RecoveryEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  registerStrategy(strategy: RecoveryStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  setContextProvider(provider: () => RecoveryContext | Promise<RecoveryContext>): void {
    this.contextProvider = provider;
  }

  getRecoveryHistory(): RecoveryAttempt[] {
    return [...this.history];
  }

  async handleError(error: AppError): Promise<RecoveryResult> {
    if (!this.isCritical(error)) {
      logger.info('Recovery skipped for non-critical error', { errorId: error.id });
      return {
        success: false,
        strategy: 'none',
        message: 'Recovery skipped for non-critical error',
        nextAction: 'continue',
      };
    }

    const config = getRecoveryConfig();
    const now = Date.now();

    if (this.recoveryInProgress) {
      logger.warn('Recovery already in progress; ignoring additional error', { errorId: error.id });
      return {
        success: false,
        strategy: 'none',
        message: 'Recovery already in progress',
        nextAction: 'continue',
      };
    }

    if (now - this.lastAttemptAt < config.cooldownMs) {
      logger.warn('Recovery attempt throttled by cooldown', { errorId: error.id });
      return {
        success: false,
        strategy: 'cooldown',
        message: 'Recovery is cooling down',
        nextAction: 'continue',
      };
    }

    this.lastAttemptAt = now;
    this.recoveryInProgress = true;
    const startTime = Date.now();

    try {
      const context = await this.resolveContext();
      const strategies = this.resolveStrategies(config.strategyOrder);

      if (strategies.length === 0) {
        throw new Error('No recovery strategies registered');
      }

      this.emit({ type: 'started', strategy: strategies[0].name, error });

      let attempts = 0;
      for (let index = 0; index < strategies.length && attempts < config.maxAttempts; index += 1) {
        const strategy = strategies[index];
        attempts += 1;

        const result = await this.executeStrategy(strategy, error, context);
        const duration = Date.now() - startTime;
        this.recordAttempt(error, strategy.name, result, duration);

        if (result.success || result.nextAction === 'reload' || result.nextAction === 'reset') {
          this.emit({ type: 'completed', result, duration });
          return result;
        }
      }

      const reachedMaxAttempts = attempts >= config.maxAttempts;
      const fallback: RecoveryResult = {
        success: false,
        strategy: 'none',
        message: reachedMaxAttempts
          ? `Maximum recovery attempts (${config.maxAttempts}) reached`
          : 'No recovery strategies succeeded',
        nextAction: 'reset',
        requiresUserAction: true,
      };

      this.emit({ type: 'completed', result: fallback, duration: Date.now() - startTime });
      return fallback;
    } catch (errorThrown) {
      const duration = Date.now() - startTime;
      this.emit({ type: 'failed', error: errorThrown, duration });
      const failure: RecoveryResult = {
        success: false,
        strategy: 'system',
        message: errorThrown instanceof Error ? errorThrown.message : 'Recovery failed unexpectedly',
        nextAction: 'reset',
        requiresUserAction: true,
      };
      this.recordAttempt(error, 'system', failure, duration);
      return failure;
    } finally {
      this.recoveryInProgress = false;
      this.trimHistory();
    }
  }

  private isCritical(error: AppError): boolean {
    return error.severity === 'high' || error.category === 'react' || error.category === 'runtime' || error.category === 'global';
  }

  private async resolveContext(): Promise<RecoveryContext> {
    const fallback: RecoveryContext = { sessionId: `recovery_${Date.now()}` };
    if (!this.contextProvider) {
      return fallback;
    }
    try {
      const provided = await this.contextProvider();
      return { ...fallback, ...provided, sessionId: provided.sessionId ?? fallback.sessionId };
    } catch (error) {
      logger.warn('Recovery context provider failed', error);
      return fallback;
    }
  }

  private resolveStrategies(preferredOrder: string[]): RecoveryStrategy[] {
    if (this.strategies.size === 0) {
      return [];
    }

    const seen = new Set<string>();
    const ordered: RecoveryStrategy[] = [];

    for (const name of preferredOrder) {
      const strategy = this.strategies.get(name);
      if (strategy && !seen.has(strategy.name)) {
        ordered.push(strategy);
        seen.add(strategy.name);
      }
    }

    const remaining = Array.from(this.strategies.values())
      .filter(strategy => !seen.has(strategy.name))
      .sort((a, b) => a.priority - b.priority);

    return [...ordered, ...remaining];
  }

  private async executeStrategy(strategy: RecoveryStrategy, error: AppError, context: RecoveryContext): Promise<RecoveryResult> {
    try {
      const result = await strategy.execute(error, context);
      logger.info('Recovery strategy executed', { strategy: strategy.name, success: result.success });
      return result;
    } catch (strategyError) {
      logger.error('Recovery strategy threw an error', strategyError, { strategy: strategy.name });
      return {
        success: false,
        strategy: strategy.name,
        message: strategyError instanceof Error ? strategyError.message : 'Unknown recovery failure',
        requiresUserAction: true,
        nextAction: 'continue',
      };
    }
  }

  private recordAttempt(error: AppError, strategy: string, result: RecoveryResult, duration: number) {
    this.history.unshift({
      timestamp: Date.now(),
      errorId: error.id,
      strategy,
      success: result.success,
      duration,
      message: result.message,
    });
  }

  private trimHistory() {
    const MAX_HISTORY = 10;
    if (this.history.length > MAX_HISTORY) {
      this.history.length = MAX_HISTORY;
    }
  }

  private emit(event: RecoveryEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (listenerError) {
        logger.warn('Recovery event listener failed', listenerError);
      }
    });
  }

  private emitProgress(strategy: string, step: string, progress: number, message: string) {
    if (import.meta.env.DEV) {
      this.emit({
        type: 'progress',
        progress: {
          strategy,
          step,
          progress,
          message,
          canCancel: false,
        },
      });
    }
  }
}
