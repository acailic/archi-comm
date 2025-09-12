// src/lib/audio/engine-implementations/whisper-rust-engine.ts
// Wrapper for the existing Whisper-rs transcription via Tauri backend
// Integrates the current implementation with the new engine system
// RELEVANT FILES: src/lib/tauri.ts, src/lib/audio/transcription-engines.ts

import { TranscriptionEngine, TranscriptionEngineOptions } from '../transcription-engines';
import type { TranscriptionResponse, TranscriptionOptions } from '../../../shared/contracts';

export class WhisperRustEngine implements TranscriptionEngine {
  name = 'Whisper-rs';
  type: 'offline' = 'offline';
  private isInitialized = false;
  private options: TranscriptionEngineOptions = {};
  
  async isAvailable(): Promise<boolean> {
    // Check if we're in Tauri environment and Whisper-rs is available
    try {
      const isTauri = (window as any).__TAURI__ !== undefined;
      if (!isTauri) return false;
      
      // Dynamically import transcriptionUtils to test availability
      const { transcriptionUtils } = await import('../../tauri');
      
      // Test the transcription pipeline with a minimal call
      const testResult = await transcriptionUtils.testTranscriptionPipeline('');
      return testResult.success || testResult.error?.includes('File path is required');
    } catch (error) {
      console.warn('Whisper-rs not available:', error);
      return false;
    }
  }
  
  async initialize(options: TranscriptionEngineOptions = {}): Promise<void> {
    this.options = {
      modelSize: 'base',
      language: 'auto',
      task: 'transcribe',
      enableTimestamps: true,
      enableWordLevelTimestamps: false,
      ...options
    };
    
    this.isInitialized = true;
  }
  
  async transcribe(audio: Blob | ArrayBuffer, options?: TranscriptionOptions): Promise<TranscriptionResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    try {
      // Dynamically import audio and transcription utils
      const { audioUtils, transcriptionUtils } = await import('../../tauri');
      
      // Convert audio to file path using existing audioUtils
      let filePath: string;
      if (audio instanceof Blob) {
        filePath = await audioUtils.saveAudioBlob(audio);
      } else {
        // Convert ArrayBuffer to Blob first
        const blob = new Blob([audio], { type: 'audio/wav' });
        filePath = await audioUtils.saveAudioBlob(blob);
      }
      
      // Use existing transcription utility with enhanced options
      const transcriptionOptions: TranscriptionOptions = {
        timeout: options?.timeout || 300000, // 5 minutes default
        jobId: options?.jobId || `job_${Date.now()}`,
        maxSegments: options?.maxSegments,
        language: this.options.language,
        ...this.mapEngineOptionsToTranscriptionOptions(this.options)
      };
      
      const result = await transcriptionUtils.transcribeAudio(filePath, transcriptionOptions);
      
      // Clean up temporary file after a short delay
      setTimeout(() => {
        audioUtils.cleanupAudioFile(filePath).catch(console.warn);
      }, 1000);
      
      return result;
      
    } catch (error) {
      console.error('Whisper-rs transcription failed:', error);
      throw new Error(`Whisper-rs transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async dispose(): Promise<void> {
    this.isInitialized = false;
    this.options = {};
  }
  
  private mapEngineOptionsToTranscriptionOptions(engineOptions: TranscriptionEngineOptions): Partial<TranscriptionOptions> {
    return {
      // Map engine options to transcription options
      // This allows the engine system to configure the underlying Whisper-rs calls
      language: engineOptions.language
    };
  }
  
  // Additional methods specific to Whisper-rs
  async cancelTranscription(jobId: string): Promise<boolean> {
    try {
      const { transcriptionUtils } = await import('../../tauri');
      return await transcriptionUtils.cancelTranscription(jobId);
    } catch (error) {
      console.error('Failed to cancel transcription:', error);
      return false;
    }
  }
  
  async testPipeline(filePath: string): Promise<{ success: boolean; error?: string; result?: TranscriptionResponse }> {
    try {
      const { transcriptionUtils } = await import('../../tauri');
      return await transcriptionUtils.testTranscriptionPipeline(filePath);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  // Method to get current model information
  async getModelInfo(): Promise<{ modelSize: string; language: string }> {
    return {
      modelSize: this.options.modelSize || 'base',
      language: this.options.language || 'auto'
    };
  }
  
  // Method to update engine options
  async updateOptions(newOptions: Partial<TranscriptionEngineOptions>): Promise<void> {
    this.options = { ...this.options, ...newOptions };
  }
}