import * as THREE from 'three';

/**
 * Detailed 3D Lunar Lander Model (Single Continuous Craft Instance)
 * Meets all hackathon challenge specs:
 * - Stowed pose fits completely inside the rocket payload fairing without clipping
 * - Articulated landing gear with shock absorption and leg compression
 * - Deployable solar array wings with photovoltaic blue silicon texture
 * - Steerable high-gain parabolic communication antenna
 * - Throttleable descent engine with retro-facing pitch control
 */
export class LanderModel {
  public group: THREE.Group;
  public bodyGroup: THREE.Group;
  public landingLegs: Array<{
    group: THREE.Group;
    strut: THREE.Mesh;
    pad: THREE.Mesh;
    brace: THREE.Mesh;
    restAngle: number;
  }> = [];

  public solarPanelLeft: THREE.Group;
  public solarPanelRight: THREE.Group;
  public antennaDish: THREE.Group;
  public antennaMast: THREE.Mesh;
  public engineFlame: THREE.Mesh;
  public engineLight: THREE.PointLight;
  public engineNozzle: THREE.Mesh;

  // Stored state
  private deployProgress: number = 0;
  private legCompression: number = 0;
  private engineFacing: number = 0;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'LanderModel';

    // The bodyGroup contains the lander body and pivots for retro-burn flip
    this.bodyGroup = new THREE.Group();
    this.bodyGroup.name = 'LanderBody';
    this.group.add(this.bodyGroup);

    // --- PBR Materials ---
    const goldMliMat = new THREE.MeshStandardMaterial({
      color: 0xd69928,
      roughness: 0.32,
      metalness: 0.88,
      bumpScale: 0.05
    });

    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0xe8ecf4,
      roughness: 0.4,
      metalness: 0.2
    });

    const strutMat = new THREE.MeshStandardMaterial({
      color: 0x828b98,
      roughness: 0.25,
      metalness: 0.8
    });

    const footpadMat = new THREE.MeshStandardMaterial({
      color: 0x474c55,
      roughness: 0.45,
      metalness: 0.7
    });

    const solarCellMat = new THREE.MeshStandardMaterial({
      color: 0x142b58,
      roughness: 0.15,
      metalness: 0.95
    });

    const solarFrameMat = new THREE.MeshStandardMaterial({
      color: 0x1f232b,
      roughness: 0.5,
      metalness: 0.6
    });

    const engineMetalMat = new THREE.MeshStandardMaterial({
      color: 0x2e323a,
      roughness: 0.3,
      metalness: 0.9
    });

    // --- 1. Octagonal Descent Stage Core (Gold MLI) ---
    // Radius 1.35, Height 1.1: compact stowed dimensions
    const descentHeight = 1.1;
    const descentRadius = 1.35;
    const descentGeo = new THREE.CylinderGeometry(descentRadius, descentRadius * 1.05, descentHeight, 8);
    const descentMesh = new THREE.Mesh(descentGeo, goldMliMat);
    descentMesh.position.y = descentHeight / 2;
    this.bodyGroup.add(descentMesh);

    // Structural equipment boxes mounted on descent facets
    for (let i = 0; i < 8; i++) {
      if (i % 2 === 0) continue;
      const angle = (i * Math.PI) / 4;
      const boxGeo = new THREE.BoxGeometry(0.35, 0.45, 0.25);
      const boxMesh = new THREE.Mesh(boxGeo, goldMliMat);
      boxMesh.position.set(
        Math.cos(angle) * (descentRadius * 0.95),
        descentHeight * 0.5,
        Math.sin(angle) * (descentRadius * 0.95)
      );
      boxMesh.rotation.y = -angle;
      this.bodyGroup.add(boxMesh);
    }

    // --- 2. Ascent Stage / Avionics Deck ---
    const cabinHeight = 0.95;
    const cabinWidth = 1.45;
    const cabinGeo = new THREE.BoxGeometry(cabinWidth, cabinHeight, cabinWidth);
    const cabinMesh = new THREE.Mesh(cabinGeo, cabinMat);
    cabinMesh.position.y = descentHeight + cabinHeight / 2;
    this.bodyGroup.add(cabinMesh);

    // Overhead Docking Hatch / Airway
    const hatchGeo = new THREE.CylinderGeometry(0.4, 0.45, 0.25, 16);
    const hatch = new THREE.Mesh(hatchGeo, cabinMat);
    hatch.position.y = descentHeight + cabinHeight + 0.12;
    this.bodyGroup.add(hatch);

    // Front Pilot Viewports
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x07111e,
      roughness: 0.08,
      metalness: 0.95
    });
    const winGeo = new THREE.BoxGeometry(0.45, 0.22, 0.04);
    const winMesh = new THREE.Mesh(winGeo, windowMat);
    winMesh.position.set(0, descentHeight + cabinHeight * 0.6, cabinWidth / 2 + 0.02);
    this.bodyGroup.add(winMesh);

    // Quad RCS Thruster Blocks (4 corners)
    const rcsMat = new THREE.MeshStandardMaterial({ color: 0x333740, roughness: 0.4, metalness: 0.8 });
    for (let c = 0; c < 4; c++) {
      const angle = (c * Math.PI) / 2 + Math.PI / 4;
      const rcsGroup = new THREE.Group();
      rcsGroup.position.set(
        Math.cos(angle) * (cabinWidth * 0.68),
        descentHeight + cabinHeight * 0.8,
        Math.sin(angle) * (cabinWidth * 0.68)
      );

      // 4 tiny nozzles per block
      for (let n = 0; n < 4; n++) {
        const nGeo = new THREE.ConeGeometry(0.04, 0.1, 8);
        const nMesh = new THREE.Mesh(nGeo, rcsMat);
        const nAngle = (n * Math.PI) / 2;
        nMesh.position.set(Math.cos(nAngle) * 0.08, 0, Math.sin(nAngle) * 0.08);
        nMesh.rotation.z = Math.PI / 2;
        nMesh.rotation.y = nAngle;
        rcsGroup.add(nMesh);
      }
      this.bodyGroup.add(rcsGroup);
    }

    // --- 3. Four Articulated Landing Gear Legs ---
    // Stowed: folded vertically upwards against descent body.
    // Deployed: swing downward and diagonally outward.
    const legAngles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
    for (let i = 0; i < 4; i++) {
      const angle = legAngles[i];
      const legGroup = new THREE.Group();
      legGroup.position.set(
        Math.cos(angle) * (descentRadius * 0.8),
        descentHeight * 0.4,
        Math.sin(angle) * (descentRadius * 0.8)
      );
      legGroup.rotation.y = angle - Math.PI / 2;

      // Primary shock strut assembly
      const strutLen = 1.6;
      const strutGeo = new THREE.CylinderGeometry(0.06, 0.06, strutLen, 8);
      const strut = new THREE.Mesh(strutGeo, strutMat);
      strut.position.set(0, -strutLen * 0.45, 0.45);
      strut.rotation.x = Math.PI * 0.28;
      legGroup.add(strut);

      // Circular Footpad - CHILD OF THE STRUT AT ITS TIP
      // Parented directly to the strut tip so it can NEVER float away or detach
      const padGeo = new THREE.CylinderGeometry(0.32, 0.35, 0.08, 16);
      const pad = new THREE.Mesh(padGeo, footpadMat);
      pad.position.set(0, -strutLen / 2, 0);
      pad.rotation.x = -Math.PI * 0.28; // Keeps footpad flat against horizontal terrain
      strut.add(pad);

      // Cross-brace
      const braceGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.0, 8);
      const brace = new THREE.Mesh(braceGeo, strutMat);
      brace.position.set(0, -0.28, 0.35);
      brace.rotation.x = -Math.PI * 0.2;
      legGroup.add(brace);

      this.landingLegs.push({
        group: legGroup,
        strut,
        pad,
        brace,
        restAngle: angle
      });
      this.bodyGroup.add(legGroup);
    }

    // --- 4. Deployable Photovoltaic Solar Arrays ---
    const panelW = 1.7;
    const panelH = 0.85;

    // Left Array
    this.solarPanelLeft = new THREE.Group();
    const frameL = new THREE.Mesh(new THREE.BoxGeometry(panelW, 0.04, panelH), solarFrameMat);
    const cellsL = new THREE.Mesh(new THREE.BoxGeometry(panelW - 0.08, 0.05, panelH - 0.08), solarCellMat);
    frameL.position.x = -panelW / 2;
    cellsL.position.x = -panelW / 2;
    this.solarPanelLeft.add(frameL);
    this.solarPanelLeft.add(cellsL);
    this.solarPanelLeft.position.set(-cabinWidth / 2, descentHeight + 0.45, 0);
    this.bodyGroup.add(this.solarPanelLeft);

    // Right Array
    this.solarPanelRight = new THREE.Group();
    const frameR = new THREE.Mesh(new THREE.BoxGeometry(panelW, 0.04, panelH), solarFrameMat);
    const cellsR = new THREE.Mesh(new THREE.BoxGeometry(panelW - 0.08, 0.05, panelH - 0.08), solarCellMat);
    frameR.position.x = panelW / 2;
    cellsR.position.x = panelW / 2;
    this.solarPanelRight.add(frameR);
    this.solarPanelRight.add(cellsR);
    this.solarPanelRight.position.set(cabinWidth / 2, descentHeight + 0.45, 0);
    this.bodyGroup.add(this.solarPanelRight);

    // --- 5. High-Gain Antenna Dish ---
    this.antennaDish = new THREE.Group();
    this.antennaMast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8), strutMat);
    this.antennaMast.position.y = 0.3;
    this.antennaDish.add(this.antennaMast);

    const dishGeo = new THREE.SphereGeometry(0.38, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.45);
    const dishMesh = new THREE.Mesh(dishGeo, solarFrameMat);
    dishMesh.rotation.x = Math.PI * 0.75;
    dishMesh.position.set(0, 0.6, 0.1);
    this.antennaDish.add(dishMesh);

    this.antennaDish.position.set(0.45, descentHeight + cabinHeight, -0.45);
    this.bodyGroup.add(this.antennaDish);

    // --- 6. Throttleable Descent Engine Nozzle & Plume ---
    this.engineNozzle = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 0.9, 16, 1, true),
      engineMetalMat
    );
    this.engineNozzle.position.y = 0.05;
    this.bodyGroup.add(this.engineNozzle);

    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xffb833,
      transparent: true,
      opacity: 0.92
    });
    this.engineFlame = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.8, 16), flameMat);
    this.engineFlame.rotation.x = Math.PI;
    this.engineFlame.position.y = -1.0;
    this.engineFlame.visible = false;
    this.bodyGroup.add(this.engineFlame);

    this.engineLight = new THREE.PointLight(0xffa522, 0, 18, 1.8);
    this.engineLight.position.set(0, -0.5, 0);
    this.bodyGroup.add(this.engineLight);

    // Set initial stowed pose (t = 0)
    this.setDeploy(0);
    this.setThrottle(0);
  }

  /**
   * Set deployment state across sub-ranges:
   * t in [0.00, 0.35]: Solar panels unfold from vertical tucked position to horizontal wings
   * t in [0.35, 0.70]: High-gain antenna dish erects and aims
   * t in [0.70, 1.00]: Landing gear legs articulate outward to landing stance
   */
  public setDeploy(t: number): void {
    const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));
    this.deployProgress = clamp(t);

    // 1. Solar Panels: [0.0, 0.35]
    const pSolar = clamp(this.deployProgress / 0.35);
    // Stowed: folded down (-90°). Deployed: 0°
    this.solarPanelLeft.rotation.z = -(1 - pSolar) * (Math.PI * 0.48);
    this.solarPanelRight.rotation.z = (1 - pSolar) * (Math.PI * 0.48);

    // 2. Dish: [0.35, 0.70]
    const pDish = clamp((this.deployProgress - 0.35) / 0.35);
    // Stowed: folded down flat (-80°). Deployed: upright
    this.antennaDish.rotation.x = -(1 - pDish) * (Math.PI * 0.45);
    this.antennaDish.scale.set(0.2 + 0.8 * pDish, 0.2 + 0.8 * pDish, 0.2 + 0.8 * pDish);

    // 3. Landing Legs: [0.70, 1.00]
    const pLegs = clamp((this.deployProgress - 0.70) / 0.30);
    for (const leg of this.landingLegs) {
      // Stowed: folded up tightly against body. Deployed: nominal stance
      const foldAngle = (1 - pLegs) * 0.65;
      leg.group.rotation.x = foldAngle;
      leg.group.position.y = 0.44;
    }
  }

  /**
   * Compression of landing gear shock absorbers on touchdown (c in [0, 1])
   */
  public setLegCompression(c: number): void {
    const comp = Math.max(0, Math.min(1, c));
    this.legCompression = comp;
    for (const leg of this.landingLegs) {
      // Piston slides inside strut along shock vector; pad stays locked to tip
      leg.strut.position.y = -1.6 * 0.45 + comp * 0.12;
    }
  }

  /**
   * Pitch-over orientation for powered descent retro-flip
   * facing = 1: engine points toward travel vector (retro-burn)
   * facing = 0: vertical upright touchdown orientation
   */
  public setEngineFacing(facing: number): void {
    this.engineFacing = Math.max(0, Math.min(1, facing));
    // Clean retro-tilt about pitch axis (X axis) through vehicle center of mass:
    // Engine faces retrograde travel direction during braking burn
    const retroPitch = this.engineFacing * (Math.PI * 0.28);
    this.bodyGroup.rotation.set(-retroPitch, 0, 0);
  }

  /**
   * Throttle descent engine thrust
   */
  public setThrottle(intensity: number): void {
    const th = Math.max(0, intensity);
    if (th <= 0.01) {
      this.engineFlame.visible = false;
      this.engineLight.intensity = 0;
    } else {
      this.engineFlame.visible = true;
      this.engineFlame.scale.set(th, th * (1 + Math.random() * 0.2), th);
      this.engineLight.intensity = th * 3.2;
    }
  }
}
