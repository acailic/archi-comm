import React, { useState, useEffect } from 'react';
import { Minimize2, Maximize2, X, Menu, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { tauriAPI, isTauriApp } from '@/lib/platform/tauri';
import { Button } from '@ui/components/ui/button';

interface WindowControlsProps {
  title?: string;
  showMenu?: boolean;
  onMenuClick?: () => void;
  additionalActions?: React.ReactNode;
}

export function WindowControls({
  title = 'ArchiComm',
  showMenu = false,
  onMenuClick,
  additionalActions,
}: WindowControlsProps) {
  // Determine if we should show the Pro upgrade button (not on welcome screen)
  const [showProButton, setShowProButton] = useState(true);
  useEffect(() => {
    // Try to detect if on welcome screen by checking title
    setShowProButton(title !== 'Welcome to ArchiComm');
  }, [title]);
  const [isMaximized, setIsMaximized] = useState(false);
  const [appVersion, setAppVersion] = useState('');

  useEffect(() => {
    tauriAPI
      .getAppVersion()
      .then(setAppVersion)
      .catch(() => {
        setAppVersion('1.0.0-web');
      });
  }, []);

  const handleMinimize = async () => {
    try {
      await tauriAPI.minimizeWindow();
    } catch (error) {
      console.error('Error minimizing window:', error);
    }
  };

  const handleMaximize = async () => {
    try {
      await tauriAPI.maximizeWindow();
      setIsMaximized(!isMaximized);
    } catch (error) {
      console.error('Error maximizing window:', error);
    }
  };

  const handleClose = async () => {
    try {
      await tauriAPI.closeWindow();
    } catch (error) {
      console.error('Error closing window:', error);
    }
  };

  if (!isTauriApp()) {
    return (
      <div className='h-8 border-b border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] flex items-center justify-center px-4 shadow-[var(--elevation-1)]'>
        <div className='flex items-center space-x-2'>
          <div className='w-2 h-2 rounded-full bg-gradient-to-r from-red-400 to-red-500' />
          <div className='w-2 h-2 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500' />
          <div className='w-2 h-2 rounded-full bg-gradient-to-r from-green-400 to-green-500' />
        </div>
        <div className='flex-1 text-center text-sm text-muted-foreground'>{title}</div>
        <div className='text-xs text-muted-foreground'>Web {appVersion}</div>
      </div>
    );
  }

  return (
    <motion.div
      className='h-8 border-b border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] flex items-center justify-between px-4 shadow-[var(--elevation-2)]'
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      data-tauri-drag-region
    >
      {/* Left side - Menu button and additional actions */}
      <div className='flex items-center space-x-3'>
        {showMenu && (
          <Button
            variant='ghost'
            size='sm'
            onClick={onMenuClick}
            className='h-6 w-6 p-0 hover:bg-accent/60 rounded-md transition-all duration-200'
          >
            <Menu className='w-3 h-3' />
          </Button>
        )}
        {additionalActions}
        {showProButton && (
          <Button
            variant='ghost'
            size='sm'
            className='px-2 text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
            title='Upgrade to Pro'
            onClick={() => console.log('Pro version navigation - feature not yet implemented')}
          >
            <Star className='w-4 h-4 mr-1' />
            <span className='hidden md:inline'>Pro</span>
          </Button>
        )}
      </div>

      {/* Center - Title */}
      <motion.div
        className='flex-1 text-center text-sm font-medium text-foreground/90'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        {title}
      </motion.div>

      {/* Right side - Window controls */}
      <div className='flex items-center space-x-1'>
        <div className='text-xs text-muted-foreground mr-3'>v{appVersion}</div>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant='ghost'
            size='sm'
            onClick={handleMinimize}
            className='h-6 w-6 p-0 hover:bg-yellow-500/20 hover:text-yellow-700 dark:hover:text-yellow-400 rounded-md transition-all duration-200'
          >
            <Minimize2 className='w-3 h-3' />
          </Button>
        </motion.div>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant='ghost'
            size='sm'
            onClick={handleMaximize}
            className='h-6 w-6 p-0 hover:bg-green-500/20 hover:text-green-700 dark:hover:text-green-400 rounded-md transition-all duration-200'
          >
            <Maximize2 className='w-3 h-3' />
          </Button>
        </motion.div>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant='ghost'
            size='sm'
            onClick={handleClose}
            className='h-6 w-6 p-0 hover:bg-red-500/20 hover:text-red-700 dark:hover:text-red-400 rounded-md transition-all duration-200'
          >
            <X className='w-3 h-3' />
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
