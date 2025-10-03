/**
 * File: src/packages/ui/components/canvas/CanvasOnboardingTour.tsx
 * Purpose: Integration layer for canvas-specific onboarding tour
 * Why: Decides when to trigger canvas tour and delegates UI to unified OnboardingOverlay
 * Related: OnboardingManager.ts, canvasStore.ts, modules/settings/index.tsx
 */

import { useEffect } from 'react';
import { useCanvasStore } from '../../../../stores/canvasStore';
import { isOnboardingFlowCompleted, markOnboardingFlowCompleted } from '@/modules/settings';
import { useOnboardingStore } from '@/lib/onboarding/OnboardingManager';
import type { OnboardingFlow } from '@/lib/onboarding/OnboardingManager';

// Canvas-specific tour flow definition
const canvasTourFlow: OnboardingFlow = {
  id: 'canvas-tour',
  name: 'Canvas Tour',
  steps: [
    {
      id: 'welcome',
      title: 'Welcome to ArchiComm Canvas! 👋',
      content: 'Let\'s take a quick tour to help you get started with creating architecture diagrams.',
      targetSelector: '',
      placement: 'center',
    },
    {
      id: 'toolbar',
      title: 'Canvas Toolbar',
      content: 'Use the toolbar to switch between different modes: Select, Quick Connect, Pan, and Annotate.',
      targetSelector: '[data-tour="canvas-toolbar"]',
      placement: 'bottom',
    },
    {
      id: 'add-component',
      title: 'Add Components',
      content: 'Click on component types in the sidebar to add them to your canvas. You can drag and position them anywhere.',
      targetSelector: '[data-tour="component-palette"]',
      placement: 'right',
    },
    {
      id: 'select-mode',
      title: 'Select Mode',
      content: 'In Select mode, click components to select them, drag to move them, and right-click for more options.',
      targetSelector: '[data-tour="select-mode-btn"]',
      placement: 'bottom',
    },
    {
      id: 'connections',
      title: 'Create Connections',
      content: 'Drag from the connection handles (circles on component edges) to create connections between components.',
      targetSelector: '.react-flow__handle',
      placement: 'left',
    },
    {
      id: 'quick-connect',
      title: 'Quick Connect Mode',
      content: 'Press Q or click the Quick Connect button, then click two components to connect them quickly.',
      targetSelector: '[data-tour="quick-connect-btn"]',
      placement: 'bottom',
    },
    {
      id: 'properties',
      title: 'Edit Properties',
      content: 'Select a component and use the properties panel to customize its appearance and settings.',
      targetSelector: '[data-tour="properties-panel"]',
      placement: 'left',
    },
    {
      id: 'view-controls',
      title: 'View Controls',
      content: 'Toggle grid, snap-to-grid, and minimap to customize your canvas view.',
      targetSelector: '[data-tour="view-controls"]',
      placement: 'bottom',
    },
    {
      id: 'complete',
      title: 'You\'re Ready! 🎉',
      content: 'That\'s it! Start creating your architecture diagram. You can always press ? to see keyboard shortcuts.',
      targetSelector: '',
      placement: 'center',
    },
  ],
};

export function CanvasOnboardingTour() {
  const tourCompleted = useCanvasStore(state => state.tourCompleted);
  const { registerFlow, startOnboarding } = useOnboardingStore();

  useEffect(() => {
    // Register the canvas tour flow
    registerFlow(canvasTourFlow);

    // Check if canvas tour should be shown
    const shouldShowCanvasTour = !tourCompleted && !isOnboardingFlowCompleted('canvas-tour');

    if (shouldShowCanvasTour) {
      // Delay to allow canvas to render first
      const timer = setTimeout(() => {
        startOnboarding('canvas-tour');
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [registerFlow, startOnboarding, tourCompleted]);

  // Listen for tour completion from the onboarding manager
  useEffect(() => {
    const unsubscribe = useOnboardingStore.subscribe((state) => {
      // If canvas tour was just completed
      if (
        !state.isActive &&
        state.currentFlow?.id === 'canvas-tour' &&
        isOnboardingFlowCompleted('canvas-tour')
      ) {
        // Mark tour as completed in canvas store
        useCanvasStore.getState().markTourCompleted();
      }
    });

    return unsubscribe;
  }, []);

  // This component doesn't render anything - OnboardingOverlay handles the UI
  return null;
}
