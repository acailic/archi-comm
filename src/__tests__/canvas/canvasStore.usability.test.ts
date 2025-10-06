import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import {
  canvasActions,
  useCanvasStore,
  useFilteredComponents,
} from "@/stores/canvasStore";
import type { DesignComponent } from "@/shared/contracts";

const createComponent = (
  id: string,
  overrides: Partial<DesignComponent> = {},
): DesignComponent => ({
  id,
  type: overrides.type ?? "server",
  label: overrides.label ?? `Component ${id}`,
  description: overrides.description,
  x: overrides.x ?? 0,
  y: overrides.y ?? 0,
  width: overrides.width ?? 220,
  height: overrides.height ?? 140,
  groupId: overrides.groupId,
  locked: overrides.locked ?? false,
  properties: overrides.properties ?? {},
});

describe("canvasStore usability actions", () => {
  beforeEach(() => {
    // Reset store and clear any persisted state between tests
    canvasActions.resetCanvas();
    useCanvasStore.setState(
      {
        componentGroups: [],
        selectedComponentIds: [],
        selectionBox: null,
        lastSelectedId: null,
        componentSearchQuery: "",
        componentFilterCategory: null,
        lockedComponentIds: new Set<string>(),
      },
      false,
    );

    if (typeof window !== "undefined") {
      window.localStorage?.clear?.();
    }
  });

  it("duplicates components with offsets and clears grouping metadata", () => {
    const original = createComponent("comp-1", {
      label: "API Gateway",
      x: 100,
      y: 200,
      groupId: "group-1",
      locked: true,
    });

    canvasActions.updateComponents(() => [original]);
    canvasActions.setSelectedComponents(["comp-1"]);

    const { newComponents } = canvasActions.duplicateComponents(["comp-1"]);

    const state = useCanvasStore.getState();
    expect(state.components).toHaveLength(2);

    const duplicateId = newComponents[0]?.id;
    expect(duplicateId).toBeDefined();

    const duplicate = state.components.find((c) => c.id === duplicateId);
    expect(duplicate).toBeDefined();
    expect(duplicate?.x).toBe(original.x + 20);
    expect(duplicate?.y).toBe(original.y + 20);
    expect(duplicate?.groupId).toBeUndefined();
    expect(duplicate?.locked).toBe(false);
    expect(duplicate?.label).toBe(`${original.label} (Copy)`);
  });

  it("aligns and distributes components correctly", () => {
    const a = createComponent("a", {
      x: 10,
      y: 20,
      width: 60,
      height: 40,
    });
    const b = createComponent("b", {
      x: 90,
      y: 90,
      width: 60,
      height: 40,
    });
    const c = createComponent("c", {
      x: 170,
      y: 150,
      width: 60,
      height: 40,
    });

    canvasActions.updateComponents(() => [a, b, c]);

    canvasActions.alignComponents(["a", "b", "c"], "top");
    let state = useCanvasStore.getState();
    const aligned = state.components.filter((component) =>
      ["a", "b", "c"].includes(component.id),
    );

    aligned.forEach((component) => {
      expect(component.y).toBe(20);
    });

    canvasActions.distributeComponents(["a", "b", "c"], "horizontal");
    state = useCanvasStore.getState();

    const afterB = state.components.find((component) => component.id === "b");
    expect(afterB?.x).toBe(70);
  });

  it("creates and dissolves component groups", () => {
    const components = [
      createComponent("g-1", { x: 0, y: 0 }),
      createComponent("g-2", { x: 50, y: 50 }),
    ];

    canvasActions.updateComponents(() => components);

    const group = canvasActions.groupComponents(
      components.map((component) => component.id),
      "Test Group",
    );

    expect(group).not.toBeNull();
    const stateAfterGroup = useCanvasStore.getState();
    expect(stateAfterGroup.componentGroups).toHaveLength(1);
    stateAfterGroup.components
      .filter((component) => component.id.startsWith("g-"))
      .forEach((component) => {
        expect(component.groupId).toBe(group?.id);
      });

    if (group) {
      canvasActions.ungroupComponents(group.id);
    }

    const stateAfterUngroup = useCanvasStore.getState();
    expect(stateAfterUngroup.componentGroups).toHaveLength(0);
    stateAfterUngroup.components
      .filter((component) => component.id.startsWith("g-"))
      .forEach((component) => {
        expect(component.groupId).toBeUndefined();
      });
  });

  it("filters palette components by search query and category", () => {
    const { result } = renderHook(() => useFilteredComponents());
    expect(result.current.length).toBeGreaterThan(0);

    act(() => {
      canvasActions.setComponentSearchQuery("redis");
    });
    expect(
      result.current.every((component) =>
        component.type.toLowerCase().includes("redis") ||
        component.label.toLowerCase().includes("redis") ||
        component.description?.toLowerCase().includes("redis"),
      ),
    ).toBe(true);

    act(() => {
      canvasActions.setComponentSearchQuery("");
      canvasActions.setComponentFilterCategory("messaging");
    });
    expect(
      result.current.every((component) => component.category === "messaging"),
    ).toBe(true);

    act(() => {
      canvasActions.setComponentSearchQuery("api");
      canvasActions.setComponentFilterCategory("apis");
    });
    expect(result.current.length).toBeGreaterThan(0);
    expect(
      result.current.every((component) => {
        const matchesCategory = component.category === "apis";
        const query = component.label.toLowerCase().includes("api") ||
          component.type.toLowerCase().includes("api") ||
          component.description.toLowerCase().includes("api");
        return matchesCategory && query;
      }),
    ).toBe(true);
  });
});
