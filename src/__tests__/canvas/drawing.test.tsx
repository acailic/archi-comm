/**
 * File: src/__tests__/canvas/drawing.test.tsx
 * Purpose: Comprehensive tests for the drawing functionality
 * Why: Ensure drawing features work correctly across components and utilities
 * Related: DrawingOverlay.tsx, DrawingToolbar.tsx, drawing-utils.ts, canvasStore.ts
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildStrokeSegmentIndex,
  deserializeStrokes,
  getStrokeOutline,
  getSvgPathFromStroke,
  isPointNearStroke,
  pointsToStroke,
  pointerEventToFlowPosition,
  queryStrokeSegmentIndex,
  screenToFlowPosition,
  serializeStrokes,
} from "../../lib/canvas/drawing-utils";
import * as drawingUtils from "../../lib/canvas/drawing-utils";
import { DrawingOverlay } from "../../packages/ui/components/canvas/DrawingOverlay";
import { DrawingToolbar } from "../../packages/ui/components/canvas/DrawingToolbar";
import type { DrawingSettings, DrawingStroke } from "../../shared/contracts";

// Mock React Flow
vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({
    screenToFlowPosition: vi.fn((pos: { x: number; y: number }) => pos),
    flowToScreenPosition: vi.fn((pos: { x: number; y: number }) => pos),
  }),
}));

// Mock perfect-freehand
vi.mock("perfect-freehand", () => ({
  getStroke: vi.fn((points: number[][], options?: any) => {
    // Simple mock that returns a rectangle around the points
    if (!points.length) return [];
    const minX = Math.min(...points.map((p) => p[0]));
    const maxX = Math.max(...points.map((p) => p[0]));
    const minY = Math.min(...points.map((p) => p[1]));
    const maxY = Math.max(...points.map((p) => p[1]));
    return [
      [minX, minY],
      [maxX, minY],
      [maxX, maxY],
      [minX, maxY],
    ];
  }),
}));

// Test data
const mockStroke: DrawingStroke = {
  id: "test-stroke-1",
  points: [
    [10, 10],
    [20, 20],
    [30, 15],
  ],
  color: "#000000",
  size: 4,
  timestamp: Date.now(),
  visible: true,
  zIndex: 0,
  tool: "pen",
};

const mockSettings: DrawingSettings = {
  color: "#000000",
  size: 4,
  tool: "pen",
  smoothing: 0.5,
  thinning: 0.5,
  streamline: 0.5,
};

describe("Drawing Utilities", () => {
  describe("getStrokeOutline", () => {
    it("should return stroke outline points", () => {
      const points = [
        [10, 10],
        [20, 20],
        [30, 15],
      ];
      const outline = getStrokeOutline(points, { size: 4 });

      expect(Array.isArray(outline)).toBe(true);
      expect(outline.length).toBeGreaterThan(0);
    });

    it("should handle empty points array", () => {
      const outline = getStrokeOutline([]);
      expect(outline).toEqual([]);
    });
  });

  describe("getSvgPathFromStroke", () => {
    it("should convert stroke points to SVG path", () => {
      const points = [
        [10, 10],
        [20, 20],
        [30, 15],
        [40, 25],
      ];
      const path = getSvgPathFromStroke(points);

      expect(typeof path).toBe("string");
      expect(path).toMatch(/^M/); // Should start with M (move to)
      expect(path).toMatch(/Z$/); // Should end with Z (close path)
    });

    it("should return empty string for empty points", () => {
      const path = getSvgPathFromStroke([]);
      expect(path).toBe("");
    });
  });

  describe("pointsToStroke", () => {
    it("should create a DrawingStroke object", () => {
      const points = [
        [10, 10],
        [20, 20],
      ];
      const stroke = pointsToStroke(points, "#ff0000", 6, {
        author: "test-author",
      });

      expect(stroke).toHaveProperty("id");
      expect(stroke.points).toBe(points);
      expect(stroke.color).toBe("#ff0000");
      expect(stroke.size).toBe(6);
      expect(stroke.author).toBe("test-author");
      expect(stroke.visible).toBe(true);
      expect(typeof stroke.timestamp).toBe("number");
    });

    it("should generate unique IDs", () => {
      const points = [
        [10, 10],
        [20, 20],
      ];
      const stroke1 = pointsToStroke(points, "#000", 4);
      const stroke2 = pointsToStroke(points, "#000", 4);

      expect(stroke1.id).not.toBe(stroke2.id);
    });
  });

  describe("isPointNearStroke", () => {
    const stroke = mockStroke;

    it("should detect point near stroke", () => {
      const point: [number, number] = [15, 15]; // Near the stroke path
      const isNear = isPointNearStroke(point, stroke, 10);

      expect(isNear).toBe(true);
    });

    it("should not detect distant points", () => {
      const point: [number, number] = [100, 100]; // Far from stroke
      const isNear = isPointNearStroke(point, stroke, 5);

      expect(isNear).toBe(false);
    });
  });

  describe("screenToFlowPosition", () => {
    it("should transform coordinates using React Flow instance", () => {
      const mockInstance = {
        screenToFlowPosition: vi.fn().mockReturnValue({ x: 50, y: 60 }),
      };

      const [x, y] = screenToFlowPosition(100, 120, mockInstance);

      expect(mockInstance.screenToFlowPosition).toHaveBeenCalledWith({
        x: 100,
        y: 120,
      });
      expect(x).toBe(50);
      expect(y).toBe(60);
    });

    it("should return original coordinates when no instance", () => {
      const [x, y] = screenToFlowPosition(100, 120, null);

      expect(x).toBe(100);
      expect(y).toBe(120);
    });
  });

  describe("pointerEventToFlowPosition", () => {
    it("should delegate to React Flow when available", () => {
      const mockInstance = {
        screenToFlowPosition: vi.fn().mockReturnValue({ x: 25, y: 30 }),
      };

      const event = { clientX: 10, clientY: 15 } as PointerEvent;
      const [x, y] = pointerEventToFlowPosition(event, mockInstance);

      expect(mockInstance.screenToFlowPosition).toHaveBeenCalledWith({
        x: 10,
        y: 15,
      });
      expect(x).toBe(25);
      expect(y).toBe(30);
    });

    it("should fall back to client coordinates when instance missing", () => {
      const event = { clientX: 42, clientY: 84 } as PointerEvent;
      const [x, y] = pointerEventToFlowPosition(event, null);

      expect(x).toBe(42);
      expect(y).toBe(84);
    });
  });

  describe("buildStrokeSegmentIndex", () => {
    it("should index stroke segments and query hits", () => {
      const strokes: DrawingStroke[] = [
        mockStroke,
        {
          ...mockStroke,
          id: "second",
          points: [
            [100, 100],
            [120, 120],
          ],
        },
      ];

      const index = buildStrokeSegmentIndex(strokes, 2);
      expect(index).not.toBeNull();

      const hitsNearFirst = queryStrokeSegmentIndex(index, 15, 15, 2);
      expect(hitsNearFirst).toContain(mockStroke.id);
      expect(hitsNearFirst).not.toContain("second");

      const hitsNearSecond = queryStrokeSegmentIndex(index, 110, 110, 2);
      expect(hitsNearSecond).toContain("second");
    });
  });

  describe("serializeStrokes and deserializeStrokes", () => {
    it("should serialize and deserialize strokes", () => {
      const strokes = [mockStroke];
      const serialized = serializeStrokes(strokes);
      const deserialized = deserializeStrokes(serialized);

      expect(deserialized).toHaveLength(1);
      expect(deserialized[0]).toMatchObject({
        id: mockStroke.id,
        points: mockStroke.points,
        color: mockStroke.color,
        size: mockStroke.size,
      });
    });

    it("should handle empty arrays", () => {
      const serialized = serializeStrokes([]);
      const deserialized = deserializeStrokes(serialized);

      expect(deserialized).toEqual([]);
    });

    it("should handle invalid JSON", () => {
      const deserialized = deserializeStrokes("invalid json");
      expect(deserialized).toEqual([]);
    });

    it("should filter invalid strokes", () => {
      const invalidData = JSON.stringify([
        mockStroke,
        { invalid: "stroke" }, // Missing required fields
        null,
      ]);

      const deserialized = deserializeStrokes(invalidData);
      expect(deserialized).toHaveLength(1);
      expect(deserialized[0].id).toBe(mockStroke.id);
    });
  });
});

describe("DrawingToolbar Component", () => {
  const defaultProps = {
    selectedTool: "pen" as const,
    onToolSelect: vi.fn(),
    color: "#000000",
    onColorChange: vi.fn(),
    size: 4,
    onSizeChange: vi.fn(),
    strokeCount: 5,
    onClearAll: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render all tool buttons", () => {
    render(<DrawingToolbar {...defaultProps} />);

    expect(screen.getByLabelText(/pen/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/eraser/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/highlighter/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/exit drawing/i)).toBeInTheDocument();
  });

  it("should highlight active tool", () => {
    render(<DrawingToolbar {...defaultProps} selectedTool="eraser" />);

    const eraserButton = screen.getByLabelText(/eraser/i);
    expect(eraserButton).toHaveClass("bg-blue-500");
  });

  it("should call onToolSelect when tool is clicked", () => {
    const onToolSelect = vi.fn();
    render(<DrawingToolbar {...defaultProps} onToolSelect={onToolSelect} />);

    const eraserButton = screen.getByLabelText(/eraser/i);
    fireEvent.click(eraserButton);

    expect(onToolSelect).toHaveBeenCalledWith("eraser");
  });

  it("should show stroke count badge", () => {
    render(<DrawingToolbar {...defaultProps} strokeCount={3} />);

    expect(screen.getByText("3 strokes")).toBeInTheDocument();
  });

  it("should disable clear button when no strokes", () => {
    render(<DrawingToolbar {...defaultProps} strokeCount={0} />);

    const clearButton = screen.getByLabelText(/clear all/i);
    expect(clearButton).toBeDisabled();
  });

  it("should show clear confirmation dialog", async () => {
    const onClearAll = vi.fn();
    render(
      <DrawingToolbar
        {...defaultProps}
        strokeCount={3}
        onClearAll={onClearAll}
      />,
    );

    const clearButton = screen.getByLabelText(/clear all/i);
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(screen.getByText(/clear all drawings/i)).toBeInTheDocument();
    });
  });
});

describe("DrawingOverlay Component", () => {
  const defaultProps = {
    strokes: [mockStroke],
    currentTool: "pen" as const,
    color: "#000000",
    size: 4,
    settings: mockSettings,
    onStrokeComplete: vi.fn(),
    onStrokeDelete: vi.fn(),
    enabled: true,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render SVG overlay when enabled", () => {
    const { container } = render(<DrawingOverlay {...defaultProps} />);

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("should not render when disabled", () => {
    const { container } = render(
      <DrawingOverlay {...defaultProps} enabled={false} />,
    );

    const svg = container.querySelector("svg");
    expect(svg).not.toBeInTheDocument();
  });

  it("should not render when no tool selected", () => {
    const { container } = render(
      <DrawingOverlay {...defaultProps} currentTool={null} />,
    );

    const svg = container.querySelector("svg");
    expect(svg).not.toBeInTheDocument();
  });

  it("should render existing strokes as paths", () => {
    const { container } = render(<DrawingOverlay {...defaultProps} />);

    const paths = container.querySelectorAll("path");
    expect(paths).toHaveLength(1);
  });

  it("should render without strokes", () => {
    const { container } = render(
      <DrawingOverlay {...defaultProps} strokes={[]} />,
    );

    const paths = container.querySelectorAll("path");
    expect(paths).toHaveLength(0);
  });

  it("should handle pointer events for drawing", async () => {
    const onStrokeComplete = vi.fn();
    const pointerSpy = vi.spyOn(
      drawingUtils,
      "pointerEventToFlowPosition",
    );

    const { container } = render(
      <DrawingOverlay {...defaultProps} onStrokeComplete={onStrokeComplete} />,
    );

    const svg = container.querySelector("svg")!;

    fireEvent.pointerDown(svg, {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
      pressure: 0.7,
    });
    fireEvent.pointerMove(svg, {
      clientX: 20,
      clientY: 20,
      pointerId: 1,
      pressure: 0.5,
    });
    fireEvent.pointerUp(svg, { pointerId: 1 });

    expect(pointerSpy).toHaveBeenCalled();

    await waitFor(() => {
      expect(onStrokeComplete).toHaveBeenCalledTimes(1);
    });

    const stroke = onStrokeComplete.mock.calls[0][0];
    expect(stroke.tool).toBe("pen");
    expect(stroke.color).toBe("#000000");
    expect(stroke.points[0][2]).toBeCloseTo(0.7);
  });

  it("should handle eraser mode", () => {
    const onStrokeDelete = vi.fn();
    const { container } = render(
      <DrawingOverlay
        {...defaultProps}
        currentTool="eraser"
        onStrokeDelete={onStrokeDelete}
      />,
    );

    const path = container.querySelector("path")!;
    fireEvent.click(path);

    expect(onStrokeDelete).toHaveBeenCalledWith(mockStroke.id);
  });

  it("should render highlighter strokes with reduced opacity", () => {
    const highlighterStroke: DrawingStroke = {
      ...mockStroke,
      id: "highlighter",
      tool: "highlighter",
      color: "#ffaa00",
    };

    const { container } = render(
      <DrawingOverlay {...defaultProps} strokes={[highlighterStroke]} />,
    );

    const path = container.querySelector("path")!;
    expect(path).toHaveAttribute("fill-opacity", "0.5");
  });
});
