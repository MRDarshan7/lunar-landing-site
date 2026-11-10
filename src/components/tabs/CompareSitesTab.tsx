import React, { useMemo, useState } from 'react';
import { LandingSite } from '../../types';
import { EphemerisEngine } from '../../ephemeris/engine';
import { HorizonManager } from '../../terrain/horizon';
import { Layers, CheckSquare, Square, Zap, Radio, Sun, CalendarClock, ShieldAlert, ArrowRight } from 'lucide-react';

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
  const [viewMode, setViewMode] = useState<'sites' | 'launch_slip'>('sites');
  const [slipSiteId, setSlipSiteId] = useState<string>(selectedSiteIds[0] || allSites[0]?.id || 'shackleton-connecting-ridge');

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

  // Compute launch slip scenarios for Launch Slip mode
  const slipTargetSite = useMemo(() => {
    return allSites.find(s => s.id === slipSiteId) || allSites[0];
  }, [allSites, slipSiteId]);

  const launchSlipScenarios = useMemo(() => {
    if (!slipTargetSite) return [];
    return EphemerisEngine.computeLaunchSlipScenarios(slipTargetSite, targetDate, [0, 7, 14, 21]);
  }, [slipTargetSite, targetDate]);

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-slate-100 font-sans">
      {/* Mode Switcher & Header */}
      <div className="p-4 rounded-2xl bg-slate-950/85 border border-slate-800 shadow-md backdrop-blur-md flex flex-col gap-3 font-mono">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              <span>Multi-Site Candidate Comparison & Schedule Risk</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">
              Evaluate solar power viability, shadow blackout duration, and direct Earth telemetry margins across landing zones and launch schedule delays.
            </p>
          </div>

          {/* Mode Switcher Pills */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-700/60 text-xs">
            <button
              onClick={() => setViewMode('sites')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === 'sites'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Candidate Sites Matrix
            </button>
            <button
              onClick={() => setViewMode('launch_slip')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === 'launch_slip'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarClock className="w-3.5 h-3.5" />
              <span>Launch Slip Analysis (+0d to +21d)</span>
            </button>
          </div>
        </div>

        {/* View Mode 1: Candidate Site Selector */}
        {viewMode === 'sites' && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
            {allSites.map(site => {
              const isSelected = selectedSiteIds.includes(site.id);
              return (
                <button
                  key={site.id}
                  onClick={() => onToggleSiteSelection(site.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                    isSelected
                      ? 'bg-blue-600/30 text-cyan-300 border-cyan-500/60 shadow-sm'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-cyan-400" /> : <Square className="w-3.5 h-3.5" />}
                  <span>{site.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* View Mode 2: Launch Slip Site Target Selector */}
        {viewMode === 'launch_slip' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800 text-xs">
            <span className="text-slate-400 font-bold uppercase">Evaluate Site under Schedule Slips:</span>
            <select
              value={slipSiteId}
              onChange={(e) => setSlipSiteId(e.target.value)}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {allSites.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* VIEW 1: Candidate Sites Matrix Table */}
      {viewMode === 'sites' && (
        <>
          <div className="p-4 rounded-2xl bg-slate-950/85 border border-slate-800 shadow-md overflow-x-auto font-mono text-xs">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center justify-between">
              <span>Candidate Sites Performance Matrix</span>
              <span className="text-xs text-slate-400 font-normal">Epoch: {targetDate.toISOString().slice(0, 10)}</span>
            </h3>

            <table className="w-full text-left" role="table">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="py-2.5 px-3">Candidate Site</th>
                  <th className="py-2.5 px-3">Coordinates & Elev</th>
                  <th className="py-2.5 px-3">Illumination %</th>
                  <th className="py-2.5 px-3">Earth Link %</th>
                  <th className="py-2.5 px-3">Max Continuous Sun</th>
                  <th className="py-2.5 px-3">Max Shadow</th>
                  <th className="py-2.5 px-3">Power Score</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {comparedData.map(({ site, metrics }) => (
                  <tr key={site.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 px-3 font-sans font-bold text-white">
                      <div>{site.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono font-normal">{site.category}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-300 tabular-nums">
                      {Math.abs(site.lat).toFixed(1)}°{site.lat < 0 ? 'S' : 'N'}, {Math.abs(site.lon).toFixed(1)}°{site.lon < 0 ? 'W' : 'E'}
                      <div className="text-[10px] text-slate-400">{site.elevationKm > 0 ? `+${site.elevationKm}` : site.elevationKm} km</div>
                    </td>
                    <td className="py-3 px-3 tabular-nums">
                      <div className="font-bold text-amber-400">
                        {(metrics.illuminationFraction * 100).toFixed(1)}%
                      </div>
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                        <div style={{ width: `${metrics.illuminationFraction * 100}%` }} className="h-full bg-amber-500"></div>
                      </div>
                    </td>
                    <td className="py-3 px-3 tabular-nums">
                      <div className="font-bold text-cyan-400">
                        {(metrics.earthVisibilityFraction * 100).toFixed(1)}%
                      </div>
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                        <div style={{ width: `${metrics.earthVisibilityFraction * 100}%` }} className="h-full bg-cyan-500"></div>
                      </div>
                    </td>
                    <td className="py-3 px-3 tabular-nums font-semibold text-slate-200">
                      {metrics.longestContinuousSunHours} h
                    </td>
                    <td className="py-3 px-3 tabular-nums">
                      <span className={`font-semibold ${metrics.longestContinuousShadowHours > 100 ? 'text-rose-400' : 'text-slate-200'}`}>
                        {metrics.longestContinuousShadowHours} h
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-1 rounded text-xs font-bold bg-slate-900 text-white border border-slate-700">
                        {metrics.powerScore} / 100
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => onSelectAsPrimary(site)}
                        className="px-2.5 py-1 text-[11px] font-mono font-semibold rounded-lg bg-blue-950/60 text-cyan-300 hover:bg-blue-900/60 border border-cyan-500/40"
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
            <div className="p-4 rounded-2xl bg-slate-950/85 border border-slate-800 shadow-md font-mono">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Solar Illumination Fraction (%)</span>
              </h4>
              <div className="space-y-3 text-xs">
                {comparedData.map(({ site, metrics }) => (
                  <div key={site.id}>
                    <div className="flex justify-between font-semibold mb-1">
                      <span className="text-slate-200 font-sans">{site.name}</span>
                      <span className="text-amber-300 tabular-nums">{(metrics.illuminationFraction * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${metrics.illuminationFraction * 100}%` }}
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/85 border border-slate-800 shadow-md font-mono">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-cyan-400" />
                <span>Direct Earth Link Continuity (%)</span>
              </h4>
              <div className="space-y-3 text-xs">
                {comparedData.map(({ site, metrics }) => (
                  <div key={site.id}>
                    <div className="flex justify-between font-semibold mb-1">
                      <span className="text-slate-200 font-sans">{site.name}</span>
                      <span className="text-cyan-300 tabular-nums">{(metrics.earthVisibilityFraction * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${metrics.earthVisibilityFraction * 100}%` }}
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* VIEW 2: Launch Slip / Schedule Delay Analysis */}
      {viewMode === 'launch_slip' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-950/85 border border-slate-800 shadow-md font-mono text-xs overflow-x-auto">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-amber-400" />
              <span>Launch Slip Analysis for: {slipTargetSite.name}</span>
            </h3>
            <p className="text-slate-400 font-sans text-xs mb-3">
              How hardware delays or scrubbed launch windows impact illumination windows and survival risk over 29.53-day synodic lunar cycles:
            </p>

            <table className="w-full text-left" role="table">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="py-2.5 px-3">Slip Scenario</th>
                  <th className="py-2.5 px-3">T-0 Epoch (UTC)</th>
                  <th className="py-2.5 px-3">Illumination %</th>
                  <th className="py-2.5 px-3">Max Shadow</th>
                  <th className="py-2.5 px-3">DTE Link %</th>
                  <th className="py-2.5 px-3">Power Score</th>
                  <th className="py-2.5 px-3">Risk Assessment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {launchSlipScenarios.map((sc) => {
                  const isDegraded = sc.metrics.longestContinuousShadowHours > 100;
                  return (
                    <tr key={sc.slipDays} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 px-3 font-bold text-white">
                        <span className={sc.slipDays === 0 ? 'text-cyan-400' : 'text-amber-400'}>
                          {sc.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300 tabular-nums">
                        {sc.epochDate.toISOString().replace('T', ' ').slice(0, 16)} UTC
                      </td>
                      <td className="py-3 px-3 tabular-nums font-bold text-amber-400">
                        {(sc.metrics.illuminationFraction * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-3 tabular-nums">
                        <span className={`font-bold ${isDegraded ? 'text-rose-400' : 'text-slate-200'}`}>
                          {sc.metrics.longestContinuousShadowHours} h
                        </span>
                      </td>
                      <td className="py-3 px-3 tabular-nums text-cyan-400 font-bold">
                        {(sc.metrics.earthVisibilityFraction * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-1 rounded text-xs font-bold bg-slate-900 text-white border border-slate-700">
                          {sc.metrics.powerScore} / 100
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            sc.metrics.powerScore >= 75
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                              : sc.metrics.powerScore >= 50
                              ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                              : 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                          }`}
                        >
                          {sc.metrics.powerScore >= 75 ? 'NOMINAL' : sc.metrics.powerScore >= 50 ? 'SURVIVABLE' : 'CRITICAL SHADOW'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Comparative Slip Visual Bars */}
          <div className="p-4 rounded-2xl bg-slate-950/85 border border-slate-800 shadow-md font-mono text-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Comparative 29.5-Day Illumination & Shadow Profiles across Slips</span>
            </h4>
            <div className="space-y-3">
              {launchSlipScenarios.map(sc => (
                <div key={sc.slipDays} className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                  <div className="flex justify-between items-center mb-1.5 font-bold">
                    <span className="text-white">{sc.label}</span>
                    <span className="text-amber-300 tabular-nums">
                      {(sc.metrics.illuminationFraction * 100).toFixed(1)}% Light · Max Shadow: {sc.metrics.longestContinuousShadowHours}h
                    </span>
                  </div>
                  <div className="w-full h-3 bg-rose-950/80 rounded-full overflow-hidden flex border border-slate-700/60">
                    <div
                      style={{ width: `${sc.metrics.illuminationFraction * 100}%` }}
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-300"
                      title="Illuminated Window"
                    />
                    <div
                      style={{ width: `${(1 - sc.metrics.illuminationFraction) * 100}%` }}
                      className="h-full bg-rose-900/60"
                      title="Solar Shadow Window"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
