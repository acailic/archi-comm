declare class SpeechRecognition extends EventTarget {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  start(): void; stop(): void; abort(): void;
  onaudioend?: (this: SpeechRecognition, ev: Event) => any;
  onaudiostart?: (this: SpeechRecognition, ev: Event) => any;
  onend?: (this: SpeechRecognition, ev: Event) => any;
  onerror?: (this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any;
  onresult?: (this: SpeechRecognition, ev: SpeechRecognitionEvent) => any;
  onsoundend?: (this: SpeechRecognition, ev: Event) => any;
  onsoundstart?: (this: SpeechRecognition, ev: Event) => any;
  onspeechend?: (this: SpeechRecognition, ev: Event) => any;
  onspeechstart?: (this: SpeechRecognition, ev: Event) => any;
  onstart?: (this: SpeechRecognition, ev: Event) => any;
}
interface SpeechRecognitionAlternative { transcript: string; confidence?: number; }
interface SpeechRecognitionResult { readonly isFinal: boolean; readonly length: number; [index: number]: SpeechRecognitionAlternative; }
interface SpeechRecognitionEvent extends Event { readonly resultIndex: number; readonly results: SpeechRecognitionResultList; }
interface SpeechRecognitionResultList { readonly length: number; [index: number]: SpeechRecognitionResult; }
interface SpeechRecognitionErrorEvent extends Event { error: string; }
interface Window { webkitSpeechRecognition?: typeof SpeechRecognition; SpeechRecognition?: typeof SpeechRecognition; }

