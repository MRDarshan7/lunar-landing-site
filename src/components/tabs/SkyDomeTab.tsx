import React from 'react';
import { LeftSidebar } from '../dashboard/LeftSidebar';
import { RightSidebar } from '../dashboard/RightSidebar';
import { PlaybackBar } from '../dashboard/PlaybackBar';
import { DomeViewport } from '../dashboard/DomeViewport';
import { DeltaView } from '../dashboard/DeltaView';
import { useNavigatorStore } from '../../state/useNavigatorStore';

interface SkyDomeTabProps {
  store: ReturnType<typeof useNavigatorStore>;
  onOpenCustomSite: () => void;
}

export const SkyDomeTab: React.FC<SkyDomeTabProps> = ({ store, onOpenCustomSite }) => {
  const {
    currentSite,
    allSites,
    targetDate,
    missionDay,
    currentEpochDate,
    layers,
    mode,
    isPlaying,
    playbackSpeed,
    siteMetrics,
    deltaComparison,
    setSite,
    setTargetDate,
    setMissionDay,
    setIsPlaying,
    setPlaybackSpeed,
    setLayers,
    clearDelta
  } = store;

  return (
    <div className="flex-1 flex flex-col min-h-0 relative z-20">
      {/* "What Changed" Delta Callout Banner */}
      {deltaComparison && (
        <DeltaView delta={deltaComparison} onDismiss={clearDelta} />
      )}

      {/* Main Grid: Left Sidebar - 3D Center Dome - Right Sidebar */}
      <div className="flex-1 flex min-h-0 px-2 sm:px-4 py-2 gap-3 overflow-hidden">
        {/* Left Sidebar */}
        <div className="hidden md:flex shrink-0">
          <LeftSidebar
            currentSite={currentSite}
            allSites={allSites}
            targetDate={targetDate}
            missionDay={missionDay}
            currentEpochDate={currentEpochDate}
            layers={layers}
            mode={mode}
            onSelectSite={setSite}
            onSetTargetDate={setTargetDate}
            onSetMissionDay={setMissionDay}
            onToggleLayer={(layer) => setLayers(prev => ({ ...prev, [layer]: !prev[layer] }))}
            onOpenCustomSite={onOpenCustomSite}
          />
        </div>

        {/* Center 3D Sky-Dome Canvas Container (transparent HUD overlay on top of WebGL background) */}
        <div className="flex-1 relative flex flex-col min-h-0">
          <DomeViewport currentSite={currentSite} metrics={siteMetrics} />
        </div>

        {/* Right Sidebar */}
        <div className="hidden md:flex shrink-0">
          <RightSidebar metrics={siteMetrics} mode={mode} />
        </div>
      </div>

      {/* Bottom Playback & Scrubber Bar */}
      <div className="px-2 sm:px-4 pb-3">
        <PlaybackBar
          missionDay={missionDay}
          isPlaying={isPlaying}
          playbackSpeed={playbackSpeed}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          onSetMissionDay={setMissionDay}
          onSetPlaybackSpeed={setPlaybackSpeed}
          onStepHours={(hours) => {
            const stepDays = hours / 24;
            setMissionDay((missionDay + stepDays + 29.530588) % 29.530588);
          }}
        />
      </div>
    </div>
  );
};
