import React from 'react';
import { Radio } from 'lucide-react';
import { getMissionTelemetry } from '../../ephemeris/telemetryConductor';

interface ScrollTelemetryHudProps {
  progress: number;
}

export const ScrollTelemetryHud: React.FC<ScrollTelemetryHudProps> = ({ progress }) => {
  // Only display during the flight phases (0.06 to 0.86)
  const isVisible = progress > 0.06 && progress < 0.88;
  const opacity = Math.min(1, Math.max(0, (progress - 0.06) / 0.04)) * Math.min(1, Math.max(0, (0.88 - progress) / 0.04));

  if (!isVisible) return null;

  const telemetry = getMissionTelemetry(progress);

  return (
    <div
      style={{ opacity }}
      className="fixed top-4 left-4 z-20 pointer-events-none select-none text-white font-mono text-xs transition-opacity duration-150"
    >
      <div className="p-3 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-slate-700/60 shadow-xl space-y-1.5 min-w-[260px]">
        <div className="flex items-center justify-between text-[10px] text-blue-400 font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Telemetry Uplink</span>
          </span>
          <span className="px-1.5 py-0.2 rounded bg-blue-900/40 text-blue-300 border border-blue-700/50">
            Beat {telemetry.beatIndex} / 8
          </span>
        </div>

        <div className="text-xs font-sans font-bold text-slate-100">
          {telemetry.stageName}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-700/60 text-[11px]">
          <div>
            <span className="text-slate-400 text-[10px] block">
              {telemetry.isDescent ? 'Altitude to Surface' : 'Mission Altitude'}
            </span>
            <span className="font-bold text-sky-400">{telemetry.altitudeStr}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] block">
              {telemetry.isDescent ? 'Descent Velocity' : 'Orbital Velocity'}
            </span>
            <span className="font-bold text-amber-400">{telemetry.velocityStr}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
