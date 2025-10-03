// src/packages/ui/components/AudioRecording.tsx
// Audio recording component that uses SimpleAudioManager for recording
// Provides simple recording, playback, and manual transcript editing
// RELEVANT FILES: src/packages/audio/SimpleAudioManager.ts, src/shared/contracts/index.ts, src/packages/ui/components/TranscriptEditor.tsx, src/packages/ui/components/ui/button.tsx

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  ArrowLeft,
  Mic,
  Square,
  Play,
  Pause,
  FileText,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { SimpleAudioManager, type RecordingResult } from '@audio/SimpleAudioManager';
import { Button } from '@ui/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/components/ui/card';
import { Badge } from '@ui/components/ui/badge';
import { TranscriptEditor } from './TranscriptEditor';
import type {
  Challenge,
  DesignData,
  AudioData,
} from '@/shared/contracts/index';
import { getLogger } from '@/lib/logging/logger';

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
  const log = getLogger('audio-recording');
  const mountedRef = useRef(true);

  // Audio recording state
  const [audioManager] = useState(() => new SimpleAudioManager());
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [isRecordingSupported, setIsRecordingSupported] = useState<boolean>(true);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Transcript state
  const [transcript, setTranscript] = useState('');
  const [showNoAudioWarning, setShowNoAudioWarning] = useState(false);

  // Track when user pressed Continue during an active recording
  const pendingContinueRef = useRef(false);

  // Initialize audio manager event listeners
  useEffect(() => {
    const handleStateChange = (state: string) => {
      setIsRecording(state === 'recording');
      setIsPaused(state === 'paused');
    };

    const handleDataAvailable = (recordingResult: RecordingResult) => {
      if (mountedRef.current) {
        setAudioBlob(recordingResult.blob);
        setDuration(Math.floor(recordingResult.duration / 1000));

        // If user clicked Continue while recording, complete now
        if (pendingContinueRef.current) {
          pendingContinueRef.current = false;
          const audioResult: AudioData = {
            blob: recordingResult.blob,
            transcript: transcript.replace(/<[^>]*>/g, ''), // Strip HTML for storage
            duration: Math.floor(recordingResult.duration / 1000),
            wordCount: transcript
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
          onComplete(audioResult);
        }
      }
    };

    const handleError = (error: Error) => {
      log.error('Audio manager error', error);
      setRecordingError(getErrorMessage(error));
    };

    const handleTimeUpdate = (currentTime: number) => {
      setDuration(Math.floor(currentTime / 1000));
    };

    audioManager.on('stateChange', handleStateChange);
    audioManager.on('dataAvailable', handleDataAvailable);
    audioManager.on('error', handleError);
    audioManager.on('timeUpdate', handleTimeUpdate);

    return () => {
      audioManager.off('stateChange');
      audioManager.off('dataAvailable');
      audioManager.off('error');
      audioManager.off('timeUpdate');
    };
  }, [audioManager, transcript, onComplete]);

  // Check recording support on mount
  useEffect(() => {
    const checkRecordingSupport = async () => {
      console.log('🎙️ Checking audio recording support...');

      const isSupported = SimpleAudioManager.isSupported();
      console.log('Recording supported:', isSupported);

      if (!isSupported) {
        console.log('❌ Audio recording not supported');
        setIsRecordingSupported(false);
        setRecordingError(
          'Audio recording is not supported in this browser. Please use the transcript editor below.'
        );
        return;
      }

      console.log('✅ Audio recording is supported');
      setIsRecordingSupported(true);
      setRecordingError(null);
    };

    checkRecordingSupport();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      audioManager.cleanup();
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.remove();
      }
    };
  }, [audioManager]);

  const startRecording = useCallback(async () => {
    try {
      setRecordingError(null);
      await audioManager.startRecording();
    } catch (error) {
      log.error('Error starting recording', error as any);
      const errorMessage = getErrorMessage(error);
      setRecordingError(errorMessage);
    }
  }, [audioManager]);

  const pauseRecording = useCallback(() => {
    try {
      audioManager.pauseRecording();
    } catch (error) {
      log.error('Error pausing recording', error as any);
    }
  }, [audioManager]);

  const resumeRecording = useCallback(() => {
    try {
      audioManager.resumeRecording();
    } catch (error) {
      log.error('Error resuming recording', error as any);
    }
  }, [audioManager]);

  const stopRecording = useCallback(() => {
    try {
      audioManager.stopRecording();
    } catch (error) {
      log.error('Error stopping recording', error as any);
    }
  }, [audioManager]);

  // Play/pause audio
  const toggleAudioPlayback = useCallback(() => {
    if (!audioBlob) return;

    if (!audioElementRef.current) {
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audioElementRef.current = audio;

      audio.onended = () => {
        if (mountedRef.current) {
          setIsPlaying(false);
        }
      };
      audio.onpause = () => {
        if (mountedRef.current) setIsPlaying(false);
      };
      audio.onplay = () => {
        if (mountedRef.current) setIsPlaying(true);
      };
    }

    if (isPlaying) {
      audioElementRef.current.pause();
    } else {
      audioElementRef.current.play();
    }
  }, [audioBlob, isPlaying]);

  const handleContinue = useCallback(() => {
    // If recording is active, stop first and continue once audio finalizes
    if (isRecording || isPaused) {
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
      wordCount: transcript
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
  }, [audioBlob, transcript, duration, isRecording, isPaused, stopRecording, onComplete]);

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
              <h1 className='text-lg font-semibold'>Record Your Explanation</h1>
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
              {recordingError && (
                <div className='p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm flex items-center gap-2'>
                  <AlertTriangle className='w-4 h-4' />
                  <span>Recording error: {recordingError}</span>
                </div>
              )}
              {!isRecordingSupported && !recordingError && (
                <div className='p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm flex items-center gap-2'>
                  <Info className='w-4 h-4' />
                  <span>
                    Recording is not available in this environment. You can still type your
                    explanation in the transcript editor below.
                  </span>
                </div>
              )}
              <div className='text-center'>
                <div className='text-4xl mb-4'>{formatDuration(duration)}</div>

                <div className='flex justify-center gap-4'>
                  {!isRecording && !isPaused ? (
                    <Button
                      onClick={startRecording}
                      size='lg'
                      className='bg-red-500 hover:bg-red-600'
                      disabled={!isRecordingSupported}
                    >
                      <Mic className='w-5 h-5 mr-2' />
                      {isRecordingSupported ? 'Start Recording' : 'Recording Not Available'}
                    </Button>
                  ) : (
                    <div className='flex gap-2'>
                      {isPaused ? (
                        <Button onClick={resumeRecording} size='lg' className='bg-green-500 hover:bg-green-600'>
                          <Mic className='w-5 h-5 mr-2' />
                          Resume
                        </Button>
                      ) : (
                        <Button onClick={pauseRecording} size='lg' variant='outline'>
                          <Pause className='w-5 h-5 mr-2' />
                          Pause
                        </Button>
                      )}
                      <Button onClick={stopRecording} size='lg' variant='outline'>
                        <Square className='w-5 h-5 mr-2' />
                        Stop Recording
                      </Button>
                    </div>
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

                {(isRecording || isPaused) && (
                  <div className='mt-4 flex items-center justify-center gap-2'>
                    <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'}`} />
                    <span className='text-sm text-muted-foreground'>
                      {isRecording ? 'Recording...' : 'Paused'}
                    </span>
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
                  <Button onClick={() => setTranscript('')} size='sm' variant='ghost'>
                    Clear
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <label className='text-sm font-medium'>
                  Manual Transcript Entry
                  {audioBlob ? ' (Audio recorded - type your explanation here)' : ' (Type your explanation)'}
                </label>
                <TranscriptEditor
                  value={transcript}
                  onChange={setTranscript}
                  onTimestampClick={() => {}} // No timestamp support in simple version
                  currentTime={0}
                  segments={[]}
                  placeholder={
                    audioBlob
                      ? 'Type your system design explanation here (audio has been recorded)...'
                      : 'Type your system design explanation here...'
                  }
                  className='min-h-[200px]'
                  disabled={false}
                />
                <p className='text-xs text-muted-foreground'>
                  {audioBlob
                    ? 'Audio has been recorded. Please type your explanation in the text editor above.'
                    : 'Record audio above or type your explanation directly.'}
                </p>
              </div>
              <div className='flex items-center justify-between text-xs text-muted-foreground'>
                <span>
                  Word count:{' '}
                  {
                    transcript
                      .replace(/<[^>]*>/g, '')
                      .split(' ')
                      .filter(word => word.length > 0).length
                  }
                </span>
                <div className='flex items-center gap-2'>
                  {transcript && <span className='text-green-600'>✓ Ready</span>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Continue Button */}
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
