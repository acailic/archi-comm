// src/packages/audio/engines/recording-engines.ts
// Enhanced recording engines supporting MediaRecorder, RecordRTC, and native recording
// Provides automatic fallback and cross-browser compatibility
// RELEVANT FILES: src/components/AudioRecording.tsx, src/packages/audio/audio-manager.ts, src/packages/audio/engine-implementations/media-recorder-engine.ts

export interface RecordingEngine {
  name: string;
  isSupported(): Promise<boolean>;
  startRecording(options?: RecordingOptions): Promise<void>;
  stopRecording(): Promise<Blob>;
  pauseRecording?(): Promise<void>;
  resumeRecording?(): Promise<void>;
  getAudioStream?(): MediaStream | null;
}

export interface RecordingOptions {
  mimeType?: string;
  audioBitsPerSecond?: number;
  sampleRate?: number;
  channelCount?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}