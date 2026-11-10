import React from 'react';
import { SiteMetrics, EphemerisSample } from '../../types';
import {
  Sun,
  Globe,
  BatteryCharging,
  Radio,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Info,
  ChevronRight,
  Zap
} from 'lucide-react';

interface RightSidebarProps {
  metrics: SiteMetrics;
  mode: 'technical' | 'explain';
}

export const RightSidebar: React.FC<RightSidebarProps> = ({ metrics, mode }) => {
  const getRatingBadgeClass = (rating: SiteMetrics['powerRating']) => {
    switch (rating) {
      case 'EXCELLENT':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';
      case 'HIGH':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-700';
      case 'MODERATE':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-700';
      case 'MARGINAL':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-300 dark:border-orange-700';
      case 'CRITICAL':
      default:
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-700';
    }
  };

  return (
    <aside className="w-full md:w-72 lg:w-80 flex flex-col gap-3 overflow-y-auto pl-1 select-none text-slate-800 dark:text-slate-100">
      {/* 1. Visual Legend Card (Accessible with shapes/patterns) */}
      <div className="p-3 rounded-2xl bg-white dark:bg-space-850 border border-slate-200 dark:border-space-700 shadow-sm transition-all text-xs">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Telemetry Legend
        </h2>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-4 h-1.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50"></span>
            <span>Sun Path (LOS)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-1.5 rounded-full bg-sky-400 border border-sky-400 border-dashed"></span>
            <span>Earth Libration</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-1.5 rounded-full bg-rose-500 flex items-center justify-center text-[7px] text-white font-bold">✕</span>
            <span>Terrain Blocked</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-2.5 rounded bg-slate-600 dark:bg-space-700"></span>
            <span>LOLA Skyline</span>
          </div>
        </div>
      </div>

      {/* 2. Current Status Card */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-space-850 border border-slate-200 dark:border-space-700 shadow-sm transition-all">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-2.5 flex items-center justify-between">
          <span>Live Line-of-Sight</span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </h2>

        {/* Sun Row */}
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-space-900/60 border border-slate-100 dark:border-space-750 mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-xs text-slate-900 dark:text-white">Solar Vector</div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  El: <strong>{metrics.currentSunElevation > 0 ? `+${metrics.currentSunElevation}` : metrics.currentSunElevation}°</strong> · Az: <strong>{metrics.currentSunAzimuth}°</strong>
                </div>
              </div>
            </div>

            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide flex items-center gap-1 border ${
                metrics.sunInView
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
              }`}
            >
              {metrics.sunInView ? (
                <>
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  <span>SUNLIT</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3 h-3 text-rose-500" />
                  <span>SHADOW</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Earth Row */}
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-space-900/60 border border-slate-100 dark:border-space-750">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-xs text-slate-900 dark:text-white">Direct-to-Earth</div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  El: <strong>{metrics.currentEarthElevation > 0 ? `+${metrics.currentEarthElevation}` : metrics.currentEarthElevation}°</strong> · Az: <strong>{metrics.currentEarthAzimuth}°</strong>
                </div>
              </div>
            </div>

            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide flex items-center gap-1 border ${
                metrics.earthInView
                  ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800'
                  : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
              }`}
            >
              {metrics.earthInView ? (
                <>
                  <Radio className="w-3 h-3 text-sky-500" />
                  <span>LINK OPEN</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3 h-3 text-rose-500" />
                  <span>BLACKOUT</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Next Operational Events */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-space-850 border border-slate-200 dark:border-space-700 shadow-sm transition-all text-xs">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-2">
          <Clock className="w-3.5 h-3.5 text-blue-500" />
          <span>Next Operational Events</span>
        </div>

        <div className="space-y-2">
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-space-900/60 border border-slate-100 dark:border-space-750 flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400">
              {metrics.sunInView ? 'Time to Sunset (Shadow)' : 'Time to Sunrise'}
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {metrics.sunInView
                ? (metrics.timeToSunsetHours !== null ? `${metrics.timeToSunsetHours}h` : 'Continuous')
                : (metrics.timeToSunriseHours !== null ? `${metrics.timeToSunriseHours}h` : 'No sunrise this cycle')}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 dark:bg-space-900/60 border border-slate-100 dark:border-space-750 flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400">
              {metrics.earthInView ? 'Time to Earthset (Loss)' : 'Time to Earthrise'}
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {metrics.earthInView
                ? (metrics.timeToEarthsetHours !== null ? `${metrics.timeToEarthsetHours}h` : 'Continuous')
                : (metrics.timeToEarthriseHours !== null ? `${metrics.timeToEarthriseHours}h` : 'Occulted (Far side)')}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Power & Mission Viability Score Card */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-space-850 border border-slate-200 dark:border-space-700 shadow-sm transition-all">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Power Viability
            </h2>
          </div>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getRatingBadgeClass(metrics.powerRating)}`}>
            {metrics.powerRating}
          </span>
        </div>

        {/* Score Ring / Bar */}
        <div className="my-2 p-2.5 rounded-xl bg-slate-900 text-white flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Viability Index</div>
            <div className="text-2xl font-black font-mono tracking-tight text-white flex items-baseline gap-1">
              <span>{metrics.powerScore}</span>
              <span className="text-xs text-slate-400 font-normal">/ 100</span>
            </div>
          </div>

          <div className="text-right text-[11px] font-mono space-y-0.5">
            <div className="text-amber-400">
              Sun: <strong>{(metrics.illuminationFraction * 100).toFixed(1)}%</strong>
            </div>
            <div className="text-sky-400">
              Earth: <strong>{(metrics.earthVisibilityFraction * 100).toFixed(1)}%</strong>
            </div>
            <div className="text-rose-400">
              Max Shadow: <strong>{metrics.longestContinuousShadowHours}h</strong>
            </div>
          </div>
        </div>

        {/* Explanation */}
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          {metrics.powerExplanation}
        </p>
      </div>
    </aside>
  );
};
