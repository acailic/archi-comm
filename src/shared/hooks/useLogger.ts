import { useContext, useMemo } from 'react';

import { LoggerContext } from '@lib/logging/LoggerProvider';
import { getLogger, type Logger } from '@lib/logging/logger';

export function useLogger(scope?: string): Logger {
  const contextLogger = useContext(LoggerContext);

  return useMemo(() => {
    if (contextLogger) {
      return scope ? contextLogger.child(scope) : contextLogger;
    }
    return scope ? getLogger(scope) : getLogger();
  }, [contextLogger, scope]);
}
