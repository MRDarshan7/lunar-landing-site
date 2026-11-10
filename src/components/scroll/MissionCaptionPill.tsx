import React from 'react';
import { getMissionTelemetry } from '../../ephemeris/telemetryConductor';

interface MissionCaptionPillProps {
  progress: number;
}

export const MissionCaptionPill: React.FC<MissionCaptionPillProps> = ({ progress }) => {
  // Only display while in cinematic sequence (0.02 to 0.88)
  const isVisible = progress > 0.02 && progress < 0.88;
  if (!isVisible) return null;

  const telemetry = getMissionTelemetry(progress);

  return (
    <div className="fixed bottom-6 left-0 right-0 z-20 pointer-events-none flex justify-center px-4 select-none animate-in fade-in duration-200">
      <div className="px-4 py-2 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-slate-700/60 shadow-xl text-xs sm:text-sm font-medium font-sans text-slate-100 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
        <span>{telemetry.caption}</span>
      </div>
    </div>
  );
};
