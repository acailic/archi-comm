import { BehaviorSubject, Observable } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import type { DesignData, Challenge, AudioData } from '@/shared/contracts';
import type { ExtendedChallenge } from '@/lib/challenge-config';

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

  constructor(initial: AppState = initialState) {
    this.subject = new BehaviorSubject<AppState>(initial);
  }

  // Basic accessors
  getState = (): AppState => this.subject.getValue();
  asObservable = (): Observable<AppState> => this.subject.asObservable();

  // Subscribe bridge for useSyncExternalStore
  subscribe = (listener: () => void): (() => void) => {
    const sub = this.subject.subscribe(() => listener());
    return () => sub.unsubscribe();
  };

  // Immutable update
  private update = (next: Partial<AppState> | StateUpdater) => {
    const prev = this.subject.getValue();
    const value = typeof next === 'function' ? (next as StateUpdater)(Object.freeze(prev)) : { ...prev, ...next };
    this.subject.next(value);
  };

  // Selectors
  select = <T>(selector: (state: AppState) => T, compare?: (a: T, b: T) => boolean): Observable<T> => {
    const cmp = compare ?? ((a, b) => Object.is(a, b));
    return this.subject.pipe(map(selector), distinctUntilChanged(cmp));
  };

  // Actions matching AppContainer state fields
  setSelectedChallenge = (challenge: Challenge | null) =>
    this.update({ selectedChallenge: challenge });

  setDesignData = (data: DesignData) =>
    this.update((prev) => ({ ...prev, designData: data, 
      // keep metadata updated if available
      // avoid mutating input object
      }));

  setAudioData = (data: AudioData | null) =>
    this.update({ audioData: data });

  setPhase = (phase: AppPhase) =>
    this.update({ phase });

  setAvailableChallenges = (list: ExtendedChallenge[]) =>
    this.update({ availableChallenges: list });

  setShowCommandPalette = (isOpen: boolean) =>
    this.update({ showCommandPalette: isOpen });

  setCurrentScreen = (screen: AppScreen) =>
    this.update({ currentScreen: screen });

  setShowDevScenarios = (show: boolean) =>
    this.update({ showDevScenarios: show });

  setIsDemoMode = (demo: boolean) =>
    this.update({ isDemoMode: demo });

  setShowWelcome = (show: boolean) =>
    this.update({ showWelcome: show });

  resetToInitial = () => this.subject.next({ ...initialState, designData: createInitialDesignData() });

  // Convenience actions
  openCommandPalette = () => this.setShowCommandPalette(true);
  closeCommandPalette = () => this.setShowCommandPalette(false);

  // Aggregated actions bag for hooks
  get actions() {
    return {
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
}

export const appStore = new AppStore();

export type AppStoreActions = typeof appStore.actions;

