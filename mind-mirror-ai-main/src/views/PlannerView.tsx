import React, { useState, useEffect } from 'react';
import {
  ListTodo,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';
import type { ActionTask } from '../types';
import { db } from '../services/db';
import { Badge } from '../components/ui/Badge';
import { speechService } from '../services/speech';
import confetti from 'canvas-confetti';

interface PlannerViewProps {
  tasks: ActionTask[];
  onTasksChanged: () => void;
}

export const PlannerView: React.FC<PlannerViewProps> = ({ tasks, onTasksChanged }) => {
  // Task Creation Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ActionTask['category']>('academic');
  const [priority, setPriority] = useState<ActionTask['priority']>('medium');
  const [dueDate, setDueDate] = useState('');

  // Pomodoro Timer State
  const [timerMode, setTimerMode] = useState<'focus' | 'shortBreak' | 'longBreak'>('focus');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);

  // Filter state
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed'>('all');
  const [timerBanner, setTimerBanner] = useState<string | null>(null);

  // Pomodoro countdown effect
  useEffect(() => {
    let interval: any = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      setIsRunning(false);
      speechService.playChime('complete');
      if (timerMode === 'focus') {
        setSessionsCompleted((s) => s + 1);
        confetti({ particleCount: 40, spread: 50 });
        setTimerBanner('🎉 Focus sprint complete! Take a relaxing 5-minute breather.');
        setTimerMode('shortBreak');
        setTimeLeft(5 * 60);
      } else {
        setTimerBanner('✨ Break finished! Ready for your next deep focus sprint?');
        setTimerMode('focus');
        setTimeLeft(25 * 60);
      }
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, timerMode]);

  const handleSetTimerMode = (mode: 'focus' | 'shortBreak' | 'longBreak') => {
    setIsRunning(false);
    setTimerMode(mode);
    if (mode === 'focus') setTimeLeft(25 * 60);
    else if (mode === 'shortBreak') setTimeLeft(5 * 60);
    else setTimeLeft(15 * 60);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTask: ActionTask = {
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      priority,
      completed: false,
      dueDate: dueDate || undefined,
      origin: 'manual',
      createdAt: Date.now(),
    };

    await db.actionTasks.add(newTask);
    setTitle('');
    setDescription('');
    setDueDate('');
    onTasksChanged();
  };

  const handleToggleTask = async (task: ActionTask) => {
    if (!task.id) return;
    const completed = !task.completed;
    await db.actionTasks.update(task.id, {
      completed,
      completedAt: completed ? Date.now() : undefined,
    });

    if (completed) {
      speechService.playChime('complete');
      confetti({ particleCount: 35, spread: 50, origin: { y: 0.7 } });
    }
    onTasksChanged();
  };

  const handleDeleteTask = async (id?: number) => {
    if (!id) return;
    await db.actionTasks.delete(id);
    onTasksChanged();
  };

  const filteredTasks = tasks.filter((t) => {
    if (activeTab === 'pending') return !t.completed;
    if (activeTab === 'completed') return t.completed;
    return true;
  });

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-2">
          <ListTodo className="w-3.5 h-3.5" />
          <span>Student Productivity & Action Center</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          Action Planner & Focus Station
        </h1>
        <p className="mt-1 text-sm text-slate-300">
          Transform reflection insights into intentional, realistic study sprints without burnout.
        </p>
      </div>

      {/* Top Section: Pomodoro Focus Timer Card */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 border border-cyan-500/20 p-6 md:p-8 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
        <div className="space-y-3 text-center md:text-left max-w-md">
          <Badge variant="cyan" size="sm">Pomodoro Focus Engine</Badge>
          <h2 className="text-xl font-bold text-white">Deep Work Study Sprint</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Short, focused sprints prevent cognitive fatigue and reduce task resistance. Put your phone on silent and focus on a single assignment.
          </p>

          <div className="flex items-center justify-center md:justify-start gap-2 pt-2">
            <span className="text-xs text-slate-400 font-medium">Sprints completed today:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/30 text-cyan-300 font-bold text-xs">
              {sessionsCompleted} Sprints
            </span>
          </div>
        </div>

        {/* Timer Controls Box */}
        <div className="flex flex-col items-center p-6 rounded-2xl bg-slate-950/80 border border-slate-800 backdrop-blur-md shadow-2xl min-w-[280px]">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs mb-5">
            <button
              onClick={() => handleSetTimerMode('focus')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                timerMode === 'focus' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400'
              }`}
            >
              Focus 25m
            </button>
            <button
              onClick={() => handleSetTimerMode('shortBreak')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                timerMode === 'shortBreak' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'text-slate-400'
              }`}
            >
              Short Break 5m
            </button>
            <button
              onClick={() => handleSetTimerMode('longBreak')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                timerMode === 'longBreak' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'text-slate-400'
              }`}
            >
              Long 15m
            </button>
          </div>

          {/* Time digits */}
          <div className="text-5xl font-mono font-extrabold tracking-wider bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent my-2">
            {formatTimer(timeLeft)}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold text-sm hover:brightness-110 shadow-lg shadow-cyan-500/25 transition-all"
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isRunning ? 'Pause' : 'Start Focus'}</span>
            </button>

            <button
              onClick={() => {
                setIsRunning(false);
                handleSetTimerMode(timerMode);
              }}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
              title="Reset timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {timerBanner && (
            <div className="mt-3 text-xs font-medium text-teal-300 bg-teal-950/60 border border-teal-500/30 px-3 py-1.5 rounded-xl text-center flex items-center justify-between gap-2">
              <span>{timerBanner}</span>
              <button
                onClick={() => setTimerBanner(null)}
                className="text-slate-400 hover:text-white"
                aria-label="Dismiss banner"
              >
                ×
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Create Task Form & Task List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Create Task Form */}
        <div className="lg:col-span-5 rounded-3xl bg-slate-900/60 border border-cyan-500/20 p-6 backdrop-blur-xl h-fit space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-cyan-400" />
            <span>Add Action Item</span>
          </h3>

          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">Task Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Draft outline for History essay"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">Description or Micro-Step</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., 20 mins to write 3 paragraphs..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="academic">Academic</option>
                  <option value="wellness">Wellness</option>
                  <option value="sleep">Sleep Routine</option>
                  <option value="mindfulness">Mindfulness</option>
                  <option value="productivity">Productivity</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">Target Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              Add to Action Planner
            </button>
          </form>
        </div>

        {/* Task List */}
        <div className="lg:col-span-7 rounded-3xl bg-slate-900/60 border border-slate-800 p-6 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-base font-bold text-white">
              Action Plan ({tasks.filter((t) => !t.completed).length} Pending)
            </h3>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  activeTab === 'all' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  activeTab === 'pending' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  activeTab === 'completed' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'
                }`}
              >
                Completed
              </button>
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">
              No tasks found in this view.
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-start justify-between p-3.5 rounded-2xl border transition-all ${
                    task.completed
                      ? 'bg-slate-950/40 border-slate-800/50 opacity-60'
                      : 'bg-slate-950/80 border-slate-800 hover:border-cyan-500/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleToggleTask(task)}
                      className="mt-0.5 text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      {task.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-teal-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-500" />
                      )}
                    </button>

                    <div>
                      <p
                        className={`text-xs font-semibold ${
                          task.completed ? 'line-through text-slate-500' : 'text-slate-200'
                        }`}
                      >
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-[11px] text-slate-400 mt-0.5">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="teal" size="sm">{task.category}</Badge>
                        <Badge
                          variant={
                            task.priority === 'high' ? 'rose' : task.priority === 'medium' ? 'amber' : 'slate'
                          }
                          size="sm"
                        >
                          {task.priority}
                        </Badge>
                        {task.origin === 'ai_suggested' && (
                          <Badge variant="violet" size="sm">AI Suggested</Badge>
                        )}
                        {task.dueDate && (
                          <span className="text-[10px] text-slate-400">Due: {task.dueDate}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
