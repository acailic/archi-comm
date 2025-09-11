import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';

// Mock types for Tauri window metadata
interface WindowDef {
  label: string;
  title: string;
  url: string;
  // Add other needed properties
}

// Mock window and document objects
const mockWindow = {
  __TAURI__: {
    convertFileSrc: (src: string, _protocol: string) => src,
  },
  __TAURI_METADATA__: {
    __windows: [] as WindowDef[],
    __currentWindow: {} as WindowDef,
  },
  ResizeObserver: class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
  matchMedia: () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false;
    },
  }),
};

// Extend window with TAURI properties
declare global {
  interface Window {
    __TAURI__: {
      convertFileSrc: (src: string, protocol: string) => string;
    };
    __TAURI_METADATA__: {
      __windows: WindowDef[];
      __currentWindow: WindowDef;
    };
  }
}

// Set up jsdom environment
vi.stubGlobal('window', mockWindow);

// Mock ResizeObserver
globalThis.ResizeObserver = mockWindow.ResizeObserver;

// Mock requestAnimationFrame
const mockRequestAnimationFrame = (callback: FrameRequestCallback): number => {
  return setTimeout(() => callback(performance.now()), 0) as unknown as number;
};
globalThis.requestAnimationFrame = vi.fn(mockRequestAnimationFrame);

// Mock cancelAnimationFrame
globalThis.cancelAnimationFrame = vi.fn((id: number) => {
  clearTimeout(id as unknown as ReturnType<typeof setTimeout>);
});

// Mock React Flow's MockStorage and DragEvent
class MockStorage implements Storage {
  private store: { [key: string]: string } = {};

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

vi.stubGlobal('localStorage', new MockStorage());
vi.stubGlobal('sessionStorage', new MockStorage());

// Mock FileList and DataTransferItemList
class MockFileList {
  private files: File[] = [];

  get length(): number {
    return this.files.length;
  }

  item(index: number): File | null {
    return this.files[index] || null;
  }

  [Symbol.iterator]() {
    return this.files[Symbol.iterator]();
  }

  [index: number]: File;
}

class MockDataTransferItemList {
  private items: DataTransferItem[] = [];

  get length(): number {
    return this.items.length;
  }

  add(_data: string | File, _type?: string): DataTransferItem | null {
    return null;
  }

  clear(): void {
    this.items = [];
  }

  remove(index: number): void {
    this.items.splice(index, 1);
  }

  [Symbol.iterator]() {
    return this.items[Symbol.iterator]();
  }

  [index: number]: DataTransferItem;
}

// Mock DragEvent for React Flow
class MockDragEvent extends Event {
  dataTransfer: DataTransfer;

  constructor(type: string, options?: EventInit) {
    super(type, options);
    this.dataTransfer = {
      dropEffect: 'none',
      effectAllowed: 'none',
      files: new MockFileList() as unknown as FileList,
      items: new MockDataTransferItemList() as unknown as DataTransferItemList,
      types: [],
      clearData: vi.fn(),
      getData: vi.fn(),
      setData: vi.fn(),
      setDragImage: vi.fn(),
    };
  }
}

vi.stubGlobal('DragEvent', MockDragEvent);

// Clean up all mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});
