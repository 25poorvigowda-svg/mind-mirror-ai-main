import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Moon,
  Zap,
  Activity,
  Briefcase,
  BookOpen,
  Mic,
  MicOff,
  Sparkles,
  Trash2,
  Edit2,
  Check,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import type { DailyCheckIn, MoodRating, EnergyRating, StressRating, WorkloadLevel, AcademicTask, UserSettings } from '../types';
import { db } from '../services/db';
import { generateCheckInReflection } from '../services/ai';
import { speechService } from '../services/speech';
import { Badge } from '../components/ui/Badge';
import confetti from 'canvas-confetti';

interface CheckInViewProps {
  checkIns: DailyCheckIn[];
  onCheckInSaved: () => void;
  settings?: UserSettings;
}

export const CheckInView: React.FC<CheckInViewProps> = ({
  checkIns,
  onCheckInSaved,
  settings,
}) => {
  // Form State
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().slice(0, 5);

  const [date, setDate] = useState(todayStr);
  const [time, setTime] = useState(timeStr);
  const [mood, setMood] = useState<MoodRating>(4);
  const [sleepHours, setSleepHours] = useState<number>(7.5);
  const [energy, setEnergy] = useState<EnergyRating>(4);
  const [stress, setStress] = useState<StressRating>(4);
  const [workload, setWorkload] = useState<WorkloadLevel>('medium');
  const [journal, setJournal] = useState('');
  const [tasks, setTasks] = useState<AcademicTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedReflection, setGeneratedReflection] = useState<string | null>(null);
  const [generatedActions, setGeneratedActions] = useState<string[]>([]);

  // Voice dictation state
  const [isDictating, setIsDictating] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);

  useEffect(() => {
    setVoiceSupported(speechService.isRecognitionSupported());
  }, []);

  // Pre-fill if editing
  const handleEditEntry = (entry: DailyCheckIn) => {
    setEditingId(entry.id || null);
    setDate(entry.date);
    setTime(entry.time);
    setMood(entry.mood);
    setSleepHours(entry.sleepHours);
    setEnergy(entry.energy);
    setStress(entry.stress);
    setWorkload(entry.workload);
    setJournal(entry.journal);
    setTasks(entry.tasks || []);
    setGeneratedReflection(entry.aiReflection || null);
    setGeneratedActions(entry.aiSuggestedActions || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteEntry = async (id?: number) => {
    if (!id) return;
    await db.checkIns.delete(id);
    onCheckInSaved();
    if (editingId === id) resetForm();
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask: AcademicTask = {
      id: 'task_' + Date.now(),
      title: newTaskTitle.trim(),
      completed: false,
      deadline: newTaskDeadline || undefined,
      priority: 'medium',
    };
    setTasks([...tasks, newTask]);
    setNewTaskTitle('');
    setNewTaskDeadline('');
  };

  const handleRemoveTask = (taskId: string) => {
    setTasks(tasks.filter((t) => t.id !== taskId));
  };

  const toggleVoiceDictation = async () => {
    if (isDictating) {
      setIsDictating(false);
      const text = await speechService.stopListening();
      if (text && text.trim()) {
        setJournal((prev) => (prev ? `${prev} ${text.trim()}` : text.trim()));
      }
    } else {
      const started = await speechService.startListening(settings?.language || 'en-US', {
        onStart: () => setIsDictating(true),
        onResult: (text, isFinal) => {
          if (isFinal && text.trim()) {
            setJournal((prev) => (prev ? `${prev} ${text.trim()}` : text.trim()));
          }
        },
        onError: () => setIsDictating(false),
        onEnd: () => setIsDictating(false),
      });
      if (!started) setIsDictating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (sleepHours < 0 || sleepHours > 24) {
      alert('Please enter a valid sleep duration between 0 and 24 hours.');
      return;
    }

    setIsSubmitting(true);

    const checkInPayload: DailyCheckIn = {
      date,
      time,
      timestamp: new Date(`${date}T${time}`).getTime() || Date.now(),
      mood,
      sleepHours: Number(sleepHours),
      energy,
      stress,
      workload,
      journal,
      tasks,
    };

    try {
      // 1. Generate real-time AI Reflection
      const aiResponse = await generateCheckInReflection(checkInPayload, checkIns, settings);
      checkInPayload.aiReflection = aiResponse.reflection;
      checkInPayload.aiSuggestedActions = aiResponse.suggestedActions;
      checkInPayload.tags = aiResponse.tags;

      setGeneratedReflection(aiResponse.reflection);
      setGeneratedActions(aiResponse.suggestedActions);

      // 2. Persist to IndexedDB
      if (editingId) {
        await db.checkIns.put({ ...checkInPayload, id: editingId });
      } else {
        await db.checkIns.add(checkInPayload);
      }

      // 3. Play chime & trigger celebration
      speechService.playChime('complete');
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#06b6d4', '#14b8a6', '#8b5cf6'],
      });

      onCheckInSaved();
    } catch (err) {
      console.error('Error saving check-in:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setDate(todayStr);
    setTime(timeStr);
    setMood(4);
    setSleepHours(7.5);
    setEnergy(4);
    setStress(4);
    setWorkload('medium');
    setJournal('');
    setTasks([]);
    setGeneratedReflection(null);
    setGeneratedActions([]);
  };

  const moodOptions: { value: MoodRating; label: string; icon: string; desc: string }[] = [
    { value: 1, label: 'Drained', icon: '😔', desc: 'Overwhelmed or low spirits' },
    { value: 2, label: 'Sluggish', icon: '😐', desc: 'Struggling to find drive' },
    { value: 3, label: 'Balanced', icon: '🙂', desc: 'Neutral, stable rhythm' },
    { value: 4, label: 'Good', icon: '😊', desc: 'Positive and engaged' },
    { value: 5, label: 'Radiant', icon: '✨', desc: 'Energized and vibrant' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-2">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Daily Student Reflection</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          {editingId ? 'Edit Check-in Entry' : 'Daily Pattern Check-in'}
        </h1>
        <p className="mt-1 text-sm text-slate-300">
          Record your day honestly. Mind Mirror analyzes the connections between your sleep, stress, and workload to suggest practical micro-steps.
        </p>
      </div>

      {/* Local-First Privacy Notice */}
      <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900/80 border border-cyan-500/20 text-xs text-slate-300 backdrop-blur-md">
        <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0" />
        <span>
          <strong className="text-white">Local-First Storage Guarantee:</strong> Your check-in records are saved exclusively to your browser's IndexedDB. If an external AI API key is configured, only the text you submit in this form is transmitted securely to generate reflections.
        </span>
      </div>

      {/* Main Check-in Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-3xl bg-slate-900/60 border border-cyan-500/20 p-6 md:p-8 backdrop-blur-xl space-y-6">
          {/* Date & Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-slate-800">
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-300 mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>Date</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-300 mb-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Time</span>
              </label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* 1. Mood Rating */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-white">1. How was your overall mood today?</label>
              <span className="text-xs text-cyan-400 font-semibold">{moodOptions.find((m) => m.value === mood)?.label}</span>
            </div>
            <div className="grid grid-cols-5 gap-2 sm:gap-3">
              {moodOptions.map((opt) => {
                const isSelected = mood === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMood(opt.value)}
                    className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-lg shadow-cyan-500/20 scale-[1.02]'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-2xl sm:text-3xl mb-1">{opt.icon}</span>
                    <span className="text-xs font-semibold">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Sleep Duration */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-semibold text-white">
                <Moon className="w-4 h-4 text-teal-400" />
                <span>2. Sleep Duration (Last Night)</span>
              </label>
              <span className="text-sm font-bold text-teal-400">{sleepHours} hours</span>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="14"
                step="0.5"
                value={sleepHours}
                onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                className="w-full accent-teal-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <input
                type="number"
                min="0"
                max="24"
                step="0.1"
                value={sleepHours}
                onChange={(e) => setSleepHours(parseFloat(e.target.value) || 0)}
                className="w-20 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-center text-sm font-bold text-white focus:outline-none focus:border-teal-500"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Optimal student restorative range is typically 7.0 to 8.5 hours for memory consolidation.
            </p>
          </div>

          {/* 3. Energy Rating (1-5) */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-semibold text-white">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>3. Daily Energy Rating</span>
              </label>
              <span className="text-sm font-bold text-amber-400">{energy} / 5</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((lvl) => {
                const labels = ['', 'Drained', 'Low', 'Moderate', 'High', 'Energized'];
                const isSelected = energy === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setEnergy(lvl as EnergyRating)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md shadow-amber-500/20'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div>{lvl}</div>
                    <div className="text-[10px] font-normal text-slate-400">{labels[lvl]}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Stress Rating (1-10) */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-semibold text-white">
                <Activity className="w-4 h-4 text-rose-400" />
                <span>4. Perceived Stress Level (1-10)</span>
              </label>
              <span className={`text-sm font-bold ${stress >= 7 ? 'text-rose-400' : 'text-slate-200'}`}>
                {stress} / 10
              </span>
            </div>
            <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                const isSelected = stress === num;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setStress(num as StressRating)}
                    className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                      isSelected
                        ? num >= 7
                          ? 'bg-rose-600/30 border-rose-500 text-rose-300 shadow-sm shadow-rose-500/30 scale-105'
                          : 'bg-cyan-600/30 border-cyan-400 text-cyan-300 shadow-sm shadow-cyan-500/30 scale-105'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-medium">
              <span>1 = Completely Relaxed</span>
              <span>5 = Manageable Arousal</span>
              <span>10 = Overwhelmed</span>
            </div>
          </div>

          {/* 5. Academic Workload */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-semibold text-white">
                <Briefcase className="w-4 h-4 text-violet-400" />
                <span>5. Academic Workload Intensity</span>
              </label>
              <span className="text-xs text-violet-400 font-semibold uppercase">{workload}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {(['low', 'medium', 'high'] as WorkloadLevel[]).map((lvl) => {
                const isSelected = workload === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setWorkload(lvl)}
                    className={`py-3 rounded-2xl border text-xs font-bold capitalize transition-all ${
                      isSelected
                        ? 'bg-violet-600/20 border-violet-400 text-violet-200 shadow-lg shadow-violet-500/20'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. Journal Entry with Voice Dictation */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-semibold text-white">
                <span>6. Personal Reflection & Journal</span>
                <span className="text-xs text-slate-400 font-normal">(Optional)</span>
              </label>

              {voiceSupported && (
                <button
                  type="button"
                  onClick={toggleVoiceDictation}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    isDictating
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30'
                  }`}
                >
                  {isDictating ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  <span>{isDictating ? 'Dictating...' : 'Voice Dictate'}</span>
                </button>
              )}
            </div>

            <textarea
              rows={4}
              value={journal}
              onChange={(e) => setJournal(e.target.value)}
              placeholder="What challenged or inspired you today? (e.g., 'Stayed up late studying for midterm, drank 2 energy drinks and had trouble falling asleep...')"
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-3.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 leading-relaxed"
            />
          </div>

          {/* 7. Optional Tasks & Deadlines */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <label className="flex items-center gap-2 text-sm font-semibold text-white">
              <span>7. Today's Academic Tasks & Deadlines</span>
              <span className="text-xs text-slate-400 font-normal">(Optional)</span>
            </label>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Assignment or study task title..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
              <input
                type="date"
                value={newTaskDeadline}
                onChange={(e) => setNewTaskDeadline(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={handleAddTask}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold flex items-center justify-center gap-1 border border-slate-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
            </div>

            {tasks.length > 0 && (
              <div className="space-y-2 mt-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs"
                  >
                    <span className="text-slate-200">{task.title}</span>
                    <div className="flex items-center gap-2">
                      {task.deadline && (
                        <span className="text-[11px] text-slate-400">Due: {task.deadline}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveTask(task.id)}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-800">
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel Edit
              </button>
            ) : (
              <span className="text-xs text-slate-500">Inputs are strictly validated.</span>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-500 to-cyan-400 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? 'Analyzing & Saving...' : editingId ? 'Update Check-in' : 'Save Daily Check-in'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Generated AI Reflection Banner (if available) */}
      {generatedReflection && (
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/60 border border-cyan-500/30 p-6 backdrop-blur-xl animate-fadeIn space-y-4">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold">
            <Sparkles className="w-4 h-4" />
            <span>AI Reflection & Personal Insight</span>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed italic">
            "{generatedReflection}"
          </p>

          {generatedActions.length > 0 && (
            <div className="pt-3 border-t border-slate-800">
              <p className="text-xs font-semibold text-teal-400 uppercase tracking-wider mb-2">Suggested Micro-Actions:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {generatedActions.map((act, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-teal-500/20 text-xs text-slate-300">
                    <Check className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                    <span>{act}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Check-in History Management (Edit & Delete) */}
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 backdrop-blur-xl space-y-4">
        <h3 className="text-base font-bold text-white">Your Check-in History ({checkIns.length} Records)</h3>

        {checkIns.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">No check-in entries yet. Save your first entry above!</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {checkIns.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="text-xl">
                    {['', '😔', '😐', '🙂', '😊', '✨'][item.mood]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{item.date}</span>
                      <span className="text-[11px] text-slate-400">{item.time}</span>
                      <Badge variant="teal" size="sm">{item.sleepHours}h Sleep</Badge>
                      <Badge variant="amber" size="sm">{item.energy}/5 Energy</Badge>
                      <Badge variant="rose" size="sm">{item.stress}/10 Stress</Badge>
                    </div>
                    {item.journal && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1 italic">
                        "{item.journal}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditEntry(item)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-colors"
                    title="Edit entry"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteEntry(item.id)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Delete entry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
