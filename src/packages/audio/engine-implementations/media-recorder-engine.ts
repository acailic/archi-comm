// src/lib/audio/engine-implementations/media-recorder-engine.ts
// Enhanced MediaRecorder engine with better error handling and format support
// Builds upon the existing implementation in AudioRecording.tsx
// RELEVANT FILES: src/components/AudioRecording.tsx, src/lib/audio/recording-engines.ts

import { RecordingEngine, RecordingOptions } from '../recording-engines';

export class MediaRecorderEngine implements RecordingEngine {
  name = 'MediaRecorder';
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: BlobPart[] = [];
  private resolveRecording: ((blob: Blob) => void) | null = null;
  private rejectRecording: ((error: Error) => void) | null = null;
  
  async isSupported(): Promise<boolean> {
    return !!(navigator.mediaDevices && 
             navigator.mediaDevices.getUserMedia && 
             typeof MediaRecorder !== 'undefined');
  }
  
  async startRecording(options: RecordingOptions = {}): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      throw new Error('Recording already in progress');
    }
    
    try {
      // Enhanced implementation with better MIME type detection
      // Improved error handling and stream configuration
      // Support for advanced audio constraints
      
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: options.echoCancellation ?? true,
          noiseSuppression: options.noiseSuppression ?? true,
          autoGainControl: options.autoGainControl ?? true,
          sampleRate: options.sampleRate,
          channelCount: options.channelCount
        }
      };
      
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Enhanced MIME type selection with quality preferences
      const mimeType = this.selectBestMimeType(options.mimeType);
      const recorderOptions: MediaRecorderOptions = {};
      
      if (mimeType) {
        recorderOptions.mimeType = mimeType;
      }
      
      if (options.audioBitsPerSecond) {
        recorderOptions.audioBitsPerSecond = options.audioBitsPerSecond;
      }
      
      this.mediaRecorder = new MediaRecorder(this.stream, recorderOptions);
      this.setupEventHandlers();
      
      this.chunks = [];
      this.mediaRecorder.start();
      
    } catch (error) {
      this.cleanup();
      throw new Error(`Failed to start MediaRecorder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        resolve(new Blob());
        return;
      }
      
      if (this.mediaRecorder.state === 'inactive') {
        // Already stopped, return existing chunks
        const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(this.chunks, { type: mimeType });
        this.cleanup();
        resolve(blob);
        return;
      }
      
      this.resolveRecording = resolve;
      this.rejectRecording = reject;
      
      try {
        this.mediaRecorder.stop();
        
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
          this.stream = null;
        }
      } catch (error) {
        this.cleanup();
        reject(new Error(`Failed to stop MediaRecorder: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }
  
  async pauseRecording(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }
  }
  
  async resumeRecording(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
    }
  }
  
  getAudioStream(): MediaStream | null {
    return this.stream;
  }
  
  private selectBestMimeType(preferred?: string): string | null {
    // Enhanced MIME type selection logic from AudioRecording.tsx
    // Prioritizes quality and compatibility
    const candidates = [
      preferred,
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4;codecs=mp4a.40.2',
      'audio/mp4',
      'audio/wav'
    ].filter(Boolean) as string[];
    
    for (const mimeType of candidates) {
      if (MediaRecorder.isTypeSupported?.(mimeType)) {
        return mimeType;
      }
    }
    
    return null;
  }
  
  private setupEventHandlers(): void {
    if (!this.mediaRecorder) return;
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };
    
    this.mediaRecorder.onstop = () => {
      const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
      const blob = new Blob(this.chunks, { type: mimeType });
      
      if (this.resolveRecording) {
        this.resolveRecording(blob);
        this.resolveRecording = null;
        this.rejectRecording = null;
      }
      
      this.cleanup();
    };
    
    this.mediaRecorder.onerror = (event) => {
      const error = new Error(`MediaRecorder error: ${(event as any).error || 'Unknown error'}`);
      console.error('MediaRecorder error:', event);
      
      if (this.rejectRecording) {
        this.rejectRecording(error);
        this.resolveRecording = null;
        this.rejectRecording = null;
      }
      
      this.cleanup();
    };
    
    this.mediaRecorder.onstart = () => {
      console.log('MediaRecorder started');
    };
    
    this.mediaRecorder.onpause = () => {
      console.log('MediaRecorder paused');
    };
    
    this.mediaRecorder.onresume = () => {
      console.log('MediaRecorder resumed');
    };
  }
  
  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    this.mediaRecorder = null;
    this.chunks = [];
    this.resolveRecording = null;
    this.rejectRecording = null;
  }
}