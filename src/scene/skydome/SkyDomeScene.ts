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

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'SkyDomeElements';

    // 1. Dome Wireframe, Polar Graticule & Laser-Etched Compass Rose
    this.domeWireframeGroup = new THREE.Group();
    this.buildPrecisionGraticule();
    this.group.add(this.domeWireframeGroup);

    // 2. Dual-state celestial trajectory paths
    this.sunPathGroup = new THREE.Group();
    this.earthPathGroup = new THREE.Group();
    this.group.add(this.sunPathGroup);
    this.group.add(this.earthPathGroup);

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

    // 5. Line-of-sight Telemetry Rays
    const rayMatSun = new THREE.LineBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.75,
      linewidth: 2.0
    });
    const sunRayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.85, 0),
      new THREE.Vector3(0, 10, 0)
    ]);
    this.sunRay = new THREE.Line(sunRayGeo, rayMatSun);
    this.group.add(this.sunRay);

    const rayMatEarth = new THREE.LineDashedMaterial({
      color: 0x06b6d4,
      dashSize: 0.5,
      gapSize: 0.25,
      transparent: true,
      opacity: 0.85,
      linewidth: 2.5
    });
    const earthRayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.85, 0),
      new THREE.Vector3(0, 10, 0)
    ]);
    this.earthRay = new THREE.Line(earthRayGeo, rayMatEarth);
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
   */
  public toCartesian(azDeg: number, elDeg: number, r: number = this.domeRadius): THREE.Vector3 {
    const elRad = (elDeg * Math.PI) / 180;
    const azRad = (azDeg * Math.PI) / 180;

    const y = r * Math.sin(elRad);
    const horizR = r * Math.cos(elRad);

    const x = horizR * Math.sin(azRad);
    const z = horizR * Math.cos(azRad);

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
   */
  public updatePaths(samples: EphemerisSample[]): void {
    while (this.sunPathGroup.children.length > 0) {
      const obj = this.sunPathGroup.children[0] as THREE.Line;
      this.sunPathGroup.remove(obj);
      obj.geometry.dispose();
    }
    while (this.earthPathGroup.children.length > 0) {
      const obj = this.earthPathGroup.children[0] as THREE.Line;
      this.earthPathGroup.remove(obj);
      obj.geometry.dispose();
    }

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

    // Sun trajectory ribbons
    for (let i = 0; i < samples.length - 1; i++) {
      const s0 = samples[i];
      const s1 = samples[i + 1];
      if (s0.sun.el < -4 && s1.sun.el < -4) continue;

      const p0 = this.toCartesian(s0.sun.az, s0.sun.el);
      const p1 = this.toCartesian(s1.sun.az, s1.sun.el);

      const isBlocked = s0.sun.isBlocked || s1.sun.isBlocked;
      const geo = new THREE.BufferGeometry().setFromPoints([p0, p1]);
      const seg = new THREE.Line(geo, isBlocked ? shadowMat : goldMat);
      if (isBlocked) seg.computeLineDistances();
      this.sunPathGroup.add(seg);
    }

    // Earth libration ribbons
    for (let i = 0; i < samples.length - 1; i++) {
      const s0 = samples[i];
      const s1 = samples[i + 1];
      if (s0.earth.el < -4 && s1.earth.el < -4) continue;

      const p0 = this.toCartesian(s0.earth.az, s0.earth.el);
      const p1 = this.toCartesian(s1.earth.az, s1.earth.el);

      const isBlocked = s0.earth.isBlocked || s1.earth.isBlocked;
      const geo = new THREE.BufferGeometry().setFromPoints([p0, p1]);
      const seg = new THREE.Line(geo, isBlocked ? earthBlockedMat : earthLosMat);
      if (isBlocked) seg.computeLineDistances();
      this.earthPathGroup.add(seg);
    }
  }

  /**
   * Update active celestial positions and telemetry line-of-sight rays
   */
  public updatePositions(sun: CelestialBodyPos, earth: CelestialBodyPos): void {
    const sunPos = this.toCartesian(sun.az, Math.max(-2, sun.el));
    const earthPos = this.toCartesian(earth.az, Math.max(-2, earth.el));

    this.sunMarker.position.copy(sunPos);
    this.earthMarker.position.copy(earthPos);

    this.sunMarker.visible = sun.el > -4;
    this.earthMarker.visible = earth.el > -4;

    // Lander high-gain antenna origin
    const landerAntennaPos = new THREE.Vector3(0, 0.85, 0);

    // Update Sun Ray
    const sunPositions = new Float32Array([
      landerAntennaPos.x, landerAntennaPos.y, landerAntennaPos.z,
      sunPos.x, sunPos.y, sunPos.z
    ]);
    this.sunRay.geometry.setAttribute('position', new THREE.BufferAttribute(sunPositions, 3));
    this.sunRay.visible = !sun.isBlocked && sun.el > 0;

    // Update Earth LOS Ray
    const earthPositions = new Float32Array([
      landerAntennaPos.x, landerAntennaPos.y, landerAntennaPos.z,
      earthPos.x, earthPos.y, earthPos.z
    ]);
    this.earthRay.geometry.setAttribute('position', new THREE.BufferAttribute(earthPositions, 3));
    this.earthRay.computeLineDistances();
    this.earthRay.visible = earth.el > -2;

    // Change Earth ray color based on occlusion status
    if (earth.isBlocked) {
      (this.earthRay.material as THREE.LineDashedMaterial).color.setHex(0xef4444); // Crimson when occluded
      // Position occlusion crosshair marker along the line towards terrain
      const dir = earthPos.clone().sub(landerAntennaPos).normalize();
      const crosshairDist = Math.min(14.0, earthPos.length() * 0.75);
      this.occlusionCrosshair.position.copy(landerAntennaPos.clone().add(dir.multiplyScalar(crosshairDist)));
      this.occlusionCrosshair.lookAt(landerAntennaPos);
      this.occlusionCrosshair.visible = true;
    } else {
      (this.earthRay.material as THREE.LineDashedMaterial).color.setHex(0x06b6d4); // Cyan when clear
      this.occlusionCrosshair.visible = false;
    }
  }
}
