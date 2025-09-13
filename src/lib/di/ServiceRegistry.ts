// src/lib/di/ServiceRegistry.ts
// Service registration and container setup for the application
// Configures all services with their dependencies and provides the main application container
// RELEVANT FILES: src/lib/di/Container.ts, src/lib/di/ServiceInterfaces.ts, src/services/canvas/CanvasService.ts, src/services/canvas/PersistenceService.ts, src/services/audio/AudioService.ts

import { Container, createContainer } from './Container';
import {
  CANVAS_SERVICE,
  PERSISTENCE_SERVICE,
  AUDIO_SERVICE,
  type ICanvasService,
  type IPersistenceService,
  type IAudioService,
} from './ServiceInterfaces';
import { CanvasService } from '@/services/canvas/CanvasService';
import { PersistenceService } from '@/services/canvas/PersistenceService';
import { AudioService } from '@/services/audio/AudioService';

/**
 * Service factory functions for dependency injection
 */

/**
 * Create persistence service factory
 * No dependencies required
 */
function createPersistenceService(): IPersistenceService {
  const projectId = getProjectIdFromEnvironment();
  return new PersistenceService(projectId);
}

/**
 * Create canvas service factory with persistence service dependency
 */
function createCanvasService(persistenceService: IPersistenceService): ICanvasService {
  return new CanvasService(persistenceService);
}

/**
 * Create audio service factory
 * No dependencies required
 */
function createAudioService(): IAudioService {
  return new AudioService();
}

/**
 * Set up all services in the container with their dependencies
 */
export async function setupServices(container: Container): Promise<void> {
  try {
    // Register persistence service first (no dependencies)
    container.register(
      PERSISTENCE_SERVICE,
      createPersistenceService,
      {
        singleton: true,
        lifecycle: 'singleton',
        dependencies: [],
      }
    );

    // Register canvas service with persistence dependency
    container.register(
      CANVAS_SERVICE,
      createCanvasService,
      {
        singleton: true,
        lifecycle: 'singleton',
        dependencies: [PERSISTENCE_SERVICE],
      }
    );

    // Register audio service (no dependencies)
    container.register(
      AUDIO_SERVICE,
      createAudioService,
      {
        singleton: true,
        lifecycle: 'singleton',
        dependencies: [],
      }
    );

    // Pre-resolve all services to ensure they're available synchronously
    await preResolveServices(container);

    if (process.env.NODE_ENV === 'development') {
      console.log('Service registry setup complete:', {
        registeredServices: container.getRegisteredServices(),
        dependencyGraph: container.getDependencyGraph(),
      });
    }
  } catch (error) {
    console.error('Failed to setup services:', error);
    throw new Error(`Service registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Pre-resolve all services to make them available synchronously
 */
async function preResolveServices(container: Container): Promise<void> {
  try {
    // Resolve in dependency order
    await container.resolve(PERSISTENCE_SERVICE);
    await container.resolve(CANVAS_SERVICE);
    await container.resolve(AUDIO_SERVICE);

    if (process.env.NODE_ENV === 'development') {
      console.log('All services pre-resolved successfully');
    }
  } catch (error) {
    console.error('Failed to pre-resolve services:', error);
    throw new Error(`Service pre-resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create and configure the main application container
 */
export async function createApplicationContainer(): Promise<Container> {
  const container = createContainer();

  try {
    await setupServices(container);
    return container;
  } catch (error) {
    console.error('Failed to create application container:', error);
    throw error;
  }
}

/**
 * Get all application service tokens for easy access
 */
export function getApplicationServices() {
  return {
    CANVAS_SERVICE,
    PERSISTENCE_SERVICE,
    AUDIO_SERVICE,
  };
}

/**
 * Validate that all services can be resolved correctly
 */
export async function validateServiceSetup(container: Container): Promise<boolean> {
  try {
    const services = [CANVAS_SERVICE, PERSISTENCE_SERVICE, AUDIO_SERVICE];

    for (const service of services) {
      const resolved = await container.resolve(service);
      if (!resolved) {
        console.error(`Failed to resolve service: ${service.name}`);
        return false;
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('All services validated successfully');
    }

    return true;
  } catch (error) {
    console.error('Service validation failed:', error);
    return false;
  }
}

/**
 * Get service dependency graph for visualization
 */
export function getServiceDependencyGraph(container: Container): Record<string, string[]> {
  return container.getDependencyGraph();
}

/**
 * Benchmark service resolution performance
 */
export async function benchmarkServiceResolution(container: Container): Promise<Record<string, number>> {
  if (process.env.NODE_ENV !== 'development') {
    return {};
  }

  const services = [CANVAS_SERVICE, PERSISTENCE_SERVICE, AUDIO_SERVICE];
  const benchmarks: Record<string, number> = {};

  for (const service of services) {
    const startTime = performance.now();
    try {
      await container.resolve(service);
      const endTime = performance.now();
      benchmarks[service.name] = endTime - startTime;
    } catch (error) {
      benchmarks[service.name] = -1; // Indicates failure
    }
  }

  console.log('Service resolution benchmarks (ms):', benchmarks);
  return benchmarks;
}

/**
 * Development utility to inspect container state
 */
export function inspectContainer(container: Container): {
  services: string[];
  dependencies: Record<string, string[]>;
  isHealthy: boolean;
} {
  if (process.env.NODE_ENV !== 'development') {
    return { services: [], dependencies: {}, isHealthy: false };
  }

  return {
    services: container.getRegisteredServices(),
    dependencies: container.getDependencyGraph(),
    isHealthy: container.isRegistered(CANVAS_SERVICE) &&
              container.isRegistered(PERSISTENCE_SERVICE) &&
              container.isRegistered(AUDIO_SERVICE),
  };
}

/**
 * Create container with development debugging features
 */
export async function createDevelopmentContainer(): Promise<Container> {
  if (process.env.NODE_ENV !== 'development') {
    return createApplicationContainer();
  }

  const container = await createApplicationContainer();

  // Add development-specific logging
  const originalResolve = container.resolve.bind(container);
  container.resolve = async function<T>(token: any): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await originalResolve(token);
      const duration = performance.now() - startTime;
      console.debug(`[DI] Resolved ${token.name} in ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      console.error(`[DI] Failed to resolve ${token.name}:`, error);
      throw error;
    }
  };

  return container;
}

/**
 * Create container for testing with mock services
 */
export function createTestContainer(): Container {
  const container = createContainer();

  // Register mock services for testing
  container.register(
    PERSISTENCE_SERVICE,
    () => ({
      // test-safe mock: supports vitest or jest or falls back to no-op
      ...( (() => { const mock = (globalThis as any).vi?.fn ?? (globalThis as any).jest?.fn ?? ((..._args: any[]) => {}); return {
        saveDesign: mock(),
        loadDesign: mock(),
        exportJSON: mock(),
        exportPNG: mock(),
        validateData: mock(() => ({ isValid: true, errors: [], warnings: [] })),
      }; })() ),
      // ... other mock methods
    } as any),
    { singleton: true }
  );

  container.register(
    CANVAS_SERVICE,
    () => ({
      ...( (() => { const mock = (globalThis as any).vi?.fn ?? (globalThis as any).jest?.fn ?? ((..._args: any[]) => {}); return {
        getState: mock(),
        addComponent: mock(),
        updateComponent: mock(),
        deleteComponent: mock(),
        subscribe: mock(() => () => {}),
      }; })() ),
      // ... other mock methods
    } as any),
    { singleton: true }
  );

  container.register(
    AUDIO_SERVICE,
    () => ({
      ...( (() => { const mock = (globalThis as any).vi?.fn ?? (globalThis as any).jest?.fn ?? ((..._args: any[]) => {}); return {
        initialize: mock(),
        startRecording: mock(),
        stopRecording: mock(),
        isRecording: mock(() => false),
      }; })() ),
      // ... other mock methods
    } as any),
    { singleton: true }
  );

  return container;
}

/**
 * Environment-based configuration helpers
 */

/**
 * Get project ID from environment variables or URL parameters
 */
function getProjectIdFromEnvironment(): string | undefined {
  // Check URL parameters
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('project');
    if (projectId) {
      return projectId;
    }
  }

  // Check environment variables
  return process.env.REACT_APP_PROJECT_ID;
}

/**
 * Get service configuration from environment
 */
export function getServiceConfiguration() {
  return {
    development: process.env.NODE_ENV === 'development',
    enableDependencyInjection: process.env.REACT_APP_ENABLE_DI !== 'false',
    enableServiceLogging: process.env.REACT_APP_SERVICE_LOGGING === 'true',
    defaultProjectId: getProjectIdFromEnvironment(),
    audioServiceEnabled: process.env.REACT_APP_AUDIO_SERVICE !== 'false',
  };
}

/**
 * Feature flags for service enablement
 */
export function getServiceFeatureFlags() {
  return {
    canvasService: true, // Always enabled
    persistenceService: true, // Always enabled
    audioService: process.env.REACT_APP_AUDIO_SERVICE !== 'false',
    realtimeTranscription: process.env.REACT_APP_REALTIME_TRANSCRIPTION === 'true',
    experimentalFeatures: process.env.REACT_APP_EXPERIMENTAL === 'true',
  };
}

// Re-export service tokens for convenience
export { CANVAS_SERVICE, PERSISTENCE_SERVICE, AUDIO_SERVICE };

// Re-export types for convenience
export type {
  ICanvasService,
  IPersistenceService,
  IAudioService,
};
