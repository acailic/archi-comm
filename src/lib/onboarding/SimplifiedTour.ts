// src/lib/onboarding/SimplifiedTour.ts
// Simplified "Just the Basics" tour flow for quick introduction
// Provides essential 3-4 step tour for users who want quick overview
// RELEVANT FILES: OnboardingManager.ts, WelcomeOverlay.tsx

import type { OnboardingFlow } from "./OnboardingManager";

export const simplifiedTourFlow: OnboardingFlow = {
  id: "simplified-tour",
  name: "Just the Basics",
  steps: [
    {
      id: "welcome",
      title: "Welcome to ArchiComm!",
      content:
        "ArchiComm helps you practice architectural design and communication. Let's cover the essentials.",
      targetSelector: "",
      placement: "center",
    },
    {
      id: "canvas-intro",
      title: "Design Canvas",
      content:
        "This is where you create architecture diagrams. Add components from the sidebar and connect them.",
      targetSelector: '[data-testid="design-canvas"]',
      placement: "center",
    },
    {
      id: "component-palette",
      title: "Add Components",
      content:
        "Click components here to add them to your canvas. Drag to position them.",
      targetSelector: '[data-testid="component-palette"]',
      placement: "right",
    },
    // New quick-add onboarding step — inserted after component palette
    {
      id: "quick-add-intro",
      title: "Quick Add Components",
      content:
        "Press / or click the Quick Add button to rapidly add components without dragging. Try it now!",
      // Target the Quick Add button in the toolbar — testid used by toolbar button
      targetSelector:
        '[data-testid="toolbar-quick-add"], [data-testid="quick-add-button"]',
      placement: "bottom",
      // Mark as optional/skippable so users can skip this step
      optional: true,
      skippable: true,
      // Instruct OnboardingManager to show a highlight/tooltip for this step.
      // "onShowEvent" is a convention used by the manager to trigger UI behaviors.
      onShowEvent: "onboarding:highlight-quick-add-button",
      // Ensure this step is only shown once per user by keying it in localStorage.
      // OnboardingManager should check this key and persist when completed/ dismissed.
      onceKey: "onboarding:quick-add-intro:seen",
    },
    // Connection handles onboarding step
    {
      id: "connection-handles",
      title: "Drag to Connect",
      content:
        "Hover over any component to see connection handles. Drag from a handle to another component to create connections.",
      // Target the first component node on the canvas; fallback to any node selector.
      targetSelector:
        '[data-testid="design-canvas"] .react-flow__node:first-of-type, .react-flow__node',
      placement: "right",
      optional: true,
      skippable: true,
      // Ask the manager to pulse/highlight connection handles for the targeted node.
      onShowEvent: "onboarding:highlight-connection-handles",
      // This step should only appear once per user.
      onceKey: "onboarding:connection-handles:seen",
      // Provide a hint to the manager that it should animate handles (pulse) while visible.
      metadata: {
        highlightHandles: true,
        handlePulseCount: 3,
        tooltip: "Drag from a handle to connect components",
      },
    },
    // Architecture patterns / presets onboarding step
    {
      id: "architecture-patterns",
      title: "Architecture Patterns",
      content:
        "Use pre-built patterns to quickly scaffold common architectures. Find them in the Patterns panel.",
      targetSelector:
        '[data-testid="patterns-panel"], [data-testid="component-presets-panel"], [data-testid="right-sidebar-patterns"]',
      placement: "left",
      optional: true,
      skippable: true,
      // When shown, request the manager to open the patterns panel and highlight the first preset.
      onShowEvent: "onboarding:open-and-highlight-patterns",
      onceKey: "onboarding:architecture-patterns:seen",
      metadata: {
        openPanel: true,
        highlightPresetIndex: 0,
      },
    },
    {
      id: "complete",
      title: "You're Ready!",
      content:
        "That's all you need to get started. Press Ctrl/⌘+K anytime for help or to access more tutorials.",
      targetSelector: "",
      placement: "center",
    },
  ],
};
