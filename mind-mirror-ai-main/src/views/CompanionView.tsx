import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  PlusCircle,
  Trash2,
  CornerDownRight,
  User,
  HeartHandshake,
  Bot,
} from 'lucide-react';
import type { DailyCheckIn, ChatMessage, UserSettings, UserProfile, EmotionType, AppLanguage } from '../types';
import { AvatarScene } from '../components/companion/AvatarScene';
import { WaveVisualizer } from '../components/companion/WaveVisualizer';
import { VoiceControls } from '../components/companion/VoiceControls';
import { speechService, type SupportedLanguage } from '../services/speech';
import { generateCompanionReply, detectEmotion } from '../services/ai';
import { db } from '../services/db';

interface CompanionViewProps {
  latestCheckIn?: DailyCheckIn;
  settings?: UserSettings;
  userProfile?: UserProfile;
  onAddTaskToPlanner: (taskTitle: string) => void;
  onSelectLanguage?: (lang: AppLanguage) => void;
}

export const CompanionView: React.FC<CompanionViewProps> = ({
  latestCheckIn,
  settings,
  userProfile,
  onAddTaskToPlanner,
  onSelectLanguage,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [lipSyncAmplitude, setLipSyncAmplitude] = useState(0);
  const [emotion, setEmotion] = useState<EmotionType>('calm');
  const [language, setLanguage] = useState<SupportedLanguage>((settings?.language as SupportedLanguage) || 'en-US');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [userMicLevel, setUserMicLevel] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userName = userProfile?.fullName ? userProfile.fullName.split(' ')[0] : 'there';

  // Sync language with settings if changed externally
  useEffect(() => {
    if (settings?.language) {
      setLanguage(settings.language as SupportedLanguage);
    }
  }, [settings?.language]);

  // Load chat history from IndexedDB on mount
  useEffect(() => {
    async function loadHistory() {
      const saved = await db.chatHistory.orderBy('timestamp').toArray();
      if (saved.length > 0) {
        setMessages(saved);
        const lastMsg = saved[saved.length - 1];
        if (lastMsg?.emotion) {
          setEmotion(lastMsg.emotion as EmotionType);
        }
      } else {
        // Welcome message from Pluto
        const initialGreeting: ChatMessage = {
          id: 'msg_init',
          sender: 'assistant',
          text: `Hey ${userName}! I'm PLUTO, your realistic 3D reflection companion. I'm here to converse with you naturally, unpack what's going on with your classes, sleep rhythm, or stress, and help you take your next steps. How is your day feeling right now?`,
          timestamp: Date.now(),
          emotion: 'calm',
          followUpSuggestions: [
            'I have multiple deadlines this week',
            'I have been feeling drained lately',
            'Today was actually productive',
          ],
        };
        setMessages([initialGreeting]);
        await db.chatHistory.add(initialGreeting);
      }
    }
    loadHistory();
  }, [userName]);

  // Set lip-sync callback
  useEffect(() => {
    speechService.setLipSyncCallback((amp) => {
      setLipSyncAmplitude(amp);
    });

    return () => {
      speechService.stopSpeaking();
      speechService.stopListening();
      speechService.setLipSyncCallback(null);
    };
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimTranscript]);

  const handleStopSpeaking = () => {
    speechService.stopSpeaking();
    setIsSpeaking(false);
    setLipSyncAmplitude(0);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isProcessing) return;

    setInputText('');
    setInterimTranscript('');

    const userMessage: ChatMessage = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      text,
      timestamp: Date.now(),
      language,
    };

    setMessages((prev) => [...prev, userMessage]);
    await db.chatHistory.add(userMessage);

    setIsProcessing(true);
    setEmotion(detectEmotion(text));

    try {
      const aiResponse = await generateCompanionReply(
        text,
        messages,
        latestCheckIn,
        settings,
        userProfile
      );

      const assistantMessage: ChatMessage = {
        id: 'msg_' + (Date.now() + 1),
        sender: 'assistant',
        text: aiResponse.reply,
        timestamp: Date.now(),
        language: aiResponse.detectedLanguage || language,
        extractedActions: aiResponse.suggestedActions,
        followUpSuggestions: aiResponse.followUpSuggestions,
        emotion: aiResponse.emotion,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      await db.chatHistory.add(assistantMessage);

      setEmotion(aiResponse.emotion);

      // Vocalize response if not muted
      if (!isMuted) {
        setIsSpeaking(true);
        speechService.speak(aiResponse.reply, assistantMessage.language || language, settings?.ttsSpeed || 1.0, {
          onStart: () => setIsSpeaking(true),
          onEnd: () => {
            setIsSpeaking(false);
            setLipSyncAmplitude(0);
          },
          onError: () => {
            setIsSpeaking(false);
            setLipSyncAmplitude(0);
          },
        });
      }
    } catch (err) {
      console.error('Pluto chat generation error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleListen = async () => {
    setVoiceError(null);

    if (isListening) {
      setIsListening(false);
      setIsTranscribing(true);
      setVoiceStatus('Processing voice input...');

      try {
        const finalTranscript = await speechService.stopListening();
        const textToSubmit = (finalTranscript || interimTranscript).trim();
        if (textToSubmit.length > 1) {
          handleSendMessage(textToSubmit);
        } else {
          setVoiceError('No speech detected. Please speak clearly into your microphone.');
        }
      } catch (err: any) {
        console.warn('Stop listening error:', err);
      } finally {
        setIsTranscribing(false);
        setVoiceStatus(null);
        setInterimTranscript('');
        setUserMicLevel(0);
      }
    } else {
      speechService.stopSpeaking();
      setIsSpeaking(false);
      setInterimTranscript('');
      setVoiceStatus('Requesting microphone...');

      const started = await speechService.startListening(language, {
        onStart: () => {
          setIsListening(true);
          setEmotion('calm');
          setVoiceStatus(null);
          setVoiceError(null);
        },
        onResult: (transcript, isFinal) => {
          setInterimTranscript(transcript);
          if (isFinal && transcript.trim().length > 1) {
            setIsListening(false);
            setUserMicLevel(0);
            speechService.stopListening();
            handleSendMessage(transcript.trim());
          }
        },
        onAudioLevel: (level) => {
          setUserMicLevel(level);
        },
        onStatus: (status) => {
          setVoiceStatus(status);
        },
        onError: (err) => {
          console.warn('Voice recognition error:', err);
          setIsListening(false);
          setIsTranscribing(false);
          setVoiceStatus(null);
          setUserMicLevel(0);
          setVoiceError(err);
        },
        onEnd: () => {
          setIsListening(false);
          setUserMicLevel(0);
        },
      });

      if (!started) {
        setIsListening(false);
        setVoiceStatus(null);
      }
    }
  };

  const handleClearChat = async () => {
    await db.chatHistory.clear();
    setMessages([]);
    setShowClearConfirm(false);
  };

  const handleLanguageChange = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    onSelectLanguage?.(newLang);
  };

  // Latest follow-up suggestions from the most recent assistant message
  const lastAssistantMessage = [...messages].reverse().find((m) => m.sender === 'assistant');
  const activeFollowUps = lastAssistantMessage?.followUpSuggestions || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-10rem)] animate-fadeIn">
      {/* Left Column: 3D Pluto Companion Interactive Stage */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="relative flex-1 min-h-[420px] lg:min-h-[500px] rounded-3xl bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-slate-950 border border-cyan-500/25 p-4 overflow-hidden backdrop-blur-2xl shadow-2xl flex flex-col items-center justify-center">
          {/* Central 3D ReadyPlayerMe Humanoid Avatar */}
          <AvatarScene
            isSpeaking={isSpeaking}
            isListening={isListening}
            emotion={emotion}
            lipSyncAmplitude={lipSyncAmplitude}
            modelStyle="realistic_pluto"
          />

          {/* Audio Wave Visualizer Overlay when Pluto speaks */}
          {isSpeaking && (
            <div className="absolute bottom-6 left-0 right-0 px-6 z-20 pointer-events-none">
              <WaveVisualizer isSpeaking={isSpeaking} amplitude={lipSyncAmplitude} />
            </div>
          )}

          {/* Quick Context Pill */}
          {latestCheckIn && (
            <div className="absolute top-14 left-4 z-10 hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700/80 text-[11px] text-slate-300 backdrop-blur-md pointer-events-none">
              <span>Sleep: {latestCheckIn.sleepHours}h</span>
              <span>•</span>
              <span>Stress: {latestCheckIn.stress}/10</span>
            </div>
          )}
        </div>

        {/* Two-Way Voice Controls Bar */}
        <VoiceControls
          isListening={isListening}
          isSpeaking={isSpeaking}
          isMuted={isMuted}
          language={language}
          interimTranscript={interimTranscript}
          voiceError={voiceError}
          voiceStatus={voiceStatus}
          isTranscribing={isTranscribing}
          userMicLevel={userMicLevel}
          onToggleListen={handleToggleListen}
          onDismissError={() => setVoiceError(null)}
          onToggleMute={() => {
            if (isSpeaking) speechService.stopSpeaking();
            setIsMuted(!isMuted);
          }}
          onStopSpeaking={handleStopSpeaking}
          onSelectLanguage={handleLanguageChange}
        />
      </div>

      {/* Right Column: Conversational Dialogue Stream */}
      <div className="lg:col-span-7 flex flex-col h-[600px] lg:h-[720px] rounded-3xl bg-slate-900/70 dark:bg-slate-900/70 light:bg-white/90 border border-cyan-500/20 backdrop-blur-xl shadow-xl overflow-hidden">
        {/* Chat Stream Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 dark:border-slate-800/80 light:border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/30 text-cyan-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white dark:text-white light:text-slate-900 flex items-center gap-2">
                <span>Dialogue with Pluto</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase">
                  {emotion}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Natural reflection in English, Hindi (हिन्दी) & Kannada (ಕನ್ನಡ)
              </p>
            </div>
          </div>

          {/* Clear Chat Control */}
          {showClearConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-rose-300">Clear chat?</span>
              <button
                onClick={handleClearChat}
                className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold"
              >
                Yes
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-slate-500 hover:text-slate-300 p-2 rounded-xl hover:bg-slate-800/50 transition-colors"
              title="Clear conversation history"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[88%] md:max-w-[80%] ${
                  isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold ${
                    isUser
                      ? 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white'
                      : 'bg-gradient-to-br from-cyan-400 to-teal-500 text-slate-950 font-black'
                  }`}
                >
                  {isUser ? (
                    userProfile?.fullName ? userProfile.fullName[0].toUpperCase() : <User className="w-4 h-4" />
                  ) : (
                    'P'
                  )}
                </div>

                {/* Message Bubble */}
                <div className="space-y-2">
                  <div
                    className={`p-4 rounded-2xl text-xs md:text-sm leading-relaxed backdrop-blur-md ${
                      isUser
                        ? 'bg-violet-600 text-white rounded-tr-none shadow-md shadow-violet-950/40'
                        : 'bg-slate-950/80 dark:bg-slate-950/80 light:bg-slate-100 border border-slate-800 dark:border-slate-800 light:border-slate-300 text-slate-200 dark:text-slate-200 light:text-slate-800 rounded-tl-none shadow-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>

                  {/* AI Suggested Action Chips */}
                  {!isUser && msg.extractedActions && msg.extractedActions.length > 0 && (
                    <div className="space-y-1.5 pl-1">
                      {msg.extractedActions.map((action, i) => (
                        <button
                          key={i}
                          onClick={() => onAddTaskToPlanner(action)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-950/70 border border-teal-500/40 text-teal-300 hover:bg-teal-900/80 text-xs font-semibold transition-all group cursor-pointer"
                        >
                          <PlusCircle className="w-3.5 h-3.5 text-teal-400 group-hover:rotate-90 transition-transform" />
                          <span>Add to Planner: "{action}"</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isProcessing && (
            <div className="flex gap-3 max-w-[80%] items-center mr-auto">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold">
                P
              </div>
              <div className="px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-cyan-400 text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>Pluto is reflecting...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Dynamic Quick Reply Suggestions */}
        {activeFollowUps.length > 0 && !isProcessing && (
          <div className="px-6 py-2 border-t border-slate-800/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] text-slate-500 shrink-0 flex items-center gap-1">
              <CornerDownRight className="w-3 h-3 text-cyan-400" />
              <span>Suggested:</span>
            </span>
            {activeFollowUps.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(suggestion)}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 text-xs transition-colors cursor-pointer"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Text Input Footer Form */}
        <div className="p-4 border-t border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 bg-slate-950/60 dark:bg-slate-950/60 light:bg-slate-50">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Reflect with Pluto... (English, हिन्दी, ಕನ್ನಡ)"
              className="flex-1 bg-slate-950 dark:bg-slate-950 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-300 rounded-2xl px-4 py-3 text-xs md:text-sm text-white dark:text-white light:text-slate-900 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isProcessing}
              className="p-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 hover:brightness-110 shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-40 cursor-pointer"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Ethics reminder */}
          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 px-1">
            <span className="flex items-center gap-1">
              <HeartHandshake className="w-3 h-3 text-cyan-400" />
              <span>Pluto provides peer reflection & wellness pacing. Not medical diagnosis.</span>
            </span>
            <span>English • Hindi • Kannada</span>
          </div>
        </div>
      </div>
    </div>
  );
};
