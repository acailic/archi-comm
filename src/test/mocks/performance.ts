// src/test/mocks/performance.ts
import { vi } from 'vitest';

let mockTime = 0;
const mockMarks = new Map<string, number>();
// Comment 8, 33
const mockMeasures = new Map<string, { startTime: number; duration: number; detail?: any }>();

export const enhancedPerformanceMock = {
  now: vi.fn(() => mockTime),
  mark: vi.fn((name: string, options?: PerformanceMarkOptions) => {
    mockMarks.set(name, mockTime);
    return { name, startTime: mockTime, detail: options?.detail, entryType: 'mark' } as any;
  }),
  // Comment 8, 10, 33
  measure: vi.fn((name: string, startOrOptions?: string | PerformanceMeasureOptions, endMark?: string) => {
    let startTime: number | undefined;
    let endTime: number | undefined;

    if (typeof startOrOptions === 'string') {
      startTime = mockMarks.get(startOrOptions);
      if (endMark) {
        endTime = mockMarks.get(endMark);
      }
    } else if (startOrOptions) {
      const options = startOrOptions as any;
      if (typeof options.start === 'string') {
        startTime = mockMarks.get(options.start);
      } else {
        startTime = options.start;
      }
      if (typeof options.end === 'string') {
        endTime = mockMarks.get(options.end);
      } else {
        endTime = options.end;
      }
    }

    const finalStartTime = startTime ?? 0;
    const finalEndTime = endTime ?? mockTime;
    const duration = finalEndTime - finalStartTime;

    mockMeasures.set(name, { startTime: finalStartTime, duration });

    return { name, startTime: finalStartTime, duration, entryType: 'measure' } as any;
  }),
  clearMarks: vi.fn((name?: string) => {
    if (name) mockMarks.delete(name);
    else mockMarks.clear();
  }),
  clearMeasures: vi.fn((name?: string) => {
    if (name) mockMeasures.delete(name);
    else mockMeasures.clear();
  }),
  // Comment 9
  getEntriesByName: vi.fn((name: string) => {
    const entries: any[] = [];
    if (mockMarks.has(name)) {
      entries.push({ name, startTime: mockMarks.get(name), entryType: 'mark' });
    }
    if (mockMeasures.has(name)) {
      const measure = mockMeasures.get(name)!;
      entries.push({ name, startTime: measure.startTime, duration: measure.duration, entryType: 'measure' });
    }
    return entries;
  }),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 5000000,
    jsHeapSizeLimit: 10000000,
  },
  // Test utilities
  advanceTime: (ms: number) => {
    mockTime += ms;
  },
  resetTime: () => {
    mockTime = 0;
    mockMarks.clear();
    mockMeasures.clear();
  },
};

// Comment 20
export function advanceFrame() {
  enhancedPerformanceMock.advanceTime(1000 / 60); // ~16.67ms
  // This is a simplified version. A more complex one would run rAF callbacks.
  // The current rAF mock advances time on its own, so this is mostly for manual control.
}
