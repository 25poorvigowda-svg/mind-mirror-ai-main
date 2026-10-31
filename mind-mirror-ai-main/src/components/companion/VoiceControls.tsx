import React from 'react';
import { Mic, MicOff, Volume2, VolumeX, Globe, Square, Volume1, AlertCircle, Loader2 } from 'lucide-react';
import { LANGUAGE_OPTIONS, type SupportedLanguage } from '../../services/speech';

interface VoiceControlsProps {
  isListening: boolean;
  isSpeaking?: boolean;
  isMuted: boolean;
  language: SupportedLanguage;
  interimTranscript: string;
  voiceError?: string | null;
  voiceStatus?: string | null;
  isTranscribing?: boolean;
  userMicLevel?: number;
  onToggleListen: () => void;
  onToggleMute: () => void;
  onStopSpeaking?: () => void;
  onSelectLanguage: (lang: SupportedLanguage) => void;
  onDismissError?: () => void;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  isListening,
  isSpeaking,
  isMuted,
  language,
  interimTranscript,
  voiceError,
  voiceStatus,
  isTranscribing,
  userMicLevel = 0,
  onToggleListen,
  onToggleMute,
  onStopSpeaking,
  onSelectLanguage,
  onDismissError,
}) => {
  const getListeningPlaceholder = (lang: SupportedLanguage) => {
    switch (lang) {
      case 'kn-IN':
        return 'ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದ್ದೇನೆ... ಮಾತನಾಡಿ (Listening in Kannada)';
      case 'hi-IN':
        return 'सुन रहा हूँ... बोलिए (Listening in Hindi)';
      default:
        return 'Listening... Speak naturally in English';
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Actionable Error Banner if Mic is Blocked or Error occurs */}
      {voiceError && (
        <div className="flex items-start justify-between gap-3 p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs shadow-xl animate-fadeIn backdrop-blur-md">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold block text-rose-100">Microphone Notice</span>
              <p className="text-[11px] leading-relaxed text-rose-200/90">{voiceError}</p>
            </div>
          </div>
          {onDismissError && (
            <button
              onClick={onDismissError}
              className="text-rose-400 hover:text-white text-xs px-2 py-0.5 rounded-lg bg-rose-900/60 font-semibold shrink-0 cursor-pointer"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* Live Transcribing State Indicator */}
      {isTranscribing && (
        <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-teal-950/70 border border-teal-500/40 text-teal-200 text-xs shadow-lg animate-pulse">
          <Loader2 className="w-4 h-4 text-teal-400 shrink-0 animate-spin" />
          <span className="font-medium">
            {voiceStatus || 'Transcribing your voice input with Pluto...'}
          </span>
        </div>
      )}

      {/* Live Speech Recognition Bubble & Voice Meter */}
      {isListening && (
        <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-violet-950/60 border border-violet-500/40 text-violet-200 text-xs shadow-lg">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-violet-400 shrink-0 animate-bounce" />
              <span className="font-semibold text-violet-300">
                {voiceStatus || 'Microphone Active'}
              </span>
            </div>

            {/* Live Audio Level Meter */}
            <div className="flex items-center gap-1">
              {[0.15, 0.35, 0.55, 0.75, 0.95].map((thresh, idx) => {
                const isActive = (userMicLevel || 0) >= thresh;
                return (
                  <span
                    key={idx}
                    className={`w-1 rounded-full transition-all duration-75 ${
                      isActive ? 'bg-cyan-400 h-4' : 'bg-violet-900/60 h-1.5'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          <div className="font-medium italic text-slate-200 bg-slate-950/50 p-2.5 rounded-xl border border-violet-500/20">
            {interimTranscript || getListeningPlaceholder(language)}
          </div>
        </div>
      )}

      {/* Speaking Active Indicator with Interrupt Button */}
      {isSpeaking && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-200 text-xs shadow-lg">
          <div className="flex items-center gap-2">
            <Volume1 className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="font-semibold">Pluto is speaking...</span>
          </div>

          {onStopSpeaking && (
            <button
              onClick={onStopSpeaking}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white font-bold text-xs shadow transition-all cursor-pointer"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Interrupt / Stop</span>
            </button>
          )}
        </div>
      )}

      {/* Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/80 dark:bg-slate-900/80 light:bg-white/90 border border-slate-800 dark:border-slate-800 light:border-slate-200 backdrop-blur-md shadow-md">
        {/* Language selector */}
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-400" />
          <select
            value={language}
            onChange={(e) => onSelectLanguage(e.target.value as SupportedLanguage)}
            className="bg-slate-950 dark:bg-slate-950 light:bg-slate-100 text-xs text-slate-200 dark:text-slate-200 light:text-slate-800 border border-slate-700/80 rounded-xl px-2.5 py-1.5 font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.flag} {opt.label} ({opt.nativeName})
              </option>
            ))}
          </select>
        </div>

        {/* Central Mic Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleListen}
            disabled={isTranscribing}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-lg cursor-pointer disabled:opacity-50 ${
              isListening
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 animate-pulse'
                : isTranscribing
                ? 'bg-teal-700 text-white'
                : 'bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 shadow-cyan-500/25'
            }`}
          >
            {isTranscribing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Transcribing...</span>
              </>
            ) : isListening ? (
              <>
                <MicOff className="w-4 h-4" />
                <span>Done Speaking</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Voice Input</span>
              </>
            )}
          </button>
        </div>

        {/* Mute/Unmute TTS Voice */}
        <div className="flex items-center gap-2">
          {isSpeaking && onStopSpeaking && (
            <button
              onClick={onStopSpeaking}
              title="Stop speaking"
              className="p-2 rounded-xl bg-slate-800 text-rose-300 border border-rose-500/30 hover:bg-rose-950/40 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          )}

          <button
            onClick={onToggleMute}
            title={isMuted ? 'Unmute voice' : 'Mute voice'}
            className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
              isMuted
                ? 'bg-slate-800 text-slate-400 border-slate-700'
                : 'bg-cyan-950/40 text-cyan-400 border-cyan-500/30'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
