import { BehaviorSubject, Observable } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import type { DesignData, Challenge, AudioData } from '@/shared/contracts';
import type { ExtendedChallenge } from '@/lib/config/challenge-config';
import { deepEqual } from './canvasStore';
import { InfiniteLoopDetector } from '@/lib/performance/InfiniteLoopDetector';

export type AppPhase = 'design' | 'audio-recording' | 'review';
export type AppScreen = 'welcome' | 'challenge-selection' | 'design-canvas' | 'audio-recording' | 'review';

export interface AppState {
  selectedChallenge: Challenge | null;
  designData: DesignData;
  audioData: AudioData | null;
  phase: AppPhase;
  availableChallenges: ExtendedChallenge[];
  showCommandPalette: boolean;
  currentScreen: AppScreen;
  showDevScenarios: boolean;
  isDemoMode: boolean;
  showWelcome: boolean;
}

function createInitialDesignData(): DesignData {
  const now = new Date().toISOString();
  return {
    components: [],
    connections: [],
    layers: [],
    metadata: { created: now, lastModified: now, version: '1.0' },
  };
}

const initialState: AppState = {
  selectedChallenge: null,
  designData: createInitialDesignData(),
  audioData: null,
  phase: 'design',
  availableChallenges: [],
  showCommandPalette: false,
  currentScreen: 'welcome',
  showDevScenarios: false,
  isDemoMode: false,
  showWelcome: true,
};

type StateUpdater = (prev: Readonly<AppState>) => AppState;

export class AppStore {
  private subject: BehaviorSubject<AppState>;
  private actionCallCounts = new Map<string, number>();
  private lastActionTime = new Map<string, number>();
  private loopDetector: InfiniteLoopDetector;
  private actionsRef: AppStoreActions | null = null;

  constructor(initial: AppState = initialState) {
    this.subject = new BehaviorSubject<AppState>(initial);
    this.loopDetector = InfiniteLoopDetector.getInstance();

    if (import.meta.env.DEV) {
      console.debug('[AppStore] Initialized with state:', initial);
    }
  }

  // Basic accessors
  getState = (): AppState => this.subject.getValue();
  asObservable = (): Observable<AppState> => this.subject.asObservable();

  // Subscribe bridge for useSyncExternalStore
  subscribe = (listener: () => void): (() => void) => {
    const sub = this.subject.subscribe(() => listener());
    return () => sub.unsubscribe();
  };

  // Immutable update with loop detection
  private update = (next: Partial<AppState> | StateUpdater, actionName?: string) => {
    if (actionName) {
      this.trackActionCall(actionName);
    }

    const prev = this.subject.getValue();
    let value: AppState;

    try {
      value = typeof next === 'function' ? (next as StateUpdater)(Object.freeze(prev)) : { ...prev, ...next };
    } catch (error) {
      console.error('[AppStore] Error during state update:', error);
      if (import.meta.env.DEV) {
        console.error('Previous state:', prev);
        console.error('Update payload:', next);
      }
      return; // Don't update state if there's an error
    }

    // Verify state actually changed
    if (deepEqual(prev, value)) {
      if (import.meta.env.DEV && actionName) {
        console.debug(`[AppStore] ${actionName}: State unchanged, skipping update`);
      }
      return;
    }

    this.subject.next(value);

    if (import.meta.env.DEV && actionName) {
      console.debug(`[AppStore] ${actionName}: State updated successfully`);
    }
  };

  // Track action call frequency to detect potential infinite loops
  private trackActionCall = (actionName: string) => {
    const now = Date.now();
    const lastTime = this.lastActionTime.get(actionName) || 0;
    const callCount = this.actionCallCounts.get(actionName) || 0;

    this.lastActionTime.set(actionName, now);
    this.actionCallCounts.set(actionName, callCount + 1);

    // Reset counter if enough time has passed
    if (now - lastTime > 1000) {
      this.actionCallCounts.set(actionName, 1);
    }

    // Warn if action called too frequently
    const currentCount = this.actionCallCounts.get(actionName) || 0;
    if (currentCount > 10 && now - lastTime < 1000) {
      console.warn(`[AppStore] Action '${actionName}' called ${currentCount} times in 1 second - potential infinite loop`);
      this.loopDetector.notifyActionLoop(actionName, currentCount);
    }
  };

  // Selectors
  select = <T>(selector: (state: AppState) => T, compare?: (a: T, b: T) => boolean): Observable<T> => {
    const cmp = compare ?? ((a, b) => Object.is(a, b));
    return this.subject.pipe(map(selector), distinctUntilChanged(cmp));
  };

  // Actions matching AppContainer state fields
  setSelectedChallenge = (challenge: Challenge | null) => {
    const prev = this.subject.getValue();
    if (prev.selectedChallenge === challenge) {
      if (import.meta.env.DEV) {
        console.debug('[AppStore] setSelectedChallenge: Same challenge, skipping update');
      }
      return;
    }
    this.update({ selectedChallenge: challenge }, 'setSelectedChallenge');
  };

  setDesignData = (data: DesignData) => {
    const prev = this.subject.getValue();

    // Deep equality check to prevent unnecessary updates when data is identical
    if (deepEqual(prev.designData, data)) {
      if (import.meta.env.DEV) {
        console.debug('[AppStore] setDesignData: Data is identical, skipping update to prevent infinite loop', {
          action: 'setDesignData',
          reason: 'equality-check-prevented-update',
          dataKeys: Object.keys(data),
        });
      }
      return;
    }

    if (import.meta.env.DEV) {
      console.debug('[AppStore] setDesignData: Applying update due to data difference', {
        action: 'setDesignData',
        reason: 'data-changed',
        dataKeys: Object.keys(data),
      });
    }

    this.update((prevState) => ({
      ...prevState,
      designData: data,
      // keep metadata updated if available
      // avoid mutating input object
    }));
  };

  setAudioData = (data: AudioData | null) => {
    const prev = this.subject.getValue();
    if (deepEqual(prev.audioData, data)) {
      if (import.meta.env.DEV) {
        console.debug('[AppStore] setAudioData: Same data, skipping update');
      }
      return;
    }
    this.update({ audioData: data }, 'setAudioData');
  };

  setPhase = (phase: AppPhase) => {
    const prev = this.subject.getValue();
    if (prev.phase === phase) {
      if (import.meta.env.DEV) {
        console.debug('[AppStore] setPhase: Same phase, skipping update');
      }
      return;
    }
    this.update({ phase }, 'setPhase');
  };

  setAvailableChallenges = (list: ExtendedChallenge[]) => {
    const prev = this.subject.getValue();
    if (deepEqual(prev.availableChallenges, list)) {
      if (import.meta.env.DEV) {
        console.debug('[AppStore] setAvailableChallenges: Same list, skipping update');
      }
      return;
    }
    this.update({ availableChallenges: list }, 'setAvailableChallenges');
  };

  setShowCommandPalette = (isOpen: boolean) => {
    const prev = this.subject.getValue();
    if (prev.showCommandPalette === isOpen) {
      if (import.meta.env.DEV) {
        console.debug('[AppStore] setShowCommandPalette: Same value, skipping update');
      }
      return;
    }
    this.update({ showCommandPalette: isOpen }, 'setShowCommandPalette');
  };

  setCurrentScreen = (screen: AppScreen) => {
    const prev = this.subject.getValue();
    if (prev.currentScreen === screen) {
      if (import.meta.env.DEV) {
        console.debug('[AppStore] setCurrentScreen: Same screen, skipping update');
      }
      return;
    }
    this.update({ currentScreen: screen }, 'setCurrentScreen');
  };

  setShowDevScenarios = (show: boolean) => {
    const prev = this.subject.getValue();
    if (prev.showDevScenarios === show) {
      if (import.meta.env.DEV) {
        console.debug('[AppStore] setShowDevScenarios: Same value, skipping update');
      }
      return;
    }
    this.update({ showDevScenarios: show }, 'setShowDevScenarios');
  };

  setIsDemoMode = (demo: boolean) => {
    const prev = this.subject.getValue();
    if (prev.isDemoMode === demo) {
      if (import.meta.env.DEV) {
        console.debug('[AppStore] setIsDemoMode: Same value, skipping update');
      }
      return;
    }
    this.update({ isDemoMode: demo }, 'setIsDemoMode');
  };

  setShowWelcome = (show: boolean) => {
    const prev = this.subject.getValue();
    if (prev.showWelcome === show) {
      if (import.meta.env.DEV) {
        console.debug('[AppStore] setShowWelcome: Same value, skipping update');
      }
      return;
    }
    this.update({ showWelcome: show }, 'setShowWelcome');
  };

  resetToInitial = () => {
    if (import.meta.env.DEV) {
      console.debug('[AppStore] resetToInitial: Resetting to initial state');
    }
    this.subject.next({ ...initialState, designData: createInitialDesignData() });
    // Reset action tracking
    this.actionCallCounts.clear();
    this.lastActionTime.clear();
  };

  // Convenience actions
  openCommandPalette = () => this.setShowCommandPalette(true);
  closeCommandPalette = () => this.setShowCommandPalette(false);

  // Aggregated actions bag for hooks - ensure stability
  get actions() {
    if (!this.actionsRef) {
      this.actionsRef = {
        setSelectedChallenge: this.setSelectedChallenge,
        setDesignData: this.setDesignData,
        setAudioData: this.setAudioData,
        setPhase: this.setPhase,
        setAvailableChallenges: this.setAvailableChallenges,
        setShowCommandPalette: this.setShowCommandPalette,
        setCurrentScreen: this.setCurrentScreen,
        setShowDevScenarios: this.setShowDevScenarios,
        setIsDemoMode: this.setIsDemoMode,
        setShowWelcome: this.setShowWelcome,
        resetToInitial: this.resetToInitial,
        openCommandPalette: this.openCommandPalette,
        closeCommandPalette: this.closeCommandPalette,
      } as const;
    }
    return this.actionsRef;
  }

  // Debug method to get action call statistics
  getActionStats = () => {
    if (import.meta.env.DEV) {
      return {
        actionCallCounts: Object.fromEntries(this.actionCallCounts),
        lastActionTime: Object.fromEntries(this.lastActionTime),
      };
    }
    return null;
  };
}

export const appStore = new AppStore();

export type AppStoreActions = typeof appStore.actions;
