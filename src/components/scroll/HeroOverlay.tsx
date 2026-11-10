import React from 'react';
import { ChevronDown, Compass, Rocket, ShieldCheck, ArrowRight } from 'lucide-react';

interface HeroOverlayProps {
  progress: number;
  onSkipToDashboard: () => void;
}

export const HeroOverlay: React.FC<HeroOverlayProps> = ({ progress, onSkipToDashboard }) => {
  // Fade out as user starts scrolling (0.0 to 0.12)
  const opacity = Math.max(0, 1 - progress / 0.10);
  const translateY = progress * -60;

  if (opacity <= 0.01) return null;

  return (
    <div
      style={{ opacity, transform: `translateY(${translateY}px)` }}
      className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-6 md:p-12 select-none text-white transition-opacity duration-200"
    >
      {/* Top Brand Bar */}
      <div className="flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-600/90 backdrop-blur-md border border-blue-400/40 text-white shadow-lg">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-blue-400">
              NASA Hackathon Challenge
            </span>
            <div className="text-[11px] text-slate-300 font-sans">
              Autonomous South Polar Exploration
            </div>
          </div>
        </div>

        <button
          onClick={onSkipToDashboard}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-xs font-semibold text-white transition-all shadow-md group"
        >
          <span>Skip to Sky-Dome Dashboard</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Main Hero Header */}
      <div className="max-w-2xl my-auto text-left pointer-events-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-mono mb-4 backdrop-blur-sm">
          <Rocket className="w-3.5 h-3.5 text-blue-400" />
          <span>Interactive Scroll-Driven Mission Story</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-light tracking-tight text-white leading-[1.05]">
          Lunar Landing Site <br />
          <strong className="font-bold bg-gradient-to-r from-blue-400 via-sky-300 to-amber-300 bg-clip-text text-transparent">
            Navigator
          </strong>
        </h1>

        <p className="mt-4 text-base sm:text-lg text-slate-200 font-normal leading-relaxed max-w-xl">
          Where extreme lighting and direct Earth links decide mission survival. Compute real ephemeris positions and LOLA horizon shadows for any site and date across the Moon's South Pole.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            onClick={onSkipToDashboard}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-xl shadow-blue-500/30 transition-all hover:scale-[1.02]"
          >
            <span>Explore 3D Sky-Dome</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <span className="text-xs text-slate-300 font-mono">
            Scroll down to launch rocket & descent ↓
          </span>
        </div>
      </div>

      {/* Bottom Scroll Prompt */}
      <div className="text-center flex flex-col items-center gap-1">
        <span className="text-xs font-mono text-slate-300 tracking-wider uppercase animate-pulse">
          Scroll to Launch & Pilot Mission
        </span>
        <ChevronDown className="w-5 h-5 text-blue-400 animate-bounce" />
      </div>
    </div>
  );
};
