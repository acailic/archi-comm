import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowLeft, Mic, Square, Play, Pause, FileText, AlertTriangle, Wand2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { LoadingSpinner, useLoadingState } from './ui/LoadingSpinner';
import { transcriptionUtils, audioUtils } from '../lib/tauri';
import type { Challenge, DesignData, AudioData, TranscriptionResponse } from '@/shared/contracts/index';
import { TranscriptEditor } from './TranscriptEditor';

const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
};

interface AudioRecordingProps {
  challenge: Challenge;
  designData: DesignData;
  onComplete: (data: AudioData) => void;
  onBack: () => void;
}

export function AudioRecording({ challenge, designData, onComplete, onBack }: AudioRecordingProps) {
  const mountedRef = useRef(true);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState('');
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showNoAudioWarning, setShowNoAudioWarning] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [transcriptionSegments, setTranscriptionSegments] = useState<TranscriptionResponse | null>(null);
  
  // Track when user pressed Continue during an active recording
  const pendingContinueRef = useRef(false);
  // Keep latest values available inside async callbacks without stale closures
  const transcriptRef = useRef('');
  const durationRef = useRef(0);

  // Loading state for transcription
  const {
    isLoading: isTranscribing,
    message: transcriptionMessage,
    startLoading: startTranscription,
    finishLoading: finishTranscription,
  } = useLoadingState();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Transcription function
  const transcribeAudio = useCallback(async (blob: Blob) => {
    if (!blob) return;

    try {
      setTranscriptionError(null);
      startTranscription('Saving audio file...');

      // Save audio blob to temporary file
      const filePath = await audioUtils.saveAudioBlob(blob);
      
      startTranscription('Transcribing audio...');
      
      // Transcribe the audio file
      const transcriptionResponse = await transcriptionUtils.transcribeAudio(filePath);
      
      if (mountedRef.current) {
        setTranscript(transcriptionResponse.text);
        transcriptRef.current = transcriptionResponse.text;
        setTranscriptionSegments(transcriptionResponse);
      }

      finishTranscription();
      
      // Optional: Cleanup the temporary file
      setTimeout(() => {
        audioUtils.cleanupAudioFile(filePath).catch(console.warn);
      }, 1000);
      
    } catch (error) {
      console.error('Transcription failed:', error);
      const errorMessage = getErrorMessage(error);
      setTranscriptionError(errorMessage);
      finishTranscription();
    }
  }, [startTranscription, finishTranscription]);

  const startRecording = useCallback(async () => {
    try {
      // Clear any previous transcription errors when starting new recording
      setTranscriptionError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = event => {
        chunks.push(event.data);
      };

      mediaRecorder.start();
      if (mountedRef.current) {
        setIsRecording(true);
      }

      // Start duration timer
      const startTime = Date.now();
      const timer = setInterval(() => {
        if (mountedRef.current) {
          setDuration(Math.floor((Date.now() - startTime) / 1000));
        } else {
          clearInterval(timer);
        }
      }, 1000);

      mediaRecorder.onstop = () => {
        clearInterval(timer);
        if (!mountedRef.current) return;
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        
        // Automatically transcribe the audio
        transcribeAudio(blob);
        
        // If user clicked Continue while still recording, complete with this blob now
        if (pendingContinueRef.current) {
          pendingContinueRef.current = false;
          const audioData: AudioData = {
            blob,
            transcript: transcriptRef.current.replace(/<[^>]*>/g, ''), // Strip HTML for storage
            duration: durationRef.current,
            wordCount: transcriptRef.current
              .replace(/<[^>]*>/g, '')
              .split(' ')
              .filter(word => word.length > 0).length,
            businessValueTags: [],
            analysisMetrics: {
              clarityScore: 75,
              technicalDepth: 80,
              businessFocus: 60,
            },
          };
          onComplete(audioData);
        }
      };
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  }, [transcribeAudio]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      if (mountedRef.current) {
        setIsRecording(false);
      }
    }
  }, [isRecording]);

  // Play/pause audio
  const toggleAudioPlayback = useCallback(() => {
    if (!audioBlob) return;

    if (!audioElementRef.current) {
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audioElementRef.current = audio;

      audio.onended = () => {
        if (mountedRef.current) {
          setIsPlaying(false);
          setCurrentPlaybackTime(0);
        }
      };
      audio.onpause = () => {
        if (mountedRef.current) setIsPlaying(false);
      };
      audio.onplay = () => {
        if (mountedRef.current) setIsPlaying(true);
      };
      
      // Track playback time for word highlighting
      audio.ontimeupdate = () => {
        if (mountedRef.current) {
          setCurrentPlaybackTime(audio.currentTime);
        }
      };
    }

    if (isPlaying) {
      audioElementRef.current.pause();
    } else {
      audioElementRef.current.play();
    }
  }, [audioBlob, isPlaying]);

  // Handle timestamp click from TranscriptEditor
  const handleTimestampClick = useCallback((timestamp: number) => {
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = timestamp;
      setCurrentPlaybackTime(timestamp);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.remove();
      }
    };
  }, []);

  // Keep refs synced with latest state for use in async handlers
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  const handleContinue = useCallback(() => {
    // If recording is active, stop first and continue once audio finalizes
    if (isRecording) {
      pendingContinueRef.current = true;
      stopRecording();
      return;
    }

    // If the user proceeds with neither audio nor transcript, show a small, non-blocking notice
    if (!audioBlob && !transcript.trim()) {
      setShowNoAudioWarning(true);
      window.setTimeout(() => setShowNoAudioWarning(false), 3500);
    }
    const audioData: AudioData = {
      blob: audioBlob,
      transcript: transcript.replace(/<[^>]*>/g, ''), // Strip HTML for storage
      duration,
      wordCount: transcript.replace(/<[^>]*>/g, '').split(' ').filter(word => word.length > 0).length,
      businessValueTags: [],
      analysisMetrics: {
        clarityScore: 75,
        technicalDepth: 80,
        businessFocus: 60,
      },
    };
    onComplete(audioData);
  }, [audioBlob, transcript, duration, isRecording, stopRecording, onComplete]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className='h-full flex flex-col'>
      {/* Header */}
      <div className='border-b bg-card p-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <Button variant='ghost' size='sm' onClick={onBack}>
              <ArrowLeft className='w-4 h-4 mr-2' />
              Back to Design
            </Button>
            <div>
              <h2>Record Your Explanation</h2>
              <p className='text-sm text-muted-foreground'>
                Explain your system design for {challenge.title}
              </p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <Badge variant='outline'>{designData.components.length} Components</Badge>
            <Badge variant='outline'>{designData.connections.length} Connections</Badge>
          </div>
        </div>
      </div>

      <div className='flex-1 p-8'>
        <div className='max-w-4xl mx-auto space-y-6'>
          {/* Recording Card */}
          <Card>
            <CardHeader>
              <CardTitle>Audio Recording</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='text-center'>
                <div className='text-4xl mb-4'>{formatDuration(duration)}</div>

                <div className='flex justify-center gap-4'>
                  {!isRecording ? (
                    <Button
                      onClick={startRecording}
                      size='lg'
                      className='bg-red-500 hover:bg-red-600'
                    >
                      <Mic className='w-5 h-5 mr-2' />
                      Start Recording
                    </Button>
                  ) : (
                    <Button onClick={stopRecording} size='lg' variant='outline'>
                      <Square className='w-5 h-5 mr-2' />
                      Stop Recording
                    </Button>
                  )}

                  {audioBlob && (
                    <Button onClick={toggleAudioPlayback} size='lg' variant='outline'>
                      {isPlaying ? (
                        <Pause className='w-5 h-5 mr-2' />
                      ) : (
                        <Play className='w-5 h-5 mr-2' />
                      )}
                      {isPlaying ? 'Pause' : 'Play'}
                    </Button>
                  )}
                </div>

                {isRecording && (
                  <div className='mt-4 flex items-center justify-center gap-2'>
                    <div className='w-3 h-3 bg-red-500 rounded-full animate-pulse' />
                    <span className='text-sm text-muted-foreground'>Recording...</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Transcript Card */}
          <Card>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <CardTitle className='flex items-center gap-2'>
                  <FileText className='w-5 h-5' />
                  Transcript
                </CardTitle>
                <div className='flex items-center gap-2'>
                  {audioBlob && !isTranscribing && (
                    <Button onClick={() => transcribeAudio(audioBlob)} size='sm' variant='outline'>
                      <Wand2 className='w-4 h-4 mr-2' />
                      Transcribe Audio
                    </Button>
                  )}
                  <Button onClick={() => setTranscript('')} size='sm' variant='ghost'>
                    Clear
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className='space-y-4'>
              {isTranscribing && (
                <div className='flex items-center justify-center py-8'>
                  <LoadingSpinner
                    size='medium'
                    variant='architecture'
                    message={transcriptionMessage || 'Transcribing audio...'}
                  />
                </div>
              )}
              
              {transcriptionError && (
                <div className='p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm flex items-center gap-2'>
                  <AlertTriangle className='w-4 h-4' />
                  <span>Transcription failed: {transcriptionError}</span>
                </div>
              )}

              <div className='space-y-2'>
                <label className='text-sm font-medium'>
                  Enhanced Transcript Editor {audioBlob ? '(Auto-transcribed with rich text editing)' : '(Rich text entry)'}
                </label>
                <TranscriptEditor
                  value={transcript}
                  onChange={setTranscript}
                  onTimestampClick={handleTimestampClick}
                  currentTime={currentPlaybackTime}
                  segments={transcriptionSegments?.segments || []}
                  placeholder={audioBlob 
                    ? 'Audio will be transcribed automatically with enhanced editing features...'
                    : 'Type your system design explanation with rich text formatting...'
                  }
                  className='min-h-[200px]'
                  disabled={isTranscribing}
                />
                <p className='text-xs text-muted-foreground'>
                  {audioBlob 
                    ? 'Enhanced transcript editor with formatting, highlighting, and timestamp features. Click timestamps to seek audio.'
                    : 'Rich text editor with formatting options. Record audio for automatic transcription with timestamps.'
                  }
                </p>
              </div>
              <div className='flex items-center justify-between text-xs text-muted-foreground'>
                <span>
                  Word count: {transcript.replace(/<[^>]*>/g, '').split(' ').filter(word => word.length > 0).length}
                </span>
                <div className='flex items-center gap-2'>
                  {transcriptionSegments && (
                    <span className='text-blue-600'>⏱ {transcriptionSegments.segments.length} segments</span>
                  )}
                  {transcript && !isTranscribing && (
                    <span className='text-green-600'>✓ Ready</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Continue Button (always enabled) with inline warning when skipping */}
          <div className='flex justify-end items-center gap-3'>
            {showNoAudioWarning && (
              <div className='text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded px-2 py-1 flex items-center gap-1'>
                <AlertTriangle className='w-3 h-3' />
                Proceeding without audio or transcript
              </div>
            )}
            <Button onClick={handleContinue} size='lg'>
              Continue to Review
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
