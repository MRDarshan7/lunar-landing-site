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
  onReplayLaunch
}) => {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white/95 dark:bg-space-900/95 backdrop-blur-md border-b border-slate-200 dark:border-space-700 select-none z-30 transition-colors">
      {/* Title & Brand */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-amber-500 shadow-md shadow-blue-500/20 text-white font-bold">
          <Compass className="w-5 h-5 animate-pulse" />
          <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              Lunar Landing Site Navigator
            </h1>
            <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50">
              NASA Challenge
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
            High-Precision Ephemeris & LOLA Horizon Telemetry · South Pole Lighting & Comm
          </p>
        </div>
      </div>

      {/* Tabs */}
      <nav className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-space-800/80 border border-slate-200 dark:border-space-700 overflow-x-auto" aria-label="Navigation Tabs">
        <button
          onClick={() => setActiveTab('skydome')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'skydome'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
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
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
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
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
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
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
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
          className="p-1.5 rounded-lg border border-slate-200 dark:border-space-700 bg-white dark:bg-space-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-space-700 text-xs font-medium flex items-center gap-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Replay Launch</span>
        </button>

        {/* Explain Mode Toggle */}
        <button
          onClick={() => setMode(mode === 'explain' ? 'technical' : 'explain')}
          title={mode === 'explain' ? 'Switch to Technical Mode (raw data)' : 'Switch to Explain Mode (guided tooltips)'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            mode === 'explain'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
              : 'bg-slate-100 dark:bg-space-800 border-slate-200 dark:border-space-700 text-slate-700 dark:text-slate-300'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>{mode === 'explain' ? 'Explain Mode' : 'Technical'}</span>
        </button>

        {/* Export Buttons */}
        <div className="flex items-center rounded-lg border border-slate-200 dark:border-space-700 bg-white dark:bg-space-800 overflow-hidden text-xs">
          <button
            onClick={onExportCsv}
            title="Export Ephemeris & Windows to CSV"
            className="px-2 py-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-space-700 border-r border-slate-200 dark:border-space-700 flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            <span className="hidden lg:inline">CSV</span>
          </button>
          <button
            onClick={onExportPng}
            title="Export High-Res PNG Snapshot"
            className="px-2 py-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-space-700 flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            <span className="hidden lg:inline">PNG</span>
          </button>
        </div>

        {/* Share Button */}
        <button
          onClick={onOpenShare}
          title="Share Scenario Link"
          className="p-1.5 rounded-lg border border-slate-200 dark:border-space-700 bg-white dark:bg-space-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-space-700"
          aria-label="Share Scenario"
        >
          <Share2 className="w-4 h-4" />
        </button>

        {/* About Data Button */}
        <button
          onClick={onOpenAbout}
          title="About Data Sources & Models"
          className="p-1.5 rounded-lg border border-slate-200 dark:border-space-700 bg-white dark:bg-space-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-space-700"
          aria-label="About Data"
        >
          <Info className="w-4 h-4" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-space-700 bg-white dark:bg-space-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-space-700"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>
    </header>
  );
};
