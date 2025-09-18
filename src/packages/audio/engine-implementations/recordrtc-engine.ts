// src/packages/audio/engine-implementations/recordrtc-engine.ts
// RecordRTC-based recording engine for better cross-browser support
// Provides additional features like pause/resume and format conversion
// RELEVANT FILES: src/packages/audio/engines/recording-engines.ts

import { RecordingEngine, RecordingOptions } from '../engines/recording-engines';

export class RecordRTCEngine implements RecordingEngine {
  name = 'RecordRTC';
  private recorder: any | null = null;
  private stream: MediaStream | null = null;
  private RecordRTCRef: any | null = null;
  
  async isSupported(): Promise<boolean> {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }
  
  async startRecording(options: RecordingOptions = {}): Promise<void> {
    if (this.recorder) {
      throw new Error('RecordRTC recording already in progress');
    }
    
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: options.echoCancellation ?? true,
          noiseSuppression: options.noiseSuppression ?? true,
          autoGainControl: options.autoGainControl ?? true,
          sampleRate: options.sampleRate || 44100,
          channelCount: options.channelCount || 1
        }
      };
      
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      const RecordRTC = await this.getRecordRTC();

      const recordRTCOptions = {
        type: 'audio',
        mimeType: options.mimeType || 'audio/processing/wav',
        recorderType: RecordRTC.StereoAudioRecorder,
        numberOfAudioChannels: options.channelCount || 1,
        desiredSampRate: options.sampleRate || 16000,
        audioBitsPerSecond: options.audioBitsPerSecond || 128000,
        
        // Enhanced features
        checkForInactiveTracks: true,
        bufferSize: 16384,
        sampleRate: options.sampleRate || 16000
      };
      
      this.recorder = new RecordRTC(this.stream, recordRTCOptions);
      this.recorder.startRecording();
      
    } catch (error) {
      this.cleanup();
      throw new Error(`Failed to start RecordRTC: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.recorder) {
        resolve(new Blob());
        return;
      }
      
      try {
        this.recorder.stopRecording(() => {
          const blob = this.recorder!.getBlob();
          this.cleanup();
          resolve(blob);
        });
      } catch (error) {
        this.cleanup();
        reject(new Error(`Failed to stop RecordRTC: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }
  
  async pauseRecording(): Promise<void> {
    if (this.recorder) {
      this.recorder.pauseRecording();
    }
  }
  
  async resumeRecording(): Promise<void> {
    if (this.recorder) {
      this.recorder.resumeRecording();
    }
  }
  
  getAudioStream(): MediaStream | null {
    return this.stream;
  }
  
  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.recorder) {
      try {
        this.recorder.destroy();
      } catch (error) {
        console.warn('Error destroying RecordRTC:', error);
      }
      this.recorder = null;
    }
  }

  private async getRecordRTC(): Promise<any> {
    if (this.RecordRTCRef) return this.RecordRTCRef;
    // Check global first
    if ((window as any).RecordRTC) {
      this.RecordRTCRef = (window as any).RecordRTC;
      return this.RecordRTCRef;
    }
    // Inject CDN script (UMD exposes window.RecordRTC)
    await this.injectScript('https://cdn.jsdelivr.net/npm/recordrtc/RecordRTC.min.js');
    if ((window as any).RecordRTC) {
      this.RecordRTCRef = (window as any).RecordRTC;
      return this.RecordRTCRef;
    }
    throw new Error('RecordRTC library not found');
  }

  private injectScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load script ${src}`));
      document.head.appendChild(s);
    });
  }
}
