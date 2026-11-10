export interface LandingSite {
  id: string;
  name: string;
  category: 'Artemis & CLPS' | 'South Pole Peaks' | 'Historic' | 'International' | 'Custom';
  lat: number;          // Degrees, -90 to +90 (South is negative)
  lon: number;          // Degrees, -180 to +180 or 0 to 360 (East is positive)
  elevationKm: number;  // Relative to lunar reference sphere 1737.4 km
  description: string;
  lightingConditions: string;
  communicationConditions: string;
  scienceTarget: string;
  isApproximateTerrain?: boolean; // True if synthetic approximation; false if raw LOLA DEM
  horizonProfile?: number[]; // 360 degrees (0 to 359, az=0 North, az=90 East)
}

export interface CelestialBodyPos {
  az: number;           // Azimuth in degrees (0 = North, 90 = East, 180 = South, 270 = West)
  el: number;           // Elevation above local horizon in degrees (-90 to +90)
  distance: number;     // AU for Sun, km for Earth
  isBlocked: boolean;   // True if el <= terrain horizon at az
  horizonElevation: number; // Terrain horizon elevation at az
}

export interface EphemerisSample {
  timestamp: number;    // UTC epoch ms
  isoDate: string;
  missionDay: number;   // 0 to ~29.53 synodic lunar day
  sun: CelestialBodyPos;
  earth: CelestialBodyPos;
  libration: {
    earthSubLat: number; // Earth selenographic sub-latitude (deg)
    earthSubLon: number; // Earth selenographic sub-longitude (deg)
  };
  subSolar: {
    lat: number;
    lon: number;
  };
}

export interface OperationalWindow {
  type: 'sunlight' | 'solar_shadow' | 'earth_los' | 'comm_blackout';
  startDay: number;
  endDay: number;
  durationDays: number;
  durationHours: number;
  startIso: string;
  endIso: string;
}

export interface SiteMetrics {
  currentSunElevation: number;
  currentSunAzimuth: number;
  currentEarthElevation: number;
  currentEarthAzimuth: number;
  sunInView: boolean;
  earthInView: boolean;
  timeToSunriseHours: number | null;
  timeToSunsetHours: number | null;
  timeToEarthriseHours: number | null;
  timeToEarthsetHours: number | null;
  
  // Lunar cycle aggregate metrics (over synodic period ~29.53 days)
  illuminationFraction: number;        // 0 to 1
  earthVisibilityFraction: number;     // 0 to 1
  longestContinuousSunHours: number;
  longestContinuousShadowHours: number;
  longestContinuousEarthLosHours: number;
  longestContinuousBlackoutHours: number;
  
  // Power & Mission Viability score
  powerScore: number;                  // 0 to 100
  powerRating: 'EXCELLENT' | 'HIGH' | 'MODERATE' | 'MARGINAL' | 'CRITICAL';
  powerExplanation: string;
  commRating: 'CONTINUOUS' | 'INTERMITTENT' | 'RELAY_REQUIRED' | 'OCCULTED';
  
  windows: OperationalWindow[];
}

export interface DeltaComparison {
  siteA: string;
  siteB: string;
  sunlightDiffHours: number;
  earthDiffHours: number;
  maxShadowDiffHours: number;
  powerScoreDiff: number;
}

export type SolarArrayArchitecture = 'vertical' | 'horizontal';

export interface CountdownEvents {
  nextSolarEvent: {
    type: 'sunset' | 'sunrise';
    hoursRemaining: number;
    eventDate: Date;
    formattedCountdown: string;
  };
  nextEarthEvent: {
    type: 'earthset' | 'earthrise';
    hoursRemaining: number;
    eventDate: Date;
    formattedCountdown: string;
    isContinuous: boolean;
    isPermanentlyOcculted: boolean;
  };
}

export interface LaunchSlipScenario {
  slipDays: number;
  label: string;
  epochDate: Date;
  metrics: SiteMetrics;
}
