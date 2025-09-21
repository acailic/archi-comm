import React from 'react';

interface StatusBarMetricsParams {
  components: any[];
  connections: any[];
  sessionStartTime: Date;
}

export function useStatusBarMetrics({
  components,
  connections,
  sessionStartTime,
}: StatusBarMetricsParams) {
  const progress = React.useMemo(
    () => ({
      componentsCount: components.length,
      connectionsCount: connections.length,
      timeElapsed: Math.floor((Date.now() - sessionStartTime.getTime()) / 1000 / 60),
    }),
    [components.length, connections.length, sessionStartTime]
  );

  return { progress };
}