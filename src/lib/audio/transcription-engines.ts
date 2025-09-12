// src/lib/audio/transcription-engines.ts
// Multiple transcription engines: Whisper-rs (current), Transformers.js, Whisper.cpp WASM
// Automatic engine selection based on environment and performance requirements
// RELEVANT FILES: src/lib/tauri.ts, src/lib/audio/audio-manager.ts, src/shared/contracts/index.ts

import type { TranscriptionResponse, TranscriptionOptions } from '../../shared/contracts';

export interface TranscriptionEngine {
  name: string;
  type: 'offline' | 'realtime' | 'hybrid';
  isAvailable(): Promise<boolean>;
  initialize(options?: TranscriptionEngineOptions): Promise<void>;
  transcribe(audio: Blob | ArrayBuffer, options?: TranscriptionOptions): Promise<TranscriptionResponse>;
  transcribeRealtime?(stream: MediaStream, callback: (text: string, isFinal: boolean) => void): Promise<void>;
  dispose?(): Promise<void>;
}

export interface TranscriptionEngineOptions {
  modelSize?: 'tiny' | 'base' | 'small' | 'medium' | 'large';
  language?: string;
  task?: 'transcribe' | 'translate';
  enableTimestamps?: boolean;
  enableWordLevelTimestamps?: boolean;
}