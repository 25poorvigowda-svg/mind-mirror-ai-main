import React from 'react';
import {
  Sparkles,
  Bot,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Moon,
  Zap,
  Activity,
  Smile,
  ArrowRight,
  Compass,
  Play,
  Database,
} from 'lucide-react';
import type { DailyCheckIn, ExperimentDay, ActionTask, UserProfile } from '../types';
import type { NavTab } from '../components/layout/Navbar';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';

interface DashboardViewProps {
  checkIns: DailyCheckIn[];
  todayCheckIn?: DailyCheckIn;
  experimentDays: ExperimentDay[];
  tasks: ActionTask[];
  userProfile?: UserProfile;
  onNavigate: (tab: NavTab) => void;
  onSeedDemoData: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  checkIns,
  todayCheckIn,
  experimentDays,
  tasks,
  userProfile,
  onNavigate,
  onSeedDemoData,
}) => {
  // Recent 7 days
  const recent7 = [...checkIns].sort((a, b) => b.timestamp - a.timestamp).slice(0, 7);

  // Computations
  const totalEntries = checkIns.length;
  const avgSleep = totalEntries > 0
    ? Math.round((checkIns.reduce((s, c) => s + c.sleepHours, 0) / totalEntries) * 10) / 10
    : 0;
  const avgEnergy = totalEntries > 0
    ? Math.round((checkIns.reduce((s, c) => s + c.energy, 0) / totalEntries) * 10) / 10
    : 0;
  const avgStress = totalEntries > 0
    ? Math.round((checkIns.reduce((s, c) => s + c.stress, 0) / totalEntries) * 10) / 10
    : 0;

  // Experiment progress
  const completedDays = experimentDays.filter((d) => d.completed).length;
  const experimentPercent = Math.round((completedDays / 7) * 100);

  // Pending actions
  const pendingTasks = tasks.filter((t) => !t.completed);

  const moodLabels = ['', 'Drained', 'Sluggish', 'Balanced', 'Good', 'Radiant'];
  const moodIcons = ['', '😔', '😐', '🙂', '😊', '✨'];

  // Current greeting based on time
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome & Top Callout */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-cyan-950/40 border border-cyan-500/20 p-6 md:p-8 backdrop-blur-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-32 -mb-16 w-64 h-64 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pluto 3D • Student Reflection Companion</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {timeGreeting}, {userProfile?.fullName || 'Explorer'}.
            </h1>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
              Understand the connections between your sleep, academic workload, and daily energy.
              Reflect with your 3D companion <strong>Pluto</strong> and take intentional next steps.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('companion')}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-500 to-cyan-400 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 hover:brightness-110 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Bot className="w-4 h-4" />
              <span>Talk with Pluto 3D</span>
            </button>

            <button
              onClick={() => onNavigate('checkin')}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-white font-medium text-sm transition-all"
            >
              <CalendarCheck className="w-4 h-4 text-cyan-400" />
              <span>{todayCheckIn ? 'Review Today’s Check-in' : 'Start Today’s Check-in'}</span>
            </button>
          </div>
        </div>

        {/* Today's Check-in Status Banner */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                todayCheckIn ? 'bg-teal-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-xs font-medium text-slate-300">
              {todayCheckIn ? (
                <>
                  Today's check-in logged at{' '}
                  <span className="text-teal-300 font-semibold">{todayCheckIn.time}</span>. (Mood:{' '}
                  {moodLabels[todayCheckIn.mood]}, Sleep: {todayCheckIn.sleepHours}h, Energy:{' '}
                  {todayCheckIn.energy}/5)
                </>
              ) : (
                'You haven’t checked in for today yet. It takes less than 60 seconds!'
              )}
            </span>
          </div>

          {todayCheckIn?.aiReflection && (
            <p className="text-xs text-cyan-300/90 italic bg-cyan-950/40 border border-cyan-500/20 px-3 py-1.5 rounded-xl max-w-xl truncate">
              "{todayCheckIn.aiReflection}"
            </p>
          )}
        </div>
      </div>

      {/* Demo Data Seeder Banner (shown when total entries is low) */}
      {checkIns.length < 3 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-violet-950/30 border border-violet-500/30 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-900/50 text-violet-300">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Exploring for Hackathon Judging?</h4>
              <p className="text-xs text-slate-300">
                Load 14 days of realistic student data (exam preparation, sleep variances, stress peaks) to instantly test all 3D voice interactions, correlation graphs, and insights.
              </p>
            </div>
          </div>
          <button
            onClick={onSeedDemoData}
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Seed 14-Day Realistic Student Data</span>
          </button>
        </div>
      )}

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Current / Recent Mood"
          value={
            todayCheckIn
              ? `${moodIcons[todayCheckIn.mood]} ${moodLabels[todayCheckIn.mood]}`
              : recent7.length > 0
              ? `${moodIcons[recent7[0].mood]} ${moodLabels[recent7[0].mood]}`
              : 'No entry'
          }
          subtitle={totalEntries > 0 ? `Overall average: ${avgMoodLabels(checkIns)}` : 'Log to reveal'}
          icon={<Smile className="w-5 h-5" />}
          accentColor="cyan"
          onClick={() => onNavigate('checkin')}
        />

        <StatCard
          title="Average Sleep Duration"
          value={totalEntries > 0 ? `${avgSleep} hrs` : '--'}
          subtitle={
            avgSleep >= 7.5
              ? 'Meets recommended 7.5h restorative window'
              : totalEntries > 0
              ? 'Below ideal cognitive recharge target'
              : 'Log daily sleep'
          }
          icon={<Moon className="w-5 h-5" />}
          accentColor="teal"
          trend={
            totalEntries > 1
              ? {
                  value: avgSleep >= 7 ? 'Restored' : 'Compromised',
                  isPositive: avgSleep >= 7,
                }
              : undefined
          }
          onClick={() => onNavigate('insights')}
        />

        <StatCard
          title="Daily Energy Rating"
          value={totalEntries > 0 ? `${avgEnergy} / 5` : '--'}
          subtitle={
            todayCheckIn
              ? `Today reported at ${todayCheckIn.energy}/5`
              : 'Tracks mental & physical stamina'
          }
          icon={<Zap className="w-5 h-5" />}
          accentColor="amber"
          onClick={() => onNavigate('insights')}
        />

        <StatCard
          title="Self-Reported Stress"
          value={totalEntries > 0 ? `${avgStress} / 10` : '--'}
          subtitle={
            avgStress >= 7
              ? 'Elevated academic stress load'
              : avgStress <= 4
              ? 'Healthy sustainable equilibrium'
              : 'Moderate academic demands'
          }
          icon={<Activity className="w-5 h-5" />}
          accentColor={avgStress >= 7 ? 'rose' : 'violet'}
          onClick={() => onNavigate('insights')}
        />
      </div>

      {/* Grid: 3D Companion Teaser & 7-Day Experiment Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D Companion Banner Card */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-slate-900/60 border border-cyan-500/20 p-6 md:p-8 backdrop-blur-md flex flex-col justify-between">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-cyan-500/10 to-transparent pointer-events-none" />

          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold mb-2">
              <Bot className="w-4 h-4" />
              <span>Pluto 3D • Multilingual Voice Reflection Partner</span>
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Talk Out Your Study Day with Pluto
            </h3>
            <p className="mt-2 text-sm text-slate-300 max-w-xl leading-relaxed">
              Feeling overwhelmed by a sudden exam or struggling to focus? Speak or text with Pluto, your 3D avatar.
              Pluto analyzes your recent check-in patterns, speaks back with natural voice lip-sync, and breaks down your challenges into bite-sized next steps.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              onClick={() => onNavigate('companion')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold text-sm hover:brightness-110 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Bot className="w-4 h-4" />
              <span>Talk with Pluto 3D</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate('studio')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Mind Studio (Art, Audio, Video)</span>
            </button>

            <span className="text-xs text-slate-400">
              Languages: English • हिन्दी (Hindi) • ಕನ್ನಡ (Kannada)
            </span>
          </div>
        </div>

        {/* 7-Day Reflection Experiment Progress */}
        <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-violet-400 text-xs font-semibold">
                <Compass className="w-4 h-4" />
                <span>7-Day Habit Challenge</span>
              </div>
              <Badge variant="violet" size="sm">
                Day {Math.min(7, completedDays + 1)} of 7
              </Badge>
            </div>

            <h4 className="text-base font-bold text-white">Student Reflection Experiment</h4>
            <p className="mt-1 text-xs text-slate-400">
              A guided science-informed curriculum to map your baseline, sleep rhythm, and focus windows.
            </p>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-slate-300 font-medium mb-1.5">
                <span>Completion</span>
                <span className="text-violet-300 font-bold">{completedDays} / 7 Days ({experimentPercent}%)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-500"
                  style={{ width: `${experimentPercent}%` }}
                />
              </div>
            </div>

            {/* Next challenge preview */}
            {completedDays < 7 && (
              <div className="mt-4 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Next Step:</p>
                <p className="text-xs font-medium text-slate-200 mt-0.5">
                  {experimentDays[completedDays]?.title || 'Continue Experiment'}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigate('experiment')}
            className="mt-5 w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition-colors"
          >
            <span>View Guided Experiment</span>
            <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        </div>
      </div>

      {/* Grid: Recent Check-in History & Active Action Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Check-in History */}
        <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-cyan-400" />
              <h3 className="text-base font-bold text-white">Recent Check-in Logs</h3>
            </div>
            <button
              onClick={() => onNavigate('insights')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
            >
              <span>Full Analytics</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {recent7.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <p>No check-ins recorded yet.</p>
              <button
                onClick={() => onNavigate('checkin')}
                className="mt-3 px-4 py-1.5 rounded-lg bg-cyan-950/60 text-cyan-400 border border-cyan-500/30 font-medium"
              >
                Log First Day
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recent7.map((entry) => (
                <div
                  key={entry.id || entry.date}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{moodIcons[entry.mood]}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">{entry.date}</span>
                        <span className="text-[10px] text-slate-400">{entry.time}</span>
                        <Badge
                          variant={
                            entry.workload === 'high'
                              ? 'rose'
                              : entry.workload === 'medium'
                              ? 'amber'
                              : 'teal'
                          }
                          size="sm"
                        >
                          {entry.workload.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Sleep: <span className="text-slate-200 font-medium">{entry.sleepHours}h</span> • Energy:{' '}
                        <span className="text-slate-200 font-medium">{entry.energy}/5</span> • Stress:{' '}
                        <span className="text-slate-200 font-medium">{entry.stress}/10</span>
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-cyan-400">
                    {moodLabels[entry.mood]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Planner Summary */}
        <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
              <h3 className="text-base font-bold text-white">Today's Focus & Next Steps</h3>
            </div>
            <button
              onClick={() => onNavigate('planner')}
              className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1"
            >
              <span>Open Planner</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {pendingTasks.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <p>All action items complete! Great job pacing yourself today.</p>
              <button
                onClick={() => onNavigate('planner')}
                className="mt-3 px-4 py-1.5 rounded-lg bg-teal-950/60 text-teal-400 border border-teal-500/30 font-medium"
              >
                Add Next Task
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingTasks.slice(0, 4).map((task) => (
                <div
                  key={task.id || task.title}
                  className="flex items-start justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-teal-500/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1 rounded-md bg-teal-950/60 text-teal-400">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-200">{task.title}</p>
                      {task.description && (
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="teal" size="sm">{task.category}</Badge>
                        {task.origin === 'ai_suggested' && (
                          <Badge variant="violet" size="sm">AI Suggested</Badge>
                        )}
                        {task.dueDate && (
                          <span className="text-[10px] text-slate-500">Due: {task.dueDate}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Badge
                    variant={
                      task.priority === 'high' ? 'rose' : task.priority === 'medium' ? 'amber' : 'slate'
                    }
                    size="sm"
                  >
                    {task.priority}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function avgMoodLabels(checkIns: DailyCheckIn[]): string {
  if (checkIns.length === 0) return 'None';
  const avg = checkIns.reduce((sum, c) => sum + c.mood, 0) / checkIns.length;
  if (avg >= 4.3) return 'Radiant';
  if (avg >= 3.4) return 'Good';
  if (avg >= 2.6) return 'Balanced';
  if (avg >= 1.8) return 'Sluggish';
  return 'Drained';
}
