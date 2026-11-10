import { EphemerisSample, SiteMetrics, LandingSite } from '../types';

export function exportEphemerisCsv(
  site: LandingSite,
  samples: EphemerisSample[],
  metrics: SiteMetrics
): void {
  const rows: string[] = [];

  // Header metadata
  rows.push(`# Lunar Landing Site Navigator - Ephemeris & Telemetry Export`);
  rows.push(`# Site: ${site.name} (${site.lat}° lat, ${site.lon}° lon, ${site.elevationKm} km elev)`);
  rows.push(`# Illumination: ${(metrics.illuminationFraction * 100).toFixed(1)}% | Earth Visibility: ${(metrics.earthVisibilityFraction * 100).toFixed(1)}% | Power Score: ${metrics.powerScore}/100`);
  rows.push('');

  // Column Headers
  rows.push([
    'Mission_Day',
    'UTC_Timestamp',
    'Sun_Azimuth_deg',
    'Sun_Elevation_deg',
    'Sun_Distance_AU',
    'Sun_Status',
    'Sun_Horizon_Elevation_deg',
    'Earth_Azimuth_deg',
    'Earth_Elevation_deg',
    'Earth_Distance_km',
    'Earth_Status',
    'Earth_Horizon_Elevation_deg',
    'Earth_Libration_SubLat_deg',
    'Earth_Libration_SubLon_deg'
  ].join(','));

  // Data rows
  for (const s of samples) {
    rows.push([
      s.missionDay.toFixed(2),
      s.isoDate,
      s.sun.az.toFixed(2),
      s.sun.el.toFixed(2),
      s.sun.distance.toFixed(4),
      s.sun.isBlocked ? 'BLOCKED' : 'SUNLIT',
      s.sun.horizonElevation.toFixed(2),
      s.earth.az.toFixed(2),
      s.earth.el.toFixed(2),
      s.earth.distance,
      s.earth.isBlocked ? 'BLOCKED' : 'LOS',
      s.earth.horizonElevation.toFixed(2),
      s.libration.earthSubLat.toFixed(3),
      s.libration.earthSubLon.toFixed(3)
    ].join(','));
  }

  // Windows section
  rows.push('');
  rows.push('# Operational Windows');
  rows.push(['Window_Type', 'Start_Day', 'End_Day', 'Duration_Days', 'Duration_Hours', 'Start_UTC', 'End_UTC'].join(','));
  for (const w of metrics.windows) {
    rows.push([
      w.type,
      w.startDay.toFixed(2),
      w.endDay.toFixed(2),
      w.durationDays.toFixed(2),
      w.durationHours.toFixed(1),
      w.startIso,
      w.endIso
    ].join(','));
  }

  const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.join('\n'));
  const link = document.createElement('a');
  link.setAttribute('href', csvContent);
  link.setAttribute('download', `${site.id}-lunar-ephemeris.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
