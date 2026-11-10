import { useState, useEffect, useCallback, useMemo } from 'react';
import { LandingSite, EphemerisSample, SiteMetrics, DeltaComparison } from '../types';
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

  // Full Synodic Samples for 3D paths and Gantt chart
  const synodicSamples = useMemo(() => {
    return EphemerisEngine.sampleSynodicCycle(currentSite, targetDate, 180, horizonManager);
  }, [currentSite, targetDate, horizonManager]);

  // Site Metrics & Operational Windows
  const siteMetrics = useMemo(() => {
    return EphemerisEngine.computeSiteMetrics(currentSite, currentEpochDate, horizonManager);
  }, [currentSite, currentEpochDate, horizonManager]);

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

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying) return;

    let lastTime = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const dtSec = (now - lastTime) / 1000;
      lastTime = now;

      // 1 real second = playbackSpeed hours
      const deltaDays = (dtSec * playbackSpeed) / 24;
      setMissionDay(prev => (prev + deltaDays) % SYNODIC_MONTH_DAYS);
    }, 40);

    return () => clearInterval(interval);
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
    clearDelta: () => setDeltaComparison(null)
  };
}
