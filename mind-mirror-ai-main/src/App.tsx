import { useState, useEffect, useCallback } from 'react';
import type {
  DailyCheckIn,
  ActionTask,
  ExperimentDay,
  UserSettings,
  UserProfile,
  AppTheme,
  AppLanguage,
} from './types';
import {
  db,
  getSettings,
  updateSettings,
  initExperimentDays,
  seedRealisticDemoData,
  getUserProfile,
  DEFAULT_SETTINGS,
  DEFAULT_USER_PROFILE,
} from './services/db';
import { Navbar, type NavTab } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { SpaceBackground3D } from './components/companion/SpaceBackground3D';
import { DashboardView } from './views/DashboardView';
import { CheckInView } from './views/CheckInView';
import { InsightsView } from './views/InsightsView';
import { CompanionView } from './views/CompanionView';
import { PlannerView } from './views/PlannerView';
import { ExperimentView } from './views/ExperimentView';
import { ProfileView } from './views/ProfileView';
import { LoginView } from './views/LoginView';
import { SettingsView } from './views/SettingsView';
import { StudioView } from './views/StudioView';
import confetti from 'canvas-confetti';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [checkIns, setCheckIns] = useState<DailyCheckIn[]>([]);
  const [tasks, setTasks] = useState<ActionTask[]>([]);
  const [experimentDays, setExperimentDays] = useState<ExperimentDay[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [theme, setTheme] = useState<AppTheme>(() => {
    const saved = localStorage.getItem('mm_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 4500);
  };

  // Sync theme with HTML root class
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('mm_theme', theme);
  }, [theme]);

  // Load all data from IndexedDB
  const reloadData = useCallback(async () => {
    try {
      const loadedSettings = await getSettings();
      setSettings(loadedSettings);
      if (loadedSettings.theme && (loadedSettings.theme === 'light' || loadedSettings.theme === 'dark')) {
        setTheme(loadedSettings.theme);
      }

      const loadedProfile = await getUserProfile();
      setUserProfile(loadedProfile);

      const loadedExperimentDays = await initExperimentDays();
      setExperimentDays(loadedExperimentDays);

      const loadedCheckIns = await db.checkIns.orderBy('timestamp').reverse().toArray();
      setCheckIns(loadedCheckIns);

      const loadedTasks = await db.actionTasks.orderBy('createdAt').reverse().toArray();
      setTasks(loadedTasks);
    } catch (err) {
      console.error('Failed to load database records:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  const handleToggleTheme = () => {
    const nextTheme: AppTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    updateSettings({ theme: nextTheme });
  };

  const handleSelectLanguage = (newLang: AppLanguage) => {
    setSettings((prev) => ({ ...prev, language: newLang }));
    updateSettings({ language: newLang });
    const langNames = {
      'en-US': 'English',
      'hi-IN': 'हिन्दी (Hindi)',
      'kn-IN': 'ಕನ್ನಡ (Kannada)',
    };
    showToast(`Switched companion language to ${langNames[newLang]}`);
  };

  // Check if user has already checked in today
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCheckIn = checkIns.find((c) => c.date === todayStr);

  const handleSeedDemoData = async () => {
    setIsLoading(true);
    await seedRealisticDemoData();
    await reloadData();
    confetti({
      particleCount: 60,
      spread: 70,
      colors: ['#06b6d4', '#14b8a6', '#8b5cf6'],
    });
    showToast('14 Days of realistic student data loaded successfully! You can explore all correlations, Pluto 3D, and insights.');
  };

  const handleAddTaskFromCompanion = async (title: string) => {
    const newTask: ActionTask = {
      title,
      category: 'productivity',
      priority: 'high',
      completed: false,
      origin: 'ai_suggested',
      createdAt: Date.now(),
    };
    await db.actionTasks.add(newTask);
    await reloadData();
    showToast(`Added micro-action to your Action Planner: "${title}"`);
  };

  const handleLogout = () => {
    setUserProfile((prev) => ({ ...prev, isLoggedIn: false }));
    setActiveTab('login');
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setUserProfile(user);
    setActiveTab('dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center gap-4 text-cyan-400">
        <div className="w-12 h-12 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
        <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Loading Mind Mirror AI & Pluto 3D...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-[#070b14] dark:bg-[#070b14] light:bg-[#f8fafc] text-slate-100 dark:text-slate-100 light:text-slate-800 selection:bg-cyan-500 selection:text-slate-950 overflow-x-hidden transition-colors duration-200">
      {/* Interactive 3D Cosmic Celestial Background Canvas */}
      <SpaceBackground3D />

      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        hasCheckedInToday={!!todayCheckIn}
        userProfile={userProfile}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        currentLanguage={settings.language || 'en-US'}
        onSelectLanguage={handleSelectLanguage}
      />

      {/* Main Multi-Page Container */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {activeTab === 'login' && (
          <LoginView onLoginSuccess={handleLoginSuccess} />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            userProfile={userProfile}
            checkIns={checkIns}
            onProfileUpdated={(updated) => setUserProfile(updated)}
            onLogout={handleLogout}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            checkIns={checkIns}
            todayCheckIn={todayCheckIn}
            experimentDays={experimentDays}
            tasks={tasks}
            userProfile={userProfile}
            onNavigate={(tab) => {
              setActiveTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSeedDemoData={handleSeedDemoData}
          />
        )}

        {activeTab === 'companion' && (
          <CompanionView
            latestCheckIn={todayCheckIn || checkIns[0]}
            settings={settings}
            userProfile={userProfile}
            onAddTaskToPlanner={handleAddTaskFromCompanion}
            onSelectLanguage={handleSelectLanguage}
          />
        )}

        {activeTab === 'studio' && (
          <StudioView onNotify={showToast} />
        )}

        {activeTab === 'checkin' && (
          <CheckInView
            checkIns={checkIns}
            onCheckInSaved={reloadData}
            settings={settings}
          />
        )}

        {activeTab === 'insights' && (
          <InsightsView checkIns={checkIns} />
        )}

        {activeTab === 'planner' && (
          <PlannerView
            tasks={tasks}
            onTasksChanged={reloadData}
          />
        )}

        {activeTab === 'experiment' && (
          <ExperimentView
            experimentDays={experimentDays}
            onExperimentUpdated={reloadData}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            onSettingsChanged={reloadData}
            onSeedDemoData={handleSeedDemoData}
            onThemeChanged={(newTheme) => setTheme(newTheme)}
          />
        )}
      </main>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <aside
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900/95 dark:bg-slate-900/95 light:bg-white/95 border border-cyan-500/40 text-cyan-200 dark:text-cyan-200 light:text-cyan-900 px-4 py-3 rounded-2xl shadow-xl shadow-cyan-950/50 backdrop-blur-md flex items-center justify-between gap-3 text-xs animate-fadeIn"
        >
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white dark:hover:text-white light:hover:text-black font-bold px-1.5 py-0.5 rounded cursor-pointer"
            aria-label="Close notification"
          >
            ×
          </button>
        </aside>
      )}

      {/* Footer with Ethical Disclaimers */}
      <Footer />
    </div>
  );
}

export default App;
