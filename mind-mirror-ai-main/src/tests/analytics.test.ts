import { describe, it, expect } from 'vitest';
import {
  calculatePearsonCorrelation,
  classifyCorrelation,
  calculateStreaks,
  analyzePersonalData,
} from '../services/analytics';
import type { DailyCheckIn } from '../types';

describe('Analytics Engine - Pearson Correlation', () => {
  it('correctly calculates perfect positive correlation (+1.0)', () => {
    const xs = [1, 2, 3, 4, 5];
    const ys = [2, 4, 6, 8, 10];
    const r = calculatePearsonCorrelation(xs, ys);
    expect(r).toBe(1.0);
  });

  it('correctly calculates perfect negative correlation (-1.0)', () => {
    const xs = [1, 2, 3, 4, 5];
    const ys = [10, 8, 6, 4, 2];
    const r = calculatePearsonCorrelation(xs, ys);
    expect(r).toBe(-1.0);
  });

  it('handles zero variance gracefully without crashing', () => {
    const xs = [5, 5, 5, 5];
    const ys = [1, 2, 3, 4];
    const r = calculatePearsonCorrelation(xs, ys);
    expect(r).toBe(0);
  });

  it('classifies correlation strengths accurately', () => {
    expect(classifyCorrelation(0.85)).toBe('strong_positive');
    expect(classifyCorrelation(0.55)).toBe('moderate_positive');
    expect(classifyCorrelation(0.2)).toBe('weak_positive');
    expect(classifyCorrelation(0.05)).toBe('none');
    expect(classifyCorrelation(-0.25)).toBe('weak_negative');
    expect(classifyCorrelation(-0.55)).toBe('moderate_negative');
    expect(classifyCorrelation(-0.85)).toBe('strong_negative');
  });
});

describe('Analytics Engine - Check-in Streaks', () => {
  it('calculates streaks accurately across consecutive dates', () => {
    const checkIns: Partial<DailyCheckIn>[] = [
      { date: '2026-10-01' },
      { date: '2026-10-02' },
      { date: '2026-10-03' },
      { date: '2026-10-05' },
      { date: '2026-10-06' },
    ];
    const { longestStreak } = calculateStreaks(checkIns as DailyCheckIn[]);
    expect(longestStreak).toBe(3);
  });
});

describe('Analytics Engine - Personal Data Analysis', () => {
  it('generates correlations and evidence statements for student check-ins', () => {
    const sample: DailyCheckIn[] = [
      {
        date: '2026-10-01',
        time: '22:00',
        timestamp: 1000,
        mood: 2,
        sleepHours: 5.5,
        energy: 2,
        stress: 8,
        workload: 'high',
        journal: 'Rough night with exam crunch',
        tasks: [],
      },
      {
        date: '2026-10-02',
        time: '22:00',
        timestamp: 2000,
        mood: 3,
        sleepHours: 6.5,
        energy: 3,
        stress: 6,
        workload: 'medium',
        journal: 'Better study block',
        tasks: [],
      },
      {
        date: '2026-10-03',
        time: '22:00',
        timestamp: 3000,
        mood: 5,
        sleepHours: 8.5,
        energy: 5,
        stress: 3,
        workload: 'low',
        journal: 'Weekend recovery',
        tasks: [],
      },
    ];

    const result = analyzePersonalData(sample);
    expect(result.totalCheckIns).toBe(3);
    expect(result.avgSleep).toBeCloseTo(6.8, 1);
    expect(result.correlations.length).toBeGreaterThan(0);

    const sleepEnergy = result.correlations.find((c) => c.variableA === 'Sleep Duration');
    expect(sleepEnergy).toBeDefined();
    expect(sleepEnergy?.coefficient).toBeGreaterThan(0.9); // Strong positive co-occurrence
  });
});
