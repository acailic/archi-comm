/// <reference types="vite/client" />

// Common asset module declarations for TypeScript
declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}

declare module '*.css' {
  const content: string;
  export default content;
}

declare global {
  interface Window {
    __TAURI__?: {
      tauri?: {
        invoke<T = unknown>(command: string, arguments?: Record<string, unknown>): Promise<T>;
      };
      convertFileSrc?(src: string, protocol?: string): string;
    };
  }
}

export {};

declare module 'react-day-picker@8.10.1' {
  export * from 'react-day-picker';
  export { default } from 'react-day-picker';
}

declare module 'embla-carousel-react@8.6.0' {
  export * from 'embla-carousel-react';
  export { default } from 'embla-carousel-react';
}

declare module 'input-otp@1.4.2' {
  export * from 'input-otp';
}

declare module 'cmdk@1.1.1' {
  export * from 'cmdk';
  export { default } from 'cmdk';
}

declare module 'vaul@1.1.2' {
  export * from 'vaul';
  export { default } from 'vaul';
}

declare module 'next-themes@0.4.6' {
  export * from 'next-themes';
}

declare module 'sonner@2.0.3' {
  export * from 'sonner';
}
