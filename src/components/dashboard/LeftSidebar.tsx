import React from 'react';
import { LandingSite } from '../../types';
import {
  MapPin,
  Clock,
  Layers,
  Mountain,
  PlusCircle,
  HelpCircle,
  CalendarDays,
  Activity
} from 'lucide-react';

interface LeftSidebarProps {
  currentSite: LandingSite;
  allSites: LandingSite[];
  targetDate: Date;
  missionDay: number;
  currentEpochDate: Date;
  layers: {
    sunPath: boolean;
    earthPath: boolean;
    terrain: boolean;
    grid: boolean;
    rays: boolean;
  };
  mode: 'technical' | 'explain';
  onSelectSite: (site: LandingSite) => void;
  onSetTargetDate: (date: Date) => void;
  onSetMissionDay: (day: number) => void;
  onToggleLayer: (layer: keyof LeftSidebarProps['layers']) => void;
  onOpenCustomSite: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  currentSite,
  allSites,
  targetDate,
  missionDay,
  currentEpochDate,
  layers,
  mode,
  onSelectSite,
  onSetTargetDate,
  onSetMissionDay,
  onToggleLayer,
  onOpenCustomSite
}) => {
  // Group sites by category
  const categories = Array.from(new Set(allSites.map(s => s.category)));

  // Format dates
  const epochIso = currentEpochDate.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const targetDateInputVal = targetDate.toISOString().slice(0, 10);

  return (
    <aside className="w-full md:w-72 lg:w-80 flex flex-col gap-3 overflow-y-auto pr-1 select-none text-slate-800 dark:text-slate-100">
      {/* 1. Landing Site Selection Card */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-space-850 border border-slate-200 dark:border-space-700 shadow-sm transition-all">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Landing Site
            </h2>
          </div>
          <button
            onClick={onOpenCustomSite}
            className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            title="Add custom coordinates or upload LOLA profile"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Custom / LOLA</span>
          </button>
        </div>

        <select
          value={currentSite.id}
          onChange={(e) => {
            const found = allSites.find(s => s.id === e.target.value);
            if (found) onSelectSite(found);
          }}
          className="w-full p-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-space-800 border border-slate-200 dark:border-space-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Select Landing Site"
        >
          {categories.map(cat => (
            <optgroup key={cat} label={`── ${cat} ──`}>
              {allSites.filter(s => s.category === cat).map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {/* Site Details */}
        <div className="mt-2.5 p-2 rounded-xl bg-slate-50 dark:bg-space-900/60 border border-slate-100 dark:border-space-750 text-xs">
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-300 font-mono text-[11px]">
            <span>Lat: {Math.abs(currentSite.lat).toFixed(2)}° {currentSite.lat < 0 ? 'S' : 'N'}</span>
            <span>Lon: {Math.abs(currentSite.lon).toFixed(2)}° {currentSite.lon < 0 ? 'W' : 'E'}</span>
            <span>Elev: {currentSite.elevationKm > 0 ? `+${currentSite.elevationKm}` : currentSite.elevationKm} km</span>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border ${
                currentSite.isApproximateTerrain
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              }`}
              title={
                currentSite.isApproximateTerrain
                  ? 'Horizon elevation profile is synthetically approximated from LOLA features. Upload real 360° LOLA raycasts via + Custom Site.'
                  : 'Horizon skyline derived from high-resolution Lunar Orbiter Laser Altimeter DEM.'
              }
            >
              {currentSite.isApproximateTerrain ? 'Approximate Profile' : 'Real LOLA Topography'}
            </span>
          </div>

          <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            {currentSite.description}
          </p>

          {mode === 'explain' && (
            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-space-700 text-[10px] text-amber-600 dark:text-amber-300/90 flex gap-1 items-start">
              <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
              <span>
                <strong>Why this site matters:</strong> {currentSite.scienceTarget}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Date & Mission Time Card */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-space-850 border border-slate-200 dark:border-space-700 shadow-sm transition-all">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-amber-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Mission Time & Epoch
          </h2>
        </div>

        {/* Real Calendar Date Input */}
        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex-1">
            <input
              type="date"
              value={targetDateInputVal}
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  const d = new Date(val + 'T12:00:00Z');
                  if (!isNaN(d.getTime())) onSetTargetDate(d);
                }
              }}
              className="w-full p-1.5 px-2 text-xs font-mono font-medium rounded-lg bg-slate-50 dark:bg-space-800 border border-slate-200 dark:border-space-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="Mission Reference Date"
            />
          </div>
          <button
            onClick={() => onSetTargetDate(new Date('2026-07-03T12:00:00Z'))}
            title="Set to Southern Summer Solstice (optimal polar lighting)"
            className="px-2 py-1.5 text-[10px] font-semibold rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100"
          >
            Solstice
          </button>
        </div>

        {/* Live Epoch Readout */}
        <div className="p-2 rounded-xl bg-slate-900 text-slate-100 font-mono text-center text-xs shadow-inner">
          <div className="text-[10px] text-blue-400 font-sans uppercase font-bold tracking-wider">
            Simulated Observation Epoch
          </div>
          <div className="text-sm font-semibold tracking-wide text-white mt-0.5">
            {epochIso}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Lunar Day: <strong>{missionDay.toFixed(2)}</strong> / 29.53 synodic cycle
          </div>
        </div>

        {/* Mission Day Quick Scrubber */}
        <div className="mt-3">
          <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono mb-1">
            <span>Day 0 (New Moon)</span>
            <span>Day 14.8 (Full)</span>
            <span>Day 29.5</span>
          </div>
          <input
            type="range"
            min="0"
            max="29.53"
            step="0.05"
            value={missionDay}
            onChange={(e) => onSetMissionDay(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-200 dark:bg-space-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            aria-label="Mission Day in Synodic Month"
          />
        </div>
      </div>

      {/* 3. Layers Checklist Card */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-space-850 border border-slate-200 dark:border-space-700 shadow-sm transition-all">
        <div className="flex items-center gap-2 mb-2.5">
          <Layers className="w-4 h-4 text-emerald-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Display Layers
          </h2>
        </div>

        <div className="space-y-2 text-xs">
          <label className="flex items-center justify-between cursor-pointer hover:opacity-80">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50"></span>
              <span>Sun 29.5-day Path</span>
            </span>
            <input
              type="checkbox"
              checked={layers.sunPath}
              onChange={() => onToggleLayer('sunPath')}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer hover:opacity-80">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-sm shadow-sky-400/50"></span>
              <span>Earth Libration Loop</span>
            </span>
            <input
              type="checkbox"
              checked={layers.earthPath}
              onChange={() => onToggleLayer('earthPath')}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer hover:opacity-80">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
              <span>3D LOLA Terrain Rim</span>
            </span>
            <input
              type="checkbox"
              checked={layers.terrain}
              onChange={() => onToggleLayer('terrain')}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer hover:opacity-80">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span>Celestial Dome Grid</span>
            </span>
            <input
              type="checkbox"
              checked={layers.grid}
              onChange={() => onToggleLayer('grid')}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer hover:opacity-80">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span>Line-of-Sight Rays</span>
            </span>
            <input
              type="checkbox"
              checked={layers.rays}
              onChange={() => onToggleLayer('rays')}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
          </label>
        </div>
      </div>
    </aside>
  );
};
