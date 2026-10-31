// Web Speech API interfaces for TypeScript
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export type SupportedLanguage = 'en-US' | 'hi-IN' | 'kn-IN';

export const LANGUAGE_OPTIONS: { code: SupportedLanguage; label: string; nativeName: string; flag: string }[] = [
  { code: 'en-US', label: 'English', nativeName: 'English (US)', flag: '🇬🇧' },
  { code: 'hi-IN', label: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'kn-IN', label: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
];

/**
 * Automatically identify language from input text
 */
export function detectLanguage(text: string): SupportedLanguage {
  if (!text) return 'en-US';
  // Kannada unicode range: \u0C80-\u0CFF
  if (/[\u0C80-\u0CFF]/.test(text)) {
    return 'kn-IN';
  }
  // Hindi (Devanagari) unicode range: \u0900-\u097F
  if (/[\u0900-\u097F]/.test(text)) {
    return 'hi-IN';
  }
  // Romanized Kannada words
  const lower = text.toLowerCase();
  if (/\b(namaskara|hegidira|hegiddira|oota|banni|dhanyavada|nanna|neevu|enu|yaake|beku|illa)\b/.test(lower)) {
    return 'kn-IN';
  }
  // Romanized Hindi words
  if (/\b(namaste|kya|hai|haan|nahi|kaise|ho|theek|accha|shukriya|mera|mujhe|bahut|karna)\b/.test(lower)) {
    return 'hi-IN';
  }
  return 'en-US';
}

export type MicPermissionState = 'granted' | 'prompt' | 'denied' | 'restricted' | 'unsupported';

export interface AudioDeviceInfo {
  deviceId: string;
  label: string;
  groupId?: string;
}

/**
 * Check whether the application is running in a secure context (HTTPS or localhost)
 */
export function isSecureContext(): boolean {
  if (typeof window === 'undefined') return true;
  if (typeof window.isSecureContext !== 'undefined') {
    return window.isSecureContext;
  }
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return (
    protocol === 'https:' ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.localhost')
  );
}

/**
 * Check whether the application is running inside an embedded iframe
 */
export function isRunningInIframe(): boolean {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch (e) {
    return true; // Cross-origin access blocked implies iframe
  }
}

/**
 * Check whether the iframe allows microphone access via feature / permissions policy
 */
export function isMicrophoneAllowedByIframePolicy(): boolean {
  if (typeof document === 'undefined') return true;
  const doc = document as any;
  if (doc.permissionsPolicy && typeof doc.permissionsPolicy.allowsFeature === 'function') {
    try {
      return doc.permissionsPolicy.allowsFeature('microphone');
    } catch (e) {
      // Continue to check
    }
  }
  if (doc.featurePolicy && typeof doc.featurePolicy.allowsFeature === 'function') {
    try {
      return doc.featurePolicy.allowsFeature('microphone');
    } catch (e) {
      // Continue to check
    }
  }
  return true;
}

export interface SpeechRecognitionCallbacks {
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
  onAudioLevel?: (level: number) => void;
  onStatus?: (status: string) => void;
}

export interface SpeechSynthesisCallbacks {
  onStart?: () => void;
  onBoundary?: (charIndex: number, name: string) => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

export class SpeechService {
  private recognition: any = null;
  private isListening = false;
  private isAcquiring = false;
  private selectedDeviceId: string = '';
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private lipSyncCallback: ((amplitude: number) => void) | null = null;
  private lipSyncInterval: number | null = null;

  // Media & Fallback Audio Capture
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private vadInterval: number | null = null;
  private activeCallbacks: SpeechRecognitionCallbacks | null = null;
  private currentLanguage = 'en-US';
  private latestTranscript = '';
  private webSpeechReceivedText = false;
  private permissionListeners: Set<(state: MicPermissionState) => void> = new Set();
  private lastKnownPermissionState: MicPermissionState = 'unknown' as any;

  constructor() {
    this.initPermissionObserver();
  }

  private async initPermissionObserver(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return;
    try {
      const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      this.lastKnownPermissionState = status.state as MicPermissionState;
      status.onchange = () => {
        const nextState = status.state as MicPermissionState;
        this.lastKnownPermissionState = nextState;
        this.notifyPermissionListeners(nextState);
      };
    } catch (e) {
      // Some browsers (e.g. Safari, Firefox) don't support microphone query in permissions API
    }
  }

  public onPermissionChange(cb: (state: MicPermissionState) => void): () => void {
    this.permissionListeners.add(cb);
    return () => this.permissionListeners.delete(cb);
  }

  private notifyPermissionListeners(state: MicPermissionState): void {
    this.permissionListeners.forEach((fn) => {
      try {
        fn(state);
      } catch (e) {
        // Safe callback execution
      }
    });
  }

  /**
   * Check current browser microphone permission state
   */
  public async checkPermissionStatus(): Promise<MicPermissionState> {
    if (!isSecureContext()) {
      return 'restricted';
    }

    if (isRunningInIframe() && !isMicrophoneAllowedByIframePolicy()) {
      return 'restricted';
    }

    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      try {
        const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        this.lastKnownPermissionState = status.state as MicPermissionState;
        return status.state as MicPermissionState;
      } catch (e) {
        // Fallback for browsers that do not support permission query for microphone
      }
    }

    return this.lastKnownPermissionState || 'prompt';
  }

  /**
   * Enumerate available audio input devices (microphones)
   */
  public async getAudioInputDevices(): Promise<AudioDeviceInfo[]> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return [];
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter((d) => d.kind === 'audioinput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${index + 1}`,
          groupId: d.groupId,
        }));
    } catch (e) {
      console.warn('Could not enumerate audio devices:', e);
      return [];
    }
  }

  public setSelectedDeviceId(deviceId: string): void {
    this.selectedDeviceId = deviceId;
  }

  public getSelectedDeviceId(): string {
    return this.selectedDeviceId;
  }

  public isRecognitionSupported(): boolean {
    return typeof window !== 'undefined' && !!(
      window.SpeechRecognition ||
      window.webkitSpeechRecognition ||
      (navigator.mediaDevices && typeof MediaRecorder !== 'undefined')
    );
  }

  public isSynthesisSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  /**
   * Explicitly request/test microphone access to grant browser permissions.
   * Cleans up tracks immediately so the mic does not stay active.
   */
  public async requestMicrophonePermission(): Promise<{ granted: boolean; error?: string; state: MicPermissionState }> {
    if (!isSecureContext()) {
      return {
        granted: false,
        error: 'Microphone access requires a secure context (HTTPS or localhost).',
        state: 'restricted',
      };
    }

    if (isRunningInIframe() && !isMicrophoneAllowedByIframePolicy()) {
      return {
        granted: false,
        error: 'Microphone is restricted by the embedded container. Open Mind Mirror AI in a standalone tab.',
        state: 'restricted',
      };
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return {
        granted: false,
        error: 'getUserMedia is not supported by your browser.',
        state: 'unsupported',
      };
    }

    try {
      const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      testStream.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      this.lastKnownPermissionState = 'granted';
      this.notifyPermissionListeners('granted');
      return { granted: true, state: 'granted' };
    } catch (err: any) {
      const categorized = this.categorizeMediaError(err);
      this.lastKnownPermissionState = categorized.state;
      this.notifyPermissionListeners(categorized.state);
      return { granted: false, error: categorized.message, state: categorized.state };
    }
  }

  /**
   * Categorize getUserMedia errors into distinct, actionable user feedback
   */
  private categorizeMediaError(err: any): { message: string; state: MicPermissionState } {
    const name = err?.name || '';
    const message = err?.message || '';
    const inIframe = isRunningInIframe();

    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      if (inIframe) {
        return {
          message: 'Microphone permission was blocked by the browser or embedded frame. If you already allowed access, open the app in a standalone tab to grant direct microphone permission.',
          state: 'denied',
        };
      }
      return {
        message: 'Microphone permission was denied. Click the site settings icon (padlock/tune) in your browser address bar, set Microphone to "Allow", and click Retry.',
        state: 'denied',
      };
    }

    if (name === 'SecurityError') {
      return {
        message: 'Microphone access was blocked by browser security policy. Verify that the app is running on a secure origin (HTTPS/localhost) and the frame has microphone permission.',
        state: 'restricted',
      };
    }

    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return {
        message: 'No microphone was detected on your computer. Please plug in or connect a microphone or headset and retry.',
        state: 'unsupported',
      };
    }

    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return {
        message: 'Microphone is currently in use by another application or browser tab (e.g. Zoom, Google Meet, Microsoft Teams). Please close the competing application and retry.',
        state: 'prompt',
      };
    }

    if (name === 'OverconstrainedError') {
      return {
        message: 'The requested microphone audio constraints are not supported by your hardware. Switching to default audio...',
        state: 'prompt',
      };
    }

    if (name === 'AbortError') {
      return {
        message: 'Microphone request was interrupted. Please click the microphone button again to speak.',
        state: 'prompt',
      };
    }

    return {
      message: `Microphone access failed (${name || 'Error'}): ${message || 'Unable to initialize audio input device.'}`,
      state: 'prompt',
    };
  }

  /**
   * Start listening only after explicit user interaction (e.g. button click)
   */
  public async startListening(
    language: string,
    callbacks: SpeechRecognitionCallbacks
  ): Promise<boolean> {
    // Prevent multiple concurrent acquisition attempts
    if (this.isAcquiring) {
      console.warn('Microphone acquisition already in progress, ignoring duplicate call');
      return false;
    }

    this.isAcquiring = true;
    this.stopSpeaking();
    this.cleanupAudio();

    this.activeCallbacks = callbacks;
    this.currentLanguage = language || 'en-US';
    this.latestTranscript = '';
    this.webSpeechReceivedText = false;
    this.recordedChunks = [];

    // Check secure context first
    if (!isSecureContext()) {
      this.isAcquiring = false;
      callbacks.onError?.('Microphone access requires a secure context (HTTPS or http://localhost).');
      return false;
    }

    // Check embedded iframe policy
    if (isRunningInIframe() && !isMicrophoneAllowedByIframePolicy()) {
      this.isAcquiring = false;
      callbacks.onError?.('Microphone is blocked by the embedded container. Open Mind Mirror AI in a standalone tab to speak with Pluto.');
      return false;
    }

    // 1. Request microphone stream with device selection & fallback to { audio: true }
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        callbacks.onStatus?.('Requesting microphone permission...');

        // If specific device was selected by user, try that first
        if (this.selectedDeviceId) {
          try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
              audio: { deviceId: { exact: this.selectedDeviceId } },
            });
          } catch (deviceConstraintErr) {
            console.warn('Specific deviceId constraint failed, falling back to audio: true', deviceConstraintErr);
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          }
        } else {
          // Standard resilient constraint
          this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }

        this.lastKnownPermissionState = 'granted';
        this.notifyPermissionListeners('granted');
      } catch (permErr: any) {
        console.warn('Microphone acquisition error:', permErr);
        const { message, state } = this.categorizeMediaError(permErr);
        this.lastKnownPermissionState = state;
        this.notifyPermissionListeners(state);
        callbacks.onError?.(message);
        this.cleanupAudio();
        this.isAcquiring = false;
        return false;
      }
    }

    // 2. Setup AudioContext Analyser for live audio level / speech visualizer
    if (this.mediaStream && typeof window !== 'undefined') {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
          const source = this.audioContext.createMediaStreamSource(this.mediaStream);
          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = 256;
          source.connect(this.analyser);

          const bufferLength = this.analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);

          this.vadInterval = window.setInterval(() => {
            if (!this.analyser || !this.isListening) return;
            this.analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            const average = sum / bufferLength;
            const normalized = Math.min(1, average / 45);
            callbacks.onAudioLevel?.(normalized);
          }, 60);
        }
      } catch (audioCtxErr) {
        console.warn('AudioContext metering setup skipped:', audioCtxErr);
      }
    }

    // 3. Setup concurrent MediaRecorder fallback for Gemini transcription if Web Speech is silent/unavailable
    if (this.mediaStream && typeof MediaRecorder !== 'undefined') {
      try {
        const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg', ''];
        const chosenMime = mimeTypes.find((m) => !m || MediaRecorder.isTypeSupported(m)) || '';
        const options = chosenMime ? { mimeType: chosenMime } : undefined;
        this.mediaRecorder = new MediaRecorder(this.mediaStream, options);

        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            this.recordedChunks.push(e.data);
          }
        };

        this.mediaRecorder.start(250);
      } catch (recErr) {
        console.warn('MediaRecorder buffer setup skipped:', recErr);
      }
    }

    // 4. Setup Web Speech Recognition if available in the browser
    const SpeechRecognition = typeof window !== 'undefined'
      ? (window.SpeechRecognition || window.webkitSpeechRecognition)
      : null;

    let webSpeechStarted = false;

    if (SpeechRecognition) {
      try {
        const rec = new SpeechRecognition();
        rec.lang = language || 'en-US';
        rec.continuous = true;
        rec.interimResults = true;
        rec.maxAlternatives = 1;

        rec.onstart = () => {
          this.isListening = true;
          this.isAcquiring = false;
          callbacks.onStart?.();
        };

        rec.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const item = event.results[i];
            if (item.isFinal) {
              finalTranscript += item[0].transcript;
            } else {
              interimTranscript += item[0].transcript;
            }
          }

          const currentText = (finalTranscript || interimTranscript).trim();
          if (currentText) {
            this.webSpeechReceivedText = true;
            this.latestTranscript = currentText;
            callbacks.onResult?.(currentText, !!finalTranscript);
          }
        };

        rec.onerror = (event: any) => {
          const errCode = event?.error || '';
          console.warn('Web Speech recognition event notice:', errCode);

          if (errCode === 'no-speech') {
            callbacks.onStatus?.('No speech detected. Speak clearly into your microphone.');
            return;
          }

          if (errCode === 'network') {
            callbacks.onStatus?.('Speech recognition network paused — Pluto voice recorder is active.');
            return;
          }

          if (errCode === 'audio-capture') {
            callbacks.onError?.('Audio capture failed. Ensure your microphone is plugged in and working.');
            this.stopListening();
            return;
          }

          if (errCode === 'not-allowed' || errCode === 'service-not-allowed') {
            callbacks.onError?.('Speech recognition service permission blocked. Allow microphone in browser settings or retry.');
            this.stopListening();
            return;
          }

          if (errCode === 'language-not-supported') {
            callbacks.onStatus?.('Speech model for this language is processing via Pluto AI transcription.');
            return;
          }
        };

        rec.onend = () => {
          if (this.isListening && this.webSpeechReceivedText && this.latestTranscript) {
            callbacks.onResult?.(this.latestTranscript, true);
          }
        };

        rec.start();
        this.recognition = rec;
        webSpeechStarted = true;
        this.isListening = true;
      } catch (recStartErr) {
        console.warn('Web Speech API start note:', recStartErr);
      }
    }

    this.isAcquiring = false;

    if (!webSpeechStarted && this.mediaRecorder) {
      // Pure audio recorder fallback active (e.g. Firefox)
      this.isListening = true;
      callbacks.onStart?.();
      callbacks.onStatus?.('Listening... Speak naturally');
      return true;
    }

    if (webSpeechStarted) {
      return true;
    }

    callbacks.onError?.('Voice input is not supported in this browser. Please use Chrome, Edge, Safari, or Firefox.');
    this.cleanupAudio();
    return false;
  }

  /**
   * Stop listening and finalize transcription
   */
  public async stopListening(): Promise<string> {
    this.isListening = false;
    this.isAcquiring = false;

    // Stop Web Speech
    if (this.recognition) {
      try {
        this.recognition.onstart = null;
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.stop();
      } catch (e) {
        // Safe catch
      }
      this.recognition = null;
    }

    // Stop audio meter interval
    if (this.vadInterval !== null) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }

    // Stop MediaRecorder and grab fallback audio if needed
    let fallbackText = '';
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        await new Promise<void>((resolve) => {
          if (!this.mediaRecorder) return resolve();
          this.mediaRecorder.onstop = () => resolve();
          try {
            this.mediaRecorder.stop();
          } catch (e) {
            resolve();
          }
        });
      } catch (e) {
        // Safe catch
      }
    }

    // If Web Speech already provided a valid final transcript, use that immediately
    if (this.latestTranscript && this.latestTranscript.trim().length > 0) {
      const finalResult = this.latestTranscript.trim();
      this.activeCallbacks?.onResult?.(finalResult, true);
      this.activeCallbacks?.onEnd?.();
      this.cleanupAudio();
      return finalResult;
    }

    // If Web Speech didn't capture text, transcribe via server Gemini
    if (this.recordedChunks.length > 0) {
      try {
        this.activeCallbacks?.onStatus?.('Transcribing audio with Gemini...');
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.recordedChunks, { type: mimeType });

        if (audioBlob.size > 1500) {
          const base64Audio = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const res = reader.result as string;
              resolve(res || '');
            };
            reader.onerror = reject;
            reader.readAsDataURL(audioBlob);
          });

          if (base64Audio) {
            const res = await fetch('/api/gemini/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64: base64Audio,
                mimeType,
                language: this.currentLanguage,
              }),
            });

            if (res.ok) {
              const data = await res.json();
              if (data.transcript && typeof data.transcript === 'string' && data.transcript.trim()) {
                fallbackText = data.transcript.trim();
                this.activeCallbacks?.onResult?.(fallbackText, true);
              }
            }
          }
        }
      } catch (transcribeErr) {
        console.warn('Fallback server transcription error:', transcribeErr);
      }
    }

    this.activeCallbacks?.onEnd?.();
    this.cleanupAudio();
    return fallbackText || this.latestTranscript;
  }

  /**
   * Release microphone tracks and hardware resources completely
   */
  public cleanupAudio(): void {
    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
      } catch (e) {
        // Safe catch
      }
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (e) {
        // Safe catch
      }
      this.audioContext = null;
    }

    if (this.vadInterval !== null) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }

    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.analyser = null;
    this.isListening = false;
    this.isAcquiring = false;
  }

  public getCurrentUtterance(): SpeechSynthesisUtterance | null {
    return this.currentUtterance;
  }

  public setLipSyncCallback(cb: ((amplitude: number) => void) | null): void {
    this.lipSyncCallback = cb;
  }

  /**
   * Multilingual text to speech with lip-sync simulation
   */
  public speak(
    text: string,
    language = 'en-US',
    speed = 1.0,
    callbacks?: SpeechSynthesisCallbacks
  ): void {
    if (!this.isSynthesisSupported()) {
      callbacks?.onError?.('Speech synthesis not supported');
      return;
    }

    // Cancel any previous speech
    window.speechSynthesis.cancel();
    this.stopLipSync();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = Math.max(0.7, Math.min(1.3, speed));
    utterance.pitch = 1.05; // Gentle, empathetic voice tone

    // Choose female voice matching language if available
    const voices = window.speechSynthesis.getVoices();
    const targetLangCode = language.replace('_', '-').toLowerCase();
    const primaryCode = targetLangCode.split('-')[0];

    // Find voices matching the target language
    let candidateVoices = voices.filter(
      (v) => v.lang.toLowerCase() === targetLangCode || v.lang.toLowerCase().startsWith(primaryCode)
    );

    // If Kannada is selected and browser lacks a designated 'kn' voice, fall back gracefully to Indic / multilingual voices
    if (candidateVoices.length === 0 && primaryCode === 'kn') {
      candidateVoices = voices.filter(
        (v) =>
          v.name.toLowerCase().includes('kannada') ||
          v.lang.toLowerCase().includes('in') ||
          v.name.toLowerCase().includes('india') ||
          v.lang.toLowerCase().startsWith('hi')
      );
    }

    if (candidateVoices.length === 0) {
      candidateVoices = voices;
    }

    // Prefer high-quality female voice identifiers
    const femaleVoice = candidateVoices.find((v) => {
      const n = v.name.toLowerCase();
      return (
        n.includes('female') ||
        n.includes('natural') ||
        n.includes('zira') ||
        n.includes('samantha') ||
        n.includes('ava') ||
        n.includes('jenny') ||
        n.includes('sonia') ||
        n.includes('victoria') ||
        n.includes('kore') ||
        n.includes('swara') ||
        n.includes('kalpana') ||
        n.includes('shruti') ||
        n.includes('sapna') ||
        (n.includes('google') && !n.includes('male'))
      );
    });

    if (femaleVoice) {
      utterance.voice = femaleVoice;
    } else if (candidateVoices.length > 0) {
      utterance.voice = candidateVoices[0];
    }

    utterance.onstart = () => {
      this.startLipSync();
      callbacks?.onStart?.();
    };

    utterance.onboundary = (event) => {
      // Trigger a viseme pulse on word/sentence boundaries
      if (this.lipSyncCallback) {
        this.lipSyncCallback(0.75 + Math.random() * 0.25);
      }
      callbacks?.onBoundary?.(event.charIndex, event.name);
    };

    utterance.onend = () => {
      this.stopLipSync();
      callbacks?.onEnd?.();
    };

    utterance.onerror = (err) => {
      this.stopLipSync();
      callbacks?.onError?.(err);
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  public stopSpeaking(): void {
    if (this.isSynthesisSupported()) {
      window.speechSynthesis.cancel();
    }
    this.currentUtterance = null;
    this.stopLipSync();
  }

  private startLipSync(): void {
    this.stopLipSync();
    if (!this.lipSyncCallback) return;

    // Simulate speech phoneme modulation (viseme mouth movement)
    this.lipSyncInterval = window.setInterval(() => {
      if (!this.lipSyncCallback) return;
      // Oscillate with dynamic speech cadence
      const time = Date.now() / 120;
      const wave = Math.sin(time) * 0.5 + Math.cos(time * 2.3) * 0.3 + 0.4;
      const amp = Math.max(0, Math.min(1, wave));
      this.lipSyncCallback(amp);
    }, 60);
  }

  private stopLipSync(): void {
    if (this.lipSyncInterval !== null) {
      clearInterval(this.lipSyncInterval);
      this.lipSyncInterval = null;
    }
    if (this.lipSyncCallback) {
      this.lipSyncCallback(0);
    }
  }

  /**
   * Play subtle soothing chime audio using Web Audio API
   */
  public playChime(type: 'complete' | 'notification' | 'breathe'): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'complete') {
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.25); // G5
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      } else if (type === 'breathe') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(261.63, now); // C4
        osc.frequency.exponentialRampToValueAtTime(329.63, now + 0.4);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.start(now);
        osc.stop(now + 0.8);
      } else {
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch (e) {
      // Audio autoplay policy catch
    }
  }
}

export const speechService = new SpeechService();
