import React from 'react';
import { SiteMetrics, LandingSite } from '../../types';
import { Eye, RotateCcw, ZoomIn } from 'lucide-react';

interface DomeViewportProps {
  currentSite: LandingSite;
  metrics: SiteMetrics;
  onResetView?: () => void;
}

export const DomeViewport: React.FC<DomeViewportProps> = ({
  currentSite,
  metrics,
  onResetView
}) => {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center select-none pointer-events-none">
      {/* Floating HUD Cardinal & Zenith Labels */}
      <div className="absolute inset-4 pointer-events-none flex flex-col justify-between">
        {/* Top: Zenith */}
        <div className="w-full text-center">
          <span className="px-2.5 py-1 rounded-full bg-slate-900/70 backdrop-blur-md border border-slate-700/60 text-[11px] font-mono font-bold text-slate-200 shadow-md">
            Zenith (90°)
          </span>
        </div>

        {/* Center compass indicators */}
        <div className="flex justify-between items-center px-4 text-xs font-mono font-semibold text-slate-400">
          <span className="px-2 py-0.5 rounded bg-black/40 backdrop-blur-sm border border-slate-700/40">
            270° W
          </span>
          <span className="px-2 py-0.5 rounded bg-black/40 backdrop-blur-sm border border-slate-700/40">
            90° E
          </span>
        </div>

        {/* Bottom Cardinal Indicator */}
        <div className="flex justify-between items-center px-4 text-xs font-mono font-semibold text-slate-400">
          <span className="px-2 py-0.5 rounded bg-black/40 backdrop-blur-sm border border-slate-700/40">
            0° N
          </span>
          <span className="px-2 py-0.5 rounded bg-black/40 backdrop-blur-sm border border-slate-700/40">
            180° S
          </span>
        </div>
      </div>

      {/* Interactive Orbit Hint */}
      <div className="absolute top-4 left-4 pointer-events-auto flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-[11px] text-slate-300 shadow-md">
        <RotateCcw className="w-3.5 h-3.5 text-blue-400 animate-spin-slow" />
        <span>Drag to Orbit · Scroll to Zoom · Lander Centered</span>
      </div>

      {/* Accessible Screen-Reader Alternative Table (Visually hidden or expandable) */}
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
