import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Badge } from './ui/badge';
import { 
  Clock, 
  Target, 
  Wifi, 
  WifiOff, 
  CheckCircle,
  Info
} from 'lucide-react';

interface StatusBarProps {
  currentScreen: string;
  sessionStartTime: Date | null;
  selectedChallenge: any;
}

export function StatusBar({ currentScreen, sessionStartTime, selectedChallenge }: StatusBarProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

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