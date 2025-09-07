import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Challenge, DesignData, AudioData } from '../App';
import { ArrowLeft, Mic, Square, Play, Pause, FileText } from 'lucide-react';

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
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => {
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
      };
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  }, []);

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
      
      audio.onended = () => { if (mountedRef.current) setIsPlaying(false); };
      audio.onpause = () => { if (mountedRef.current) setIsPlaying(false); };
      audio.onplay = () => { if (mountedRef.current) setIsPlaying(true); };
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
      mountedRef.current = false;
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
                </CardTitle>
                <Button
                  onClick={() => setTranscript('')}
                  size="sm"
                  variant="ghost"
                >
                  Clear
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Manual transcript
                </label>
                <textarea
                  className="w-full h-32 p-3 border rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Type your explanation here..."
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                />
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Word count: {transcript.split(' ').filter(word => word.length > 0).length}
                </span>
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
