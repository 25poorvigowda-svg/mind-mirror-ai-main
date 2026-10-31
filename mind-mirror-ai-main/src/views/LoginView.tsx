import React, { useState } from 'react';
import {
  Sparkles,
  Lock,
  Mail,
  User,
  GraduationCap,
  Building,
  Moon,
  Target,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import type { UserProfile } from '../types';
import { updateUserProfile, DEFAULT_USER_PROFILE } from '../services/db';
import confetti from 'canvas-confetti';

interface LoginViewProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('alex.rivera@berkeley.edu');
  const [password, setPassword] = useState('mindmirror123');
  const [fullName, setFullName] = useState('Alex Rivera');
  const [institution, setInstitution] = useState('University of California, Berkeley');
  const [major, setMajor] = useState('Cognitive Science & Computer Science');
  const [academicYear, setAcademicYear] = useState<UserProfile['academicYear']>('Junior');
  const [targetSleepHours, setTargetSleepHours] = useState(7.8);
  const [primaryGoal, setPrimaryGoal] = useState('Balance algorithmic study sprints with healthy restorative sleep');
  const [isLoading, setIsLoading] = useState(false);

  // 1-Click Demo Student Login
  const handleQuickDemoLogin = async () => {
    setIsLoading(true);
    const demoProfile: UserProfile = {
      ...DEFAULT_USER_PROFILE,
      isLoggedIn: true,
    };
    await updateUserProfile(demoProfile);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    setIsLoading(false);
    onLoginSuccess(demoProfile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const userProfile: UserProfile = {
      email,
      fullName: fullName || email.split('@')[0],
      institution: institution || 'University Campus',
      major: major || 'General Studies',
      academicYear,
      targetSleepHours: Number(targetSleepHours) || 7.5,
      primaryGoal: primaryGoal || 'Understand my daily patterns and build sustainable study rhythms',
      joinedDate: new Date().toISOString().split('T')[0],
      avatarColor: '#06b6d4',
      isLoggedIn: true,
    };

    await updateUserProfile(userProfile);
    confetti({ particleCount: 45, spread: 55, origin: { y: 0.7 } });
    setIsLoading(false);
    onLoginSuccess(userProfile);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 animate-fadeIn">
      <div className="relative w-full max-w-xl rounded-3xl bg-slate-900/80 border border-cyan-500/25 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-48 h-48 rounded-full bg-violet-500/15 blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 via-teal-500 to-violet-600 p-0.5 shadow-lg shadow-cyan-500/25 mb-3">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Mind Mirror AI
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Student Reflection & Productivity Portal with Pluto 3D
          </p>
        </div>

        {/* 1-Click Demo Login Banner (Perfect for Hackathon Judges) */}
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-violet-950/60 to-cyan-950/60 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="text-left">
            <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider bg-cyan-950/90 px-2 py-0.5 rounded-md border border-cyan-500/30">
              Instant Access
            </span>
            <h4 className="text-xs font-bold text-white mt-1">Explore as Alex Rivera (UC Berkeley)</h4>
            <p className="text-[11px] text-slate-300">Junior in Cognitive Science & Computer Science</p>
          </div>

          <button
            type="button"
            onClick={handleQuickDemoLogin}
            disabled={isLoading}
            className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:brightness-110 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <span>Demo Student Login</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tab Switcher: Sign In vs Sign Up */}
        <div className="flex rounded-xl bg-slate-950 border border-slate-800 p-1 mb-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setIsSignUp(false)}
            className={`flex-1 py-2 rounded-lg transition-colors ${
              !isSignUp ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setIsSignUp(true)}
            className={`flex-1 py-2 rounded-lg transition-colors ${
              isSignUp ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Register Student Profile
          </button>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {/* Email & Password */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              <span>University Email</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@university.edu"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Password</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Additional Student Details (shown when registering or editing) */}
          {isSignUp && (
            <div className="space-y-4 pt-3 border-t border-slate-800">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-teal-400" />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-teal-400" />
                    <span>University / College</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="e.g. UC Berkeley"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-violet-400" />
                    <span>Major / Field of Study</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    placeholder="e.g. Computer Science"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Academic Year</label>
                  <select
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Freshman">Freshman</option>
                    <option value="Sophomore">Sophomore</option>
                    <option value="Junior">Junior</option>
                    <option value="Senior">Senior</option>
                    <option value="Graduate">Graduate / Master's</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                    <Moon className="w-3.5 h-3.5 text-teal-400" />
                    <span>Target Sleep (Hours)</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="5"
                    max="12"
                    value={targetSleepHours}
                    onChange={(e) => setTargetSleepHours(parseFloat(e.target.value) || 7.5)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Primary Wellness / Academic Focus</span>
                </label>
                <input
                  type="text"
                  value={primaryGoal}
                  onChange={(e) => setPrimaryGoal(e.target.value)}
                  placeholder="e.g., Avoid burnout during exam weeks"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-cyan-400 text-slate-950 font-bold text-xs hover:brightness-110 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
          >
            {isLoading ? 'Entering Portal...' : isSignUp ? 'Create Student Profile & Enter' : 'Sign In to Mind Mirror'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
          <span>Local-First Private Sandbox • No credentials transmitted outside</span>
        </div>
      </div>
    </div>
  );
};
