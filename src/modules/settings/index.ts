export { AIConfigPage } from '../../components/AIConfigPage';

// UX Enhancement Components
export { default as ShortcutCustomizationPanel } from '../../components/ShortcutCustomizationPanel';

// Settings Organization Types
export type SettingsCategory = 'general' | 'accessibility' | 'shortcuts' | 'ai' | 'workflow' | 'onboarding';

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
  accessibility: {
    reducedMotion: false,
    highContrast: false,
    screenReaderOptimized: false,
    keyboardNavigation: true
  },
  workflow: {
    autoSave: true,
    autoSaveInterval: 3000,
    showWorkflowOptimizations: true,
    trackUsageAnalytics: true
  },
  onboarding: {
    showWelcomeOnStartup: true,
    completedFlows: [] as string[],
    skillLevel: 'intermediate' as 'beginner' | 'intermediate' | 'advanced',
    preferredLearningStyle: 'contextual' as 'progressive' | 'contextual' | 'practice'
  },
  shortcuts: {
    customShortcuts: {} as Record<string, string>,
    shortcutScheme: 'default' as 'default' | 'vscode' | 'figma',
    learningEnabled: true,
    showShortcutHints: true
  }
} as const;

// Settings Validation and Migration
export const validateSettings = (settings: any): boolean => {
  try {
    // Basic validation - ensure required properties exist
    if (!settings || typeof settings !== 'object') return false;
    
    // Validate accessibility settings
    if (settings.accessibility) {
      const { reducedMotion, highContrast, screenReaderOptimized, keyboardNavigation } = settings.accessibility;
      if (typeof reducedMotion !== 'boolean' || 
          typeof highContrast !== 'boolean' || 
          typeof screenReaderOptimized !== 'boolean' ||
          typeof keyboardNavigation !== 'boolean') {
        return false;
      }
    }
    
    // Validate workflow settings
    if (settings.workflow) {
      const { autoSave, autoSaveInterval, showWorkflowOptimizations, trackUsageAnalytics } = settings.workflow;
      if (typeof autoSave !== 'boolean' ||
          typeof autoSaveInterval !== 'number' ||
          typeof showWorkflowOptimizations !== 'boolean' ||
          typeof trackUsageAnalytics !== 'boolean') {
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
    localStorage.setItem('archicomm_settings', JSON.stringify({
      ...settings,
      version: '1.1',
      lastUpdated: Date.now()
    }));
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
      accessibility: { ...defaultSettings.accessibility, ...parsed.accessibility },
      workflow: { ...defaultSettings.workflow, ...parsed.workflow },
      onboarding: { ...defaultSettings.onboarding, ...parsed.onboarding },
      shortcuts: { ...defaultSettings.shortcuts, ...parsed.shortcuts }
    };
  } catch (error) {
    console.error('Failed to load settings:', error);
    return defaultSettings;
  }
};