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
  const categories = Array.from(new Set(allSites.map(s => s.category)));

  const epochIso = currentEpochDate.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const targetDateInputVal = targetDate.toISOString().slice(0, 10);

  return (
    <aside className="w-full md:w-72 lg:w-80 flex flex-col gap-3 overflow-y-auto pr-1 select-none text-slate-100 font-sans">
      {/* 1. Landing Site Selection Card */}
      <div className="p-3.5 rounded-2xl bg-slate-950/85 border border-slate-800/80 shadow-md backdrop-blur-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              Target Landing Site
            </h2>
          </div>
          <button
            onClick={onOpenCustomSite}
            className="flex items-center gap-1 text-[11px] font-mono font-semibold text-cyan-400 hover:text-cyan-300 hover:underline"
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
          className="w-full p-2 text-xs font-mono font-semibold rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          aria-label="Select Landing Site"
        >
          {categories.map(cat => (
            <optgroup key={cat} label={`── ${cat} ──`} className="bg-slate-950 text-slate-300">
              {allSites.filter(s => s.category === cat).map(s => (
                <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                  {s.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {/* Site Details */}
        <div className="mt-2.5 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono">
          <div className="flex justify-between items-center text-slate-300 text-[11px] tabular-nums">
            <span>Lat: <strong>{Math.abs(currentSite.lat).toFixed(2)}°{currentSite.lat < 0 ? 'S' : 'N'}</strong></span>
            <span>Lon: <strong>{Math.abs(currentSite.lon).toFixed(2)}°{currentSite.lon < 0 ? 'W' : 'E'}</strong></span>
            <span>Elev: <strong>{currentSite.elevationKm > 0 ? `+${currentSite.elevationKm}` : currentSite.elevationKm} km</strong></span>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wide border ${
                currentSite.isApproximateTerrain
                  ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                  : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              }`}
            >
              {currentSite.isApproximateTerrain ? '[Approximate Profile]' : '[Real LOLA Topography]'}
            </span>
          </div>

          <p className="mt-2 text-[11px] text-slate-400 leading-snug font-sans">
            {currentSite.description}
          </p>

          {mode === 'explain' && (
            <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-amber-300/90 flex gap-1.5 items-start font-sans">
              <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
              <span>
                <strong>Science Objective:</strong> {currentSite.scienceTarget}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Epoch & Mission Time Control Card */}
      <div className="p-3.5 rounded-2xl bg-slate-950/85 border border-slate-800/80 shadow-md backdrop-blur-md font-mono text-xs">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white mb-2.5">
          <CalendarDays className="w-3.5 h-3.5 text-blue-400" />
          <span>Epoch & Mission Time</span>
        </div>

        {/* Current Active UTC Epoch Badge */}
        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 mb-3 flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold text-slate-400">Current UTC</span>
          <span className="text-xs font-bold tabular-nums text-cyan-300">{epochIso}</span>
        </div>

        {/* Mission Day Scrubber */}
        <div className="space-y-1.5 mb-3">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-400">Mission Sol / Day</span>
            <span className="text-xs font-bold tabular-nums text-amber-300">
              Day {missionDay.toFixed(2)} <span className="text-slate-500 text-[10px]">/ 29.53d</span>
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="29.53"
            step="0.1"
            value={missionDay}
            onChange={(e) => onSetMissionDay(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            aria-label="Mission Day Scrub"
          />
        </div>

        {/* Base Calendar Date Picker */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
          <span className="text-slate-400">Base Date</span>
          <input
            type="date"
            value={targetDateInputVal}
            onChange={(e) => {
              if (e.target.value) {
                const newDate = new Date(`${e.target.value}T12:00:00Z`);
                if (!isNaN(newDate.getTime())) onSetTargetDate(newDate);
              }
            }}
            className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
          />
        </div>
      </div>

      {/* 3. Layer Visibility Toggles */}
      <div className="p-3.5 rounded-2xl bg-slate-950/85 border border-slate-800/80 shadow-md backdrop-blur-md font-mono text-xs">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white mb-2.5">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span>Instrument Layers</span>
        </div>

        <div className="space-y-1.5 text-[11px]">
          <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-900 cursor-pointer">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span className="text-slate-300">Sun 29.5d Trajectory</span>
            </span>
            <input
              type="checkbox"
              checked={layers.sunPath}
              onChange={() => onToggleLayer('sunPath')}
              className="rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-0"
            />
          </label>

          <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-900 cursor-pointer">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
              <span className="text-slate-300">Earth Libration Loop</span>
            </span>
            <input
              type="checkbox"
              checked={layers.earthPath}
              onChange={() => onToggleLayer('earthPath')}
              className="rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-0"
            />
          </label>

          <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-900 cursor-pointer">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
              <span className="text-slate-300">3D LOLA Skyline Wall</span>
            </span>
            <input
              type="checkbox"
              checked={layers.terrain}
              onChange={() => onToggleLayer('terrain')}
              className="rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-0"
            />
          </label>

          <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-900 cursor-pointer">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
              <span className="text-slate-300">Polar Azimuth Graticule</span>
            </span>
            <input
              type="checkbox"
              checked={layers.grid}
              onChange={() => onToggleLayer('grid')}
              className="rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-0"
            />
          </label>
        </div>
      </div>
    </aside>
  );
};
