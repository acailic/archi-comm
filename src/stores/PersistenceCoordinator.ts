// src/stores/PersistenceCoordinator.ts
// Coordinates all persistence operations to prevent race conditions
// Ensures canvas/Zustand saves don't conflict by queuing writes sequentially
// RELEVANT FILES: SimpleAppStore.ts, CanvasStore.ts, persistence.ts

type PersistenceOperation = () => Promise<void>;

/**
 * PersistenceCoordinator ensures all storage writes happen sequentially
 * to prevent the known Zustand/Canvas race condition where simultaneous
 * writes can corrupt or overwrite each other's data.
 */
class PersistenceCoordinator {
  private queue: PersistenceOperation[] = [];
  private isProcessing = false;

  /**
   * Enqueue a persistence operation to be executed sequentially.
   * All writes to localStorage must go through this coordinator.
   */
  async enqueue(operation: PersistenceOperation): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          await operation();
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      // Start processing if not already running
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const operation = this.queue.shift();
      if (operation) {
        try {
          await operation();
        } catch (error) {
          console.error('PersistenceCoordinator: Operation failed', error);
        }
      }
    }

    this.isProcessing = false;
  }

  /**
   * Wrap a storage setter to ensure it goes through the coordinator
   */
  wrapStorageSetter<T extends (...args: any[]) => any>(
    storageKey: string,
    setter: T
  ): T {
    return ((...args: Parameters<T>) => {
      return this.enqueue(async () => {
        const result = setter(...args);
        // If setter returns a promise, wait for it
        if (result instanceof Promise) {
          await result;
        }
      });
    }) as T;
  }
}

// Singleton instance
export const persistenceCoordinator = new PersistenceCoordinator();