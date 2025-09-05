import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Challenge, DesignData, AudioData } from '../App';
import { ArrowLeft, Mic, Square, Play, Pause, Type, Loader2, AlertCircle, FileText } from 'lucide-react';
import { tauriAPI } from '../lib/tauri';

interface AudioRecordingProps {
  challenge: Challenge;
  designData: DesignData;
  onComplete: (data: AudioData) => void;
  onBack: () => void;
}

export function AudioRecording({ challenge, designData, onComplete, onBack }: AudioRecordingProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState('');
  const [duration, setDuration] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string>('');
  const [transcriptionMethod, setTranscriptionMethod] = useState<'auto' | 'manual'>('manual');
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start duration timer
      const startTime = Date.now();
      const timer = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      mediaRecorder.onstop = () => {
        clearInterval(timer);
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
      };
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  }, [isRecording]);

  // Convert audio blob to file for Tauri usage
  const convertBlobToFile = useCallback(async (blob: Blob): Promise<string | null> => {
    if (!tauriAPI.isTauri()) {
      return null; // Return null for web version
    }

    try {
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Create a temporary file path
      const timestamp = Date.now();
      const fileName = `recording_${timestamp}.webm`;
      
      // For now, we'll use a simple approach - in a real app, you'd want to
      // add a proper file writing method to the Tauri API
      return await tauriAPI.ipcUtils.invoke('save_audio_file', {
        fileName,
        data: Array.from(uint8Array)
      });
    } catch (error) {
      console.error('Error converting blob to file:', error);
      return null;
    }
  }, []);

  // Automatic transcription with multiple fallback methods
  const startAutoTranscription = useCallback(async () => {
    if (!audioBlob) {
      setTranscriptionError('No audio recording available');
      return;
    }

    setIsTranscribing(true);
    setTranscriptionError('');
    setTranscriptionMethod('auto');

    try {
      // Method 1: Try Tauri-based transcription first (if available)
      if (tauriAPI.isTauri()) {
        try {
          const filePath = await convertBlobToFile(audioBlob);
          if (filePath) {
            const response = await tauriAPI.transcriptionUtils.transcribeAudio(filePath);
            setTranscript(response.text);
            setIsTranscribing(false);
            return;
          }
        } catch (tauriError) {
          console.warn('Tauri transcription failed, falling back to Web Speech API:', tauriError);
        }
      }

      // Method 2: Fall back to Web Speech API
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        throw new Error('Speech recognition is not supported in this browser. Please type your transcript manually.');
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let finalTranscript = '';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        setTranscript(finalTranscript + interimTranscript);
      };

      recognition.onerror = (event: any) => {
        setTranscriptionError(`Transcription error: ${event.error}. Please try typing your transcript manually.`);
        setIsTranscribing(false);
      };

      recognition.onend = () => {
        setIsTranscribing(false);
        if (finalTranscript.trim()) {
          setTranscript(finalTranscript.trim());
        }
      };

      // Create audio element and play for recognition
      if (audioElementRef.current) {
        audioElementRef.current.remove();
      }

      const audio = new Audio(URL.createObjectURL(audioBlob));
      audioElementRef.current = audio;
      
      audio.onplay = () => {
        recognition.start();
      };

      audio.onended = () => {
        recognition.stop();
      };

      audio.onerror = () => {
        recognition.stop();
        setTranscriptionError('Audio playback failed. Please try typing your transcript manually.');
        setIsTranscribing(false);
      };

      audio.play();

    } catch (error) {
      setTranscriptionError(error instanceof Error ? error.message : 'Transcription failed. Please type your transcript manually.');
      setIsTranscribing(false);
    }
  }, [audioBlob, convertBlobToFile]);

  // Play/pause audio
  const toggleAudioPlayback = useCallback(() => {
    if (!audioBlob) return;

    if (!audioElementRef.current) {
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audioElementRef.current = audio;
      
      audio.onended = () => setIsPlaying(false);
      audio.onpause = () => setIsPlaying(false);
      audio.onplay = () => setIsPlaying(true);
    }

    if (isPlaying) {
      audioElementRef.current.pause();
    } else {
      audioElementRef.current.play();
    }
  }, [audioBlob, isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.remove();
      }
    };
  }, []);

  const handleContinue = useCallback(() => {
    const audioData: AudioData = {
      blob: audioBlob,
      transcript,
      duration,
      wordCount: transcript.split(' ').filter(word => word.length > 0).length,
      businessValueTags: [],
      analysisMetrics: {
        clarityScore: 75,
        technicalDepth: 80,
        businessFocus: 60
      }
    };
    onComplete(audioData);
  }, [audioBlob, transcript, duration, onComplete]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Design
            </Button>
            <div>
              <h2>Record Your Explanation</h2>
              <p className="text-sm text-muted-foreground">
                Explain your system design for {challenge.title}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {designData.components.length} Components
            </Badge>
            <Badge variant="outline">
              {designData.connections.length} Connections
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Recording Card */}
          <Card>
            <CardHeader>
              <CardTitle>Audio Recording</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-4xl mb-4">
                  {formatDuration(duration)}
                </div>
                
                <div className="flex justify-center gap-4">
                  {!isRecording ? (
                    <Button
                      onClick={startRecording}
                      size="lg"
                      className="bg-red-500 hover:bg-red-600"
                    >
                      <Mic className="w-5 h-5 mr-2" />
                      Start Recording
                    </Button>
                  ) : (
                    <Button
                      onClick={stopRecording}
                      size="lg"
                      variant="outline"
                    >
                      <Square className="w-5 h-5 mr-2" />
                      Stop Recording
                    </Button>
                  )}
                  
                  {audioBlob && (
                    <Button
                      onClick={toggleAudioPlayback}
                      size="lg"
                      variant="outline"
                    >
                      {isPlaying ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                      {isPlaying ? 'Pause' : 'Play'}
                    </Button>
                  )}
                </div>

                {isRecording && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-sm text-muted-foreground">Recording...</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Transcript Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Transcript
                  {transcriptionMethod === 'auto' && (
                    <Badge variant="secondary" className="ml-2">Auto-generated</Badge>
                  )}
                </CardTitle>
                {audioBlob && (
                  <div className="flex gap-2">
                    <Button
                      onClick={startAutoTranscription}
                      disabled={isTranscribing}
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      {isTranscribing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Type className="w-4 h-4" />
                      )}
                      {isTranscribing ? 'Transcribing...' : 'Auto Transcribe'}
                    </Button>
                    <Button
                      onClick={() => {
                        setTranscript('');
                        setTranscriptionMethod('manual');
                        setTranscriptionError('');
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {transcriptionError && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <span className="text-sm text-destructive">{transcriptionError}</span>
                </div>
              )}
              
              {isTranscribing && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-sm text-blue-700">
                    Transcribing audio... This may take a moment.
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    {transcriptionMethod === 'auto' ? 'Auto-generated transcript (editable)' : 'Manual transcript'}
                  </label>
                  {!audioBlob && (
                    <span className="text-xs text-muted-foreground">Record audio above to enable auto-transcription</span>
                  )}
                </div>
                <textarea
                  className="w-full h-32 p-3 border rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={
                    audioBlob 
                      ? "Use 'Auto Transcribe' button above or type your explanation manually..."
                      : "Record audio above to enable auto-transcription, or type your explanation manually..."
                  }
                  value={transcript}
                  onChange={(e) => {
                    setTranscript(e.target.value);
                    if (transcriptionMethod === 'auto') {
                      setTranscriptionMethod('manual'); // Switch to manual if user edits
                    }
                  }}
                  disabled={isTranscribing}
                />
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Word count: {transcript.split(' ').filter(word => word.length > 0).length}
                </span>
                {transcript && transcriptionMethod === 'auto' && (
                  <span className="text-blue-600">
                    ✓ Auto-transcribed (you can edit above)
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Continue Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleContinue}
              disabled={!audioBlob && !transcript.trim()}
              size="lg"
            >
              Continue to Review
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}