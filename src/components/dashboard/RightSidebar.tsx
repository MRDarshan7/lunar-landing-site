import React from 'react';
import { SiteMetrics, CountdownEvents } from '../../types';
import {
  Sun,
  Globe,
  Radio,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Activity
} from 'lucide-react';

interface RightSidebarProps {
  metrics: SiteMetrics;
  mode: 'technical' | 'explain';
  countdownEvents?: CountdownEvents;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({ metrics, mode, countdownEvents }) => {
  const getRatingBadgeClass = (rating: SiteMetrics['powerRating']) => {
    switch (rating) {
      case 'EXCELLENT':
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/20';
      case 'HIGH':
        return 'bg-blue-950/70 text-blue-300 border-blue-500/50 shadow-sm shadow-blue-500/20';
      case 'MODERATE':
        return 'bg-amber-950/70 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/20';
      case 'MARGINAL':
        return 'bg-orange-950/70 text-orange-300 border-orange-500/50 shadow-sm shadow-orange-500/20';
      case 'CRITICAL':
      default:
        return 'bg-rose-950/70 text-rose-300 border-rose-500/50 shadow-sm shadow-rose-500/20';
    }
  };

  return (
    <aside className="w-full md:w-72 lg:w-80 flex flex-col gap-3 overflow-y-auto pl-1 select-none text-slate-100 font-sans">
      {/* 1. Telemetry Legend Card */}
      <div className="p-3 rounded-2xl bg-slate-950/85 border border-slate-800/80 shadow-md backdrop-blur-md text-xs font-mono">
        <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
          <span>Flight Telemetry Legend</span>
          <span className="text-[9px] text-slate-500">IAU 2000 ME</span>
        </h2>

        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-1.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50"></span>
            <span className="text-slate-300">Sun Path (LOS)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-1.5 rounded-full bg-cyan-400 border border-cyan-400 border-dashed"></span>
            <span className="text-slate-300">Earth Libration</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-1.5 rounded-full bg-rose-500 flex items-center justify-center text-[7px] text-white font-bold">✕</span>
            <span className="text-slate-300">Terrain Blocked</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-2 rounded bg-slate-700 border-t border-amber-400"></span>
            <span className="text-slate-300">LOLA Skyline</span>
          </div>
        </div>
      </div>

      {/* 2. Live Line-of-Sight Status Card */}
      <div className="p-3.5 rounded-2xl bg-slate-950/85 border border-slate-800/80 shadow-md backdrop-blur-md font-mono">
        <h2 className="text-xs font-bold uppercase tracking-wider text-white mb-2.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Live Ephemeris Vectors</span>
          </span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </h2>

        {/* Sun Row */}
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-xs text-white">Solar Vector</div>
                <div className="text-[11px] tabular-nums text-slate-400">
                  El: <strong className="text-amber-300">{metrics.currentSunElevation > 0 ? `+${metrics.currentSunElevation}` : metrics.currentSunElevation}°</strong> · Az: <strong className="text-slate-200">{metrics.currentSunAzimuth}°</strong>
                </div>
              </div>
            </div>

            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide flex items-center gap-1 border ${
                metrics.sunInView
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/50'
                  : 'bg-rose-950/60 text-rose-300 border-rose-500/50'
              }`}
            >
              {metrics.sunInView ? (
                <>
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>SUNLIT</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3 h-3 text-rose-400" />
                  <span>SHADOW</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Earth Row */}
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-xs text-white">Direct-to-Earth (DTE)</div>
                <div className="text-[11px] tabular-nums text-slate-400">
                  El: <strong className="text-cyan-300">{metrics.currentEarthElevation > 0 ? `+${metrics.currentEarthElevation}` : metrics.currentEarthElevation}°</strong> · Az: <strong className="text-slate-200">{metrics.currentEarthAzimuth}°</strong>
                </div>
              </div>
            </div>

            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide flex items-center gap-1 border ${
                metrics.earthInView
                  ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/50'
                  : 'bg-rose-950/60 text-rose-300 border-rose-500/50'
              }`}
            >
              {metrics.earthInView ? (
                <>
                  <Radio className="w-3 h-3 text-cyan-400" />
                  <span>LINK OPEN</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3 h-3 text-rose-400" />
                  <span>BLACKOUT</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Live Mission-Clock Event Countdown Badges */}
      <div className="p-3.5 rounded-2xl bg-slate-950/85 border border-slate-800/80 shadow-md backdrop-blur-md text-xs font-mono">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span>Mission Event Countdowns</span>
        </div>

        <div className="space-y-2">
          {/* Solar Event Countdown */}
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 text-[11px]">
              {countdownEvents
                ? `Next ${countdownEvents.nextSolarEvent.type.toUpperCase()}`
                : metrics.sunInView ? 'Time to Sunset (Shadow)' : 'Time to Sunrise'}
            </span>
            <span className="tabular-nums font-bold text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
              {countdownEvents
                ? countdownEvents.nextSolarEvent.formattedCountdown
                : metrics.sunInView
                  ? (metrics.timeToSunsetHours !== null ? `${metrics.timeToSunsetHours}h` : 'Continuous')
                  : (metrics.timeToSunriseHours !== null ? `${metrics.timeToSunriseHours}h` : 'No sunrise')}
            </span>
          </div>

          {/* Earth DTE Event Countdown */}
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 text-[11px]">
              {countdownEvents
                ? `Next ${countdownEvents.nextEarthEvent.type.toUpperCase()}`
                : metrics.earthInView ? 'Time to Earthset' : 'Time to Earthrise'}
            </span>
            <span className="tabular-nums font-bold text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
              {countdownEvents
                ? countdownEvents.nextEarthEvent.formattedCountdown
                : metrics.earthInView
                  ? (metrics.timeToEarthsetHours !== null ? `${metrics.timeToEarthsetHours}h` : 'Continuous')
                  : (metrics.timeToEarthriseHours !== null ? `${metrics.timeToEarthriseHours}h` : 'Occulted')}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Power & Mission Viability Score Card */}
      <div className="p-3.5 rounded-2xl bg-slate-950/85 border border-slate-800/80 shadow-md backdrop-blur-md font-mono">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">
              Power Viability
            </h2>
          </div>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getRatingBadgeClass(metrics.powerRating)}`}>
            {metrics.powerRating}
          </span>
        </div>

        {/* Score Ring / Bar */}
        <div className="my-2 p-3 rounded-xl bg-slate-900 border border-slate-800 text-white flex items-center justify-between">
          <div>
            <div className="text-[9px] uppercase font-bold text-slate-400">NASA Viability Index</div>
            <div className="text-2xl font-black tabular-nums tracking-tight text-white flex items-baseline gap-1">
              <span>{metrics.powerScore}</span>
              <span className="text-xs text-slate-500 font-normal">/ 100</span>
            </div>
          </div>

          <div className="text-right text-[11px] tabular-nums space-y-0.5">
            <div className="text-amber-400">
              Sun: <strong>{(metrics.illuminationFraction * 100).toFixed(1)}%</strong>
            </div>
            <div className="text-cyan-400">
              DTE Comms: <strong>{(metrics.earthVisibilityFraction * 100).toFixed(1)}%</strong>
            </div>
            <div className="text-rose-400">
              Max Shadow: <strong>{metrics.longestContinuousShadowHours}h</strong>
            </div>
          </div>
        </div>

        {/* Technical Explanation */}
        <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
          {metrics.powerExplanation}
        </p>
      </div>
    </aside>
  );
};
