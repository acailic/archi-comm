// src/lib/audio/transformers-engine.ts
// Browser-based transcription using Transformers.js and Moonshine models
// Fully offline, privacy-focused transcription without backend dependencies
// RELEVANT FILES: src/lib/audio/transcription-engines.ts, src/lib/audio/audio-processor.ts

import { pipeline, AutomaticSpeechRecognitionPipeline, env } from '@xenova/transformers';
import { TranscriptionEngine, TranscriptionEngineOptions } from './transcription-engines';
import type { TranscriptionResponse, TranscriptionSegment, TranscriptionOptions } from '../../shared/contracts';

export class TransformersJSEngine implements TranscriptionEngine {
  name = 'Transformers.js';
  type: 'offline' = 'offline';
  
  private pipeline: AutomaticSpeechRecognitionPipeline | null = null;
  private modelName = 'microsoft/speecht5_asr';
  private isInitialized = false;
  private supportsChunking = false;
  
  async isAvailable(): Promise<boolean> {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') return false;
      
      // Check if Transformers.js is available
      return typeof pipeline !== 'undefined';
    } catch {
      return false;
    }
  }
  
  async initialize(options: TranscriptionEngineOptions = {}): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Select model based on options
      const modelSize = options.modelSize || 'base';
      this.modelName = this.selectModel(modelSize);
      this.supportsChunking = /whisper/i.test(this.modelName);
      
      // Allow loading models from CDN/remote if needed
      try {
        env.allowRemoteModels = true;
      } catch (e) {
        // Non-fatal; proceed without changing env if unavailable
      }
      
      // Initialize Transformers.js pipeline with error handling
      this.pipeline = await pipeline('automatic-speech-recognition', this.modelName, {
        // Configure pipeline options
        device: 'cpu', // Force CPU for compatibility
        progress_callback: (data: any) => {
          console.log('Model loading progress:', data);
        }
      });
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Transformers.js engine:', error);
      throw new Error(`TransformersJS initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async transcribe(audio: Blob | ArrayBuffer, options?: TranscriptionOptions): Promise<TranscriptionResponse> {
    if (!this.isInitialized || !this.pipeline) {
      await this.initialize();
    }
    
    if (!this.pipeline) {
      throw new Error('Pipeline not initialized');
    }
    
    try {
      // Convert audio to required format (Float32Array PCM)
      const audioData = await this.preprocessAudio(audio);
      
      // Run transcription through pipeline
      const callOptions: any = {
        return_timestamps: true,
        language: options?.language || 'english'
      };

      // Only provide chunking/stride options if supported by the model
      if (this.supportsChunking) {
        callOptions.chunk_length_s = options?.maxSegments ? 30 : undefined;
        callOptions.stride_length_s = 5;
      }

      const result = await this.pipeline(audioData, callOptions);
      
      // Convert result to our standard format
      return this.formatResult(result);
      
    } catch (error) {
      console.error('Transcription failed:', error);
      throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async dispose(): Promise<void> {
    if (this.pipeline) {
      // Dispose of the pipeline and free memory
      try {
        await (this.pipeline as any).dispose?.();
      } catch (error) {
        console.warn('Error disposing pipeline:', error);
      }
      this.pipeline = null;
    }
    this.isInitialized = false;
  }
  
  private selectModel(size: string): string {
    // Map model sizes to actual model names
    const models = {
      tiny: 'Xenova/whisper-tiny.en',
      base: 'Xenova/whisper-base.en',
      small: 'Xenova/whisper-small.en',
      medium: 'Xenova/whisper-medium.en',
      large: 'Xenova/whisper-large-v2'
    };
    
    return models[size as keyof typeof models] || models.base;
  }
  
  private async preprocessAudio(audio: Blob | ArrayBuffer): Promise<Float32Array> {
    try {
      // Convert input to AudioBuffer
      let audioBuffer: AudioBuffer;
      
      if (audio instanceof Blob) {
        const arrayBuffer = await audio.arrayBuffer();
        audioBuffer = await this.decodeAudioData(arrayBuffer);
      } else {
        audioBuffer = await this.decodeAudioData(audio);
      }
      
      // Resample to 16kHz mono as required by Whisper models
      const resampledBuffer = await this.resampleTo16kHz(audioBuffer);
      
      // Extract PCM data
      return resampledBuffer.getChannelData(0);
      
    } catch (error) {
      console.error('Audio preprocessing failed:', error);
      throw new Error(`Audio preprocessing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private async decodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    return await audioContext.decodeAudioData(arrayBuffer);
  }
  
  private async resampleTo16kHz(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
    const targetSampleRate = 16000;
    const targetChannels = 1;
    
    if (audioBuffer.sampleRate === targetSampleRate && audioBuffer.numberOfChannels === targetChannels) {
      return audioBuffer;
    }
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const offlineContext = new OfflineAudioContext(
      targetChannels,
      Math.ceil(audioBuffer.duration * targetSampleRate),
      targetSampleRate
    );
    
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start(0);
    
    return await offlineContext.startRendering();
  }
  
  private formatResult(result: any): TranscriptionResponse {
    // Handle different result formats from Transformers.js
    if (typeof result === 'string') {
      return {
        text: result,
        segments: []
      };
    }
    
    if (result.text) {
      const segments: TranscriptionSegment[] = [];
      
      // If chunks are available, convert them to segments
      if (result.chunks && Array.isArray(result.chunks)) {
        for (const chunk of result.chunks) {
          segments.push({
            text: chunk.text || '',
            start: chunk.timestamp?.[0] || 0,
            end: chunk.timestamp?.[1] || 0,
            confidence: 0.9 // Transformers.js doesn't provide confidence scores
          });
        }
      }
      
      return {
        text: result.text,
        segments
      };
    }
    
    // Fallback for unexpected formats
    return {
      text: JSON.stringify(result),
      segments: []
    };
  }
}
