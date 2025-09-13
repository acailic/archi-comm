// src/test/mocks/error.ts

type TestErrorType = 'network' | 'validation' | 'system' | 'storage';
interface TriggerErrorOptions {
  dispatchEvent?: boolean;
}

export const testErrorHandlers = {
  errors: [] as Array<{ error: Error; errorInfo?: any; timestamp: number }>,

  // Comment 11, 26
  triggerTestError(type: TestErrorType, options: TriggerErrorOptions = {}): void {
    const errorMap = {
      network: new Error('Network connection failed'),
      validation: new Error('Validation failed: Invalid input'),
      system: new Error('System error: Resource unavailable'),
      storage: new Error('Storage error: Quota exceeded'),
    };

    const error = errorMap[type];
    error.name = `Test${type.charAt(0).toUpperCase() + type.slice(1)}Error`;

    this.errors.push({
      error,
      timestamp: Date.now(),
    });

    if (options.dispatchEvent) {
      // Ensure ErrorEvent is available in the test environment (JSDOM has it)
      if (typeof ErrorEvent !== 'undefined') {
        window.dispatchEvent(new ErrorEvent('error', { error }));
      }
    } else {
      // Trigger error in next tick to simulate async error
      setTimeout(() => {
        throw error;
      }, 0);
    }
  },

  clearTestErrors(): void {
    this.errors = [];
  },

  getTestErrors(): Array<{ error: Error; errorInfo?: any; timestamp: number }> {
    return [...this.errors];
  },
};
