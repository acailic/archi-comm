import { useOnboardingStore } from '../../lib/onboarding/OnboardingManager';
import { loadSettings } from '../settings';
import type {
  OnboardingFlow,
  OnboardingStep,
} from '../../lib/onboarding/OnboardingManager';

export { WelcomeOverlay } from '@ui/components/overlays/WelcomeOverlay';

// Basic Onboarding Components
export { useOnboarding, useOnboardingStore } from '../../lib/onboarding/OnboardingManager';
export { default as OnboardingOverlay } from '@ui/components/overlays/OnboardingOverlay';

// Onboarding Flow Types
export type { OnboardingState } from '../../lib/onboarding/OnboardingManager';

// Basic Flow Utilities
export const createOnboardingStep = (
  id: string,
  title: string,
  content: string,
  targetSelector: string,
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center' = 'bottom'
): OnboardingStep => ({
  id,
  title,
  content,
  targetSelector,
  placement,
});

export const createOnboardingFlow = (
  id: string,
  name: string,
  steps: OnboardingStep[]
): OnboardingFlow => ({
  id,
  name,
  steps,
});

// ---------------------------------------------------------------------------
// Guided tour flow & progressive tips infrastructure
// ---------------------------------------------------------------------------

interface ProgressiveTipDefinition {
  id: string;
  step: OnboardingStep;
  once?: boolean;
  condition?: () => boolean;
  cooldownMs?: number;
}

interface ProgressiveTip extends ProgressiveTipDefinition {
  flow: OnboardingFlow;
}

const GUIDED_TOUR_FLOW_ID = 'guided-tour';
const PROGRESSIVE_TIP_PREFIX = 'progressive-tip-';
const PROGRESSIVE_TIP_STORAGE_KEY = 'archicomm_progressive_tips_v1';

const guidedTourFlow = createOnboardingFlow(GUIDED_TOUR_FLOW_ID, 'Interactive Guided Tour', [
  createOnboardingStep(
    'guided-intro',
    'Welcome to ArchiComm',
    'Let’s take a quick tour of the workspace so you know where everything lives.',
    'center',
    'center'
  ),
  createOnboardingStep(
    'guided-canvas',
    'Design Canvas',
    'This canvas is where you drag components, connect systems, and bring architectures to life.',
    '[data-testid="design-canvas"]',
    'center'
  ),
  createOnboardingStep(
    'guided-components',
    'Component Library',
    'Use the component library to add services, databases, and integrations. Search or drag-and-drop to get started quickly.',
    '[data-testid="component-palette"]',
    'right'
  ),
  createOnboardingStep(
    'guided-command-palette',
    'Command Palette',
    'Press Ctrl/⌘+K or use the Search button to access every action, shortcut, and learning resource.',
    'button[aria-label="Open command palette"]',
    'bottom'
  ),
  createOnboardingStep(
    'guided-save',
    'Save & Export',
    'Keep your work safe by saving progress or exporting diagrams for reviews and documentation.',
    'button[aria-label="Save design"]',
    'left'
  ),
  createOnboardingStep(
    'guided-shortcuts',
    'Keyboard Superpowers',
    'Open the shortcut cheat sheet or enter learn mode to master productivity boosters tailored to your workflow.',
    'center',
    'center'
  ),
  createOnboardingStep(
    'guided-finish',
    'You are ready to build',
    'That’s the tour! Start a challenge, design your architecture, and iterate with confidence.',
    'center',
    'center'
  ),
]);

const progressiveTipDefinitions: ProgressiveTipDefinition[] = [
  {
    id: 'command-palette-shortcut',
    step: createOnboardingStep(
      'tip-command-palette',
      'Need something? Press Ctrl/⌘ + K',
      'The command palette gives you fuzzy search across navigation, actions, and learning tools. Try typing "tour" or "shortcut".',
      'button[aria-label="Open command palette"]',
      'bottom'
    ),
    once: true,
    cooldownMs: 0,
  },
  {
    id: 'shortcut-learn-mode',
    step: createOnboardingStep(
      'tip-shortcut-learn-mode',
      'Train keyboard shortcuts interactively',
      'Toggle the inline cheat sheet or enter learn mode to practice shortcuts with gentle spaced repetition.',
      'center',
      'center'
    ),
    once: true,
    cooldownMs: 120000,
  },
  {
    id: 'progressive-review',
    step: createOnboardingStep(
      'tip-review-phase',
      'Review your architecture narrative',
      'After recording, head to the Review stage to get structured feedback and surface improvement areas.',
      'center',
      'center'
    ),
    once: true,
    cooldownMs: 180000,
  },
  {
    id: 'progressive-save-reminder',
    step: createOnboardingStep(
      'tip-save-reminder',
      'Save early, iterate often',
      'Keep your work safe with quick saves. The command palette has save, export, and restore actions ready to go.',
      'button[aria-label="Save design"]',
      'left'
    ),
    once: false,
    cooldownMs: 240000,
  },
];

class ProgressiveTipManager {
  private readonly tips: ProgressiveTip[];
  private readonly seenTips: Set<string> = new Set();
  private lastShownAt = 0;

  constructor(definitions: ProgressiveTipDefinition[]) {
    this.tips = definitions.map(definition => ({
      ...definition,
      flow: createOnboardingFlow(`${PROGRESSIVE_TIP_PREFIX}${definition.id}`, definition.step.title, [definition.step]),
    }));

    this.registerTipFlows();
    this.loadSeenTips();
  }

  public showNextTip(force = false): boolean {
    const store = useOnboardingStore.getState();

    if (!force && store.isActive) {
      return false;
    }

    const now = Date.now();
    const nextTip = this.getNextTip(now, force);
    if (!nextTip) {
      return false;
    }

    store.registerFlow(nextTip.flow);
    const started = store.startOnboarding(nextTip.flow.id);
    if (!started) {
      return false;
    }

    this.lastShownAt = now;
    this.markSeen(nextTip.id);
    return true;
  }

  public reset(): void {
    this.seenTips.clear();
    this.lastShownAt = 0;
    this.saveSeenTips();
  }

  private getNextTip(now: number, force: boolean): ProgressiveTip | null {
    return (
      this.tips.find(tip => {
        if (!force && tip.cooldownMs && now - this.lastShownAt < tip.cooldownMs) {
          return false;
        }
        if (tip.once && this.seenTips.has(tip.id)) {
          return false;
        }
        if (tip.condition && !tip.condition()) {
          return false;
        }
        return true;
      }) ?? null
    );
  }

  private registerTipFlows(): void {
    const store = useOnboardingStore.getState();
    this.tips.forEach(tip => {
      store.registerFlow(tip.flow);
    });
  }

  private markSeen(tipId: string): void {
    this.seenTips.add(tipId);
    this.saveSeenTips();
  }

  private loadSeenTips(): void {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const raw = window.localStorage.getItem(PROGRESSIVE_TIP_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((tipId: unknown) => {
          if (typeof tipId === 'string') {
            this.seenTips.add(tipId);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load progressive onboarding tips state', error);
    }
  }

  private saveSeenTips(): void {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(
        PROGRESSIVE_TIP_STORAGE_KEY,
        JSON.stringify(Array.from(this.seenTips.values()))
      );
    } catch (error) {
      console.warn('Failed to persist progressive onboarding tips state', error);
    }
  }
}

let tipManager: ProgressiveTipManager | null = null;
let hasScheduledInitialTip = false;
let isInitialized = false;

const ensureOnboardingInitialized = () => {
  const store = useOnboardingStore.getState();

  if (!isInitialized) {
    store.registerFlow(guidedTourFlow);
    tipManager = new ProgressiveTipManager(progressiveTipDefinitions);
    isInitialized = true;
  }

  return { store, tipManager: tipManager! };
};

// DISABLED: Auto-trigger of progressive tips
// Progressive tips are now opt-in via settings or command palette
// Uncomment the code below to re-enable auto-triggering
/*
const scheduleInitialProgressiveTip = () => {
  if (hasScheduledInitialTip || typeof window === 'undefined') {
    return;
  }

  // Check if user has enabled progressive tips
  const settings = loadSettings();
  if (!settings.onboarding.enableProgressiveTips) {
    return;
  }

  hasScheduledInitialTip = true;
  window.setTimeout(() => {
    const { tipManager: manager } = ensureOnboardingInitialized();
    manager.showNextTip();
  }, 6000);
};
*/

const handleGuidedTourRequest = (event: Event) => {
  const { store } = ensureOnboardingInitialized();
  const detail = (event as CustomEvent<{ flowId?: string; force?: boolean }>).detail ?? {};
  const flowId = detail.flowId ?? GUIDED_TOUR_FLOW_ID;

  if (!store.startOnboarding(flowId)) {
    console.warn(`Unable to start onboarding flow "${flowId}"`);
  }
};

const handleProgressiveTipRequest = (event: Event) => {
  // Check if user has enabled progressive tips
  const settings = loadSettings();
  if (!settings.onboarding.enableProgressiveTips) {
    console.info('Progressive tips are disabled in settings');
    return;
  }

  const { tipManager: manager } = ensureOnboardingInitialized();
  const detail = (event as CustomEvent<{ force?: boolean }>).detail ?? {};
  manager.showNextTip(detail.force ?? false);
};

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

if (isBrowser) {
  ensureOnboardingInitialized();
  // DISABLED: Auto-trigger is now opt-in
  // scheduleInitialProgressiveTip();
  window.addEventListener('onboarding:start', handleGuidedTourRequest as EventListener);
  window.addEventListener('onboarding:show-next-tip', handleProgressiveTipRequest as EventListener);
}

export const startGuidedTour = (flowId: string = GUIDED_TOUR_FLOW_ID): boolean => {
  const { store } = ensureOnboardingInitialized();
  return store.startOnboarding(flowId);
};

export const showNextOnboardingTip = (options: { force?: boolean } = {}): boolean => {
  const { tipManager: manager } = ensureOnboardingInitialized();
  return manager.showNextTip(options.force ?? false);
};

export const resetProgressiveTips = (): void => {
  const { tipManager: manager } = ensureOnboardingInitialized();
  manager.reset();
};
