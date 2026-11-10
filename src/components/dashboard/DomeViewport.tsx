import React from 'react';
import { SiteMetrics, LandingSite, CountdownEvents } from '../../types';
import { RotateCcw, Clock, Sun, Radio, Activity } from 'lucide-react';

interface DomeViewportProps {
  currentSite: LandingSite;
  metrics: SiteMetrics;
  countdownEvents?: CountdownEvents;
  onResetView?: () => void;
}

export const DomeViewport: React.FC<DomeViewportProps> = ({
  currentSite,
  metrics,
  countdownEvents,
  onResetView
}) => {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center select-none pointer-events-none">
      {/* Floating HUD Cardinal & Zenith Labels */}
      <div className="absolute inset-4 pointer-events-none flex flex-col justify-between">
        {/* Top Header: Mission Clocks & Zenith Indicator */}
        <div className="w-full flex items-center justify-between pointer-events-auto">
          {/* Interactive Orbit Hint */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[11px] font-mono text-slate-300 shadow-lg">
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Orbit: Drag · Zoom: Wheel · Lander Centered</span>
            <span className="sm:hidden">Drag to Orbit</span>
          </div>

          {/* Central Live Mission-Clock Countdown HUD */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-800 text-xs font-mono shadow-xl">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400 text-[10px] hidden md:inline">
                {countdownEvents ? `NEXT ${countdownEvents.nextSolarEvent.type.toUpperCase()}:` : 'SOLAR:'}
              </span>
              <span className="font-bold text-amber-300 tabular-nums">
                {countdownEvents ? countdownEvents.nextSolarEvent.formattedCountdown : (metrics.sunInView ? 'SUNLIT' : 'SHADOW')}
              </span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-800 text-xs font-mono shadow-xl">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400 text-[10px] hidden md:inline">DTE COMMS:</span>
              <span className="font-bold text-cyan-300 tabular-nums">
                {countdownEvents ? countdownEvents.nextEarthEvent.formattedCountdown : (metrics.earthInView ? 'LINK OPEN' : 'BLACKOUT')}
              </span>
            </div>
          </div>

          {/* Zenith Indicator */}
          <div>
            <span className="px-3 py-1.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[11px] font-mono font-bold text-slate-300 shadow-md">
              Zenith (90°)
            </span>
          </div>
        </div>

        {/* Center compass indicators */}
        <div className="flex justify-between items-center px-4 text-xs font-mono font-semibold text-slate-400">
          <span className="px-2.5 py-1 rounded-lg bg-slate-950/70 backdrop-blur-md border border-slate-800 shadow">
            270° W
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-950/70 backdrop-blur-md border border-slate-800 shadow">
            90° E
          </span>
        </div>

        {/* Bottom Cardinal Indicator */}
        <div className="flex justify-between items-center px-4 text-xs font-mono font-semibold text-slate-400">
          <span className="px-2.5 py-1 rounded-lg bg-slate-950/70 backdrop-blur-md border border-slate-800 shadow">
            0° N (Earthward)
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-950/70 backdrop-blur-md border border-slate-800 shadow">
            180° S
          </span>
        </div>
      </div>

      {/* Accessible Screen-Reader Alternative Table */}
      <div className="sr-only">
        <h2>Accessible Line of Sight Telemetry Table</h2>
        <table>
          <caption>Current celestial elevation and azimuth at {currentSite.name}</caption>
          <thead>
            <tr>
              <th>Body</th>
              <th>Elevation</th>
              <th>Azimuth</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Sun</td>
              <td>{metrics.currentSunElevation} degrees</td>
              <td>{metrics.currentSunAzimuth} degrees</td>
              <td>{metrics.sunInView ? 'Clear line of sight (illuminated)' : 'Blocked by terrain (shadow)'}</td>
            </tr>
            <tr>
              <td>Earth</td>
              <td>{metrics.currentEarthElevation} degrees</td>
              <td>{metrics.currentEarthAzimuth} degrees</td>
              <td>{metrics.earthInView ? 'Direct communications line of sight open' : 'Blocked by terrain or occulted by Moon'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
