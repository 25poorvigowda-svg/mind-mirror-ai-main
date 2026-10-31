import React, { useState } from 'react';
import {
  User,
  GraduationCap,
  Building,
  Mail,
  Calendar,
  Target,
  Edit2,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import type { UserProfile, DailyCheckIn } from '../types';
import { updateUserProfile } from '../services/db';
import { Badge } from '../components/ui/Badge';
import confetti from 'canvas-confetti';

interface ProfileViewProps {
  userProfile: UserProfile;
  checkIns: DailyCheckIn[];
  onProfileUpdated: (updated: UserProfile) => void;
  onLogout: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  userProfile,
  checkIns,
  onProfileUpdated,
  onLogout,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(userProfile.fullName);
  const [institution, setInstitution] = useState(userProfile.institution);
  const [major, setMajor] = useState(userProfile.major);
  const [academicYear, setAcademicYear] = useState(userProfile.academicYear);
  const [targetSleepHours, setTargetSleepHours] = useState(userProfile.targetSleepHours);
  const [primaryGoal, setPrimaryGoal] = useState(userProfile.primaryGoal);

  // Statistics derived from real check-ins
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await updateUserProfile({
      fullName,
      institution,
      major,
      academicYear,
      targetSleepHours: Number(targetSleepHours) || 7.5,
      primaryGoal,
    });
    confetti({ particleCount: 35, spread: 50 });
    setIsEditing(false);
    onProfileUpdated(updated);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-2">
            <User className="w-3.5 h-3.5" />
            <span>Student Identity & Wellness Profile</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            User Details
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Personalized academic context and baseline wellness configurations for Pluto 3D.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-400 border border-slate-700 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 text-xs font-semibold text-rose-300 border border-rose-500/30 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Switch / Sign Out</span>
          </button>
        </div>
      </div>

      {/* 3D Holographic Student ID Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-cyan-950/50 border border-cyan-500/30 p-6 md:p-8 backdrop-blur-2xl shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-32 -mb-16 w-64 h-64 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 via-teal-400 to-violet-500 p-0.5 shadow-xl shadow-cyan-500/25">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-2xl font-black text-cyan-300">
                {userProfile.fullName ? userProfile.fullName[0].toUpperCase() : 'S'}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
                  {userProfile.fullName}
                </h2>
                <Badge variant="cyan" size="sm">
                  {userProfile.academicYear}
                </Badge>
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-1 font-medium">
                <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
                <span>{userProfile.major}</span>
              </p>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Building className="w-3 h-3 text-teal-400" />
                <span>{userProfile.institution}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end text-xs text-slate-400 space-y-1">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-300">{userProfile.email}</span>
            </span>
            <span className="flex items-center gap-1.5 text-[11px]">
              <Calendar className="w-3 h-3 text-slate-500" />
              <span>Joined: {userProfile.joinedDate}</span>
            </span>
          </div>
        </div>

        {/* Goal Banner */}
        <div className="mt-5 flex items-start gap-3 p-3.5 rounded-2xl bg-slate-950/80 border border-cyan-500/20 text-xs">
          <Target className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-cyan-300">Primary Reflection Goal: </span>
            <span className="text-slate-200">{userProfile.primaryGoal}</span>
          </div>
        </div>
      </div>

      {/* Edit Profile Form (if toggled) */}
      {isEditing && (
        <form onSubmit={handleSaveProfile} className="rounded-3xl bg-slate-900/70 border border-cyan-500/30 p-6 md:p-8 backdrop-blur-xl space-y-4 animate-fadeIn">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Edit2 className="w-4 h-4 text-cyan-400" />
            <span>Update Student Details</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">University / Institution</label>
              <input
                type="text"
                required
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">Major</label>
              <input
                type="text"
                required
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

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
                <option value="Graduate">Graduate</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">Target Sleep (Hours)</label>
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
            <label className="text-xs font-semibold text-slate-300 mb-1 block">Primary Goal</label>
            <input
              type="text"
              value={primaryGoal}
              onChange={(e) => setPrimaryGoal(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold text-xs"
            >
              Save Profile
            </button>
          </div>
        </form>
      )}

      {/* Wellness & Performance Footprint */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 backdrop-blur-md">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Check-ins</p>
          <div className="mt-2 text-2xl font-bold text-white">{totalEntries} Days</div>
          <p className="text-[11px] text-slate-500 mt-1">Logged in local IndexedDB</p>
        </div>

        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 backdrop-blur-md">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Avg Sleep vs Target</p>
          <div className="mt-2 text-2xl font-bold text-teal-300">
            {avgSleep}h <span className="text-xs font-normal text-slate-400">/ {userProfile.targetSleepHours}h</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {avgSleep >= userProfile.targetSleepHours ? 'Target met regularly' : 'Slight deficit noted'}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 backdrop-blur-md">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Average Energy</p>
          <div className="mt-2 text-2xl font-bold text-amber-300">{avgEnergy} / 5</div>
          <p className="text-[11px] text-slate-500 mt-1">Self-reported stamina</p>
        </div>

        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 backdrop-blur-md">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Average Stress</p>
          <div className={`mt-2 text-2xl font-bold ${avgStress > 6 ? 'text-rose-400' : 'text-cyan-300'}`}>
            {avgStress} / 10
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Academic pressure index</p>
        </div>
      </div>

      {/* Local-First Sandbox Privacy Seal */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-900/80 border border-teal-500/20 text-xs text-slate-300">
        <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0" />
        <div>
          <strong className="text-white">Private Student Sandbox:</strong> Your profile data and reflection history are stored exclusively on this machine. Pluto 3D personalizes its conversations using this local context.
        </div>
      </div>
    </div>
  );
};
