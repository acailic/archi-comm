// src/lib/audio/index.ts
// Main exports for the enhanced audio recording and transcription system
// Provides a clean interface for components to import audio functionality
// RELEVANT FILES: src/shared/contracts/index.ts, src/components/AudioRecording.tsx

// Core manager and interfaces
export { AudioManager } from './audio-manager';
export type { AudioManagerOptions } from './audio-manager';

// Recording engines
export type { RecordingEngine, RecordingOptions } from './recording-engines';

// Transcription engines
export type { TranscriptionEngine, TranscriptionEngineOptions } from './transcription-engines';
export { TransformersJSEngine } from './transformers-engine';
export { WhisperWasmEngine } from './whisper-wasm-engine';

// Real-time transcription
export { RealtimeTranscriptionManager } from './realtime-transcription';
export type { RealtimeTranscriptionOptions } from './realtime-transcription';

// Audio processing
export { AudioProcessor } from './audio-processor';
export type { AudioProcessingOptions } from './audio-processor';

// Engine implementations (for advanced usage)
export { MediaRecorderEngine } from './engine-implementations/media-recorder-engine';
export { RecordRTCEngine } from './engine-implementations/recordrtc-engine';
export { WhisperRustEngine } from './engine-implementations/whisper-rust-engine';
export { WebSpeechEngine } from './engine-implementations/web-speech-engine';

// Utility functions
export const createAudioManager = async (options?: AudioManagerOptions): Promise<AudioManager> => {
  const manager = new AudioManager();
  await manager.initialize(options || {});
  return manager;
};

export const detectBestEngines = async (): Promise<{
  recording: string[];
  transcription: string[];
}> => {
  // Utility function to detect available engines without initializing full manager
  // Useful for UI components that need to show available options
  
  const recording: string[] = [];
  const transcription: string[] = [];
  
  // Test recording engines
  try {
    const { MediaRecorderEngine } = await import('./engine-implementations/media-recorder-engine');
    const mediaRecorderEngine = new MediaRecorderEngine();
    if (await mediaRecorderEngine.isSupported()) {
      recording.push('MediaRecorder');
    }
  } catch (error) {
    console.warn('MediaRecorder engine not available:', error);
  }
  
  try {
    const { RecordRTCEngine } = await import('./engine-implementations/recordrtc-engine');
    const recordRTCEngine = new RecordRTCEngine();
    if (await recordRTCEngine.isSupported()) {
      recording.push('RecordRTC');
    }
  } catch (error) {
    console.warn('RecordRTC engine not available:', error);
  }
  
  // Test transcription engines
  try {
    const { WhisperRustEngine } = await import('./engine-implementations/whisper-rust-engine');
    const whisperRustEngine = new WhisperRustEngine();
    if (await whisperRustEngine.isAvailable()) {
      transcription.push('Whisper-rs');
    }
  } catch (error) {
    console.warn('Whisper-rs engine not available:', error);
  }
  
  try {
    const { TransformersJSEngine } = await import('./transformers-engine');
    const transformersEngine = new TransformersJSEngine();
    if (await transformersEngine.isAvailable()) {
      transcription.push('Transformers.js');
    }
  } catch (error) {
    console.warn('Transformers.js engine not available:', error);
  }
  
  try {
    const { WhisperWasmEngine } = await import('./whisper-wasm-engine');
    const whisperWasmEngine = new WhisperWasmEngine();
    if (await whisperWasmEngine.isAvailable()) {
      transcription.push('Whisper.cpp WASM');
    }
  } catch (error) {
    console.warn('Whisper WASM engine not available:', error);
  }
  
  try {
    const { WebSpeechEngine } = await import('./engine-implementations/web-speech-engine');
    const webSpeechEngine = new WebSpeechEngine();
    if (await webSpeechEngine.isAvailable()) {
      transcription.push('Web Speech API');
    }
  } catch (error) {
    console.warn('Web Speech API engine not available:', error);
  }
  
  return { recording, transcription };
};

// Re-export types from shared contracts for convenience
export type { 
  TranscriptionResponse, 
  TranscriptionSegment, 
  TranscriptionOptions 
} from '../../shared/contracts';

// Helper function to check if we're in a Tauri environment
export const isTauriEnvironment = (): boolean => {
  return typeof window !== 'undefined' && (window as any).__TAURI__ !== undefined;
};

// Helper function to check browser capabilities
export const getBrowserCapabilities = () => {
  const capabilities = {
    mediaRecorder: !!(typeof MediaRecorder !== 'undefined'),
    getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    webSpeechAPI: !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
    webAssembly: typeof WebAssembly !== 'undefined',
    audioContext: !!(window.AudioContext || (window as any).webkitAudioContext),
    offlineAudioContext: typeof OfflineAudioContext !== 'undefined',
    indexedDB: typeof indexedDB !== 'undefined'
  };
  
  return capabilities;
};

// Default configuration for quick setup
export const getDefaultAudioManagerOptions = (): AudioManagerOptions => {
  const isTauri = isTauriEnvironment();
  
  return {
    preferredRecordingEngine: 'MediaRecorder',
    preferredTranscriptionEngine: isTauri ? 'Whisper-rs' : undefined,
    enableRealtimeTranscription: true,
    fallbackToWebSpeech: true,
    audioProcessingOptions: {
      targetSampleRate: 16000,
      targetChannels: 1,
      enableNoiseReduction: true,
      enableNormalization: true,
      outputFormat: 'wav'
    }
  };
};
