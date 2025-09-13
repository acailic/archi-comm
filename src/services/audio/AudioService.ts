// src/services/audio/AudioService.ts
// Concrete implementation of the audio service wrapping AudioManager functionality
// Provides a clean service interface for audio recording, transcription, and engine management
// RELEVANT FILES: src/lib/di/ServiceInterfaces.ts, src/lib/audio/audio-manager.ts, src/shared/contracts/index.ts

import { AudioManager } from '@/lib/audio/audio-manager';
import type {
  IAudioService,
  AudioManagerOptions,
  RecordingOptions,
} from '@/lib/di/ServiceInterfaces';
import type { TranscriptionResponse } from '@/shared/contracts';

/**
 * Audio service implementation that wraps the existing AudioManager class
 * This service provides a clean interface for dependency injection while preserving
 * all existing functionality of the AudioManager system
 */
export class AudioService implements IAudioService {
  private audioManager: AudioManager;
  private initialized: boolean = false;
  private currentOptions: AudioManagerOptions = {};
  private realtimeCallbacks: Set<(text: string, isFinal: boolean) => void> = new Set();
  private sessionId: string | null = null;
  private sessionHistory: Array<{ id: string; timestamp: number; duration: number }> = [];
  private sessionStartTime: number | null = null;

  constructor() {
    this.audioManager = new AudioManager();
    this.setupEventListeners();
  }

  /**
   * Initialize the audio service with configuration
   */
  async initialize(options: AudioManagerOptions): Promise<void> {
    try {
      this.currentOptions = { ...options };

      // Initialize the underlying AudioManager
      await this.audioManager.initialize({
        preferredRecordingEngine: options.recordingEngine,
        preferredTranscriptionEngine: options.transcriptionEngine,
        enableRealtimeTranscription: options.realtimeTranscription ?? false,
        fallbackToWebSpeech: true,
        audioProcessingOptions: {
          enableNoiseReduction: true,
          enableAutoGain: true,
        },
      });

      this.initialized = true;
    } catch (error) {
      this.initialized = false;
      throw new Error(`Audio service initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get current service configuration
   */
  getConfiguration(): AudioManagerOptions {
    return { ...this.currentOptions };
  }

  /**
   * Update service configuration
   */
  async updateConfiguration(options: Partial<AudioManagerOptions>): Promise<void> {
    const newOptions = { ...this.currentOptions, ...options };

    // Re-initialize if critical options changed
    if (
      newOptions.recordingEngine !== this.currentOptions.recordingEngine ||
      newOptions.transcriptionEngine !== this.currentOptions.transcriptionEngine
    ) {
      await this.initialize(newOptions);
    } else {
      this.currentOptions = newOptions;
    }
  }

  /**
   * Start audio recording
   */
  async startRecording(options?: RecordingOptions): Promise<void> {
    if (!this.initialized) {
      throw new Error('Audio service not initialized');
    }

    const recordingOptions = {
      duration: options?.duration,
      quality: options?.quality || 'high',
      format: options?.format || 'webm',
    };

    // Convert service options to AudioManager format
    const audioManagerOptions = {
      sampleRate: this.getQualitySampleRate(recordingOptions.quality),
      channelCount: 1, // Mono for transcription
      mimeType: this.getFormatMimeType(recordingOptions.format),
      maxDuration: recordingOptions.duration ? recordingOptions.duration * 1000 : undefined,
    };

    await this.audioManager.startRecording(audioManagerOptions);

    // Track session start time
    this.sessionStartTime = Date.now();
  }

  /**
   * Stop current recording
   */
  async stopRecording(): Promise<{ audio: Blob; transcript?: string }> {
    if (!this.initialized) {
      throw new Error('Audio service not initialized');
    }

    const result = await this.audioManager.stopRecording();

    // Track session duration
    if (this.sessionStartTime && this.sessionId) {
      const duration = Date.now() - this.sessionStartTime;
      this.sessionHistory.push({
        id: this.sessionId,
        timestamp: this.sessionStartTime,
        duration,
      });

      // Limit session history size
      if (this.sessionHistory.length > 100) {
        this.sessionHistory = this.sessionHistory.slice(-100);
      }
    }

    this.sessionStartTime = null;

    return {
      audio: result.audio,
      transcript: result.transcript,
    };
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.audioManager.isCurrentlyRecording();
  }

  /**
   * Pause current recording (if supported)
   */
  async pauseRecording(): Promise<void> {
    // AudioManager doesn't have pause/resume, implement if needed
    throw new Error('Pause/resume functionality not yet implemented');
  }

  /**
   * Resume paused recording (if supported)
   */
  async resumeRecording(): Promise<void> {
    // AudioManager doesn't have pause/resume, implement if needed
    throw new Error('Pause/resume functionality not yet implemented');
  }

  /**
   * Transcribe audio blob to text
   */
  async transcribeAudio(audio: Blob, engineName?: string): Promise<TranscriptionResponse> {
    if (!this.initialized) {
      throw new Error('Audio service not initialized');
    }

    return this.audioManager.transcribeAudio(audio, engineName);
  }

  /**
   * Transcribe audio file to text
   */
  async transcribeFile(file: File, engineName?: string): Promise<TranscriptionResponse> {
    if (!this.initialized) {
      throw new Error('Audio service not initialized');
    }

    // Convert File to Blob for AudioManager compatibility
    const audioBlob = new Blob([file], { type: file.type });
    return this.audioManager.transcribeAudio(audioBlob, engineName);
  }

  /**
   * Get available transcription engines
   */
  async getTranscriptionEngines(): Promise<string[]> {
    if (!this.initialized) {
      return [];
    }

    const engines = await this.audioManager.getAvailableEngines();
    return engines.transcription;
  }

  /**
   * Set preferred transcription engine
   */
  setPreferredTranscriptionEngine(engineName: string): void {
    this.currentOptions.transcriptionEngine = engineName;
  }

  /**
   * Get available recording and transcription engines
   */
  async getAvailableEngines(): Promise<{ recording: string[]; transcription: string[] }> {
    if (!this.initialized) {
      return { recording: [], transcription: [] };
    }

    return this.audioManager.getAvailableEngines();
  }

  /**
   * Get currently active engines
   */
  getCurrentEngines(): { recording?: string; transcription?: string } {
    if (!this.initialized) {
      return {};
    }

    return this.audioManager.getCurrentEngines();
  }

  /**
   * Test if a specific engine is available
   */
  async testEngine(engineName: string, type: 'recording' | 'transcription'): Promise<boolean> {
    if (!this.initialized) {
      return false;
    }

    try {
      const engines = await this.getAvailableEngines();
      const availableEngines = type === 'recording' ? engines.recording : engines.transcription;
      return availableEngines.includes(engineName);
    } catch (error) {
      console.warn(`Failed to test engine ${engineName}:`, error);
      return false;
    }
  }

  /**
   * Re-scan for available engines
   */
  async refreshEngines(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    // Re-initialize to refresh engine detection
    await this.initialize(this.currentOptions);
  }

  /**
   * Register callback for real-time transcription updates
   */
  onRealtimeTranscript(callback: (text: string, isFinal: boolean) => void): void {
    this.realtimeCallbacks.add(callback);
  }

  /**
   * Unregister real-time transcription callback
   */
  offRealtimeTranscript(callback: (text: string, isFinal: boolean) => void): void {
    this.realtimeCallbacks.delete(callback);
  }

  /**
   * Enable or disable real-time transcription
   */
  enableRealtimeTranscription(enabled: boolean): void {
    this.currentOptions.realtimeTranscription = enabled;
  }

  /**
   * Check if real-time transcription is enabled
   */
  isRealtimeTranscriptionEnabled(): boolean {
    return this.currentOptions.realtimeTranscription === true;
  }

  /**
   * Process audio with filters and effects
   */
  async processAudio(audio: Blob, options: any): Promise<Blob> {
    // Basic audio processing - extend as needed
    try {
      const arrayBuffer = await audio.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Apply processing (placeholder for now)
      // Could add noise reduction, normalization, etc.

      // Convert back to blob
      const processedBuffer = audioBuffer; // Apply actual processing here

      // Create new blob from processed data
      const offlineContext = new OfflineAudioContext(
        processedBuffer.numberOfChannels,
        processedBuffer.length,
        processedBuffer.sampleRate
      );

      const source = offlineContext.createBufferSource();
      source.buffer = processedBuffer;
      source.connect(offlineContext.destination);
      source.start();

      const renderedBuffer = await offlineContext.startRendering();

      // Convert to WAV blob (simplified)
      const wavBlob = this.audioBufferToWav(renderedBuffer);

      return wavBlob;
    } catch (error) {
      console.warn('Audio processing failed, returning original:', error);
      return audio;
    }
  }

  /**
   * Get metadata from audio blob
   */
  async getAudioMetadata(audio: Blob): Promise<{ duration: number; sampleRate: number; channels: number }> {
    try {
      const arrayBuffer = await audio.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      return {
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels,
      };
    } catch (error) {
      console.warn('Failed to get audio metadata:', error);
      return { duration: 0, sampleRate: 0, channels: 0 };
    }
  }

  /**
   * Convert audio to different format
   */
  async convertAudioFormat(audio: Blob, format: string): Promise<Blob> {
    // Basic format conversion - extend as needed
    if (audio.type.includes(format)) {
      return audio; // Already in target format
    }

    // For now, just change the mime type
    return new Blob([audio], { type: `audio/${format}` });
  }

  /**
   * Normalize audio levels
   */
  async normalizeAudio(audio: Blob): Promise<Blob> {
    try {
      const arrayBuffer = await audio.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Find peak amplitude
      let maxAmplitude = 0;
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        for (let i = 0; i < channelData.length; i++) {
          maxAmplitude = Math.max(maxAmplitude, Math.abs(channelData[i]));
        }
      }

      // Normalize to 80% of maximum to prevent clipping
      const targetAmplitude = 0.8;
      const gain = maxAmplitude > 0 ? targetAmplitude / maxAmplitude : 1;

      // Apply gain
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        for (let i = 0; i < channelData.length; i++) {
          channelData[i] *= gain;
        }
      }

      return this.audioBufferToWav(audioBuffer);
    } catch (error) {
      console.warn('Audio normalization failed, returning original:', error);
      return audio;
    }
  }

  /**
   * Start a recording session with identifier
   */
  startSession(sessionId: string): void {
    this.sessionId = sessionId;
  }

  /**
   * End current recording session
   */
  endSession(): void {
    this.sessionId = null;
    this.sessionStartTime = null;
  }

  /**
   * Get current session identifier
   */
  getCurrentSession(): string | null {
    return this.sessionId;
  }

  /**
   * Get session history
   */
  getSessionHistory(): Array<{ id: string; timestamp: number; duration: number }> {
    return [...this.sessionHistory];
  }

  /**
   * Clean up resources and dispose service
   */
  async dispose(): Promise<void> {
    try {
      // Stop recording if in progress
      if (this.isRecording()) {
        await this.audioManager.stopRecording();
      }

      // Clear callbacks
      this.realtimeCallbacks.clear();

      // Dispose AudioManager
      await this.audioManager.dispose();

      this.initialized = false;
    } catch (error) {
      console.warn('Error during audio service disposal:', error);
    }
  }

  /**
   * Clean up temporary files and resources
   */
  async cleanup(): Promise<void> {
    // Clear session history
    this.sessionHistory = [];

    // Reset session state
    this.sessionId = null;
    this.sessionStartTime = null;
  }

  /**
   * Reset service to initial state
   */
  async reset(): Promise<void> {
    await this.dispose();
    this.audioManager = new AudioManager();
    this.setupEventListeners();
    this.currentOptions = {};
    await this.cleanup();
  }

  /**
   * Set up event listeners for AudioManager events
   */
  private setupEventListeners(): void {
    // Set up real-time transcription event forwarding
    // This would connect to AudioManager's real-time events
    // For now, this is a placeholder
  }

  /**
   * Get sample rate based on quality setting
   */
  private getQualitySampleRate(quality: 'low' | 'medium' | 'high'): number {
    switch (quality) {
      case 'low': return 16000;
      case 'medium': return 22050;
      case 'high': return 44100;
      default: return 44100;
    }
  }

  /**
   * Get MIME type for audio format
   */
  private getFormatMimeType(format: 'wav' | 'mp3' | 'webm'): string {
    switch (format) {
      case 'wav': return 'audio/wav';
      case 'mp3': return 'audio/mp3';
      case 'webm': return 'audio/webm';
      default: return 'audio/webm';
    }
  }

  /**
   * Convert AudioBuffer to WAV blob
   */
  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const length = buffer.length * buffer.numberOfChannels * 2;
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, buffer.numberOfChannels, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * buffer.numberOfChannels * 2, true);
    view.setUint16(32, buffer.numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);

    // Convert audio data
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }
}