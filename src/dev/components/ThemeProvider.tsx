// src/dev/components/ThemeProvider.tsx
// Theme provider wrapper specifically for the scenario viewer with next-themes integration
// Provides theme context and management for dev tools since main app lacks ThemeProvider
// RELEVANT FILES: src/components/ui/sonner.tsx, src/dev/ScenarioViewer.tsx, next-themes package

'use client';

import React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps as NextThemeProviderProps } from 'next-themes/dist/types';

interface ScenarioThemeProviderProps extends Omit<NextThemeProviderProps, 'children'> {
  children: React.ReactNode;
}

/**
 * Theme provider specifically for the scenario viewer
 * Wraps next-themes ThemeProvider with dev-specific configuration
 */
export function ScenarioThemeProvider({
  children,
  attribute = 'class',
  defaultTheme = 'system',
  enableSystem = true,
  storageKey = 'scenario-viewer-theme',
  disableTransitionOnChange = false,
  ...props
}: ScenarioThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute={attribute}
      defaultTheme={defaultTheme}
      enableSystem={enableSystem}
      storageKey={storageKey}
      disableTransitionOnChange={disableTransitionOnChange}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}

export { ScenarioThemeProvider as ThemeProvider };