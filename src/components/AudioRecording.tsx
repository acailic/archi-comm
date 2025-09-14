import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  ArrowLeft,
  Mic,
  Square,
  Play,
  Pause,
  FileText,
  AlertTriangle,
  Wand2,
  Info,
} from 'lucide-react';
import { transcriptionUtils, audioUtils } from '../lib/tauri';
import { AudioManager, AudioManagerOptions, getDefaultAudioManagerOptions } from '../lib/audio';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { LoadingSpinner, useLoadingState } from './ui/LoadingSpinner';
import { TranscriptEditor } from './TranscriptEditor';
import type {
  Challenge,
  DesignData,
  AudioData,
  TranscriptionResponse,
} from '@/shared/contracts/index';
import { getLogger } from '@/lib/logger';

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
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState('');
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showNoAudioWarning, setShowNoAudioWarning] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [transcriptionSegments, setTranscriptionSegments] = useState<TranscriptionResponse | null>(
    null
  );
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [isRecordingSupported, setIsRecordingSupported] = useState<boolean>(true);
  const [chosenMime, setChosenMime] = useState<string | null>(null);
  
  // New audio manager state
  const [audioManager, setAudioManager] = useState<AudioManager | null>(null);
  const [availableEngines, setAvailableEngines] = useState<{recording: string[], transcription: string[]}>({recording: [], transcription: []});
  const [selectedRecordingEngine, setSelectedRecordingEngine] = useState<string>('auto');
  const [selectedTranscriptionEngine, setSelectedTranscriptionEngine] = useState<string>('auto');
  const [realtimeTranscript, setRealtimeTranscript] = useState('');
  const [isRealtimeEnabled, setIsRealtimeEnabled] = useState(false);
  const [engineStatus, setEngineStatus] = useState<{[key: string]: 'available' | 'unavailable' | 'loading'}>({});
  const [isUsingNewSystem, setIsUsingNewSystem] = useState(false);

  // Track when user pressed Continue during an active recording
  const pendingContinueRef = useRef(false);
  // Keep latest values available inside async callbacks without stale closures
  const transcriptRef = useRef('');
  const durationRef = useRef(0);
  const startTimeRef = useRef(0);

  // Loading state for transcription
  const {
    isLoading: isTranscribing,
    message: transcriptionMessage,
    startLoading: startTranscription,
    finishLoading: finishTranscription,
  } = useLoadingState();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Initialize AudioManager on component mount
  useEffect(() => {
    const initializeAudioManager = async () => {
      try {
        const manager = new AudioManager();
        const options: AudioManagerOptions = {
          ...getDefaultAudioManagerOptions(),
          enableRealtimeTranscription: isRealtimeEnabled,
          preferredRecordingEngine: selectedRecordingEngine === 'auto' ? undefined : selectedRecordingEngine,
          preferredTranscriptionEngine: selectedTranscriptionEngine === 'auto' ? undefined : selectedTranscriptionEngine
        };
        
        await manager.initialize(options);
        setAudioManager(manager);
        setIsUsingNewSystem(true);
        
        // Get available engines for UI selection
        const engines = await manager.getAvailableEngines();
        setAvailableEngines(engines);
        
        // Set up real-time transcription callback
        manager.onRealtimeTranscript((text, isFinal) => {
          if (isFinal) {
            setTranscript(prev => prev + ' ' + text);
            transcriptRef.current = transcriptRef.current + ' ' + text;
          } else {
            setRealtimeTranscript(text);
          }
        });
        
        console.log('AudioManager initialized with engines:', engines);
      } catch (error) {
        console.warn('AudioManager initialization failed, falling back to original system:', error);
        setIsUsingNewSystem(false);
        // Keep original system as fallback
      }
    };
    
    initializeAudioManager();
  }, [isRealtimeEnabled, selectedRecordingEngine, selectedTranscriptionEngine]);

  // Dispose AudioManager when it changes or on unmount
  useEffect(() => {
    return () => { audioManager?.dispose().catch(console.warn); };
  }, [audioManager]);

  // Enhanced transcription function that uses AudioManager when available
  const transcribeAudio = useCallback(
    async (blob: Blob) => {
      if (!blob) return;

      try {
        setTranscriptionError(null);
        startTranscription('Transcribing audio...');

        let transcriptionResponse;
        
        if (audioManager && isUsingNewSystem) {
          // Use new AudioManager system
          transcriptionResponse = await audioManager.transcribeAudio(blob, selectedTranscriptionEngine === 'auto' ? undefined : selectedTranscriptionEngine);
        } else {
          // Fallback to original system
          startTranscription('Saving audio file...');
          const filePath = await audioUtils.saveAudioBlob(blob);
          startTranscription('Transcribing audio...');
          transcriptionResponse = await transcriptionUtils.transcribeAudio(filePath);
          
          // Optional: Cleanup the temporary file
          setTimeout(() => {
            audioUtils.cleanupAudioFile(filePath).catch(console.warn);
          }, 1000);
        }

        if (mountedRef.current) {
          setTranscript(transcriptionResponse.text);
          transcriptRef.current = transcriptionResponse.text;
          setTranscriptionSegments(transcriptionResponse);
        }

        finishTranscription();
      } catch (error) {
        console.error('Transcription failed:', error);
        const errorMessage = getErrorMessage(error);
        setTranscriptionError(errorMessage);
        finishTranscription();
      }
    },
    [audioManager, isUsingNewSystem, selectedTranscriptionEngine, startTranscription, finishTranscription]
  );

  const startRecording = useCallback(async () => {
    try {
      // Clear any previous errors when starting new recording
      setTranscriptionError(null);
      setRecordingError(null);

      // Use new AudioManager-based system when available
      if (audioManager && isUsingNewSystem) {
        await audioManager.startRecording({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        });

        if (mountedRef.current) {
          setIsRecording(true);
          setDuration(0);
        }
        return; // Skip legacy path
      }

      // Check if getUserMedia is available
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          'Audio recording is not supported in this environment. Please use a modern web browser with microphone access.'
        );
      }

      // Check MediaRecorder support
      if (typeof (window as any).MediaRecorder === 'undefined') {
        throw new Error(
          'MediaRecorder API is not available in this environment. Recording is not supported.'
        );
      }

      // Determine preferred MIME type
      const preferred = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/mp4',
        'audio/wav',
      ];
      let supportedMime: string | null = null;
      if (typeof (window as any).MediaRecorder !== 'undefined') {
        for (const t of preferred) {
          try {
            if ((window as any).MediaRecorder.isTypeSupported?.(t)) {
              supportedMime = t;
              break;
            }
          } catch (_) {
            // ignore
          }
        }
      }

      const hasMediaRecorder = typeof (window as any).MediaRecorder !== 'undefined';

      log.debug('Starting audio recording', {
        userAgent: navigator.userAgent,
        isSecureContext: (window as any).isSecureContext,
        isTauri: (window as any).__TAURI__ !== undefined,
        hasMediaRecorder,
        chosenMime: supportedMime,
      });

      // Legacy MediaRecorder fallback path
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = supportedMime
        ? new MediaRecorder(stream, { mimeType: supportedMime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = event => {
        chunks.push(event.data);
      };

      mediaRecorder.start();
      if (mountedRef.current) {
        setIsRecording(true);
        setDuration(0);
        setChosenMime(supportedMime);
      }

      // Start duration timer (legacy path)
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
        const effectiveType =
          (chunks[0] as any)?.type || mediaRecorder.mimeType || supportedMime || 'audio/webm';
        const blob = new Blob(chunks, { type: effectiveType });
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
      log.error('Error starting recording', error as any);
      const errorMessage = getErrorMessage(error);
      setRecordingError(errorMessage);
    }
  }, [transcribeAudio]);

  const stopRecording = useCallback(async () => {
    // If using new system via AudioManager
    if (audioManager && isUsingNewSystem && isRecording) {
      try {
        const { audio, transcript: liveTranscript } = await audioManager.stopRecording();
        if (mountedRef.current) {
          setAudioBlob(audio);
          if (liveTranscript) setTranscript(liveTranscript);
          setIsRecording(false);
        }

        // If user clicked Continue while still recording, complete now
        if (pendingContinueRef.current) {
          pendingContinueRef.current = false;
          const cleanTranscript = (liveTranscript ?? transcriptRef.current).replace(/<[^>]*>/g, '');
          const audioData: AudioData = {
            blob: audio,
            transcript: cleanTranscript,
            duration: durationRef.current,
            wordCount: cleanTranscript.split(' ').filter(w => w.length > 0).length,
            businessValueTags: [],
            analysisMetrics: { clarityScore: 75, technicalDepth: 80, businessFocus: 60 },
          };
          onComplete(audioData);
        }
      } catch (err) {
        console.error('AudioManager stopRecording failed:', err);
      }
      return;
    }

    // Legacy MediaRecorder fallback
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      if (mountedRef.current) {
        setIsRecording(false);
      }
    }
  }, [audioManager, isUsingNewSystem, isRecording, onComplete]);

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

  // Check recording support on mount
  useEffect(() => {
    const checkRecordingSupport = async () => {
      console.log('🎙️ Checking audio recording support...');
      console.log('Navigator mediaDevices:', !!navigator.mediaDevices);
      console.log('getUserMedia:', !!navigator.mediaDevices?.getUserMedia);
      console.log('MediaRecorder:', typeof (window as any).MediaRecorder !== 'undefined');
      console.log('Is Tauri:', (window as any).__TAURI__ !== undefined);
      console.log('Is secure context:', (window as any).isSecureContext);

      // Check if basic APIs exist
      if (!navigator.mediaDevices?.getUserMedia) {
        console.log('❌ MediaDevices API not available');
        setIsRecordingSupported(false);
        setRecordingError(
          'Audio recording is not supported in this browser. Please use the transcript editor below.'
        );
        return;
      }

      // Check MediaRecorder support
      if (typeof (window as any).MediaRecorder === 'undefined') {
        console.log('❌ MediaRecorder API not available');
        setIsRecordingSupported(false);
        setRecordingError(
          'Recording not supported: MediaRecorder API is unavailable in this environment. Use the transcript editor below.'
        );
        return;
      }

      // All APIs available - recording should work
      console.log('✅ All recording APIs available');
      setIsRecordingSupported(true);
      setRecordingError(null);
    };

    checkRecordingSupport();
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
                  {!isRecording ? (
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

                {/* Engine selection controls */}
                {isUsingNewSystem && availableEngines.recording.length > 1 && (
                  <div className="flex items-center gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-2">
                      <label className="font-medium">Recording Engine:</label>
                      <select 
                        value={selectedRecordingEngine} 
                        onChange={(e) => setSelectedRecordingEngine(e.target.value)}
                        className="border rounded px-2 py-1"
                        disabled={isRecording}
                      >
                        <option value="auto">Auto-select</option>
                        {availableEngines.recording.map(engine => (
                          <option key={engine} value={engine}>{engine}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <label className="font-medium">Transcription Engine:</label>
                      <select 
                        value={selectedTranscriptionEngine} 
                        onChange={(e) => setSelectedTranscriptionEngine(e.target.value)}
                        className="border rounded px-2 py-1"
                      >
                        <option value="auto">Auto-select</option>
                        {availableEngines.transcription.map(engine => (
                          <option key={engine} value={engine}>{engine}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={isRealtimeEnabled} 
                        onChange={(e) => setIsRealtimeEnabled(e.target.checked)}
                        id="realtime-transcription"
                        disabled={isRecording}
                      />
                      <label htmlFor="realtime-transcription">Real-time transcription</label>
                    </div>
                  </div>
                )}

                {isRecording && (
                  <div className='mt-4 flex items-center justify-center gap-2'>
                    <div className='w-3 h-3 bg-red-500 rounded-full animate-pulse' />
                    <span className='text-sm text-muted-foreground'>Recording...</span>
                    {isUsingNewSystem && audioManager && (
                      <span className='text-xs text-blue-600 ml-2'>
                        via {audioManager.getCurrentEngines().recording}
                      </span>
                    )}
                  </div>
                )}
                
                {/* Show real-time transcript preview */}
                {isRealtimeEnabled && realtimeTranscript && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                    <span className="text-blue-600 font-medium">Live: </span>
                    <span className="text-blue-800">{realtimeTranscript}</span>
                  </div>
                )}
                
                {!isRecording && chosenMime && (
                  <div className='mt-2 text-xs text-muted-foreground'>
                    Using format: {chosenMime}
                  </div>
                )}
                
                {!isRecording && isUsingNewSystem && audioManager && (
                  <div className='mt-2 text-xs text-muted-foreground'>
                    Using: {audioManager.getCurrentEngines().recording} → {audioManager.getCurrentEngines().transcription}
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
                  Enhanced Transcript Editor{' '}
                  {audioBlob ? '(Auto-transcribed with rich text editing)' : '(Rich text entry)'}
                </label>
                <TranscriptEditor
                  value={transcript}
                  onChange={setTranscript}
                  onTimestampClick={handleTimestampClick}
                  currentTime={currentPlaybackTime}
                  segments={transcriptionSegments?.segments || []}
                  placeholder={
                    audioBlob
                      ? 'Audio will be transcribed automatically with enhanced editing features...'
                      : 'Type your system design explanation with rich text formatting...'
                  }
                  className='min-h-[200px]'
                  disabled={isTranscribing}
                />
                <p className='text-xs text-muted-foreground'>
                  {audioBlob
                    ? 'Enhanced transcript editor with formatting, highlighting, and timestamp features. Click timestamps to seek audio.'
                    : 'Rich text editor with formatting options. Record audio for automatic transcription with timestamps.'}
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
                  {transcriptionSegments && (
                    <span className='text-blue-600'>
                      ⏱ {transcriptionSegments.segments.length} segments
                    </span>
                  )}
                  {transcript && !isTranscribing && <span className='text-green-600'>✓ Ready</span>}
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
