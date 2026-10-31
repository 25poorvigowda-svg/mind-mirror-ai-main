import type { DailyCheckIn, CorrelationInsight, StatisticalSummary } from '../types';

/**
 * Calculates the Pearson correlation coefficient between two numeric arrays.
 * Returns a value between -1.0 and +1.0, or 0 if variance is zero or length < 2.
 */
export function calculatePearsonCorrelation(xs: number[], ys: number[]): number {
  if (xs.length !== ys.length || xs.length < 2) return 0;

  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const diffX = xs[i] - meanX;
    const diffY = ys[i] - meanY;
    numerator += diffX * diffY;
    denomX += diffX * diffX;
    denomY += diffY * diffY;
  }

  const denominator = Math.sqrt(denomX * denomY);
  if (denominator === 0) return 0;

  const r = numerator / denominator;
  // Clamp due to floating point inaccuracies
  return Math.max(-1, Math.min(1, Math.round(r * 100) / 100));
}

export function classifyCorrelation(r: number): CorrelationInsight['strength'] {
  if (r >= 0.7) return 'strong_positive';
  if (r >= 0.4) return 'moderate_positive';
  if (r >= 0.15) return 'weak_positive';
  if (r <= -0.7) return 'strong_negative';
  if (r <= -0.4) return 'moderate_negative';
  if (r <= -0.15) return 'weak_negative';
  return 'none';
}

/**
 * Computes consecutive check-in streak
 */
export function calculateStreaks(checkIns: DailyCheckIn[]): { currentStreak: number; longestStreak: number } {
  if (checkIns.length === 0) return { currentStreak: 0, longestStreak: 0 };

  // Sort unique dates ascending
  const uniqueDates = Array.from(new Set(checkIns.map((c) => c.date))).sort();
  if (uniqueDates.length === 0) return { currentStreak: 0, longestStreak: 0 };

  let currentStreak = 1;
  let longestStreak = 1;
  let running = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i - 1]).getTime();
    const curr = new Date(uniqueDates[i]).getTime();
    const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      running++;
      if (running > longestStreak) longestStreak = running;
    } else if (diffDays > 1) {
      running = 1;
    }
  }

  // Check if current streak extends to today or yesterday
  const lastDate = new Date(uniqueDates[uniqueDates.length - 1]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  lastDate.setHours(0, 0, 0, 0);
  const diffFromToday = Math.round((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffFromToday <= 1) {
    currentStreak = running;
  } else {
    currentStreak = 0;
  }

  return { currentStreak, longestStreak };
}

/**
 * Analyzes check-in history to extract evidence-supported statistical relationships.
 */
export function analyzePersonalData(checkIns: DailyCheckIn[]): StatisticalSummary {
  const n = checkIns.length;

  if (n === 0) {
    return {
      totalCheckIns: 0,
      dateRange: null,
      dataCoveragePercent: 0,
      avgMood: 0,
      avgSleep: 0,
      avgEnergy: 0,
      avgStress: 0,
      workloadDistribution: { low: 0, medium: 0, high: 0 },
      currentStreak: 0,
      longestStreak: 0,
      correlations: [],
    };
  }

  // Sort chronological
  const sorted = [...checkIns].sort((a, b) => a.timestamp - b.timestamp);
  const startDate = sorted[0].date;
  const endDate = sorted[sorted.length - 1].date;

  const startMs = new Date(startDate).getTime();
  const endMs = new Date(endDate).getTime();
  const totalDaysInRange = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1);
  const coveragePercent = Math.min(100, Math.round((n / totalDaysInRange) * 100));

  const totalMood = checkIns.reduce((sum, c) => sum + c.mood, 0);
  const totalSleep = checkIns.reduce((sum, c) => sum + c.sleepHours, 0);
  const totalEnergy = checkIns.reduce((sum, c) => sum + c.energy, 0);
  const totalStress = checkIns.reduce((sum, c) => sum + c.stress, 0);

  const avgMood = Math.round((totalMood / n) * 10) / 10;
  const avgSleep = Math.round((totalSleep / n) * 10) / 10;
  const avgEnergy = Math.round((totalEnergy / n) * 10) / 10;
  const avgStress = Math.round((totalStress / n) * 10) / 10;

  const workloadCounts = { low: 0, medium: 0, high: 0 };
  for (const c of checkIns) {
    if (c.workload in workloadCounts) {
      workloadCounts[c.workload]++;
    }
  }

  const { currentStreak, longestStreak } = calculateStreaks(sorted);

  // Correlation computations
  const sleeps = checkIns.map((c) => c.sleepHours);
  const energies = checkIns.map((c) => c.energy);
  const moods = checkIns.map((c) => c.mood);
  const stresses = checkIns.map((c) => c.stress);
  const workloadNums = checkIns.map((c) => (c.workload === 'high' ? 3 : c.workload === 'medium' ? 2 : 1));

  const sleepEnergyR = calculatePearsonCorrelation(sleeps, energies);
  const workloadStressR = calculatePearsonCorrelation(workloadNums, stresses);
  const sleepMoodR = calculatePearsonCorrelation(sleeps, moods);
  const stressMoodR = calculatePearsonCorrelation(stresses, moods);

  // Grouped observations: Sleep >= 7h vs < 7h
  const goodSleepDays = checkIns.filter((c) => c.sleepHours >= 7);
  const lowSleepDays = checkIns.filter((c) => c.sleepHours < 7);

  const avgEnergyGoodSleep = goodSleepDays.length > 0
    ? Math.round((goodSleepDays.reduce((s, c) => s + c.energy, 0) / goodSleepDays.length) * 10) / 10
    : 0;
  const avgEnergyLowSleep = lowSleepDays.length > 0
    ? Math.round((lowSleepDays.reduce((s, c) => s + c.energy, 0) / lowSleepDays.length) * 10) / 10
    : 0;

  // Grouped observations: High workload vs Low/Med workload stress
  const highWorkDays = checkIns.filter((c) => c.workload === 'high');
  const moderateWorkDays = checkIns.filter((c) => c.workload !== 'high');

  const avgStressHighWork = highWorkDays.length > 0
    ? Math.round((highWorkDays.reduce((s, c) => s + c.stress, 0) / highWorkDays.length) * 10) / 10
    : 0;
  const avgStressModWork = moderateWorkDays.length > 0
    ? Math.round((moderateWorkDays.reduce((s, c) => s + c.stress, 0) / moderateWorkDays.length) * 10) / 10
    : 0;

  const correlations: CorrelationInsight[] = [];

  // Insight 1: Sleep vs Energy
  if (n >= 3) {
    const strength = classifyCorrelation(sleepEnergyR);
    let desc = '';
    let evidence = '';
    let tip = '';

    if (sleepEnergyR > 0.3) {
      desc = `Longer sleep duration strongly co-occurs with higher self-reported energy (${sleepEnergyR > 0 ? '+' : ''}${sleepEnergyR}).`;
      evidence = goodSleepDays.length && lowSleepDays.length
        ? `On days with 7+ hours of sleep, your average energy is ${avgEnergyGoodSleep}/5 compared to ${avgEnergyLowSleep}/5 on days with under 7 hours.`
        : `Positive trend noted across your ${n} recorded days.`;
      tip = 'Guard your 7.5h sleep boundary especially during exam or project crunch weeks.';
    } else if (sleepEnergyR < -0.3) {
      desc = `An unusual inverse pattern was recorded where longer sleep correlated with lower energy (${sleepEnergyR}).`;
      evidence = `Average energy was ${avgEnergyGoodSleep}/5 on 7+h sleep days. This may indicate oversleeping fatigue or circadian irregularity.`;
      tip = 'Try testing a fixed wake-up time regardless of bedtime to stabilize circadian rhythm.';
    } else {
      desc = `Mild or neutral relationship recorded between sleep hours and energy (${sleepEnergyR > 0 ? '+' : ''}${sleepEnergyR}).`;
      evidence = `Sleep averaged ${avgSleep}h and energy averaged ${avgEnergy}/5 across the period.`;
      tip = 'Consider tracking sleep quality factors such as pre-bed screen time and caffeine timing.';
    }

    correlations.push({
      variableA: 'Sleep Duration',
      variableB: 'Energy Rating',
      coefficient: sleepEnergyR,
      strength,
      description: desc,
      evidenceText: evidence,
      practicalTip: tip,
    });
  }

  // Insight 2: Workload vs Stress
  if (n >= 3) {
    const strength = classifyCorrelation(workloadStressR);
    let desc = '';
    let evidence = '';
    let tip = '';

    if (workloadStressR > 0.3) {
      desc = `Elevated academic workload is a primary factor in your reported stress levels (${workloadStressR > 0 ? '+' : ''}${workloadStressR}).`;
      evidence = highWorkDays.length && moderateWorkDays.length
        ? `On High Workload days, your average stress is ${avgStressHighWork}/10, vs ${avgStressModWork}/10 on Moderate/Low days.`
        : `Stress tracks workload intensity across ${n} entries.`;
      tip = 'Implement active task batching and Pomodoro sprints to prevent cognitive overwhelm.';
    } else {
      desc = `Your perceived stress remains relatively independent of workload intensity (${workloadStressR > 0 ? '+' : ''}${workloadStressR}).`;
      evidence = `Stress averaged ${avgStress}/10 across all workload variations.`;
      tip = 'Your emotional buffer is resilient; focus on maintaining your balance during sudden peaks.';
    }

    correlations.push({
      variableA: 'Academic Workload',
      variableB: 'Stress Level',
      coefficient: workloadStressR,
      strength,
      description: desc,
      evidenceText: evidence,
      practicalTip: tip,
    });
  }

  // Insight 3: Stress vs Mood
  if (n >= 3) {
    const strength = classifyCorrelation(stressMoodR);
    const desc = stressMoodR < -0.3
      ? `Higher stress noticeably coincides with dips in daily mood (${stressMoodR}).`
      : `Mood and stress show a steady relationship (${stressMoodR > 0 ? '+' : ''}${stressMoodR}).`;
    const evidence = `Recorded mood averaged ${avgMood}/5 while stress averaged ${avgStress}/10 across ${n} check-ins.`;
    const tip = 'When stress rises above 6/10, schedule a deliberate 15-minute screen-free break.';

    correlations.push({
      variableA: 'Stress Rating',
      variableB: 'Mood Rating',
      coefficient: stressMoodR,
      strength,
      description: desc,
      evidenceText: evidence,
      practicalTip: tip,
    });
  }

  // Insight 4: Sleep vs Mood
  if (n >= 3) {
    const strength = classifyCorrelation(sleepMoodR);
    correlations.push({
      variableA: 'Sleep Duration',
      variableB: 'Mood Rating',
      coefficient: sleepMoodR,
      strength,
      description: `Sleep duration shows a ${strength.replace('_', ' ')} correlation with your positive mood (${sleepMoodR > 0 ? '+' : ''}${sleepMoodR}).`,
      evidenceText: `Across ${n} days, consistent rest supported overall emotional equilibrium.`,
      practicalTip: 'Aim for a 30-minute wind-down window with warm lighting before sleeping.',
    });
  }

  return {
    totalCheckIns: n,
    dateRange: { start: startDate, end: endDate },
    dataCoveragePercent: coveragePercent,
    avgMood,
    avgSleep,
    avgEnergy,
    avgStress,
    workloadDistribution: workloadCounts,
    currentStreak,
    longestStreak,
    correlations,
  };
}
