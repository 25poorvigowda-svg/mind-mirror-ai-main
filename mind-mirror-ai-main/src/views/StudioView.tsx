import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  Music,
  Video as VideoIcon,
  Download,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RefreshCw,
  AlertCircle,
  Film,
  Waves,
  Radio,
} from 'lucide-react';
import { generateMindImage, generateMindAudio, generateMindVideo } from '../services/ai';
import { Badge } from '../components/ui/Badge';
import confetti from 'canvas-confetti';

interface StudioViewProps {
  onNotify?: (msg: string) => void;
}

// Procedural soundscapes synthesized using Web Audio API
interface AmbientSoundscape {
  id: string;
  name: string;
  category: 'focus' | 'sleep' | 'calm';
  description: string;
  frequency: number; // Base Hz
  waveType: OscillatorType;
  noiseType?: 'pink' | 'white';
}

const PRESET_SOUNDSCAPES: AmbientSoundscape[] = [
  {
    id: 'deep_focus_alpha',
    name: '432Hz Deep Focus Alpha Wave',
    category: 'focus',
    description: 'Promotes sustained cognitive attention and reduces task procrastination.',
    frequency: 432,
    waveType: 'sine',
  },
  {
    id: 'binaural_theta',
    name: '6Hz Theta Memory Consolidation',
    category: 'sleep',
    description: 'Associated with deep cognitive memory consolidation and REM restoration.',
    frequency: 216,
    waveType: 'triangle',
  },
  {
    id: 'cosmic_calm',
    name: 'Pluto Cosmic Ambient Pad',
    category: 'calm',
    description: 'Slow harmonic resonance for down-regulating academic nervous tension.',
    frequency: 528,
    waveType: 'sine',
  },
  {
    id: 'study_rain',
    name: 'Pink Noise Library Rain',
    category: 'focus',
    description: 'Gentle simulated rainfall acoustics that mask harsh background library distractions.',
    frequency: 320,
    waveType: 'sine',
    noiseType: 'pink',
  },
];

export const StudioView: React.FC<StudioViewProps> = ({ onNotify }) => {
  const [activeSubTab, setActiveSubTab] = useState<'image' | 'audio' | 'video'>('image');

  // --- Image Studio State ---
  const [imagePrompt, setImagePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '4:3' | '9:16'>('1:1');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<
    { id: string; url: string; prompt: string; ratio: string; createdAt: number; isGenerativeFallback?: boolean; notice?: string }[]
  >([]);
  const [imageError, setImageError] = useState<string | null>(null);

  // --- Audio Studio State ---
  const [audioPrompt, setAudioPrompt] = useState('');
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [activeSoundscape, setActiveSoundscape] = useState<AmbientSoundscape | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [aiAudioUrl, setAiAudioUrl] = useState<string | null>(null);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const osc1Ref = useRef<OscillatorNode | null>(null);
  const osc2Ref = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const htmlAudioRef = useRef<HTMLAudioElement | null>(null);

  // --- Video Studio State ---
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoRatio, setVideoRatio] = useState<'16:9' | '9:16'>('16:9');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoResult, setVideoResult] = useState<{ url: string; prompt: string } | null>(null);
  const [videoMessage, setVideoMessage] = useState<string | null>(null);

  const stopProceduralAudio = useCallback(() => {
    try {
      if (osc1Ref.current) {
        osc1Ref.current.stop();
        osc1Ref.current.disconnect();
        osc1Ref.current = null;
      }
      if (osc2Ref.current) {
        osc2Ref.current.stop();
        osc2Ref.current.disconnect();
        osc2Ref.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    } catch {
      // safe cleanup
    }
    setIsPlayingAudio(false);
  }, []);

  // Stop procedural audio on unmount
  useEffect(() => {
    return () => {
      stopProceduralAudio();
    };
  }, [stopProceduralAudio]);

  // Update volume
  useEffect(() => {
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setValueAtTime(isMuted ? 0 : audioVolume * 0.18, audioCtxRef.current.currentTime);
    }
    if (htmlAudioRef.current) {
      htmlAudioRef.current.volume = isMuted ? 0 : audioVolume;
    }
  }, [audioVolume, isMuted]);

  // Web Audio Procedural Synthesis
  const startProceduralSoundscape = (soundscape: AmbientSoundscape) => {
    stopProceduralAudio();
    if (htmlAudioRef.current) {
      htmlAudioRef.current.pause();
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(isMuted ? 0 : audioVolume * 0.18, ctx.currentTime);
      gain.connect(ctx.destination);
      gainNodeRef.current = gain;

      // Base carrier tone
      const osc1 = ctx.createOscillator();
      osc1.type = soundscape.waveType;
      osc1.frequency.setValueAtTime(soundscape.frequency, ctx.currentTime);
      osc1.connect(gain);
      osc1.start();
      osc1Ref.current = osc1;

      // Binaural offset (+6Hz or +10Hz differential)
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(soundscape.frequency + (soundscape.category === 'sleep' ? 6 : 10), ctx.currentTime);
      osc2.connect(gain);
      osc2.start();
      osc2Ref.current = osc2;

      setActiveSoundscape(soundscape);
      setIsPlayingAudio(true);
    } catch (err) {
      console.warn('Audio context init failed:', err);
    }
  };

  // --- Handlers ---
  const handleGenerateImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePrompt.trim()) return;

    setIsGeneratingImage(true);
    setImageError(null);

    const res = await generateMindImage(imagePrompt.trim(), aspectRatio);
    setIsGeneratingImage(false);

    if (res.success && res.imageUrl) {
      const newItem = {
        id: 'img_' + Date.now(),
        url: res.imageUrl,
        prompt: imagePrompt.trim(),
        ratio: aspectRatio,
        createdAt: Date.now(),
        isGenerativeFallback: res.isGenerativeFallback,
        notice: res.notice,
      };
      setGeneratedImages((prev) => [newItem, ...prev]);
      confetti({ particleCount: 45, spread: 60 });
      onNotify?.(res.isGenerativeFallback ? 'Mindfulness Canvas art created!' : 'Generated wellness image preview ready!');
    } else {
      setImageError(res.error || 'Image generation failed. Verify API key in Settings.');
    }
  };

  const handleDownloadMedia = (dataUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  };

  const handleGenerateAiAudio = async () => {
    if (!audioPrompt.trim()) return;
    setIsGeneratingAudio(true);
    setAudioNotice(null);

    const res = await generateMindAudio(audioPrompt.trim());
    setIsGeneratingAudio(false);

    if (res.success && res.audioUrl) {
      setAiAudioUrl(res.audioUrl);
      confetti({ particleCount: 30, spread: 50 });
      onNotify?.('Generated custom study music clip!');
    } else {
      setAudioNotice(res.message || 'Custom music clip generated or using active procedural soundscape.');
    }
  };

  const handleGenerateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoPrompt.trim()) return;

    setIsGeneratingVideo(true);
    setVideoMessage(null);

    const res = await generateMindVideo(videoPrompt.trim(), videoRatio);
    setIsGeneratingVideo(false);

    if (res.success && res.videoUrl) {
      setVideoResult({ url: res.videoUrl, prompt: videoPrompt.trim() });
      confetti({ particleCount: 50, spread: 70 });
      onNotify?.('Meditation video ready for viewing!');
    } else {
      setVideoMessage(
        res.message ||
          res.error ||
          'Video generation via gemini-omni-1.1-flash requires an active Paid Gemini API key tier enabled in Google AI Studio.'
      );
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* Studio Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Generative AI Creative & Wellness Studio</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          Mind Studio: Images, Audio & Video
        </h1>
        <p className="mt-1 text-sm text-slate-300 max-w-3xl">
          Visual and sonic sensory tools designed for stress reduction, focus anchoring, and creative visualization.
        </p>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('image')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'image'
              ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
              : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Image Visualization</span>
        </button>

        <button
          onClick={() => setActiveSubTab('audio')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'audio'
              ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20'
              : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800'
          }`}
        >
          <Music className="w-4 h-4" />
          <span>Soundscapes & Music</span>
        </button>

        <button
          onClick={() => setActiveSubTab('video')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'video'
              ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20'
              : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800'
          }`}
        >
          <Film className="w-4 h-4" />
          <span>Meditation Video (Omni Flash)</span>
        </button>
      </div>

      {/* ================= 1. IMAGE GENERATION TAB ================= */}
      {activeSubTab === 'image' && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-slate-900/70 border border-cyan-500/20 p-6 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-cyan-400" />
                  <span>Mind Canvas: Text-to-Image Generation</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Powered by Google Gemini 3.1 Flash Lite Image. Visualize calm landscapes, study retreats, or metaphorical representations of mental clarity.
                </p>
              </div>
              <Badge variant="cyan" size="sm">Gemini Image</Badge>
            </div>

            <form onSubmit={handleGenerateImage} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Describe what you want to visualize:
                </label>
                <textarea
                  rows={3}
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="e.g., A peaceful Japanese stone garden in autumn mist, glowing soft lanterns, warm serene atmosphere..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Sample prompts */}
              <div className="flex flex-wrap gap-2">
                <span className="text-[11px] text-slate-500 py-1">Quick ideas:</span>
                {[
                  'A warm library reading nook with heavy rain on stained glass',
                  'A tranquil high mountain lake under starry cosmic aurora',
                  'A minimalist sunny study desk overlooking lush green pine forest',
                ].map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => setImagePrompt(sample)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/50 text-slate-300 transition-colors"
                  >
                    {sample}
                  </button>
                ))}
              </div>

              {/* Aspect Ratio Selector */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-300">Aspect Ratio:</span>
                  {(['1:1', '16:9', '4:3', '9:16'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setAspectRatio(ratio)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        aspectRatio === ratio
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isGeneratingImage || !imagePrompt.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isGeneratingImage ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generating Art...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Visualization</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {imageError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{imageError}</span>
              </div>
            )}
          </div>

          {/* Generated Gallery */}
          {generatedImages.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">Your Generated Mind Canvases</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {generatedImages.map((img) => (
                  <div
                    key={img.id}
                    className="rounded-3xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-xl space-y-3 p-4 flex flex-col justify-between"
                  >
                    <div className="overflow-hidden rounded-2xl bg-slate-950 flex items-center justify-center">
                      <img
                        src={img.url}
                        alt={img.prompt}
                        className={`w-full object-contain max-h-[380px] hover:scale-105 transition-transform duration-500 ${
                          img.ratio === '16:9' ? 'aspect-video' : img.ratio === '9:16' ? 'aspect-[9/16]' : 'aspect-square'
                        }`}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                          {img.isGenerativeFallback ? 'Mind Canvas Art' : 'Gemini 3.1 Flash Lite'}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">Ratio {img.ratio}</span>
                      </div>
                      <p className="text-xs text-slate-300 font-medium line-clamp-2">"{img.prompt}"</p>
                      {img.notice && (
                        <p className="text-[10px] text-slate-400 mt-1 italic line-clamp-1">{img.notice}</p>
                      )}
                      <div className="flex items-center justify-end pt-2">
                        <button
                          onClick={() => handleDownloadMedia(img.url, `mind-mirror-${img.id}.${img.url.startsWith('data:image/svg') ? 'svg' : 'png'}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950 border border-cyan-500/30 text-cyan-300 text-xs font-semibold hover:bg-cyan-900/50 transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Image</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= 2. AUDIO & SOUNDSCAPES TAB ================= */}
      {activeSubTab === 'audio' && (
        <div className="space-y-6">
          {/* Audio Player Card */}
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950/40 border border-teal-500/20 p-6 md:p-8 backdrop-blur-xl shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <Badge variant="teal" size="sm">Sensory Audio Station</Badge>
                <h2 className="text-xl font-bold text-white mt-1">Study & Relaxation Soundscapes</h2>
                <p className="text-xs text-slate-300">
                  Select a scientifically-attuned frequency soundscape or generate custom study music clips with AI.
                </p>
              </div>

              {/* Master Volume Slider */}
              <div className="flex items-center gap-3 bg-slate-950/80 px-4 py-2.5 rounded-2xl border border-slate-800">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-slate-400 hover:text-white"
                >
                  {isMuted || audioVolume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-teal-400" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : audioVolume}
                  onChange={(e) => {
                    setIsMuted(false);
                    setAudioVolume(parseFloat(e.target.value));
                  }}
                  className="w-24 accent-teal-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <span className="text-xs font-mono text-slate-400 w-8 text-right">
                  {Math.round((isMuted ? 0 : audioVolume) * 100)}%
                </span>
              </div>
            </div>

            {/* Soundscape Presets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PRESET_SOUNDSCAPES.map((sc) => {
                const isActive = activeSoundscape?.id === sc.id && isPlayingAudio;
                return (
                  <div
                    key={sc.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                      isActive
                        ? 'bg-teal-500/15 border-teal-400/60 shadow-lg shadow-teal-500/10'
                        : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white flex items-center gap-2">
                          <Waves className={`w-3.5 h-3.5 ${isActive ? 'text-teal-400 animate-pulse' : 'text-slate-400'}`} />
                          <span>{sc.name}</span>
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-400 uppercase font-semibold">
                          {sc.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                        {sc.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-teal-400/80 font-mono">
                        Base: {sc.frequency} Hz
                      </span>

                      <button
                        onClick={() => {
                          if (isActive) {
                            stopProceduralAudio();
                          } else {
                            startProceduralSoundscape(sc);
                          }
                        }}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-teal-400 text-slate-950 hover:bg-teal-300'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700'
                        }`}
                      >
                        {isActive ? (
                          <>
                            <Pause className="w-3.5 h-3.5" />
                            <span>Pause</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            <span>Play Soundscape</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* AI Custom Music Generator Section */}
            <div className="pt-4 border-t border-slate-800/80 space-y-3">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" />
                <span>AI Custom Music Clip Prompt (Lyria Model)</span>
              </h3>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={audioPrompt}
                  onChange={(e) => setAudioPrompt(e.target.value)}
                  placeholder="e.g., Chill lofi beats with soft acoustic guitar and distant rain..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
                <button
                  onClick={handleGenerateAiAudio}
                  disabled={isGeneratingAudio || !audioPrompt.trim()}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isGeneratingAudio ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Synthesizing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Music</span>
                    </>
                  )}
                </button>
              </div>

              {audioNotice && (
                <p className="text-xs text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  {audioNotice}
                </p>
              )}

              {aiAudioUrl && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-teal-500/30 flex items-center justify-between gap-4">
                  <audio ref={htmlAudioRef} src={aiAudioUrl} controls className="w-full max-w-md h-8" />
                  <button
                    onClick={() => handleDownloadMedia(aiAudioUrl, 'custom-mind-music.mp3')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-950 border border-teal-500/30 text-teal-300 text-xs font-semibold hover:bg-teal-900/50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= 3. VIDEO MEDITATION TAB ================= */}
      {activeSubTab === 'video' && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-slate-900/70 border border-violet-500/20 p-6 md:p-8 backdrop-blur-xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <VideoIcon className="w-4 h-4 text-violet-400" />
                  <span>Meditation Video Generation (Gemini Omni Flash)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Powered by <strong>gemini-omni-1.1-flash</strong> via the Gemini Interactions API. Generate serene cinematic visual meditation loops for grounding.
                </p>
              </div>
              <Badge variant="violet" size="sm">Omni Flash</Badge>
            </div>

            <form onSubmit={handleGenerateVideo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Meditation Video Prompt:
                </label>
                <textarea
                  rows={3}
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  placeholder="e.g., A slow cinematic camera gliding through glowing starlit clouds, soft purple celestial lighting, serene smooth movement..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Sample ideas */}
              <div className="flex flex-wrap gap-2">
                <span className="text-[11px] text-slate-500 py-1">Sample prompts:</span>
                {[
                  'Gentle ocean waves rolling over bioluminescent sand under golden dusk',
                  'Slow flight through peaceful misty alpine valley with calm pine trees',
                  'Calm celestial nebula breathing with rhythmic pulses of soft light',
                ].map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => setVideoPrompt(sample)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-violet-500/50 text-slate-300 transition-colors"
                  >
                    {sample}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-300">Format:</span>
                  {(['16:9', '9:16'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setVideoRatio(r)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        videoRatio === r
                          ? 'bg-violet-500/20 border-violet-400 text-violet-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {r} {r === '16:9' ? '(Landscape)' : '(Portrait)'}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isGeneratingVideo || !videoPrompt.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs hover:brightness-110 shadow-lg shadow-violet-500/25 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isGeneratingVideo ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Synthesizing Video...</span>
                    </>
                  ) : (
                    <>
                      <Film className="w-4 h-4" />
                      <span>Generate Meditation Video</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {videoMessage && (
              <div className="p-4 rounded-2xl bg-violet-950/40 border border-violet-500/30 text-xs text-violet-200 space-y-1">
                <div className="font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-violet-400 shrink-0" />
                  <span>Integration Status</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {videoMessage}
                </p>
              </div>
            )}

            {/* Generated Video Player */}
            {videoResult && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-white">Generated Video Preview</h4>
                <div className="rounded-xl overflow-hidden bg-black max-w-xl mx-auto">
                  <video
                    src={videoResult.url}
                    controls
                    autoPlay
                    loop
                    className="w-full max-h-[420px] object-contain"
                  />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-slate-300 truncate max-w-md">"{videoResult.prompt}"</p>
                  <button
                    onClick={() => handleDownloadMedia(videoResult.url, 'mind-meditation-video.mp4')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download MP4</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
