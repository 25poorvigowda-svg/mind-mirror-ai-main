import React from 'react';
import { ShieldCheck, HeartHandshake, Info } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-slate-900 bg-slate-950/70 text-slate-400 py-8 px-4 text-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col gap-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 text-slate-300 font-semibold">
            <HeartHandshake className="w-4 h-4 text-cyan-400" />
            <span>Mind Mirror AI — Student Wellness & Productivity Companion</span>
          </div>
          <p className="text-[11px] text-slate-500 max-w-xl">
            Empowering students to recognize daily patterns between sleep, stress, energy, and workload through respectful self-reflection and actionable micro-steps.
          </p>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-teal-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Local-First IndexedDB Persistence</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>Non-Diagnostic Reflection Tool</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-6 pt-4 border-t border-slate-900/60 text-[10px] text-slate-600 text-center leading-relaxed">
        Ethical & Medical Notice: Mind Mirror AI is designed strictly for educational self-reflection and student productivity pattern awareness. It does not provide clinical diagnoses, psychiatric assessments, or medical advice. Mathematical correlations calculated from self-reported data do not establish causal relationships.
      </div>
    </footer>
  );
};
