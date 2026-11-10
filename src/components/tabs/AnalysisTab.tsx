import React, { useMemo } from 'react';
import { LandingSite, EphemerisSample } from '../../types';
import { EphemerisEngine, SYNODIC_MONTH_DAYS } from '../../ephemeris/engine';
import { HorizonManager } from '../../terrain/horizon';
import { Sliders, Trophy, TrendingUp, AlertTriangle, Lightbulb, Zap } from 'lucide-react';

interface AnalysisTabProps {
  currentSite: LandingSite;
  allSites: LandingSite[];
  samples: EphemerisSample[];
  targetDate: Date;
  onSelectSite: (site: LandingSite) => void;
}

export const AnalysisTab: React.FC<AnalysisTabProps> = ({
  currentSite,
  allSites,
  samples,
  targetDate,
  onSelectSite
}) => {
  // Rank all sites by power score
  const rankedSites = useMemo(() => {
    return allSites.map(site => {
      const hm = new HorizonManager(site.horizonProfile);
      const metrics = EphemerisEngine.computeSiteMetrics(site, targetDate, hm);
      return { site, metrics };
    }).sort((a, b) => b.metrics.powerScore - a.metrics.powerScore);
  }, [allSites, targetDate]);

  // SVG Chart Dimensions
  const chartWidth = 720;
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

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-slate-800 dark:text-slate-100">
      {/* 1. Elevation vs Time Chart Card */}
      <div className="p-4 rounded-2xl bg-white dark:bg-space-850 border border-slate-200 dark:border-space-700 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <span>Elevation Trajectories vs Mission Time</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Celestial body elevation above local sphere horizon across the 29.53-day synodic month for {currentSite.name}.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-amber-500 font-semibold">
              <span className="w-3 h-1 bg-amber-500 rounded"></span>
              <span>Sun Elevation</span>
            </span>
            <span className="flex items-center gap-1.5 text-sky-500 font-semibold">
              <span className="w-3 h-1 bg-sky-500 rounded border-b border-dashed"></span>
              <span>Earth Elevation</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-3 h-0.5 bg-slate-400 border-b border-dotted"></span>
              <span>0° Horizon</span>
            </span>
          </div>
        </div>

        {/* SVG Chart */}
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full min-w-[500px] h-52 bg-slate-900/90 rounded-xl p-2 select-none">
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
              stroke="#38bdf8"
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

      {/* 2. Site Leaderboard Ranking */}
      <div className="p-4 rounded-2xl bg-white dark:bg-space-850 border border-slate-200 dark:border-space-700 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span>Site Suitability Leaderboard (NASA Hackathon Scoring)</span>
        </h3>

        <div className="space-y-2">
          {rankedSites.map(({ site, metrics }, idx) => (
            <div
              key={site.id}
              onClick={() => onSelectSite(site)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-wrap items-center justify-between gap-3 ${
                site.id === currentSite.id
                  ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500/60 shadow-sm'
                  : 'bg-slate-50 dark:bg-space-800 border-slate-200 dark:border-space-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                  idx === 0 ? 'bg-amber-400 text-slate-950 font-black' :
                  idx === 1 ? 'bg-slate-300 text-slate-900' :
                  idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-200 dark:bg-space-700 text-slate-600 dark:text-slate-300'
                }`}>
                  #{idx + 1}
                </span>

                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{site.name}</span>
                    {site.id === currentSite.id && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-600 text-white font-normal">Active</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {site.category} · {site.elevationKm > 0 ? `+${site.elevationKm}` : site.elevationKm} km elevation
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="text-right">
                  <div className="text-amber-500 font-bold">{(metrics.illuminationFraction * 100).toFixed(1)}% Sun</div>
                  <div className="text-slate-400 text-[10px]">Max shadow: {metrics.longestContinuousShadowHours}h</div>
                </div>

                <div className="text-right">
                  <div className="text-sky-500 font-bold">{(metrics.earthVisibilityFraction * 100).toFixed(1)}% Earth</div>
                  <div className="text-slate-400 text-[10px]">Comm: {metrics.commRating}</div>
                </div>

                <div className="p-2 rounded-xl bg-slate-900 text-white text-center min-w-[70px]">
                  <div className="text-[9px] uppercase font-bold text-slate-400">Score</div>
                  <div className="text-sm font-black text-amber-400">{metrics.powerScore}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Deep Educational Insight: Why Small Changes Matter */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-blue-500/10 to-indigo-500/10 border border-amber-500/20 text-xs leading-relaxed space-y-2">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
          <Lightbulb className="w-4 h-4" />
          <span>Why Milliradians & Local Topography Decide Mission Success</span>
        </div>
        <p className="text-slate-700 dark:text-slate-300">
          At the lunar south pole, the Sun skims across the horizon at an angle of merely <strong>1.0° to 2.2°</strong>. As a result, a topographic ridge just <strong>200 meters high</strong> several kilometers away can cast a shadow that plunges a solar-powered lander into cryogenic freezing for up to 50 hours!
        </p>
        <p className="text-slate-700 dark:text-slate-300">
          Similarly, the Earth is tilted by <strong>±6.7° to ±7.7°</strong> due to optical and physical libration. Mountain massifs like <strong>Malapert Massif</strong> sit sufficiently high (5 km) that the Earth never dips below the local skyline, maintaining 100% direct line-of-sight communication without requiring orbital relay spacecraft like CAPSTONE or Queqiao.
        </p>
      </div>
    </div>
  );
};
