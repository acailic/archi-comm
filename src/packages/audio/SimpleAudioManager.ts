// src/packages/audio/SimpleAudioManager.ts
// Simplified audio manager using only MediaRecorder API
// Replaces complex multi-engine audio system with simple, reliable recording
// RELEVANT FILES: audio-manager.ts (original), AudioRecording.tsx

export interface AudioRecordingConfig {
  mimeType?: string;
  audioBitsPerSecond?: number;
  maxDuration?: number; // in milliseconds
}

export interface RecordingResult {
  id: string;
  blob: Blob;
  duration: number;
  timestamp: Date;
  mimeType: string;
  size: number;
}

export type RecordingState = "idle" | "recording" | "paused" | "stopped";

export interface AudioManagerEvents {
  stateChange: (state: RecordingState) => void;
  dataAvailable: (data: RecordingResult) => void;
  error: (error: Error) => void;
  timeUpdate: (currentTime: number) => void;
}

export class SimpleAudioManager {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private recordedChunks: Blob[] = [];
  private startTime: number = 0;
  private currentState: RecordingState = "idle";
  private config: AudioRecordingConfig;
  private eventListeners: Partial<AudioManagerEvents> = {};
  private timeUpdateInterval: number | null = null;
  private maxDurationTimeout: number | null = null;

  constructor(config: AudioRecordingConfig = {}) {
    this.config = {
      mimeType: "audio/webm;codecs=opus",
      audioBitsPerSecond: 128000,
      maxDuration: 300000, // 5 minutes default
      ...config,
    };
  }

  // Event listener management
  on<K extends keyof AudioManagerEvents>(
    event: K,
    listener: AudioManagerEvents[K]
  ) {
    this.eventListeners[event] = listener;
  }

  off<K extends keyof AudioManagerEvents>(event: K) {
    delete this.eventListeners[event];
  }

  private emit<K extends keyof AudioManagerEvents>(
    event: K,
    ...args: Parameters<AudioManagerEvents[K]>
  ) {
    const listener = this.eventListeners[event];
    if (listener) {
      // @ts-ignore - TypeScript can't infer the correct types here
      listener(...args);
    }
  }

  // Check if recording is supported
  static isSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.MediaRecorder
    );
  }

  // Get available audio input devices
  static async getAudioDevices(): Promise<MediaDeviceInfo[]> {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return [];
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((device) => device.kind === "audioinput");
    } catch (error) {
      console.warn("Failed to enumerate audio devices:", error);
      return [];
    }
  }

  // Get current recording state
  getState(): RecordingState {
    return this.currentState;
  }

  // Get current recording duration
  getCurrentTime(): number {
    if (this.currentState === "recording" && this.startTime > 0) {
      return Date.now() - this.startTime;
    }
    return 0;
  }

  // Initialize audio stream
  private async initializeStream(deviceId?: string): Promise<void> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
        video: false,
      };

      this.audioStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      throw new Error(`Failed to access microphone: ${error.message}`);
    }
  }

  // Setup MediaRecorder
  private setupMediaRecorder(): void {
    if (!this.audioStream) {
      throw new Error("Audio stream not initialized");
    }

    // Check if the preferred MIME type is supported
    let mimeType = this.config.mimeType!;
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      // Fallback MIME types
      const fallbacks = ["audio/webm", "audio/mp4", "audio/wav", "audio/ogg"];

      mimeType =
        fallbacks.find((type) => MediaRecorder.isTypeSupported(type)) || "";

      if (!mimeType) {
        throw new Error("No supported audio MIME type found");
      }
    }

    const options: MediaRecorderOptions = {
      mimeType,
    };

    if (this.config.audioBitsPerSecond) {
      options.audioBitsPerSecond = this.config.audioBitsPerSecond;
    }

    this.mediaRecorder = new MediaRecorder(this.audioStream, options);
    this.recordedChunks = [];

    // Setup event handlers
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.handleRecordingComplete();
    };

    this.mediaRecorder.onerror = (event) => {
      this.emit("error", new Error(`MediaRecorder error: ${event.error}`));
    };
  }

  // Handle recording completion
  private handleRecordingComplete(): void {
    if (this.recordedChunks.length === 0) {
      this.emit("error", new Error("No audio data recorded"));
      return;
    }

    const blob = new Blob(this.recordedChunks, {
      type: this.mediaRecorder?.mimeType || this.config.mimeType,
    });

    const recordingResult: RecordingResult = {
      id: `recording_${Date.now()}`,
      blob,
      duration: Date.now() - this.startTime,
      timestamp: new Date(this.startTime),
      mimeType: blob.type,
      size: blob.size,
    };

    this.setState("stopped");
    this.emit("dataAvailable", recordingResult);
  }

  // Set state and emit event
  private setState(state: RecordingState): void {
    if (this.currentState !== state) {
      this.currentState = state;
      this.emit("stateChange", state);
    }
  }

  // Start time update interval
  private startTimeUpdates(): void {
    this.timeUpdateInterval = window.setInterval(() => {
      if (this.currentState === "recording") {
        this.emit("timeUpdate", this.getCurrentTime());
      }
    }, 100); // Update every 100ms
  }

  // Stop time update interval
  private stopTimeUpdates(): void {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
  }

  // Clear max duration timeout
  private clearMaxDurationTimeout(): void {
    if (this.maxDurationTimeout) {
      clearTimeout(this.maxDurationTimeout);
      this.maxDurationTimeout = null;
    }
  }

  // Start recording
  async startRecording(deviceId?: string): Promise<void> {
    if (this.currentState === "recording") {
      throw new Error("Already recording");
    }

    if (!SimpleAudioManager.isSupported()) {
      throw new Error("Audio recording not supported in this browser");
    }

    try {
      // Initialize audio stream if not already done
      if (!this.audioStream) {
        await this.initializeStream(deviceId);
      }

      // Setup MediaRecorder
      this.setupMediaRecorder();

      // Start recording
      this.mediaRecorder!.start(1000); // Request data every second
      this.startTime = Date.now();
      this.setState("recording");
      this.startTimeUpdates();

      // Auto-stop after max duration
      if (this.config.maxDuration) {
        this.maxDurationTimeout = window.setTimeout(() => {
          if (this.currentState === "recording") {
            this.stopRecording();
          }
        }, this.config.maxDuration);
      }
    } catch (error) {
      this.setState("idle");
      throw new Error(`Failed to start recording: ${error.message}`);
    }
  }

  // Pause recording
  pauseRecording(): void {
    if (this.currentState !== "recording") {
      throw new Error("Not currently recording");
    }

    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.mediaRecorder.pause();
      this.setState("paused");
      this.stopTimeUpdates();
    }
  }

  // Resume recording
  resumeRecording(): void {
    if (this.currentState !== "paused") {
      throw new Error("Not currently paused");
    }

    if (this.mediaRecorder && this.mediaRecorder.state === "paused") {
      this.mediaRecorder.resume();
      this.setState("recording");
      this.startTimeUpdates();
    }
  }

  // Stop recording
  stopRecording(): void {
    if (this.currentState !== "recording" && this.currentState !== "paused") {
      throw new Error("Not currently recording");
    }

    this.clearMaxDurationTimeout();
    this.stopTimeUpdates();

    if (
      this.mediaRecorder &&
      (this.mediaRecorder.state === "recording" ||
        this.mediaRecorder.state === "paused")
    ) {
      this.mediaRecorder.stop();
    }
  }

  // Cancel recording
  cancelRecording(): void {
    if (this.currentState === "idle") {
      return;
    }

    this.clearMaxDurationTimeout();
    this.stopTimeUpdates();

    if (
      this.mediaRecorder &&
      (this.mediaRecorder.state === "recording" ||
        this.mediaRecorder.state === "paused")
    ) {
      this.mediaRecorder.stop();
    }

    this.recordedChunks = [];
    this.setState("idle");
  }

  // Cleanup resources
  cleanup(): void {
    this.clearMaxDurationTimeout();
    this.stopTimeUpdates();
    this.cancelRecording();

    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
    }

    this.mediaRecorder = null;
    this.eventListeners = {};
  }

  // Convert audio to different format (basic implementation)
  static async convertToMp3(audioBlob: Blob): Promise<Blob> {
    // For now, just return the original blob
    // In a real implementation, you might use a library like lamejs
    // or send to a server for conversion
    console.warn("MP3 conversion not implemented, returning original format");
    return audioBlob;
  }

  // Create audio URL for playback
  static createAudioUrl(audioBlob: Blob): string {
    return URL.createObjectURL(audioBlob);
  }

  // Revoke audio URL
  static revokeAudioUrl(url: string): void {
    URL.revokeObjectURL(url);
  }

  // Get audio duration from blob (requires creating audio element)
  static async getAudioDuration(audioBlob: Blob): Promise<number> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const url = SimpleAudioManager.createAudioUrl(audioBlob);

      audio.onloadedmetadata = () => {
        SimpleAudioManager.revokeAudioUrl(url);
        resolve(audio.duration * 1000); // Return in milliseconds
      };

      audio.onerror = () => {
        SimpleAudioManager.revokeAudioUrl(url);
        reject(new Error("Failed to load audio for duration detection"));
      };

      audio.src = url;
    });
  }
}

export default SimpleAudioManager;
