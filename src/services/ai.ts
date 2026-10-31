import type { DailyCheckIn, ChatMessage, UserSettings, UserProfile, EmotionType, AppLanguage } from '../types';
import { detectLanguage } from './speech';

export interface AIReflectionResponse {
  reflection: string;
  suggestedActions: string[];
  tags: string[];
}

export interface AIChatResponse {
  reply: string;
  suggestedActions?: string[];
  followUpSuggestions?: string[];
  emotion: EmotionType;
  detectedLanguage?: AppLanguage;
  isLocalFallback?: boolean;
}

/**
 * Generate a continuous, human-like conversational reply for Pluto
 * Uses server-side Gemini 3.8 Flash API with automatic fallback to built-in local engine
 */
export async function generateCompanionReply(
  userText: string,
  chatHistory: ChatMessage[],
  latestCheckIn?: DailyCheckIn,
  settings?: UserSettings,
  userProfile?: UserProfile
): Promise<AIChatResponse> {
  const selectedLang = (settings?.language as AppLanguage) || 'en-US';
  const autoDetected = detectLanguage(userText);
  const targetLang = (autoDetected === 'kn-IN' || autoDetected === 'hi-IN') ? autoDetected : selectedLang;

  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          chatHistory: chatHistory.map((m) => ({ sender: m.sender, text: m.text })),
          language: targetLang,
          latestCheckIn,
          userProfile,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          reply: data.reply || getLocalFallbackReply(userText, targetLang, userProfile?.fullName),
          emotion: data.emotion || detectEmotion(userText),
          detectedLanguage: data.detectedLanguage || targetLang,
          suggestedActions: data.suggestedActions || [],
          followUpSuggestions: data.followUpSuggestions || getDefaultFollowUps(targetLang),
          isLocalFallback: !!data.isLocalFallback,
        };
      }
    } catch (err) {
      console.warn('Backend /api/gemini/chat failed, activating Local Pluto Engine:', err);
    }
  }

  // Local fallback
  return {
    reply: getLocalFallbackReply(userText, targetLang, userProfile?.fullName),
    emotion: detectEmotion(userText),
    detectedLanguage: targetLang,
    suggestedActions: ['Take 3 deep breaths and write down your top priority.'],
    followUpSuggestions: getDefaultFollowUps(targetLang),
    isLocalFallback: true,
  };
}

/**
 * Generate an AI reflection for a daily check-in
 */
export async function generateCheckInReflection(
  checkIn: DailyCheckIn,
  recentHistory: DailyCheckIn[],
  settings?: UserSettings,
  userProfile?: UserProfile
): Promise<AIReflectionResponse> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/gemini/reflection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkIn,
          recentHistory,
          userProfile,
          settings,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.reflection) {
          return {
            reflection: data.reflection,
            suggestedActions: data.suggestedActions || ['Protect 15 minutes of rest.'],
            tags: data.tags || ['Mindfulness'],
          };
        }
      }
    } catch (err) {
      console.warn('Backend reflection failed, using local engine:', err);
    }
  }

  return generateLocalMindReflection(checkIn, recentHistory);
}

/**
 * Generate image visualization via server-side Gemini 3.1 Flash Lite Image or Mind Canvas
 */
export async function generateMindImage(
  prompt: string,
  aspectRatio: string = '1:1'
): Promise<{
  success: boolean;
  imageUrl?: string;
  aspectRatio?: string;
  isGenerativeFallback?: boolean;
  notice?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/gemini/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, aspectRatio }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to generate image' };
    }
    return {
      success: true,
      imageUrl: data.imageUrl,
      aspectRatio: data.aspectRatio || aspectRatio,
      isGenerativeFallback: data.isGenerativeFallback,
      notice: data.notice,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Image generation network error' };
  }
}

/**
 * Generate audio via server-side Gemini Lyria model
 */
export async function generateMindAudio(
  prompt: string
): Promise<{ success: boolean; audioUrl?: string; message?: string; isProceduralNotice?: boolean; error?: string }> {
  try {
    const res = await fetch('/api/gemini/audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Generate video meditation visual via server-side Gemini Omni Flash Interactions API
 */
export async function generateMindVideo(
  prompt: string,
  aspectRatio: string = '16:9'
): Promise<{ success: boolean; videoUrl?: string; message?: string; requiresPaidKey?: boolean; error?: string }> {
  try {
    const res = await fetch('/api/gemini/video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, aspectRatio }),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Emotion recognition
 */
export function detectEmotion(text: string): EmotionType {
  const lower = text.toLowerCase();
  if (lower.includes('angry') || lower.includes('mad') || lower.includes('furious') || lower.includes('annoyed') || lower.includes('hate') || lower.includes('irritat')) {
    return 'angry';
  }
  if (lower.includes('lonely') || lower.includes('alone') || lower.includes('isolated') || lower.includes('nobody cares') || lower.includes('empty')) {
    return 'lonely';
  }
  if (lower.includes('confused') || lower.includes('lost') || lower.includes("don't know what to do") || lower.includes('unsure') || lower.includes('puzzled')) {
    return 'confused';
  }
  if (lower.includes('stress') || lower.includes('overwhelm') || lower.includes('anxious') || lower.includes('panic') || lower.includes('pressure') || lower.includes('burnout')) {
    return 'stressed';
  }
  if (lower.includes('sad') || lower.includes('depressed') || lower.includes('cry') || lower.includes('hurt') || lower.includes('miserable') || lower.includes('hopeless')) {
    return 'sad';
  }
  if (lower.includes('excited') || lower.includes('hyped') || lower.includes('thrilled') || lower.includes('can’t wait') || lower.includes('pumped')) {
    return 'excited';
  }
  if (lower.includes('happy') || lower.includes('great') || lower.includes('good') || lower.includes('proud') || lower.includes('aced') || lower.includes('wonderful')) {
    return 'happy';
  }
  return 'calm';
}

function getLocalFallbackReply(userText: string, lang: AppLanguage, name = 'there'): string {
  const lower = userText.toLowerCase().trim();
  const shortName = name.split(' ')[0] || 'there';

  // Kannada conversations
  if (lang === 'kn-IN' || /[\u0C80-\u0CFF]/.test(userText)) {
    if (lower.includes('ಹೆಂಗಿದ್ದೀಯಾ') || lower.includes('ಹೇಗಿದ್ದೀರಾ') || lower.includes('hegid') || lower.includes('hengiddiya')) {
      return 'ಹೂ, ನಾನು ಚೆನ್ನಾಗಿದ್ದೀನಿ! ನೀನೇನು ಮಾಡ್ತಿದ್ದೀಯಾ?';
    }
    if (lower.includes('ನಮಸ್ಕಾರ') || lower.includes('namaskara') || lower.includes('hi') || lower.includes('hello')) {
      return `ನಮಸ್ಕಾರ ${shortName}! ಇಂದು ನಿಮ್ಮ ದಿನ ಹೇಗಿದೆ?`;
    }
    if (lower.includes('ಸುಸ್ತು') || lower.includes('tired') || lower.includes('ಆಯಾಸ')) {
      return `ಓಹ್ ಹೌದಾ? ತುಂಬಾ ಕೆಲಸವಿತ್ತಾ ಇಂದು? ಏನಾಯಿತು ಹೇಳಿ?`;
    }
    if (lower.includes('ಖುಷಿ') || lower.includes('happy') || lower.includes('ಸಂತೋಷ')) {
      return 'ತುಂಬಾ ಒಳ್ಳೆಯ ವಿಷಯ! ಏನು ವಿಶೇಷ? ಹೇಳಿ ನನಗೂ ತಿಳಿಯಲಿ!';
    }
    if (lower.includes('ಒಂಟಿ') || lower.includes('lonely')) {
      return 'ನಾನು ಇಲ್ಲಿದ್ದೇನೆ ನಿಮ್ಮ ಮಾತು ಕೇಳಲು. ನಿಮ್ಮ ಮನಸ್ಸಿನಲ್ಲಿ ಏನು ನಡೆಯುತ್ತಿದೆ ಎಂದು ಹಂಚಿಕೊಳ್ಳಲು ಬಯಸುವಿರಾ?';
    }
    if (lower.includes('exam') || lower.includes('study') || lower.includes('ಓದು') || lower.includes('ಪರೀಕ್ಷೆ')) {
      return `ನಮಸ್ಕಾರ ${shortName}! ಪರೀಕ್ಷೆಯ ದಿನಗಳಲ್ಲಿ ಮಾನಸಿಕ ಒತ್ತಡ ಹೆಚ್ಚಾಗುವುದು ಸಾಮಾನ್ಯ. ಆದರೆ ನೆನಪಿಡಿ: 25 ನಿಮಿಷಗಳ ಕೇಂದ್ರೀಕೃತ ಪೊಮೊಡೊರೊ ಸ್ಪ್ರಿಂಟ್ ಹೆಚ್ಚು ನೆನಪು ಉಳಿಸುತ್ತದೆ. ಯಾವ ವಿಷಯದಲ್ಲಿ ನಿಮಗೆ ಹೆಚ್ಚು ಒತ್ತಡ ಅನಿಸುತ್ತಿದೆ?`;
    }
    return `ನಮಸ್ಕಾರ ${shortName}! ನಾನು ಪ್ಲೂಟೋ, ನಿಮ್ಮ 3D ಸಂಗಾತಿ. ಇಂದು ನೀವು ಹೇಗೆ ಭಾವಿಸುತ್ತಿದ್ದೀರಿ?`;
  }

  // Hindi conversations
  if (lang === 'hi-IN' || /[\u0900-\u097F]/.test(userText)) {
    if (lower.includes('kaise ho') || lower.includes('कैसे हो') || lower.includes('कैसी हो') || lower.includes('kya haal')) {
      return 'हाँ, मैं बिल्कुल ठीक हूँ! आप क्या कर रहे हैं आज?';
    }
    if (lower.includes('namaste') || lower.includes('नमस्ते') || lower.includes('hi') || lower.includes('hello')) {
      return `नमस्ते ${shortName}! आज आपका दिन कैसा चल रहा है?`;
    }
    if (lower.includes('थका') || lower.includes('tired') || lower.includes('थकान')) {
      return 'अरे सच में? क्या बहुत लंबा दिन था? कुछ हुआ क्या?';
    }
    if (lower.includes('खुश') || lower.includes('happy') || lower.includes('अच्छा लग रहा')) {
      return 'वाह, यह तो बहुत अच्छी बात है! क्या हुआ? मुझे भी बताइए!';
    }
    if (lower.includes('अकेला') || lower.includes('lonely') || lower.includes('अकेलापन')) {
      return 'मैं हमेशा आपके साथ हूँ। क्या आप बताना चाहेंगे कि आपके मन में क्या चल रहा है?';
    }
    if (lower.includes('exam') || lower.includes('study') || lower.includes('पढ़ाई') || lower.includes('परीक्षा')) {
      return `नमस्ते ${shortName}! परीक्षा का तनाव बहुत भारी महसूस हो सकता है। पर याद रखें: 25 मिनट के छोटे, केंद्रित पोमोडोरो स्प्रिंट में पढ़ाई करें। किस विषय को लेकर आपको सबसे ज्यादा फिक्र है?`;
    }
    return `नमस्ते ${shortName}! मैं प्लूटो हूँ, आपकी साथी। आज आपके मन में क्या चल रहा है?`;
  }

  // English conversations
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/i.test(lower) || lower === 'hi pluto!' || lower === 'hi pluto' || lower === 'hey pluto') {
    return 'Hey! How are you doing today?';
  }
  if (lower.includes('feeling a little tired') || lower.includes('feel tired') || lower.includes('so tired') || lower.includes('exhausted') || lower.includes("i'm tired")) {
    return 'Oh really? Was it a long day? Did something happen?';
  }
  if (lower.includes("i'm happy") || lower.includes('im happy') || lower.includes('feeling happy') || lower.includes('great day') || lower.includes('wonderful day')) {
    return "That's lovely! What happened? Tell me!";
  }
  if (lower.includes('feel lonely') || lower.includes('feeling lonely') || lower.includes('so lonely') || lower.includes('i feel alone') || lower.includes('lonely')) {
    return "I'm here to listen. Do you want to talk about what's been on your mind?";
  }
  if (lower.includes('stress') || lower.includes('anxious') || lower.includes('overwhelm')) {
    return `Take a slow, deep breath with me right now, ${shortName}. Overwhelm happens when our mind tries to solve twenty future deadlines all at once. If you could only move the needle on ONE single thing today, what would give you the most relief?`;
  }
  if (lower.includes('exam') || lower.includes('midterm') || lower.includes('finals') || lower.includes('test')) {
    return `I completely understand that pressure, ${shortName}. Exam season creates an overwhelming background hum. But cognitive retention actually consolidates during deep rest, not during 2 AM panic cramming. Which specific subject or assignment is feeling heaviest right now?`;
  }
  if (lower.includes('joke') || lower.includes('funny') || lower.includes('laugh')) {
    return "Why did the neural network go to school? To improve its latent talents and stop overfitting on textbooks!";
  }

  return `I'm right here with you, ${shortName}. Student life has so many competing demands, and it's easy to lose touch with how your mind and body are actually doing. What's on your mind today?`;
}

function getDefaultFollowUps(lang: AppLanguage): string[] {
  if (lang === 'kn-IN') {
    return [
      '25 ನಿಮಿಷಗಳ ಅಧ್ಯಯನ ಆರಂಭಿಸೋಣ',
      'ನನಗೆ ಪರೀಕ್ಷೆಯ ಭಯವಾಗುತ್ತಿದೆ',
      'ನನ್ನ ನಿದ್ರೆಯ ಮಾದರಿಯ ಬಗ್ಗೆ ಹೇಳು',
    ];
  }
  if (lang === 'hi-IN') {
    return [
      '25 मिनट का स्टडी स्प्रिंट शुरू करें',
      'मुझे परीक्षा को लेकर थोड़ा तनाव है',
      'मेरी नींद और पढ़ाई का रूटीन कैसा है?',
    ];
  }
  return [
    'Help me set up a 25-minute study sprint',
    'I’m feeling a bit overwhelmed with assignments',
    'What patterns do you notice in my check-ins?',
  ];
}

function generateLocalMindReflection(checkIn: DailyCheckIn, recentHistory: DailyCheckIn[]): AIReflectionResponse {
  const { mood, sleepHours, energy, stress, workload } = checkIn;
  const recentAvg = recentHistory.length > 0
    ? Math.round((recentHistory.slice(-3).reduce((a, b) => a + b.sleepHours, 0) / Math.min(3, recentHistory.length)) * 10) / 10
    : 7.5;

  let reflection = '';
  const actions: string[] = [];
  const tags: string[] = [];

  if (sleepHours < 6.0) {
    reflection += `You logged ${sleepHours} hours of sleep, below your recent average of ${recentAvg}h. Noticeable energy dips (${energy}/5) are a natural biological response to sleep debt rather than a lack of willpower. `;
    actions.push('Schedule an earlier bedtime target tonight (wind-down starting 45m before sleep).');
    tags.push('SleepDebt');
  } else if (sleepHours >= 7.5) {
    reflection += `A solid foundation of ${sleepHours} hours of sleep (vs ${recentAvg}h recent) supported your daytime mood (${mood}/5) and cognitive resilience. `;
    tags.push('Restored');
  } else {
    reflection += `With ${sleepHours} hours of sleep and moderate energy (${energy}/5), your study rhythm stayed functional today. `;
    tags.push('Balanced');
  }

  if (stress >= 7) {
    reflection += `Your stress was reported at ${stress}/10 under a ${workload} academic workload. Remember that high output requires deliberate interval breaks, not continuous marathons. `;
    actions.push('Take a 15-minute screen-free walk or quiet stretch to reset your nervous system.');
    tags.push('HighWorkload');
  } else {
    reflection += `Stress remained manageable (${stress}/10), providing space for clear thinking. `;
  }

  if (actions.length === 0) {
    actions.push('Plan tomorrow’s single most important academic priority before bed.');
  }

  return {
    reflection: reflection.trim(),
    suggestedActions: actions.slice(0, 2),
    tags,
  };
}
