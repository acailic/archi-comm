// src/lib/audio/audio-manager.ts
// Central audio manager that coordinates recording and transcription
// Provides automatic engine selection and fallback mechanisms
// RELEVANT FILES: src/components/AudioRecording.tsx, src/lib/audio/recording-engines.ts, src/lib/audio/transcription-engines.ts

import { RecordingEngine, RecordingOptions } from './recording-engines';
import { TranscriptionEngine, TranscriptionEngineOptions } from './transcription-engines';
import { RealtimeTranscriptionManager, RealtimeTranscriptionOptions } from './realtime-transcription';
import { AudioProcessor, AudioProcessingOptions } from './audio-processor';
import type { TranscriptionResponse, TranscriptionOptions } from '../../shared/contracts';

export interface AudioManagerOptions {
  preferredRecordingEngine?: string;
  preferredTranscriptionEngine?: string;
  enableRealtimeTranscription?: boolean;
  fallbackToWebSpeech?: boolean;
  audioProcessingOptions?: AudioProcessingOptions;
}

export class AudioManager {
  private recordingEngines: Map<string, RecordingEngine> = new Map();
  private transcriptionEngines: Map<string, TranscriptionEngine> = new Map();
  private realtimeManager: RealtimeTranscriptionManager;
  private audioProcessor: AudioProcessor;
  private currentRecordingEngine: RecordingEngine | null = null;
  private currentTranscriptionEngine: TranscriptionEngine | null = null;
  private options: AudioManagerOptions;
  private isRecording = false;
  
  constructor() {
    this.realtimeManager = new RealtimeTranscriptionManager();
    this.audioProcessor = new AudioProcessor();
    this.options = {};
  }
  
  async initialize(options: AudioManagerOptions): Promise<void> {
    this.options = { ...options };
    
    try {
      // Register and test recording engines
      await this.registerRecordingEngines();
      
      // Register and test transcription engines
      await this.registerTranscriptionEngines();
      
      // Select best engines
      this.currentRecordingEngine = await this.selectBestRecordingEngine();
      this.currentTranscriptionEngine = await this.selectBestTranscriptionEngine();
      
      console.log('AudioManager initialized with:', {
        recordingEngine: this.currentRecordingEngine?.name,
        transcriptionEngine: this.currentTranscriptionEngine?.name
      });
      
    } catch (error) {
      console.error('AudioManager initialization failed:', error);
      throw error;
    }
  }
  
  async startRecording(options: RecordingOptions = {}): Promise<void> {
    if (this.isRecording) {
      throw new Error('Recording is already in progress');
    }
    
    if (!this.currentRecordingEngine) {
      throw new Error('No recording engine available');
    }
    
    try {
      // Start main recording
      await this.currentRecordingEngine.startRecording(options);
      this.isRecording = true;
      
      // Start real-time transcription if enabled
      if (this.options.enableRealtimeTranscription) {
        const stream = this.currentRecordingEngine.getAudioStream?.();
        if (stream && await this.realtimeManager.isAvailable()) {
          await this.realtimeManager.startRealtime({
            language: 'en-US',
            continuous: true,
            interimResults: true,
            confidenceThreshold: 0.7
          });
        }
      }
      
    } catch (error) {
      this.isRecording = false;
      console.error('Failed to start recording:', error);
      throw error;
    }
  }
  
  async stopRecording(): Promise<{ audio: Blob; transcript?: string }> {
    if (!this.isRecording || !this.currentRecordingEngine) {
      throw new Error('No recording in progress');
    }
    
    try {
      // Stop real-time transcription first
      let realtimeTranscript = '';
      if (this.options.enableRealtimeTranscription) {
        await this.realtimeManager.stopRealtime();
        realtimeTranscript = this.realtimeManager.getFinalTranscript();
      }
      
      // Stop main recording
      const audioBlob = await this.currentRecordingEngine.stopRecording();
      this.isRecording = false;
      
      // Transcribe the audio if we have a transcription engine
      let transcript: string | undefined;
      if (this.currentTranscriptionEngine) {
        try {
          const transcriptionResult = await this.transcribeAudio(audioBlob);
          transcript = transcriptionResult.text;
          
          // Combine with real-time transcript if available
          if (realtimeTranscript && transcript) {
            transcript = `${realtimeTranscript.trim()} ${transcript.trim()}`.trim();
          } else if (realtimeTranscript) {
            transcript = realtimeTranscript.trim();
          }
        } catch (error) {
          console.warn('Transcription failed, using real-time transcript only:', error);
          transcript = realtimeTranscript || undefined;
        }
      }
      
      return { audio: audioBlob, transcript };
      
    } catch (error) {
      this.isRecording = false;
      console.error('Failed to stop recording:', error);
      throw error;
    }
  }
  
  async transcribeAudio(audio: Blob, engineName?: string): Promise<TranscriptionResponse> {
    // Select transcription engine
    let engine = this.currentTranscriptionEngine;
    
    if (engineName) {
      engine = this.transcriptionEngines.get(engineName) || null;
    }
    
    if (!engine) {
      throw new Error('No transcription engine available');
    }
    
    // Ensure processedAudio is available across try/catch
    let processedAudio: Blob = audio;
    try {
      // Process audio if needed
      if (this.options.audioProcessingOptions) {
        processedAudio = await this.audioProcessor.processAudio(audio, this.options.audioProcessingOptions);
      }
      
      // Perform transcription
      const result = await engine.transcribe(processedAudio);
      return result;
      
    } catch (error) {
      console.error(`Transcription failed with ${engine.name}:`, error);
      // Optionally fall back to Transformers.js if available and different from current engine
      const tjs = this.transcriptionEngines.get('Transformers.js');
      if (tjs && tjs !== engine && await tjs.isAvailable()) {
        return await tjs.transcribe(processedAudio);
      }
      // Avoid falling back to Web Speech API for file-based transcription
      throw error;
    }
  }
  
  async getAvailableEngines(): Promise<{ recording: string[]; transcription: string[] }> {
    const recording: string[] = [];
    const transcription: string[] = [];
    
    // Test recording engines
    for (const [name, engine] of this.recordingEngines) {
      if (await engine.isSupported()) {
        recording.push(name);
      }
    }
    
    // Test transcription engines
    for (const [name, engine] of this.transcriptionEngines) {
      if (await engine.isAvailable()) {
        transcription.push(name);
      }
    }
    
    return { recording, transcription };
  }
  
  onRealtimeTranscript(callback: (text: string, isFinal: boolean) => void): void {
    this.realtimeManager.onTranscript(callback);
  }
  
  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }
  
  getCurrentEngines(): { recording?: string; transcription?: string } {
    return {
      recording: this.currentRecordingEngine?.name,
      transcription: this.currentTranscriptionEngine?.name
    };
  }
  
  private async registerRecordingEngines(): Promise<void> {
    // Dynamically import and register recording engines
    try {
      const { MediaRecorderEngine } = await import('./engine-implementations/media-recorder-engine');
      this.recordingEngines.set('MediaRecorder', new MediaRecorderEngine());
    } catch (error) {
      console.warn('Failed to register MediaRecorder engine:', error);
    }
    
    try {
      const { RecordRTCEngine } = await import('./engine-implementations/recordrtc-engine');
      this.recordingEngines.set('RecordRTC', new RecordRTCEngine());
    } catch (error) {
      console.warn('Failed to register RecordRTC engine:', error);
    }
  }
  
  private async registerTranscriptionEngines(): Promise<void> {
    // Register Whisper-rs engine
    try {
      const { WhisperRustEngine } = await import('./engine-implementations/whisper-rust-engine');
      const engine = new WhisperRustEngine();
      this.transcriptionEngines.set('Whisper-rs', engine);
    } catch (error) {
      console.warn('Failed to register Whisper-rs engine:', error);
    }
    
    // Register Transformers.js engine
    try {
      const { TransformersJSEngine } = await import('./transformers-engine');
      const engine = new TransformersJSEngine();
      this.transcriptionEngines.set('Transformers.js', engine);
    } catch (error) {
      console.warn('Failed to register Transformers.js engine:', error);
    }
    
    // Register Whisper WASM engine
    try {
      const { WhisperWasmEngine } = await import('./whisper-wasm-engine');
      const engine = new WhisperWasmEngine();
      this.transcriptionEngines.set('Whisper.cpp WASM', engine);
    } catch (error) {
      console.warn('Failed to register Whisper WASM engine:', error);
    }
    
    // Register Web Speech API engine
    try {
      const { WebSpeechEngine } = await import('./engine-implementations/web-speech-engine');
      const engine = new WebSpeechEngine();
      this.transcriptionEngines.set('Web Speech API', engine);
    } catch (error) {
      console.warn('Failed to register Web Speech API engine:', error);
    }
  }
  
  private async selectBestRecordingEngine(): Promise<RecordingEngine | null> {
    // If user specified a preference, try that first
    if (this.options.preferredRecordingEngine) {
      const preferred = this.recordingEngines.get(this.options.preferredRecordingEngine);
      if (preferred && await preferred.isSupported()) {
        return preferred;
      }
    }
    
    // Test engines in order of preference
    const preferenceOrder = ['MediaRecorder', 'RecordRTC'];
    
    for (const engineName of preferenceOrder) {
      const engine = this.recordingEngines.get(engineName);
      if (engine && await engine.isSupported()) {
        return engine;
      }
    }
    
    return null;
  }
  
  private async selectBestTranscriptionEngine(): Promise<TranscriptionEngine | null> {
    // If user specified a preference, try that first
    if (this.options.preferredTranscriptionEngine) {
      const preferred = this.transcriptionEngines.get(this.options.preferredTranscriptionEngine);
      if (preferred && await preferred.isAvailable()) {
        return preferred;
      }
    }
    
    // Test engines in order of preference (offline first for privacy)
    const preferenceOrder = ['Whisper-rs', 'Transformers.js', 'Whisper.cpp WASM', 'Web Speech API'];
    
    for (const engineName of preferenceOrder) {
      const engine = this.transcriptionEngines.get(engineName);
      if (engine && await engine.isAvailable()) {
        return engine;
      }
    }
    
    return null;
  }
  
  async dispose(): Promise<void> {
    // Stop recording if in progress
    if (this.isRecording) {
      try {
        await this.stopRecording();
      } catch (error) {
        console.warn('Error stopping recording during disposal:', error);
      }
    }
    
    // Dispose of transcription engines
    for (const engine of this.transcriptionEngines.values()) {
      if (engine.dispose) {
        try {
          await engine.dispose();
        } catch (error) {
          console.warn('Error disposing transcription engine:', error);
        }
      }
    }
    
    // Clear all engines
    this.recordingEngines.clear();
    this.transcriptionEngines.clear();
    this.currentRecordingEngine = null;
    this.currentTranscriptionEngine = null;
  }
}
