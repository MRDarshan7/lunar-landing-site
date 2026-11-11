import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { getMissionTelemetry } from '../../ephemeris/telemetryConductor';

export interface MissionCaptionPillHandle {
  update: (progress: number) => void;
}

interface MissionCaptionPillProps {
  progress?: number;
}

export const MissionCaptionPill = forwardRef<MissionCaptionPillHandle, MissionCaptionPillProps>(
  ({ progress = 0 }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const captionTextRef = useRef<HTMLSpanElement>(null);
    const lastCaptionRef = useRef<string>('');

    const updateDom = (p: number) => {
      const isVisible = p > 0.02 && p < 0.88;
      if (!containerRef.current) return;

      if (!isVisible) {
        containerRef.current.style.display = 'none';
        return;
      }

      containerRef.current.style.display = 'flex';
      const tel = getMissionTelemetry(p);

      if (captionTextRef.current && lastCaptionRef.current !== tel.caption) {
        captionTextRef.current.textContent = tel.caption;
        lastCaptionRef.current = tel.caption;
      }
    };

    useImperativeHandle(ref, () => ({
      update: updateDom
    }));

    const initTel = getMissionTelemetry(progress);
    const isInitiallyVisible = progress > 0.02 && progress < 0.88;

    return (
      <div
        ref={containerRef}
        style={{ display: isInitiallyVisible ? 'flex' : 'none' }}
        className="fixed bottom-6 left-0 right-0 z-20 pointer-events-none justify-center px-4 select-none animate-in fade-in duration-200"
      >
        <div className="px-4 py-2 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-slate-700/60 shadow-xl text-xs sm:text-sm font-medium font-sans text-slate-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
          <span ref={captionTextRef}>{initTel.caption}</span>
        </div>
      </div>
    );
  }
);
