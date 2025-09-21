import { createContext, useMemo } from 'react';
import type { ReactNode } from 'react';

import { createToken } from '@lib/di/Container';
import { useService } from '@lib/di/ServiceProvider';
import { Logger, getLogger } from '@lib/logging/logger';

export const LOGGER_TOKEN = createToken<Logger>('logger');

export interface LoggerProviderProps {
  children: ReactNode;
  logger?: Logger;
  scope?: string;
}

export const LoggerContext = createContext<Logger | null>(null);
LoggerContext.displayName = 'LoggerContext';

export const LoggerProvider = ({ children, logger, scope }: LoggerProviderProps) => {
  let containerLogger: Logger | null = null;
  try {
    containerLogger = useService(LOGGER_TOKEN);
  } catch {
    containerLogger = null;
  }

  const value = useMemo(() => {
    if (logger) {
      return logger;
    }

    if (containerLogger) {
      return scope ? containerLogger.child(scope) : containerLogger;
    }

    return scope ? getLogger(scope) : getLogger();
  }, [containerLogger, logger, scope]);

  return <LoggerContext.Provider value={value}>{children}</LoggerContext.Provider>;
};
