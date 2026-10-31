import { describe, it, expect } from 'vitest';
import { generateCheckInReflection, generateCompanionReply } from '../services/ai';
import type { DailyCheckIn } from '../types';

describe('AI Service - Local Mind Reflection Engine', () => {
  it('identifies sleep debt patterns and generates supportive advice without medical diagnosis', async () => {
    const checkIn: DailyCheckIn = {
      date: '2026-10-30',
      time: '23:00',
      timestamp: Date.now(),
      mood: 2,
      sleepHours: 5.0,
      energy: 2,
      stress: 8,
      workload: 'high',
      journal: 'Exhausted after cramming for organic chemistry midterm.',
      tasks: [],
    };

    const response = await generateCheckInReflection(checkIn, []);
    expect(response.reflection).toBeTruthy();
    expect(response.reflection.toLowerCase()).toContain('sleep');
    expect(response.suggestedActions.length).toBeGreaterThan(0);
    expect(response.tags).toContain('SleepDebt');
    // Ensure no clinical medical diagnosis
    expect(response.reflection.toLowerCase()).not.toContain('depressive disorder');
    expect(response.reflection.toLowerCase()).not.toContain('insomnia diagnosis');
  });

  it('generates encouraging reflection for balanced high-rest days', async () => {
    const checkIn: DailyCheckIn = {
      date: '2026-10-30',
      time: '21:00',
      timestamp: Date.now(),
      mood: 5,
      sleepHours: 8.5,
      energy: 5,
      stress: 2,
      workload: 'low',
      journal: 'Wonderful day relaxing and organizing notes.',
      tasks: [],
    };

    const response = await generateCheckInReflection(checkIn, []);
    expect(response.reflection).toBeTruthy();
    expect(response.tags).toContain('Restored');
  });
});

describe('AI Service - Local Companion Dialogue', () => {
  it('replies empathetically to exam stress and extracts actionable next steps', async () => {
    const userText = 'I have 3 exams this week and feel so overwhelmed';
    const reply = await generateCompanionReply(userText, []);

    expect(reply.reply).toBeTruthy();
    expect(reply.suggestedActions?.length).toBeGreaterThan(0);
  });

  it('supports English, Hindi, and Kannada greetings and conversation', async () => {
    const kannadaReply = await generateCompanionReply('ನಮಸ್ಕಾರ ಪ್ಲೂಟೋ', [], undefined, {
      userName: 'Student',
      language: 'kn-IN',
      theme: 'dark',
      geminiApiKey: '',
      ttsVoice: '',
      ttsSpeed: 1.0,
      avatarModel: 'realistic_pluto',
      soundEnabled: true,
      seededDemoData: false,
      disclaimerAcknowledged: true,
    });

    expect(kannadaReply.reply).toContain('ನಮಸ್ಕಾರ');

    const hindiReply = await generateCompanionReply('नमस्ते प्लूटो', [], undefined, {
      userName: 'Student',
      language: 'hi-IN',
      theme: 'dark',
      geminiApiKey: '',
      ttsVoice: '',
      ttsSpeed: 1.0,
      avatarModel: 'realistic_pluto',
      soundEnabled: true,
      seededDemoData: false,
      disclaimerAcknowledged: true,
    });

    expect(hindiReply.reply).toContain('नमस्ते');
  });
});
