import React, { useState } from 'react';
import {
  ShieldCheck,
  Globe,
  Database,
  Download,
  Upload,
  RotateCcw,
  Volume2,
  Check,
  Play,
  HeartHandshake,
  Bot,
  Sun,
  Moon,
  Cpu,
} from 'lucide-react';
import type { UserSettings, AppTheme, AppLanguage } from '../types';
import {
  updateSettings,
  exportDatabaseJSON,
  importDatabaseJSON,
  resetDatabase,
} from '../services/db';
import { LANGUAGE_OPTIONS } from '../services/speech';
import confetti from 'canvas-confetti';

interface SettingsViewProps {
  settings: UserSettings;
  onSettingsChanged: () => void;
  onSeedDemoData: () => void;
  onThemeChanged?: (theme: AppTheme) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSettingsChanged,
  onSeedDemoData,
  onThemeChanged,
}) => {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [theme, setTheme] = useState<AppTheme>(settings.theme || 'dark');
  const [language, setLanguage] = useState<AppLanguage>(
    (settings.language as AppLanguage) || 'en-US'
  );
  const [ttsSpeed, setTtsSpeed] = useState(settings.ttsSpeed || 1.0);
  const [avatarModel, setAvatarModel] = useState(settings.avatarModel || 'realistic_pluto');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      theme,
      language,
      ttsSpeed,
      avatarModel,
    });
    onThemeChanged?.(theme);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    onSettingsChanged();
  };

  const handleToggleTheme = async (newTheme: AppTheme) => {
    setTheme(newTheme);
    await updateSettings({ theme: newTheme });
    onThemeChanged?.(newTheme);
    onSettingsChanged();
  };

  const handleExportData = async () => {
    const jsonStr = await exportDatabaseJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mind-mirror-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const res = await importDatabaseJSON(content);
      setImportStatus(res.message);
      if (res.success) {
        confetti({ particleCount: 40, spread: 50 });
        onSettingsChanged();
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = async () => {
    await resetDatabase();
    setShowResetConfirm(false);
    setImportStatus('All local database records have been reset to a fresh state.');
    onSettingsChanged();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Application Settings & Preferences</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white dark:text-white light:text-slate-900 tracking-tight">
          Themes, Language & System Settings
        </h1>
        <p className="mt-1 text-sm text-slate-300 dark:text-slate-300 light:text-slate-600">
          Customize Pluto's appearance, choose between Light and Dark themes, switch languages, or manage your personal study records.
        </p>
      </div>

      {/* Theme Preference Card (Requirement 9: Exactly two themes: Light and Dark) */}
      <div className="rounded-3xl bg-slate-900/70 dark:bg-slate-900/70 light:bg-white/90 border border-cyan-500/25 p-6 md:p-8 backdrop-blur-xl shadow-xl space-y-4">
        <div>
          <h3 className="text-base font-bold text-white dark:text-white light:text-slate-900 flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-400" />
            <span>Theme Appearance (Light & Dark)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Choose your preferred workspace aesthetic. Both themes maintain high visual contrast and vibrant Pluto 3D rendering.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Dark Theme Option */}
          <button
            type="button"
            onClick={() => handleToggleTheme('dark')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-950 border-cyan-400 text-white shadow-lg shadow-cyan-500/15 ring-2 ring-cyan-500/30'
                : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 font-bold text-sm text-cyan-300">
                <Moon className="w-4 h-4 text-cyan-400" />
                <span>Cosmic Dark Theme</span>
              </div>
              {theme === 'dark' && <Check className="w-4 h-4 text-cyan-400" />}
            </div>
            <p className="text-xs text-slate-400">
              Deep midnight celestial background (#070b14) with glowing cyan, teal, and violet accents.
            </p>
          </button>

          {/* Light Theme Option */}
          <button
            type="button"
            onClick={() => handleToggleTheme('light')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              theme === 'light'
                ? 'bg-slate-100 border-cyan-500 text-slate-900 shadow-lg shadow-cyan-500/15 ring-2 ring-cyan-500/30'
                : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Modern Light Theme</span>
              </div>
              {theme === 'light' && <Check className="w-4 h-4 text-cyan-600" />}
            </div>
            <p className="text-xs text-slate-500">
              Clean, bright glass workspace (#f8fafc) with crisp typography and soft shadows.
            </p>
          </button>
        </div>
      </div>

      {/* AI Intelligence Architecture Card */}
      <div className="rounded-3xl bg-slate-900/70 dark:bg-slate-900/70 light:bg-white/90 border border-teal-500/25 p-6 md:p-8 backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-teal-950/80 border border-teal-500/30 text-teal-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white dark:text-white light:text-slate-900">
              Google Gemini Server-Side Integration
            </h3>
            <p className="text-xs text-slate-400">Secure backend proxy routing with no client-exposed keys</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-300">Pluto 3D Intelligence:</span>
            <span className="font-mono text-cyan-400 font-semibold">gemini-3.8-flash</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-300">Mind Canvas Image Studio:</span>
            <span className="font-mono text-teal-400 font-semibold">gemini-3.1-flash-lite-image</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-300">Meditation Video Studio:</span>
            <span className="font-mono text-violet-400 font-semibold">gemini-omni-1.1-flash</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-300">Soundscape & Lyria Music:</span>
            <span className="font-mono text-emerald-400 font-semibold">lyria-3-clip-preview</span>
          </div>
        </div>
      </div>

      {/* Language & Voice Settings Form */}
      <div className="rounded-3xl bg-slate-900/70 dark:bg-slate-900/70 light:bg-white/90 border border-slate-800 p-6 md:p-8 backdrop-blur-xl shadow-xl space-y-6">
        <div>
          <h3 className="text-base font-bold text-white dark:text-white light:text-slate-900 flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span>Companion Language & Voice Preferences</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Pluto fluently speaks and understands English, Hindi, and Kannada with natural speech recognition and female voice synthesis.
          </p>
        </div>

        <form onSubmit={handleSavePreferences} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Language Selection */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-1.5">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>Primary Language</span>
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as AppLanguage)}
                className="w-full bg-slate-950 dark:bg-slate-950 light:bg-slate-100 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white dark:text-white light:text-slate-900 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.flag} {opt.label} ({opt.nativeName})
                  </option>
                ))}
              </select>
            </div>

            {/* TTS Speed */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-1.5">
                <Volume2 className="w-3.5 h-3.5 text-teal-400" />
                <span>Text-to-Speech Speed ({ttsSpeed}x)</span>
              </label>
              <input
                type="range"
                min="0.8"
                max="1.2"
                step="0.05"
                value={ttsSpeed}
                onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
                className="w-full accent-teal-400 h-2 bg-slate-800 rounded-lg cursor-pointer mt-3"
              />
            </div>
          </div>

          {/* 3D Avatar Model Selection */}
          <div className="pt-4 border-t border-slate-800">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2">
              <Bot className="w-3.5 h-3.5 text-violet-400" />
              <span>3D AI Companion Avatar Mode</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAvatarModel('realistic_pluto')}
                className={`p-3.5 rounded-2xl border text-xs font-semibold transition-all text-left cursor-pointer ${
                  avatarModel === 'realistic_pluto'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div className="font-bold text-white flex items-center gap-2">
                  <span>Realistic Female Avatar (Pluto)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">Default</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  ReadyPlayerMe model with 72 facial morph targets, realistic lip-sync, and head tracking.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAvatarModel('stylized_human')}
                className={`p-3.5 rounded-2xl border text-xs font-semibold transition-all text-left cursor-pointer ${
                  avatarModel === 'stylized_human'
                    ? 'bg-violet-500/20 border-violet-400 text-violet-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div className="font-bold text-white">Stylized Cyber Humanoid</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Procedural cybernetic mesh with glowing neon halo and eye blinking.
                </div>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            {saveSuccess ? (
              <span className="flex items-center gap-1.5 text-xs text-teal-400 font-semibold">
                <Check className="w-4 h-4" />
                <span>Preferences saved successfully!</span>
              </span>
            ) : (
              <span className="text-[11px] text-slate-500">Changes apply immediately across all tabs.</span>
            )}

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              Save Preferences
            </button>
          </div>
        </form>
      </div>

      {/* Database Management & Demo Data Seeder */}
      <div className="rounded-3xl bg-slate-900/70 dark:bg-slate-900/70 light:bg-white/90 border border-slate-800 p-6 md:p-8 backdrop-blur-xl shadow-xl space-y-6">
        <div>
          <h3 className="text-base font-bold text-white dark:text-white light:text-slate-900 flex items-center gap-2">
            <Database className="w-4 h-4 text-violet-400" />
            <span>Data Management & Hackathon Demonstration Tools</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Pre-seed realistic data for judging, or export/import your personal reflection records.
          </p>
        </div>

        {/* 1-Click Realistic Student Data Seeder */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-violet-950/30 border border-violet-500/30">
          <div>
            <h4 className="text-xs font-bold text-white">Seed Realistic 14-Day Student Data</h4>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Populates realistic exam crunch cycles, sleep variance, and journal reflections so all charts and correlations immediately showcase full capabilities.
            </p>
          </div>

          <button
            onClick={onSeedDemoData}
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Seed 14-Day Dataset</span>
          </button>
        </div>

        {/* Export and Import JSON */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <button
            onClick={handleExportData}
            className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Export Database (JSON Backup)</span>
          </button>

          <label className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-colors">
            <Upload className="w-4 h-4 text-teal-400" />
            <span>Import Database (JSON)</span>
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>
        </div>

        {importStatus && (
          <p className="text-xs text-center text-teal-400 bg-teal-950/40 p-2.5 rounded-xl border border-teal-500/30">
            {importStatus}
          </p>
        )}

        {/* Danger Zone: Reset Database */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h5 className="text-xs font-bold text-rose-400">Clear All Local Records</h5>
            <p className="text-[11px] text-slate-500">Permanently erases all check-ins, tasks, and reflections.</p>
          </div>

          {showResetConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-rose-300 font-semibold">Are you sure?</span>
              <button
                type="button"
                onClick={handleResetData}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Yes, Reset
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 font-semibold text-xs transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Database</span>
            </button>
          )}
        </div>
      </div>

      {/* Ethical & Medical Disclaimer Card */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-400 text-xs">
        <HeartHandshake className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed text-[11px]">
          <strong>Notice:</strong> Mind Mirror AI is designed for student wellness self-reflection and academic habit awareness. It does not provide medical diagnoses, psychiatric assessments, or clinical interventions. If you are experiencing acute psychological distress, please connect with your institution’s counseling center or healthcare provider.
        </p>
      </div>
    </div>
  );
};
