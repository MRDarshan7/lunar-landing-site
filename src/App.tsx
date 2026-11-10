import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigatorStore } from './state/useNavigatorStore';
import { ThreeConductor } from './scene/ThreeConductor';
import { Header } from './components/dashboard/Header';
import { SkyDomeTab } from './components/tabs/SkyDomeTab';
import { TimelineTab } from './components/tabs/TimelineTab';
import { CompareSitesTab } from './components/tabs/CompareSitesTab';
import { AnalysisTab } from './components/tabs/AnalysisTab';
import { HeroOverlay } from './components/scroll/HeroOverlay';
import { ScrollTelemetryHud } from './components/scroll/ScrollTelemetryHud';
import { MissionCaptionPill } from './components/scroll/MissionCaptionPill';
import { AboutDataModal } from './components/modals/AboutDataModal';
import { CustomSiteModal } from './components/modals/CustomSiteModal';
import { ShareModal } from './components/modals/ShareModal';
import { exportEphemerisCsv } from './utils/exportCsv';
import { exportCanvasPng } from './utils/exportPng';
import { DebugBar } from './components/debug/DebugBar';

export function App() {
  const store = useNavigatorStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const conductorRef = useRef<ThreeConductor | null>(null);

  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [isCustomOpen, setIsCustomOpen] = useState<boolean>(false);
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);
  const [isDebugMode, setIsDebugMode] = useState<boolean>(false);
  const [conductorDebugInfo, setConductorDebugInfo] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('debug=1')) {
      setIsDebugMode(true);
    }
  }, []);

  // Initialize Three.js Conductor
  useEffect(() => {
    if (!canvasRef.current) return;
    const conductor = new ThreeConductor(canvasRef.current);
    conductorRef.current = conductor;

    conductor.updateHorizonProfile(store.horizonManager);
    conductor.updateSkyDomePaths(store.synodicSamples);

    return () => {
      conductor.destroy();
      conductorRef.current = null;
    };
  }, []);

  // Update Three.js when site, horizon, or synodic samples change
  useEffect(() => {
    if (!conductorRef.current) return;
    conductorRef.current.updateHorizonProfile(store.horizonManager);
    conductorRef.current.updateSkyDomePaths(store.synodicSamples);
  }, [store.currentSite, store.horizonManager, store.synodicSamples]);

  // Update Sun & Earth live markers when time changes
  useEffect(() => {
    if (!conductorRef.current) return;
    const currentSample = store.synodicSamples.find(
      s => Math.abs(s.missionDay - store.missionDay) < 0.25
    ) || store.synodicSamples[0];

    if (currentSample) {
      conductorRef.current.updateSkyDomePositions(currentSample.sun, currentSample.earth);
    }
  }, [store.missionDay, store.synodicSamples]);

  // Scroll listener for reversible scrubbing
  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.body.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;
      const p = Math.max(0, Math.min(1, window.scrollY / scrollHeight));
      setScrollProgress(p);
      if (conductorRef.current) {
        conductorRef.current.setScrollProgress(p);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Navigation jump helpers
  const skipToDashboard = useCallback(() => {
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    window.scrollTo({ top: maxScroll, behavior: 'smooth' });
  }, []);

  const replayLaunch = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Dashboard opacity & interactive visibility
  const dashboardOpacity = Math.max(0, Math.min(1, (scrollProgress - 0.88) / 0.10));
  const isDashboardActive = scrollProgress >= 0.92;

  return (
    <div className="relative min-h-screen bg-space-950 font-sans text-slate-100 antialiased overflow-x-hidden selection:bg-blue-600 selection:text-white">
      {/* 1. Scroll Track (Drives continuous scrubbed experience) */}
      <div id="scroll-track" className="h-[750vh] w-full pointer-events-none" />

      {/* 2. Full-Screen Fixed 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        id="three-stage"
        className="fixed inset-0 w-full h-full z-0 block cursor-grab active:cursor-grabbing"
      />

      {/* 3. Scroll Progress Indicator Bar at Very Top */}
      <div
        style={{ width: `${scrollProgress * 100}%` }}
        className="fixed top-0 left-0 h-1 bg-gradient-to-r from-blue-500 via-sky-400 to-amber-400 z-50 pointer-events-none transition-all duration-75"
      />

      {/* 4. Cinematic Hero Overlay (Landing Page) */}
      <HeroOverlay progress={scrollProgress} onSkipToDashboard={skipToDashboard} />

      {/* 5. Scroll Telemetry HUD (During Flight) */}
      <ScrollTelemetryHud progress={scrollProgress} />

      {/* 6. Mission Narrative Caption Pill */}
      <MissionCaptionPill progress={scrollProgress} />

      {/* 7. Interactive Production Dashboard (Fades in around lander at bottom of scroll) */}
      <div
        style={{
          opacity: dashboardOpacity,
          pointerEvents: isDashboardActive ? 'auto' : 'none',
          visibility: dashboardOpacity > 0.01 ? 'visible' : 'hidden'
        }}
        className="fixed inset-0 z-30 flex flex-col justify-between transition-opacity duration-300"
      >
        {/* Header */}
        <Header
          activeTab={store.activeTab}
          setActiveTab={store.setActiveTab}
          mode={store.mode}
          setMode={store.setMode}
          theme={store.theme}
          setTheme={store.setTheme}
          onOpenAbout={() => setIsAboutOpen(true)}
          onOpenShare={() => setIsShareOpen(true)}
          onExportCsv={() => exportEphemerisCsv(store.currentSite, store.synodicSamples, store.siteMetrics)}
          onExportPng={() => {
            if (canvasRef.current) exportCanvasPng(canvasRef.current, `${store.currentSite.id}-skydome.png`);
          }}
          onReplayLaunch={replayLaunch}
        />

        {/* Tab Content */}
        <main className="flex-1 flex min-h-0 relative overflow-hidden" role="main">
          {store.activeTab === 'skydome' && (
            <SkyDomeTab store={store} onOpenCustomSite={() => setIsCustomOpen(true)} />
          )}

          {store.activeTab === 'timeline' && (
            <div className="flex-1 flex min-h-0 bg-white/95 dark:bg-space-900/95 backdrop-blur-md z-20">
              <TimelineTab
                currentSite={store.currentSite}
                samples={store.synodicSamples}
                metrics={store.siteMetrics}
                missionDay={store.missionDay}
                onSetMissionDay={store.setMissionDay}
              />
            </div>
          )}

          {store.activeTab === 'compare' && (
            <div className="flex-1 flex min-h-0 bg-white/95 dark:bg-space-900/95 backdrop-blur-md z-20">
              <CompareSitesTab
                allSites={store.allSites}
                selectedSiteIds={store.compareSiteIds}
                onToggleSiteSelection={(id) => {
                  store.setCompareSiteIds(prev =>
                    prev.includes(id) ? (prev.length > 1 ? prev.filter(x => x !== id) : prev) : [...prev, id]
                  );
                }}
                targetDate={store.targetDate}
                onSelectAsPrimary={(site) => {
                  store.setSite(site);
                  store.setActiveTab('skydome');
                }}
              />
            </div>
          )}

          {store.activeTab === 'analysis' && (
            <div className="flex-1 flex min-h-0 bg-white/95 dark:bg-space-900/95 backdrop-blur-md z-20">
              <AnalysisTab
                currentSite={store.currentSite}
                allSites={store.allSites}
                samples={store.synodicSamples}
                targetDate={store.targetDate}
                onSelectSite={(site) => {
                  store.setSite(site);
                  store.setActiveTab('skydome');
                }}
              />
            </div>
          )}
        </main>
      </div>

      {/* 8. Modals */}
      <AboutDataModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <CustomSiteModal
        isOpen={isCustomOpen}
        onClose={() => setIsCustomOpen(false)}
        onAddCustomSite={store.addCustomSite}
      />
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        currentSite={store.currentSite}
        targetDate={store.targetDate}
        missionDay={store.missionDay}
      />

      {/* 9. Debug Toolbar for ?debug=1 */}
      {isDebugMode && (
        <DebugBar
          progress={scrollProgress}
          onSetProgress={(p) => {
            const maxScroll = document.body.scrollHeight - window.innerHeight;
            window.scrollTo(0, p * maxScroll);
            setScrollProgress(p);
            conductorRef.current?.setProgressInstant(p);
          }}
          conductorInfo={conductorDebugInfo}
        />
      )}
    </div>
  );
}
export default App;
