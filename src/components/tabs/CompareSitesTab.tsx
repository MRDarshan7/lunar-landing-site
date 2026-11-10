import React, { useMemo } from 'react';
import { LandingSite } from '../../types';
import { EphemerisEngine } from '../../ephemeris/engine';
import { HorizonManager } from '../../terrain/horizon';
import { Layers, CheckSquare, Square, TrendingUp, Zap, Radio, Sun } from 'lucide-react';

interface CompareSitesTabProps {
  allSites: LandingSite[];
  selectedSiteIds: string[];
  onToggleSiteSelection: (id: string) => void;
  targetDate: Date;
  onSelectAsPrimary: (site: LandingSite) => void;
}

export const CompareSitesTab: React.FC<CompareSitesTabProps> = ({
  allSites,
  selectedSiteIds,
  onToggleSiteSelection,
  targetDate,
  onSelectAsPrimary
}) => {
  // Compute metrics for all selected sites
  const comparedData = useMemo(() => {
    return selectedSiteIds.map(id => {
      const site = allSites.find(s => s.id === id);
      if (!site) return null;
      const hm = new HorizonManager(site.horizonProfile);
      const metrics = EphemerisEngine.computeSiteMetrics(site, targetDate, hm);
      return { site, metrics };
    }).filter(Boolean) as Array<{ site: LandingSite; metrics: ReturnType<typeof EphemerisEngine.computeSiteMetrics> }>;
  }, [allSites, selectedSiteIds, targetDate]);

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-slate-800 dark:text-slate-100">
      {/* Header & Site Selector */}
      <div className="p-4 rounded-2xl bg-white dark:bg-space-850 border border-slate-200 dark:border-space-700 shadow-sm flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-500" />
              <span>Multi-Site Candidate Comparison</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Compare 2 to 4 landing sites across identical astronomical epochs to evaluate solar power duration, blackout risks, and communication link margins.
            </p>
          </div>
        </div>

        {/* Site Toggle Pills */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-space-750">
          {allSites.map(site => {
            const isSelected = selectedSiteIds.includes(site.id);
            return (
              <button
                key={site.id}
                onClick={() => onToggleSiteSelection(site.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-space-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-space-700 hover:border-slate-300'
                }`}
              >
                {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                <span>{site.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Comparison Matrix Table */}
      <div className="p-4 rounded-2xl bg-white dark:bg-space-850 border border-slate-200 dark:border-space-700 shadow-sm overflow-x-auto">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
          Key Performance Indicators & Lighting Architecture
        </h3>

        <table className="w-full text-xs text-left" role="table">
          <thead>
            <tr className="border-b border-slate-200 dark:border-space-700 text-slate-500 font-mono text-[11px]">
              <th className="py-2.5 px-3">Candidate Site</th>
              <th className="py-2.5 px-3">Coordinates & Elevation</th>
              <th className="py-2.5 px-3">Illumination %</th>
              <th className="py-2.5 px-3">Earth Link %</th>
              <th className="py-2.5 px-3">Max Continuous Sun</th>
              <th className="py-2.5 px-3">Max Shadow</th>
              <th className="py-2.5 px-3">Power Score</th>
              <th className="py-2.5 px-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-space-750 font-mono">
            {comparedData.map(({ site, metrics }) => (
              <tr key={site.id} className="hover:bg-slate-50 dark:hover:bg-space-800 transition-colors">
                <td className="py-3 px-3 font-sans font-bold text-slate-900 dark:text-white">
                  <div>{site.name}</div>
                  <div className="text-[10px] text-slate-400 font-normal">{site.category}</div>
                </td>
                <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                  {Math.abs(site.lat).toFixed(1)}°{site.lat < 0 ? 'S' : 'N'}, {Math.abs(site.lon).toFixed(1)}°{site.lon < 0 ? 'W' : 'E'}
                  <div className="text-[10px] text-slate-400">{site.elevationKm > 0 ? `+${site.elevationKm}` : site.elevationKm} km</div>
                </td>
                <td className="py-3 px-3">
                  <div className="font-bold text-amber-600 dark:text-amber-400">
                    {(metrics.illuminationFraction * 100).toFixed(1)}%
                  </div>
                  <div className="w-16 h-1.5 bg-slate-200 dark:bg-space-700 rounded-full overflow-hidden mt-1">
                    <div style={{ width: `${metrics.illuminationFraction * 100}%` }} className="h-full bg-amber-500"></div>
                  </div>
                </td>
                <td className="py-3 px-3">
                  <div className="font-bold text-sky-600 dark:text-sky-400">
                    {(metrics.earthVisibilityFraction * 100).toFixed(1)}%
                  </div>
                  <div className="w-16 h-1.5 bg-slate-200 dark:bg-space-700 rounded-full overflow-hidden mt-1">
                    <div style={{ width: `${metrics.earthVisibilityFraction * 100}%` }} className="h-full bg-sky-500"></div>
                  </div>
                </td>
                <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                  {metrics.longestContinuousSunHours} h
                </td>
                <td className="py-3 px-3">
                  <span className={`font-semibold ${metrics.longestContinuousShadowHours > 100 ? 'text-rose-500' : 'text-slate-800 dark:text-slate-200'}`}>
                    {metrics.longestContinuousShadowHours} h
                  </span>
                </td>
                <td className="py-3 px-3">
                  <span className="px-2 py-1 rounded-lg text-xs font-bold font-mono bg-slate-100 dark:bg-space-800 text-slate-900 dark:text-white border border-slate-200 dark:border-space-700">
                    {metrics.powerScore} / 100
                  </span>
                </td>
                <td className="py-3 px-3">
                  <button
                    onClick={() => onSelectAsPrimary(site)}
                    className="px-2.5 py-1 text-[11px] font-sans font-semibold rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 hover:bg-blue-100 border border-blue-200 dark:border-blue-700"
                  >
                    Select Site
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Visual Comparative Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Illumination Comparison */}
        <div className="p-4 rounded-2xl bg-white dark:bg-space-850 border border-slate-200 dark:border-space-700 shadow-sm">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
            <Sun className="w-4 h-4 text-amber-500" />
            <span>Solar Illumination Duration (%)</span>
          </h4>
          <div className="space-y-3">
            {comparedData.map(({ site, metrics }) => (
              <div key={site.id} className="text-xs">
                <div className="flex justify-between font-semibold mb-1">
                  <span>{site.name}</span>
                  <span className="font-mono">{(metrics.illuminationFraction * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-space-750 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${metrics.illuminationFraction * 100}%` }}
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Earth Link Comparison */}
        <div className="p-4 rounded-2xl bg-white dark:bg-space-850 border border-slate-200 dark:border-space-700 shadow-sm">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-sky-500" />
            <span>Direct Earth Link Continuity (%)</span>
          </h4>
          <div className="space-y-3">
            {comparedData.map(({ site, metrics }) => (
              <div key={site.id} className="text-xs">
                <div className="flex justify-between font-semibold mb-1">
                  <span>{site.name}</span>
                  <span className="font-mono">{(metrics.earthVisibilityFraction * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-space-750 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${metrics.earthVisibilityFraction * 100}%` }}
                    className="h-full bg-gradient-to-r from-sky-500 to-blue-500 rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
