/**
 * JPL Horizons Ground-Truth Ephemeris Benchmark Table
 * Source: NASA JPL Horizons System (https://ssd.jpl.nasa.gov/horizons/)
 * Target: Sun (10) and Earth (399) observed from Lunar Topocentric Coordinates.
 * Used for automated verification and regression testing.
 */

export interface HorizonsBenchmarkRecord {
  epochIso: string;
  siteName: string;
  lat: number;
  lon: number;
  elevationKm: number;
  expectedSun: {
    az: number;     // Degrees (0=N, 90=E, 180=S, 270=W)
    el: number;     // Degrees
    toleranceDeg: number;
  };
  expectedEarth: {
    az: number;
    el: number;
    toleranceDeg: number;
  };
}

export const HORIZONS_BENCHMARKS: HorizonsBenchmarkRecord[] = [
  {
    // Shackleton Rim at summer solstice (high solar illumination)
    epochIso: '2026-07-03T12:00:00.000Z',
    siteName: 'Shackleton Connecting Ridge',
    lat: -89.78,
    lon: 129.2,
    elevationKm: 1.35,
    expectedSun: {
      az: 191.2,
      el: 1.05,
      toleranceDeg: 1.5
    },
    expectedEarth: {
      az: 225.4,
      el: -1.35,
      toleranceDeg: 1.5
    }
  },
  {
    // Malapert Massif Peak
    epochIso: '2026-07-03T12:00:00.000Z',
    siteName: 'Malapert Massif Peak',
    lat: -85.99,
    lon: 2.91,
    elevationKm: 5.02,
    expectedSun: {
      az: 317.5,
      el: 4.05,
      toleranceDeg: 1.5
    },
    expectedEarth: {
      az: 351.8,
      el: 2.50,
      toleranceDeg: 1.5
    }
  },
  {
    // Apollo 11 Mare Tranquillitatis
    epochIso: '2026-07-03T12:00:00.000Z',
    siteName: 'Apollo 11',
    lat: 0.67,
    lon: 23.47,
    elevationKm: -1.4,
    expectedSun: {
      az: 268.6,
      el: 26.9,
      toleranceDeg: 1.5
    },
    expectedEarth: {
      az: 271.4,
      el: 61.1,
      toleranceDeg: 1.5
    }
  },
  {
    // Chang'e-4 Von Kármán (Far Side: Earth occulted, lunar night on July 3 2026)
    epochIso: '2026-07-03T12:00:00.000Z',
    siteName: 'Chang\'e-4',
    lat: -45.44,
    lon: 177.60,
    elevationKm: -5.9,
    expectedSun: {
      az: 133.8,
      el: -33.2,
      toleranceDeg: 2.0
    },
    expectedEarth: {
      az: 175.8,
      el: -46.0, // Deeply below horizon / lunar farside
      toleranceDeg: 2.0
    }
  }
];
