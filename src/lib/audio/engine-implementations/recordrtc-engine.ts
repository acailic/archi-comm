// src/lib/audio/engine-implementations/recordrtc-engine.ts
// RecordRTC-based recording engine for better cross-browser support
// Provides additional features like pause/resume and format conversion
// RELEVANT FILES: src/lib/audio/recording-engines.ts

import RecordRTC from 'recordrtc';
import { RecordingEngine, RecordingOptions } from '../recording-engines';

export class RecordRTCEngine implements RecordingEngine {
  name = 'RecordRTC';
  private recorder: RecordRTC | null = null;
  private stream: MediaStream | null = null;
  
  async isSupported(): Promise<boolean> {
    return !!(navigator.mediaDevices && 
             navigator.mediaDevices.getUserMedia && 
             typeof RecordRTC !== 'undefined');
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
      
      const recordRTCOptions = {
        type: 'audio',
        mimeType: options.mimeType || 'audio/wav',
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
}