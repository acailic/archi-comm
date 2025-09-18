import { RenderLoopDiagnostics } from '@/lib/debug/RenderLoopDiagnostics';

interface RenderStabilitySample {
  props: Record<string, unknown>;
  state: Record<string, unknown>;
  metrics: {
    renderCount: number;
    sincePreviousRenderMs: number;
  };
}

export interface RenderStabilityReport {
  warnings: string[];
  unstableProps: string[];
  shouldFreeze: boolean;
  freezeReason?: string;
}

interface StabilityHistoryEntry {
  propsHash: string;
  stateHash: string;
  propSignatures: Record<string, string>;
  stateSignatures: Record<string, string>;
  timestamp: number;
  metrics: RenderStabilitySample['metrics'];
}

const HISTORY_LIMIT = 24;
const RAPID_RENDER_THRESHOLD_MS = 6;
const OSCILLATION_LIMIT = 4;

export class RenderStabilityTracker {
  private static instances = new Map<string, RenderStabilityTracker>();

  static forComponent(componentName: string): RenderStabilityTracker {
    const existing = RenderStabilityTracker.instances.get(componentName);
    if (existing) return existing;
    const tracker = new RenderStabilityTracker(componentName);
    RenderStabilityTracker.instances.set(componentName, tracker);
    return tracker;
  }

  static resetAll() {
    RenderStabilityTracker.instances.clear();
  }

  private constructor(private readonly componentName: string) {}

  private history: StabilityHistoryEntry[] = [];
  private propChangeCounters = new Map<string, number>();

  track(sample: RenderStabilitySample): RenderStabilityReport {
    const timestamp = Date.now();
    const propSignatures = signatureFor(sample.props);
    const stateSignatures = signatureFor(sample.state);
    const entry: StabilityHistoryEntry = {
      propsHash: aggregateSignature(propSignatures),
      stateHash: aggregateSignature(stateSignatures),
      propSignatures,
      stateSignatures,
      timestamp,
      metrics: sample.metrics,
    };

    const previous = this.history[this.history.length - 1];
    this.history.push(entry);
    if (this.history.length > HISTORY_LIMIT) {
      this.history.shift();
    }

    const warnings: string[] = [];
    const unstableProps: string[] = [];

    if (previous) {
      const rapidRender = sample.metrics.sincePreviousRenderMs > 0 &&
        sample.metrics.sincePreviousRenderMs <= RAPID_RENDER_THRESHOLD_MS;

      if (previous.propsHash === entry.propsHash && rapidRender) {
        warnings.push('Rapid renders with identical props detected');
      }

      if (previous.stateHash === entry.stateHash && rapidRender) {
        warnings.push('State unchanged between rapid renders');
      }

      const propKeys = new Set([...Object.keys(propSignatures), ...Object.keys(previous.propSignatures)]);
      for (const key of propKeys) {
        const nextValue = propSignatures[key];
        const prevValue = previous.propSignatures[key];
        if (nextValue !== prevValue) {
          const count = (this.propChangeCounters.get(key) ?? 0) + 1;
          this.propChangeCounters.set(key, count);
          if (count >= OSCILLATION_LIMIT) {
            unstableProps.push(key);
          }
        }
      }
    }

    const oscillationCount = this.history
      .slice(-OSCILLATION_LIMIT)
      .filter(item => item.propsHash === entry.propsHash)
      .length;

    const shouldFreeze = unstableProps.length > 0 && oscillationCount >= OSCILLATION_LIMIT;
    const freezeReason = shouldFreeze ? 'Detected repeated prop oscillation' : undefined;

    if ((warnings.length > 0 || unstableProps.length > 0) && process.env.NODE_ENV !== 'production') {
      RenderLoopDiagnostics.getInstance().recordStabilityWarning(this.componentName, {
        warnings,
        unstableProps,
        shouldFreeze,
        freezeReason,
      });
    }

    return {
      warnings,
      unstableProps,
      shouldFreeze,
      freezeReason,
    };
  }
}

const hashCache = new WeakMap<object, string>();

const signatureFor = (input: Record<string, unknown>): Record<string, string> => {
  const signature: Record<string, string> = {};
  for (const key of Object.keys(input)) {
    signature[key] = stableHash(input[key]);
  }
  return signature;
};

const aggregateSignature = (signature: Record<string, string>): string =>
  Object.keys(signature)
    .sort()
    .map(key => `${key}:${signature[key]}`)
    .join('|');

const stableHash = (value: unknown): string => {
  if (value == null) return String(value);
  const type = typeof value;
  if (type === 'string') return `string:${value}`;
  if (type === 'number' || type === 'boolean' || type === 'bigint') return `${type}:${value}`;
  if (value instanceof Date) return `date:${value.getTime()}`;
  if (Array.isArray(value)) return `array:[${value.map(item => stableHash(item)).join('|')}]`;
  if (type === 'object') {
    const objectValue = value as Record<string, unknown>;
    const cached = hashCache.get(objectValue);
    if (cached) return cached;
    const hashed = `object:{${Object.keys(objectValue)
      .sort()
      .map(key => `${key}:${stableHash(objectValue[key])}`)
      .join('|')}}`;
    hashCache.set(objectValue, hashed);
    return hashed;
  }
  if (type === 'function') {
    return `function:${(value as (...args: unknown[]) => unknown).name || 'anonymous'}`;
  }
  return `${type}:unknown`;
};
