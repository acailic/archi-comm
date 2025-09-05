# ArchiComm MVP TODO

**Goal**: Create a simple audio recording and transcription application

## Core MVP Features

### 🎯 Phase 1: Basic Audio Recording (Week 1)
- [ ] **Record Audio**: Implement basic audio recording using MediaRecorder API
- [ ] **Play Audio**: Add audio playback controls (play/pause/stop)
- [ ] **Save Audio**: Store recordings locally in browser
- [ ] **Simple UI**: Clean interface for record/stop/play buttons

### 🎯 Phase 2: Audio Transcription (Week 2)
- [ ] **Web Speech API**: Integrate browser's built-in speech-to-text
- [ ] **Manual Transcription**: Allow users to type transcripts while listening
- [ ] **Basic Text Editor**: Simple textarea for editing transcripts
- [ ] **Save Transcripts**: Store transcripts with audio recordings

### 🎯 Phase 3: Polish & Export (Week 3)
- [ ] **Audio Waveform**: Show visual waveform during recording/playback
- [ ] **Export Options**: Download audio + transcript as files
- [ ] **Recording Quality**: Show microphone levels and audio quality
- [ ] **Error Handling**: Handle microphone permissions and errors

## Technical Requirements

### Audio Recording
```javascript
// Use MediaRecorder API
const mediaRecorder = new MediaRecorder(audioStream);
mediaRecorder.start();
mediaRecorder.stop();
```

### Speech Recognition
```javascript
// Use Web Speech API
const recognition = new webkitSpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;
```

### File Storage
```javascript
// Use IndexedDB or localStorage
localStorage.setItem('recording_1', audioBlob);
localStorage.setItem('transcript_1', transcriptText);
```

## Simple File Structure
```
src/
├── components/
│   ├── AudioRecorder.tsx    # Record button, status
│   ├── AudioPlayer.tsx      # Play button, waveform
│   ├── Transcriber.tsx      # Speech-to-text
│   └── TranscriptEditor.tsx # Text editing
├── hooks/
│   ├── useAudioRecorder.ts  # Recording logic
│   ├── useSpeechRecognition.ts # STT logic
│   └── useLocalStorage.ts   # Data persistence
└── App.tsx                  # Main app
```

## Current Status
- [x] Fix React dispatcher error (framer-motion imports) ✅ v0.1.1
- [x] Clean up duplicate src/src directories ✅ v0.1.1  
- [x] Update dependencies and .gitignore ✅ v0.1.1
- [x] Successful production builds (web + Tauri) ✅ v0.1.1
- [x] Created release v0.1.1 with build artifacts ✅ v0.1.1
- [ ] Start Phase 1: Basic audio recording 🎯 **NEXT**

## Release Notes

### v0.1.1 - Fixed React Dispatcher Error (Latest)
- 🐛 Fixed "null is not an object (evaluating 'dispatcher.useEffect')" error
- 🔧 Resolved conflicting animation library imports (motion vs framer-motion)
- 🧹 Cleaned up duplicate directory structure
- 📦 Updated dependencies and comprehensive .gitignore
- ✅ Successful builds: web app and Tauri desktop (.app + .dmg)
- 🚀 **Application is now stable and ready for development!**

## Next Steps
1. Implement basic MediaRecorder functionality
2. Add simple record/stop/play UI
3. Test audio recording in browser
4. Add speech recognition once recording works

---

**Keep it simple. Get audio recording working first, then add transcription.**

🔗 **Release**: [v0.1.1 on GitHub](https://github.com/acailic/archi-comm/releases/tag/v0.1.1)