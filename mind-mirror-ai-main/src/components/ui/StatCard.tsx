import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
    neutral?: boolean;
  };
  accentColor?: 'cyan' | 'teal' | 'violet' | 'amber' | 'rose';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  accentColor = 'cyan',
  onClick,
}) => {
  const accentGlow = {
    cyan: 'border-cyan-500/20 group-hover:border-cyan-500/40 text-cyan-400',
    teal: 'border-teal-500/20 group-hover:border-teal-500/40 text-teal-400',
    violet: 'border-violet-500/20 group-hover:border-violet-500/40 text-violet-400',
    amber: 'border-amber-500/20 group-hover:border-amber-500/40 text-amber-400',
    rose: 'border-rose-500/20 group-hover:border-rose-500/40 text-rose-400',
  }[accentColor];

  const iconBg = {
    cyan: 'bg-cyan-950/40 text-cyan-400',
    teal: 'bg-teal-950/40 text-teal-400',
    violet: 'bg-violet-950/40 text-violet-400',
    amber: 'bg-amber-950/40 text-amber-400',
    rose: 'bg-rose-950/40 text-rose-400',
  }[accentColor];

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl bg-slate-900/60 backdrop-blur-md border ${accentGlow} p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-white tracking-tight">{value}</h3>
            {trend && (
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  trend.neutral
                    ? 'bg-slate-800 text-slate-300'
                    : trend.isPositive
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                }`}
              >
                {trend.value}
              </span>
            )}
          </div>
          {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
        </div>

        <div className={`p-3 rounded-xl border border-white/5 ${iconBg}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};
