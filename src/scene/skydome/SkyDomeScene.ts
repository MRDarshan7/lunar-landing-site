import * as THREE from 'three';
import { EphemerisSample, CelestialBodyPos } from '../../types';

/**
 * Precision Astrodynamics Sky-Dome Instrument
 * Modeled as a scientific flight-dynamics celestial sphere:
 * - Laser-etched polar azimuth compass rose (0° N Earthward, 90° E, 180° S, 270° W)
 * - Major tick marks every 10°, minor tick marks every 2°
 * - Elevation altitude rings at 0°, 10°, 20°, 30°, 60°
 * - Dual-state 29.53-day Sun trajectory ribbon: glowing gold (illuminated) vs dashed crimson (shadow)
 * - Earth libration locus loop with active LOS telemetry ray and ridge occlusion crosshair
 */
export class SkyDomeScene {
  public group: THREE.Group;
  public domeWireframeGroup: THREE.Group;
  public sunPathGroup: THREE.Group;
  public earthPathGroup: THREE.Group;
  public sunMarker: THREE.Group;
  public earthMarker: THREE.Group;
  public sunRay: THREE.Line;
  public earthRay: THREE.Line;
  public occlusionCrosshair: THREE.Group;
  public hudLabelsGroup: THREE.Group;

  private domeRadius: number = 16.0;

  // Pre-allocated fixed-size buffers and geometries for zero-GC updates
  private static readonly MAX_PATH_SEGMENTS = 512;

  private sunRayPositions: Float32Array;
  private sunRayGeo: THREE.BufferGeometry;
  private earthRayPositions: Float32Array;
  private earthRayGeo: THREE.BufferGeometry;

  private sunLitPositions: Float32Array;
  private sunLitGeo: THREE.BufferGeometry;
  private sunLitLine: THREE.LineSegments;

  private sunShadowPositions: Float32Array;
  private sunShadowGeo: THREE.BufferGeometry;
  private sunShadowLine: THREE.LineSegments;

  private earthLosPositions: Float32Array;
  private earthLosGeo: THREE.BufferGeometry;
  private earthLosLine: THREE.LineSegments;

  private earthBlockedPositions: Float32Array;
  private earthBlockedGeo: THREE.BufferGeometry;
  private earthBlockedLine: THREE.LineSegments;

  // Reusable scratch objects
  private scratchSunPos = new THREE.Vector3();
  private scratchEarthPos = new THREE.Vector3();
  private scratchLanderAntenna = new THREE.Vector3(0, 0.85, 0);
  private scratchP0 = new THREE.Vector3();
  private scratchP1 = new THREE.Vector3();
  private scratchDir = new THREE.Vector3();
  private scratchCrosshair = new THREE.Vector3();

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'SkyDomeElements';

    // 1. Dome Wireframe, Polar Graticule & Laser-Etched Compass Rose
    this.domeWireframeGroup = new THREE.Group();
    this.buildPrecisionGraticule();
    this.group.add(this.domeWireframeGroup);

    // 2. Dual-state celestial trajectory paths with fixed pre-allocated buffers
    this.sunPathGroup = new THREE.Group();
    this.earthPathGroup = new THREE.Group();
    this.group.add(this.sunPathGroup);
    this.group.add(this.earthPathGroup);

    const goldMat = new THREE.LineBasicMaterial({
      color: 0xf59e0b, // amber-500
      linewidth: 3.0
    });
    const shadowMat = new THREE.LineDashedMaterial({
      color: 0xef4444, // red-500
      dashSize: 0.4,
      gapSize: 0.25,
      linewidth: 2.5
    });

    const earthLosMat = new THREE.LineBasicMaterial({
      color: 0x06b6d4, // cyan-500
      linewidth: 2.5
    });
    const earthBlockedMat = new THREE.LineDashedMaterial({
      color: 0xf43f5e, // rose-500
      dashSize: 0.5,
      gapSize: 0.3,
      linewidth: 2.5
    });

    const maxSegs = SkyDomeScene.MAX_PATH_SEGMENTS;
    this.sunLitPositions = new Float32Array(maxSegs * 6);
    this.sunLitGeo = new THREE.BufferGeometry();
    this.sunLitGeo.setAttribute('position', new THREE.BufferAttribute(this.sunLitPositions, 3));
    this.sunLitGeo.setDrawRange(0, 0);
    this.sunLitLine = new THREE.LineSegments(this.sunLitGeo, goldMat);
    this.sunPathGroup.add(this.sunLitLine);

    this.sunShadowPositions = new Float32Array(maxSegs * 6);
    this.sunShadowGeo = new THREE.BufferGeometry();
    this.sunShadowGeo.setAttribute('position', new THREE.BufferAttribute(this.sunShadowPositions, 3));
    this.sunShadowGeo.setDrawRange(0, 0);
    this.sunShadowLine = new THREE.LineSegments(this.sunShadowGeo, shadowMat);
    this.sunPathGroup.add(this.sunShadowLine);

    this.earthLosPositions = new Float32Array(maxSegs * 6);
    this.earthLosGeo = new THREE.BufferGeometry();
    this.earthLosGeo.setAttribute('position', new THREE.BufferAttribute(this.earthLosPositions, 3));
    this.earthLosGeo.setDrawRange(0, 0);
    this.earthLosLine = new THREE.LineSegments(this.earthLosGeo, earthLosMat);
    this.earthPathGroup.add(this.earthLosLine);

    this.earthBlockedPositions = new Float32Array(maxSegs * 6);
    this.earthBlockedGeo = new THREE.BufferGeometry();
    this.earthBlockedGeo.setAttribute('position', new THREE.BufferAttribute(this.earthBlockedPositions, 3));
    this.earthBlockedGeo.setDrawRange(0, 0);
    this.earthBlockedLine = new THREE.LineSegments(this.earthBlockedGeo, earthBlockedMat);
    this.earthPathGroup.add(this.earthBlockedLine);

    // 3. Sun Marker (Multi-layer corona halo + point light)
    this.sunMarker = new THREE.Group();
    const sunGeo = new THREE.SphereGeometry(0.55, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });
    this.sunMarker.add(new THREE.Mesh(sunGeo, sunMat));

    // Outer solar corona
    const coronaGeo = new THREE.SphereGeometry(0.95, 20, 20);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    this.sunMarker.add(new THREE.Mesh(coronaGeo, coronaMat));

    const sunLight = new THREE.PointLight(0xfff8db, 2.2, 50, 1.2);
    this.sunMarker.add(sunLight);
    this.group.add(this.sunMarker);

    // 4. Earth Marker (Atmospheric scattering glow + libration marker)
    this.earthMarker = new THREE.Group();
    const earthGeo = new THREE.SphereGeometry(0.44, 32, 32);
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.55,
      metalness: 0.15
    });
    this.earthMarker.add(new THREE.Mesh(earthGeo, earthMat));

    // Atmospheric scattering halo
    const atmoGeo = new THREE.SphereGeometry(0.54, 20, 20);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending
    });
    this.earthMarker.add(new THREE.Mesh(atmoGeo, atmoMat));
    this.group.add(this.earthMarker);

    // 5. Line-of-sight Telemetry Rays with fixed pre-allocated buffers
    const rayMatSun = new THREE.LineBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.75,
      linewidth: 2.0
    });
    this.sunRayPositions = new Float32Array(6);
    this.sunRayGeo = new THREE.BufferGeometry();
    this.sunRayGeo.setAttribute('position', new THREE.BufferAttribute(this.sunRayPositions, 3));
    this.sunRay = new THREE.Line(this.sunRayGeo, rayMatSun);
    this.group.add(this.sunRay);

    const rayMatEarth = new THREE.LineDashedMaterial({
      color: 0x06b6d4,
      dashSize: 0.5,
      gapSize: 0.25,
      transparent: true,
      opacity: 0.85,
      linewidth: 2.5
    });
    this.earthRayPositions = new Float32Array(6);
    this.earthRayGeo = new THREE.BufferGeometry();
    this.earthRayGeo.setAttribute('position', new THREE.BufferAttribute(this.earthRayPositions, 3));
    this.earthRay = new THREE.Line(this.earthRayGeo, rayMatEarth);
    this.group.add(this.earthRay);

    // 6. Terrain Occlusion Intersection Crosshair
    this.occlusionCrosshair = new THREE.Group();
    const crosshairMat = new THREE.LineBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.9,
      linewidth: 2.5
    });
    const chPoints = [
      new THREE.Vector3(-0.4, 0, 0), new THREE.Vector3(0.4, 0, 0),
      new THREE.Vector3(0, -0.4, 0), new THREE.Vector3(0, 0.4, 0)
    ];
    const chGeo = new THREE.BufferGeometry().setFromPoints(chPoints);
    const chLine = new THREE.LineSegments(chGeo, crosshairMat);
    this.occlusionCrosshair.add(chLine);

    const chRing = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.32, 16),
      new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
    );
    this.occlusionCrosshair.add(chRing);
    this.occlusionCrosshair.visible = false;
    this.group.add(this.occlusionCrosshair);

    // 7. HUD Labels & Cardinal Headings
    this.hudLabelsGroup = new THREE.Group();
    this.group.add(this.hudLabelsGroup);

    this.group.visible = false;
  }

  /**
   * Convert Azimuth (deg, 0=N, 90=E) and Elevation (deg) to 3D Cartesian coordinates
   * Y = Up (Zenith)
   * Z = North (azimuth 0°)
   * X = East (azimuth 90°)
   * Optionally accepts a target vector to eliminate GC.
   */
  public toCartesian(azDeg: number, elDeg: number, r: number = this.domeRadius, target?: THREE.Vector3): THREE.Vector3 {
    const elRad = (elDeg * Math.PI) / 180;
    const azRad = (azDeg * Math.PI) / 180;

    const y = r * Math.sin(elRad);
    const horizR = r * Math.cos(elRad);

    const x = horizR * Math.sin(azRad);
    const z = horizR * Math.cos(azRad);

    if (target) {
      target.set(x, y, z);
      return target;
    }
    return new THREE.Vector3(x, y, z);
  }

  /**
   * Build precision laser-etched polar azimuth compass rose & altitude rings
   */
  private buildPrecisionGraticule(): void {
    const r = this.domeRadius;

    // Line materials
    const majorLineMat = new THREE.LineBasicMaterial({
      color: 0x0ea5e9, // bright cyan
      transparent: true,
      opacity: 0.42
    });

    const minorLineMat = new THREE.LineBasicMaterial({
      color: 0x334155, // slate-700
      transparent: true,
      opacity: 0.35
    });

    const altRingMat = new THREE.LineBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.22
    });

    // 1. Base 0° Horizon Compass Ring
    const basePts: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const th = (i / 128) * Math.PI * 2;
      basePts.push(new THREE.Vector3(Math.sin(th) * r, 0.04, Math.cos(th) * r));
    }
    const baseRing = new THREE.Line(new THREE.BufferGeometry().setFromPoints(basePts), majorLineMat);
    this.domeWireframeGroup.add(baseRing);

    // 2. Azimuth tick marks around perimeter:
    // Minor ticks every 2°, Major ticks every 10°
    const tickPts: THREE.Vector3[] = [];
    for (let az = 0; az < 360; az += 2) {
      const isMajor = az % 10 === 0;
      const isCardinal = az % 90 === 0;
      const rad = (az * Math.PI) / 180;

      const innerR = isCardinal ? r - 0.75 : isMajor ? r - 0.45 : r - 0.22;
      const x0 = Math.sin(rad) * innerR;
      const z0 = Math.cos(rad) * innerR;
      const x1 = Math.sin(rad) * r;
      const z1 = Math.cos(rad) * r;

      tickPts.push(new THREE.Vector3(x0, 0.04, z0));
      tickPts.push(new THREE.Vector3(x1, 0.04, z1));
    }
    const tickLines = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(tickPts),
      minorLineMat
    );
    this.domeWireframeGroup.add(tickLines);

    // 3. Elevation Altitude Rings at 0°, 10°, 20°, 30°, 60°
    const altAngles = [10, 20, 30, 60];
    altAngles.forEach(el => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 96; i++) {
        const th = (i / 96) * Math.PI * 2;
        const p = this.toCartesian((th * 180) / Math.PI, el);
        pts.push(p);
      }
      const ringLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), altRingMat);
      this.domeWireframeGroup.add(ringLine);
    });

    // 4. Azimuth Meridians every 30° from horizon to zenith
    for (let az = 0; az < 360; az += 30) {
      const pts: THREE.Vector3[] = [];
      for (let el = 0; el <= 90; el += 3) {
        pts.push(this.toCartesian(az, el));
      }
      const isCardinal = az % 90 === 0;
      const meridianLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        isCardinal ? majorLineMat : minorLineMat
      );
      this.domeWireframeGroup.add(meridianLine);
    }

    // 5. Subtle deep-space dome glass shell
    const domeGlassMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.035,
      side: THREE.BackSide,
      depthWrite: false
    });
    const domeShellGeo = new THREE.SphereGeometry(r, 36, 18, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const domeShell = new THREE.Mesh(domeShellGeo, domeGlassMat);
    this.domeWireframeGroup.add(domeShell);
  }

  /**
   * Update Sun and Earth trajectory paths based on synodic ephemeris samples
   * Sun: Dual-state solid glowing gold (illuminated) vs dashed crimson (shadow)
   * Earth: Continuous libration loop ribbon
   * Updates pre-allocated Float32Array buffers in-place with zero GC allocations.
   */
  public updatePaths(samples: EphemerisSample[]): void {
    let sunLitCount = 0;
    let sunShadowCount = 0;
    let earthLosCount = 0;
    let earthBlockedCount = 0;

    const maxSegs = SkyDomeScene.MAX_PATH_SEGMENTS;
    const len = Math.min(samples.length - 1, maxSegs);

    // Sun trajectory ribbons
    for (let i = 0; i < len; i++) {
      const s0 = samples[i];
      const s1 = samples[i + 1];
      if (s0.sun.el < -4 && s1.sun.el < -4) continue;

      this.toCartesian(s0.sun.az, s0.sun.el, this.domeRadius, this.scratchP0);
      this.toCartesian(s1.sun.az, s1.sun.el, this.domeRadius, this.scratchP1);

      const isBlocked = s0.sun.isBlocked || s1.sun.isBlocked;
      if (isBlocked) {
        if (sunShadowCount < maxSegs) {
          const idx = sunShadowCount * 6;
          this.sunShadowPositions[idx] = this.scratchP0.x;
          this.sunShadowPositions[idx + 1] = this.scratchP0.y;
          this.sunShadowPositions[idx + 2] = this.scratchP0.z;
          this.sunShadowPositions[idx + 3] = this.scratchP1.x;
          this.sunShadowPositions[idx + 4] = this.scratchP1.y;
          this.sunShadowPositions[idx + 5] = this.scratchP1.z;
          sunShadowCount++;
        }
      } else {
        if (sunLitCount < maxSegs) {
          const idx = sunLitCount * 6;
          this.sunLitPositions[idx] = this.scratchP0.x;
          this.sunLitPositions[idx + 1] = this.scratchP0.y;
          this.sunLitPositions[idx + 2] = this.scratchP0.z;
          this.sunLitPositions[idx + 3] = this.scratchP1.x;
          this.sunLitPositions[idx + 4] = this.scratchP1.y;
          this.sunLitPositions[idx + 5] = this.scratchP1.z;
          sunLitCount++;
        }
      }
    }

    // Earth libration ribbons
    for (let i = 0; i < len; i++) {
      const s0 = samples[i];
      const s1 = samples[i + 1];
      if (s0.earth.el < -4 && s1.earth.el < -4) continue;

      this.toCartesian(s0.earth.az, s0.earth.el, this.domeRadius, this.scratchP0);
      this.toCartesian(s1.earth.az, s1.earth.el, this.domeRadius, this.scratchP1);

      const isBlocked = s0.earth.isBlocked || s1.earth.isBlocked;
      if (isBlocked) {
        if (earthBlockedCount < maxSegs) {
          const idx = earthBlockedCount * 6;
          this.earthBlockedPositions[idx] = this.scratchP0.x;
          this.earthBlockedPositions[idx + 1] = this.scratchP0.y;
          this.earthBlockedPositions[idx + 2] = this.scratchP0.z;
          this.earthBlockedPositions[idx + 3] = this.scratchP1.x;
          this.earthBlockedPositions[idx + 4] = this.scratchP1.y;
          this.earthBlockedPositions[idx + 5] = this.scratchP1.z;
          earthBlockedCount++;
        }
      } else {
        if (earthLosCount < maxSegs) {
          const idx = earthLosCount * 6;
          this.earthLosPositions[idx] = this.scratchP0.x;
          this.earthLosPositions[idx + 1] = this.scratchP0.y;
          this.earthLosPositions[idx + 2] = this.scratchP0.z;
          this.earthLosPositions[idx + 3] = this.scratchP1.x;
          this.earthLosPositions[idx + 4] = this.scratchP1.y;
          this.earthLosPositions[idx + 5] = this.scratchP1.z;
          earthLosCount++;
        }
      }
    }

    this.sunLitGeo.setDrawRange(0, sunLitCount * 2);
    this.sunLitGeo.attributes.position.needsUpdate = true;

    this.sunShadowGeo.setDrawRange(0, sunShadowCount * 2);
    this.sunShadowGeo.attributes.position.needsUpdate = true;
    if (sunShadowCount > 0) this.sunShadowLine.computeLineDistances();

    this.earthLosGeo.setDrawRange(0, earthLosCount * 2);
    this.earthLosGeo.attributes.position.needsUpdate = true;

    this.earthBlockedGeo.setDrawRange(0, earthBlockedCount * 2);
    this.earthBlockedGeo.attributes.position.needsUpdate = true;
    if (earthBlockedCount > 0) this.earthBlockedLine.computeLineDistances();
  }

  /**
   * Update active celestial positions and telemetry line-of-sight rays.
   * Updates pre-allocated Float32Array buffers in-place with zero GC allocations.
   */
  public updatePositions(sun: CelestialBodyPos, earth: CelestialBodyPos): void {
    this.toCartesian(sun.az, Math.max(-2, sun.el), this.domeRadius, this.scratchSunPos);
    this.toCartesian(earth.az, Math.max(-2, earth.el), this.domeRadius, this.scratchEarthPos);

    this.sunMarker.position.copy(this.scratchSunPos);
    this.earthMarker.position.copy(this.scratchEarthPos);

    this.sunMarker.visible = sun.el > -4;
    this.earthMarker.visible = earth.el > -4;

    // Update Sun Ray buffer in-place
    this.sunRayPositions[0] = this.scratchLanderAntenna.x;
    this.sunRayPositions[1] = this.scratchLanderAntenna.y;
    this.sunRayPositions[2] = this.scratchLanderAntenna.z;
    this.sunRayPositions[3] = this.scratchSunPos.x;
    this.sunRayPositions[4] = this.scratchSunPos.y;
    this.sunRayPositions[5] = this.scratchSunPos.z;
    this.sunRayGeo.attributes.position.needsUpdate = true;
    this.sunRay.visible = !sun.isBlocked && sun.el > 0;

    // Update Earth LOS Ray buffer in-place
    this.earthRayPositions[0] = this.scratchLanderAntenna.x;
    this.earthRayPositions[1] = this.scratchLanderAntenna.y;
    this.earthRayPositions[2] = this.scratchLanderAntenna.z;
    this.earthRayPositions[3] = this.scratchEarthPos.x;
    this.earthRayPositions[4] = this.scratchEarthPos.y;
    this.earthRayPositions[5] = this.scratchEarthPos.z;
    this.earthRayGeo.attributes.position.needsUpdate = true;
    this.earthRay.computeLineDistances();
    this.earthRay.visible = earth.el > -2;

    // Update occlusion status
    if (earth.isBlocked) {
      (this.earthRay.material as THREE.LineDashedMaterial).color.setHex(0xef4444); // Crimson when occluded
      this.scratchDir.copy(this.scratchEarthPos).sub(this.scratchLanderAntenna).normalize();
      const crosshairDist = Math.min(14.0, this.scratchEarthPos.length() * 0.75);
      this.scratchCrosshair.copy(this.scratchLanderAntenna).addScaledVector(this.scratchDir, crosshairDist);
      this.occlusionCrosshair.position.copy(this.scratchCrosshair);
      this.occlusionCrosshair.lookAt(this.scratchLanderAntenna);
      this.occlusionCrosshair.visible = true;
    } else {
      (this.earthRay.material as THREE.LineDashedMaterial).color.setHex(0x06b6d4); // Cyan when clear
      this.occlusionCrosshair.visible = false;
    }
  }
}
