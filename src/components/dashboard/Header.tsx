import React from 'react';
import {
  Compass,
  Calendar,
  Layers,
  Share2,
  Info,
  Download,
  Sun,
  Moon,
  Sparkles,
  Sliders,
  RotateCcw
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'skydome' | 'timeline' | 'compare' | 'analysis';
  setActiveTab: (tab: 'skydome' | 'timeline' | 'compare' | 'analysis') => void;
  mode: 'technical' | 'explain';
  setMode: (mode: 'technical' | 'explain') => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  onOpenAbout: () => void;
  onOpenShare: () => void;
  onExportCsv: () => void;
  onExportPng: () => void;
  onReplayLaunch: () => void;
  onStartGuidedScenario?: () => void;
  scenarioStep?: number | null;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  mode,
  setMode,
  theme,
  setTheme,
  onOpenAbout,
  onOpenShare,
  onExportCsv,
  onExportPng,
  onReplayLaunch,
  onStartGuidedScenario,
  scenarioStep
}) => {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-950/90 dark:bg-space-950/95 backdrop-blur-md border-b border-slate-700/40 select-none z-30 transition-colors text-slate-100 font-sans shadow-lg shadow-black/40">
      {/* Title & Brand */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-amber-500 shadow-md shadow-blue-500/30 text-white font-bold border border-white/20">
          <Compass className="w-5 h-5 animate-pulse" />
          <span className="absolute -bottom-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight font-mono">
              LUNAR NAVIGATOR
            </h1>
            <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider rounded bg-blue-900/60 text-blue-300 border border-blue-600/50">
              NASA JPL / 2026
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono hidden sm:block">
            Ephemeris Telemetry & LOLA Horizon Occlusion Suite
          </p>
        </div>
      </div>

      {/* Guided Crisis Scenario Button */}
      {onStartGuidedScenario && (
        <button
          onClick={onStartGuidedScenario}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border shadow-sm ${
            scenarioStep !== null
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 animate-pulse'
              : 'bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border-emerald-500/40 hover:border-emerald-400'
          }`}
          title="Simulate a 14-day launch delay and evaluate backup landing sites"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{scenarioStep !== null ? `SCENARIO ACTIVE (STEP ${scenarioStep}/3)` : '▶ RUN LAUNCH-DELAY SCENARIO'}</span>
        </button>
      )}

      {/* Navigation Tabs */}
      <nav className="flex items-center p-1 rounded-xl bg-slate-900/80 border border-slate-700/50 overflow-x-auto font-mono text-xs" aria-label="Navigation Tabs">
        <button
          onClick={() => setActiveTab('skydome')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'skydome'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
          aria-current={activeTab === 'skydome' ? 'page' : undefined}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Sky-Dome</span>
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'timeline'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
          aria-current={activeTab === 'timeline' ? 'page' : undefined}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Timeline (Gantt)</span>
        </button>
        <button
          onClick={() => setActiveTab('compare')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'compare'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
          aria-current={activeTab === 'compare' ? 'page' : undefined}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Compare Sites</span>
        </button>
        <button
          onClick={() => setActiveTab('analysis')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'analysis'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
          aria-current={activeTab === 'analysis' ? 'page' : undefined}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Analysis & Ranking</span>
        </button>
      </nav>

      {/* Mode Switch, Export, Share, Theme */}
      <div className="flex items-center gap-2">
        {/* Replay Launch Button */}
        <button
          onClick={onReplayLaunch}
          title="Scroll up to launch sequence"
          className="p-1.5 rounded-lg border border-slate-700/60 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono flex items-center gap-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Replay</span>
        </button>

        {/* Explain Mode Toggle */}
        <button
          onClick={() => setMode(mode === 'explain' ? 'technical' : 'explain')}
          title={mode === 'explain' ? 'Switch to Technical Mode (raw data)' : 'Switch to Explain Mode (guided tooltips)'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all ${
            mode === 'explain'
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
              : 'bg-slate-900 border-slate-700 text-slate-300'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">{mode === 'explain' ? 'Explain' : 'Technical'}</span>
        </button>

        {/* Export Buttons */}
        <div className="flex items-center rounded-lg border border-slate-700/60 bg-slate-900 overflow-hidden text-xs font-mono">
          <button
            onClick={onExportCsv}
            title="Export Ephemeris & Windows to CSV"
            className="px-2 py-1.5 text-slate-300 hover:bg-slate-800 border-r border-slate-700/60 flex items-center gap-1"
          >
            <Download className="w-3 h-3 text-cyan-400" />
            <span className="hidden lg:inline">CSV</span>
          </button>
          <button
            onClick={onExportPng}
            title="Export High-Res PNG Snapshot"
            className="px-2 py-1.5 text-slate-300 hover:bg-slate-800 flex items-center gap-1"
          >
            <Download className="w-3 h-3 text-cyan-400" />
            <span className="hidden lg:inline">PNG</span>
          </button>
        </div>

        {/* Share Button */}
        <button
          onClick={onOpenShare}
          title="Share Scenario Link"
          className="p-1.5 rounded-lg border border-slate-700/60 bg-slate-900 text-slate-300 hover:bg-slate-800"
          aria-label="Share Scenario"
        >
          <Share2 className="w-4 h-4 text-cyan-400" />
        </button>

        {/* About Data Button */}
        <button
          onClick={onOpenAbout}
          title="About Data Sources & Models"
          className="p-1.5 rounded-lg border border-slate-700/60 bg-slate-900 text-slate-300 hover:bg-slate-800"
          aria-label="About Data"
        >
          <Info className="w-4 h-4 text-amber-400" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="p-1.5 rounded-lg border border-slate-700/60 bg-slate-900 text-slate-300 hover:bg-slate-800"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-400" />}
        </button>
      </div>
    </header>
  );
};
