import React, { useMemo, useState } from 'react';
import { LandingSite, EphemerisSample, SolarArrayArchitecture } from '../../types';
import { EphemerisEngine, SYNODIC_MONTH_DAYS } from '../../ephemeris/engine';
import { HorizonManager } from '../../terrain/horizon';
import { Sliders, Trophy, TrendingUp, Zap, Lightbulb, BatteryCharging, Check } from 'lucide-react';

interface AnalysisTabProps {
  currentSite: LandingSite;
  allSites: LandingSite[];
  samples: EphemerisSample[];
  targetDate: Date;
  onSelectSite: (site: LandingSite) => void;
  solarArchitecture?: SolarArrayArchitecture;
  onToggleSolarArchitecture?: (arch: SolarArrayArchitecture) => void;
}

export const AnalysisTab: React.FC<AnalysisTabProps> = ({
  currentSite,
  allSites,
  samples,
  targetDate,
  onSelectSite,
  solarArchitecture = 'vertical',
  onToggleSolarArchitecture
}) => {
  const [internalArch, setInternalArch] = useState<SolarArrayArchitecture>(solarArchitecture);
  const activeArch = onToggleSolarArchitecture ? solarArchitecture : internalArch;
  const setArch = onToggleSolarArchitecture || setInternalArch;

  // Rank all sites by power score
  const rankedSites = useMemo(() => {
    return allSites.map(site => {
      const hm = new HorizonManager(site.horizonProfile);
      const metrics = EphemerisEngine.computeSiteMetrics(site, targetDate, hm);
      return { site, metrics };
    }).sort((a, b) => b.metrics.powerScore - a.metrics.powerScore);
  }, [allSites, targetDate]);

  // SVG Chart Dimensions
  const chartWidth = 740;
  const chartHeight = 220;
  const padding = { top: 20, right: 30, bottom: 30, left: 45 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;

  // Elevation range for current site: from -5° to max elevation + 5°
  const maxEl = Math.max(10, ...samples.map(s => Math.max(s.sun.el, s.earth.el)));
  const minEl = Math.min(-5, ...samples.map(s => Math.min(s.sun.el, s.earth.el)));

  const mapX = (day: number) => padding.left + (day / SYNODIC_MONTH_DAYS) * graphWidth;
  const mapY = (el: number) => padding.top + graphHeight - ((el - minEl) / (maxEl - minEl)) * graphHeight;

  // Build SVG path strings
  const sunPathD = samples.map((s, idx) => `${idx === 0 ? 'M' : 'L'} ${mapX(s.missionDay)} ${mapY(s.sun.el)}`).join(' ');
  const earthPathD = samples.map((s, idx) => `${idx === 0 ? 'M' : 'L'} ${mapX(s.missionDay)} ${mapY(s.earth.el)}`).join(' ');
  const zeroElY = mapY(0);

  // Compute power flux for current site samples based on selected solar architecture
  const currentSunSample = samples[0] || { sun: { el: 1.5, isBlocked: false } };
  const activeFlux = useMemo(() => {
    return EphemerisEngine.calculateSolarFlux(
      currentSunSample.sun.el,
      currentSunSample.sun.isBlocked,
      activeArch
    );
  }, [currentSunSample, activeArch]);

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-slate-100 font-sans">
      {/* 1. Solar Array Architecture Selection Card */}
      <div className="p-4 rounded-2xl bg-slate-950/85 border border-slate-800 shadow-md font-mono text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <BatteryCharging className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Photovoltaic Architecture & Polar Solar Yield
              </h2>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                Compare geometric capture efficiency: Vertical Deployed Polar Array vs Horizontal Deck-Mounted Array
              </p>
            </div>
          </div>

          {/* Architecture Selector Buttons */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-700/60 text-xs">
            <button
              onClick={() => React.startTransition(() => setArch('vertical'))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeArch === 'vertical'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {activeArch === 'vertical' && <Check className="w-3.5 h-3.5" />}
              <span>Vertical Deployed Array [cos θ]</span>
            </button>
            <button
              onClick={() => React.startTransition(() => setArch('horizontal'))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeArch === 'horizontal'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {activeArch === 'horizontal' && <Check className="w-3.5 h-3.5" />}
              <span>Horizontal Deck Array [sin θ]</span>
            </button>
          </div>
        </div>

        {/* Dynamic Power Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-800">
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">Instantaneous Solar Flux</span>
            <div className="text-xl font-bold tabular-nums text-amber-300 mt-1">
              {activeFlux.fluxWm2} <span className="text-xs text-slate-400 font-normal">W/m²</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Max theoretical cell capacity: {activeFlux.maxFluxWm2} W/m²
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">Geometric Incident Yield</span>
            <div className="text-xl font-bold tabular-nums text-cyan-300 mt-1">
              {(activeFlux.efficiencyFactor * 100).toFixed(1)}%
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Angle of incidence to panel normal
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 font-sans">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Aerospace Assessment</span>
            <p className="text-[11px] text-slate-300 mt-1 leading-snug">
              {activeFlux.description}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Elevation vs Time Chart Card */}
      <div className="p-4 rounded-2xl bg-slate-950/85 border border-slate-800 shadow-md font-mono text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              <span>Elevation Trajectories vs Mission Time</span>
            </h2>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Celestial body elevation above local sphere horizon across the 29.53-day synodic month for {currentSite.name}.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <span className="w-3 h-1 bg-amber-400 rounded"></span>
              <span>Sun Elevation</span>
            </span>
            <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <span className="w-3 h-1 bg-cyan-400 rounded border-b border-dashed"></span>
              <span>Earth Elevation</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-3 h-0.5 bg-slate-500 border-b border-dotted"></span>
              <span>0° Horizon</span>
            </span>
          </div>
        </div>

        {/* SVG Chart */}
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full min-w-[500px] h-52 bg-slate-900/90 rounded-xl p-2 select-none border border-slate-800">
            {/* Grid Lines */}
            {[0, 15, 30, 45, 60, 75, 90].filter(e => e >= minEl && e <= maxEl).map(e => (
              <g key={e}>
                <line
                  x1={padding.left}
                  y1={mapY(e)}
                  x2={chartWidth - padding.right}
                  y2={mapY(e)}
                  stroke="#334155"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text x={padding.left - 8} y={mapY(e) + 4} textAnchor="end" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                  {e}°
                </text>
              </g>
            ))}

            {/* 0° Horizon Line */}
            {zeroElY >= padding.top && zeroElY <= chartHeight - padding.bottom && (
              <line
                x1={padding.left}
                y1={zeroElY}
                x2={chartWidth - padding.right}
                y2={zeroElY}
                stroke="#64748b"
                strokeWidth="1.5"
              />
            )}

            {/* Earth Path Line */}
            <path
              d={earthPathD}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.5"
              strokeDasharray="6 4"
            />

            {/* Sun Path Line */}
            <path
              d={sunPathD}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
            />

            {/* X-Axis Ticks */}
            {[0, 5, 10, 15, 20, 25, 29.5].map(d => (
              <text key={d} x={mapX(d)} y={chartHeight - 8} textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                d {d}
              </text>
            ))}
          </svg>
        </div>
      </div>

      {/* 3. Site Leaderboard Ranking */}
      <div className="p-4 rounded-2xl bg-slate-950/85 border border-slate-800 shadow-md font-mono text-xs">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>Site Suitability Leaderboard (NASA Hackathon Scoring)</span>
        </h3>

        <div className="space-y-2">
          {rankedSites.map(({ site, metrics }, idx) => (
            <div
              key={site.id}
              onClick={() => React.startTransition(() => onSelectSite(site))}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-wrap items-center justify-between gap-3 ${
                site.id === currentSite.id
                  ? 'bg-blue-950/40 border-cyan-500/60 shadow-sm'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                  idx === 0 ? 'bg-amber-400 text-slate-950 font-black' :
                  idx === 1 ? 'bg-slate-300 text-slate-900 font-bold' :
                  idx === 2 ? 'bg-amber-700 text-white font-bold' : 'bg-slate-800 text-slate-400'
                }`}>
                  #{idx + 1}
                </span>

                <div>
                  <div className="font-bold text-xs text-white flex items-center gap-2">
                    <span className="font-sans">{site.name}</span>
                    {site.id === currentSite.id && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-600 text-white font-normal">Active</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-sans">
                    {site.category} · {site.elevationKm > 0 ? `+${site.elevationKm}` : site.elevationKm} km elevation
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs tabular-nums">
                <div className="text-right">
                  <div className="text-amber-400 font-bold">{(metrics.illuminationFraction * 100).toFixed(1)}% Sun</div>
                  <div className="text-slate-400 text-[10px]">Max shadow: {metrics.longestContinuousShadowHours}h</div>
                </div>

                <div className="text-right">
                  <div className="text-cyan-400 font-bold">{(metrics.earthVisibilityFraction * 100).toFixed(1)}% Earth</div>
                  <div className="text-slate-400 text-[10px]">Comm: {metrics.commRating}</div>
                </div>

                <div className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-center min-w-[70px]">
                  <div className="text-[9px] uppercase font-bold text-slate-400">Score</div>
                  <div className="text-sm font-black text-amber-400">{metrics.powerScore}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Deep Educational Insight: Why Small Changes Matter */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-blue-500/10 to-indigo-500/10 border border-amber-500/20 text-xs leading-relaxed space-y-2 font-sans">
        <div className="flex items-center gap-2 text-amber-400 font-bold text-sm font-mono">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <span>Why Milliradians & Local Topography Decide Mission Success</span>
        </div>
        <p className="text-slate-300">
          At the lunar south pole, the Sun skims across the horizon at an angle of merely <strong>1.0° to 2.2°</strong>. As a result, a topographic ridge just <strong>200 meters high</strong> several kilometers away can cast a shadow that plunges a solar-powered lander into cryogenic freezing for up to 50 hours!
        </p>
        <p className="text-slate-300">
          Similarly, the Earth is tilted by <strong>±6.7° to ±7.7°</strong> due to optical and physical libration. Mountain massifs like <strong>Malapert Massif</strong> sit sufficiently high (5 km) that the Earth never dips below the local skyline, maintaining 100% direct line-of-sight communication without requiring orbital relay spacecraft like CAPSTONE or Queqiao.
        </p>
      </div>
    </div>
  );
};
