import { cn } from '../../lib/utils';

const CONFIG = {
  CLEAR:    { label: 'Clear',    dot: 'bg-emerald-500', pill: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20' },
  LOW_RISK: { label: 'Low Risk', dot: 'bg-amber-500',   pill: 'bg-amber-500/10  text-amber-600  dark:text-amber-400  ring-amber-500/20'  },
  CRITICAL: { label: 'Critical', dot: 'bg-red-500',     pill: 'bg-red-500/10    text-red-600    dark:text-red-400    ring-red-500/20'    },
};

export default function RiskBadge({ level, score, size = 'sm', showScore = false }) {
  const c = CONFIG[level] ?? CONFIG.CLEAR;
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset whitespace-nowrap',
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
      c.pill,
    )}>
      <span className={cn('shrink-0 rounded-full', size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2', c.dot)} />
      {c.label}
      {showScore && score !== undefined && (
        <span className="font-semibold tabular-nums">{Math.round(score)}</span>
      )}
    </span>
  );
}
