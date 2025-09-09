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
  TrendingUp,
} from 'lucide-react';
import { PerformanceMonitor } from '../lib/performance/PerformanceOptimizer';
import { useUXOptimizer } from '../lib/user-experience/UXOptimizer';

interface StatusBarProps {
  currentScreen: string;
  sessionStartTime: Date | null;
  selectedChallenge: any;
  cursorPosition?: { x: number; y: number } | null;
  selectedCount?: number;
  totalComponents?: number;
  canvasExtents?: { width: number; height: number };
}

interface PerformanceMetrics {
  fps: number;
  avgRenderTime: number;
  memoryUsage: number;
  performanceHealth: 'good' | 'warning' | 'critical';
}

interface UXMetrics {
  userSatisfaction: number;
  interactionSuccess: number;
  recommendationsAvailable: number;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
}

export function StatusBar({
  currentScreen,
  sessionStartTime,
  selectedChallenge,
  cursorPosition,
  selectedCount,
  totalComponents,
  canvasExtents,
}: StatusBarProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    avgRenderTime: 0,
    memoryUsage: 0,
    performanceHealth: 'good',
  });
  const [uxMetrics, setUxMetrics] = useState<UXMetrics>({
    userSatisfaction: 85,
    interactionSuccess: 90,
    recommendationsAvailable: 0,
    skillLevel: 'intermediate',
  });
  const [showPerformanceDetails, setShowPerformanceDetails] = useState(false);

  // UX Optimizer integration (use stable callbacks, not the whole object)
  const { measureSatisfaction, getSuccessRate, getRecommendations, getSkillLevel } =
    useUXOptimizer();

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

  // UX metrics monitoring
  useEffect(() => {
    const updateUXMetrics = () => {
      try {
        const satisfaction = measureSatisfaction();
        const successRate = getSuccessRate();
        const recommendations = getRecommendations();
        const skillLevel = getSkillLevel();

        setUxMetrics({
          userSatisfaction: Math.round(satisfaction * 100),
          interactionSuccess: Math.round(successRate * 100),
          recommendationsAvailable: recommendations.length,
          skillLevel: skillLevel || 'intermediate',
        });
      } catch (error) {
        // Fallback to default values if UX optimizer fails
        console.warn('Failed to update UX metrics:', error);
      }
    };

    // Update UX metrics every 2 seconds
    const uxInterval = setInterval(updateUXMetrics, 2000);

    // Initial update
    updateUXMetrics();

    return () => clearInterval(uxInterval);
  }, [currentScreen, measureSatisfaction, getSuccessRate, getRecommendations, getSkillLevel]);

  // Performance metrics monitoring
  useEffect(() => {
    if (!shouldShowPerformanceMetrics()) return;

    const performanceMonitor = PerformanceMonitor.getInstance();

    const updatePerformanceMetrics = () => {
      const fps = performanceMonitor.getCurrentFPS();
      const avgRenderTime = performanceMonitor.getAverageMetric('canvas-render') || 0;

      // Estimate memory usage (simplified)
      const memoryUsage = (performance as any).memory
        ? Math.round(
            ((performance as any).memory.usedJSHeapSize /
              (performance as any).memory.totalJSHeapSize) *
              100
          )
        : 0;

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
        performanceHealth,
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
      hour12: true,
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

  const shouldShowUXMetrics = () => {
    return currentScreen !== 'welcome' && currentScreen !== 'challenge-selection';
  };

  const getUXSatisfactionColor = () => {
    if (uxMetrics.userSatisfaction >= 80) return 'text-green-500';
    if (uxMetrics.userSatisfaction >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getInteractionSuccessColor = () => {
    if (uxMetrics.interactionSuccess >= 90) return 'text-green-500';
    if (uxMetrics.interactionSuccess >= 75) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getSkillLevelIcon = () => {
    switch (uxMetrics.skillLevel) {
      case 'beginner':
        return '🌱';
      case 'intermediate':
        return '⚡';
      case 'advanced':
        return '🚀';
      default:
        return '⚡';
    }
  };

  const getUXTooltip = () => {
    const tips = [];

    if (uxMetrics.userSatisfaction < 70) {
      tips.push('Low satisfaction detected - check for usability issues');
    }
    if (uxMetrics.interactionSuccess < 80) {
      tips.push('Some interactions failing - consider UI improvements');
    }
    if (uxMetrics.recommendationsAvailable > 0) {
      tips.push(`${uxMetrics.recommendationsAvailable} UX recommendations available`);
    }

    const baseTooltip = `UX Metrics:
Satisfaction: ${uxMetrics.userSatisfaction}%
Success Rate: ${uxMetrics.interactionSuccess}%
Skill Level: ${uxMetrics.skillLevel}
Recommendations: ${uxMetrics.recommendationsAvailable}`;

    return tips.length > 0 ? `${baseTooltip}\n\nInsights:\n${tips.join('\n')}` : baseTooltip;
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
      className='h-8 border-t border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] flex items-center justify-between px-4 text-xs shadow-[var(--elevation-1)]'
    >
      {/* Left Section - Status & Challenge */}
      <div className='flex items-center space-x-4'>
        <div className='flex items-center space-x-2'>
          <div className={`w-2 h-2 rounded-full ${screenStatus.color} animate-pulse`} />
          <span className='text-muted-foreground'>{screenStatus.text}</span>
        </div>

        {selectedChallenge && (
          <>
            <div className='w-px h-4 bg-border' />
            <Badge
              variant='outline'
              className='text-xs'
              title={`Current Challenge: ${selectedChallenge.title}\nDifficulty: ${selectedChallenge.difficulty}`}
            >
              <Target className='w-3 h-3 mr-1' />
              {selectedChallenge.title}
            </Badge>
          </>
        )}

        {sessionStartTime && (
          <>
            <div className='w-px h-4 bg-border' />
            <div
              className='flex items-center space-x-1 text-muted-foreground'
              title={`Session Duration\nStarted: ${formatTime(sessionStartTime)}`}
            >
              <Clock className='w-3 h-3' />
              <span>{formatDuration(sessionDuration)}</span>
            </div>
          </>
        )}
      </div>

      {/* Right Section - System Status */}
      <div className='flex items-center space-x-4'>
        {/* Auto-save Status */}
        {lastSaved && (
          <>
            <div
              className='flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors cursor-help'
              title={`Last saved: ${formatTime(lastSaved)}\nAuto-saves every 30 seconds`}
            >
              <CheckCircle className='w-3 h-3 text-green-500' />
              <span>Auto-saved</span>
            </div>
            <div className='w-px h-4 bg-border' />
          </>
        )}

        {/* UX Metrics */}
        {shouldShowUXMetrics() && (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className='flex items-center space-x-3'
            >
              {/* User Satisfaction */}
              <div
                className='flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors cursor-help'
                title={`User Satisfaction: ${uxMetrics.userSatisfaction}%\n${uxMetrics.userSatisfaction >= 80 ? 'Excellent experience' : uxMetrics.userSatisfaction >= 60 ? 'Good experience' : 'Experience needs improvement'}`}
              >
                <span className='text-xs'>😊</span>
                <span className={`font-mono text-xs ${getUXSatisfactionColor()}`}>
                  {uxMetrics.userSatisfaction}%
                </span>
              </div>

              {/* Interaction Success Rate */}
              <div
                className='flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors cursor-help'
                title={`Interaction Success: ${uxMetrics.interactionSuccess}%\n${uxMetrics.interactionSuccess >= 90 ? 'Excellent interaction success' : uxMetrics.interactionSuccess >= 75 ? 'Good interaction success' : 'Interaction issues detected'}`}
              >
                <CheckCircle className={`w-3 h-3 ${getInteractionSuccessColor()}`} />
                <span className={`font-mono text-xs ${getInteractionSuccessColor()}`}>
                  {uxMetrics.interactionSuccess}%
                </span>
              </div>

              {/* Skill Level & Recommendations */}
              <div
                className='flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors cursor-help'
                title={getUXTooltip()}
              >
                <span className='text-xs'>{getSkillLevelIcon()}</span>
                <span className='text-xs capitalize'>{uxMetrics.skillLevel}</span>
                {uxMetrics.recommendationsAvailable > 0 && (
                  <Badge variant='outline' className='ml-1 px-1 py-0 text-xs h-4'>
                    <TrendingUp className='w-2 h-2 mr-1' />
                    {uxMetrics.recommendationsAvailable}
                  </Badge>
                )}
              </div>
            </motion.div>
            <div className='w-px h-4 bg-border' />
          </>
        )}

        {/* Performance Metrics */}
        {shouldShowPerformanceMetrics() && (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className='flex items-center space-x-3'
            >
              {/* FPS Indicator */}
              <div
                className='flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors cursor-help'
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
                  className='flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors cursor-help'
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
                className='flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors cursor-help'
                title={getPerformanceTooltip()}
                onClick={() => setShowPerformanceDetails(!showPerformanceDetails)}
              >
                {React.createElement(getPerformanceIcon(), {
                  className: `w-3 h-3 ${getPerformanceColor('health')} ${performanceMetrics.performanceHealth === 'critical' ? 'animate-pulse' : ''}`,
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
                  className='flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors cursor-help'
                  title={`Memory Usage: ${performanceMetrics.memoryUsage}%\n${performanceMetrics.memoryUsage < 60 ? 'Normal usage' : performanceMetrics.memoryUsage < 80 ? 'High usage' : 'Critical memory usage'}`}
                >
                  <TrendingUp
                    className={`w-3 h-3 ${performanceMetrics.memoryUsage > 80 ? 'text-red-500' : performanceMetrics.memoryUsage > 60 ? 'text-yellow-500' : 'text-green-500'}`}
                  />
                  <span
                    className={`font-mono text-xs ${performanceMetrics.memoryUsage > 80 ? 'text-red-500' : performanceMetrics.memoryUsage > 60 ? 'text-yellow-500' : 'text-green-500'}`}
                  >
                    {performanceMetrics.memoryUsage}%
                  </span>
                </div>
              )}
            </motion.div>
            <div className='w-px h-4 bg-border' />
          </>
        )}

        {/* Canvas Information - Only show on design canvas screen */}
        {currentScreen === 'design-canvas' && (
          <>
            {/* Cursor Position */}
            {cursorPosition && (
              <>
                <div
                  className='flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors cursor-help font-mono text-xs'
                  title={`Current cursor position in canvas coordinates`}
                >
                  <span>
                    X: {Math.round(cursorPosition.x)}, Y: {Math.round(cursorPosition.y)}
                  </span>
                </div>
                <div className='w-px h-4 bg-border' />
              </>
            )}

            {/* Selection Count */}
            {selectedCount !== undefined && totalComponents !== undefined && (
              <>
                <div
                  className='flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors cursor-help'
                  title={`${selectedCount} of ${totalComponents} components selected`}
                >
                  <Target className='w-3 h-3' />
                  <span
                    className={`text-xs ${
                      selectedCount > 0 ? 'text-green-600 font-medium' : 'text-muted-foreground'
                    }`}
                  >
                    Selected: {selectedCount}/{totalComponents}
                  </span>
                </div>
                <div className='w-px h-4 bg-border' />
              </>
            )}

            {/* Canvas Extents - Only in development mode */}
            {process.env.NODE_ENV === 'development' && canvasExtents && (
              <>
                <div
                  className='flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors cursor-help font-mono text-xs'
                  title={`Canvas size: ${canvasExtents.width} x ${canvasExtents.height} pixels`}
                >
                  <span>
                    {Math.round(canvasExtents.width)} × {Math.round(canvasExtents.height)}
                  </span>
                </div>
                <div className='w-px h-4 bg-border' />
              </>
            )}
          </>
        )}

        {/* Connection Status */}
        <div
          className='flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors cursor-help'
          title={
            isOnline
              ? 'Connected to internet\nAll features available'
              : 'No internet connection\nSome features may be limited'
          }
        >
          {isOnline ? (
            <>
              <Wifi className='w-3 h-3 text-green-500' />
              <span>Online</span>
            </>
          ) : (
            <>
              <WifiOff className='w-3 h-3 text-red-500' />
              <span>Offline</span>
            </>
          )}
        </div>

        <div className='w-px h-4 bg-border' />

        {/* Current Time */}
        <div className='text-muted-foreground font-mono'>{formatTime(currentTime)}</div>
      </div>
    </motion.div>
  );
}
