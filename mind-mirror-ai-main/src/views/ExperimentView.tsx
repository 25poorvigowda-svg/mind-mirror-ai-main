import React, { useState } from 'react';
import {
  Compass,
  CheckCircle2,
  Circle,
  Award,
  Save,
} from 'lucide-react';
import type { ExperimentDay } from '../types';
import { db } from '../services/db';
import { Badge } from '../components/ui/Badge';
import { speechService } from '../services/speech';
import confetti from 'canvas-confetti';

interface ExperimentViewProps {
  experimentDays: ExperimentDay[];
  onExperimentUpdated: () => void;
}

export const ExperimentView: React.FC<ExperimentViewProps> = ({
  experimentDays,
  onExperimentUpdated,
}) => {
  const [selectedDayNum, setSelectedDayNum] = useState<number>(1);
  const [userNote, setUserNote] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const selectedDay = experimentDays.find((d) => d.day === selectedDayNum) || experimentDays[0];
  const completedCount = experimentDays.filter((d) => d.completed).length;
  const isAllComplete = completedCount === 7;

  const handleSelectDay = (day: ExperimentDay) => {
    setSelectedDayNum(day.day);
    setUserNote(day.userNotes || '');
  };

  const handleToggleComplete = async (day: ExperimentDay) => {
    const nextCompleted = !day.completed;
    await db.experimentProgress.update(day.day, {
      completed: nextCompleted,
      completedDate: nextCompleted ? new Date().toISOString().split('T')[0] : undefined,
      userNotes: userNote || day.userNotes,
    });

    if (nextCompleted) {
      speechService.playChime('complete');
      confetti({
        particleCount: 50,
        spread: 60,
        colors: ['#8b5cf6', '#06b6d4', '#14b8a6'],
      });
    }

    onExperimentUpdated();
  };

  const handleSaveNotes = async () => {
    if (!selectedDay) return;
    setIsSaving(true);
    await db.experimentProgress.update(selectedDay.day, {
      userNotes: userNote,
    });
    speechService.playChime('notification');
    setIsSaving(false);
    onExperimentUpdated();
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/40 border border-violet-500/20 p-6 md:p-8 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950/80 border border-violet-500/30 text-violet-300 text-xs font-semibold mb-2">
              <Compass className="w-3.5 h-3.5" />
              <span>Structured Student Habit Curriculum</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              7-Day Reflection Experiment
            </h1>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
              Build a lifelong habit of mindful self-observation. Spend 2 minutes each day following a guided evidence-informed prompt to uncover your personal baseline, sleep triggers, and focus rhythms.
            </p>
          </div>

          {/* Progress Badge */}
          <div className="flex flex-col items-center p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center min-w-[180px]">
            <Award className={`w-8 h-8 ${isAllComplete ? 'text-amber-400 animate-bounce' : 'text-violet-400'} mb-1`} />
            <span className="text-lg font-bold text-white">{completedCount} / 7 Days</span>
            <span className="text-xs text-slate-400">
              {isAllComplete ? 'Curriculum Completed! 🏆' : 'Experiment in Progress'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: 7-Day Road Timeline & Active Day Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: 7 Days Navigation List */}
        <div className="lg:col-span-4 space-y-2.5">
          {experimentDays.map((d) => {
            const isSelected = selectedDay?.day === d.day;
            return (
              <div
                key={d.day}
                onClick={() => handleSelectDay(d)}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-violet-950/40 border-violet-400/80 shadow-lg shadow-violet-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      d.completed
                        ? 'bg-emerald-500 text-slate-950'
                        : isSelected
                        ? 'bg-violet-500 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {d.completed ? '✓' : d.day}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{d.title}</h4>
                    <p className="text-[11px] text-slate-400">{d.theme}</p>
                  </div>
                </div>

                <Badge variant={d.completed ? 'emerald' : 'slate'} size="sm">
                  {d.completed ? 'Done' : `Day ${d.day}`}
                </Badge>
              </div>
            );
          })}
        </div>

        {/* Right Column: Selected Day Deep-Dive Card */}
        {selectedDay && (
          <div className="lg:col-span-8 rounded-3xl bg-slate-900/60 border border-slate-800 p-6 md:p-8 backdrop-blur-xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <Badge variant="violet" size="sm">Day {selectedDay.day} Theme: {selectedDay.theme}</Badge>
                <h2 className="text-xl font-bold text-white mt-1">{selectedDay.title}</h2>
              </div>

              <button
                onClick={() => handleToggleComplete(selectedDay)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                  selectedDay.completed
                    ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
                    : 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white hover:brightness-110 shadow-lg shadow-violet-600/20'
                }`}
              >
                {selectedDay.completed ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Completed!</span>
                  </>
                ) : (
                  <>
                    <Circle className="w-4 h-4" />
                    <span>Mark Day {selectedDay.day} as Complete</span>
                  </>
                )}
              </button>
            </div>

            {/* Objective & Action Guidance */}
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Scientific Objective:</h4>
                <p className="text-sm text-slate-200 leading-relaxed">{selectedDay.objective}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider">Today's Micro-Action Guidance:</h4>
                <p className="text-sm text-slate-200 leading-relaxed">{selectedDay.actionGuidance}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                <h4 className="text-xs font-bold text-violet-400 uppercase tracking-wider">Reflection Prompt:</h4>
                <p className="text-sm text-slate-200 leading-relaxed italic">"{selectedDay.reflectionQuestion}"</p>
              </div>
            </div>

            {/* User Personal Reflection Notes */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Your Personal Observations & Insights for Day {selectedDay.day}:
              </label>
              <textarea
                rows={3}
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                placeholder="What did you notice today? (e.g., 'Felt much sharper studying between 10am and 12pm than at 3pm...')"
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-3.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 leading-relaxed"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSaveNotes}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-400 border border-slate-700 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save Reflection Note'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
