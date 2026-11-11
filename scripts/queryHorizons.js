#!/usr/bin/env node
/**
 * queryHorizons.js
 * 
 * Fetches ground-truth topocentric azimuth and elevation from the NASA JPL Horizons REST API.
 * 
 * Target Bodies:
 * - 10: Sun
 * - 399: Earth
 * 
 * Center:
 * - coord@301: Geodetic coordinates on the Moon (body 301)
 * 
 * Quantities:
 * - 4: Apparent topocentric Azimuth & Elevation (Azi, Elev)
 * 
 * Usage:
 *   node scripts/queryHorizons.js
 */

// Native fetch is available in Node 18+

async function fetchHorizons(targetCode, lon, lat, altKm, startTime, stopTime) {
  const params = new URLSearchParams({
    format: 'json',
    COMMAND: `'${targetCode}'`,
    CENTER: `'coord@301'`,
    COORD_TYPE: `'GEODETIC'`,
    SITE_COORD: `'${lon.toFixed(4)},${lat.toFixed(4)},${altKm.toFixed(3)}'`,
    START_TIME: `'${startTime}'`,
    STOP_TIME: `'${stopTime}'`,
    STEP_SIZE: `'1m'`,
    QUANTITIES: `'4'`
  });

  const url = `https://ssd.jpl.nasa.gov/api/horizons.api?${params.toString()}`;
  console.log(`Querying JPL Horizons: Target ${targetCode} (${targetCode === '10' ? 'Sun' : 'Earth'}) at lat=${lat}, lon=${lon}...`);

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Horizons HTTP error: ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json();
  const text = data.result || '';

  // Extract tabular data between $$SOE and $$EOE
  const soeIdx = text.indexOf('$$SOE');
  const eoeIdx = text.indexOf('$$EOE');

  if (soeIdx === -1 || eoeIdx === -1) {
    console.error('Horizons Raw Output:', text.substring(0, 1000));
    throw new Error('Could not parse $$SOE / $$EOE markers from JPL Horizons response');
  }

  const tableBlock = text.substring(soeIdx + 5, eoeIdx).trim();
  const firstLine = tableBlock.split('\n')[0].trim();
  console.log('RAW LINE:', firstLine);
  // Columns: Date__(UT)__HR:MN, flag, Azi_(a-app), Elev_(a-app)
  const tokens = firstLine.split(/\s+/);
  const epoch = tokens.slice(0, 2).join(' ');
  // When flag like *i or m is present, numeric azimuth & elevation are tokens[3], tokens[4]
  // Or grab the last two numeric tokens on the line:
  const lineNumbers = tokens.filter(t => !isNaN(parseFloat(t))).slice(-2).map(parseFloat);
  const azi = lineNumbers[0];
  const elev = lineNumbers[1];

  return { epoch, azi, elev, rawLine: firstLine, url };
}

async function main() {
  const sites = [
    { name: 'Shackleton Connecting Ridge', lat: -89.78, lon: 129.2, altKm: 1.35 },
    { name: 'Malapert Massif Peak', lat: -85.99, lon: 2.91, altKm: 5.02 },
    { name: 'Apollo 11', lat: 0.67, lon: 23.47, altKm: -1.40 }
  ];

  const startTime = '2026-07-03 12:00';
  const stopTime = '2026-07-03 12:01';

  console.log('================================================================');
  console.log('NASA JPL HORIZONS GROUND-TRUTH QUERY (DE441 Ephemerides)');
  console.log('Epoch: 2026-07-03 12:00 UTC');
  console.log('================================================================\n');

  for (const s of sites) {
    try {
      const sun = await fetchHorizons('10', s.lon, s.lat, s.altKm, startTime, stopTime);
      const earth = await fetchHorizons('399', s.lon, s.lat, s.altKm, startTime, stopTime);

      console.log(`\nSite: ${s.name} (lat=${s.lat}°, lon=${s.lon}°, alt=${s.altKm} km)`);
      console.log(`  Sun:   Azimuth = ${sun.azi.toFixed(2)}°, Elevation = ${sun.elev.toFixed(2)}°`);
      console.log(`  Earth: Azimuth = ${earth.azi.toFixed(2)}°, Elevation = ${earth.elev.toFixed(2)}°`);
    } catch (err) {
      console.error(`Failed to query site ${s.name}:`, err.message);
    }
  }
}

main();
