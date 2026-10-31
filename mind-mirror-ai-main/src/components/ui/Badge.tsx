import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'cyan' | 'teal' | 'violet' | 'amber' | 'rose' | 'slate' | 'emerald';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'cyan',
  size = 'sm',
  icon,
}) => {
  const variantStyles = {
    cyan: 'bg-cyan-950/60 text-cyan-300 border-cyan-500/30',
    teal: 'bg-teal-950/60 text-teal-300 border-teal-500/30',
    violet: 'bg-violet-950/60 text-violet-300 border-violet-500/30',
    amber: 'bg-amber-950/60 text-amber-300 border-amber-500/30',
    rose: 'bg-rose-950/60 text-rose-300 border-rose-500/30',
    emerald: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30',
    slate: 'bg-slate-800 text-slate-300 border-slate-700',
  }[variant];

  const sizeStyles = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border backdrop-blur-sm ${variantStyles} ${sizeStyles}`}
    >
      {icon}
      {children}
    </span>
  );
};
