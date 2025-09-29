// src/components/StatusBar.tsx
import React, { useState, useEffect } from 'react';
import { Activity, Zap, Clock } from 'lucide-react';
import type { DesignComponent, Connection, InfoCard, DesignData } from '@shared/contracts';
import LearningBreadcrumbs from '@ui/components/LearningBreadcrumbs';
import type { CanvasRateLimiterSnapshot } from '@/stores/canvasStore';
import { shallow } from 'zustand/shallow';

interface StatusBarProps {
  components: DesignComponent[];
  connections: Connection[];
  infoCards: InfoCard[];
  selectedComponentId: string | null;
  sessionStartTime: Date;
  currentDesignData: DesignData;
  storeCircuitBreakerSnapshot?: CanvasRateLimiterSnapshot | null;
}

const StatusBarClock = React.memo<{ sessionStartTime: Date }>(({ sessionStartTime }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update less frequently to reduce CPU usage
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000); // Update every 30 seconds instead of every second
    return () => clearInterval(timer);
  }, []);

  const timeElapsed = Math.floor((currentTime.getTime() - sessionStartTime.getTime()) / 1000 / 60);

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1">
        <Clock className="w-3 h-3" />
        <span>{timeElapsed}m elapsed</span>
      </div>
      <div className="text-xs">
        {currentTime.toLocaleTimeString()}
      </div>
    </div>
  );
});

StatusBarClock.displayName = 'StatusBarClock';

const StatusBarComponent: React.FC<StatusBarProps> = ({
  components,
  connections,
  infoCards,
  selectedComponentId,
  sessionStartTime,
  currentDesignData,
  storeCircuitBreakerSnapshot,
}) => {
  const componentTypes = Array.from(new Set(components.map(c => c.type))).length;
  const selectedComponentData = selectedComponentId ? components.find(c => c.id === selectedComponentId) : null;

  return (
    <div className="border-t bg-card/30 backdrop-blur-sm p-2 flex items-center justify-between text-xs text-muted-foreground">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <Activity className="w-3 h-3" />
          <span>{components.length} Components</span>
        </div>
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3" />
          <span>{connections.length} Connections</span>
        </div>
        {infoCards.length > 0 && (
          <div className="flex items-center gap-1">
            <span>{infoCards.length} Comments</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <span>{componentTypes} Types</span>
        </div>
        {selectedComponentData && (
          <div className="flex items-center gap-1 text-primary">
            <span>Selected: {selectedComponentData.label}</span>
          </div>
        )}
        {storeCircuitBreakerSnapshot?.open && (
          <div className="flex items-center gap-1 text-amber-600">
            <Zap className="w-3 h-3" />
            <span>Store cooldown</span>
          </div>
        )}
        <LearningBreadcrumbs design={currentDesignData} />
      </div>
      <StatusBarClock sessionStartTime={sessionStartTime} />
    </div>
  );
};

// Optimized equality function for StatusBar props
const statusBarPropsEqual = (prev: StatusBarProps, next: StatusBarProps): boolean => {
  // Fast path: check array lengths and selected ID
  if (prev.components.length !== next.components.length ||
      prev.connections.length !== next.connections.length ||
      prev.infoCards.length !== next.infoCards.length ||
      prev.selectedComponentId !== next.selectedComponentId) {
    return false;
  }

  // Check session start time (should be stable)
  if (prev.sessionStartTime.getTime() !== next.sessionStartTime.getTime()) {
    return false;
  }

  // Check circuit breaker snapshot
  if (prev.storeCircuitBreakerSnapshot !== next.storeCircuitBreakerSnapshot) {
    return false;
  }

  // Shallow comparison for currentDesignData
  return shallow(prev.currentDesignData, next.currentDesignData);
};

export const StatusBar = React.memo(StatusBarComponent, statusBarPropsEqual);
