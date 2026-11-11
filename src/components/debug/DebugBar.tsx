import React, { useState, useEffect } from 'react';
import { getMissionTelemetry } from '../../ephemeris/telemetryConductor';
import { Bug, ChevronLeft, ChevronRight, Play, RotateCcw, X } from 'lucide-react';

interface DebugBarProps {
  progress: number;
  onSetProgress: (p: number) => void;
  conductorInfo?: {
    landerPos: [number, number, number];
    cameraPos: [number, number, number];
    isBoosterDetached: boolean;
    isFairingDetached: boolean;
    isLanderReleased: boolean;
  };
}

export const DebugBar: React.FC<DebugBarProps> = ({
  progress,
  onSetProgress,
  conductorInfo
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const telemetry = getMissionTelemetry(progress);

  const keyBeats = [
    { label: '0.00 Hero', p: 0.0 },
    { label: '0.10 Lift', p: 0.10 },
    { label: '0.25 Asc', p: 0.25 },
    { label: '0.40 Boost', p: 0.40 },
    { label: '0.50 Fair', p: 0.50 },
    { label: '0.58 Rel', p: 0.58 },
    { label: '0.70 Desc', p: 0.70 },
    { label: '0.78 Term', p: 0.78 },
    { label: '0.83 Land', p: 0.83 },
    { label: '0.90 Morph', p: 0.90 },
    { label: '1.00 Dome', p: 1.0 }
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-16 right-4 z-50 p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg flex items-center gap-1.5 transition-all"
        title="Open Debug Toolbar"
      >
        <Bug className="w-4 h-4" />
        <span>DEBUG</span>
      </button>
    );
  }

  return (
    <div className="fixed top-16 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] p-3.5 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-amber-500/50 shadow-2xl text-xs font-mono text-slate-200 select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700">
        <div className="flex items-center gap-2 text-amber-400 font-bold">
          <Bug className="w-4 h-4" />
          <span>MISSION DEBUG CONSOLE (?debug=1)</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Scrubber */}
      <div className="space-y-1.5 mb-2.5">
        <div className="flex justify-between text-[11px]">
          <span className="text-amber-300 font-bold">
            p = {progress.toFixed(4)}
          </span>
          <span className="text-slate-400">
            Beat {telemetry.beatIndex}: {telemetry.beatName}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.001"
          value={progress}
          onChange={(e) => onSetProgress(parseFloat(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
        />
      </div>

      {/* Frame by Frame Steppers */}
      <div className="flex items-center justify-between gap-1 mb-2.5">
        <div className="flex gap-1">
          <button
            onClick={() => onSetProgress(Math.max(0, progress - 0.01))}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px]"
          >
            -0.01
          </button>
          <button
            onClick={() => onSetProgress(Math.max(0, progress - 0.002))}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px]"
          >
            -0.002
          </button>
        </div>

        <span className="text-[10px] text-slate-400 font-sans">Step Controls</span>

        <div className="flex gap-1">
          <button
            onClick={() => onSetProgress(Math.min(1, progress + 0.002))}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px]"
          >
            +0.002
          </button>
          <button
            onClick={() => onSetProgress(Math.min(1, progress + 0.01))}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px]"
          >
            +0.01
          </button>
        </div>
      </div>

      {/* Quick Jump Buttons */}
      <div className="grid grid-cols-4 gap-1 text-[9px] mb-2.5">
        {keyBeats.map((b) => (
          <button
            key={b.label}
            onClick={() => onSetProgress(b.p)}
            className={`px-1 py-1 rounded border text-center transition-colors ${
              Math.abs(progress - b.p) < 0.01
                ? 'bg-amber-400 text-slate-950 font-bold border-amber-300'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* Craft World Coordinates & Debris Telemetry */}
      {conductorInfo && (
        <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-[10px] space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-400">Lander World:</span>
            <span className="text-emerald-400 font-bold">
              [{conductorInfo.landerPos.map(v => v.toFixed(2)).join(', ')}]
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Camera World:</span>
            <span className="text-sky-400 font-bold">
              [{conductorInfo.cameraPos.map(v => v.toFixed(2)).join(', ')}]
            </span>
          </div>
          <div className="flex justify-between pt-1 border-t border-slate-800 text-[9px]">
            <span>Booster: {conductorInfo.isBoosterDetached ? 'DETACHED' : 'ATTACHED'}</span>
            <span>Fairings: {conductorInfo.isFairingDetached ? 'JETTISONED' : 'ATTACHED'}</span>
            <span>Lander: {conductorInfo.isLanderReleased ? 'RELEASED' : 'STOWED'}</span>
          </div>
        </div>
      )}
    </div>
  );
};
