import React from 'react';
import { AudioRecording } from '@ui/components/AudioRecording';
import { mockAudioStates } from '../testData';

export const audioRecordingScenarios = {
  'Audio Recording': {
    id: 'audio-recording',
    name: 'Audio Recording',
    scenarios: [
      {
        id: 'idle-state',
        name: 'Idle State',
        description: 'Audio recording component ready to start recording',
        component: () =>
          React.createElement(AudioRecording, {
            audioData: mockAudioStates.idle,
            isEnabled: true,
            maxDuration: 300,
            onStartRecording: () => console.log('Started recording'),
            onStopRecording: () => console.log('Stopped recording'),
            onPlayRecording: () => console.log('Playing recording'),
            onPauseRecording: () => console.log('Paused recording'),
            onDeleteRecording: () => console.log('Deleted recording'),
            onTranscriptionComplete: (transcript: string) => console.log('Transcript:', transcript),
          }),
      },
      {
        id: 'recording-state',
        name: 'Recording State',
        description: 'Currently recording audio with live duration updates',
        component: () =>
          React.createElement(AudioRecording, {
            audioData: mockAudioStates.recording,
            isEnabled: true,
            maxDuration: 300,
            showWaveform: true,
            onStartRecording: () => console.log('Started recording'),
            onStopRecording: () => console.log('Stopped recording'),
            onPlayRecording: () => console.log('Playing recording'),
            onPauseRecording: () => console.log('Paused recording'),
            onDeleteRecording: () => console.log('Deleted recording'),
            onTranscriptionComplete: (transcript: string) => console.log('Transcript:', transcript),
          }),
      },
      {
        id: 'playing-state',
        name: 'Playing State',
        description: 'Playing back recorded audio with transcript displayed',
        component: () =>
          React.createElement(AudioRecording, {
            audioData: mockAudioStates.playing,
            isEnabled: true,
            maxDuration: 300,
            showTranscript: true,
            showWaveform: true,
            onStartRecording: () => console.log('Started recording'),
            onStopRecording: () => console.log('Stopped recording'),
            onPlayRecording: () => console.log('Playing recording'),
            onPauseRecording: () => console.log('Paused recording'),
            onDeleteRecording: () => console.log('Deleted recording'),
            onTranscriptionComplete: (transcript: string) => console.log('Transcript:', transcript),
          }),
      },
      {
        id: 'error-state',
        name: 'Error State',
        description: 'Error occurred - microphone access denied',
        component: () =>
          React.createElement(AudioRecording, {
            audioData: mockAudioStates.error,
            isEnabled: false,
            maxDuration: 300,
            onStartRecording: () => console.log('Started recording'),
            onStopRecording: () => console.log('Stopped recording'),
            onPlayRecording: () => console.log('Playing recording'),
            onPauseRecording: () => console.log('Paused recording'),
            onDeleteRecording: () => console.log('Deleted recording'),
            onTranscriptionComplete: (transcript: string) => console.log('Transcript:', transcript),
            onRetryPermission: () => console.log('Retrying microphone permission'),
          }),
      },
      {
        id: 'completed-state',
        name: 'Completed State',
        description: 'Recording completed with full transcript available',
        component: () =>
          React.createElement(AudioRecording, {
            audioData: mockAudioStates.completed,
            isEnabled: true,
            maxDuration: 300,
            showTranscript: true,
            showWaveform: true,
            allowDownload: true,
            onStartRecording: () => console.log('Started recording'),
            onStopRecording: () => console.log('Stopped recording'),
            onPlayRecording: () => console.log('Playing recording'),
            onPauseRecording: () => console.log('Paused recording'),
            onDeleteRecording: () => console.log('Deleted recording'),
            onDownloadRecording: () => console.log('Downloaded recording'),
            onTranscriptionComplete: (transcript: string) => console.log('Transcript:', transcript),
          }),
        documentation: {
          summary: 'Expose transcript and export actions after recording ends.',
          bestPractices: ['Keep actions discoverable', 'Persist transcript for later review'],
          accessibility: { keyboard: ['Provide shortcuts for play/pause and seek'] },
        },
      },
      {
        id: 'disabled-state',
        name: 'Disabled State',
        description: 'Audio recording disabled (e.g., in read-only mode)',
        component: () =>
          React.createElement(AudioRecording, {
            audioData: mockAudioStates.idle,
            isEnabled: false,
            maxDuration: 300,
            disabledMessage: 'Audio recording is disabled in view-only mode',
            onStartRecording: () => console.log('Started recording'),
            onStopRecording: () => console.log('Stopped recording'),
            onPlayRecording: () => console.log('Playing recording'),
            onPauseRecording: () => console.log('Paused recording'),
            onDeleteRecording: () => console.log('Deleted recording'),
            onTranscriptionComplete: (transcript: string) => console.log('Transcript:', transcript),
          }),
        documentation: {
          summary: 'Communicate disabled state with clear messaging.',
          bestPractices: [
            'Explain why recording is disabled',
            'Avoid misleading active affordances',
          ],
        },
      },
    ],
  },
};