/**
 * ArchiComm Ultra-Smooth Loading Components
 * High-performance loading indicators with delightful animations
 */

import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'spinner' | 'dots' | 'pulse' | 'wave' | 'architecture';
  color?: string;
  message?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  variant = 'spinner',
  color = 'currentColor',
  message,
  className = '',
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  };

  const containerClasses = `inline-flex flex-col items-center justify-center ${className}`;

  const renderSpinner = () => {
    switch (variant) {
      case 'spinner':
        return <SpinnerVariant size={sizeClasses[size]} color={color} />;
      case 'dots':
        return <DotsVariant size={size} color={color} />;
      case 'pulse':
        return <PulseVariant size={sizeClasses[size]} color={color} />;
      case 'wave':
        return <WaveVariant size={size} color={color} />;
      case 'architecture':
        return <ArchitectureVariant size={sizeClasses[size]} color={color} />;
      default:
        return <SpinnerVariant size={sizeClasses[size]} color={color} />;
    }
  };

  return (
    <div className={containerClasses}>
      {renderSpinner()}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className='mt-3 text-sm text-gray-600 dark:text-gray-400 text-center'
        >
          {message}
        </motion.div>
      )}
    </div>
  );
};

// Classic spinning circle
const SpinnerVariant: React.FC<{ size: string; color: string }> = ({ size, color }) => (
  <motion.div
    className={`${size} border-2 border-gray-200 dark:border-gray-700 rounded-full`}
    style={{ borderTopColor: color }}
    animate={{ rotate: 360 }}
    transition={{
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    }}
  />
);

// Animated dots
const DotsVariant: React.FC<{ size: 'small' | 'medium' | 'large'; color: string }> = ({
  size,
  color,
}) => {
  const dotSize = {
    small: 'w-1.5 h-1.5',
    medium: 'w-2 h-2',
    large: 'w-3 h-3',
  };

  const containerSize = {
    small: 'space-x-1',
    medium: 'space-x-1.5',
    large: 'space-x-2',
  };

  return (
    <div className={`flex items-center ${containerSize[size]}`}>
      {[0, 1, 2].map(index => (
        <motion.div
          key={index}
          className={`${dotSize[size]} rounded-full`}
          style={{ backgroundColor: color }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: index * 0.1,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

// Pulsing circle
const PulseVariant: React.FC<{ size: string; color: string }> = ({ size, color }) => (
  <motion.div
    className={`${size} rounded-full`}
    style={{ backgroundColor: color }}
    animate={{
      scale: [1, 1.2, 1],
      opacity: [0.7, 1, 0.7],
    }}
    transition={{
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
  />
);

// Wave animation
const WaveVariant: React.FC<{ size: 'small' | 'medium' | 'large'; color: string }> = ({
  size,
  color,
}) => {
  const barHeight = {
    small: 'h-6',
    medium: 'h-8',
    large: 'h-12',
  };

  const barWidth = {
    small: 'w-1',
    medium: 'w-1.5',
    large: 'w-2',
  };

  const spacing = {
    small: 'space-x-1',
    medium: 'space-x-1.5',
    large: 'space-x-2',
  };

  return (
    <div className={`flex items-end ${spacing[size]}`}>
      {[0, 1, 2, 3, 4].map(index => (
        <motion.div
          key={index}
          className={`${barWidth[size]} ${barHeight[size]} rounded-sm`}
          style={{ backgroundColor: color }}
          animate={{
            scaleY: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: index * 0.1,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

// Architecture-themed loading animation
const ArchitectureVariant: React.FC<{ size: string; color: string }> = ({ size, color }) => (
  <div className={`${size} relative`}>
    {/* Building blocks animation */}
    <motion.div
      className='absolute inset-0 border-2 border-current rounded-sm'
      style={{ color }}
      animate={{
        borderRadius: ['2px', '8px', '2px'],
        scale: [1, 1.05, 1],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />

    {/* Inner components */}
    <motion.div
      className='absolute inset-2 border border-current rounded-sm opacity-70'
      style={{ color }}
      animate={{
        scale: [0.8, 1, 0.8],
        opacity: [0.4, 0.8, 0.4],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        delay: 0.3,
        ease: 'easeInOut',
      }}
    />

    {/* Connection lines */}
    <motion.div
      className='absolute top-1/2 left-1/2 w-1 h-1 bg-current rounded-full transform -translate-x-1/2 -translate-y-1/2'
      style={{ backgroundColor: color }}
      animate={{
        scale: [1, 1.5, 1],
        opacity: [1, 0.5, 1],
      }}
      transition={{
        duration: 1,
        repeat: Infinity,
        delay: 0.5,
        ease: 'easeInOut',
      }}
    />
  </div>
);

// Full-page loading overlay
export const LoadingOverlay: React.FC<{
  isLoading: boolean;
  message?: string;
  variant?: LoadingSpinnerProps['variant'];
  backdrop?: 'blur' | 'dark' | 'light' | 'transparent';
}> = ({ isLoading, message = 'Loading...', variant = 'architecture', backdrop = 'blur' }) => {
  if (!isLoading) return null;

  const backdropClasses = {
    blur: 'backdrop-blur-sm bg-white/80 dark:bg-gray-900/80',
    dark: 'bg-gray-900/90',
    light: 'bg-white/90',
    transparent: 'bg-transparent',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-50 flex items-center justify-center ${backdropClasses[backdrop]}`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ delay: 0.1 }}
        className='bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-sm mx-4 text-center border border-gray-200 dark:border-gray-700'
      >
        <LoadingSpinner size='large' variant={variant} message={message} color='#3b82f6' />
      </motion.div>
    </motion.div>
  );
};

// Skeleton loader for content
export const SkeletonLoader: React.FC<{
  lines?: number;
  avatar?: boolean;
  className?: string;
}> = ({ lines = 3, avatar = false, className = '' }) => {
  return (
    <div className={`animate-pulse ${className}`}>
      {avatar && (
        <div className='flex items-center space-x-4 mb-4'>
          <div className='w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full' />
          <div className='flex-1 space-y-2'>
            <div className='h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/3' />
            <div className='h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/4' />
          </div>
        </div>
      )}

      <div className='space-y-3'>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className='h-4 bg-gray-300 dark:bg-gray-600 rounded'
            style={{
              width: `${Math.random() * 40 + 60}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Progress bar with animation
export const ProgressBar: React.FC<{
  progress: number;
  message?: string;
  showPercentage?: boolean;
  color?: string;
  height?: 'thin' | 'medium' | 'thick';
  className?: string;
}> = ({
  progress,
  message,
  showPercentage = false,
  color = '#3b82f6',
  height = 'medium',
  className = '',
}) => {
  const heightClasses = {
    thin: 'h-1',
    medium: 'h-2',
    thick: 'h-3',
  };

  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className={`w-full ${className}`}>
      {(message || showPercentage) && (
        <div className='flex justify-between items-center mb-2 text-sm text-gray-600 dark:text-gray-400'>
          {message && <span>{message}</span>}
          {showPercentage && <span>{Math.round(clampedProgress)}%</span>}
        </div>
      )}

      <div
        className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full ${heightClasses[height]} overflow-hidden`}
      >
        <motion.div
          className='h-full rounded-full'
          style={{ backgroundColor: color }}
          initial={{ width: '0%' }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

// Smart loading state hook
export const useLoadingState = (initialState = false) => {
  const [isLoading, setIsLoading] = React.useState(initialState);
  const [message, setMessage] = React.useState<string>('');
  const [progress, setProgress] = React.useState(0);

  const startLoading = (loadingMessage = 'Loading...') => {
    setMessage(loadingMessage);
    setIsLoading(true);
    setProgress(0);
  };

  const updateProgress = (newProgress: number, newMessage?: string) => {
    setProgress(newProgress);
    if (newMessage) setMessage(newMessage);
  };

  const finishLoading = () => {
    setProgress(100);
    setTimeout(() => {
      setIsLoading(false);
      setMessage('');
      setProgress(0);
    }, 300);
  };

  return {
    isLoading,
    message,
    progress,
    startLoading,
    updateProgress,
    finishLoading,
    setLoading: setIsLoading,
  };
};
