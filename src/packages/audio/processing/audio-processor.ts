// src/packages/audio/processing/audio-processor.ts
// Audio format conversion, resampling, and enhancement utilities
// Supports multiple input/output formats for transcription engines
// RELEVANT FILES: src/packages/audio/engines/transformers-engine.ts, src/packages/audio/engines/whisper-wasm-engine.ts

import { audioBufferToWav } from './wav';

export interface AudioProcessingOptions {
  targetSampleRate?: number;
  targetChannels?: number;
  outputFormat?: 'wav' | 'mp3' | 'ogg' | 'webm';
  enableNoiseReduction?: boolean;
  enableNormalization?: boolean;
  enableEchoCancellation?: boolean;
}

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  
  async processAudio(input: Blob | ArrayBuffer, options: AudioProcessingOptions): Promise<Blob> {
    try {
      // Initialize audio context if needed
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // Decode audio input
      const audioBuffer = await this.decodeAudio(input);
      
      // Apply processing steps
      let processedBuffer = audioBuffer;
      
      // Resample if needed
      if (options.targetSampleRate && audioBuffer.sampleRate !== options.targetSampleRate) {
        processedBuffer = await this.resampleAudio(processedBuffer, options.targetSampleRate);
      }
      
      // Convert to target channel count
      if (options.targetChannels && audioBuffer.numberOfChannels !== options.targetChannels) {
        processedBuffer = await this.convertChannels(processedBuffer, options.targetChannels);
      }
      
      // Apply audio enhancements
      if (options.enableNormalization) {
        processedBuffer = await this.normalizeAudio(processedBuffer);
      }
      
      if (options.enableNoiseReduction) {
        processedBuffer = await this.reduceNoise(processedBuffer);
      }
      
      // Convert to target format
      return await this.encodeAudio(processedBuffer, options.outputFormat || 'wav');
      
    } catch (error) {
      console.error('Audio processing failed:', error);
      throw new Error(`Audio processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async convertToWav(audioBuffer: AudioBuffer): Promise<Blob> {
    try {
      const wavArrayBuffer = audioBufferToWav(audioBuffer);
      return new Blob([wavArrayBuffer], { type: 'audio/processing/wav' });
    } catch (error) {
      throw new Error(`WAV conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async convertToMp3(audioBuffer: AudioBuffer, bitRate = 128): Promise<Blob> {
    try {
      // To avoid bundling issues, we rely on a global lamejs if present.
      const lamejs: any = (window as any).lamejs;
      if (!lamejs) {
        throw new Error('MP3 encoder unavailable. Include lamejs globally or switch to WAV/OGG/WEBM.');
      }

      const channels = audioBuffer.numberOfChannels;
      const sampleRate = audioBuffer.sampleRate;
      const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, bitRate);

      const mp3Data: Int8Array[] = [];
      const sampleBlockSize = 1152; // Must be multiple of 576

      const left = audioBuffer.getChannelData(0);
      const right = channels > 1 ? audioBuffer.getChannelData(1) : left;

      const leftInt16 = new Int16Array(left.length);
      const rightInt16 = new Int16Array(right.length);
      for (let i = 0; i < left.length; i++) {
        leftInt16[i] = Math.max(-32768, Math.min(32767, left[i] * 32768));
        rightInt16[i] = Math.max(-32768, Math.min(32767, right[i] * 32768));
      }

      for (let i = 0; i < leftInt16.length; i += sampleBlockSize) {
        const leftBlock = leftInt16.subarray(i, i + sampleBlockSize);
        const rightBlock = rightInt16.subarray(i, i + sampleBlockSize);
        const mp3buf = mp3encoder.encodeBuffer(leftBlock, rightBlock);
        if (mp3buf.length > 0) mp3Data.push(mp3buf);
      }

      const mp3buf = mp3encoder.flush();
      if (mp3buf.length > 0) mp3Data.push(mp3buf);
      return new Blob(mp3Data, { type: 'audio/mp3' });
    } catch (error) {
      throw new Error(`MP3 conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async resampleAudio(audioBuffer: AudioBuffer, targetSampleRate: number): Promise<AudioBuffer> {
    if (audioBuffer.sampleRate === targetSampleRate) {
      return audioBuffer;
    }
    
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      Math.ceil(audioBuffer.duration * targetSampleRate),
      targetSampleRate
    );
    
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start(0);
    
    return await offlineContext.startRendering();
  }
  
  async convertChannels(audioBuffer: AudioBuffer, targetChannels: number): Promise<AudioBuffer> {
    if (audioBuffer.numberOfChannels === targetChannels) {
      return audioBuffer;
    }
    
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const newBuffer = this.audioContext.createBuffer(
      targetChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    
    if (targetChannels === 1 && audioBuffer.numberOfChannels > 1) {
      // Convert to mono by averaging channels
      const monoData = new Float32Array(audioBuffer.length);
      
      for (let i = 0; i < audioBuffer.length; i++) {
        let sum = 0;
        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
          sum += audioBuffer.getChannelData(channel)[i];
        }
        monoData[i] = sum / audioBuffer.numberOfChannels;
      }
      
      newBuffer.copyToChannel(monoData, 0);
      
    } else if (targetChannels === 2 && audioBuffer.numberOfChannels === 1) {
      // Convert mono to stereo by duplicating channel
      const monoData = audioBuffer.getChannelData(0);
      newBuffer.copyToChannel(monoData, 0);
      newBuffer.copyToChannel(monoData, 1);
      
    } else {
      // Handle other channel conversions
      for (let channel = 0; channel < Math.min(targetChannels, audioBuffer.numberOfChannels); channel++) {
        newBuffer.copyToChannel(audioBuffer.getChannelData(channel), channel);
      }
    }
    
    return newBuffer;
  }
  
  async extractPCMData(audioBuffer: AudioBuffer): Promise<Float32Array> {
    // Extract PCM data for transcription engines
    const channelData = audioBuffer.getChannelData(0);
    
    // Normalize audio levels
    const maxAmplitude = Math.max(...Array.from(channelData).map(Math.abs));
    if (maxAmplitude > 0) {
      const normalizedData = new Float32Array(channelData.length);
      const scale = 0.95 / maxAmplitude; // Normalize to 95% to avoid clipping
      
      for (let i = 0; i < channelData.length; i++) {
        normalizedData[i] = channelData[i] * scale;
      }
      
      return normalizedData;
    }
    
    return channelData;
  }
  
  private async decodeAudio(input: Blob | ArrayBuffer): Promise<AudioBuffer> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const arrayBuffer = input instanceof Blob ? await input.arrayBuffer() : input;
    return await this.audioContext.decodeAudioData(arrayBuffer);
  }
  
  private async encodeAudio(audioBuffer: AudioBuffer, format: string): Promise<Blob> {
    switch (format.toLowerCase()) {
      case 'wav':
        return await this.convertToWav(audioBuffer);
      
      case 'mp3':
        try {
          return await this.convertToMp3(audioBuffer);
        } catch (e) {
          console.warn('MP3 encoding unavailable, falling back to WAV:', e);
          return await this.convertToWav(audioBuffer);
        }
      
      case 'ogg':
      case 'webm':
        // For OGG/WebM, we'll use MediaRecorder if available
        return await this.encodeWithMediaRecorder(audioBuffer, format);
      
      default:
        // Default to WAV
        return await this.convertToWav(audioBuffer);
    }
  }
  
  private async encodeWithMediaRecorder(audioBuffer: AudioBuffer, format: string): Promise<Blob> {
    // Convert AudioBuffer to MediaStream and use MediaRecorder
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }
    
    // Create a source from the buffer
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    
    // Create MediaStreamDestination
    const destination = this.audioContext.createMediaStreamDestination();
    source.connect(destination);
    
    // Set up MediaRecorder
    const mimeType = format === 'ogg' ? 'audio/ogg' : 'audio/webm';
    const recorder = new MediaRecorder(destination.stream, { mimeType });
    
    const chunks: BlobPart[] = [];
    
    return new Promise((resolve, reject) => {
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: mimeType }));
      };
      
      recorder.onerror = (event) => {
        reject(new Error(`MediaRecorder error: ${event}`));
      };
      
      recorder.start();
      source.start(0);
      
      // Stop recording when audio finishes
      setTimeout(() => {
        recorder.stop();
      }, (audioBuffer.duration * 1000) + 100);
    });
  }
  
  private async normalizeAudio(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const newBuffer = this.audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      const normalizedData = new Float32Array(channelData.length);
      
      // Find peak amplitude
      let maxAmplitude = 0;
      for (let i = 0; i < channelData.length; i++) {
        maxAmplitude = Math.max(maxAmplitude, Math.abs(channelData[i]));
      }
      
      // Normalize to 95% to avoid clipping
      if (maxAmplitude > 0) {
        const scale = 0.95 / maxAmplitude;
        for (let i = 0; i < channelData.length; i++) {
          normalizedData[i] = channelData[i] * scale;
        }
      } else {
        normalizedData.set(channelData);
      }
      
      newBuffer.copyToChannel(normalizedData, channel);
    }
    
    return newBuffer;
  }
  
  private async reduceNoise(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
    // Simple noise reduction using spectral subtraction
    // This is a basic implementation - more sophisticated noise reduction would require FFT
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const newBuffer = this.audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      const processedData = new Float32Array(channelData.length);
      
      // Simple noise gate - reduce quiet sounds
      const noiseFloor = 0.01; // Threshold below which to reduce amplitude
      const reductionFactor = 0.5; // How much to reduce quiet sounds
      
      for (let i = 0; i < channelData.length; i++) {
        const amplitude = Math.abs(channelData[i]);
        if (amplitude < noiseFloor) {
          processedData[i] = channelData[i] * reductionFactor;
        } else {
          processedData[i] = channelData[i];
        }
      }
      
      newBuffer.copyToChannel(processedData, channel);
    }
    
    return newBuffer;
  }
}
