// src/packages/audio/engine-implementations/web-speech-engine.ts
// Web Speech API engine for real-time browser-based transcription
// Provides immediate feedback during recording
// RELEVANT FILES: src/packages/audio/transcription/transcription-engines.ts

import { TranscriptionEngine, TranscriptionEngineOptions } from '../transcription/transcription-engines';
import type { TranscriptionResponse, TranscriptionSegment } from '../@shared/contracts';

export class WebSpeechEngine implements TranscriptionEngine {
  name = 'Web Speech API';
  type: 'realtime' = 'realtime';
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private options: TranscriptionEngineOptions = {};
  private currentTranscript = '';
  private segments: TranscriptionSegment[] = [];
  private startTime = 0;
  private onTranscriptCallback?: (text: string, isFinal: boolean) => void;
  
  async isAvailable(): Promise<boolean> {
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }
  
  async initialize(options: TranscriptionEngineOptions = {}): Promise<void> {
    this.options = {
      language: 'en-US',
      enableTimestamps: true,
      ...options
    };
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      throw new Error('Web Speech API not supported in this browser');
    }
    
    this.recognition = new SpeechRecognition();
    this.setupRecognition();
  }
  
  async transcribe(audio: Blob | ArrayBuffer): Promise<TranscriptionResponse> {
    // Web Speech API doesn't support file-based transcription
    // This method is mainly for compatibility with the interface
    console.warn('Web Speech API only supports real-time transcription. Use transcribeRealtime() instead.');
    
    // Return empty result for file-based transcription
    return {
      text: 'Web Speech API only supports real-time transcription',
      segments: []
    };
  }
  
  async transcribeRealtime(stream: MediaStream, callback: (text: string, isFinal: boolean) => void): Promise<void> {
    if (!this.recognition) {
      await this.initialize();
    }
    
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not initialized'));
        return;
      }
      
      this.onTranscriptCallback = callback;
      this.currentTranscript = '';
      this.segments = [];
      this.startTime = Date.now();
      
      this.recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          const confidence = result[0].confidence || 0.9;
          
          if (result.isFinal) {
            finalTranscript += transcript;
            
            // Create segment for final result
            const now = Date.now();
            const segment: TranscriptionSegment = {
              text: transcript,
              start: (now - this.startTime) / 1000,
              end: (now - this.startTime) / 1000 + 1, // Approximate end time
              confidence
            };
            
            this.segments.push(segment);
            this.currentTranscript += transcript + ' ';
            
            callback(transcript, true);
          } else {
            interimTranscript += transcript;
            callback(transcript, false);
          }
        }
      };
      
      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        this.isListening = false;
        reject(new Error(`Speech recognition error: ${event.error}`));
      };
      
      this.recognition.onend = () => {
        this.isListening = false;
        resolve();
      };
      
      this.recognition.onstart = () => {
        this.isListening = true;
        console.log('Web Speech API started listening');
      };
      
      try {
        this.recognition.start();
      } catch (error) {
        reject(new Error(`Failed to start speech recognition: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }
  
  async stopRealtime(): Promise<TranscriptionResponse> {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
    
    return {
      text: this.currentTranscript.trim(),
      segments: this.segments
    };
  }
  
  async dispose(): Promise<void> {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
    
    this.recognition = null;
    this.isListening = false;
    this.currentTranscript = '';
    this.segments = [];
    this.onTranscriptCallback = undefined;
  }
  
  isListeningNow(): boolean {
    return this.isListening;
  }
  
  getCurrentTranscript(): string {
    return this.currentTranscript;
  }
  
  getSegments(): TranscriptionSegment[] {
    return [...this.segments];
  }
  
  private setupRecognition(): void {
    if (!this.recognition) return;
    
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    this.recognition.lang = this.options.language || 'en-US';
    
    // Additional event handlers for better debugging and user feedback
    this.recognition.onsoundstart = () => {
      console.log('Web Speech API: Sound detected');
    };
    
    this.recognition.onsoundend = () => {
      console.log('Web Speech API: Sound ended');
    };
    
    this.recognition.onspeechstart = () => {
      console.log('Web Speech API: Speech detected');
    };
    
    this.recognition.onspeechend = () => {
      console.log('Web Speech API: Speech ended');
    };
    
    this.recognition.onnomatch = () => {
      console.log('Web Speech API: No speech match');
    };
    
    this.recognition.onaudiostart = () => {
      console.log('Web Speech API: Audio capture started');
    };
    
    this.recognition.onaudioend = () => {
      console.log('Web Speech API: Audio capture ended');
    };
  }
  
  // Utility methods for managing the engine
  setLanguage(language: string): void {
    this.options.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }
  
  getLanguage(): string {
    return this.options.language || 'en-US';
  }
  
  getSupportedLanguages(): string[] {
    // Common supported languages for Web Speech API
    return [
      'en-US', 'en-GB', 'en-AU', 'en-CA', 'en-IN', 'en-NZ', 'en-ZA',
      'es-ES', 'es-MX', 'es-AR', 'es-CO', 'es-CL', 'es-PE', 'es-VE',
      'fr-FR', 'fr-CA', 'fr-BE', 'fr-CH',
      'de-DE', 'de-AT', 'de-CH',
      'it-IT', 'it-CH',
      'pt-BR', 'pt-PT',
      'ru-RU',
      'ja-JP',
      'ko-KR',
      'zh-CN', 'zh-HK', 'zh-TW',
      'nl-NL', 'nl-BE',
      'sv-SE',
      'no-NO',
      'da-DK',
      'fi-FI',
      'pl-PL',
      'cs-CZ',
      'sk-SK',
      'hu-HU',
      'ro-RO',
      'bg-BG',
      'hr-HR',
      'sl-SI',
      'et-EE',
      'lv-LV',
      'lt-LT',
      'el-GR',
      'tr-TR',
      'ar-SA', 'ar-EG', 'ar-MA', 'ar-DZ', 'ar-BH', 'ar-IQ', 'ar-JO', 'ar-KW', 'ar-LB', 'ar-LY', 'ar-OM', 'ar-QA', 'ar-SY', 'ar-TN', 'ar-AE', 'ar-YE',
      'he-IL',
      'hi-IN',
      'th-TH',
      'vi-VN',
      'id-ID',
      'ms-MY',
      'uk-UA'
    ];
  }
}