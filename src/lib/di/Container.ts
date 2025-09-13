// src/lib/di/Container.ts
// Core dependency injection container with type-safe service registration and resolution
// This file provides the foundation for centralized service management across the application
// RELEVANT FILES: src/lib/di/ServiceInterfaces.ts, src/lib/di/ServiceProvider.tsx, src/lib/di/ServiceRegistry.ts

/**
 * Service token interface for type-safe service identification
 * Uses phantom type to enable TypeScript type inference
 */
export interface ServiceToken<T> {
  readonly name: string;
  readonly type: T; // Phantom type for TypeScript inference
}

/**
 * Service factory function type
 * Can return service instance synchronously or asynchronously
 */
export type ServiceFactory<T> = (...args: any[]) => T | Promise<T>;

/**
 * Service registration configuration
 */
export interface ServiceRegistration<T> {
  factory: ServiceFactory<T>;
  singleton: boolean;
  dependencies?: ServiceToken<any>[];
  lifecycle?: 'transient' | 'singleton' | 'scoped';
}

/**
 * Custom errors for dependency injection system
 */
export class ServiceNotFoundError extends Error {
  constructor(serviceName: string) {
    super(`Service '${serviceName}' is not registered in the container`);
    this.name = 'ServiceNotFoundError';
  }
}

export class CircularDependencyError extends Error {
  constructor(dependencyChain: string[]) {
    super(`Circular dependency detected: ${dependencyChain.join(' -> ')}`);
    this.name = 'CircularDependencyError';
  }
}

export class ServiceResolutionError extends Error {
  constructor(serviceName: string, cause: Error) {
    super(`Failed to resolve service '${serviceName}': ${cause.message}`);
    this.name = 'ServiceResolutionError';
    this.cause = cause;
  }
}

/**
 * Core dependency injection container
 * Provides type-safe service registration and resolution with dependency management
 */
export class Container {
  private services = new Map<string, ServiceRegistration<any>>();
  private instances = new Map<string, any>();
  private resolving = new Set<string>();

  /**
   * Register a service with its factory function
   */
  register<T>(
    token: ServiceToken<T>,
    factory: ServiceFactory<T>,
    options?: Partial<ServiceRegistration<T>>
  ): void {
    const registration: ServiceRegistration<T> = {
      factory,
      singleton: options?.singleton ?? true,
      dependencies: options?.dependencies ?? [],
      lifecycle: options?.lifecycle ?? 'singleton',
    };

    this.services.set(token.name, registration);
  }

  /**
   * Resolve a service asynchronously with dependency injection
   */
  async resolve<T>(token: ServiceToken<T>): Promise<T> {
    const serviceName = token.name;

    // Check for circular dependencies
    if (this.resolving.has(serviceName)) {
      const dependencyChain = Array.from(this.resolving);
      dependencyChain.push(serviceName);
      throw new CircularDependencyError(dependencyChain);
    }

    // Return cached singleton instance
    if (this.instances.has(serviceName)) {
      return this.instances.get(serviceName);
    }

    const registration = this.services.get(serviceName);
    if (!registration) {
      throw new ServiceNotFoundError(serviceName);
    }

    try {
      this.resolving.add(serviceName);

      // Resolve dependencies first
      const resolvedDependencies = [];
      if (registration.dependencies) {
        for (const dependency of registration.dependencies) {
          const resolvedDependency = await this.resolve(dependency);
          resolvedDependencies.push(resolvedDependency);
        }
      }

      // Create service instance
      const serviceInstance = await registration.factory(...resolvedDependencies);

      // Cache singleton instances
      if (registration.singleton) {
        this.instances.set(serviceName, serviceInstance);
      }

      return serviceInstance;
    } catch (error) {
      throw new ServiceResolutionError(serviceName, error as Error);
    } finally {
      this.resolving.delete(serviceName);
    }
  }

  /**
   * Resolve a service synchronously
   * Only works if the service and all its dependencies are already resolved
   */
  resolveSync<T>(token: ServiceToken<T>): T {
    const serviceName = token.name;

    // Return cached instance
    if (this.instances.has(serviceName)) {
      return this.instances.get(serviceName);
    }

    throw new ServiceNotFoundError(`Service '${serviceName}' is not available synchronously. Use resolve() instead.`);
  }

  /**
   * Check if a service is registered
   */
  isRegistered<T>(token: ServiceToken<T>): boolean {
    return this.services.has(token.name);
  }

  /**
   * Clear all services and instances
   */
  clear(): void {
    this.services.clear();
    this.instances.clear();
    this.resolving.clear();
  }

  /**
   * Create a scoped container (inherits registrations but has separate instances)
   */
  createScope(): Container {
    const scopedContainer = new Container();

    // Copy service registrations
    for (const [name, registration] of this.services) {
      scopedContainer.services.set(name, registration);
    }

    return scopedContainer;
  }

  /**
   * Get all registered service names
   */
  getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Get service dependency graph for debugging
   */
  getDependencyGraph(): Record<string, string[]> {
    const graph: Record<string, string[]> = {};

    for (const [name, registration] of this.services) {
      graph[name] = registration.dependencies?.map(dep => dep.name) ?? [];
    }

    return graph;
  }
}

/**
 * Utility function to create a service token
 */
export function createToken<T>(name: string): ServiceToken<T> {
  return {
    name,
    type: undefined as any, // Phantom type
  };
}

/**
 * Create a new container instance
 */
export function createContainer(): Container {
  return new Container();
}

// Global container instance for applications that need it
let globalContainer: Container | null = null;

/**
 * Get or create the global container instance
 */
export function getGlobalContainer(): Container {
  if (!globalContainer) {
    globalContainer = createContainer();
  }
  return globalContainer;
}

/**
 * Set the global container instance
 */
export function setGlobalContainer(container: Container): void {
  globalContainer = container;
}