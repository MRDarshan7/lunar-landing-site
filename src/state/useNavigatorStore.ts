import { useState, useEffect, useCallback, useMemo } from 'react';
import { LandingSite, EphemerisSample, SiteMetrics, DeltaComparison, CountdownEvents, SolarArrayArchitecture } from '../types';
import { CURATED_SITES } from '../terrain/lolaData';
import { HorizonManager } from '../terrain/horizon';
import { EphemerisEngine, SYNODIC_MONTH_DAYS } from '../ephemeris/engine';

export interface AppState {
  currentSite: LandingSite;
  allSites: LandingSite[];
  targetDate: Date;
  missionDay: number; // 0 to 29.53
  activeTab: 'skydome' | 'timeline' | 'compare' | 'analysis';
  isPlaying: boolean;
  playbackSpeed: number; // 1 to 1000
  mode: 'technical' | 'explain';
  theme: 'dark' | 'light';
  layers: {
    sunPath: boolean;
    earthPath: boolean;
    terrain: boolean;
    grid: boolean;
    rays: boolean;
  };
  compareSiteIds: string[];
  horizonManager: HorizonManager;
  synodicSamples: EphemerisSample[];
  siteMetrics: SiteMetrics;
  deltaComparison: DeltaComparison | null;
  countdownEvents: CountdownEvents;
  solarArchitecture: SolarArrayArchitecture;
  scenarioStep: number | null;
}

const DEFAULT_SITE = CURATED_SITES[0]; // Shackleton Connecting Ridge
const INITIAL_DATE = new Date('2026-07-03T12:00:00Z');

export function useNavigatorStore() {
  const [currentSite, setCurrentSiteState] = useState<LandingSite>(DEFAULT_SITE);
  const [customSites, setCustomSites] = useState<LandingSite[]>([]);
  const [targetDate, setTargetDate] = useState<Date>(INITIAL_DATE);
  const [missionDay, setMissionDay] = useState<number>(3.0);
  const [activeTab, setActiveTab] = useState<'skydome' | 'timeline' | 'compare' | 'analysis'>('skydome');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(50);
  const [mode, setMode] = useState<'technical' | 'explain'>('explain');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [layers, setLayers] = useState({
    sunPath: true,
    earthPath: true,
    terrain: true,
    grid: true,
    rays: true
  });
  const [compareSiteIds, setCompareSiteIds] = useState<string[]>([
    'shackleton-connecting-ridge',
    'mons-mouton',
    'malapert-massif',
    'apollo-11'
  ]);
  const [deltaComparison, setDeltaComparison] = useState<DeltaComparison | null>(null);
  const [solarArchitecture, setSolarArchitecture] = useState<SolarArrayArchitecture>('vertical');
  const [scenarioStep, setScenarioStep] = useState<number | null>(null);

  const allSites = useMemo(() => {
    return [...CURATED_SITES, ...customSites];
  }, [customSites]);

  // Active Horizon Manager
  const horizonManager = useMemo(() => {
    return new HorizonManager(currentSite.horizonProfile);
  }, [currentSite]);

  // Current Epoch Date (Target Date + missionDay offset)
  const currentEpochDate = useMemo(() => {
    const epochMs = targetDate.getTime() + (missionDay * 24 * 3600 * 1000);
    return new Date(epochMs);
  }, [targetDate, missionDay]);

  // Full Synodic Samples for 3D paths and Gantt chart (memoized per site & targetDate)
  const synodicSamples = useMemo(() => {
    return EphemerisEngine.sampleSynodicCycle(currentSite, targetDate, 180, horizonManager);
  }, [currentSite, targetDate, horizonManager]);

  // Quantize epoch hour to prevent re-running heavy calculations on sub-minute scrubs
  const epochHour = Math.floor(currentEpochDate.getTime() / (3600 * 1000));

  // Site Metrics & Operational Windows (memoized per site & epoch hour)
  const siteMetrics = useMemo(() => {
    return EphemerisEngine.computeSiteMetrics(currentSite, currentEpochDate, horizonManager);
  }, [currentSite, epochHour, horizonManager]);

  // Live countdown to next terrain sunset/sunrise & earthset/earthrise (memoized per half-hour)
  const epochHalfHour = Math.floor(currentEpochDate.getTime() / (1800 * 1000));
  const countdownEvents = useMemo(() => {
    return EphemerisEngine.computeCountdownEvents(currentSite, currentEpochDate, horizonManager);
  }, [currentSite, epochHalfHour, horizonManager]);

  // Switching sites with "What changed" delta calculation
  const setSite = useCallback((site: LandingSite) => {
    const prevSite = currentSite;
    const prevMetrics = siteMetrics;

    const newHm = new HorizonManager(site.horizonProfile);
    const newMetrics = EphemerisEngine.computeSiteMetrics(site, currentEpochDate, newHm);

    setDeltaComparison({
      siteA: prevSite.name,
      siteB: site.name,
      sunlightDiffHours: Math.round((newMetrics.longestContinuousSunHours - prevMetrics.longestContinuousSunHours) * 10) / 10,
      earthDiffHours: Math.round((newMetrics.longestContinuousEarthLosHours - prevMetrics.longestContinuousEarthLosHours) * 10) / 10,
      maxShadowDiffHours: Math.round((newMetrics.longestContinuousShadowHours - prevMetrics.longestContinuousShadowHours) * 10) / 10,
      powerScoreDiff: newMetrics.powerScore - prevMetrics.powerScore
    });

    setCurrentSiteState(site);
  }, [currentSite, siteMetrics, currentEpochDate]);

  // Add custom site
  const addCustomSite = useCallback((site: LandingSite) => {
    setCustomSites(prev => [site, ...prev]);
    setSite(site);
  }, [setSite]);

  // High-performance RAF playback loop synchronized with screen refresh rate
  useEffect(() => {
    if (!isPlaying) return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dtSec = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // 1 real second = playbackSpeed hours
      const deltaDays = (dtSec * playbackSpeed) / 24;
      setMissionDay(prev => (prev + deltaDays) % SYNODIC_MONTH_DAYS);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, playbackSpeed]);

  // Toggle theme class on body
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [theme]);

  // 3-Step Guided Scenario Controller (Launch Slip Crisis Simulation)
  const startGuidedScenario = useCallback(() => {
    // Step 1: Nominal landing at Shackleton Connecting Ridge (Site 001)
    const shackleton = CURATED_SITES[0];
    setCurrentSiteState(shackleton);
    setTargetDate(new Date('2026-07-03T12:00:00Z'));
    setMissionDay(3.0);
    setActiveTab('skydome');
    setScenarioStep(1);
    setIsPlaying(false);
  }, []);

  const nextGuidedScenarioStep = useCallback(() => {
    if (scenarioStep === 1) {
      // Step 2: 14-day launch slip delay -> Target date becomes 2026-07-17
      setTargetDate(new Date('2026-07-17T12:00:00Z'));
      setMissionDay(3.0);
      setActiveTab('timeline'); // View impact on illumination timeline
      setScenarioStep(2);
    } else if (scenarioStep === 2) {
      // Step 3: Multi-site comparison identifies Malapert Massif Peak as the robust backup
      const malapert = CURATED_SITES.find(s => s.id === 'malapert-massif') || CURATED_SITES[2];
      setCompareSiteIds(['shackleton-connecting-ridge', 'malapert-massif', 'mons-mouton']);
      setActiveTab('compare');
      setScenarioStep(3);
    } else {
      setScenarioStep(null);
    }
  }, [scenarioStep]);

  const dismissScenario = useCallback(() => {
    setScenarioStep(null);
  }, []);

  return {
    currentSite,
    allSites,
    targetDate,
    missionDay,
    currentEpochDate,
    activeTab,
    isPlaying,
    playbackSpeed,
    mode,
    theme,
    layers,
    compareSiteIds,
    horizonManager,
    synodicSamples,
    siteMetrics,
    deltaComparison,
    countdownEvents,
    solarArchitecture,
    scenarioStep,
    setSite,
    addCustomSite,
    setTargetDate,
    setMissionDay,
    setActiveTab,
    setIsPlaying,
    setPlaybackSpeed,
    setMode,
    setTheme,
    setLayers,
    setCompareSiteIds,
    setSolarArchitecture,
    startGuidedScenario,
    nextGuidedScenarioStep,
    dismissScenario,
    clearDelta: () => setDeltaComparison(null)
  };
}
