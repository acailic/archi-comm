import React from 'react';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ReactProfilerIntegration from '@/lib/performance/ReactProfilerIntegration';
import { performanceMonitor } from '@/shared/utils/performanceMonitor';
import { ComponentOptimizer } from '@/lib/performance/ComponentOptimizer';

describe('ReactProfilerIntegration', () => {
  let recordSampleSpy: ReturnType<typeof vi.fn>;
  let recordRenderSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset singleton between tests
    // @ts-expect-error – accessing private field for test isolation
    ReactProfilerIntegration.instance = null;

    recordSampleSpy = vi.fn();
    vi.spyOn(ComponentOptimizer, 'getInstance').mockReturnValue({
      recordSample: recordSampleSpy,
      getMetrics: vi.fn().mockReturnValue({ renderCount: 0, slowRenderCount: 0 }),
    } as unknown as ComponentOptimizer);

    recordRenderSpy = vi
      .spyOn(performanceMonitor, 'recordComponentRender')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('captures shallow prop changes in profiler samples', () => {
    const integration = ReactProfilerIntegration.getInstance();

    const TestComponent: React.FC<{ value: number }> = ({ value }) => <div>{value}</div>;

    const ProfiledComponent = integration.wrapWithProfiler(TestComponent, {
      id: 'TestComponent',
      trackingEnabled: true,
    });

    const { rerender } = render(<ProfiledComponent value={1} />);
    rerender(<ProfiledComponent value={2} />);

    const samples = recordSampleSpy.mock.calls.map(call => call[0]);
    const updateSample = samples.find(sample => sample.commitType === 'update');

    expect(updateSample).toBeDefined();
    expect(updateSample?.propsChanged).toContain('value');
    expect(recordRenderSpy).toHaveBeenCalled();
  });

  it('tracks prop snapshots without reporting unchanged keys', () => {
    const integration = ReactProfilerIntegration.getInstance();

    const capture = integration as unknown as {
      recordPropsSnapshot: (componentId: string, props: Record<string, unknown>) => void;
      consumePropChanges: (componentId: string) => string[];
    };

    capture.recordPropsSnapshot('SnapshotComponent', { alpha: 1, beta: 'a' });
    expect(capture.consumePropChanges('SnapshotComponent')).toEqual(['alpha', 'beta']);

    capture.recordPropsSnapshot('SnapshotComponent', { alpha: 1, beta: 'a' });
    expect(capture.consumePropChanges('SnapshotComponent')).toEqual([]);
  });
});
