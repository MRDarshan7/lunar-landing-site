import * as THREE from 'three';
import { CelestialTextures } from '../materials/CelestialTextures';

export class AtmosphereStars {
  public group: THREE.Group;
  public launchGround: THREE.Group;
  public cloudLayers: THREE.Group;
  public distantEarth: THREE.Group;
  public approachMoon: THREE.Group;
  public starfield: THREE.Points;
  public directionalSun: THREE.DirectionalLight;
  public ambientLight: THREE.AmbientLight;

  // Launch pad interactive elements
  public swingArm: THREE.Group;
  public holdDownClamps: THREE.Group[] = [];
  public ignitionLight: THREE.PointLight;
  public vaporPoints: THREE.Points;
  private vaporPositions: Float32Array;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'AtmosphereStars';

    // 1. Lighting (Sunlight + Rim Light)
    this.ambientLight = new THREE.AmbientLight(0xdde5f5, 0.65);
    this.group.add(this.ambientLight);

    this.directionalSun = new THREE.DirectionalLight(0xfff5e6, 2.8);
    this.directionalSun.position.set(45, 50, 35);
    this.directionalSun.castShadow = true;
    this.group.add(this.directionalSun);

    // Rim light for dramatic aerospace edge highlighting
    const rimLight = new THREE.DirectionalLight(0x7dd3fc, 0.9);
    rimLight.position.set(-35, 25, -40);
    this.group.add(rimLight);

    // 2. Launch Complex 39B Pad, Lattice Gantry Tower & Ground
    this.launchGround = new THREE.Group();

    // Massive Horizon Ground Plane (Extends to visible distance R = 400)
    const groundGeo = new THREE.PlaneGeometry(800, 800, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a2130, // Coastal Florida marshland / dark soil
      roughness: 0.95,
      metalness: 0.1
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -2.0;
    groundMesh.receiveShadow = true;
    this.launchGround.add(groundMesh);

    // Concrete Launch Pad Mount
    const padMountGeo = new THREE.CylinderGeometry(28, 32, 2.2, 48);
    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0x475569, // Concrete gray
      roughness: 0.88,
      metalness: 0.15
    });
    const padMount = new THREE.Mesh(padMountGeo, concreteMat);
    padMount.position.set(3.5, -0.9, 0);
    padMount.receiveShadow = true;
    this.launchGround.add(padMount);

    // Flame Trench cutout beneath rocket engine cluster
    const trenchGeo = new THREE.BoxGeometry(6.5, 3.5, 18);
    const trenchMat = new THREE.MeshStandardMaterial({
      color: 0x11141a, // Scorched refractory brick
      roughness: 0.95,
      metalness: 0.05
    });
    const trench = new THREE.Mesh(trenchGeo, trenchMat);
    trench.position.set(3.5, -1.8, 0);
    this.launchGround.add(trench);

    // ----------------------------------------------------
    // Open Steel Lattice Launch Tower
    // ----------------------------------------------------
    const towerGroup = new THREE.Group();
    // Positioned left of pad mount at x = -4.5, z = -3.5 (clear of left-aligned text)
    towerGroup.position.set(-4.5, 0, -3.5);

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x64748b, // Industrial steel gray
      roughness: 0.45,
      metalness: 0.8
    });
    const trussMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.5,
      metalness: 0.75
    });

    const towerH = 34.0;
    const towerW = 3.2;

    // 4 Vertical Corner Steel Columns (Legs)
    const legGeo = new THREE.BoxGeometry(0.35, towerH, 0.35);
    const offsets = [
      [-towerW / 2, -towerW / 2],
      [towerW / 2, -towerW / 2],
      [-towerW / 2, towerW / 2],
      [towerW / 2, towerW / 2]
    ];
    for (const [ox, oz] of offsets) {
      const leg = new THREE.Mesh(legGeo, steelMat);
      leg.position.set(ox, towerH / 2, oz);
      towerGroup.add(leg);
    }

    // Horizontal & Diagonal Cross-Trusses across tower sections
    const floors = 8;
    for (let f = 0; f <= floors; f++) {
      const fy = (f / floors) * towerH;

      // Platform floor plate (every 2nd level)
      if (f % 2 === 0 && f > 0) {
        const platGeo = new THREE.BoxGeometry(towerW + 0.6, 0.15, towerW + 0.6);
        const plat = new THREE.Mesh(platGeo, steelMat);
        plat.position.set(0, fy, 0);
        towerGroup.add(plat);
      }

      // Perimeter horizontal box girders
      const hBeamGeoX = new THREE.BoxGeometry(towerW, 0.18, 0.18);
      const hBeamGeoZ = new THREE.BoxGeometry(0.18, 0.18, towerW);

      const bNorth = new THREE.Mesh(hBeamGeoX, trussMat);
      bNorth.position.set(0, fy, -towerW / 2);
      towerGroup.add(bNorth);

      const bSouth = new THREE.Mesh(hBeamGeoX, trussMat);
      bSouth.position.set(0, fy, towerW / 2);
      towerGroup.add(bSouth);

      const bWest = new THREE.Mesh(hBeamGeoZ, trussMat);
      bWest.position.set(-towerW / 2, fy, 0);
      towerGroup.add(bWest);

      const bEast = new THREE.Mesh(hBeamGeoZ, trussMat);
      bEast.position.set(towerW / 2, fy, 0);
      towerGroup.add(bEast);

      // Diagonal X-bracing truss between floors
      if (f < floors) {
        const segH = towerH / floors;
        const diagLen = Math.hypot(towerW, segH);
        const diagAngle = Math.atan2(segH, towerW);
        const diagGeo = new THREE.CylinderGeometry(0.04, 0.04, diagLen, 6);

        // East face diagonal facing rocket
        const d1 = new THREE.Mesh(diagGeo, trussMat);
        d1.position.set(towerW / 2, fy + segH / 2, 0);
        d1.rotation.x = diagAngle;
        towerGroup.add(d1);

        const d2 = new THREE.Mesh(diagGeo, trussMat);
        d2.position.set(towerW / 2, fy + segH / 2, 0);
        d2.rotation.x = -diagAngle;
        towerGroup.add(d2);
      }
    }

    // Top Lightning Mast extending above rocket nose to Y = 39
    const mastGeo = new THREE.CylinderGeometry(0.05, 0.15, 6.5, 8);
    const mast = new THREE.Mesh(mastGeo, steelMat);
    mast.position.set(0, towerH + 3.2, 0);
    towerGroup.add(mast);

    // Retractable Gantry Service Swing Arm (Connects to Upper Stage at Y = 20)
    this.swingArm = new THREE.Group();
    this.swingArm.position.set(towerW / 2, 21.0, 0);

    const armTrussGeo = new THREE.BoxGeometry(5.2, 0.8, 0.9);
    const armTruss = new THREE.Mesh(armTrussGeo, steelMat);
    armTruss.position.x = 2.6; // extends rightward toward rocket at x = 3.5
    this.swingArm.add(armTruss);

    // Umbilical connection head
    const headGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.8, 12);
    const head = new THREE.Mesh(headGeo, concreteMat);
    head.rotation.z = Math.PI / 2;
    head.position.set(5.2, 0, 0);
    this.swingArm.add(head);

    towerGroup.add(this.swingArm);
    this.launchGround.add(towerGroup);

    // 4 Hold-Down Clamps around rocket base
    const clampMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4, metalness: 0.8 }); // Safety amber
    for (let c = 0; c < 4; c++) {
      const angle = (c * Math.PI) / 2 + Math.PI / 4;
      const clampGroup = new THREE.Group();
      clampGroup.position.set(
        3.5 + Math.cos(angle) * 2.3,
        0,
        Math.sin(angle) * 2.3
      );
      clampGroup.rotation.y = angle + Math.PI / 2;

      const clawGeo = new THREE.BoxGeometry(0.4, 1.4, 0.6);
      const claw = new THREE.Mesh(clawGeo, clampMat);
      claw.position.set(0, 0.7, 0);
      clampGroup.add(claw);

      this.holdDownClamps.push(clampGroup);
      this.launchGround.add(clampGroup);
    }

    // Ignition Flash Light at pad base
    this.ignitionLight = new THREE.PointLight(0xff7711, 0, 45, 1.6);
    this.ignitionLight.position.set(3.5, 0.5, 0);
    this.launchGround.add(this.ignitionLight);

    // Cryogenic Boil-Off Vapor Particles
    const vaporCount = 80;
    const vaporGeo = new THREE.BufferGeometry();
    this.vaporPositions = new Float32Array(vaporCount * 3);
    for (let i = 0; i < vaporCount; i++) {
      this.vaporPositions[i * 3] = 3.5 + (Math.random() - 0.5) * 1.5;
      this.vaporPositions[i * 3 + 1] = 18.0 + (Math.random() - 0.5) * 4.0;
      this.vaporPositions[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
    }
    vaporGeo.setAttribute('position', new THREE.BufferAttribute(this.vaporPositions, 3));
    const vaporMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.75,
      transparent: true,
      opacity: 0.55,
      depthWrite: false
    });
    this.vaporPoints = new THREE.Points(vaporGeo, vaporMat);
    this.launchGround.add(this.vaporPoints);

    this.group.add(this.launchGround);

    // 3. Cloud Layers (Soft translucent volumetric discs with parallax)
    this.cloudLayers = new THREE.Group();
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.22,
      roughness: 1.0,
      depthWrite: false
    });
    for (let i = 0; i < 18; i++) {
      const cr = 7 + Math.random() * 12;
      const cloudGeo = new THREE.SphereGeometry(cr, 12, 12);
      cloudGeo.scale(2.4, 0.18, 1.6);
      const cloud = new THREE.Mesh(cloudGeo, cloudMat);
      cloud.position.set(
        (Math.random() - 0.5) * 90,
        18 + Math.random() * 24,
        (Math.random() - 0.5) * 90
      );
      this.cloudLayers.add(cloud);
    }
    this.group.add(this.cloudLayers);

    // 4. Crisp Cosmic Starfield (Deep space background)
    const starCount = 4500;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 240 + Math.random() * 120;

      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      const shade = Math.random();
      if (shade > 0.8) {
        starColors[i * 3] = 0.82;
        starColors[i * 3 + 1] = 0.90;
        starColors[i * 3 + 2] = 1.0;
      } else if (shade > 0.6) {
        starColors[i * 3] = 1.0;
        starColors[i * 3 + 1] = 0.94;
        starColors[i * 3 + 2] = 0.80;
      } else {
        starColors[i * 3] = 1.0;
        starColors[i * 3 + 1] = 1.0;
        starColors[i * 3 + 2] = 1.0;
      }
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 0.28,
      vertexColors: true,
      transparent: true,
      opacity: 0.92
    });
    this.starfield = new THREE.Points(starGeo, starMat);
    this.group.add(this.starfield);

    // 5. Textured Distant Earth (Seen from ascent & translunar space)
    this.distantEarth = new THREE.Group();
    const dEarthGeo = new THREE.SphereGeometry(16, 48, 48);
    const earthTex = CelestialTextures.getEarthTexture();
    const dEarthMat = new THREE.MeshStandardMaterial({
      map: earthTex,
      roughness: 0.55,
      metalness: 0.1
    });
    const dEarthMesh = new THREE.Mesh(dEarthGeo, dEarthMat);
    dEarthMesh.rotation.y = -Math.PI * 0.35;
    this.distantEarth.add(dEarthMesh);

    // Blue atmospheric scattering halo
    const dAtmoGeo = new THREE.SphereGeometry(16.6, 48, 48);
    const dAtmoMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.32,
      side: THREE.BackSide
    });
    this.distantEarth.add(new THREE.Mesh(dAtmoGeo, dAtmoMat));
    this.distantEarth.position.set(-30, -50, -20);
    this.distantEarth.visible = false;
    this.group.add(this.distantEarth);

    // 6. Textured Approaching Lunar Sphere (Seen ahead in translunar flight)
    this.approachMoon = new THREE.Group();
    const moonSphereGeo = new THREE.SphereGeometry(22, 64, 64);
    const moonTex = CelestialTextures.getMoonTexture();
    const moonSphereMat = new THREE.MeshStandardMaterial({
      map: moonTex,
      roughness: 0.92,
      metalness: 0.08
    });
    const moonMesh = new THREE.Mesh(moonSphereGeo, moonSphereMat);
    moonMesh.rotation.y = Math.PI * 0.6;
    this.approachMoon.add(moonMesh);

    // Position ahead along negative Z
    this.approachMoon.position.set(0, 15, -120);
    this.approachMoon.visible = false; // Hidden until p >= 0.58
    this.group.add(this.approachMoon);
  }

  /**
   * Deterministic animation of launch pad elements:
   * swing arm retraction, hold-down clamps, vapor venting, and ignition flash
   */
  public updatePad(p: number): void {
    const clamp = (val: number, min = 0, max = 1) => Math.max(min, Math.min(max, val));
    const seg = (a: number, b: number) => clamp((p - a) / (b - a));

    // Swing Arm Retraction (p = 0.06 -> 0.10)
    const armRetract = seg(0.06, 0.10);
    this.swingArm.rotation.y = -armRetract * 1.35; // swings 77° away from rocket

    // Hold-Down Clamps Release (p = 0.07 -> 0.09)
    const clampRelease = seg(0.07, 0.09);
    for (const c of this.holdDownClamps) {
      c.rotation.x = clampRelease * 0.85; // tilts back clear of nozzle
    }

    // Ignition Light Flash (p = 0.06 -> 0.10)
    if (p >= 0.06 && p <= 0.10) {
      const flash = Math.sin(seg(0.06, 0.10) * Math.PI);
      this.ignitionLight.intensity = flash * 9.5;
    } else {
      this.ignitionLight.intensity = 0;
    }

    // Cryogenic Boil-Off Vapor (p = 0.02 -> 0.08)
    if (p >= 0.02 && p <= 0.08) {
      this.vaporPoints.visible = true;
      const opacity = (1 - seg(0.06, 0.08)) * 0.6;
      (this.vaporPoints.material as THREE.PointsMaterial).opacity = opacity;
    } else {
      this.vaporPoints.visible = false;
    }
  }
}
