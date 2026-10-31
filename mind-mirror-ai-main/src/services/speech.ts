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
   * Start listening with resilient dual-engine architecture:
   * 1. Explicitly prompts browser microphone permissions via getUserMedia.
   * 2. Runs Web Speech API if supported for zero-latency live streaming text.
   * 3. Concurrently records audio with MediaRecorder for fallback transcription via Gemini if Web Speech fails or is unsupported.
   * 4. Computes live audio levels via AnalyserNode to drive audio visualizers.
   */
  public async startListening(
    language: string,
    callbacks: SpeechRecognitionCallbacks
  ): Promise<boolean> {
    this.stopSpeaking();
    this.cleanupAudio();

    this.activeCallbacks = callbacks;
    this.currentLanguage = language || 'en-US';
    this.latestTranscript = '';
    this.webSpeechReceivedText = false;
    this.recordedChunks = [];

    // 1. Explicitly request microphone access to unlock browser permissions
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        callbacks.onStatus?.('Requesting microphone permission...');
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (permErr: any) {
        console.warn('Microphone permission error:', permErr);
        const name = permErr.name || '';
        let userMessage = 'Microphone access failed.';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          userMessage = 'Microphone permission was denied. Please allow microphone access in your browser address bar.';
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          userMessage = 'No microphone device was detected on your computer.';
        } else if (name === 'NotReadableError' || name === 'TrackStartError') {
          userMessage = 'Microphone is already in use by another application.';
        }
        callbacks.onError?.(userMessage);
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

    // 3. Setup concurrent MediaRecorder fallback
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

        this.mediaRecorder.start(250); // collect 250ms chunks
      } catch (recErr) {
        console.warn('MediaRecorder buffer setup skipped:', recErr);
      }
    }

    // 4. Setup Web Speech Recognition if available
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
          console.warn('Web Speech recognition event error:', errCode);
          if (errCode === 'no-speech') {
            // Natural silence pause; do not terminate session
            return;
          }
          if (errCode === 'network') {
            // Google Web Speech server unreachable in current environment; fallback handles it
            callbacks.onStatus?.('Web Speech network paused — voice recorder active');
            return;
          }
          if (errCode === 'not-allowed' || errCode === 'service-not-allowed') {
            callbacks.onError?.('Microphone access blocked. Please allow microphone in browser settings.');
            this.stopListening();
            return;
          }
        };

        rec.onend = () => {
          // If the recognition ended but the user is still in listening mode, check if we need to finish
          if (this.isListening && this.webSpeechReceivedText && this.latestTranscript) {
            callbacks.onResult?.(this.latestTranscript, true);
          }
        };

        rec.start();
        this.recognition = rec;
        webSpeechStarted = true;
        this.isListening = true;
      } catch (recStartErr) {
        console.warn('Web Speech API could not start directly, using audio recorder fallback:', recStartErr);
      }
    }

    if (!webSpeechStarted && this.mediaRecorder) {
      // Running pure audio recorder mode (e.g. Firefox or when Web Speech is unsupported)
      this.isListening = true;
      callbacks.onStart?.();
      callbacks.onStatus?.('Listening... Speak naturally');
      return true;
    }

    if (webSpeechStarted) {
      return true;
    }

    // Neither Web Speech nor MediaRecorder could start
    callbacks.onError?.('Voice input is not supported in this browser. Please use Chrome, Edge, Safari, or Firefox.');
    this.cleanupAudio();
    return false;
  }

  /**
   * Stop listening and finalize transcription
   */
  public async stopListening(): Promise<string> {
    this.isListening = false;

    // Stop Web Speech
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore
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
        // Ignore
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

    // If Web Speech didn't capture text (e.g. In Firefox or network error), transcribe via server Gemini
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

  private cleanupAudio(): void {
    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => track.stop());
      } catch (e) {
        // Ignore
      }
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (e) {
        // Ignore
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
    const targetLangCode = language.replace('_', '-');
    const exactLangVoices = voices.filter(
      (v) => v.lang.toLowerCase() === targetLangCode.toLowerCase() || v.lang.toLowerCase().startsWith(targetLangCode.slice(0, 2).toLowerCase())
    );

    // Prefer female voice identifiers
    const femaleVoice = exactLangVoices.find((v) => {
      const n = v.name.toLowerCase();
      return (
        n.includes('female') ||
        n.includes('natural') ||
        n.includes('zira') ||
        n.includes('samantha') ||
        n.includes('kore') ||
        n.includes('swara') ||
        n.includes('kalpana') ||
        n.includes('shruti') ||
        n.includes('victoria') ||
        n.includes('google')
      );
    });

    if (femaleVoice) {
      utterance.voice = femaleVoice;
    } else if (exactLangVoices.length > 0) {
      utterance.voice = exactLangVoices[0];
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
