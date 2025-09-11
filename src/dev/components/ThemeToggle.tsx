// src/dev/components/ThemeToggle.tsx
// Theme toggle component for switching between light, dark, and system themes
// Provides dropdown interface with keyboard shortcut support for theme management
// RELEVANT FILES: src/dev/DevShortcuts.tsx, src/components/ui/button.tsx, src/components/ui/dropdown-menu.tsx

'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';
import { ThemeMode } from '../types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ThemeToggleProps {
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const themeOptions: Array<{ value: ThemeMode; label: string; icon: React.ElementType }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'ghost',
  size = 'sm',
  showLabel = false,
  className = '',
}) => {
  const { theme, setTheme } = useTheme();

  const currentThemeOption = themeOptions.find(option => option.value === theme) || themeOptions[2];
  const CurrentIcon = currentThemeOption.icon;

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
  };

  const cycleTheme = () => {
    const currentIndex = themeOptions.findIndex(option => option.value === theme);
    const nextIndex = (currentIndex + 1) % themeOptions.length;
    handleThemeChange(themeOptions[nextIndex].value);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          onClick={cycleTheme}
          className={`${className} ${showLabel ? 'px-3' : 'px-2'}`}
          title={`Current theme: ${currentThemeOption.label}. Click to cycle or press T to toggle.`}
        >
          <CurrentIcon className={`${size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'}`} />
          {showLabel && (
            <span className="ml-2 text-xs">
              {currentThemeOption.label}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-40">
        {themeOptions.map((option) => {
          const Icon = option.icon;
          const isActive = theme === option.value;
          
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleThemeChange(option.value)}
              className={`flex items-center space-x-2 cursor-pointer ${
                isActive ? 'bg-accent text-accent-foreground' : ''
              }`}
            >
              <Icon className="h-3 w-3" />
              <span className="text-xs">{option.label}</span>
              {isActive && (
                <div className="ml-auto h-1 w-1 rounded-full bg-primary" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/**
 * Simple theme toggle button that cycles through themes
 * Useful for compact interfaces or when dropdown is not needed
 */
export const SimpleThemeToggle: React.FC<Omit<ThemeToggleProps, 'showLabel'>> = ({
  variant = 'ghost',
  size = 'sm',
  className = '',
}) => {
  const { theme, setTheme } = useTheme();

  const currentThemeOption = themeOptions.find(option => option.value === theme) || themeOptions[2];
  const CurrentIcon = currentThemeOption.icon;

  const cycleTheme = () => {
    const currentIndex = themeOptions.findIndex(option => option.value === theme);
    const nextIndex = (currentIndex + 1) % themeOptions.length;
    setTheme(themeOptions[nextIndex].value);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={cycleTheme}
      className={`${className} px-2`}
      title={`Theme: ${currentThemeOption.label} (Press T to toggle)`}
    >
      <CurrentIcon className={`${size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'}`} />
    </Button>
  );
};

/**
 * Theme indicator component for showing current theme
 * Useful for status displays or read-only theme information
 */
export const ThemeIndicator: React.FC<{
  className?: string;
  showIcon?: boolean;
  showText?: boolean;
}> = ({
  className = '',
  showIcon = true,
  showText = true,
}) => {
  const { theme } = useTheme();

  const currentThemeOption = themeOptions.find(option => option.value === theme) || themeOptions[2];
  const CurrentIcon = currentThemeOption.icon;

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {showIcon && <CurrentIcon className="h-3 w-3" />}
      {showText && (
        <span className="text-xs text-muted-foreground">
          {currentThemeOption.label}
        </span>
      )}
    </div>
  );
};