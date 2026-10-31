import React from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Globe,
  Square,
  Volume1,
  AlertCircle,
  Loader2,
  Radio,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Sliders,
} from 'lucide-react';
import {
  LANGUAGE_OPTIONS,
  type SupportedLanguage,
  type MicPermissionState,
  type AudioDeviceInfo,
} from '../../services/speech';

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
  continuousMode?: boolean;
  micPermissionState?: MicPermissionState;
  audioDevices?: AudioDeviceInfo[];
  selectedDeviceId?: string;
  isIframe?: boolean;
  onToggleListen: () => void;
  onToggleMute: () => void;
  onToggleContinuousMode?: () => void;
  onStopSpeaking?: () => void;
  onSelectLanguage: (lang: SupportedLanguage) => void;
  onSelectDevice?: (deviceId: string) => void;
  onRetryMicrophone?: () => void;
  onOpenStandalone?: () => void;
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
  continuousMode = false,
  micPermissionState = 'prompt',
  audioDevices = [],
  selectedDeviceId = '',
  isIframe = false,
  onToggleListen,
  onToggleMute,
  onToggleContinuousMode,
  onStopSpeaking,
  onSelectLanguage,
  onSelectDevice,
  onRetryMicrophone,
  onOpenStandalone,
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

  const renderPermissionBadge = () => {
    switch (micPermissionState) {
      case 'granted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mic: Ready</span>
          </span>
        );
      case 'denied':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <MicOff className="w-3.5 h-3.5 text-rose-400" />
            <span>Mic: Blocked in Browser</span>
          </span>
        );
      case 'restricted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Mic: Container Restricted</span>
          </span>
        );
      case 'unsupported':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Mic: Hardware Missing</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            <Mic className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mic: Click to Enable</span>
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Actionable Error Banner if Mic is Blocked or Error occurs */}
      {voiceError && (
        <div className="flex flex-col gap-3 p-4 rounded-2xl bg-rose-950/85 border border-rose-500/50 text-rose-200 text-xs shadow-xl animate-fadeIn backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block text-rose-100">Microphone Access Notice</span>
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

          {/* Action buttons to recover permission or switch to standalone window */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-rose-900/60">
            {onRetryMicrophone && (
              <button
                onClick={onRetryMicrophone}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs shadow transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Microphone</span>
              </button>
            )}

            {(isIframe || micPermissionState === 'restricted' || micPermissionState === 'denied') && onOpenStandalone && (
              <button
                onClick={onOpenStandalone}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-rose-200 font-semibold text-xs border border-rose-500/40 transition-all cursor-pointer"
                title="Open Mind Mirror AI in a standalone browser tab for direct microphone permission"
              >
                <ExternalLink className="w-3.5 h-3.5 text-rose-300" />
                <span>Open in Standalone Tab</span>
              </button>
            )}
          </div>
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
                {voiceStatus || 'Microphone Active — Speak Now'}
              </span>
            </div>

            {/* Live Audio Level Meter */}
            <div className="flex items-center gap-1" title="Live audio input volume">
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
        {/* Left Cluster: Language & Mic Status Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Language selector */}
          <div className="flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-cyan-400" />
            <select
              value={language}
              onChange={(e) => onSelectLanguage(e.target.value as SupportedLanguage)}
              className="bg-slate-950 dark:bg-slate-950 light:bg-slate-100 text-xs text-slate-200 dark:text-slate-200 light:text-slate-800 border border-slate-700/80 rounded-xl px-2.5 py-1.5 font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer"
              aria-label="Select voice conversation language"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.flag} {opt.label} ({opt.nativeName})
                </option>
              ))}
            </select>
          </div>

          {/* Microphone Permission Status Indicator Badge */}
          {renderPermissionBadge()}

          {/* Audio Input Device Selector (if multiple microphones are connected) */}
          {audioDevices.length > 1 && onSelectDevice && (
            <div className="flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedDeviceId}
                onChange={(e) => onSelectDevice(e.target.value)}
                className="bg-slate-950 dark:bg-slate-950 light:bg-slate-100 text-[11px] text-slate-300 dark:text-slate-300 light:text-slate-700 border border-slate-700/80 rounded-xl px-2 py-1 max-w-[140px] truncate focus:outline-none focus:border-cyan-500 cursor-pointer"
                title="Select microphone input device"
              >
                <option value="">Default Microphone</option>
                {audioDevices.map((dev) => (
                  <option key={dev.deviceId} value={dev.deviceId}>
                    {dev.label || 'Audio Input Device'}
                  </option>
                ))}
              </select>
            </div>
          )}
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

        {/* Right Actions: Hands-Free, Stop, Mute, Retry */}
        <div className="flex items-center gap-1.5">
          {/* Explicit Retry Mic Button in Toolbar if permission denied or error */}
          {(micPermissionState === 'denied' || micPermissionState === 'restricted' || voiceError) && onRetryMicrophone && (
            <button
              onClick={onRetryMicrophone}
              title="Test & Retry Microphone Permission"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-rose-500/50 text-rose-300 hover:text-white hover:bg-rose-950/60 text-xs font-semibold transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Retry Mic</span>
            </button>
          )}

          {onToggleContinuousMode && (
            <button
              onClick={onToggleContinuousMode}
              title={continuousMode ? 'Continuous Voice Active (Auto-listens after Pluto speaks)' : 'Enable Continuous Voice Mode (Hands-free conversation)'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                continuousMode
                  ? 'bg-violet-950/80 border-violet-500/50 text-violet-300 shadow-sm'
                  : 'bg-slate-950 dark:bg-slate-950 light:bg-slate-100 border-slate-700/80 text-slate-400 hover:text-white'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${continuousMode ? 'text-violet-400 animate-pulse' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">{continuousMode ? 'Hands-Free On' : 'Hands-Free'}</span>
            </button>
          )}

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
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
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
