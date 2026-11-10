import * as THREE from 'three';
import { EphemerisSample, CelestialBodyPos } from '../../types';

export class SkyDomeScene {
  public group: THREE.Group;
  public domeWireframeGroup: THREE.Group;
  public sunPathGroup: THREE.Group;
  public earthPathGroup: THREE.Group;
  public sunMarker: THREE.Group;
  public earthMarker: THREE.Group;
  public sunRay: THREE.Line;
  public earthRay: THREE.Line;
  public hudLabelsGroup: THREE.Group;

  private domeRadius: number = 16.0;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'SkyDomeElements';

    // 1. Dome Wireframe & Azimuth Grid
    this.domeWireframeGroup = new THREE.Group();
    this.buildWireframe();
    this.group.add(this.domeWireframeGroup);

    // 2. Trajectory paths
    this.sunPathGroup = new THREE.Group();
    this.earthPathGroup = new THREE.Group();
    this.group.add(this.sunPathGroup);
    this.group.add(this.earthPathGroup);

    // 3. Sun Marker (Glowing sphere + point light)
    this.sunMarker = new THREE.Group();
    const sunGeo = new THREE.SphereGeometry(0.55, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffd033 });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.sunMarker.add(sunMesh);

    // Sun outer corona halo
    const coronaGeo = new THREE.SphereGeometry(0.85, 16, 16);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.35
    });
    this.sunMarker.add(new THREE.Mesh(coronaGeo, coronaMat));

    const sunLight = new THREE.PointLight(0xffea88, 1.2, 50);
    this.sunMarker.add(sunLight);
    this.group.add(this.sunMarker);

    // 4. Earth Marker (Blue sphere with atmosphere glow)
    this.earthMarker = new THREE.Group();
    const earthGeo = new THREE.SphereGeometry(0.42, 32, 32);
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      roughness: 0.6,
      metalness: 0.1
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    this.earthMarker.add(earthMesh);

    const atmoGeo = new THREE.SphereGeometry(0.52, 16, 16);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.4
    });
    this.earthMarker.add(new THREE.Mesh(atmoGeo, atmoMat));
    this.group.add(this.earthMarker);

    // 5. Connecting Line-of-sight Rays (from lander origin to Sun and Earth)
    const rayMatSun = new THREE.LineBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.6 });
    const sunRayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.5, 0),
      new THREE.Vector3(0, 10, 0)
    ]);
    this.sunRay = new THREE.Line(sunRayGeo, rayMatSun);
    this.group.add(this.sunRay);

    const rayMatEarth = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 0.5,
      gapSize: 0.3,
      transparent: true,
      opacity: 0.7
    });
    const earthRayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.5, 0),
      new THREE.Vector3(0, 10, 0)
    ]);
    this.earthRay = new THREE.Line(earthRayGeo, rayMatEarth);
    this.group.add(this.earthRay);

    // 6. HUD / Cardinal Labels placeholder
    this.hudLabelsGroup = new THREE.Group();
    this.group.add(this.hudLabelsGroup);

    // Initially hide until scroll reaches dome stage
    this.group.visible = false;
  }

  /**
   * Convert Azimuth (deg, 0=N, 90=E) and Elevation (deg) to 3D Cartesian coordinates
   * In our Three.js dome:
   * Y is Up (Zenith)
   * Z is North (azimuth 0°)
   * X is East (azimuth 90°)
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
   * Build hemispherical wireframe lines and elevation rings
   */
  private buildWireframe(): void {
    const ringMat = new THREE.LineBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.22
    });

    const baseRingMat = new THREE.LineBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.45
    });

    // Base circle (0° horizon)
    const basePts: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const th = (i / 64) * Math.PI * 2;
      basePts.push(new THREE.Vector3(Math.sin(th) * this.domeRadius, 0.05, Math.cos(th) * this.domeRadius));
    }
    const baseLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(basePts), baseRingMat);
    this.domeWireframeGroup.add(baseLine);

    // Elevation rings: 15°, 30°, 60°
    [15, 30, 60].forEach(el => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 64; i++) {
        const th = (i / 64) * Math.PI * 2;
        const p = this.toCartesian((th * 180) / Math.PI, el);
        pts.push(p);
      }
      const ringLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat);
      this.domeWireframeGroup.add(ringLine);
    });

    // Azimuth meridians every 30° from horizon to zenith
    for (let az = 0; az < 360; az += 30) {
      const pts: THREE.Vector3[] = [];
      for (let el = 0; el <= 90; el += 5) {
        pts.push(this.toCartesian(az, el));
      }
      const meridianLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat);
      this.domeWireframeGroup.add(meridianLine);
    }

    // Semi-transparent glass dome hemisphere
    const domeGlassMat = new THREE.MeshBasicMaterial({
      color: 0x1d4ed8,
      transparent: true,
      opacity: 0.04,
      side: THREE.BackSide
    });
    const domeShellGeo = new THREE.SphereGeometry(this.domeRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const domeShell = new THREE.Mesh(domeShellGeo, domeGlassMat);
    this.domeWireframeGroup.add(domeShell);
  }

  /**
   * Update Sun and Earth trajectory paths based on synodic ephemeris samples
   */
  public updatePaths(samples: EphemerisSample[]): void {
    // Clear old lines
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

    const goldMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 2.5 });
    const blockedMat = new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 3.5 });

    const earthLosMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 0.6,
      gapSize: 0.35,
      linewidth: 2.0
    });
    const earthBlockedMat = new THREE.LineDashedMaterial({
      color: 0xf43f5e,
      dashSize: 0.6,
      gapSize: 0.35,
      linewidth: 3.0
    });

    // Build contiguous colored segments for Sun
    for (let i = 0; i < samples.length - 1; i++) {
      const s0 = samples[i];
      const s1 = samples[i + 1];

      // Don't render deep underground
      if (s0.sun.el < -4 && s1.sun.el < -4) continue;

      const p0 = this.toCartesian(s0.sun.az, s0.sun.el);
      const p1 = this.toCartesian(s1.sun.az, s1.sun.el);

      const isBlocked = s0.sun.isBlocked || s1.sun.isBlocked;
      const geo = new THREE.BufferGeometry().setFromPoints([p0, p1]);
      const seg = new THREE.Line(geo, isBlocked ? blockedMat : goldMat);
      this.sunPathGroup.add(seg);
    }

    // Build contiguous colored segments for Earth
    for (let i = 0; i < samples.length - 1; i++) {
      const s0 = samples[i];
      const s1 = samples[i + 1];

      if (s0.earth.el < -4 && s1.earth.el < -4) continue;

      const p0 = this.toCartesian(s0.earth.az, s0.earth.el);
      const p1 = this.toCartesian(s1.earth.az, s1.earth.el);

      const isBlocked = s0.earth.isBlocked || s1.earth.isBlocked;
      const geo = new THREE.BufferGeometry().setFromPoints([p0, p1]);
      const seg = new THREE.Line(geo, isBlocked ? earthBlockedMat : earthLosMat);
      seg.computeLineDistances();
      this.earthPathGroup.add(seg);
    }
  }

  /**
   * Update active Sun and Earth positions and rays
   */
  public updatePositions(sun: CelestialBodyPos, earth: CelestialBodyPos): void {
    const sunPos = this.toCartesian(sun.az, Math.max(-2, sun.el));
    const earthPos = this.toCartesian(earth.az, Math.max(-2, earth.el));

    this.sunMarker.position.copy(sunPos);
    this.earthMarker.position.copy(earthPos);

    this.sunMarker.visible = sun.el > -4;
    this.earthMarker.visible = earth.el > -4;

    // Update Rays
    const landerApex = new THREE.Vector3(0, 0.7, 0);

    const sunPositions = new Float32Array([
      landerApex.x, landerApex.y, landerApex.z,
      sunPos.x, sunPos.y, sunPos.z
    ]);
    this.sunRay.geometry.setAttribute('position', new THREE.BufferAttribute(sunPositions, 3));
    this.sunRay.visible = !sun.isBlocked && sun.el > 0;

    const earthPositions = new Float32Array([
      landerApex.x, landerApex.y, landerApex.z,
      earthPos.x, earthPos.y, earthPos.z
    ]);
    this.earthRay.geometry.setAttribute('position', new THREE.BufferAttribute(earthPositions, 3));
    this.earthRay.computeLineDistances();
    this.earthRay.visible = !earth.isBlocked && earth.el > 0;
  }
}
