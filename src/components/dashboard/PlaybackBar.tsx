import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  FastForward,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { SYNODIC_MONTH_DAYS } from '../../ephemeris/engine';

interface PlaybackBarProps {
  missionDay: number;
  isPlaying: boolean;
  playbackSpeed: number;
  onTogglePlay: () => void;
  onSetMissionDay: (day: number) => void;
  onSetPlaybackSpeed: (speed: number) => void;
  onStepHours: (hours: number) => void;
}

export const PlaybackBar: React.FC<PlaybackBarProps> = ({
  missionDay,
  isPlaying,
  playbackSpeed,
  onTogglePlay,
  onSetMissionDay,
  onSetPlaybackSpeed,
  onStepHours
}) => {
  const speeds = [1, 10, 50, 250, 1000];

  return (
    <div className="w-full max-w-4xl mx-auto p-2 sm:p-2.5 rounded-2xl bg-white/95 dark:bg-space-850/95 backdrop-blur-md border border-slate-200 dark:border-space-700 shadow-lg select-none z-20">
      <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
        {/* Play/Pause & Step Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onStepHours(-24)}
            title="Step back 1 Lunar Day (24 Earth hours)"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-space-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-space-700"
            aria-label="Step backward 1 day"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={() => onStepHours(-1)}
            title="Step back 1 hour"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-space-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-space-700"
            aria-label="Step backward 1 hour"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={onTogglePlay}
            className={`flex items-center justify-center w-10 h-10 rounded-xl font-bold text-white shadow-md transition-all ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/30'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/30'
            }`}
            aria-label={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          <button
            onClick={() => onStepHours(1)}
            title="Step forward 1 hour"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-space-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-space-700"
            aria-label="Step forward 1 hour"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onStepHours(24)}
            title="Step forward 1 Lunar Day (24 Earth hours)"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-space-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-space-700"
            aria-label="Step forward 1 day"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Timeline Scrubber */}
        <div className="flex-1 w-full flex flex-col justify-center px-1">
          <div className="flex justify-between items-center text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Day {missionDay.toFixed(2)} <span className="font-normal text-slate-400">/ 29.53</span>
            </span>
            <div className="flex gap-2 text-[10px]">
              <button
                onClick={() => onSetMissionDay(0)}
                className="hover:underline text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                New (0d)
              </button>
              <button
                onClick={() => onSetMissionDay(14.76)}
                className="hover:underline text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Full (14.8d)
              </button>
              <button
                onClick={() => onSetMissionDay(29.53)}
                className="hover:underline text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                End (29.5d)
              </button>
            </div>
          </div>

          <input
            type="range"
            min="0"
            max={SYNODIC_MONTH_DAYS}
            step="0.05"
            value={missionDay}
            onChange={(e) => onSetMissionDay(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-200 dark:bg-space-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            aria-label="Simulation Time Slider"
          />
        </div>

        {/* Speed Multiplier Selector */}
        <div className="flex items-center gap-1 shrink-0 bg-slate-100 dark:bg-space-800 p-1 rounded-xl border border-slate-200 dark:border-space-700 text-xs">
          <FastForward className="w-3.5 h-3.5 text-slate-400 ml-1 hidden sm:block" />
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => onSetPlaybackSpeed(s)}
              className={`px-2 py-1 rounded-lg font-mono font-semibold text-[11px] transition-all ${
                playbackSpeed === s
                  ? 'bg-white dark:bg-space-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
