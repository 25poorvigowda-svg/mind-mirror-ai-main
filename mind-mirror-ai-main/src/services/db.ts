import Dexie, { type Table } from 'dexie';
import type { DailyCheckIn, ActionTask, ExperimentDay, UserSettings, ChatMessage, UserProfile } from '../types';

export const DEFAULT_EXPERIMENT_DAYS: ExperimentDay[] = [
  {
    day: 1,
    title: 'Establishing Your Baseline',
    theme: 'Awareness',
    objective: 'Observe your natural rhythm without self-judgment or pressure to fix anything.',
    prompt: 'Log your day honestly: note when you felt most engaged versus when your focus waned.',
    actionGuidance: 'Pause at 3 transition points today (morning, afternoon, evening) for a 30-second breath check.',
    reflectionQuestion: 'What surprised you most about your energy shifts today?',
    completed: false,
  },
  {
    day: 2,
    title: 'Sleep & Circadian Mapping',
    theme: 'Rest & Recovery',
    objective: 'Discover how sleep duration and wake consistency correlate with morning alertness.',
    prompt: 'Record last night’s sleep and how refreshed you felt upon waking up.',
    actionGuidance: 'Avoid screens for 30 minutes before bed; place your phone out of arm’s reach.',
    reflectionQuestion: 'How did your sleep environment affect how easily you fell asleep?',
    completed: false,
  },
  {
    day: 3,
    title: 'Energy Peaks & Slump Zones',
    theme: 'Productivity Rhythm',
    objective: 'Identify your 2-hour "golden focus window" versus your afternoon energy dip.',
    prompt: 'Track when your cognitive energy was sharpest versus when you craved a distraction.',
    actionGuidance: 'Schedule your most challenging study topic during your personal peak energy window.',
    reflectionQuestion: 'Did forcing work through a slump yield quality results, or would a 15-minute walk have helped more?',
    completed: false,
  },
  {
    day: 4,
    title: 'Academic Stress Trigger Audit',
    theme: 'Emotional Regulation',
    objective: 'Differentiate between healthy deadline arousal and overwhelming paralysis.',
    prompt: 'Rate your stress today and list the specific source: deadlines, unclear tasks, or multitasking?',
    actionGuidance: 'Break down your largest pending assignment into 3 micro-steps of under 20 minutes each.',
    reflectionQuestion: 'What self-talk emerges when an academic task feels overwhelming?',
    completed: false,
  },
  {
    day: 5,
    title: 'Workload vs. Capacity Calibration',
    theme: 'Boundary Setting',
    objective: 'Evaluate whether your daily to-do list matches your realistic cognitive capacity.',
    prompt: 'Assess whether your planned workload today was low, medium, or high relative to your actual stamina.',
    actionGuidance: 'Select one non-urgent commitment to either delegate, postpone, or decline guilt-free.',
    reflectionQuestion: 'Where did you overcommit out of FOMO or academic perfectionism?',
    completed: false,
  },
  {
    day: 6,
    title: 'Active Restoration Protocol',
    theme: 'Nervous System Reset',
    objective: 'Test whether non-screen rest restores your energy faster than social media scrolling.',
    prompt: 'Log how you spent your study breaks today and rate your subsequent focus.',
    actionGuidance: 'Take one 20-minute rest block completely offline: walk outdoors, stretch, or listen to music.',
    reflectionQuestion: 'How did offline rest make your mind feel compared to digital consumption?',
    completed: false,
  },
  {
    day: 7,
    title: 'Personal Synthesis & Habit Blueprint',
    theme: 'Integration',
    objective: 'Review your 7 days of data to formulate your personalized sustainable student rhythm.',
    prompt: 'Synthesize your observed patterns: your optimal sleep range, peak hours, and primary stress buffers.',
    actionGuidance: 'Draft your "Sustainable Student Rulebook" with 3 realistic non-negotiable habits for next term.',
    reflectionQuestion: 'What is the single most valuable insight you learned about your mind and body this week?',
    completed: false,
  },
];

export class MindMirrorDatabase extends Dexie {
  checkIns!: Table<DailyCheckIn, number>;
  actionTasks!: Table<ActionTask, number>;
  experimentProgress!: Table<ExperimentDay, number>;
  settings!: Table<UserSettings, number>;
  chatHistory!: Table<ChatMessage, string>;
  userProfile!: Table<UserProfile, number>;

  constructor() {
    super('MindMirrorDB');
    this.version(2).stores({
      checkIns: '++id, date, timestamp, mood, sleepHours, energy, stress, workload',
      actionTasks: '++id, completed, category, priority, dueDate, createdAt',
      experimentProgress: 'day, completed',
      settings: '++id',
      chatHistory: 'id, timestamp, sender',
      userProfile: '++id, email, isLoggedIn',
    });
  }
}

export const db = new MindMirrorDatabase();

export const DEFAULT_USER_PROFILE: UserProfile = {
  email: 'alex.rivera@berkeley.edu',
  fullName: 'Alex Rivera',
  institution: 'University of California, Berkeley',
  major: 'Cognitive Science & Computer Science',
  academicYear: 'Junior',
  targetSleepHours: 7.8,
  primaryGoal: 'Balance algorithmic problem sets with sustainable restorative sleep',
  joinedDate: '2026-09-01',
  avatarColor: '#06b6d4',
  isLoggedIn: true,
};

export async function getUserProfile(): Promise<UserProfile> {
  const current = await db.userProfile.toCollection().first();
  if (!current) {
    const id = await db.userProfile.add(DEFAULT_USER_PROFILE);
    return { ...DEFAULT_USER_PROFILE, id };
  }
  return current;
}

export async function updateUserProfile(partial: Partial<UserProfile>): Promise<UserProfile> {
  const current = await getUserProfile();
  if (current.id) {
    await db.userProfile.update(current.id, partial);
    return { ...current, ...partial };
  }
  return current;
}

// Default initial settings
export const DEFAULT_SETTINGS: UserSettings = {
  userName: 'Student Explorer',
  language: 'en-US',
  theme: 'dark',
  geminiApiKey: '',
  ttsVoice: '',
  ttsSpeed: 1.0,
  avatarModel: 'realistic_pluto',
  soundEnabled: true,
  seededDemoData: false,
  disclaimerAcknowledged: true,
};

export async function getSettings(): Promise<UserSettings> {
  const current = await db.settings.toCollection().first();
  if (!current) {
    const id = await db.settings.add(DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS, id };
  }
  return current;
}

export async function updateSettings(partial: Partial<UserSettings>): Promise<void> {
  const current = await getSettings();
  if (current.id) {
    await db.settings.update(current.id, partial);
  }
}

export async function initExperimentDays(): Promise<ExperimentDay[]> {
  const count = await db.experimentProgress.count();
  if (count === 0) {
    await db.experimentProgress.bulkAdd(DEFAULT_EXPERIMENT_DAYS);
    return DEFAULT_EXPERIMENT_DAYS;
  }
  return await db.experimentProgress.orderBy('day').toArray();
}

/**
 * Generates 14 realistic student days showing meaningful variations:
 * - Days with midterm crunch (short sleep, higher stress, lower energy)
 * - Days with post-exam relief (longer sleep, elevated mood, balanced workload)
 * - Rich journals, academic tasks, and AI reflections.
 */
export async function seedRealisticDemoData(): Promise<void> {
  await db.checkIns.clear();
  await db.actionTasks.clear();
  await db.experimentProgress.clear();
  await db.experimentProgress.bulkAdd(DEFAULT_EXPERIMENT_DAYS);

  const now = new Date();
  const sampleCheckIns: DailyCheckIn[] = [
    {
      date: getOffsetDateString(now, -13),
      time: '21:30',
      timestamp: getOffsetTimestamp(now, -13, 21, 30),
      mood: 4,
      sleepHours: 7.8,
      energy: 4,
      stress: 4,
      workload: 'medium',
      journal: 'Started the semester strong. Group project meeting went smoothly and had enough time to cook dinner.',
      tasks: [
        { id: 't1', title: 'Calculus Problem Set 1', completed: true, priority: 'medium' },
        { id: 't2', title: 'Biology reading chapter 3', completed: true, priority: 'low' },
      ],
      aiReflection: 'A balanced start! 7.8 hours of sleep supported steady cognitive stamina throughout your collaborative tasks.',
      aiSuggestedActions: ['Maintain your 23:00 wind-down routine tonight.'],
      tags: ['Collaborative', 'Restful'],
    },
    {
      date: getOffsetDateString(now, -12),
      time: '22:15',
      timestamp: getOffsetTimestamp(now, -12, 22, 15),
      mood: 4,
      sleepHours: 7.2,
      energy: 4,
      stress: 5,
      workload: 'medium',
      journal: 'Solid library session. Finished notes for CS lab before dinner.',
      tasks: [
        { id: 't3', title: 'Python debugging exercises', completed: true, priority: 'medium' },
      ],
      aiReflection: 'Consistent sleep and structured focus kept stress moderate even as technical workload emerged.',
      tags: ['StudySession', 'Focused'],
    },
    {
      date: getOffsetDateString(now, -11),
      time: '23:00',
      timestamp: getOffsetTimestamp(now, -11, 23, 0),
      mood: 3,
      sleepHours: 6.5,
      energy: 3,
      stress: 6,
      workload: 'high',
      journal: 'Professor announced a surprise quiz for Friday. Stayed up reviewing slides.',
      tasks: [
        { id: 't4', title: 'Data Structures review', completed: true, priority: 'high' },
        { id: 't5', title: 'Chemistry lab prep', completed: false, priority: 'medium' },
      ],
      aiReflection: 'Slight dip in sleep (6.5h) aligned with increased stress from unexpected deadlines. Be mindful of caffeine timing.',
      tags: ['HighWorkload', 'SurpriseDeadline'],
    },
    {
      date: getOffsetDateString(now, -10),
      time: '23:45',
      timestamp: getOffsetTimestamp(now, -10, 23, 45),
      mood: 2,
      sleepHours: 5.4,
      energy: 2,
      stress: 8,
      workload: 'high',
      journal: 'Midterm prep night. Felt foggy by 3 PM and drank an energy drink which made sleeping harder.',
      tasks: [
        { id: 't6', title: 'Algorithms practice test', completed: true, priority: 'high' },
        { id: 't7', title: 'Stats homework', completed: false, priority: 'high' },
      ],
      aiReflection: 'Under 6 hours of sleep noticeably reduced your energy reserve while stress reached 8/10. Remember that sleep consolidation is crucial for memory recall.',
      aiSuggestedActions: ['Prioritize 8 hours of sleep tonight over late-night passive re-reading.'],
      tags: ['MidtermCrunch', 'SleepDebt'],
    },
    {
      date: getOffsetDateString(now, -9),
      time: '20:00',
      timestamp: getOffsetTimestamp(now, -9, 20, 0),
      mood: 2,
      sleepHours: 5.0,
      energy: 2,
      stress: 9,
      workload: 'high',
      journal: 'Midterm exam day. Woke up anxious with an elevated heart rate. Finished the exam, but exhausted.',
      tasks: [
        { id: 't8', title: 'Midterm Exam 1', completed: true, priority: 'high' },
      ],
      aiReflection: 'The acute stress peak is behind you. Your nervous system needs restorative recovery now—allow yourself permission to rest.',
      tags: ['ExamDay', 'Overwhelmed'],
    },
    {
      date: getOffsetDateString(now, -8),
      time: '21:00',
      timestamp: getOffsetTimestamp(now, -8, 21, 0),
      mood: 4,
      sleepHours: 9.0,
      energy: 4,
      stress: 3,
      workload: 'low',
      journal: 'Weekend recovery! Slept 9 hours straight. Went for a brisk walk with roommates and felt human again.',
      tasks: [
        { id: 't9', title: 'Laundry & room reset', completed: true, priority: 'low' },
      ],
      aiReflection: 'Recovery in action: 9 hours of sleep dramatically replenished your energy from 2 to 4 and cut reported stress by two-thirds.',
      tags: ['WeekendReset', 'DeepRest'],
    },
    {
      date: getOffsetDateString(now, -7),
      time: '22:00',
      timestamp: getOffsetTimestamp(now, -7, 22, 0),
      mood: 4,
      sleepHours: 8.2,
      energy: 4,
      stress: 4,
      workload: 'low',
      journal: 'Meal prepped for the upcoming week and planned study blocks using the Pomodoro timer.',
      tasks: [
        { id: 't10', title: 'Weekly schedule planning', completed: true, priority: 'medium' },
      ],
      aiReflection: 'Proactive planning before a week starts is one of the highest leverage buffers against mid-week overwhelm.',
      tags: ['Preparation', 'Calm'],
    },
    {
      date: getOffsetDateString(now, -6),
      time: '21:40',
      timestamp: getOffsetTimestamp(now, -6, 21, 40),
      mood: 5,
      sleepHours: 8.0,
      energy: 5,
      stress: 3,
      workload: 'medium',
      journal: 'Felt vibrant today! Got an A on the midterm and had high focus during the two-hour afternoon workshop.',
      tasks: [
        { id: 't11', title: 'Literature essay outline', completed: true, priority: 'medium' },
      ],
      aiReflection: 'Radiant mood and peak energy! Notice how 8h sleep plus structured schedule creates an upward spiral in performance.',
      tags: ['HighPerformance', 'FlowState'],
    },
    {
      date: getOffsetDateString(now, -5),
      time: '22:10',
      timestamp: getOffsetTimestamp(now, -5, 22, 10),
      mood: 4,
      sleepHours: 7.5,
      energy: 4,
      stress: 4,
      workload: 'medium',
      journal: 'Drafted the essay introduction. Kept study sessions capped at 45 minutes with 10-minute stretch breaks.',
      tasks: [
        { id: 't12', title: 'Essay draft section 1', completed: true, priority: 'medium' },
      ],
      aiReflection: 'Sustainable pacing: interval breaks prevented the usual 4 PM crash.',
      tags: ['Intervals', 'Steady'],
    },
    {
      date: getOffsetDateString(now, -4),
      time: '23:15',
      timestamp: getOffsetTimestamp(now, -4, 23, 15),
      mood: 3,
      sleepHours: 6.8,
      energy: 3,
      stress: 6,
      workload: 'high',
      journal: 'A lot of reading for sociology seminar. Brain felt full by evening, but stayed reasonably calm.',
      tasks: [
        { id: 't13', title: 'Sociology 3 articles', completed: true, priority: 'medium' },
      ],
      aiReflection: 'High workload managed with moderate resilience. 6.8 hours provided acceptable baseline, though slightly below your 7.5h sweet spot.',
      tags: ['HeavyReading', 'Resilient'],
    },
    {
      date: getOffsetDateString(now, -3),
      time: '22:30',
      timestamp: getOffsetTimestamp(now, -3, 22, 30),
      mood: 3,
      sleepHours: 6.4,
      energy: 3,
      stress: 7,
      workload: 'high',
      journal: 'Two back-to-back quizzes coming up. Needed extra tea to stay focused in afternoon lecture.',
      tasks: [
        { id: 't14', title: 'Chemistry practice problems', completed: true, priority: 'high' },
        { id: 't15', title: 'Math quiz review', completed: false, priority: 'high' },
      ],
      aiReflection: 'Watch for the 3-day sleep compression pattern. When sleep hovers below 7h for consecutive days, perceived stress tends to compound.',
      tags: ['CompoundingFatigue'],
    },
    {
      date: getOffsetDateString(now, -2),
      time: '21:50',
      timestamp: getOffsetTimestamp(now, -2, 21, 50),
      mood: 4,
      sleepHours: 7.9,
      energy: 4,
      stress: 5,
      workload: 'medium',
      journal: 'Went to bed an hour earlier last night. Paid off big time: aced both quizzes today.',
      tasks: [
        { id: 't16', title: 'Complete chemistry quiz', completed: true, priority: 'high' },
        { id: 't17', title: 'Math quiz', completed: true, priority: 'high' },
      ],
      aiReflection: 'Immediate positive feedback loop: your proactive sleep intervention directly preserved your exam composure.',
      tags: ['SleepIntervention', 'Success'],
    },
    {
      date: getOffsetDateString(now, -1),
      time: '22:15',
      timestamp: getOffsetTimestamp(now, -1, 22, 15),
      mood: 4,
      sleepHours: 7.6,
      energy: 4,
      stress: 4,
      workload: 'low',
      journal: 'Friday wrapped. Submitted my essay 3 hours before deadline! Relaxing tonight.',
      tasks: [
        { id: 't18', title: 'Submit literature essay', completed: true, priority: 'high' },
      ],
      aiReflection: 'Early submission demonstrates how consistent energy prevents deadline panic. Celebrate this win.',
      tags: ['EarlySubmission', 'Celebration'],
    },
    {
      date: getOffsetDateString(now, 0),
      time: '19:45',
      timestamp: getOffsetTimestamp(now, 0, 19, 45),
      mood: 5,
      sleepHours: 8.4,
      energy: 5,
      stress: 2,
      workload: 'low',
      journal: 'Wonderful day. Did morning yoga, went for coffee, organized desk. Ready for the next week with clarity.',
      tasks: [
        { id: 't19', title: 'Organize study space', completed: true, priority: 'low' },
        { id: 't20', title: 'Review 7-day experiment reflection', completed: true, priority: 'medium' },
      ],
      aiReflection: 'You are operating in your optimal rhythm: 8+ hours sleep, low stress, radiant energy. Keep these conditions visible as your personal standard.',
      tags: ['Clarity', 'OptimalState'],
    },
  ];

  await db.checkIns.bulkAdd(sampleCheckIns);

  const sampleTasks: ActionTask[] = [
    {
      title: 'Protect 8h sleep window before next midterm',
      description: 'Wind down at 22:30 without screens; keep bedroom cool (19°C).',
      category: 'sleep',
      priority: 'high',
      completed: false,
      dueDate: getOffsetDateString(now, 2),
      origin: 'ai_suggested',
      createdAt: Date.now() - 86400000,
    },
    {
      title: 'Complete 2x 25-min Pomodoro sprints for Biology Chapter 4',
      description: 'Focus exclusively on active recall flashcards.',
      category: 'academic',
      priority: 'high',
      completed: true,
      dueDate: getOffsetDateString(now, 0),
      origin: 'manual',
      createdAt: Date.now() - 40000000,
      completedAt: Date.now() - 5000000,
    },
    {
      title: 'Afternoon hydration and 15-minute nature walk',
      description: 'Replace second afternoon espresso with water and outdoor sunlight to reset alertness.',
      category: 'wellness',
      priority: 'medium',
      completed: false,
      dueDate: getOffsetDateString(now, 1),
      origin: 'ai_suggested',
      createdAt: Date.now() - 20000000,
    },
    {
      title: 'Break down term paper into 4 bite-sized outlines',
      description: 'Avoid staring at a blank document by creating heading structures first.',
      category: 'productivity',
      priority: 'medium',
      completed: false,
      dueDate: getOffsetDateString(now, 3),
      origin: 'ai_suggested',
      createdAt: Date.now() - 10000000,
    },
  ];

  await db.actionTasks.bulkAdd(sampleTasks);

  // Update experiment days 1 to 4 as completed to show real progress
  await db.experimentProgress.update(1, {
    completed: true,
    completedDate: getOffsetDateString(now, -6),
    userNotes: 'Noticed my energy drops sharply around 15:30 if I eat a heavy lunch.',
  });
  await db.experimentProgress.update(2, {
    completed: true,
    completedDate: getOffsetDateString(now, -5),
    userNotes: '7.8 hours seems to be my sweet spot; anything under 6.5h feels noticeably harder.',
  });
  await db.experimentProgress.update(3, {
    completed: true,
    completedDate: getOffsetDateString(now, -4),
    userNotes: 'My peak study block is definitely 10:00 to 12:30. Need to block off notifications then.',
  });
  await db.experimentProgress.update(4, {
    completed: true,
    completedDate: getOffsetDateString(now, -2),
    userNotes: 'Multi-tasking is my biggest stress trigger. Single-tasking with timer reduced anxiety.',
  });

  await updateSettings({ seededDemoData: true });
}

function getOffsetDateString(base: Date, dayOffset: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getOffsetTimestamp(base: Date, dayOffset: number, hours = 12, minutes = 0): number {
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hours, minutes, 0, 0);
  return d.getTime();
}

/**
 * Export full DB to JSON string
 */
export async function exportDatabaseJSON(): Promise<string> {
  const checkIns = await db.checkIns.toArray();
  const actionTasks = await db.actionTasks.toArray();
  const experimentProgress = await db.experimentProgress.toArray();
  const settings = await db.settings.toArray();
  const chatHistory = await db.chatHistory.toArray();

  const exportPayload = {
    appName: 'Mind Mirror AI',
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    data: {
      checkIns,
      actionTasks,
      experimentProgress,
      settings,
      chatHistory,
    },
  };

  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Import database from JSON string
 */
export async function importDatabaseJSON(jsonStr: string): Promise<{ success: boolean; message: string }> {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || !parsed.data) {
      return { success: false, message: 'Invalid Mind Mirror backup format.' };
    }

    if (Array.isArray(parsed.data.checkIns)) {
      await db.checkIns.clear();
      await db.checkIns.bulkAdd(parsed.data.checkIns);
    }
    if (Array.isArray(parsed.data.actionTasks)) {
      await db.actionTasks.clear();
      await db.actionTasks.bulkAdd(parsed.data.actionTasks);
    }
    if (Array.isArray(parsed.data.experimentProgress)) {
      await db.experimentProgress.clear();
      await db.experimentProgress.bulkAdd(parsed.data.experimentProgress);
    }

    return { success: true, message: `Successfully restored ${parsed.data.checkIns?.length || 0} check-ins and data records.` };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Import failed: ${errorMsg}` };
  }
}

/**
 * Reset all user records to fresh state
 */
export async function resetDatabase(): Promise<void> {
  await db.checkIns.clear();
  await db.actionTasks.clear();
  await db.chatHistory.clear();
  await db.experimentProgress.clear();
  await db.experimentProgress.bulkAdd(DEFAULT_EXPERIMENT_DAYS);
  await updateSettings({ seededDemoData: false });
}
