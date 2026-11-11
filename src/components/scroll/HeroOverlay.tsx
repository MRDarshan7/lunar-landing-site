import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { ChevronDown, Compass, Rocket, ArrowRight } from 'lucide-react';

export interface HeroOverlayHandle {
  update: (progress: number) => void;
}

interface HeroOverlayProps {
  progress?: number;
  onSkipToDashboard: () => void;
}

export const HeroOverlay = forwardRef<HeroOverlayHandle, HeroOverlayProps>(
  ({ progress = 0, onSkipToDashboard }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const updateDom = (p: number) => {
      if (!containerRef.current) return;
      const opacity = Math.max(0, 1 - p / 0.10);
      if (opacity <= 0.01) {
        containerRef.current.style.display = 'none';
        return;
      }
      containerRef.current.style.display = 'flex';
      containerRef.current.style.opacity = String(opacity);
      containerRef.current.style.transform = `translateY(${p * -60}px)`;
    };

    useImperativeHandle(ref, () => ({
      update: updateDom
    }));

    const initialOpacity = Math.max(0, 1 - progress / 0.10);
    const initialTranslateY = progress * -60;

    return (
      <div
        ref={containerRef}
        style={{
          opacity: initialOpacity,
          transform: `translateY(${initialTranslateY}px)`,
          display: initialOpacity <= 0.01 ? 'none' : 'flex'
        }}
        className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-6 md:p-12 select-none text-white transition-opacity duration-200"
      >
        {/* Top Brand Bar */}
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600/90 backdrop-blur-md border border-blue-400/40 text-white shadow-lg">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-widest text-blue-400">
                NASA Hackathon
              </span>
              <div className="text-[10px] text-slate-300 font-sans hidden sm:block">
                Autonomous South Polar Exploration
              </div>
            </div>
          </div>

          <button
            onClick={onSkipToDashboard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-xs font-semibold text-white transition-all shadow-md group cursor-pointer"
          >
            <span>Sky-Dome Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Main Hero Header */}
        <div className="max-w-2xl mt-2 mb-auto md:my-auto text-left pointer-events-auto">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[11px] font-mono mb-2 md:mb-4 backdrop-blur-sm">
            <Rocket className="w-3.5 h-3.5 text-blue-400" />
            <span>Interactive Scroll-Driven Mission Story</span>
          </div>

          <h1 className="text-3xl sm:text-6xl font-light tracking-tight text-white leading-[1.05]">
            Lunar Landing Site <br />
            <strong className="font-bold bg-gradient-to-r from-blue-400 via-sky-300 to-amber-300 bg-clip-text text-transparent">
              Navigator
            </strong>
          </h1>

          <p className="mt-2 md:mt-4 text-xs sm:text-base text-slate-200 font-normal leading-relaxed max-w-xl line-clamp-3 sm:line-clamp-none">
            Where extreme lighting and direct Earth links decide mission survival. Compute real ephemeris positions and LOLA horizon shadows for any site and date across the Moon's South Pole.
          </p>

          <div className="mt-3 md:mt-8 flex flex-wrap items-center gap-3">
            <button
              onClick={onSkipToDashboard}
              className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm shadow-xl shadow-blue-500/30 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <span>Explore 3D Sky-Dome</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <span className="text-[11px] sm:text-xs text-slate-300 font-mono">
              Scroll down to launch rocket ↓
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
  }
);
