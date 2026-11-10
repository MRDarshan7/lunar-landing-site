import { describe, it, expect } from 'vitest';
import { EphemerisEngine } from '../engine';
import { HORIZONS_BENCHMARKS } from '../horizonsValidation';
import { HorizonManager } from '../../terrain/horizon';
import { CURATED_SITES } from '../../terrain/lolaData';

describe('Ephemeris Engine Validation against NASA JPL Horizons', () => {
  it('should match JPL Horizons Sun and Earth topocentric positions within tolerance', () => {
    for (const b of HORIZONS_BENCHMARKS) {
      const site = {
        id: 'test-site',
        name: b.siteName,
        category: 'Custom' as const,
        lat: b.lat,
        lon: b.lon,
        elevationKm: b.elevationKm,
        description: '',
        lightingConditions: '',
        communicationConditions: '',
        scienceTarget: ''
      };

      const date = new Date(b.epochIso);
      const res = EphemerisEngine.calculatePosition(site, date);

      const sunAzDiff = Math.min(
        Math.abs(res.sun.az - b.expectedSun.az),
        360 - Math.abs(res.sun.az - b.expectedSun.az)
      );
      const sunElDiff = Math.abs(res.sun.el - b.expectedSun.el);

      expect(sunElDiff).toBeLessThanOrEqual(b.expectedSun.toleranceDeg);
      expect(sunAzDiff).toBeLessThanOrEqual(b.expectedSun.toleranceDeg);

      const earthAzDiff = Math.min(
        Math.abs(res.earth.az - b.expectedEarth.az),
        360 - Math.abs(res.earth.az - b.expectedEarth.az)
      );
      const earthElDiff = Math.abs(res.earth.el - b.expectedEarth.el);

      expect(earthElDiff).toBeLessThanOrEqual(b.expectedEarth.toleranceDeg);
      expect(earthAzDiff).toBeLessThanOrEqual(b.expectedEarth.toleranceDeg);
    }
  });


  it('should correctly flag Chang\'e-4 farside as having Earth occulted', () => {
    const change4 = CURATED_SITES.find(s => s.id === 'change-4')!;
    const date = new Date('2026-07-03T12:00:00Z');
    const pos = EphemerisEngine.calculatePosition(change4, date);

    expect(pos.earth.el).toBeLessThan(-30);
    expect(pos.earth.isBlocked).toBe(true);
  });
});

describe('Terrain Horizon & Shadow Blocking Logic', () => {
  it('should correctly determine blockage based on horizon profile', () => {
    // Custom profile: 5° obstacle between azimuth 90° and 110°
    const customProf = new Array(360).fill(1.0);
    for (let az = 90; az <= 110; az++) {
      customProf[az] = 5.0;
    }
    const hm = new HorizonManager(customProf);

    // Below horizon at az 100° (el = 3° < 5°) -> blocked
    expect(hm.isBlocked(100, 3.0)).toBe(true);

    // Above horizon at az 100° (el = 6.5° > 5°) -> clear LOS
    expect(hm.isBlocked(100, 6.5)).toBe(false);

    // Outside obstacle at az 150° (el = 2.0° > 1.0°) -> clear LOS
    expect(hm.isBlocked(150, 2.0)).toBe(false);

    // Below ground at az 150° (el = 0.5° < 1.0°) -> blocked
    expect(hm.isBlocked(150, 0.5)).toBe(true);
  });

  it('should interpolate smooth horizon between integer azimuth degrees', () => {
    const prof = new Array(360).fill(0);
    prof[10] = 2.0;
    prof[11] = 4.0;
    const hm = new HorizonManager(prof);

    expect(hm.getElevationAtAzimuth(10.5)).toBeCloseTo(3.0, 4);
    expect(hm.getElevationAtAzimuth(10.25)).toBeCloseTo(2.5, 4);
  });
});

describe('Site Metrics & Power Viability Score', () => {
  it('should compute valid 0-100 power viability score and operational windows', () => {
    const shackleton = CURATED_SITES.find(s => s.id === 'shackleton-connecting-ridge')!;
    const date = new Date('2026-07-03T12:00:00Z');
    const metrics = EphemerisEngine.computeSiteMetrics(shackleton, date);

    expect(metrics.powerScore).toBeGreaterThanOrEqual(0);
    expect(metrics.powerScore).toBeLessThanOrEqual(100);
    expect(metrics.illuminationFraction).toBeGreaterThan(0.2); // Accounting for high polar rim blockage
    expect(metrics.windows.length).toBeGreaterThan(0);
    expect(typeof metrics.powerExplanation).toBe('string');
  });
});
