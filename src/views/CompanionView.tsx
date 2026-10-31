import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  PlusCircle,
  Trash2,
  CornerDownRight,
  User,
  HeartHandshake,
  Bot,
  History,
  Plus,
  MessageSquare,
  ChevronRight,
  X,
} from 'lucide-react';
import type { DailyCheckIn, ChatMessage, UserSettings, UserProfile, EmotionType, AppLanguage, ConversationSession } from '../types';
import { AvatarScene } from '../components/companion/AvatarScene';
import { WaveVisualizer } from '../components/companion/WaveVisualizer';
import { VoiceControls } from '../components/companion/VoiceControls';
import {
  speechService,
  type SupportedLanguage,
  type MicPermissionState,
  type AudioDeviceInfo,
  detectLanguage as detectSpeechLanguage,
  isRunningInIframe,
} from '../services/speech';
import { generateCompanionReply, detectEmotion } from '../services/ai';
import {
  db,
  getConversationSessions,
  createConversationSession,
  deleteConversationSession,
  clearAllConversations,
} from '../services/db';

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
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [lipSyncAmplitude, setLipSyncAmplitude] = useState(0);
  const [emotion, setEmotion] = useState<EmotionType>('calm');
  const [language, setLanguage] = useState<SupportedLanguage>((settings?.language as SupportedLanguage) || 'en-US');
  const [detectedLangBadge, setDetectedLangBadge] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [userMicLevel, setUserMicLevel] = useState(0);
  const [micPermissionState, setMicPermissionState] = useState<MicPermissionState>('prompt');
  const [audioDevices, setAudioDevices] = useState<AudioDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isIframe, setIsIframe] = useState<boolean>(false);

  useEffect(() => {
    setIsIframe(isRunningInIframe());

    // Check initial permission status
    speechService.checkPermissionStatus().then((status) => {
      setMicPermissionState(status);
    });

    // Subscribe to permission changes
    const unsub = speechService.onPermissionChange((status) => {
      setMicPermissionState(status);
    });

    // Populate audio devices if allowed
    speechService.getAudioInputDevices().then((devices) => {
      setAudioDevices(devices);
    });

    return () => unsub();
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const continuousModeRef = useRef(continuousMode);
  const isSpeakingRef = useRef(isSpeaking);

  useEffect(() => {
    continuousModeRef.current = continuousMode;
  }, [continuousMode]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  const userName = userProfile?.fullName ? userProfile.fullName.split(' ')[0] : 'there';

  // Sync language with settings if changed externally
  useEffect(() => {
    if (settings?.language) {
      setLanguage(settings.language as SupportedLanguage);
    }
  }, [settings?.language]);

  // Load or initialize conversation sessions and messages
  const loadSessionsAndMessages = useCallback(async () => {
    try {
      const allSessions = await getConversationSessions();
      setSessions(allSessions);

      if (allSessions.length > 0) {
        const targetSession = allSessions[0];
        setActiveSessionId(targetSession.id);
        const sessionMsgs = await db.chatHistory.where('sessionId').equals(targetSession.id).sortBy('timestamp');
        if (sessionMsgs.length > 0) {
          setMessages(sessionMsgs);
          const lastMsg = sessionMsgs[sessionMsgs.length - 1];
          if (lastMsg?.emotion) setEmotion(lastMsg.emotion);
          return;
        }
      }

      // If no sessions exist, create the default initial session
      const newSession = await createConversationSession('Welcome to Pluto', language);
      setActiveSessionId(newSession.id);
      setSessions([newSession]);

      const initialGreeting: ChatMessage = {
        id: 'msg_init_' + Date.now(),
        sessionId: newSession.id,
        sender: 'assistant',
        text: `Hey ${userName}! I'm PLUTO, your realistic 3D reflection companion. I'm here to converse with you naturally, unpack what's going on with your classes, sleep rhythm, or stress, and help you take your next steps. How are you doing today?`,
        timestamp: Date.now(),
        emotion: 'calm',
        followUpSuggestions: [
          'I have multiple deadlines this week',
          "I'm feeling a little tired",
          'Today was actually productive!',
        ],
      };

      setMessages([initialGreeting]);
      await db.chatHistory.add(initialGreeting);
      await db.chatSessions.update(newSession.id, {
        preview: initialGreeting.text.slice(0, 60),
        messageCount: 1,
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.warn('Error loading sessions:', err);
    }
  }, [userName, language]);

  useEffect(() => {
    loadSessionsAndMessages();
  }, [loadSessionsAndMessages]);

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

  // Switch to a previous conversation session
  const handleSelectSession = async (session: ConversationSession) => {
    handleStopSpeaking();
    setActiveSessionId(session.id);
    setShowHistoryDrawer(false);
    try {
      const msgs = await db.chatHistory.where('sessionId').equals(session.id).sortBy('timestamp');
      setMessages(msgs);
      if (msgs.length > 0) {
        const last = msgs[msgs.length - 1];
        if (last.emotion) setEmotion(last.emotion);
      }
    } catch (err) {
      console.warn('Error switching session:', err);
    }
  };

  // Start a fresh conversation
  const handleCreateNewChat = async () => {
    handleStopSpeaking();
    try {
      const newSession = await createConversationSession('New Reflection', language);
      setActiveSessionId(newSession.id);
      setSessions((prev) => [newSession, ...prev]);

      const initialGreeting: ChatMessage = {
        id: 'msg_init_' + Date.now(),
        sessionId: newSession.id,
        sender: 'assistant',
        text: `Hey ${userName}! Starting a fresh reflection space for us. What's on your mind right now?`,
        timestamp: Date.now(),
        emotion: 'calm',
        followUpSuggestions: [
          'Help me plan my study blocks today',
          'I want to review my sleep habits',
          'Tell me something relaxing',
        ],
      };

      setMessages([initialGreeting]);
      await db.chatHistory.add(initialGreeting);
      await db.chatSessions.update(newSession.id, {
        preview: initialGreeting.text.slice(0, 60),
        messageCount: 1,
        updatedAt: Date.now(),
      });
      setShowHistoryDrawer(false);
    } catch (err) {
      console.warn('Error creating new conversation:', err);
    }
  };

  // Delete a specific session
  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    await deleteConversationSession(sessionId);
    const updated = sessions.filter((s) => s.id !== sessionId);
    setSessions(updated);
    if (activeSessionId === sessionId) {
      if (updated.length > 0) {
        handleSelectSession(updated[0]);
      } else {
        handleCreateNewChat();
      }
    }
  };

  // Clear all conversations
  const handleClearAllHistory = async () => {
    await clearAllConversations();
    setSessions([]);
    setMessages([]);
    setShowClearConfirm(false);
    setShowHistoryDrawer(false);
    handleCreateNewChat();
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isProcessing) return;

    setInputText('');
    setInterimTranscript('');

    // Automatic Language Detection from user input text
    const autoLang = detectSpeechLanguage(text);
    let targetLang = language;
    if (autoLang === 'kn-IN' || autoLang === 'hi-IN') {
      targetLang = autoLang;
      setLanguage(autoLang);
      onSelectLanguage?.(autoLang);
      setDetectedLangBadge(autoLang === 'kn-IN' ? 'Kannada (ಕನ್ನಡ)' : 'Hindi (हिन्दी)');
    } else if (text.length > 15 && autoLang === 'en-US' && language !== 'en-US') {
      targetLang = 'en-US';
      setLanguage('en-US');
      onSelectLanguage?.('en-US');
      setDetectedLangBadge('English');
    }

    // Ensure session ID
    let currentSession = activeSessionId;
    if (!currentSession) {
      const created = await createConversationSession(text.slice(0, 32), targetLang);
      currentSession = created.id;
      setActiveSessionId(created.id);
      setSessions((prev) => [created, ...prev]);
    }

    const userMessage: ChatMessage = {
      id: 'msg_' + Date.now(),
      sessionId: currentSession,
      sender: 'user',
      text,
      timestamp: Date.now(),
      language: targetLang,
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
        sessionId: currentSession,
        sender: 'assistant',
        text: aiResponse.reply,
        timestamp: Date.now(),
        language: aiResponse.detectedLanguage || targetLang,
        extractedActions: aiResponse.suggestedActions,
        followUpSuggestions: aiResponse.followUpSuggestions,
        emotion: aiResponse.emotion,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      await db.chatHistory.add(assistantMessage);

      setEmotion(aiResponse.emotion);

      // Update session title and preview in Dexie
      try {
        await db.chatSessions.update(currentSession, {
          preview: aiResponse.reply.slice(0, 65),
          updatedAt: Date.now(),
          emotion: aiResponse.emotion,
          messageCount: messages.length + 2,
        });
        const updatedList = await getConversationSessions();
        setSessions(updatedList);
      } catch (e) {
        // Safe catch
      }

      // Vocalize response if not muted
      if (!isMuted) {
        setIsSpeaking(true);
        speechService.speak(aiResponse.reply, assistantMessage.language || targetLang, settings?.ttsSpeed || 1.0, {
          onStart: () => setIsSpeaking(true),
          onEnd: () => {
            setIsSpeaking(false);
            setLipSyncAmplitude(0);
            // Hands-Free Continuous Mode: auto-listen for user's next spoken reply
            if (continuousModeRef.current) {
              setTimeout(() => {
                triggerListen();
              }, 450);
            }
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

  const triggerListen = async () => {
    if (isSpeakingRef.current) {
      handleStopSpeaking();
    }
    setVoiceError(null);
    setInterimTranscript('');
    setVoiceStatus('Listening... Speak naturally');

    const started = await speechService.startListening(language, {
      onStart: () => {
        setIsListening(true);
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
        console.warn('Voice recognition notice:', err);
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
      triggerListen();
    }
  };

  const handleLanguageChange = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    onSelectLanguage?.(newLang);
    const names = {
      'en-US': 'English',
      'hi-IN': 'Hindi (हिन्दी)',
      'kn-IN': 'Kannada (ಕನ್ನಡ)',
    };
    setDetectedLangBadge(names[newLang]);
  };

  const handleRetryMicrophone = async () => {
    setVoiceError(null);
    setVoiceStatus('Testing microphone permissions...');
    const result = await speechService.requestMicrophonePermission();
    setVoiceStatus(null);
    setMicPermissionState(result.state);

    if (result.granted) {
      const devs = await speechService.getAudioInputDevices();
      setAudioDevices(devs);
      setVoiceStatus('Microphone ready! Click Voice Input when ready to speak.');
      setTimeout(() => setVoiceStatus(null), 3000);
    } else {
      setVoiceError(result.error || 'Microphone access failed.');
    }
  };

  const handleOpenStandalone = () => {
    try {
      window.open(window.location.href, '_blank');
    } catch (e) {
      // Fallback
    }
  };

  const handleSelectDevice = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    speechService.setSelectedDeviceId(deviceId);
  };

  // Latest follow-up suggestions from the most recent assistant message
  const lastAssistantMessage = [...messages].reverse().find((m) => m.sender === 'assistant');
  const activeFollowUps = lastAssistantMessage?.followUpSuggestions || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-10rem)] animate-fadeIn relative">
      {/* ================= Left Column: 3D Pluto Companion Interactive Stage ================= */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="relative flex-1 min-h-[420px] lg:min-h-[500px] rounded-3xl bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-slate-950 dark:from-slate-900/90 dark:via-slate-950/95 dark:to-slate-950 light:from-slate-100 light:via-white light:to-slate-50 border border-cyan-500/25 p-4 overflow-hidden backdrop-blur-2xl shadow-2xl flex flex-col items-center justify-center">
          {/* Central 3D Humanoid Pluto Avatar */}
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
            <div className="absolute top-14 left-4 z-10 hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 dark:bg-slate-900/80 light:bg-white/90 border border-slate-700/80 dark:border-slate-700/80 light:border-slate-200 text-[11px] text-slate-300 dark:text-slate-300 light:text-slate-700 backdrop-blur-md pointer-events-none">
              <span>Sleep: {latestCheckIn.sleepHours}h</span>
              <span>•</span>
              <span>Stress: {latestCheckIn.stress}/10</span>
            </div>
          )}
        </div>

        {/* Real-Time Voice Controls Bar */}
        <VoiceControls
          isListening={isListening}
          isSpeaking={isSpeaking}
          isMuted={isMuted}
          continuousMode={continuousMode}
          language={language}
          interimTranscript={interimTranscript}
          voiceError={voiceError}
          voiceStatus={voiceStatus}
          isTranscribing={isTranscribing}
          userMicLevel={userMicLevel}
          micPermissionState={micPermissionState}
          audioDevices={audioDevices}
          selectedDeviceId={selectedDeviceId}
          isIframe={isIframe}
          onToggleListen={handleToggleListen}
          onDismissError={() => setVoiceError(null)}
          onToggleMute={() => {
            if (isSpeaking) speechService.stopSpeaking();
            setIsMuted(!isMuted);
          }}
          onToggleContinuousMode={() => setContinuousMode(!continuousMode)}
          onStopSpeaking={handleStopSpeaking}
          onSelectLanguage={handleLanguageChange}
          onSelectDevice={handleSelectDevice}
          onRetryMicrophone={handleRetryMicrophone}
          onOpenStandalone={handleOpenStandalone}
        />
      </div>

      {/* ================= Right Column: Conversational Dialogue Stream ================= */}
      <div className="lg:col-span-7 flex flex-col h-[600px] lg:h-[720px] rounded-3xl bg-slate-900/70 dark:bg-slate-900/70 light:bg-white/95 border border-cyan-500/20 backdrop-blur-xl shadow-xl overflow-hidden relative">
        {/* Chat Stream Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 dark:border-slate-800/80 light:border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/80 dark:bg-cyan-950/80 light:bg-cyan-50 border border-cyan-500/30 text-cyan-400 dark:text-cyan-400 light:text-cyan-600">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white dark:text-white light:text-slate-900">
                  Dialogue with Pluto
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 dark:text-cyan-300 light:text-cyan-700 border border-cyan-500/30 uppercase">
                  {emotion}
                </span>
                {detectedLangBadge && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 dark:text-violet-300 light:text-violet-700 border border-violet-500/30">
                    {detectedLangBadge}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-400 light:text-slate-500">
                Natural reflection in English, Hindi (हिन्दी) & Kannada (ಕನ್ನಡ)
              </p>
            </div>
          </div>

          {/* Action Toolbar: Sessions Drawer, New Chat, Clear */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 dark:bg-slate-950/80 light:bg-slate-100 hover:bg-slate-800 text-slate-300 dark:text-slate-300 light:text-slate-700 text-xs font-semibold border border-slate-700/80 transition-colors cursor-pointer"
              title="View conversation history & past sessions"
            >
              <History className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Conversations</span>
            </button>

            <button
              onClick={handleCreateNewChat}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 dark:text-cyan-300 light:text-cyan-700 text-xs font-semibold border border-cyan-500/30 transition-colors cursor-pointer"
              title="Start a new conversation"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Chat</span>
            </button>

            {/* Clear Chat Control */}
            {showClearConfirm ? (
              <div className="flex items-center gap-1.5 bg-rose-950/90 p-1 rounded-xl border border-rose-500/40 animate-fadeIn">
                <span className="text-[11px] text-rose-200 px-1">Clear all?</span>
                <button
                  onClick={handleClearAllHistory}
                  className="px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[11px] font-bold cursor-pointer hover:bg-rose-500"
                >
                  Yes
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[11px] cursor-pointer"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="text-slate-500 hover:text-slate-300 dark:hover:text-slate-300 light:hover:text-slate-800 p-2 rounded-xl hover:bg-slate-800/50 dark:hover:bg-slate-800/50 light:hover:bg-slate-100 transition-colors cursor-pointer"
                title="Clear conversation history"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
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
                    className={`p-4 rounded-2xl text-xs md:text-sm leading-relaxed backdrop-blur-md shadow-md ${
                      isUser
                        ? 'bg-violet-600 text-white rounded-tr-none shadow-violet-950/40'
                        : 'bg-slate-950/80 dark:bg-slate-950/80 light:bg-slate-100 border border-slate-800 dark:border-slate-800 light:border-slate-200 text-slate-200 dark:text-slate-200 light:text-slate-800 rounded-tl-none'
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
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-950/70 dark:bg-teal-950/70 light:bg-teal-50 border border-teal-500/40 text-teal-300 dark:text-teal-300 light:text-teal-700 hover:bg-teal-900/80 text-xs font-semibold transition-all group cursor-pointer"
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
              <div className="px-4 py-3 rounded-2xl bg-slate-950 dark:bg-slate-950 light:bg-slate-100 border border-slate-800 dark:border-slate-800 light:border-slate-200 text-cyan-400 text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>Pluto is reflecting...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Dynamic Quick Reply Suggestions */}
        {activeFollowUps.length > 0 && !isProcessing && (
          <div className="px-6 py-2 border-t border-slate-800/60 dark:border-slate-800/60 light:border-slate-200 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] text-slate-500 shrink-0 flex items-center gap-1">
              <CornerDownRight className="w-3 h-3 text-cyan-400" />
              <span>Suggested:</span>
            </span>
            {activeFollowUps.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(suggestion)}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-slate-950 dark:bg-slate-950 light:bg-slate-100 border border-slate-800 dark:border-slate-800 light:border-slate-200 hover:border-cyan-500/50 text-slate-300 dark:text-slate-300 light:text-slate-700 hover:text-cyan-300 text-xs transition-colors cursor-pointer"
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
              className="flex-1 bg-slate-950 dark:bg-slate-950 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-300 rounded-2xl px-4 py-3 text-xs md:text-sm text-white dark:text-white light:text-slate-900 placeholder-slate-500 focus:outline-none focus:border-cyan-500 shadow-inner"
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

          {/* Ethics & Language reminder */}
          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 px-1">
            <span className="flex items-center gap-1">
              <HeartHandshake className="w-3 h-3 text-cyan-400" />
              <span>Pluto provides peer reflection & wellness pacing. Not medical diagnosis.</span>
            </span>
            <span>English • Hindi • Kannada</span>
          </div>
        </div>

        {/* ================= Conversation History Drawer ================= */}
        {showHistoryDrawer && (
          <div className="absolute inset-0 z-30 bg-slate-950/95 dark:bg-slate-950/95 light:bg-white/95 backdrop-blur-2xl p-6 flex flex-col justify-between animate-fadeIn">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 dark:border-slate-800 light:border-slate-200">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base font-bold text-white dark:text-white light:text-slate-900">
                    Conversation History
                  </h3>
                </div>
                <button
                  onClick={() => setShowHistoryDrawer(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white dark:hover:text-white light:hover:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sessions List */}
              <div className="mt-4 space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {sessions.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    No saved conversations yet.
                  </div>
                ) : (
                  sessions.map((sess) => {
                    const isActive = sess.id === activeSessionId;
                    return (
                      <div
                        key={sess.id}
                        onClick={() => handleSelectSession(sess)}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                          isActive
                            ? 'bg-cyan-950/60 dark:bg-cyan-950/60 light:bg-cyan-50 border-cyan-500/50 shadow-md'
                            : 'bg-slate-900/50 dark:bg-slate-900/50 light:bg-slate-50 border-slate-800 dark:border-slate-800 light:border-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div
                            className={`p-2 rounded-xl shrink-0 ${
                              isActive
                                ? 'bg-cyan-500 text-slate-950 font-bold'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            <MessageSquare className="w-4 h-4" />
                          </div>
                          <div className="overflow-hidden">
                            <h4 className="text-xs font-bold text-white dark:text-white light:text-slate-900 truncate">
                              {sess.title || 'Reflection Session'}
                            </h4>
                            <p className="text-[11px] text-slate-400 dark:text-slate-400 light:text-slate-600 truncate mt-0.5">
                              {sess.preview || 'No messages'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(sess.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                          <button
                            onClick={(e) => handleDeleteSession(e, sess.id)}
                            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                            title="Delete this conversation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-slate-600" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-800 dark:border-slate-800 light:border-slate-200 flex items-center justify-between">
              <button
                onClick={handleCreateNewChat}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-lg shadow-cyan-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Start New Reflection</span>
              </button>

              <button
                onClick={handleClearAllHistory}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold px-3 py-2 rounded-xl hover:bg-rose-950/40 transition-colors cursor-pointer"
              >
                Clear All Conversations
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
