// src/test/mocks/storage.ts

// Comment 3, 23: Helper for byte length calculation
function byteLength(value: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value).length;
  }
  // Fallback for Node.js environments where TextEncoder might not be global
  // This is less likely in a Vitest/JSDOM setup but good for robustness.
  if (typeof Buffer !== 'undefined') {
    return Buffer.byteLength(value, 'utf-8');
  }
  // Simple fallback if no other mechanism is available
  return value.length;
}

class MockStorage implements Storage {
  protected store: { [key: string]: string } = {};

  get length(): number {
    return Object.keys(this.store).length;
  }

  key(n: number): string | null {
    const keys = Object.keys(this.store);
    return keys[n] || null;
  }

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

// Comment 1, 2, 3, 4, 5, 21, 22, 23, 24, 25
export class ExtendedMockStorage extends MockStorage {
  private _shouldFail = false;
  private _usage = 0;
  private _quota: number;

  constructor(quota: number = 10 * 1024 * 1024) { // Comment 5
    super();
    this._quota = quota;
  }

  override setItem(key: string, value: string): void {
    if (this._shouldFail) {
      const error = new Error('Storage operation failed');
      error.name = 'StorageFailureError'; // Comment 25
      throw error;
    }

    const oldValue = this.getItem(key);
    const oldLength = oldValue ? byteLength(oldValue) : 0;
    const newLength = byteLength(value);
    const newUsage = this._usage - oldLength + newLength;

    if (newUsage > this._quota) { // Comment 24
      // Comment 4, 25
      if (typeof DOMException !== 'undefined') {
        throw new DOMException('The quota has been exceeded', 'QuotaExceededError');
      } else {
        const error = new Error('QuotaExceededError: The quota has been exceeded');
        error.name = 'QuotaExceededError';
        throw error;
      }
    }

    super.setItem(key, value);
    this._usage = newUsage; // Comment 1, 21
  }

  override removeItem(key: string): void { // Comment 2, 22
    const oldValue = this.getItem(key);
    if (oldValue) {
      const oldLength = byteLength(oldValue);
      this._usage = Math.max(0, this._usage - oldLength);
    }
    super.removeItem(key);
  }

  override clear(): void { // Comment 22
    super.clear();
    this._usage = 0;
  }

  simulateFailure(shouldFail = true): void {
    this._shouldFail = shouldFail;
  }

  // For inspection in tests (Comment 20)
  getUsage(): number {
    return this._usage;
  }

  getQuota(): number {
    return this._quota;
  }
  
  getKeys(): string[] {
    return Object.keys(this.store);
  }
}
