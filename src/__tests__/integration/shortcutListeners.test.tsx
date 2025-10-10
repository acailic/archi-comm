import { renderWithAppProviders, resetTestStores } from "../test/react-testing-utils";
import { cleanup } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { shortcutBus } from "@/lib/events/shortcutBus";
import { CanvasToolbar } from "@/packages/ui/components/canvas/CanvasToolbar";
import { UXRecommendationToast } from "@/packages/ui/components/UXRecommendationToast";
import DesignCanvas from "@/packages/ui/components/DesignCanvas";
import type { Challenge, DesignData } from "@/shared/contracts";

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

const createStubChallenge = (): Challenge => ({
  id: "test-challenge",
  title: "Test Challenge",
  description: "A minimal challenge for listener lifecycle tests",
  requirements: [],
  difficulty: "beginner",
  estimatedTime: 5,
  category: "system-design",
});

const createStubDesignData = (): DesignData => ({
  schemaVersion: 1,
  components: [],
  connections: [],
  annotations: [],
  drawings: [],
  infoCards: [],
  layers: [],
  metadata: {},
});

describe("shortcutBus listener lifecycle", () => {
  beforeEach(() => {
    resetTestStores();
  });

  afterEach(() => {
    cleanup();
  });

  const expectNoListenerGrowth = (baseline: number) => {
    expect(shortcutBus.getListenerCount()).toBe(baseline);
  };

  it("does not leak listeners when CanvasToolbar is mounted repeatedly", () => {
    const baseline = shortcutBus.getListenerCount();

    for (let i = 0; i < 3; i += 1) {
      const { unmount } = renderWithAppProviders(<CanvasToolbar />);
      unmount();
      expectNoListenerGrowth(baseline);
    }
  });

  it("cleans up UXRecommendationToast subscriptions on unmount", () => {
    const baseline = shortcutBus.getListenerCount();

    for (let i = 0; i < 3; i += 1) {
      const { unmount } = renderWithAppProviders(<UXRecommendationToast />);
      unmount();
      expectNoListenerGrowth(baseline);
    }
  });

  it("keeps DesignCanvas listener footprint stable across mounts", () => {
    const baseline = shortcutBus.getListenerCount();
    const challenge = createStubChallenge();
    const designData = createStubDesignData();

    for (let i = 0; i < 2; i += 1) {
      const { unmount } = renderWithAppProviders(
        <DesignCanvas
          challenge={challenge}
          initialData={designData}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />,
      );
      unmount();
      expectNoListenerGrowth(baseline);
    }
  });
});
