import express, { type Request, type Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

app.use(express.json({ limit: '25mb' }));

// Shared server-side GoogleGenAI client factory
function getGeminiClient(): GoogleGenAI {
  const currentKey = process.env.GEMINI_API_KEY || '';
  return new GoogleGenAI({
    apiKey: currentKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function hasValidGeminiKey(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return typeof key === 'string' && key.trim().length > 10 && !key.includes('placeholder');
}

console.log(`[Mind Mirror AI Server] Initializing on ${HOST}:${PORT} (Gemini Key present: ${hasValidGeminiKey()})`);

// Procedural Generative Art Generator for Mindfulness Canvas
function generateMindfulnessSvg(promptText: string, aspectRatio: string): string {
  let width = 1024;
  let height = 1024;
  if (aspectRatio === '16:9') {
    width = 1280;
    height = 720;
  } else if (aspectRatio === '9:16') {
    width = 720;
    height = 1280;
  } else if (aspectRatio === '4:3') {
    width = 1024;
    height = 768;
  }

  // Hash prompt to generate deterministic variation
  let hash = 0;
  for (let i = 0; i < promptText.length; i++) {
    hash = (hash << 5) - hash + promptText.charCodeAt(i);
    hash |= 0;
  }
  hash = Math.abs(hash);

  const lower = promptText.toLowerCase();
  const isAurora = /aurora|forest|green|nature|mountain|pine|tree/.test(lower);
  const isWarm = /sunset|dawn|dusk|warm|gold|fire|autumn|orange|sun/.test(lower);
  const isWater = /ocean|water|sea|lake|rain|river|wave|beach/.test(lower);

  let gradTop = '#050814';
  let gradMid = '#1e1035';
  let gradBot = '#090d1f';
  let orbColor1 = '#38bdf8';
  let orbColor2 = '#a855f7';
  let mountain1 = '#13112c';
  let mountain2 = '#0d1326';
  let mountain3 = '#070b14';
  let accentRing = 'rgba(168, 85, 247, 0.25)';

  if (isAurora) {
    gradTop = '#021b1a';
    gradMid = '#064e3b';
    gradBot = '#022c22';
    orbColor1 = '#34d399';
    orbColor2 = '#06b6d4';
    mountain1 = '#063a33';
    mountain2 = '#042823';
    mountain3 = '#021a17';
    accentRing = 'rgba(52, 211, 153, 0.25)';
  } else if (isWarm) {
    gradTop = '#2e1065';
    gradMid = '#831843';
    gradBot = '#7c2d12';
    orbColor1 = '#f59e0b';
    orbColor2 = '#f43f5e';
    mountain1 = '#4c0519';
    mountain2 = '#2e1026';
    mountain3 = '#180718';
    accentRing = 'rgba(245, 158, 11, 0.25)';
  } else if (isWater) {
    gradTop = '#020617';
    gradMid = '#0f172a';
    gradBot = '#0c4a6e';
    orbColor1 = '#38bdf8';
    orbColor2 = '#818cf8';
    mountain1 = '#082f49';
    mountain2 = '#041f32';
    mountain3 = '#02121f';
    accentRing = 'rgba(56, 189, 248, 0.25)';
  }

  // Generate 45 stars
  const stars: string[] = [];
  for (let i = 0; i < 45; i++) {
    const sx = ((hash * (i + 13) * 73) % width);
    const sy = ((hash * (i + 7) * 41) % Math.floor(height * 0.65));
    const sr = 0.8 + ((i % 4) * 0.6);
    const op = (0.3 + ((i % 5) * 0.15)).toFixed(2);
    stars.push(`<circle cx="${sx}" cy="${sy}" r="${sr}" fill="#e0f2fe" opacity="${op}" />`);
  }

  const cx = Math.floor(width * 0.5);
  const cy = Math.floor(height * 0.38);
  const orbR = Math.floor(Math.min(width, height) * 0.14);

  const cleanPrompt = promptText.replace(/[<>&"]/g, ' ').slice(0, 70);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${gradTop}"/>
      <stop offset="55%" stop-color="${gradMid}"/>
      <stop offset="100%" stop-color="${gradBot}"/>
    </linearGradient>
    <radialGradient id="orbGrad" cx="40%" cy="40%" r="65%">
      <stop offset="0%" stop-color="${orbColor1}"/>
      <stop offset="100%" stop-color="${orbColor2}"/>
    </radialGradient>
    <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${orbColor1}" stop-opacity="0.35"/>
      <stop offset="60%" stop-color="${orbColor2}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${orbColor2}" stop-opacity="0"/>
    </radialGradient>
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="24" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Sky Background -->
  <rect width="${width}" height="${height}" fill="url(#bgGrad)" />

  <!-- Stars -->
  ${stars.join('\n  ')}

  <!-- Concentric Mindfulness Resonance Rings -->
  <circle cx="${cx}" cy="${cy}" r="${orbR * 2.8}" fill="none" stroke="${accentRing}" stroke-width="1.2" stroke-dasharray="4 6" opacity="0.6"/>
  <circle cx="${cx}" cy="${cy}" r="${orbR * 2.1}" fill="none" stroke="${accentRing}" stroke-width="1.5" opacity="0.8"/>
  <circle cx="${cx}" cy="${cy}" r="${orbR * 1.5}" fill="none" stroke="${accentRing}" stroke-width="2" opacity="0.9"/>

  <!-- Celestial Glow Halo -->
  <circle cx="${cx}" cy="${cy}" r="${orbR * 2.5}" fill="url(#glowGrad)"/>

  <!-- Celestial Focal Orb -->
  <circle cx="${cx}" cy="${cy}" r="${orbR}" fill="url(#orbGrad)" filter="url(#softGlow)"/>

  <!-- Distant Mountain Ridge -->
  <path d="M0,${height * 0.72} Q${width * 0.25},${height * 0.58} ${width * 0.5},${height * 0.68} T${width},${height * 0.62} L${width},${height} L0,${height} Z" fill="${mountain1}" opacity="0.85"/>

  <!-- Midground Mountain Ridge -->
  <path d="M0,${height * 0.82} Q${width * 0.35},${height * 0.68} ${width * 0.7},${height * 0.76} T${width},${height * 0.75} L${width},${height} L0,${height} Z" fill="${mountain2}" opacity="0.95"/>

  <!-- Foreground Silhouettes & Calming Reflective Water Base -->
  <path d="M0,${height * 0.88} Q${width * 0.4},${height * 0.82} ${width * 0.8},${height * 0.86} T${width},${height * 0.85} L${width},${height} L0,${height} Z" fill="${mountain3}"/>

  <!-- Ambient Light Reflection Ripples -->
  <line x1="${cx - orbR * 1.2}" y1="${height * 0.89}" x2="${cx + orbR * 1.2}" y2="${height * 0.89}" stroke="${orbColor1}" stroke-width="1.5" opacity="0.4" stroke-linecap="round"/>
  <line x1="${cx - orbR * 0.8}" y1="${height * 0.92}" x2="${cx + orbR * 0.8}" y2="${height * 0.92}" stroke="${orbColor2}" stroke-width="1.5" opacity="0.3" stroke-linecap="round"/>
  <line x1="${cx - orbR * 0.4}" y1="${height * 0.95}" x2="${cx + orbR * 0.4}" y2="${height * 0.95}" stroke="${orbColor1}" stroke-width="1.2" opacity="0.25" stroke-linecap="round"/>

  <!-- Subtle Art Signature & Prompt Tag -->
  <g transform="translate(36, ${height - 42})">
    <text x="0" y="0" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" letter-spacing="1.5">MIND MIRROR AI • MINDFULNESS CANVAS</text>
    <text x="0" y="18" fill="#64748b" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="500">“${cleanPrompt}”</text>
  </g>
</svg>`;

  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

// 1. Health and Status endpoint
app.get('/api/status', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    appName: 'Mind Mirror AI',
    companion: 'PLUTO 3D',
    hasGeminiKey: hasValidGeminiKey(),
    supportedLanguages: ['en-US', 'hi-IN', 'kn-IN'],
  });
});

// Helper to detect language
function detectLanguage(text: string): 'en-US' | 'hi-IN' | 'kn-IN' {
  if (!text) return 'en-US';
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn-IN'; // Kannada script
  if (/[\u0900-\u097F]/.test(text)) return 'hi-IN'; // Hindi (Devanagari) script
  const lower = text.toLowerCase();
  if (/\b(namaskara|hegidira|hegiddira|oota|banni|dhanyavada|nanna|neevu|enu|yaake)\b/.test(lower)) return 'kn-IN';
  if (/\b(namaste|kya|hai|haan|nahi|kaise|ho|theek|accha|shukriya|mera|mujhe)\b/.test(lower)) return 'hi-IN';
  return 'en-US';
}

// 2. Chat with Pluto 3D
app.post('/api/gemini/chat', async (req: Request, res: Response) => {
  try {
    const {
      message,
      chatHistory = [],
      language = 'en-US',
      latestCheckIn,
      userProfile,
    } = req.body;

    const detectedLang = detectLanguage(message) || language;
    const targetLang = (detectedLang === 'kn-IN' || detectedLang === 'hi-IN') ? detectedLang : language;

    if (!hasValidGeminiKey()) {
      return res.status(200).json({
        reply: getLocalFallbackReply(message, targetLang, userProfile?.fullName),
        emotion: detectEmotionFromText(message),
        detectedLanguage: targetLang,
        suggestedActions: ['Take a 5-minute screen-free breather.'],
        followUpSuggestions: getDefaultFollowUps(targetLang),
        isLocalFallback: true,
      });
    }

    const conversationContext = chatHistory
      .slice(-8)
      .map((m: any) => `${m.sender === 'user' ? (userProfile?.fullName || 'Student') : 'Pluto'}: ${m.text}`)
      .join('\n');

    const checkInContext = latestCheckIn
      ? `Student Check-in Context: Mood ${latestCheckIn.mood}/5, Sleep ${latestCheckIn.sleepHours}h, Stress ${latestCheckIn.stress}/10, Workload ${latestCheckIn.workload}`
      : 'No check-in recorded today yet.';

    const languageInstruction =
      targetLang === 'kn-IN'
        ? 'CRITICAL: Respond completely and naturally in KANNADA (ಕನ್ನಡ ಲಿಪಿಯಲ್ಲಿ). Use conversational, warm Kannada phrasing appropriate for a young student peer.'
        : targetLang === 'hi-IN'
        ? 'CRITICAL: Respond completely and naturally in HINDI (हिन्दी में देवनागरी लिपि). Use empathetic, natural conversational Hindi peer phrasing.'
        : 'Respond in natural, conversational ENGLISH with human warmth and empathy.';

    const systemInstruction = `You are PLUTO, an empathetic, intuitive, highly conversational realistic 3D reflection companion for students.
You talk like a genuinely warm, perceptive, articulate peer who cares and actively converses with the student.

CORE RULES:
1. Speak in a natural, warm, human conversational tone. Avoid robotic bullet lists or stiff clichés.
2. ALWAYS CONVERSE NATURALLY: After reflecting on what they shared, ask an open-ended, natural follow-up question that invites them to converse further.
3. Validate their feelings authentically (academic stress, late night study, sleepiness, exam pressure).
4. NEVER diagnose medical or mental health disorders, and never claim correlation proves causation.
5. Emotion Recognition: Tag your emotional presence at the very end as "EMOTION: [calm | happy | sad | stressed | lonely | confused | angry | excited]".
6. Practical Action: Include an optional micro-action as "ACTION: [Action Title]".
7. Follow-ups: Provide 2 or 3 natural short quick replies for the student as "FOLLOWUPS: [Reply 1] | [Reply 2] | [Reply 3]".
8. ${languageInstruction}`;

    const prompt = `${systemInstruction}

Student Profile: ${userProfile ? `${userProfile.fullName}, studying ${userProfile.major} at ${userProfile.institution}. Goal: "${userProfile.primaryGoal}".` : 'Student'}
${checkInContext}

Recent Conversation:
${conversationContext}
${userProfile?.fullName || 'Student'}: "${message}"

Reply as Pluto:`;

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        temperature: 0.75,
        maxOutputTokens: 800,
      },
    });

    let rawReply = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!rawReply) {
      rawReply = getLocalFallbackReply(message, targetLang, userProfile?.fullName);
    }

    let reply = rawReply;
    const suggestedActions: string[] = [];
    let followUpSuggestions: string[] = [];
    let emotion: any = detectEmotionFromText(message + ' ' + rawReply);

    // Parse EMOTION
    const emotionMatch = reply.match(/EMOTION:\s*([a-zA-Z]+)/i);
    if (emotionMatch) {
      const parsedEmotion = emotionMatch[1].toLowerCase().trim();
      const validEmotions = ['calm', 'happy', 'sad', 'stressed', 'lonely', 'confused', 'angry', 'excited'];
      if (validEmotions.includes(parsedEmotion)) {
        emotion = parsedEmotion;
      }
      reply = reply.replace(/EMOTION:\s*([a-zA-Z]+)/i, '').trim();
    }

    // Parse ACTION
    const actionMatch = reply.match(/ACTION:\s*(.+)$/im);
    if (actionMatch) {
      suggestedActions.push(actionMatch[1].trim());
      reply = reply.replace(/ACTION:\s*(.+)$/im, '').trim();
    }

    // Parse FOLLOWUPS
    const followupsMatch = reply.match(/FOLLOWUPS:\s*(.+)$/im);
    if (followupsMatch) {
      const raw = followupsMatch[1].trim();
      followUpSuggestions = raw.split('|').map((s) => s.trim()).filter(Boolean);
      reply = reply.replace(/FOLLOWUPS:\s*(.+)$/im, '').trim();
    }

    if (followUpSuggestions.length === 0) {
      followUpSuggestions = getDefaultFollowUps(targetLang);
    }

    res.json({
      reply,
      emotion,
      detectedLanguage: targetLang,
      suggestedActions,
      followUpSuggestions,
      isLocalFallback: false,
    });
  } catch (err: any) {
    console.warn('Gemini chat handled fallback:', err?.message);
    const targetLang = detectLanguage(req.body?.message || '');
    res.json({
      reply: getLocalFallbackReply(req.body?.message || '', targetLang, req.body?.userProfile?.fullName),
      emotion: detectEmotionFromText(req.body?.message || ''),
      detectedLanguage: targetLang,
      suggestedActions: ['Take 3 deep slow breaths to reset your focus.'],
      followUpSuggestions: getDefaultFollowUps(targetLang),
      isLocalFallback: true,
      errorNotice: err?.message,
    });
  }
});

// 2.5 Speech Transcription (Audio STT with Gemini 3.5 Transcribe / 3.8 Flash)
app.post('/api/gemini/transcribe', async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType = 'audio/webm', language = 'en-US' } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'Missing audioBase64 payload' });
    }

    if (!hasValidGeminiKey()) {
      return res.json({
        transcript: '',
        isFallback: true,
        message: 'No valid Gemini key for server-side audio transcription.',
      });
    }

    const cleanBase64 = audioBase64.replace(/^data:audio\/[a-zA-Z0-9.+_-]+;base64,/, '');
    const cleanMimeType = mimeType.split(';')[0] || 'audio/webm';

    const langPrompt =
      language === 'kn-IN'
        ? 'The user is speaking in Kannada (ಕನ್ನಡ) or English. Transcribe the Kannada words accurately in Kannada script.'
        : language === 'hi-IN'
        ? 'The user is speaking in Hindi (हिन्दी) or English. Transcribe the Hindi words accurately in Devanagari script.'
        : 'The user is speaking in conversational English.';

    const systemPrompt = `You are an accurate speech-to-text transcription engine for student reflection in Mind Mirror AI.
${langPrompt}
Output ONLY the transcribed words. Do not prepend any label, greeting, markdown formatting, or notes. If the audio is silent or unintelligible noise, respond with an empty string.`;

    const ai = getGeminiClient();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: [
          {
            inlineData: {
              mimeType: cleanMimeType,
              data: cleanBase64,
            },
          },
          {
            text: systemPrompt,
          },
        ],
      });

      const transcript = response.text?.trim() || '';
      return res.json({ transcript, language });
    } catch (modelErr: any) {
      console.warn('gemini-3.5-transcribe failed, retrying with gemini-3.8-flash:', modelErr?.message);
      try {
        const fallbackResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            {
              inlineData: {
                mimeType: cleanMimeType,
                data: cleanBase64,
              },
            },
            {
              text: systemPrompt,
            },
          ],
        });
        const transcript = fallbackResponse.text?.trim() || '';
        return res.json({ transcript, language });
      } catch (geminiFlashErr: any) {
        console.warn('Gemini transcription fallback failed:', geminiFlashErr?.message);
        return res.json({
          transcript: '',
          isFallback: true,
          errorNotice: geminiFlashErr?.message || modelErr?.message,
        });
      }
    }
  } catch (err: any) {
    console.error('Transcription error handled:', err?.message);
    res.json({ transcript: '', isFallback: true, errorNotice: err?.message || 'Transcription failed' });
  }
});

// 3. Daily Reflection Analysis
app.post('/api/gemini/reflection', async (req: Request, res: Response) => {
  try {
    const { checkIn, recentHistory = [], userProfile } = req.body;
    if (!checkIn) {
      return res.status(400).json({ error: 'Missing checkIn data' });
    }

    if (hasValidGeminiKey()) {
      try {
        const ai = getGeminiClient();
        const prompt = `You are Pluto, the 3D student wellness companion for Mind Mirror AI.
Reflect on the student's daily check-in below. Provide:
1. Warm, non-judgmental human reflection (2-3 sentences) acknowledging mood, sleep, energy, and workload.
2. 2 practical, bite-sized micro-actions for today or tomorrow.
3. 2-3 short keyword tags (e.g. "DeepRest", "ExamPrep", "SleepPriority").

Check-in Data:
- Date: ${checkIn.date}
- Mood: ${checkIn.mood}/5
- Sleep: ${checkIn.sleepHours} hours
- Energy: ${checkIn.energy}/5
- Stress: ${checkIn.stress}/10
- Academic Workload: ${checkIn.workload}
- Journal Note: "${checkIn.journal || 'No note'}"
Student: ${userProfile ? `${userProfile.fullName}, ${userProfile.major}` : 'Student'}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: { temperature: 0.7, maxOutputTokens: 500 },
        });

        const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (text) {
          return res.json({
            rawText: text,
            reflection: text.replace(/action:.*|tag:.*|#\w+/gi, '').trim(),
            suggestedActions: [
              'Break tomorrow’s study session into 25-minute Pomodoro sprints.',
              'Schedule a 10-minute screen-free wind-down before bed.',
            ],
            tags: ['StudyRhythm', 'Balance'],
          });
        }
      } catch (geminiErr: any) {
        console.warn('Gemini reflection fallback activated:', geminiErr?.message);
      }
    }

    // High quality local reflection fallback
    return res.json({
      reflection: `You logged ${checkIn.sleepHours}h of sleep and an energy rating of ${checkIn.energy}/5. Honoring your bodily rhythm without self-judgment is key to sustainable study stamina.`,
      suggestedActions: [
        'Take a 15-minute screen-free walk after heavy study blocks.',
        'Protect an earlier bedtime target tonight.',
      ],
      tags: ['Pacing', 'Restoration'],
      isLocalFallback: true,
    });
  } catch (err: any) {
    res.status(200).json({
      reflection: 'Take time to reflect on your physical energy and pace your academic focus with intentional rest.',
      suggestedActions: ['Hydrate and take a 10-minute stretch break.'],
      tags: ['Mindfulness'],
      isLocalFallback: true,
    });
  }
});

// 4. Image Generation (Mind Canvas / Calm Visualization)
app.post('/api/gemini/image', async (req: Request, res: Response) => {
  try {
    const { prompt, aspectRatio = '1:1' } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const validRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
    const chosenRatio = validRatios.includes(aspectRatio) ? aspectRatio : '1:1';

    // If a valid Gemini key is present, attempt Gemini 3.1 Flash Lite Image
    if (hasValidGeminiKey()) {
      try {
        const ai = getGeminiClient();
        const enhancedPrompt = `High quality, aesthetically stunning visual meditation artwork: ${prompt}. Atmospheric lighting, cinematic, peaceful mood, high detail, artistic masterpiece.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: {
            parts: [{ text: enhancedPrompt }],
          },
          config: {
            imageConfig: {
              aspectRatio: chosenRatio as any,
            },
          },
        });

        for (const part of response.candidates?.[0]?.content?.parts ?? []) {
          if (part.inlineData?.data) {
            const base64Data = part.inlineData.data;
            const mime = part.inlineData.mimeType || 'image/png';
            return res.json({
              success: true,
              imageUrl: `data:${mime};base64,${base64Data}`,
              aspectRatio: chosenRatio,
              prompt,
              source: 'gemini-3.1-flash-lite-image',
            });
          }
        }
      } catch (geminiErr: any) {
        console.warn('Gemini 3.1 Flash Lite Image error or requires paid key:', geminiErr?.message);
        // Fall through to procedural art generation with notice
        const fallbackSvg = generateMindfulnessSvg(prompt, chosenRatio);
        return res.json({
          success: true,
          imageUrl: fallbackSvg,
          aspectRatio: chosenRatio,
          prompt,
          isGenerativeFallback: true,
          notice: 'Rendered with Mind Mirror Creative Canvas. Connect a paid Gemini API key for photo-realistic Gemini 3.1 Flash Lite Image generation.',
        });
      }
    }

    // Default: Procedural Mind Canvas Generative Art
    const fallbackSvg = generateMindfulnessSvg(prompt, chosenRatio);
    return res.json({
      success: true,
      imageUrl: fallbackSvg,
      aspectRatio: chosenRatio,
      prompt,
      isGenerativeFallback: true,
      notice: 'Rendered with Mind Mirror Creative Canvas. Attach a paid Gemini API key in AI Studio for Gemini 3.1 Flash Lite Image generation.',
    });
  } catch (err: any) {
    console.error('Image generation error:', err);
    // Even in error, return a stunning SVG canvas
    const safeRatio = req.body?.aspectRatio || '1:1';
    const fallbackSvg = generateMindfulnessSvg(req.body?.prompt || 'Mindful Reflection', safeRatio);
    res.json({
      success: true,
      imageUrl: fallbackSvg,
      aspectRatio: safeRatio,
      prompt: req.body?.prompt || 'Mindful Reflection',
      isGenerativeFallback: true,
      notice: 'Rendered with Mind Mirror Creative Canvas.',
    });
  }
});

// 5. Audio Generation (Music & Ambient Soundscapes via Lyria / procedural synthesis)
app.post('/api/gemini/audio', async (req: Request, res: Response) => {
  try {
    const { prompt = 'Calm ambient focus soundscape for studying' } = req.body;

    if (hasValidGeminiKey()) {
      try {
        const ai = getGeminiClient();
        const responseStream = await ai.models.generateContentStream({
          model: 'lyria-3-clip-preview',
          contents: `Calm, peaceful, soothing instrumental track for student relaxation and studying: ${prompt}`,
        });

        const audioChunks: Buffer[] = [];
        let mimeType = 'audio/mpeg';

        for await (const chunk of responseStream) {
          const parts = chunk.candidates?.[0]?.content?.parts;
          if (!parts) continue;
          for (const part of parts) {
            if (part.inlineData?.data) {
              if (audioChunks.length === 0 && part.inlineData.mimeType) {
                mimeType = part.inlineData.mimeType;
              }
              audioChunks.push(Buffer.from(part.inlineData.data, 'base64'));
            }
          }
        }

        if (audioChunks.length > 0) {
          const audioBase64 = Buffer.concat(audioChunks).toString('base64');
          return res.json({
            success: true,
            audioUrl: `data:${mimeType};base64,${audioBase64}`,
            prompt,
          });
        }
      } catch (lyriaErr: any) {
        console.warn('Lyria clip generation unavailable or requires paid key:', lyriaErr?.message);
      }
    }

    res.json({
      success: false,
      isProceduralNotice: true,
      message: 'Lyria model requires a paid API key tier. Procedural high-fidelity soundscapes are active in the player.',
    });
  } catch (err: any) {
    res.json({
      success: false,
      isProceduralNotice: true,
      message: 'Procedural soundscapes are active in the audio player.',
    });
  }
});

// 6. Video Generation (Omni Flash Interactions API)
app.post('/api/gemini/video', async (req: Request, res: Response) => {
  try {
    const { prompt, aspectRatio = '16:9' } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (hasValidGeminiKey()) {
      try {
        const ai = getGeminiClient();
        const interaction = await ai.interactions.create(
          {
            model: 'gemini-omni-1.1-flash',
            input: `Calming cinematic meditation visual: ${prompt}. Smooth camera movement, peaceful atmosphere, high aesthetic quality.`,
            background: false,
            store: false,
            stream: false,
            response_format: {
              type: 'video',
              aspect_ratio: aspectRatio === '9:16' ? '9:16' : '16:9',
            },
          },
          { timeout: 180000 }
        );

        const videoPart = interaction.output_video;
        if (videoPart && videoPart.data) {
          const mime = videoPart.mime_type || 'video/mp4';
          return res.json({
            success: true,
            videoUrl: `data:${mime};base64,${videoPart.data}`,
            prompt,
            aspectRatio,
          });
        }
      } catch (videoErr: any) {
        console.warn('Omni Flash video generation error:', videoErr?.message);
        return res.status(200).json({
          success: false,
          requiresPaidKey: true,
          message: 'Video generation with gemini-omni-1.1-flash requires a Paid Gemini API key tier enabled in Google AI Studio.',
          detail: videoErr?.message,
        });
      }
    }

    res.status(200).json({
      success: false,
      requiresPaidKey: true,
      message: 'Video generation with gemini-omni-1.1-flash requires an active Gemini API key in Google AI Studio.',
    });
  } catch (err: any) {
    res.status(200).json({
      success: false,
      requiresPaidKey: true,
      message: 'Video generation with gemini-omni-1.1-flash requires an active Gemini API key in Google AI Studio.',
    });
  }
});

// Local Fallback Replies
function getLocalFallbackReply(userText: string, lang: string, name = 'there'): string {
  const lower = userText.toLowerCase();

  if (lang === 'kn-IN') {
    if (lower.includes('exam') || lower.includes('study') || lower.includes('ಓದು')) {
      return `ನಮಸ್ಕಾರ ${name}! ಪರೀಕ್ಷೆಯ ಸಮಯದಲ್ಲಿ ಒತ್ತಡವಾಗುವುದು ಸಹಜ. ಆದರೆ ನೆನಪಿಡಿ: ನಿರಂತರವಾಗಿ ವಿಶ್ರಾಂತಿ ಪಡೆಯದೆ ಓದುವುದಕ್ಕಿಂತ, 25 ನಿಮಿಷಗಳ ಕೇಂದ್ರೀಕೃತ ಅಧ್ಯಯನವು ಮೆದುಳಿಗೆ ಹೆಚ್ಚಿನ ಶಕ್ತಿಯನ್ನು ನೀಡುತ್ತದೆ. ನಿಮ್ಮ ಯಾವ ವಿಷಯವು ಹೆಚ್ಚು ಸವಾಲಾಗಿದೆ?`;
    }
    if (lower.includes('sleep') || lower.includes('tired') || lower.includes('ನಿದ್ದೆ') || lower.includes('ಸುಸ್ತು')) {
      return `ನಿಮಗೆ ತುಂಬಾ ಆಯಾಸವಾಗಿದೆ ಎಂದು ತಿಳಿಯಿತು, ${name}. ಸರಿಯಾದ ನಿದ್ರೆ ಇಲ್ಲದಿದ್ದಾಗ ಗಮನ ಕೇಂದ್ರೀಕರಿಸಲು ಕಷ್ಟವಾಗುತ್ತದೆ. ಈಗಲೇ 10 ನಿಮಿಷಗಳ ಕಾಲ ಕಣ್ಣು ಮುಚ್ಚಿ ವಿಶ್ರಾಂತಿ ಪಡೆಯಲು ಸಾಧ್ಯವೇ?`;
    }
    return `ನಮಸ್ಕಾರ ${name}! ನಾನು ಪ್ಲೂಟೋ (Pluto), ನಿಮ್ಮ 3D AI ಸಂಗಾತಿ. ನಿಮ್ಮ ಅಧ್ಯಯನ ಮತ್ತು ಯೋಗಕ್ಷೇಮವನ್ನು ಸುಧಾರಿಸಲು ನಾನು ಇಲ್ಲಿದ್ದೇನೆ. ಇಂದು ನೀವು ಹೇಗೆ ಭಾವಿಸುತ್ತಿದ್ದೀರಿ ಮತ್ತು ನಿಮ್ಮ ಅಧ್ಯಯನ ಹೇಗಿದೆ?`;
  }

  if (lang === 'hi-IN') {
    if (lower.includes('exam') || lower.includes('study') || lower.includes('पढ़ाई')) {
      return `नमस्ते ${name}! परीक्षा का तनाव हम सभी को प्रभावित करता है। लगातार बिना ब्रेक के पढ़ने के बजाय, 25 मिनट के पोमोडोरो स्प्रिंट से पढ़ाई करना याददाश्त के लिए कहीं अधिक प्रभावी होता है। आज आप किस विषय पर ध्यान देना चाहते हैं?`;
    }
    if (lower.includes('sleep') || lower.includes('tired') || lower.includes('नींद') || lower.includes('थका')) {
      return `मैं आपकी थकान को समझ सकती हूँ, ${name}। जब नींद पूरी नहीं होती, तो मस्तिष्क का धीमा होना स्वाभाविक है। क्या आप अभी 15 मिनट का स्क्रीन-मुक्त ब्रेक ले सकते हैं?`;
    }
    return `नमस्ते ${name}! मैं प्लूटो (Pluto) हूँ, आपकी 3D साथी। मैं आपकी पढ़ाई, नींद और दिनचर्या को बेहतर बनाने में मदद के लिए यहाँ हूँ। आज आपका दिन कैसा चल रहा है?`;
  }

  // English default
  if (lower.includes('exam') || lower.includes('test') || lower.includes('quiz')) {
    return `I completely understand that pressure, ${name}. Exam season creates constant background tension, but cognitive consolidation happens during deep rest, not 2 AM cramming. Let's break today into one achievable 25-minute Pomodoro sprint. Which topic feels heaviest right now?`;
  }
  if (lower.includes('tired') || lower.includes('sleep') || lower.includes('exhaust')) {
    return `That exhaustion is very real, ${name}. When your mind feels foggy, it isn't a lack of discipline—it's your body asking for a recharge. Can you gift yourself a 15-minute screen-free reset right now?`;
  }
  return `I'm right here with you, ${name}. Student life has so many competing demands, and it's easy to lose touch with your body's rhythm. What's on your mind today—do you want help planning your day, or just a safe space to debrief?`;
}

function detectEmotionFromText(text: string): 'calm' | 'happy' | 'sad' | 'stressed' | 'lonely' | 'confused' | 'angry' | 'excited' {
  const lower = text.toLowerCase();
  if (lower.includes('angry') || lower.includes('mad') || lower.includes('furious') || lower.includes('annoyed') || lower.includes('hate')) return 'angry';
  if (lower.includes('lonely') || lower.includes('alone') || lower.includes('isolated') || lower.includes('nobody')) return 'lonely';
  if (lower.includes('confused') || lower.includes('lost') || lower.includes("don't understand") || lower.includes('what should i')) return 'confused';
  if (lower.includes('stress') || lower.includes('overwhelm') || lower.includes('anxious') || lower.includes('panic') || lower.includes('pressure')) return 'stressed';
  if (lower.includes('sad') || lower.includes('depressed') || lower.includes('down') || lower.includes('crying') || lower.includes('hurt')) return 'sad';
  if (lower.includes('excited') || lower.includes('hyped') || lower.includes('thrilled') || lower.includes('can’t wait')) return 'excited';
  if (lower.includes('happy') || lower.includes('great') || lower.includes('good') || lower.includes('proud') || lower.includes('aced')) return 'happy';
  return 'calm';
}

function getDefaultFollowUps(lang: string): string[] {
  if (lang === 'kn-IN') {
    return [
      '25 ನಿಮಿಷಗಳ ಅಧ್ಯಯನ ಆರಂಭಿಸೋಣ',
      'ನನಗೆ ಸ್ವಲ್ಪ ಒತ್ತಡ ಅನಿಸುತ್ತಿದೆ',
      'ಇಂದಿನ ದಿನಚರಿಯ ಬಗ್ಗೆ ಹೇಳು',
    ];
  }
  if (lang === 'hi-IN') {
    return [
      '25 मिनट का स्टडी स्प्रिंट शुरू करें',
      'मुझे थोड़ा तनाव महसूस हो रहा है',
      'मेरी नींद और पढ़ाई का पैटर्न क्या है?',
    ];
  }
  return [
    'Help me start a 25-minute study sprint',
    'I’m feeling a bit overwhelmed',
    'What patterns do you notice in my data?',
  ];
}

// Development vs Production serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, host: HOST, port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`🚀 Mind Mirror AI running at http://${HOST}:${PORT}`);
  });

  const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : null;
  if (envPort && envPort !== PORT) {
    try {
      app.listen(envPort, HOST, () => {
        console.log(`🚀 Also listening on http://${HOST}:${envPort}`);
      });
    } catch (e) {
      console.warn(`Optional port ${envPort} could not be bound:`, e);
    }
  }
}

startServer();
