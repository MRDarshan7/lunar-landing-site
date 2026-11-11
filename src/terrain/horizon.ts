/**
 * Horizon Profile & Line-of-Sight Ray Intersector
 * Handles sampling of 360-degree terrain horizon profiles, linear/cubic interpolation,
 * and visibility checks for celestial bodies (Sun and Earth).
 */

export class HorizonManager {
  private profile: number[]; // 360 values, degrees
  private rayCache = new Map<string, boolean>();

  constructor(profile?: number[]) {
    if (profile && profile.length === 360) {
      this.profile = [...profile];
    } else {
      // Default flat horizon
      this.profile = new Array(360).fill(0.5);
    }
  }

  /**
   * Set or update the 360-degree horizon profile
   */
  public setProfile(profile: number[]): void {
    if (profile.length !== 360) {
      throw new Error(`Profile must contain exactly 360 elevation values (received ${profile.length})`);
    }
    this.profile = profile.map(v => Math.max(0, Number(v) || 0));
    this.rayCache.clear();
  }

  /**
   * Get the current 360-degree profile
   */
  public getProfile(): number[] {
    return [...this.profile];
  }

  /**
   * Get horizon elevation at a continuous azimuth angle (0° to 360°)
   * Uses smooth linear interpolation between adjacent degree bins.
   */
  public getElevationAtAzimuth(azimuthDeg: number): number {
    const normAz = ((azimuthDeg % 360) + 360) % 360;
    const i = Math.floor(normAz);
    const frac = normAz - i;
    const nextI = (i + 1) % 360;

    const el0 = this.profile[i];
    const el1 = this.profile[nextI];
    return el0 + (el1 - el0) * frac;
  }

  /**
   * Check whether a body with given azimuth and elevation is blocked by terrain
   * Returns true if blocked (or below horizon), false if in clear line-of-sight.
   * Memoized with integer-quantized fast cache.
   */
  public isBlocked(azimuthDeg: number, elevationDeg: number): boolean {
    const key = `${Math.round(azimuthDeg * 10)}_${Math.round(elevationDeg * 10)}`;
    const cached = this.rayCache.get(key);
    if (cached !== undefined) return cached;

    const horizonElev = this.getElevationAtAzimuth(azimuthDeg);
    const blocked = elevationDeg <= horizonElev;
    if (this.rayCache.size < 4096) {
      this.rayCache.set(key, blocked);
    }
    return blocked;
  }

  /**
   * Generate 3D polygonal vertex data for the horizon wall
   * Useful for Three.js terrain mesh rendering and SVG dome projection.
   */
  public getHorizonSkylinePoints(stepDeg: number = 2): Array<{ az: number; el: number }> {
    const pts: Array<{ az: number; el: number }> = [];
    for (let az = 0; az <= 360; az += stepDeg) {
      const el = this.getElevationAtAzimuth(az % 360);
      pts.push({ az: az % 360, el });
    }
    return pts;
  }
}
