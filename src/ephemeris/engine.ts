import * as Astronomy from 'astronomy-engine';
import { LandingSite, CelestialBodyPos, EphemerisSample, SiteMetrics, OperationalWindow } from '../types';
import { HorizonManager } from '../terrain/horizon';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const MOON_MEAN_RADIUS_KM = 1737.4;
export const SYNODIC_MONTH_DAYS = 29.530588853;
export const SYNODIC_MONTH_HOURS = SYNODIC_MONTH_DAYS * 24;

export interface TopocentricResult {
  sun: CelestialBodyPos;
  earth: CelestialBodyPos;
  libration: {
    earthSubLat: number;
    earthSubLon: number;
  };
  subSolar: {
    lat: number;
    lon: number;
  };
}

/**
 * High-precision Ephemeris Engine
 * Computes selenographic topocentric coordinates (azimuth, elevation, distance)
 * for Sun and Earth from any lunar landing site at any given epoch.
 */
export class EphemerisEngine {
  /**
   * Compute topocentric coordinates for Sun and Earth at a given date and site
   */
  public static calculatePosition(
    site: LandingSite,
    date: Date,
    horizonManager?: HorizonManager
  ): TopocentricResult {
    const astroTime = Astronomy.MakeTime(date);
    const lib = Astronomy.Libration(astroTime);

    const phi = site.lat * DEG2RAD;
    const lam = site.lon * DEG2RAD;

    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);
    const cosLam = Math.cos(lam);
    const sinLam = Math.sin(lam);

    // Orthonormal topocentric basis: Zenith (Up), North, East
    const Z = [cosPhi * cosLam, cosPhi * sinLam, sinPhi];
    const N = [-sinPhi * cosLam, -sinPhi * sinLam, cosPhi];
    const E = [-sinLam, cosLam, 0];

    // Observer radius including surface elevation
    const rObserver = MOON_MEAN_RADIUS_KM + (site.elevationKm || 0);

    // Calculate position relative to site
    const calcBody = (
      subLatDeg: number,
      subLonDeg: number,
      distKm: number
    ): { az: number; el: number; dist: number } => {
      const sLat = subLatDeg * DEG2RAD;
      const sLon = subLonDeg * DEG2RAD;

      // Position vector of body from Moon center
      const Sx = distKm * Math.cos(sLat) * Math.cos(sLon);
      const Sy = distKm * Math.cos(sLat) * Math.sin(sLon);
      const Sz = distKm * Math.sin(sLat);

      // Relative vector: observer to celestial body
      const Vx = Sx - rObserver * Z[0];
      const Vy = Sy - rObserver * Z[1];
      const Vz = Sz - rObserver * Z[2];

      const range = Math.hypot(Vx, Vy, Vz);
      const vx = Vx / range;
      const vy = Vy / range;
      const vz = Vz / range;

      // Projection onto local topocentric basis
      const zProj = vx * Z[0] + vy * Z[1] + vz * Z[2];
      const nProj = vx * N[0] + vy * N[1] + vz * N[2];
      const eProj = vx * E[0] + vy * E[1] + vz * E[2];

      const el = Math.asin(Math.max(-1, Math.min(1, zProj))) * RAD2DEG;
      let az = Math.atan2(eProj, nProj) * RAD2DEG;
      if (az < 0) az += 360;

      return { az, el, dist: range };
    };

    // Earth calculation
    const earthRaw = calcBody(lib.elat, lib.elon, lib.dist_km);
    // Sun calculation (Sun distance approx 1 AU in km)
    const AU_KM = 149597870.7;
    const sunRaw = calcBody(lib.mlat, lib.mlon, AU_KM);

    const hm = horizonManager || new HorizonManager(site.horizonProfile);
    const sunHorEl = hm.getElevationAtAzimuth(sunRaw.az);
    const earthHorEl = hm.getElevationAtAzimuth(earthRaw.az);

    const sunBlocked = hm.isBlocked(sunRaw.az, sunRaw.el);
    const earthBlocked = hm.isBlocked(earthRaw.az, earthRaw.el);

    return {
      sun: {
        az: Number(sunRaw.az.toFixed(2)),
        el: Number(sunRaw.el.toFixed(2)),
        distance: Number((sunRaw.dist / AU_KM).toFixed(4)),
        isBlocked: sunBlocked,
        horizonElevation: Number(sunHorEl.toFixed(2))
      },
      earth: {
        az: Number(earthRaw.az.toFixed(2)),
        el: Number(earthRaw.el.toFixed(2)),
        distance: Math.round(earthRaw.dist),
        isBlocked: earthBlocked,
        horizonElevation: Number(earthHorEl.toFixed(2))
      },
      libration: {
        earthSubLat: Number(lib.elat.toFixed(3)),
        earthSubLon: Number(lib.elon.toFixed(3))
      },
      subSolar: {
        lat: Number(lib.mlat.toFixed(3)),
        lon: Number(lib.mlon.toFixed(3))
      }
    };
  }

  /**
   * Sample positions across an entire synodic cycle (29.53 days)
   * used for 3D path trails, Gantt timeline, and aggregate metrics.
   */
  public static sampleSynodicCycle(
    site: LandingSite,
    baseDate: Date,
    numSamples: number = 180,
    horizonManager?: HorizonManager
  ): EphemerisSample[] {
    const hm = horizonManager || new HorizonManager(site.horizonProfile);
    const samples: EphemerisSample[] = [];
    const baseTimeMs = baseDate.getTime();
    const cycleMs = SYNODIC_MONTH_DAYS * 24 * 3600 * 1000;

    for (let i = 0; i <= numSamples; i++) {
      const frac = i / numSamples;
      const tMs = baseTimeMs + frac * cycleMs;
      const curDate = new Date(tMs);
      const missionDay = frac * SYNODIC_MONTH_DAYS;

      const pos = this.calculatePosition(site, curDate, hm);

      samples.push({
        timestamp: tMs,
        isoDate: curDate.toISOString(),
        missionDay: Number(missionDay.toFixed(2)),
        sun: pos.sun,
        earth: pos.earth,
        libration: pos.libration,
        subSolar: pos.subSolar
      });
    }

    return samples;
  }

  /**
   * Compute aggregate metrics and operational windows across the cycle
   */
  public static computeSiteMetrics(
    site: LandingSite,
    currentDate: Date,
    horizonManager?: HorizonManager
  ): SiteMetrics {
    const hm = horizonManager || new HorizonManager(site.horizonProfile);
    const current = this.calculatePosition(site, currentDate, hm);

    // High resolution sampling (360 samples over synodic cycle ~ every 2 hours)
    const samples = this.sampleSynodicCycle(site, currentDate, 360, hm);

    let sunlitSamples = 0;
    let earthVisSamples = 0;

    let currentSunStreak = 0;
    let maxSunStreak = 0;
    let currentShadowStreak = 0;
    let maxShadowStreak = 0;

    let currentEarthStreak = 0;
    let maxEarthStreak = 0;
    let currentBlackoutStreak = 0;
    let maxBlackoutStreak = 0;

    const sampleDtHours = SYNODIC_MONTH_HOURS / 360;

    const windows: OperationalWindow[] = [];
    let curSunWinType: 'sunlight' | 'solar_shadow' | null = null;
    let sunWinStart = 0;

    let curEarWinType: 'earth_los' | 'comm_blackout' | null = null;
    let earWinStart = 0;

    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const isSunlit = !s.sun.isBlocked;
      const isEarthVis = !s.earth.isBlocked;

      if (isSunlit) {
        sunlitSamples++;
        currentSunStreak++;
        if (currentShadowStreak > maxShadowStreak) maxShadowStreak = currentShadowStreak;
        currentShadowStreak = 0;
      } else {
        currentShadowStreak++;
        if (currentSunStreak > maxSunStreak) maxSunStreak = currentSunStreak;
        currentSunStreak = 0;
      }

      if (isEarthVis) {
        earthVisSamples++;
        currentEarthStreak++;
        if (currentBlackoutStreak > maxBlackoutStreak) maxBlackoutStreak = currentBlackoutStreak;
        currentBlackoutStreak = 0;
      } else {
        currentBlackoutStreak++;
        if (currentEarthStreak > maxEarthStreak) maxEarthStreak = currentEarthStreak;
        currentEarthStreak = 0;
      }

      // Windows
      const thisSunType = isSunlit ? 'sunlight' : 'solar_shadow';
      if (curSunWinType === null) {
        curSunWinType = thisSunType;
        sunWinStart = i;
      } else if (curSunWinType !== thisSunType) {
        const dCount = i - sunWinStart;
        windows.push({
          type: curSunWinType,
          startDay: samples[sunWinStart].missionDay,
          endDay: s.missionDay,
          durationDays: Number(((s.missionDay - samples[sunWinStart].missionDay)).toFixed(2)),
          durationHours: Number((dCount * sampleDtHours).toFixed(1)),
          startIso: samples[sunWinStart].isoDate,
          endIso: s.isoDate
        });
        curSunWinType = thisSunType;
        sunWinStart = i;
      }

      const thisEarType = isEarthVis ? 'earth_los' : 'comm_blackout';
      if (curEarWinType === null) {
        curEarWinType = thisEarType;
        earWinStart = i;
      } else if (curEarWinType !== thisEarType) {
        const dCount = i - earWinStart;
        windows.push({
          type: curEarWinType,
          startDay: samples[earWinStart].missionDay,
          endDay: s.missionDay,
          durationDays: Number(((s.missionDay - samples[earWinStart].missionDay)).toFixed(2)),
          durationHours: Number((dCount * sampleDtHours).toFixed(1)),
          startIso: samples[earWinStart].isoDate,
          endIso: s.isoDate
        });
        curEarWinType = thisEarType;
        earWinStart = i;
      }
    }

    if (currentSunStreak > maxSunStreak) maxSunStreak = currentSunStreak;
    if (currentShadowStreak > maxShadowStreak) maxShadowStreak = currentShadowStreak;
    if (currentEarthStreak > maxEarthStreak) maxEarthStreak = currentEarthStreak;
    if (currentBlackoutStreak > maxBlackoutStreak) maxBlackoutStreak = currentBlackoutStreak;

    // Time to next events
    let timeToSunriseHours: number | null = null;
    let timeToSunsetHours: number | null = null;
    let timeToEarthriseHours: number | null = null;
    let timeToEarthsetHours: number | null = null;

    for (let i = 1; i < samples.length; i++) {
      const s = samples[i];
      const hoursAhead = (i * sampleDtHours);

      if (timeToSunriseHours === null && current.sun.isBlocked && !s.sun.isBlocked) {
        timeToSunriseHours = Number(hoursAhead.toFixed(1));
      }
      if (timeToSunsetHours === null && !current.sun.isBlocked && s.sun.isBlocked) {
        timeToSunsetHours = Number(hoursAhead.toFixed(1));
      }
      if (timeToEarthriseHours === null && current.earth.isBlocked && !s.earth.isBlocked) {
        timeToEarthriseHours = Number(hoursAhead.toFixed(1));
      }
      if (timeToEarthsetHours === null && !current.earth.isBlocked && s.earth.isBlocked) {
        timeToEarthsetHours = Number(hoursAhead.toFixed(1));
      }
    }

    const illuminationFraction = Number((sunlitSamples / samples.length).toFixed(3));
    const earthVisibilityFraction = Number((earthVisSamples / samples.length).toFixed(3));

    // Power Viability Score (0 to 100)
    // Formula based on NASA solar power architecture:
    // P = (illuminationFraction * 60) + (1 - min(1, maxShadowHours / 120)) * 25 + (earthVisFraction * 15)
    const longestShadowHours = Number((maxShadowStreak * sampleDtHours).toFixed(1));
    const shadowPenalty = Math.max(0, 1 - longestShadowHours / 120);
    const powerScoreRaw = (illuminationFraction * 60) + (shadowPenalty * 25) + (earthVisibilityFraction * 15);
    const powerScore = Math.max(0, Math.min(100, Math.round(powerScoreRaw)));

    let powerRating: SiteMetrics['powerRating'] = 'MODERATE';
    if (powerScore >= 85) powerRating = 'EXCELLENT';
    else if (powerScore >= 70) powerRating = 'HIGH';
    else if (powerScore >= 50) powerRating = 'MODERATE';
    else if (powerScore >= 30) powerRating = 'MARGINAL';
    else powerRating = 'CRITICAL';

    let commRating: SiteMetrics['commRating'] = 'INTERMITTENT';
    if (earthVisibilityFraction >= 0.95) commRating = 'CONTINUOUS';
    else if (earthVisibilityFraction >= 0.50) commRating = 'INTERMITTENT';
    else if (earthVisibilityFraction > 0.0) commRating = 'RELAY_REQUIRED';
    else commRating = 'OCCULTED';

    const powerExplanation = `Score ${powerScore}/100: Calculated from ${(illuminationFraction * 100).toFixed(1)}% total illumination (weight 60%), longest shadow endurance penalty of ${longestShadowHours}h against a 120h battery survival threshold (weight 25%), and direct Earth telemetry coverage of ${(earthVisibilityFraction * 100).toFixed(1)}% (weight 15%).`;

    return {
      currentSunElevation: current.sun.el,
      currentSunAzimuth: current.sun.az,
      currentEarthElevation: current.earth.el,
      currentEarthAzimuth: current.earth.az,
      sunInView: !current.sun.isBlocked,
      earthInView: !current.earth.isBlocked,
      timeToSunriseHours,
      timeToSunsetHours,
      timeToEarthriseHours,
      timeToEarthsetHours,
      illuminationFraction,
      earthVisibilityFraction,
      longestContinuousSunHours: Number((maxSunStreak * sampleDtHours).toFixed(1)),
      longestContinuousShadowHours: longestShadowHours,
      longestContinuousEarthLosHours: Number((maxEarthStreak * sampleDtHours).toFixed(1)),
      longestContinuousBlackoutHours: Number((maxBlackoutStreak * sampleDtHours).toFixed(1)),
      powerScore,
      powerRating,
      powerExplanation,
      commRating,
      windows
    };
  }
}
