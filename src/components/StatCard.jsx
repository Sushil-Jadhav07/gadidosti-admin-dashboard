import { TrendingUp, TrendingDown, MoreVertical } from 'lucide-react';

export default function StatCard({ title, value, icon: Icon, change, prefix = '' }) {
  const fmt = (val) => {
    if (typeof val === 'number' && val >= 10000000) return `${prefix}${(val/10000000).toFixed(2)}Cr`;
    if (typeof val === 'number' && val >= 100000)   return `${prefix}${(val/100000).toFixed(1)}L`;
    if (typeof val === 'number' && val >= 1000)     return `${prefix}${val.toLocaleString('en-IN')}`;
    return `${prefix}${val}`;
  };

  const isPos = change >= 0;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            {Icon && <Icon size={18} />}
          </div>
          <p className="text-sm font-medium text-neutral-500">{title}</p>
        </div>
        <button type="button" aria-label="More options" className="text-neutral-400 hover:text-neutral-600 transition-colors flex-shrink-0">
          <MoreVertical size={16} />
        </button>
      </div>
      <div className="flex items-end justify-between gap-3">
        <h3 className="text-2xl font-poppins font-bold text-secondary tracking-tight">{fmt(value)}</h3>
        {change !== undefined && (
          <div className="text-right flex-shrink-0">
            <span className={`inline-flex items-center gap-1 text-xs font-semibold ${isPos ? 'text-tertiary' : 'text-danger'}`}>
              {isPos ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {isPos ? 'Up by' : 'Down by'} {Math.abs(change)}%
            </span>
            <p className="text-xs text-neutral-400 mt-0.5">{isPos ? 'this week' : 'from last week'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
