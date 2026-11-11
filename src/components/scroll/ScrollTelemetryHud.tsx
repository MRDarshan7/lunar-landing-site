import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Radio } from 'lucide-react';
import { getMissionTelemetry } from '../../ephemeris/telemetryConductor';

export interface ScrollTelemetryHudHandle {
  update: (progress: number) => void;
}

interface ScrollTelemetryHudProps {
  progress?: number;
}

export const ScrollTelemetryHud = forwardRef<ScrollTelemetryHudHandle, ScrollTelemetryHudProps>(
  ({ progress = 0 }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const beatTextRef = useRef<HTMLSpanElement>(null);
    const stageTextRef = useRef<HTMLDivElement>(null);
    const altLabelRef = useRef<HTMLSpanElement>(null);
    const altValRef = useRef<HTMLSpanElement>(null);
    const velLabelRef = useRef<HTMLSpanElement>(null);
    const velValRef = useRef<HTMLSpanElement>(null);

    const lastBeatRef = useRef<number>(-1);
    const lastStageRef = useRef<string>('');
    const lastAltRef = useRef<string>('');
    const lastVelRef = useRef<string>('');
    const lastDescentRef = useRef<boolean | null>(null);

    const updateDom = (p: number) => {
      const isVisible = p > 0.06 && p < 0.88;
      if (!containerRef.current) return;

      if (!isVisible) {
        containerRef.current.style.display = 'none';
        return;
      }

      containerRef.current.style.display = 'block';
      const opacity = Math.min(1, Math.max(0, (p - 0.06) / 0.04)) * Math.min(1, Math.max(0, (0.88 - p) / 0.04));
      containerRef.current.style.opacity = String(opacity);

      const tel = getMissionTelemetry(p);

      if (beatTextRef.current && lastBeatRef.current !== tel.beatIndex) {
        beatTextRef.current.textContent = `Beat ${tel.beatIndex} / 8`;
        lastBeatRef.current = tel.beatIndex;
      }

      if (stageTextRef.current && lastStageRef.current !== tel.stageName) {
        stageTextRef.current.textContent = tel.stageName;
        lastStageRef.current = tel.stageName;
      }

      if (lastDescentRef.current !== tel.isDescent) {
        if (altLabelRef.current) {
          altLabelRef.current.textContent = tel.isDescent ? 'Altitude to Surface' : 'Mission Altitude';
        }
        if (velLabelRef.current) {
          velLabelRef.current.textContent = tel.isDescent ? 'Descent Velocity' : 'Orbital Velocity';
        }
        lastDescentRef.current = tel.isDescent;
      }

      if (altValRef.current && lastAltRef.current !== tel.altitudeStr) {
        altValRef.current.textContent = tel.altitudeStr;
        lastAltRef.current = tel.altitudeStr;
      }

      if (velValRef.current && lastVelRef.current !== tel.velocityStr) {
        velValRef.current.textContent = tel.velocityStr;
        lastVelRef.current = tel.velocityStr;
      }
    };

    useImperativeHandle(ref, () => ({
      update: updateDom
    }));

    // Initial state calculation
    const initTel = getMissionTelemetry(progress);
    const isInitiallyVisible = progress > 0.06 && progress < 0.88;

    return (
      <div
        ref={containerRef}
        style={{
          display: isInitiallyVisible ? 'block' : 'none',
          opacity: isInitiallyVisible ? 1 : 0
        }}
        className="fixed top-4 left-4 z-20 pointer-events-none select-none text-white font-mono text-xs transition-opacity duration-150"
      >
        <div className="p-3 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-slate-700/60 shadow-xl space-y-1.5 min-w-[260px]">
          <div className="flex items-center justify-between text-[10px] text-blue-400 font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Telemetry Uplink</span>
            </span>
            <span
              ref={beatTextRef}
              className="px-1.5 py-0.2 rounded bg-blue-900/40 text-blue-300 border border-blue-700/50"
            >
              Beat {initTel.beatIndex} / 8
            </span>
          </div>

          <div ref={stageTextRef} className="text-xs font-sans font-bold text-slate-100">
            {initTel.stageName}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-700/60 text-[11px]">
            <div>
              <span ref={altLabelRef} className="text-slate-400 text-[10px] block">
                {initTel.isDescent ? 'Altitude to Surface' : 'Mission Altitude'}
              </span>
              <span ref={altValRef} className="font-bold text-sky-400">
                {initTel.altitudeStr}
              </span>
            </div>
            <div>
              <span ref={velLabelRef} className="text-slate-400 text-[10px] block">
                {initTel.isDescent ? 'Descent Velocity' : 'Orbital Velocity'}
              </span>
              <span ref={velValRef} className="font-bold text-amber-400">
                {initTel.velocityStr}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
