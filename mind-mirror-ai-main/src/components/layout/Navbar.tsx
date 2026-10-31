import React from 'react';
import {
  Sparkles,
  LayoutDashboard,
  CalendarCheck,
  Bot,
  LineChart,
  ListTodo,
  Compass,
  ShieldCheck,
  PlusCircle,
  User,
  LogIn,
  Sun,
  Moon,
} from 'lucide-react';
import type { UserProfile, AppTheme, AppLanguage } from '../../types';
import { LANGUAGE_OPTIONS } from '../../services/speech';

export type NavTab =
  | 'dashboard'
  | 'companion'
  | 'studio'
  | 'checkin'
  | 'insights'
  | 'planner'
  | 'experiment'
  | 'profile'
  | 'settings'
  | 'login';

interface NavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  hasCheckedInToday: boolean;
  userProfile?: UserProfile;
  theme: AppTheme;
  onToggleTheme: () => void;
  currentLanguage: AppLanguage;
  onSelectLanguage: (lang: AppLanguage) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  hasCheckedInToday,
  userProfile,
  theme,
  onToggleTheme,
  currentLanguage,
  onSelectLanguage,
}) => {
  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'companion', label: 'Pluto 3D', icon: <Bot className="w-4 h-4" /> },
    { id: 'studio', label: 'Mind Studio', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'checkin', label: 'Check-in', icon: <CalendarCheck className="w-4 h-4" /> },
    { id: 'insights', label: 'Insights', icon: <LineChart className="w-4 h-4" /> },
    { id: 'planner', label: 'Action Planner', icon: <ListTodo className="w-4 h-4" /> },
    { id: 'experiment', label: '7-Day Challenge', icon: <Compass className="w-4 h-4" /> },
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-cyan-500/20 bg-slate-950/90 dark:bg-slate-950/90 light:bg-white/95 backdrop-blur-2xl transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Tagline */}
          <div
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-teal-500 to-violet-600 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-shadow">
              <div className="w-full h-full bg-slate-950 dark:bg-slate-950 light:bg-white rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-cyan-400 group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg bg-gradient-to-r from-white via-cyan-100 to-cyan-300 dark:from-white dark:via-cyan-100 dark:to-cyan-300 light:from-slate-900 light:via-cyan-900 light:to-cyan-700 bg-clip-text text-transparent tracking-tight">
                  Mind Mirror
                </span>
                <span className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-500/30">
                  AI
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-slate-400 dark:text-slate-400 light:text-slate-500 font-normal">
                Reflect with Pluto • Understand Your Patterns • Take Next Step
              </p>
            </div>
          </div>

          {/* Nav Items (Desktop) */}
          <nav className="hidden xl:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 dark:text-cyan-300 light:text-cyan-700 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                      : 'text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-950 hover:bg-slate-900/60 light:hover:bg-slate-100'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-2">
            {/* Language Selector Dropdown / Quick Switch */}
            <div className="relative flex items-center">
              <label htmlFor="nav-lang-select" className="sr-only">Select Language</label>
              <select
                id="nav-lang-select"
                aria-label="Language selection"
                value={currentLanguage}
                onChange={(e) => onSelectLanguage(e.target.value as AppLanguage)}
                className="bg-slate-900/90 dark:bg-slate-900/90 light:bg-slate-100 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 dark:text-slate-200 light:text-slate-800 font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.flag} {opt.label} ({opt.nativeName})
                  </option>
                ))}
              </select>
            </div>

            {/* Theme Toggle (Light & Dark) */}
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl bg-slate-900/90 dark:bg-slate-900/90 light:bg-slate-100 border border-slate-700/80 text-slate-300 dark:text-slate-300 light:text-slate-700 hover:text-cyan-400 transition-colors cursor-pointer"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-cyan-600" />
              )}
            </button>

            {/* User Details Pill */}
            {userProfile?.isLoggedIn ? (
              <button
                onClick={() => onSelectTab('profile')}
                className={`flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all cursor-pointer ${
                  activeTab === 'profile'
                    ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-md'
                    : 'bg-slate-900/80 dark:bg-slate-900/80 light:bg-slate-100 border-slate-800 dark:border-slate-800 light:border-slate-300 text-slate-300 dark:text-slate-300 light:text-slate-700 hover:border-slate-700'
                }`}
                title="View Student Profile"
              >
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-xs font-black text-slate-950">
                  {userProfile.fullName ? userProfile.fullName[0].toUpperCase() : 'U'}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold leading-tight">{userProfile.fullName.split(' ')[0]}</div>
                </div>
              </button>
            ) : (
              <button
                onClick={() => onSelectTab('login')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5 text-cyan-400" />
                <span>Sign In</span>
              </button>
            )}

            {/* Quick Check-in Trigger */}
            <button
              onClick={() => onSelectTab('checkin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                hasCheckedInToday
                  ? 'bg-slate-900 dark:bg-slate-900 light:bg-slate-200 text-teal-300 dark:text-teal-300 light:text-teal-700 border border-teal-500/30 hover:bg-slate-800'
                  : 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 hover:brightness-110 shadow-md shadow-cyan-500/20 animate-pulse'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{hasCheckedInToday ? 'Today Logged' : 'Daily Check-in'}</span>
            </button>
          </div>
        </div>

        {/* Sub-Navigation Bar (Mobile & Smaller screens) */}
        <div className="xl:hidden flex items-center gap-1 overflow-x-auto py-2 border-t border-slate-900 dark:border-slate-900 light:border-slate-200 no-scrollbar">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 dark:text-cyan-300 light:text-cyan-700 border border-cyan-500/30'
                    : 'text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-slate-200 light:hover:text-slate-900'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
