import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Badge } from './ui/badge';
import { 
  Clock, 
  Target, 
  Wifi, 
  WifiOff, 
  CheckCircle,
  Info,
  Activity,
  Zap,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { PerformanceMonitor } from '../lib/performance/PerformanceOptimizer';

interface StatusBarProps {
  currentScreen: string;
  sessionStartTime: Date | null;
  selectedChallenge: any;
}

interface PerformanceMetrics {
  fps: number;
  avgRenderTime: number;
  memoryUsage: number;
  performanceHealth: 'good' | 'warning' | 'critical';
}

export function StatusBar({ currentScreen, sessionStartTime, selectedChallenge }: StatusBarProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    avgRenderTime: 0,
    memoryUsage: 0,
    performanceHealth: 'good'
  });
  const [showPerformanceDetails, setShowPerformanceDetails] = useState(false);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculate session duration
  useEffect(() => {
    if (sessionStartTime) {
      const timer = setInterval(() => {
        const now = new Date();
        const duration = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000);
        setSessionDuration(duration);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [sessionStartTime]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Simulate auto-save
  useEffect(() => {
    if (sessionStartTime && selectedChallenge) {
      const autoSaveInterval = setInterval(() => {
        setLastSaved(new Date());
      }, 30000); // Auto-save every 30 seconds

      return () => clearInterval(autoSaveInterval);
    }
  }, [sessionStartTime, selectedChallenge]);

  // Performance metrics monitoring
  useEffect(() => {
    if (!shouldShowPerformanceMetrics()) return;

    const performanceMonitor = PerformanceMonitor.getInstance();
    
    const updatePerformanceMetrics = () => {
      const fps = performanceMonitor.getCurrentFPS();
      const avgRenderTime = performanceMonitor.getAverageMetric('canvas-render') || 0;
      
      // Estimate memory usage (simplified)
      const memoryUsage = (performance as any).memory ? 
        Math.round(((performance as any).memory.usedJSHeapSize / (performance as any).memory.totalJSHeapSize) * 100) : 0;
      
      // Calculate performance health
      let performanceHealth: 'good' | 'warning' | 'critical' = 'good';
      if (fps < 30 || avgRenderTime > 50) {
        performanceHealth = 'critical';
      } else if (fps < 50 || avgRenderTime > 20) {
        performanceHealth = 'warning';
      }

      setPerformanceMetrics({
        fps,
        avgRenderTime,
        memoryUsage,
        performanceHealth
      });
    };

    // Update metrics every 500ms
    const metricsInterval = setInterval(updatePerformanceMetrics, 500);
    
    // Initial update
    updatePerformanceMetrics();

    return () => clearInterval(metricsInterval);
  }, [currentScreen]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const shouldShowPerformanceMetrics = () => {
    return currentScreen === 'design-canvas' || currentScreen === 'review';
  };

  const getPerformanceColor = (metric: 'fps' | 'renderTime' | 'health') => {
    switch (metric) {
      case 'fps':
        if (performanceMetrics.fps > 50) return 'text-green-500';
        if (performanceMetrics.fps > 30) return 'text-yellow-500';
        return 'text-red-500';
      case 'renderTime':
        if (performanceMetrics.avgRenderTime < 10) return 'text-green-500';
        if (performanceMetrics.avgRenderTime < 20) return 'text-yellow-500';
        return 'text-red-500';
      case 'health':
        if (performanceMetrics.performanceHealth === 'good') return 'text-green-500';
        if (performanceMetrics.performanceHealth === 'warning') return 'text-yellow-500';
        return 'text-red-500';
    }
  };

  const getPerformanceIcon = () => {
    switch (performanceMetrics.performanceHealth) {
      case 'good':
        return Activity;
      case 'warning':
        return TrendingUp;
      case 'critical':
        return AlertTriangle;
    }
  };

  const getPerformanceTooltip = () => {
    const tips = [];
    
    if (performanceMetrics.fps < 50) {
      tips.push('Low FPS detected - consider reducing canvas complexity');
    }
    if (performanceMetrics.avgRenderTime > 20) {
      tips.push('High render times - try using fewer annotations');
    }
    if (performanceMetrics.memoryUsage > 80) {
      tips.push('High memory usage - consider refreshing the page');
    }
    
    const baseTooltip = `Performance Metrics:
FPS: ${performanceMetrics.fps}
Render Time: ${performanceMetrics.avgRenderTime.toFixed(1)}ms
Memory: ${performanceMetrics.memoryUsage}%
Health: ${performanceMetrics.performanceHealth}`;

    return tips.length > 0 ? `${baseTooltip}\n\nTips:\n${tips.join('\n')}` : baseTooltip;
  };

  const getScreenStatus = () => {
    switch (currentScreen) {
      case 'challenge-selection':
        return { text: 'Ready to start', color: 'bg-blue-500', icon: Target };
      case 'design-canvas':
        return { text: 'Designing system', color: 'bg-purple-500', icon: Target };
      case 'audio-recording':
        return { text: 'Recording explanation', color: 'bg-red-500', icon: Target };
      case 'review':
        return { text: 'Session complete', color: 'bg-green-500', icon: CheckCircle };
      default:
        return { text: 'Getting started', color: 'bg-gray-500', icon: Info };
    }
  };

  const screenStatus = getScreenStatus();

  if (currentScreen === 'welcome') {
    return null; // Don't show status bar on welcome screen
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-8 bg-card/80 backdrop-blur-sm border-t border-border/30 flex items-center justify-between px-4 text-xs"
    >
      {/* Left Section - Status & Challenge */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${screenStatus.color} animate-pulse`} />
          <span className="text-muted-foreground">{screenStatus.text}</span>
        </div>

        {selectedChallenge && (
          <>
            <div className="w-px h-4 bg-border" />
            <Badge variant="outline" className="text-xs" title={`Current Challenge: ${selectedChallenge.title}\nDifficulty: ${selectedChallenge.difficulty}`}>
              <Target className="w-3 h-3 mr-1" />
              {selectedChallenge.title}
            </Badge>
          </>
        )}

        {sessionStartTime && (
          <>
            <div className="w-px h-4 bg-border" />
            <div 
              className="flex items-center space-x-1 text-muted-foreground" 
              title={`Session Duration\nStarted: ${formatTime(sessionStartTime)}`}
            >
              <Clock className="w-3 h-3" />
              <span>{formatDuration(sessionDuration)}</span>
            </div>
          </>
        )}
      </div>

      {/* Right Section - System Status */}
      <div className="flex items-center space-x-4">
        {/* Auto-save Status */}
        {lastSaved && (
          <>
            <div 
              className="flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors cursor-help"
              title={`Last saved: ${formatTime(lastSaved)}\nAuto-saves every 30 seconds`}
            >
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span>Auto-saved</span>
            </div>
            <div className="w-px h-4 bg-border" />
          </>
        )}

        {/* Performance Metrics */}
        {shouldShowPerformanceMetrics() && (
          <>
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="flex items-center space-x-3"
            >
              {/* FPS Indicator */}
              <div 
                className="flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors cursor-help"
                title={`Frame Rate: ${performanceMetrics.fps} FPS\n${performanceMetrics.fps > 50 ? 'Excellent performance' : performanceMetrics.fps > 30 ? 'Good performance' : 'Performance issues detected'}`}
              >
                <Zap className={`w-3 h-3 ${getPerformanceColor('fps')}`} />
                <span className={`font-mono text-xs ${getPerformanceColor('fps')}`}>
                  {performanceMetrics.fps}fps
                </span>
              </div>

              {/* Render Time */}
              {performanceMetrics.avgRenderTime > 0 && (
                <div 
                  className="flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors cursor-help"
                  title={`Average Render Time: ${performanceMetrics.avgRenderTime.toFixed(1)}ms\n${performanceMetrics.avgRenderTime < 10 ? 'Fast rendering' : performanceMetrics.avgRenderTime < 20 ? 'Moderate rendering' : 'Slow rendering detected'}`}
                >
                  <Clock className={`w-3 h-3 ${getPerformanceColor('renderTime')}`} />
                  <span className={`font-mono text-xs ${getPerformanceColor('renderTime')}`}>
                    {performanceMetrics.avgRenderTime.toFixed(1)}ms
                  </span>
                </div>
              )}

              {/* Performance Health */}
              <div 
                className="flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors cursor-help"
                title={getPerformanceTooltip()}
                onClick={() => setShowPerformanceDetails(!showPerformanceDetails)}
              >
                {React.createElement(getPerformanceIcon(), { 
                  className: `w-3 h-3 ${getPerformanceColor('health')} ${performanceMetrics.performanceHealth === 'critical' ? 'animate-pulse' : ''}` 
                })}
                {process.env.NODE_ENV === 'development' && (
                  <span className={`text-xs ${getPerformanceColor('health')}`}>
                    {performanceMetrics.performanceHealth}
                  </span>
                )}
              </div>

              {/* Memory Usage (Development only) */}
              {process.env.NODE_ENV === 'development' && performanceMetrics.memoryUsage > 0 && (
                <div 
                  className="flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors cursor-help"
                  title={`Memory Usage: ${performanceMetrics.memoryUsage}%\n${performanceMetrics.memoryUsage < 60 ? 'Normal usage' : performanceMetrics.memoryUsage < 80 ? 'High usage' : 'Critical memory usage'}`}
                >
                  <TrendingUp className={`w-3 h-3 ${performanceMetrics.memoryUsage > 80 ? 'text-red-500' : performanceMetrics.memoryUsage > 60 ? 'text-yellow-500' : 'text-green-500'}`} />
                  <span className={`font-mono text-xs ${performanceMetrics.memoryUsage > 80 ? 'text-red-500' : performanceMetrics.memoryUsage > 60 ? 'text-yellow-500' : 'text-green-500'}`}>
                    {performanceMetrics.memoryUsage}%
                  </span>
                </div>
              )}
            </motion.div>
            <div className="w-px h-4 bg-border" />
          </>
        )}

        {/* Connection Status */}
        <div 
          className="flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors cursor-help"
          title={isOnline ? 'Connected to internet\nAll features available' : 'No internet connection\nSome features may be limited'}
        >
          {isOnline ? (
            <>
              <Wifi className="w-3 h-3 text-green-500" />
              <span>Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-red-500" />
              <span>Offline</span>
            </>
          )}
        </div>

        <div className="w-px h-4 bg-border" />

        {/* Current Time */}
        <div className="text-muted-foreground font-mono">
          {formatTime(currentTime)}
        </div>
      </div>
    </motion.div>
  );
}
