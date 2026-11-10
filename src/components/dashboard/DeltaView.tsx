import React from 'react';
import { DeltaComparison } from '../../types';
import { ArrowRight, X, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface DeltaViewProps {
  delta: DeltaComparison;
  onDismiss: () => void;
}

export const DeltaView: React.FC<DeltaViewProps> = ({ delta, onDismiss }) => {
  const isPositiveScore = delta.powerScoreDiff >= 0;

  return (
    <div className="mx-4 my-2 p-3 rounded-2xl bg-white dark:bg-space-850 border border-blue-500/40 shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs select-none animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
          <AlertCircle className="w-4 h-4" />
        </div>
        <div>
          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>What Changed:</span>
            <span className="text-slate-500 font-normal">{delta.siteA}</span>
            <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-blue-600 dark:text-blue-400 font-bold">{delta.siteB}</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Local LOLA topography and latitude variance directly affect power generation & comm margins.
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 font-mono text-xs">
        <div>
          <span className="text-slate-400 text-[10px] block">Max Sun Duration</span>
          <span className={delta.sunlightDiffHours >= 0 ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
            {delta.sunlightDiffHours >= 0 ? `+${delta.sunlightDiffHours}` : delta.sunlightDiffHours}h
          </span>
        </div>

        <div>
          <span className="text-slate-400 text-[10px] block">Earth LOS Window</span>
          <span className={delta.earthDiffHours >= 0 ? 'text-sky-500 font-bold' : 'text-rose-500 font-bold'}>
            {delta.earthDiffHours >= 0 ? `+${delta.earthDiffHours}` : delta.earthDiffHours}h
          </span>
        </div>

        <div>
          <span className="text-slate-400 text-[10px] block">Shadow Penalty</span>
          <span className={delta.maxShadowDiffHours <= 0 ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
            {delta.maxShadowDiffHours > 0 ? `+${delta.maxShadowDiffHours}` : delta.maxShadowDiffHours}h
          </span>
        </div>

        <div className="flex items-center gap-1.5 p-1.5 px-2.5 rounded-xl bg-slate-900 text-white">
          <span className="text-[10px] text-slate-400">Power Score:</span>
          <span className={`font-bold flex items-center gap-0.5 ${isPositiveScore ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPositiveScore ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {isPositiveScore ? `+${delta.powerScoreDiff}` : delta.powerScoreDiff} pts
          </span>
        </div>

        <button
          onClick={onDismiss}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          title="Dismiss comparison"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
