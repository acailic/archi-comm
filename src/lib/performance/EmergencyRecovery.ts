// Emergency recovery mechanisms for React update loops and maximum depth exceeded errors
// Provides automatic detection, intervention, and recovery strategies
// RELEVANT FILES: UpdateDepthMonitor.ts, StateUpdateGuard.ts, ComponentLifecycleTracker.ts

import { UpdateDepthMonitor } from './UpdateDepthMonitor';
import { ComponentLifecycleTracker } from './ComponentLifecycleTracker';
import { RenderLoopDiagnostics } from '../debug/RenderLoopDiagnostics';

interface RecoveryStrategy {
  name: string;
  priority: number;
  canApply: (context: RecoveryContext) => boolean;
  apply: (context: RecoveryContext) => Promise<RecoveryResult>;
  description: string;
}

interface RecoveryContext {
  componentName: string;
  errorType: 'update-depth' | 'render-loop' | 'effect-loop' | 'state-storm';
  errorCount: number;
  affectedComponents: string[];
  stackTrace?: string;
  lastKnownGoodState?: any;
  emergencyData?: any;
}

interface RecoveryResult {
  success: boolean;
  strategy: string;
  message: string;
  recoveredData?: any;
  requiresReload?: boolean;
}

class EmergencyRecovery {
  private static instance: EmergencyRecovery | null = null;
  private strategies: RecoveryStrategy[] = [];
  private isRecovering = false;
  private recoveryHistory: RecoveryResult[] = [];
  private emergencyStates = new Map<string, any>();

  static getInstance(): EmergencyRecovery {
    if (!EmergencyRecovery.instance) {
      EmergencyRecovery.instance = new EmergencyRecovery();
      EmergencyRecovery.instance.initializeStrategies();
    }
    return EmergencyRecovery.instance;
  }

  private initializeStrategies() {
    // Strategy 1: Component isolation
    this.strategies.push({
      name: 'component-isolation',
      priority: 1,
      canApply: (context) => context.affectedComponents.length === 1,
      apply: async (context) => {
        const componentName = context.componentName;

        // Temporarily disable the component
        this.disableComponent(componentName);

        // Clear its state
        this.clearComponentState(componentName);

        // Wait for stabilization
        await this.waitForStabilization(2000);

        // Re-enable with safe defaults
        this.enableComponentWithDefaults(componentName);

        return {
          success: true,
          strategy: 'component-isolation',
          message: `Isolated and reset component: ${componentName}`,
        };
      },
      description: 'Isolates problematic component and resets its state',
    });

    // Strategy 2: State rollback
    this.strategies.push({
      name: 'state-rollback',
      priority: 2,
      canApply: (context) => Boolean(context.lastKnownGoodState),
      apply: async (context) => {
        try {
          // Restore last known good state
          const restored = await this.restoreState(context.componentName, context.lastKnownGoodState);

          return {
            success: restored,
            strategy: 'state-rollback',
            message: `Rolled back to last known good state for ${context.componentName}`,
            recoveredData: context.lastKnownGoodState,
          };
        } catch (error) {
          return {
            success: false,
            strategy: 'state-rollback',
            message: `Failed to rollback state: ${error}`,
          };
        }
      },
      description: 'Rolls back component state to last known good configuration',
    });

    // Strategy 3: Force unmount and remount
    this.strategies.push({
      name: 'force-remount',
      priority: 3,
      canApply: (context) => context.errorCount >= 3,
      apply: async (context) => {
        try {
          // Force unmount the component tree
          await this.forceUnmount(context.componentName);

          // Wait for cleanup
          await this.waitForStabilization(1000);

          // Remount with fresh state
          await this.forceMountWithDefaults(context.componentName);

          return {
            success: true,
            strategy: 'force-remount',
            message: `Force remounted component: ${context.componentName}`,
          };
        } catch (error) {
          return {
            success: false,
            strategy: 'force-remount',
            message: `Failed to force remount: ${error}`,
          };
        }
      },
      description: 'Forces component unmount and remount with clean state',
    });

    // Strategy 4: Page reload (nuclear option)
    this.strategies.push({
      name: 'page-reload',
      priority: 4,
      canApply: (context) => context.errorCount >= 5,
      apply: async (context) => {
        // Save recovery data for after reload
        this.saveEmergencyData(context);

        // Show user notification
        this.showEmergencyNotification('Critical error detected. Reloading application...');

        // Delay to allow notification to be seen
        await this.waitForStabilization(2000);

        // Reload the page
        if (typeof window !== 'undefined') {
          window.location.reload();
        }

        return {
          success: true,
          strategy: 'page-reload',
          message: 'Initiated page reload for critical recovery',
          requiresReload: true,
        };
      },
      description: 'Reloads the entire page as last resort recovery',
    });

    // Sort strategies by priority
    this.strategies.sort((a, b) => a.priority - b.priority);
  }

  async attemptRecovery(context: RecoveryContext): Promise<RecoveryResult> {
    if (this.isRecovering) {
      return {
        success: false,
        strategy: 'none',
        message: 'Recovery already in progress',
      };
    }

    this.isRecovering = true;

    try {
      // Log the recovery attempt
      RenderLoopDiagnostics.getInstance().recordStabilityWarning(
        'EmergencyRecovery',
        `Starting recovery for ${context.componentName}: ${context.errorType}`
      );

      // Find applicable strategies
      const applicableStrategies = this.strategies.filter(strategy =>
        strategy.canApply(context)
      );

      if (applicableStrategies.length === 0) {
        return {
          success: false,
          strategy: 'none',
          message: 'No applicable recovery strategies found',
        };
      }

      // Try each strategy in order of priority
      for (const strategy of applicableStrategies) {
        console.warn(`EmergencyRecovery: Attempting ${strategy.name} for ${context.componentName}`);

        try {
          const result = await strategy.apply(context);
          this.recoveryHistory.push(result);

          if (result.success) {
            console.info(`EmergencyRecovery: Successfully applied ${strategy.name}`);
            return result;
          } else {
            console.warn(`EmergencyRecovery: Strategy ${strategy.name} failed:`, result.message);
          }
        } catch (error) {
          console.error(`EmergencyRecovery: Strategy ${strategy.name} threw error:`, error);
        }
      }

      return {
        success: false,
        strategy: 'all-failed',
        message: 'All recovery strategies failed',
      };
    } finally {
      this.isRecovering = false;
    }
  }

  private disableComponent(componentName: string) {
    // Add to disabled components list
    const disabledComponents = new Set(
      JSON.parse(sessionStorage.getItem('emergency-disabled-components') || '[]')
    );
    disabledComponents.add(componentName);
    sessionStorage.setItem('emergency-disabled-components', JSON.stringify([...disabledComponents]));
  }

  private enableComponentWithDefaults(componentName: string) {
    // Remove from disabled components list
    const disabledComponents = new Set(
      JSON.parse(sessionStorage.getItem('emergency-disabled-components') || '[]')
    );
    disabledComponents.delete(componentName);
    sessionStorage.setItem('emergency-disabled-components', JSON.stringify([...disabledComponents]));
  }

  private clearComponentState(componentName: string) {
    // Clear any cached state for this component
    const stateKeys = Object.keys(sessionStorage).filter(key =>
      key.startsWith(`component-state-${componentName}`)
    );
    stateKeys.forEach(key => sessionStorage.removeItem(key));
  }

  private async restoreState(componentName: string, state: any): Promise<boolean> {
    try {
      // Restore state to sessionStorage for component to pick up
      sessionStorage.setItem(`emergency-restored-state-${componentName}`, JSON.stringify(state));

      // Dispatch custom event to notify component
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('emergency-state-restore', {
          detail: { componentName, state }
        }));
      }

      return true;
    } catch (error) {
      console.error('Failed to restore state:', error);
      return false;
    }
  }

  private async forceUnmount(componentName: string): Promise<void> {
    // Signal component to unmount
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('emergency-force-unmount', {
        detail: { componentName }
      }));
    }
  }

  private async forceMountWithDefaults(componentName: string): Promise<void> {
    // Signal component to mount with defaults
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('emergency-force-mount', {
        detail: { componentName, useDefaults: true }
      }));
    }
  }

  private async waitForStabilization(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private saveEmergencyData(context: RecoveryContext) {
    const emergencyData = {
      context,
      timestamp: Date.now(),
      recoveryHistory: this.recoveryHistory,
      metrics: ComponentLifecycleTracker.getInstance().getAllMetrics(),
    };

    sessionStorage.setItem('emergency-recovery-data', JSON.stringify(emergencyData));
  }

  private showEmergencyNotification(message: string) {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        new Notification('ArchiComm Recovery', {
          body: message,
          icon: '/favicon.ico',
        });
      } catch (error) {
        // Fallback to console if notifications aren't available
        console.warn('Emergency Recovery:', message);
      }
    }
  }

  isComponentDisabled(componentName: string): boolean {
    const disabledComponents = JSON.parse(
      sessionStorage.getItem('emergency-disabled-components') || '[]'
    );
    return disabledComponents.includes(componentName);
  }

  getRecoveryHistory(): RecoveryResult[] {
    return [...this.recoveryHistory];
  }

  getEmergencyData(): any {
    const data = sessionStorage.getItem('emergency-recovery-data');
    return data ? JSON.parse(data) : null;
  }

  reset() {
    this.recoveryHistory = [];
    this.emergencyStates.clear();
    sessionStorage.removeItem('emergency-disabled-components');
    sessionStorage.removeItem('emergency-recovery-data');
  }
}

// React hook for emergency recovery integration
export function useEmergencyRecovery(componentName: string) {
  const recovery = EmergencyRecovery.getInstance();

  return {
    isDisabled: recovery.isComponentDisabled(componentName),

    triggerRecovery: (errorType: RecoveryContext['errorType'], additionalData?: any) => {
      const context: RecoveryContext = {
        componentName,
        errorType,
        errorCount: 1,
        affectedComponents: [componentName],
        emergencyData: additionalData,
      };

      return recovery.attemptRecovery(context);
    },

    checkForRecoveredState: () => {
      const restored = sessionStorage.getItem(`emergency-restored-state-${componentName}`);
      if (restored) {
        sessionStorage.removeItem(`emergency-restored-state-${componentName}`);
        return JSON.parse(restored);
      }
      return null;
    },
  };
}

export { EmergencyRecovery, type RecoveryContext, type RecoveryResult, type RecoveryStrategy };