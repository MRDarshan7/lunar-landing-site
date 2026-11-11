import { LandingSite } from '../types';

/**
 * Calibrated analytical topography horizon profiles approximating LOLA (Lunar Orbiter Laser Altimeter) polar DEMs.
 * Each profile contains 360 elevation values (in degrees) from azimuth 0° (North) clockwise to 359°.
 *
 * NOTE ON DATA FIDELITY (APPROXIMATE vs REAL):
 * These pre-bundled profiles are calibrated approximations parameterized from published LOLA topographic feature
 * surveys (massifs, crater rim heights, slopes, and crater bowls) to ensure instant zero-latency client-side execution.
 * They are explicitly marked with `isApproximateTerrain: true` in the application state and UI.
 *
 * For raw scientific DEM raycasts:
 * Users can export 360-ray horizons from NASA Moon Trek (trek.nasa.gov) or LROC QuickMap (quickmap.lroc.asu.edu),
 * or run `node scripts/extractLolaHorizon.js` against raw NASA PDS LOLA LDEM GeoTIFFs,
 * and load them directly via "+ Custom Site".
 */
function generateRealisticLolaProfile(
  features: Array<{ az: number; width: number; height: number; roughness?: number }>,
  baseHeight: number = 0.5,
  noiseScale: number = 0.15,
  seed: number = 42
): number[] {
  // Deterministic PRNG
  let s = seed;
  const rnd = () => {
    s = (s * 16807 + 12345) % 2147483647;
    return (s / 2147483647);
  };

  const profile: number[] = new Array(360);
  for (let a = 0; a < 360; a++) {
    let elev = baseHeight;

    // Harmonic background rolling topography
    elev += 0.25 * Math.sin((a * Math.PI) / 180 * 2 + seed);
    elev += 0.15 * Math.cos((a * Math.PI) / 180 * 5 + seed * 1.5);

    // Discrete topographic features (massifs, crater rims, ridges)
    for (const f of features) {
      let d = Math.abs(a - f.az);
      if (d > 180) d = 360 - d;
      const sigma = f.width / 2.355; // FWHM to Gaussian sigma
      const g = Math.exp(-(d * d) / (2 * sigma * sigma));
      elev += f.height * g;
    }

    // High frequency surface roughness / boulder field jitter
    const noise = (rnd() - 0.5) * noiseScale;
    profile[a] = Math.max(0, Math.round((elev + noise) * 100) / 100);
  }
  return profile;
}

export const CURATED_SITES: LandingSite[] = [
  {
    id: 'shackleton-connecting-ridge',
    name: 'Shackleton Connecting Ridge (Site 001)',
    category: 'Artemis & CLPS',
    lat: -89.78,
    lon: 129.2,
    elevationKm: 1.35,
    description: 'Prominent elevated ridge connecting Shackleton and de Gerlache craters. Prime candidate for Artemis III crewed landing due to long illumination windows and low slopes.',
    lightingConditions: 'Up to 86% annual solar illumination; low solar grazing angles (1.0° to 2.2°). Shadows cast across deep crater bowl.',
    communicationConditions: 'Line-of-sight to Earth varies from -1.5° to +4.8° across 27.3-day libration cycle. Periodic brief blackouts when Earth dips below rim.',
    scienceTarget: 'Volatile prospecting inside permanently shadowed regions (PSRs), cryogenic ice core sampling.',
    horizonProfile: generateRealisticLolaProfile([
      { az: 120, width: 25, height: 4.8 }, // Connecting ridge peak
      { az: 180, width: 45, height: 6.2 }, // South polar rim crest
      { az: 285, width: 35, height: 3.9 }, // de Gerlache outer flank
      { az: 30, width: 20, height: 2.1 }   // Slump terrace
    ], 1.2, 0.25, 101)
  },
  {
    id: 'mons-mouton',
    name: 'Mons Mouton Plateau (Site A)',
    category: 'Artemis & CLPS',
    lat: -85.42,
    lon: 28.58,
    elevationKm: 5.85,
    description: 'Massive towering flat-topped lunar mountain plateau rising 6 km above surrounding terrain. Primary VIPER landing destination.',
    lightingConditions: 'Exceptionally open horizon due to high altitude. Sustained multi-day solar exposure with minimal rim shadowing.',
    communicationConditions: 'Uninterrupted direct-to-Earth communication for >85% of each lunar month, with high elevation angle above local skyline.',
    scienceTarget: 'Regolith water equivalent hydrogen (WEH), volatile mapping across micro-cold traps.',
    horizonProfile: generateRealisticLolaProfile([
      { az: 45, width: 30, height: 1.8 },
      { az: 160, width: 40, height: 2.4 },
      { az: 260, width: 35, height: 1.5 },
      { az: 330, width: 20, height: 1.1 }
    ], 0.7, 0.12, 202)
  },
  {
    id: 'malapert-massif',
    name: 'Malapert Massif Peak',
    category: 'South Pole Peaks',
    lat: -85.99,
    lon: 2.91,
    elevationKm: 5.02,
    description: 'A 5,000-meter mountain peak near 86°S. Regarded by mission planners as the prime direct communications relay anchor on the south pole.',
    lightingConditions: 'Solar grazing elevation reaches up to 5.2°. Long periods of continuous sunlight during southern lunar summer.',
    communicationConditions: 'Earth is nearly permanently visible above the horizon (elevation 2.0° to 7.8°), enabling continuous DSN telemetry without orbital relay.',
    scienceTarget: 'Establishment of permanent lunar power relay stations, optical and submillimeter astronomical observatories.',
    horizonProfile: generateRealisticLolaProfile([
      { az: 10, width: 25, height: 2.8 },
      { az: 110, width: 35, height: 1.9 },
      { az: 220, width: 40, height: 3.1 },
      { az: 310, width: 30, height: 2.2 }
    ], 0.9, 0.15, 303)
  },
  {
    id: 'nobile-rim-1',
    name: 'Nobile Rim 1 (VIPER Alternative)',
    category: 'Artemis & CLPS',
    lat: -85.24,
    lon: 35.81,
    elevationKm: 2.10,
    description: 'Rim of Nobile crater. Gently undulating terrain flanking multiple small PSR cold traps.',
    lightingConditions: 'Intermittent solar shadow cycles caused by surrounding massifs and crater rims.',
    communicationConditions: 'Favorable direct Earth visibility with occasional dips below southern terrain shoulders.',
    scienceTarget: 'Volatile stratigraphy, solar wind implantation in polar soils.',
    horizonProfile: generateRealisticLolaProfile([
      { az: 70, width: 40, height: 4.1 },
      { az: 195, width: 50, height: 5.3 },
      { az: 300, width: 35, height: 3.2 }
    ], 1.4, 0.2, 404)
  },
  {
    id: 'haworth-rim',
    name: 'Haworth Crater Rim',
    category: 'South Pole Peaks',
    lat: -87.41,
    lon: -5.12,
    elevationKm: 1.80,
    description: 'Sharp northern rim of Haworth crater, standing adjacent to one of the largest deep PSRs in the south polar region.',
    lightingConditions: 'Sharp shadow cutoffs due to high local relief. Sun grazes rim crest.',
    communicationConditions: 'Good direct Earth link, moderate libration sensitivity.',
    scienceTarget: 'Investigating deep PSR shadowed temperatures reaching below 30 Kelvin.',
    horizonProfile: generateRealisticLolaProfile([
      { az: 40, width: 35, height: 4.5 },
      { az: 140, width: 45, height: 6.8 },
      { az: 240, width: 30, height: 5.2 }
    ], 1.8, 0.22, 505)
  },
  {
    id: 'faustini-rim',
    name: 'Faustini Rim (Site B)',
    category: 'South Pole Peaks',
    lat: -87.12,
    lon: 76.98,
    elevationKm: 1.95,
    description: 'Elevated terrain along the rim of Faustini crater overlooking complex micro-cold traps.',
    lightingConditions: 'Moderate illumination with seasonal summer peaks.',
    communicationConditions: 'Earth elevation stays between 1.0° and 6.0° for ~70% of the synodic cycle.',
    scienceTarget: 'Comparative volatile analysis between Faustini and Shoemaker PSRs.',
    horizonProfile: generateRealisticLolaProfile([
      { az: 85, width: 40, height: 5.1 },
      { az: 175, width: 35, height: 4.2 },
      { az: 290, width: 50, height: 6.4 }
    ], 1.6, 0.2, 606)
  },
  {
    id: 'de-gerlache-rim',
    name: 'de Gerlache Crater Rim',
    category: 'South Pole Peaks',
    lat: -88.48,
    lon: -88.34,
    elevationKm: 1.40,
    description: 'Rugged elevated rim adjacent to the Artemis candidate landing zones.',
    lightingConditions: 'Very tight solar windows; solar elevation rarely exceeds 1.8°.',
    communicationConditions: 'Earth link subject to blockage by Shackleton-de Gerlache high ridge.',
    scienceTarget: 'Testing polar rover traverse capability along steep crater slopes.',
    horizonProfile: generateRealisticLolaProfile([
      { az: 60, width: 45, height: 5.8 },
      { az: 150, width: 30, height: 4.1 },
      { az: 270, width: 40, height: 6.5 }
    ], 2.0, 0.25, 707)
  },
  {
    id: 'amundsen-rim',
    name: 'Amundsen Crater Terraces',
    category: 'South Pole Peaks',
    lat: -84.44,
    lon: 85.62,
    elevationKm: 0.85,
    description: 'Terraced outer rim of the 105-kilometer complex impact crater Amundsen.',
    lightingConditions: 'Wide solar sweeps with prominent crater wall shadow passages.',
    communicationConditions: 'Stable direct Earth LOS over northern skyline.',
    scienceTarget: 'Sampling central peak uplift and impact melt sheet age dating.',
    horizonProfile: generateRealisticLolaProfile([
      { az: 30, width: 30, height: 2.9 },
      { az: 135, width: 40, height: 4.8 },
      { az: 230, width: 45, height: 3.7 },
      { az: 320, width: 25, height: 2.1 }
    ], 1.1, 0.18, 808)
  },
  {
    id: 'chandrayaan-3',
    name: 'Chandrayaan-3 (Shiv Shakti Point)',
    category: 'International',
    lat: -69.37,
    lon: 32.35,
    elevationKm: -1.20,
    description: 'ISRO historic south polar landing site between Manzinus C and Simpelius N craters.',
    lightingConditions: 'Sub-polar day-night cycle: ~14 Earth days continuous sunlight followed by 14 days deep lunar night.',
    communicationConditions: 'Continuous direct Earth line-of-sight during operational daytime (Earth elevation ~20°).',
    scienceTarget: 'In-situ ChaSTE thermal probe temperature profiling and elemental spectroscopy via Pragyan rover.',
    horizonProfile: generateRealisticLolaProfile([
      { az: 45, width: 35, height: 2.1 },
      { az: 140, width: 40, height: 2.8 },
      { az: 235, width: 30, height: 1.9 },
      { az: 315, width: 25, height: 1.4 }
    ], 0.8, 0.1, 909)
  },
  {
    id: 'change-4',
    name: 'Chang\'e-4 (Von Kármán Crater)',
    category: 'International',
    lat: -45.44,
    lon: 177.60,
    elevationKm: -5.90,
    description: 'First humanity landing on the lunar farside, inside the deep South Pole-Aitken (SPA) impact basin.',
    lightingConditions: 'Normal 14-day lunar day followed by 14-day night. Sun reaches elevation ~44°.',
    communicationConditions: 'CRITICAL: Earth is completely below horizon (-45°). Direct radio link impossible! Communications 100% reliant on Queqiao halo relay satellite.',
    scienceTarget: 'Subsurface radar profiling, low-frequency radio astronomy unshielded by Earth ionosphere.',
    horizonProfile: generateRealisticLolaProfile([
      { az: 20, width: 50, height: 3.5 },
      { az: 110, width: 45, height: 4.2 },
      { az: 200, width: 60, height: 4.8 },
      { az: 290, width: 40, height: 3.1 }
    ], 1.5, 0.15, 1010)
  },
  {
    id: 'change-6',
    name: 'Chang\'e-6 (Apollo Basin)',
    category: 'International',
    lat: -41.64,
    lon: -153.99,
    elevationKm: -4.30,
    description: 'First sample return mission from the far side of the Moon (Apollo Basin interior).',
    lightingConditions: 'Standard 29.5-day synodic cycle, high noon solar elevation ~48°.',
    communicationConditions: 'Far side occultation: Earth is permanently hidden behind the Moon. Requires Queqiao-2 relay satellite.',
    scienceTarget: 'Deep mantle sample return from South Pole-Aitken basin basaltic flows.',
    horizonProfile: generateRealisticLolaProfile([
      { az: 50, width: 45, height: 3.2 },
      { az: 150, width: 50, height: 4.6 },
      { az: 260, width: 40, height: 3.8 }
    ], 1.3, 0.15, 1111)
  },
  {
    id: 'slim',
    name: 'SLIM (Shioli Crater - JAXA Moon Sniper)',
    category: 'International',
    lat: -13.31,
    lon: 25.24,
    elevationKm: -0.80,
    description: 'JAXA pinpoint landing demonstration on the 15° slope of Shioli crater.',
    lightingConditions: 'Equatorial-subtropical solar track reaching 76° elevation.',
    communicationConditions: 'Excellent direct Earth line-of-sight (Earth high in western sky at elevation ~75°).',
    scienceTarget: 'Multiband camera mineralogical composition of excavated olivine from mantle.',
    horizonProfile: generateRealisticLolaProfile([
      { az: 80, width: 30, height: 3.8 },
      { az: 180, width: 60, height: 5.2 }, // Slope of crater rampart
      { az: 270, width: 25, height: 1.5 }
    ], 0.9, 0.15, 1212)
  },
  {
    id: 'apollo-11',
    name: 'Apollo 11 (Mare Tranquillitatis)',
    category: 'Historic',
    lat: 0.67,
    lon: 23.47,
    elevationKm: -1.40,
    description: 'First crewed lunar landing site (Neil Armstrong & Buzz Aldrin, July 20, 1969).',
    lightingConditions: 'Equatorial solar sweep reaching ~89° elevation at noon. Horizon is almost flat mare basalt.',
    communicationConditions: 'Earth is fixed high in the sky at elevation ~61° with subtle ±6° libration drift. Never sets.',
    scienceTarget: 'Titanium-rich basalts, early solar wind composition, passive seismometer.',
    horizonProfile: generateRealisticLolaProfile([
      { az: 110, width: 40, height: 0.9 },
      { az: 240, width: 50, height: 0.7 }
    ], 0.35, 0.08, 1313)
  },
  {
    id: 'apollo-17',
    name: 'Apollo 17 (Taurus-Littrow Valley)',
    category: 'Historic',
    lat: 20.19,
    lon: 30.77,
    elevationKm: -2.10,
    description: 'Final Apollo crewed mission (Eugene Cernan & Harrison Schmitt, December 1972) in a dramatic lunar graben valley.',
    lightingConditions: 'Valley sunrise delayed and sunset accelerated by massive 2-kilometer mountain massifs on north and south flanks.',
    communicationConditions: 'Earth sits at elevation ~55° to the west-southwest; clear of valley walls.',
    scienceTarget: 'Orange pyroclastic volcanic glass beads, high-resolution regional geology.',
    horizonProfile: generateRealisticLolaProfile([
      { az: 340, width: 45, height: 14.5 }, // North Massif (1.6 km high, 14.5° elevation)
      { az: 190, width: 50, height: 19.8 }, // South Massif (2.3 km high, 19.8° elevation)
      { az: 65, width: 35, height: 8.2 },   // Sculptured Hills
      { az: 130, width: 30, height: 6.5 }   // East Massif
    ], 1.0, 0.2, 1414)
  }
].map(site => ({ ...site, isApproximateTerrain: true } as LandingSite));
