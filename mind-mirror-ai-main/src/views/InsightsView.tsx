import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from 'recharts';
import {
  LineChart as LineChartIcon,
  Moon,
  Activity,
  Calendar,
  Sparkles,
  TrendingUp,
  Brain,
  ShieldAlert,
} from 'lucide-react';
import type { DailyCheckIn } from '../types';
import { analyzePersonalData } from '../services/analytics';
import { Badge } from '../components/ui/Badge';
import { StatCard } from '../components/ui/StatCard';

interface InsightsViewProps {
  checkIns: DailyCheckIn[];
}

export const InsightsView: React.FC<InsightsViewProps> = ({ checkIns }) => {
  const [timeRange, setTimeRange] = useState<'7' | '14' | '30' | 'all'>('14');

  // Filter check-ins by selected time range
  const filteredCheckIns = useMemo(() => {
    if (checkIns.length === 0) return [];
    const sorted = [...checkIns].sort((a, b) => a.timestamp - b.timestamp);
    if (timeRange === 'all') return sorted;

    const days = parseInt(timeRange, 10);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const filtered = sorted.filter((c) => c.timestamp >= cutoff);
    return filtered.length > 0 ? filtered : sorted.slice(-days);
  }, [checkIns, timeRange]);

  // Analytics synthesis
  const stats = useMemo(() => {
    return analyzePersonalData(filteredCheckIns);
  }, [filteredCheckIns]);

  // Chart data formatting
  const chartData = useMemo(() => {
    return filteredCheckIns.map((c) => ({
      date: c.date.slice(5), // MM-DD
      fullDate: c.date,
      mood: c.mood,
      sleep: c.sleepHours,
      energy: c.energy,
      stress: c.stress,
      workloadNum: c.workload === 'high' ? 3 : c.workload === 'medium' ? 2 : 1,
      workload: c.workload,
    }));
  }, [filteredCheckIns]);

  // Workload breakdown data
  const workloadData = useMemo(() => {
    const counts = { low: 0, medium: 0, high: 0 };
    const stressByWorkload: { [key: string]: { sum: number; count: number } } = {
      low: { sum: 0, count: 0 },
      medium: { sum: 0, count: 0 },
      high: { sum: 0, count: 0 },
    };

    filteredCheckIns.forEach((c) => {
      counts[c.workload]++;
      stressByWorkload[c.workload].sum += c.stress;
      stressByWorkload[c.workload].count++;
    });

    return [
      {
        workload: 'Low',
        days: counts.low,
        avgStress: stressByWorkload.low.count
          ? Math.round((stressByWorkload.low.sum / stressByWorkload.low.count) * 10) / 10
          : 0,
      },
      {
        workload: 'Medium',
        days: counts.medium,
        avgStress: stressByWorkload.medium.count
          ? Math.round((stressByWorkload.medium.sum / stressByWorkload.medium.count) * 10) / 10
          : 0,
      },
      {
        workload: 'High',
        days: counts.high,
        avgStress: stressByWorkload.high.count
          ? Math.round((stressByWorkload.high.sum / stressByWorkload.high.count) * 10) / 10
          : 0,
      },
    ];
  }, [filteredCheckIns]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-2">
            <Brain className="w-3.5 h-3.5" />
            <span>Pattern Analytics Engine</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Personal Insights & Evidence
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Evidence-supported mathematical observations derived from your self-reported logs.
          </p>
        </div>

        {/* Time range selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 self-start md:self-auto">
          {(['7', '14', '30', 'all'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                timeRange === r
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {r === 'all' ? 'All Time' : `Last ${r}d`}
            </button>
          ))}
        </div>
      </div>

      {/* Statistical Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Data Sample Coverage"
          value={`${stats.totalCheckIns} Days`}
          subtitle={
            stats.dateRange
              ? `${stats.dateRange.start} to ${stats.dateRange.end} (${stats.dataCoveragePercent}% coverage)`
              : 'Awaiting logs'
          }
          icon={<Calendar className="w-5 h-5" />}
          accentColor="cyan"
        />

        <StatCard
          title="Average Sleep Duration"
          value={`${stats.avgSleep} hrs`}
          subtitle={
            stats.avgSleep >= 7.5
              ? 'Healthy cognitive restoration baseline'
              : 'Below recommended 7.5h restorative window'
          }
          icon={<Moon className="w-5 h-5" />}
          accentColor="teal"
        />

        <StatCard
          title="Energy vs Stress Ratio"
          value={`${stats.avgEnergy} / ${stats.avgStress}`}
          subtitle="Energy (1-5) vs Stress (1-10)"
          icon={<Activity className="w-5 h-5" />}
          accentColor={stats.avgStress > 6 ? 'rose' : 'violet'}
        />

        <StatCard
          title="Reflection Consistency"
          value={`${stats.currentStreak} Days`}
          subtitle={`Longest recorded streak: ${stats.longestStreak} days`}
          icon={<TrendingUp className="w-5 h-5" />}
          accentColor="amber"
        />
      </div>

      {/* Main Trends Multi-Line Chart */}
      <div className="rounded-3xl bg-slate-900/60 border border-cyan-500/20 p-6 md:p-8 backdrop-blur-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <LineChartIcon className="w-5 h-5 text-cyan-400" />
              <span>Multi-Variable Daily Trends</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Tracking Sleep (hours), Energy (1-5), Stress (1-10), and Mood (1-5) across consecutive days.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-teal-300 font-medium">
              <span className="w-3 h-1 rounded-full bg-teal-400" /> Sleep (hrs)
            </span>
            <span className="flex items-center gap-1.5 text-amber-300 font-medium">
              <span className="w-3 h-1 rounded-full bg-amber-400" /> Energy (1-5)
            </span>
            <span className="flex items-center gap-1.5 text-rose-300 font-medium">
              <span className="w-3 h-1 rounded-full bg-rose-400" /> Stress (1-10)
            </span>
            <span className="flex items-center gap-1.5 text-cyan-300 font-medium">
              <span className="w-3 h-1 rounded-full bg-cyan-400" /> Mood (1-5)
            </span>
          </div>
        </div>

        {chartData.length < 2 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            Log at least 2 check-ins to generate personal trend lines.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" domain={[0, 12]} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090e1a',
                    border: '1px solid #1e293b',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="sleep"
                  name="Sleep (hrs)"
                  stroke="#2dd4bf"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#2dd4bf' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="energy"
                  name="Energy (1-5)"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#fbbf24' }}
                />
                <Line
                  type="monotone"
                  dataKey="stress"
                  name="Stress (1-10)"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#f43f5e' }}
                />
                <Line
                  type="monotone"
                  dataKey="mood"
                  name="Mood (1-5)"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#38bdf8' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Grid: Sleep vs Energy Area Chart & Workload vs Stress Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sleep vs Energy Relationship Area */}
        <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 backdrop-blur-xl space-y-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Moon className="w-4 h-4 text-teal-400" />
              <span>Sleep Duration vs. Energy Level</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Visualizing how nightly rest directly mirrors the following day's energy reserve.
            </p>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" domain={[0, 10]} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090e1a',
                    border: '1px solid #1e293b',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="sleep" name="Sleep (hrs)" stroke="#2dd4bf" fill="url(#sleepGrad)" />
                <Area type="monotone" dataKey="energy" name="Energy (1-5)" stroke="#fbbf24" fill="url(#energyGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Workload vs Stress Bar Chart */}
        <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 backdrop-blur-xl space-y-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-400" />
              <span>Workload Intensity vs. Average Stress</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Comparing average reported stress across Low, Medium, and High workload days.
            </p>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="workload" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" domain={[0, 10]} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090e1a',
                    border: '1px solid #1e293b',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="avgStress" name="Avg Stress (1-10)" fill="#f43f5e" radius={[8, 8, 0, 0]} />
                <Bar dataKey="days" name="Number of Days" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Evidence-Supported Observations Section */}
      <div className="rounded-3xl bg-slate-900/60 border border-cyan-500/20 p-6 md:p-8 backdrop-blur-xl space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Empirical Findings</span>
          </div>
          <h3 className="text-lg font-bold text-white">
            Observed Mathematical Relationships in Your Records
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Calculated Pearson correlation coefficients ($r$) identifying patterns in your recorded habits.
          </p>
        </div>

        {stats.correlations.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500">
            Log at least 3 check-ins to generate statistical correlation analyses.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.correlations.map((c, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-cyan-500/30 transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white">
                    {c.variableA} ⟷ {c.variableB}
                  </div>
                  <Badge
                    variant={
                      c.coefficient > 0.4
                        ? 'teal'
                        : c.coefficient < -0.4
                        ? 'rose'
                        : 'cyan'
                    }
                    size="sm"
                  >
                    r = {c.coefficient > 0 ? '+' : ''}{c.coefficient}
                  </Badge>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  {c.description}
                </p>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <p>
                    <strong className="text-slate-300">Observed Evidence:</strong> {c.evidenceText}
                  </p>
                  <p>
                    <strong className="text-cyan-400">Practical Next Step:</strong> {c.practicalTip}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Ethical Non-Diagnostic & Non-Causation Disclaimer */}
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-amber-200/90 text-xs">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="font-bold text-amber-300">Statistical Notice on Correlation vs. Causation</h5>
            <p className="text-[11px] leading-relaxed text-amber-200/80">
              The correlations shown above represent mathematical co-occurrence within your personal sample data. They do not prove medical or psychological causation, nor do they constitute a clinical diagnosis. Individual physiological responses vary based on nutrition, circadian phase, and life stressors.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
