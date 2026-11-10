import React, { useRef, useState } from 'react';
import { EphemerisSample, SiteMetrics, OperationalWindow, LandingSite } from '../../types';
import { SYNODIC_MONTH_DAYS } from '../../ephemeris/engine';
import { Sun, Globe, ShieldCheck, ShieldAlert, Clock, ArrowRight } from 'lucide-react';

interface TimelineTabProps {
  currentSite: LandingSite;
  samples: EphemerisSample[];
  metrics: SiteMetrics;
  missionDay: number;
  onSetMissionDay: (day: number) => void;
}

export const TimelineTab: React.FC<TimelineTabProps> = ({
  currentSite,
  samples,
  metrics,
  missionDay,
  onSetMissionDay
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverDay, setHoverDay] = useState<number | null>(null);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const day = (x / rect.width) * SYNODIC_MONTH_DAYS;
    setHoverDay(day);
  };

  const handleClick = () => {
    if (hoverDay !== null) onSetMissionDay(hoverDay);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-slate-800 dark:text-slate-100">
      {/* Header & Overview */}
      <div className="p-4 rounded-2xl bg-white dark:bg-space-850 border border-slate-200 dark:border-space-700 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>29.53-Day Operational Timeline</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-mono">
              {currentSite.name}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gantt-style representation of solar power availability and direct-to-Earth communication windows across one full synodic lunar cycle.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500"></span>
            <span>Sunlit ({(metrics.illuminationFraction * 100).toFixed(1)}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-500"></span>
            <span>Shadow ({( (1 - metrics.illuminationFraction) * 100 ).toFixed(1)}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-sky-500"></span>
            <span>Earth Link ({(metrics.earthVisibilityFraction * 100).toFixed(1)}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-700"></span>
            <span>Blackout</span>
          </div>
        </div>
      </div>

      {/* Gantt Timeline Strip Container */}
      <div className="p-4 rounded-2xl bg-white dark:bg-space-850 border border-slate-200 dark:border-space-700 shadow-sm">
        <div className="flex justify-between items-center text-xs font-mono text-slate-500 mb-2">
          <span>Day 0.0 (New Moon)</span>
          <span>Day 7.4 (First Quarter)</span>
          <span>Day 14.8 (Full Moon)</span>
          <span>Day 22.1 (Last Quarter)</span>
          <span>Day 29.5</span>
        </div>

        {/* Interactive Strip */}
        <div
          ref={containerRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverDay(null)}
          onClick={handleClick}
          className="relative w-full h-36 bg-slate-900 rounded-xl overflow-hidden cursor-crosshair select-none border border-slate-700 shadow-inner"
        >
          {/* Track 1: Solar Illumination */}
          <div className="absolute top-2 left-0 right-0 h-12 flex">
            {samples.map((s, idx) => (
              <div
                key={idx}
                style={{ width: `${100 / samples.length}%` }}
                className={`h-full ${
                  !s.sun.isBlocked ? 'bg-emerald-500' : 'bg-rose-600/80'
                }`}
                title={`Day ${s.missionDay}: Sun ${s.sun.el}° (${!s.sun.isBlocked ? 'Sunlit' : 'Shadow'})`}
              />
            ))}
            <div className="absolute top-1 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono text-white bg-black/60 backdrop-blur-sm flex items-center gap-1">
              <Sun className="w-3 h-3 text-amber-400" />
              <span>SOLAR POWER TRACK</span>
            </div>
          </div>

          {/* Track 2: Direct-to-Earth Comm */}
          <div className="absolute bottom-2 left-0 right-0 h-12 flex">
            {samples.map((s, idx) => (
              <div
                key={idx}
                style={{ width: `${100 / samples.length}%` }}
                className={`h-full ${
                  !s.earth.isBlocked ? 'bg-sky-500' : 'bg-rose-900/80'
                }`}
                title={`Day ${s.missionDay}: Earth ${s.earth.el}° (${!s.earth.isBlocked ? 'LOS' : 'Blackout'})`}
              />
            ))}
            <div className="absolute bottom-1 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono text-white bg-black/60 backdrop-blur-sm flex items-center gap-1">
              <Globe className="w-3 h-3 text-sky-400" />
              <span>DIRECT-TO-EARTH LINK TRACK</span>
            </div>
          </div>

          {/* Current Mission Day Playhead */}
          <div
            style={{ left: `${(missionDay / SYNODIC_MONTH_DAYS) * 100}%` }}
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow-[0_0_8px_#f59e0b] z-20 pointer-events-none"
          >
            <div className="absolute -top-1 -translate-x-1/2 w-3 h-3 bg-amber-400 rounded-full border border-white"></div>
          </div>

          {/* Hover Day Guideline */}
          {hoverDay !== null && (
            <div
              style={{ left: `${(hoverDay / SYNODIC_MONTH_DAYS) * 100}%` }}
              className="absolute top-0 bottom-0 w-px bg-white/70 border-dashed border-l border-white z-10 pointer-events-none"
            >
              <div className="absolute top-1 left-1.5 px-1 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white whitespace-nowrap">
                Click to scrub: Day {hoverDay.toFixed(2)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Operational Windows Breakdown Table */}
      <div className="p-4 rounded-2xl bg-white dark:bg-space-850 border border-slate-200 dark:border-space-700 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-500" />
          <span>Operational Window Log</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left" role="table">
            <thead>
              <tr className="border-b border-slate-200 dark:border-space-700 text-slate-500 font-mono text-[11px]">
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3">Start Day</th>
                <th className="py-2 px-3">End Day</th>
                <th className="py-2 px-3">Duration (Days)</th>
                <th className="py-2 px-3">Duration (Hours)</th>
                <th className="py-2 px-3">Observation Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-space-750 font-mono">
              {metrics.windows.map((w, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-space-800 transition-colors">
                  <td className="py-2 px-3">
                    <span className="flex items-center gap-1.5 font-sans font-semibold">
                      {w.type === 'sunlight' && <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>}
                      {w.type === 'solar_shadow' && <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>}
                      {w.type === 'earth_los' && <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>}
                      {w.type === 'comm_blackout' && <span className="w-2.5 h-2.5 rounded-full bg-rose-800"></span>}
                      <span className="capitalize">{w.type.replace('_', ' ')}</span>
                    </span>
                  </td>
                  <td className="py-2 px-3">Day {w.startDay.toFixed(2)}</td>
                  <td className="py-2 px-3">Day {w.endDay.toFixed(2)}</td>
                  <td className="py-2 px-3">{w.durationDays.toFixed(2)} d</td>
                  <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">{w.durationHours} h</td>
                  <td className="py-2 px-3 font-sans">
                    {w.type === 'sunlight' && <span className="text-emerald-600 dark:text-emerald-400 font-medium">Full Battery Charging</span>}
                    {w.type === 'solar_shadow' && <span className="text-rose-600 dark:text-rose-400 font-medium">Battery Depletion Mode</span>}
                    {w.type === 'earth_los' && <span className="text-sky-600 dark:text-sky-400 font-medium">Continuous Telemetry</span>}
                    {w.type === 'comm_blackout' && <span className="text-rose-600 dark:text-rose-400 font-medium">Relay Satellite Required</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
