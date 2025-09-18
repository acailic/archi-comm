// src/packages/audio/transcription/realtime-transcription.ts
// Real-time transcription using Web Speech API and streaming audio
// Provides immediate feedback during recording
// RELEVANT FILES: src/components/AudioRecording.tsx, src/packages/audio/audio-manager.ts

export interface RealtimeTranscriptionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  confidenceThreshold?: number;
}

export class RealtimeTranscriptionManager {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private onTranscriptCallback?: (text: string, isFinal: boolean) => void;
  private onErrorCallback?: (error: string) => void;
  private finalTranscript = '';
  private interimTranscript = '';
  
  async isAvailable(): Promise<boolean> {
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }
  
  async startRealtime(options: RealtimeTranscriptionOptions): Promise<void> {
    if (this.isListening) {
      await this.stopRealtime();
    }
    
    if (!await this.isAvailable()) {
      throw new Error('Speech recognition not available in this browser');
    }
    
    try {
      // Initialize Web Speech API
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      // Configure recognition parameters
      this.recognition.continuous = options.continuous ?? true;
      this.recognition.interimResults = options.interimResults ?? true;
      this.recognition.maxAlternatives = options.maxAlternatives ?? 1;
      this.recognition.lang = options.language || 'en-US';
      
      // Set up event handlers
      this.setupEventHandlers(options.confidenceThreshold || 0.7);
      
      // Reset transcripts
      this.finalTranscript = '';
      this.interimTranscript = '';
      
      // Start listening
      this.recognition.start();
      this.isListening = true;
      
    } catch (error) {
      console.error('Failed to start real-time transcription:', error);
      throw new Error(`Real-time transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async stopRealtime(): Promise<void> {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }
  
  onTranscript(callback: (text: string, isFinal: boolean) => void): void {
    this.onTranscriptCallback = callback;
  }
  
  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }
  
  getFinalTranscript(): string {
    return this.finalTranscript;
  }
  
  getInterimTranscript(): string {
    return this.interimTranscript;
  }
  
  isCurrentlyListening(): boolean {
    return this.isListening;
  }
  
  private setupEventHandlers(confidenceThreshold: number): void {
    if (!this.recognition) return;
    
    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      this.handleSpeechResult(event, confidenceThreshold);
    };
    
    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorMessage = `Speech recognition error: ${event.error}`;
      console.error(errorMessage, event);
      
      this.onErrorCallback?.(errorMessage);
      
      // Handle specific errors
      if (event.error === 'no-speech') {
        // User didn't speak, restart recognition
        setTimeout(() => {
          if (this.isListening && this.recognition) {
            try {
              this.recognition.start();
            } catch (e) {
              console.warn('Failed to restart recognition:', e);
            }
          }
        }, 1000);
      } else if (event.error === 'aborted' || event.error === 'not-allowed') {
        // Stop listening on critical errors
        this.isListening = false;
      }
    };
    
    this.recognition.onstart = () => {
      console.log('Real-time transcription started');
    };
    
    this.recognition.onend = () => {
      console.log('Real-time transcription ended');
      
      // Restart recognition if we're still supposed to be listening
      if (this.isListening) {
        setTimeout(() => {
          if (this.isListening && this.recognition) {
            try {
              this.recognition.start();
            } catch (error) {
              console.warn('Failed to restart recognition:', error);
              this.isListening = false;
            }
          }
        }, 100);
      }
    };
    
    this.recognition.onnomatch = () => {
      console.log('No speech recognition match');
    };
    
    this.recognition.onsoundstart = () => {
      console.log('Sound detected');
    };
    
    this.recognition.onsoundend = () => {
      console.log('Sound ended');
    };
    
    this.recognition.onspeechstart = () => {
      console.log('Speech detected');
    };
    
    this.recognition.onspeechend = () => {
      console.log('Speech ended');
    };
  }
  
  private handleSpeechResult(event: SpeechRecognitionEvent, confidenceThreshold: number): void {
    let interimTranscript = '';
    let finalTranscript = '';
    
    // Process all results from the current recognition
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence || 1.0;
      
      // Only use results above confidence threshold
      if (confidence >= confidenceThreshold) {
        if (result.isFinal) {
          finalTranscript += transcript;
          this.finalTranscript += transcript + ' ';
          
          // Emit final transcript
          this.onTranscriptCallback?.(transcript, true);
        } else {
          interimTranscript += transcript;
        }
      }
    }
    
    // Update interim transcript
    if (interimTranscript !== this.interimTranscript) {
      this.interimTranscript = interimTranscript;
      
      // Emit interim transcript
      this.onTranscriptCallback?.(interimTranscript, false);
    }
  }
  
  // Utility method to reset transcripts
  clearTranscripts(): void {
    this.finalTranscript = '';
    this.interimTranscript = '';
  }
  
  // Method to manually add text to final transcript
  addToFinalTranscript(text: string): void {
    this.finalTranscript += text + ' ';
  }
}