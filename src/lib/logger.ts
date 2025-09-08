/**
 * ArchiComm Centralized Logging System
 * Provides structured logging with environment awareness and performance integration
 */

import { isDevelopment, isProduction, isTauriEnvironment, CONFIG } from './environment';

// Safe JSON stringify that tolerates circular references and non-serializable values
export function safeStringify(value: any, space?: number): string {
  const seen = new WeakSet();
  const replacer = (_key: string, val: any) => {
    if (typeof val === 'object' && val !== null) {
      if (seen.has(val)) {
        return '[Circular]';
      }
      try {
        seen.add(val);
      } catch {
        // ignore if cannot add
      }
    }
    if (typeof val === 'function') return `[Function ${val.name || 'anonymous'}]`;
    if (val instanceof Error) {
      return { name: val.name, message: val.message, stack: val.stack };
    }
    if (val === undefined) return '[Undefined]';
    if (typeof val === 'symbol') return val.toString();
    return val;
  };
  try {
    return JSON.stringify(value, replacer, space);
  } catch (e) {
    try {
      return String(value);
    } catch {
      return '[Unserializable]';
    }
  }
}
import { PerformanceMonitor } from './performance/PerformanceOptimizer';

// Log levels with numeric values for filtering
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5
}

// Log entry structure
export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  levelName: string;
  scope: string;
  message: string;
  data?: any;
  error?: Error;
  stack?: string;
  performance?: {
    duration?: number;
    memory?: number;
    fps?: number;
  };
  context?: {
    userAgent?: string;
    url?: string;
    userId?: string;
    sessionId?: string;
    component?: string;
  };
}

// Logger configuration
export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableMemoryBuffer: boolean;
  enableFileLogging: boolean;
  maxBufferSize: number;
  bufferFlushInterval: number;
  includeStackTrace: boolean;
  includePerformanceMetrics: boolean;
  formatters: {
    timestamp: (timestamp: number) => string;
    level: (level: LogLevel) => string;
    message: (entry: LogEntry) => string;
  };
}

// Log sink interface
export interface LogSink {
  write(entry: LogEntry): void | Promise<void>;
  flush?(): void | Promise<void>;
  close?(): void | Promise<void>;
}

// Console sink implementation
class ConsoleSink implements LogSink {
  private readonly colors = {
    [LogLevel.TRACE]: '\x1b[90m', // Gray
    [LogLevel.DEBUG]: '\x1b[36m', // Cyan
    [LogLevel.INFO]: '\x1b[32m',  // Green
    [LogLevel.WARN]: '\x1b[33m',  // Yellow
    [LogLevel.ERROR]: '\x1b[31m', // Red
    [LogLevel.FATAL]: '\x1b[35m'  // Magenta
  };

  private readonly reset = '\x1b[0m';

  write(entry: LogEntry): void {
    const color = this.colors[entry.level];
    const timestamp = new Date(entry.timestamp).toISOString();
    const scope = entry.scope ? `[${entry.scope}]` : '';
    const level = entry.levelName.padEnd(5);
    
    let message = `${color}${timestamp} ${level}${this.reset} ${scope} ${entry.message}`;
    
    if (entry.data && Object.keys(entry.data).length > 0) {
      message += `\n  Data: ${safeStringify(entry.data, 2)}`;
    }
    
    if (entry.performance) {
      message += `\n  Performance: ${safeStringify(entry.performance, 2)}`;
    }
    
    if (entry.error) {
      message += `\n  Error: ${entry.error.message}`;
      if (entry.stack) {
        message += `\n  Stack: ${entry.stack}`;
      }
    }

    // Use appropriate console method based on log level
    switch (entry.level) {
      case LogLevel.TRACE:
      case LogLevel.DEBUG:
        console.debug(message);
        break;
      case LogLevel.INFO:
        console.info(message);
        break;
      case LogLevel.WARN:
        console.warn(message);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(message);
        break;
    }
  }
}

// Memory buffer sink for log export
class MemoryBufferSink implements LogSink {
  private buffer: LogEntry[] = [];
  private maxSize: number;
  private flushInterval: number;
  private flushTimer?: NodeJS.Timeout;

  constructor(maxSize: number = 1000, flushInterval: number = 30000) {
    this.maxSize = maxSize;
    this.flushInterval = flushInterval;
    this.startAutoFlush();
  }

  write(entry: LogEntry): void {
    this.buffer.push(entry);
    
    // Remove old entries if buffer is full
    if (this.buffer.length > this.maxSize) {
      this.buffer.splice(0, this.buffer.length - this.maxSize);
    }
  }

  getBuffer(): LogEntry[] {
    return [...this.buffer];
  }

  getFilteredBuffer(filter: {
    level?: LogLevel;
    scope?: string;
    since?: number;
    search?: string;
  }): LogEntry[] {
    return this.buffer.filter(entry => {
      if (filter.level !== undefined && entry.level < filter.level) {
        return false;
      }
      
      if (filter.scope && !entry.scope.includes(filter.scope)) {
        return false;
      }
      
      if (filter.since && entry.timestamp < filter.since) {
        return false;
      }
      
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        const messageMatch = entry.message.toLowerCase().includes(searchLower);
        let dataMatch = false;
        try {
          dataMatch = !!(entry.data && safeStringify(entry.data).toLowerCase().includes(searchLower));
        } catch {
          dataMatch = false;
        }
        const errorMatch = entry.error && entry.error.message.toLowerCase().includes(searchLower);
        
        if (!messageMatch && !dataMatch && !errorMatch) {
          return false;
        }
      }
      
      return true;
    });
  }

  exportLogs(format: 'json' | 'csv' | 'txt' = 'json'): string {
    switch (format) {
      case 'json':
        return safeStringify(this.buffer, 2);
      
      case 'csv':
        const headers = 'Timestamp,Level,Scope,Message,Data,Error\n';
        const rows = this.buffer.map(entry => {
          const timestamp = new Date(entry.timestamp).toISOString();
          const data = entry.data ? safeStringify(entry.data).replace(/"/g, '""') : '';
          const error = entry.error ? entry.error.message.replace(/"/g, '""') : '';
          return `"${timestamp}","${entry.levelName}","${entry.scope}","${entry.message.replace(/"/g, '""')}","${data}","${error}"`;
        }).join('\n');
        return headers + rows;
      
      case 'txt':
        return this.buffer.map(entry => {
          const timestamp = new Date(entry.timestamp).toISOString();
          let line = `${timestamp} [${entry.levelName}] ${entry.scope ? `[${entry.scope}] ` : ''}${entry.message}`;
          if (entry.data) line += ` | Data: ${safeStringify(entry.data)}`;
          if (entry.error) line += ` | Error: ${entry.error.message}`;
          return line;
        }).join('\n');
      
      default:
        return this.exportLogs('json');
    }
  }

  flush(): void {
    // In memory buffer, flush means clearing old entries
    const keepCount = Math.floor(this.maxSize * 0.7); // Keep 70% of buffer
    if (this.buffer.length > keepCount) {
      this.buffer.splice(0, this.buffer.length - keepCount);
    }
  }

  clear(): void {
    this.buffer = [];
  }

  private startAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  close(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }
}

// File sink for Tauri environment
class FileSink implements LogSink {
  private filePath: string;
  private writeQueue: LogEntry[] = [];
  private isWriting = false;

  constructor(filePath: string = 'archicomm.log') {
    this.filePath = filePath;
  }

  async write(entry: LogEntry): Promise<void> {
    if (!isTauriEnvironment()) {
      return; // File logging only available in Tauri
    }

    this.writeQueue.push(entry);
    
    if (!this.isWriting) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.writeQueue.length === 0 || this.isWriting) {
      return;
    }

    this.isWriting = true;

    try {
      // Import Tauri APIs dynamically
      const { writeTextFile, BaseDirectory } = await import('@tauri-apps/api/fs');
      
      const entries = this.writeQueue.splice(0);
      const logLines = entries.map(entry => {
        const timestamp = new Date(entry.timestamp).toISOString();
        const scope = entry.scope ? `[${entry.scope}]` : '';
        let line = `${timestamp} [${entry.levelName}] ${scope} ${entry.message}`;
        
        if (entry.data) {
          line += ` | Data: ${safeStringify(entry.data)}`;
        }
        
        if (entry.error) {
          line += ` | Error: ${entry.error.message}`;
          if (entry.stack) {
            line += ` | Stack: ${entry.stack}`;
          }
        }
        
        if (entry.performance) {
          line += ` | Performance: ${safeStringify(entry.performance)}`;
        }
        
        return line;
      }).join('\n') + '\n';

      await writeTextFile(this.filePath, logLines, {
        dir: BaseDirectory.AppLog,
        append: true
      });
    } catch (error) {
      console.error('Failed to write to log file:', error);
    } finally {
      this.isWriting = false;
      
      // Process any entries that were added while writing
      if (this.writeQueue.length > 0) {
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }

  async flush(): Promise<void> {
    await this.processQueue();
  }
}

// Main Logger class
export class Logger {
  private config: LoggerConfig;
  private sinks: LogSink[] = [];
  private scope: string;
  private performanceMonitor?: PerformanceMonitor;
  private sessionId: string;

  constructor(scope: string = 'app', config?: Partial<LoggerConfig>, sharedSinks?: LogSink[]) {
    this.scope = scope;
    this.sessionId = this.generateSessionId();
    
    // Default configuration
    this.config = {
      level: this.getDefaultLogLevel(),
      enableConsole: true,
      enableMemoryBuffer: true,
      enableFileLogging: isTauriEnvironment() && isDevelopment(),
      maxBufferSize: CONFIG.CACHE.MAX_ENTRIES,
      bufferFlushInterval: 30000,
      includeStackTrace: isDevelopment(),
      includePerformanceMetrics: true,
      formatters: {
        timestamp: (timestamp: number) => new Date(timestamp).toISOString(),
        level: (level: LogLevel) => LogLevel[level],
        message: (entry: LogEntry) => entry.message
      },
      ...config
    };

    // Share sinks if provided, otherwise initialize new sinks
    this.sinks = sharedSinks ?? this.initializeSinks();
    this.initializePerformanceMonitor();
  }

  private getDefaultLogLevel(): LogLevel {
    // Check environment variable first
    const envLevel = import.meta.env.VITE_LOG_LEVEL?.toUpperCase();
    if (envLevel && envLevel in LogLevel) {
      return LogLevel[envLevel as keyof typeof LogLevel];
    }

    // Default based on environment
    if (isDevelopment()) {
      return LogLevel.DEBUG;
    } else if (isProduction()) {
      return LogLevel.WARN;
    }
    
    return LogLevel.INFO;
  }

  private initializeSinks(): LogSink[] {
    const sinks: LogSink[] = [];
    if (this.config.enableConsole) {
      sinks.push(new ConsoleSink());
    }

    if (this.config.enableMemoryBuffer) {
      sinks.push(new MemoryBufferSink(
        this.config.maxBufferSize,
        this.config.bufferFlushInterval
      ));
    }

    if (this.config.enableFileLogging) {
      sinks.push(new FileSink());
    }

    return sinks;
  }

  private initializePerformanceMonitor(): void {
    if (this.config.includePerformanceMetrics) {
      try {
        this.performanceMonitor = PerformanceMonitor.getInstance('basic');
      } catch (error) {
        // Performance monitor not available, continue without it
      }
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    data?: any,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      levelName: LogLevel[level],
      scope: this.scope,
      message,
      data,
      error,
      context: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        sessionId: this.sessionId
      }
    };

    // Add stack trace for errors or if explicitly enabled
    if (error || (this.config.includeStackTrace && level >= LogLevel.ERROR)) {
      entry.stack = error?.stack || new Error().stack;
    }

    // Add performance metrics if available
    if (this.config.includePerformanceMetrics && this.performanceMonitor) {
      try {
        entry.performance = {
          fps: this.performanceMonitor.getCurrentFPS(),
          memory: (performance as any).memory?.usedJSHeapSize
        };
      } catch (error) {
        // Performance metrics not available
      }
    }

    return entry;
  }

  private async writeToSinks(entry: LogEntry): Promise<void> {
    if (entry.level < this.config.level) {
      return; // Skip if below configured level
    }

    const writePromises = this.sinks.map(async sink => {
      try {
        await sink.write(entry);
      } catch (error) {
        console.error('Failed to write to sink:', error);
      }
    });

    await Promise.all(writePromises);
  }

  // Core logging methods
  trace(message: string, data?: any): void {
    const entry = this.createLogEntry(LogLevel.TRACE, message, data);
    this.writeToSinks(entry);
  }

  debug(message: string, data?: any): void {
    const entry = this.createLogEntry(LogLevel.DEBUG, message, data);
    this.writeToSinks(entry);
  }

  info(message: string, data?: any): void {
    const entry = this.createLogEntry(LogLevel.INFO, message, data);
    this.writeToSinks(entry);
  }

  warn(message: string, data?: any): void {
    const entry = this.createLogEntry(LogLevel.WARN, message, data);
    this.writeToSinks(entry);
  }

  error(message: string, error?: Error | any, data?: any): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const entry = this.createLogEntry(LogLevel.ERROR, message, data, errorObj);
    this.writeToSinks(entry);
  }

  fatal(message: string, error?: Error | any, data?: any): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const entry = this.createLogEntry(LogLevel.FATAL, message, data, errorObj);
    this.writeToSinks(entry);
  }

  // Performance logging
  time(label: string): void {
    this.debug(`Timer started: ${label}`, { timerStart: Date.now() });
  }

  timeEnd(label: string): void {
    this.debug(`Timer ended: ${label}`, { timerEnd: Date.now() });
  }

  measure<T>(label: string, operation: () => T): T {
    const start = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize;
    
    try {
      const result = operation();
      const duration = performance.now() - start;
      const endMemory = (performance as any).memory?.usedJSHeapSize;
      
      this.debug(`Operation completed: ${label}`, {
        duration: Math.round(duration * 100) / 100,
        memoryDelta: endMemory && startMemory ? endMemory - startMemory : undefined
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.error(`Operation failed: ${label}`, error, { duration });
      throw error;
    }
  }

  async measureAsync<T>(label: string, operation: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize;
    
    try {
      const result = await operation();
      const duration = performance.now() - start;
      const endMemory = (performance as any).memory?.usedJSHeapSize;
      
      this.debug(`Async operation completed: ${label}`, {
        duration: Math.round(duration * 100) / 100,
        memoryDelta: endMemory && startMemory ? endMemory - startMemory : undefined
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.error(`Async operation failed: ${label}`, error, { duration });
      throw error;
    }
  }

  // Scoped logger creation
  child(scope: string): Logger {
    const childScope = this.scope ? `${this.scope}:${scope}` : scope;
    // Share the same sinks array to avoid duplicating sinks/timers and fragmenting logs
    return new Logger(childScope, this.config, this.sinks);
  }

  // Configuration methods
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  getLevel(): LogLevel {
    return this.config.level;
  }

  isLevelEnabled(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  // Memory buffer access
  getMemoryBuffer(): LogEntry[] {
    const memoryBuffer = this.sinks.find(sink => sink instanceof MemoryBufferSink) as MemoryBufferSink;
    return memoryBuffer ? memoryBuffer.getBuffer() : [];
  }

  getFilteredLogs(filter: {
    level?: LogLevel;
    scope?: string;
    since?: number;
    search?: string;
  }): LogEntry[] {
    const memoryBuffer = this.sinks.find(sink => sink instanceof MemoryBufferSink) as MemoryBufferSink;
    return memoryBuffer ? memoryBuffer.getFilteredBuffer(filter) : [];
  }

  exportLogs(format: 'json' | 'csv' | 'txt' = 'json'): string {
    const memoryBuffer = this.sinks.find(sink => sink instanceof MemoryBufferSink) as MemoryBufferSink;
    return memoryBuffer ? memoryBuffer.exportLogs(format) : '';
  }

  downloadLogs(filename?: string, format: 'json' | 'csv' | 'txt' = 'json'): void {
    const logs = this.exportLogs(format);
    const blob = new Blob([logs], { type: this.getMimeType(format) });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `archicomm-logs-${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private getMimeType(format: string): string {
    switch (format) {
      case 'json': return 'application/json';
      case 'csv': return 'text/csv';
      case 'txt': return 'text/plain';
      default: return 'text/plain';
    }
  }

  clearLogs(): void {
    const memoryBuffer = this.sinks.find(sink => sink instanceof MemoryBufferSink) as MemoryBufferSink;
    if (memoryBuffer) {
      memoryBuffer.clear();
    }
  }

  // Cleanup
  async flush(): Promise<void> {
    const flushPromises = this.sinks.map(async sink => {
      if (sink.flush) {
        try {
          await sink.flush();
        } catch (error) {
          console.error('Failed to flush sink:', error);
        }
      }
    });

    await Promise.all(flushPromises);
  }

  async close(): Promise<void> {
    await this.flush();
    
    const closePromises = this.sinks.map(async sink => {
      if (sink.close) {
        try {
          await sink.close();
        } catch (error) {
          console.error('Failed to close sink:', error);
        }
      }
    });

    await Promise.all(closePromises);
  }
}

// Global logger instance
let globalLogger: Logger | null = null;

// Factory function for creating loggers
export function createLogger(scope?: string, config?: Partial<LoggerConfig>): Logger {
  return new Logger(scope, config);
}

// Get or create global logger
export function getLogger(scope?: string): Logger {
  if (!globalLogger) {
    globalLogger = new Logger('global');
  }
  
  return scope ? globalLogger.child(scope) : globalLogger;
}

// Convenience functions using global logger
export const logger = {
  trace: (message: string, data?: any) => getLogger().trace(message, data),
  debug: (message: string, data?: any) => getLogger().debug(message, data),
  info: (message: string, data?: any) => getLogger().info(message, data),
  warn: (message: string, data?: any) => getLogger().warn(message, data),
  error: (message: string, error?: Error | any, data?: any) => getLogger().error(message, error, data),
  fatal: (message: string, error?: Error | any, data?: any) => getLogger().fatal(message, error, data),
  time: (label: string) => getLogger().time(label),
  timeEnd: (label: string) => getLogger().timeEnd(label),
  measure: <T>(label: string, operation: () => T) => getLogger().measure(label, operation),
  measureAsync: <T>(label: string, operation: () => Promise<T>) => getLogger().measureAsync(label, operation),
  child: (scope: string) => getLogger().child(scope),
  setLevel: (level: LogLevel) => getLogger().setLevel(level),
  getLevel: () => getLogger().getLevel(),
  isLevelEnabled: (level: LogLevel) => getLogger().isLevelEnabled(level),
  getMemoryBuffer: () => getLogger().getMemoryBuffer(),
  getFilteredLogs: (filter: any) => getLogger().getFilteredLogs(filter),
  exportLogs: (format?: 'json' | 'csv' | 'txt') => getLogger().exportLogs(format),
  downloadLogs: (filename?: string, format?: 'json' | 'csv' | 'txt') => getLogger().downloadLogs(filename, format),
  clearLogs: () => getLogger().clearLogs(),
  flush: () => getLogger().flush(),
  close: () => getLogger().close()
};

// Initialize global logger in development
if (isDevelopment()) {
  globalLogger = new Logger('archicomm');
  globalLogger.info('ArchiComm logging system initialized', {
    environment: isDevelopment() ? 'development' : 'production',
    runtime: isTauriEnvironment() ? 'tauri' : 'web',
    level: LogLevel[globalLogger.getLevel()]
  });
}

// Export types and utilities
export { LogLevel, type LogEntry, type LoggerConfig, type LogSink };
export default logger;
