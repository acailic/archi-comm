import type React from 'react';

export { AIConfigPage } from '@ui/components/pages/AIConfigPage';

// UX Enhancement Components
export { default as ShortcutCustomizationPanel } from '@ui/components/panels/ShortcutCustomizationPanel';

// Settings Organization Types
export type SettingsCategory =
  | 'general'
  | 'accessibility'
  | 'shortcuts'
  | 'ai'
  | 'workflow'
  | 'onboarding';

export interface SettingItem {
  id: string;
  name: string;
  description: string;
  category: SettingsCategory;
  component: React.ComponentType<any>;
  icon?: React.ComponentType<any>;
  keywords?: string[];
}

// Default Settings Configuration
export const defaultSettings = {
  appearance: {
    canvasTheme: 'serious' as 'serious' | 'playful',
  },
  accessibility: {
    reducedMotion: false,
    highContrast: false,
    screenReaderOptimized: false,
    keyboardNavigation: true,
  },
  workflow: {
    autoSave: true,
    autoSaveInterval: 3000,
    showWorkflowOptimizations: true,
    trackUsageAnalytics: true,
  },
  audio: {
    preferredRecordingEngine: 'auto' as 'auto' | 'media-recorder' | 'recordrtc' | 'native',
    preferredTranscriptionEngine: 'auto' as 'auto' | 'whisper-rs' | 'whisper-wasm' | 'web-speech' | 'transformers',
    realtimeTranscription: false,
    quality: 'medium' as 'low' | 'medium' | 'high',
  },
  telemetry: {
    enabled: true,
    errorReporting: true,
    performanceMetrics: true,
  },
  onboarding: {
    showWelcomeOnStartup: true,
    completedFlows: [] as string[],
    skillLevel: 'intermediate' as 'beginner' | 'intermediate' | 'advanced',
    preferredLearningStyle: 'contextual' as 'progressive' | 'contextual' | 'practice',
  },
  shortcuts: {
    customShortcuts: {} as Record<string, string>,
    shortcutScheme: 'default' as 'default' | 'vscode' | 'figma',
    learningEnabled: true,
    showShortcutHints: true,
  },
} as const;

// Settings Validation and Migration
export const validateSettings = (settings: any): boolean => {
  try {
    // Basic validation - ensure required properties exist
    if (!settings || typeof settings !== 'object') return false;

    // Validate appearance settings
    if (settings.appearance) {
      const { canvasTheme } = settings.appearance;
      if (!['serious', 'playful'].includes(canvasTheme)) return false;
    }

    // Validate accessibility settings
    if (settings.accessibility) {
      const { reducedMotion, highContrast, screenReaderOptimized, keyboardNavigation } =
        settings.accessibility;
      if (
        typeof reducedMotion !== 'boolean' ||
        typeof highContrast !== 'boolean' ||
        typeof screenReaderOptimized !== 'boolean' ||
        typeof keyboardNavigation !== 'boolean'
      ) {
        return false;
      }
    }

    // Validate workflow settings
    if (settings.workflow) {
      const { autoSave, autoSaveInterval, showWorkflowOptimizations, trackUsageAnalytics } =
        settings.workflow;
      if (
        typeof autoSave !== 'boolean' ||
        typeof autoSaveInterval !== 'number' ||
        typeof showWorkflowOptimizations !== 'boolean' ||
        typeof trackUsageAnalytics !== 'boolean'
      ) {
        return false;
      }
    }

    // Validate audio settings
    if (settings.audio) {
      const { preferredRecordingEngine, preferredTranscriptionEngine, realtimeTranscription, quality } =
        settings.audio;
      const recOk = ['auto', 'media-recorder', 'recordrtc', 'native'].includes(preferredRecordingEngine);
      const sttOk = ['auto', 'whisper-rs', 'whisper-wasm', 'web-speech', 'transformers'].includes(preferredTranscriptionEngine);
      const qualOk = ['low', 'medium', 'high'].includes(quality);
      if (!recOk || !sttOk || typeof realtimeTranscription !== 'boolean' || !qualOk) {
        return false;
      }
    }

    // Validate telemetry settings
    if (settings.telemetry) {
      const { enabled, errorReporting, performanceMetrics } = settings.telemetry;
      if (
        typeof enabled !== 'boolean' ||
        typeof errorReporting !== 'boolean' ||
        typeof performanceMetrics !== 'boolean'
      ) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
};

export const migrateSettings = (settings: any, fromVersion: string, toVersion: string): any => {
  // Settings migration logic for version updates
  let migratedSettings = { ...settings };

  // Example migration from v1.0 to v1.1
  if (fromVersion === '1.0' && toVersion === '1.1') {
    // Add new workflow settings
    if (!migratedSettings.workflow) {
      migratedSettings.workflow = defaultSettings.workflow;
    }
  }

  return migratedSettings;
};

// Settings Persistence Helpers
export const saveSettings = (settings: typeof defaultSettings): void => {
  try {
    localStorage.setItem(
      'archicomm_settings',
      JSON.stringify({
        ...settings,
        version: '1.1',
        lastUpdated: Date.now(),
      })
    );
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
};

export const loadSettings = (): typeof defaultSettings => {
  try {
    const stored = localStorage.getItem('archicomm_settings');
    if (!stored) return defaultSettings;

    const parsed = JSON.parse(stored);
    if (!validateSettings(parsed)) {
      console.warn('Invalid settings detected, using defaults');
      return defaultSettings;
    }

    // Handle version migration
    const currentVersion = '1.1';
    if (parsed.version && parsed.version !== currentVersion) {
      const migrated = migrateSettings(parsed, parsed.version, currentVersion);
      saveSettings(migrated);
      return migrated;
    }

    // Merge with defaults to ensure all properties exist
    return {
      ...defaultSettings,
      ...parsed,
      // Ensure nested objects are merged properly
      appearance: { ...defaultSettings.appearance, ...parsed.appearance },
      accessibility: { ...defaultSettings.accessibility, ...parsed.accessibility },
      workflow: { ...defaultSettings.workflow, ...parsed.workflow },
      audio: { ...defaultSettings.audio, ...parsed.audio },
      telemetry: { ...defaultSettings.telemetry, ...parsed.telemetry },
      onboarding: { ...defaultSettings.onboarding, ...parsed.onboarding },
      shortcuts: { ...defaultSettings.shortcuts, ...parsed.shortcuts },
    };
  } catch (error) {
    console.error('Failed to load settings:', error);
    return defaultSettings;
  }
};
