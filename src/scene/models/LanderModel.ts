import * as THREE from 'three';
import {
  createKaptonFoilMaterial,
  createBrushedAluminumMaterial,
  createRcsThrusterMaterial,
  createSolarCellMaterial
} from '../materials/RocketTextures';
import { PlumeMaterials } from '../materials/PlumeMaterials';

/**
 * Detailed 3D Lunar Lander Model (Modeled after Intuitive Machines Nova-C / Griffin / VIPER)
 * Single continuous craft instance maintaining exact scene-graph hierarchy:
 * - Octagonal prism core wrapped in crinkled Kapton Gold MLI blankets
 * - Multi-strut A-frame shock-absorber landing gear with telescoping struts & contact probes
 * - Multi-panel photovoltaic wings with dark blue monocrystalline cell grid & silver busbars
 * - Parabolic high-gain antenna with sub-reflector feed tripod and gimbal mount
 * - Throttleable descent engine with retro-pitch control and volumetric Mach-core plume
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

  // Internal state
  private deployProgress: number = 0;
  private legCompression: number = 0;
  private engineFacing: number = 0;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'LanderModel';

    // The bodyGroup contains the lander body and tilts for retro-burn pitch-over flip
    this.bodyGroup = new THREE.Group();
    this.bodyGroup.name = 'LanderBody';
    this.group.add(this.bodyGroup);

    // --- High-Fidelity Aerospace PBR Materials ---
    const kaptonMat = createKaptonFoilMaterial();
    const aluminumMat = createBrushedAluminumMaterial();
    const rcsMat = createRcsThrusterMaterial();
    const solarMat = createSolarCellMaterial();

    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0x222630,
      roughness: 0.38,
      metalness: 0.88
    });

    const radiatorMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.25,
      metalness: 0.75
    });

    const footpadMat = new THREE.MeshStandardMaterial({
      color: 0x3d434d,
      roughness: 0.55,
      metalness: 0.65
    });

    // ========================================================
    // 1. OCTAGONAL STRUCTURAL DESCENT BUS (KAPTON MLI WRAPPED)
    // ========================================================
    const descentHeight = 1.15;
    const descentRadius = 1.32; // Fits stowed inside fairing radius (1.85)

    // Main octagonal bus
    const descentGeo = new THREE.CylinderGeometry(
      descentRadius,
      descentRadius * 1.04,
      descentHeight,
      8
    );
    const descentMesh = new THREE.Mesh(descentGeo, kaptonMat);
    descentMesh.position.y = descentHeight / 2;
    descentMesh.castShadow = true;
    descentMesh.receiveShadow = true;
    this.bodyGroup.add(descentMesh);

    // Structural longerons & vertical titanium corner posts
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const postGeo = new THREE.BoxGeometry(0.06, descentHeight * 1.02, 0.06);
      const post = new THREE.Mesh(postGeo, titaniumMat);
      post.position.set(
        Math.cos(angle) * (descentRadius * 1.01),
        descentHeight / 2,
        Math.sin(angle) * (descentRadius * 1.01)
      );
      post.rotation.y = -angle;
      this.bodyGroup.add(post);
    }

    // Equipment payload bays & science instrument pods
    for (let i = 0; i < 8; i++) {
      if (i % 2 === 0) continue; // Alternate facets
      const angle = (i * Math.PI) / 4;
      const bayGroup = new THREE.Group();
      bayGroup.position.set(
        Math.cos(angle) * (descentRadius * 0.94),
        descentHeight * 0.52,
        Math.sin(angle) * (descentRadius * 0.94)
      );
      bayGroup.rotation.y = -angle;

      // Avionics / experiment bay box
      const boxGeo = new THREE.BoxGeometry(0.42, 0.52, 0.28);
      const boxMesh = new THREE.Mesh(boxGeo, kaptonMat);
      bayGroup.add(boxMesh);

      // Silver radiator heat-pipe face
      const radGeo = new THREE.PlaneGeometry(0.36, 0.44);
      const radMesh = new THREE.Mesh(radGeo, radiatorMat);
      radMesh.position.z = 0.145;
      bayGroup.add(radMesh);

      this.bodyGroup.add(bayGroup);
    }

    // ========================================================
    // 2. UPPER AVIONICS DECK & EQUIPMENT STRUCTURE
    // ========================================================
    const deckHeight = 0.85;
    const deckWidth = 1.38;

    // Avionics equipment enclosure
    const deckGeo = new THREE.BoxGeometry(deckWidth, deckHeight, deckWidth);
    const deckMesh = new THREE.Mesh(deckGeo, aluminumMat);
    deckMesh.position.y = descentHeight + deckHeight / 2;
    deckMesh.castShadow = true;
    deckMesh.receiveShadow = true;
    this.bodyGroup.add(deckMesh);

    // Top deck thermal blanket surface
    const topCapGeo = new THREE.BoxGeometry(deckWidth * 0.96, 0.04, deckWidth * 0.96);
    const topCap = new THREE.Mesh(topCapGeo, kaptonMat);
    topCap.position.y = descentHeight + deckHeight + 0.02;
    this.bodyGroup.add(topCap);

    // Star Tracker optical baffles (aimed 45° upward into deep space)
    const trackerGroup = new THREE.Group();
    trackerGroup.position.set(-deckWidth * 0.35, descentHeight + deckHeight + 0.1, -deckWidth * 0.35);
    trackerGroup.rotation.x = Math.PI * 0.25;
    trackerGroup.rotation.y = Math.PI * 0.25;
    const baffleGeo = new THREE.CylinderGeometry(0.06, 0.09, 0.22, 16);
    const baffleMesh = new THREE.Mesh(baffleGeo, rcsMat);
    trackerGroup.add(baffleMesh);
    this.bodyGroup.add(trackerGroup);

    // Omnidirectional Low-Gain Antenna mast
    const lgaMast = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.45, 8), aluminumMat);
    lgaMast.position.set(-deckWidth * 0.4, descentHeight + deckHeight + 0.22, deckWidth * 0.4);
    this.bodyGroup.add(lgaMast);
    const lgaTip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), aluminumMat);
    lgaTip.position.set(-deckWidth * 0.4, descentHeight + deckHeight + 0.45, deckWidth * 0.4);
    this.bodyGroup.add(lgaTip);

    // Quad Reaction Control Thruster (RCS) pods at 90° intervals
    for (let c = 0; c < 4; c++) {
      const angle = (c * Math.PI) / 2 + Math.PI / 4;
      const rcsGroup = new THREE.Group();
      rcsGroup.position.set(
        Math.cos(angle) * (deckWidth * 0.65),
        descentHeight + deckHeight * 0.78,
        Math.sin(angle) * (deckWidth * 0.65)
      );

      // Sintered silicon-carbide pod body
      const podBody = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.14), rcsMat);
      rcsGroup.add(podBody);

      // 4 miniature cold-gas/hypergolic nozzles per pod
      for (let n = 0; n < 4; n++) {
        const nAngle = (n * Math.PI) / 2;
        const nGeo = new THREE.ConeGeometry(0.035, 0.11, 10);
        const nMesh = new THREE.Mesh(nGeo, rcsMat);
        nMesh.position.set(Math.cos(nAngle) * 0.08, 0, Math.sin(nAngle) * 0.08);
        nMesh.rotation.z = Math.PI / 2;
        nMesh.rotation.y = nAngle;
        rcsGroup.add(nMesh);
      }
      this.bodyGroup.add(rcsGroup);
    }

    // ========================================================
    // 3. ARTICULATED MULTI-STRUT A-FRAME LANDING GEAR (4 LEGS)
    // ========================================================
    const legAngles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
    for (let i = 0; i < 4; i++) {
      const angle = legAngles[i];
      const legGroup = new THREE.Group();
      legGroup.name = `LandingLeg_${i}`;
      legGroup.position.set(
        Math.cos(angle) * (descentRadius * 0.82),
        descentHeight * 0.42,
        Math.sin(angle) * (descentRadius * 0.82)
      );
      legGroup.rotation.y = angle - Math.PI / 2;

      // Primary oleo telescoping shock strut
      const strutLen = 1.95;
      const strutGeo = new THREE.CylinderGeometry(0.065, 0.075, strutLen, 12);
      const strut = new THREE.Mesh(strutGeo, aluminumMat);
      strut.position.set(0, -strutLen * 0.44, 0.46);
      strut.rotation.x = Math.PI * 0.28;
      strut.castShadow = true;
      legGroup.add(strut);

      // Dual A-frame secondary drag struts
      const braceGeo = new THREE.CylinderGeometry(0.035, 0.035, 1.15, 8);
      const braceL = new THREE.Mesh(braceGeo, titaniumMat);
      braceL.position.set(-0.16, -0.32, 0.42);
      braceL.rotation.x = -Math.PI * 0.22;
      braceL.rotation.z = 0.12;
      legGroup.add(braceL);

      const braceR = new THREE.Mesh(braceGeo, titaniumMat);
      braceR.position.set(0.16, -0.32, 0.42);
      braceR.rotation.x = -Math.PI * 0.22;
      braceR.rotation.z = -0.12;
      legGroup.add(braceR);

      // Primary brace mesh assigned for test suite interface
      const brace = braceL;

      // Circular dish footpad with honeycombed crush core
      const padGeo = new THREE.CylinderGeometry(0.36, 0.40, 0.09, 20);
      const pad = new THREE.Mesh(padGeo, footpadMat);
      pad.position.set(0, -strutLen * 0.92, 0.92);
      pad.castShadow = true;
      pad.receiveShadow = true;
      legGroup.add(pad);

      // Regolith ground contact sensing probe (Apollo lunar surface sensing rod)
      const probeGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.6, 6);
      const probe = new THREE.Mesh(probeGeo, aluminumMat);
      probe.position.set(0, -strutLen * 0.92 - 0.3, 0.92);
      legGroup.add(probe);

      this.landingLegs.push({
        group: legGroup,
        strut,
        pad,
        brace,
        restAngle: angle
      });
      this.bodyGroup.add(legGroup);
    }

    // ========================================================
    // 4. DEPLOYABLE MULTI-PANEL PHOTOVOLTAIC SOLAR ARRAYS
    // ========================================================
    const panelW = 1.75;
    const panelH = 0.90;

    // Frame material
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1a1e26,
      roughness: 0.5,
      metalness: 0.7
    });

    // Left Array Wing
    this.solarPanelLeft = new THREE.Group();
    const frameL = new THREE.Mesh(new THREE.BoxGeometry(panelW, 0.045, panelH), frameMat);
    const cellsL = new THREE.Mesh(new THREE.BoxGeometry(panelW - 0.06, 0.055, panelH - 0.06), solarMat);
    frameL.position.x = -panelW / 2;
    cellsL.position.x = -panelW / 2;
    frameL.castShadow = true;
    cellsL.castShadow = true;
    this.solarPanelLeft.add(frameL);
    this.solarPanelLeft.add(cellsL);

    // Structural deployment yoke & hinge bracket
    const yokeL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.25, 8), titaniumMat);
    yokeL.rotation.z = Math.PI / 2;
    yokeL.position.x = -0.12;
    this.solarPanelLeft.add(yokeL);

    this.solarPanelLeft.position.set(-deckWidth / 2, descentHeight + 0.42, 0);
    this.bodyGroup.add(this.solarPanelLeft);

    // Right Array Wing
    this.solarPanelRight = new THREE.Group();
    const frameR = new THREE.Mesh(new THREE.BoxGeometry(panelW, 0.045, panelH), frameMat);
    const cellsR = new THREE.Mesh(new THREE.BoxGeometry(panelW - 0.06, 0.055, panelH - 0.06), solarMat);
    frameR.position.x = panelW / 2;
    cellsR.position.x = panelW / 2;
    frameR.castShadow = true;
    cellsR.castShadow = true;
    this.solarPanelRight.add(frameR);
    this.solarPanelRight.add(cellsR);

    const yokeR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.25, 8), titaniumMat);
    yokeR.rotation.z = Math.PI / 2;
    yokeR.position.x = 0.12;
    this.solarPanelRight.add(yokeR);

    this.solarPanelRight.position.set(deckWidth / 2, descentHeight + 0.42, 0);
    this.bodyGroup.add(this.solarPanelRight);

    // ========================================================
    // 5. HIGH-GAIN PARABOLIC ANTENNA (STEERABLE DISH)
    // ========================================================
    this.antennaDish = new THREE.Group();

    // Two-axis gimbal mast
    this.antennaMast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.65, 8), aluminumMat);
    this.antennaMast.position.y = 0.32;
    this.antennaDish.add(this.antennaMast);

    // Gimbal actuator motor box
    const gimbalBox = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), titaniumMat);
    gimbalBox.position.y = 0.62;
    this.antennaDish.add(gimbalBox);

    // Concave parabolic dish
    const dishGeo = new THREE.SphereGeometry(0.42, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.45);
    const dishMesh = new THREE.Mesh(dishGeo, aluminumMat);
    dishMesh.rotation.x = Math.PI * 0.75;
    dishMesh.position.set(0, 0.72, 0.12);
    dishMesh.castShadow = true;
    this.antennaDish.add(dishMesh);

    // Central sub-reflector feed horn tripod
    const feedMast = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.28, 6), titaniumMat);
    feedMast.position.set(0, 0.72, 0.32);
    feedMast.rotation.x = Math.PI * 0.75;
    this.antennaDish.add(feedMast);

    const subReflector = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.03, 0.04, 12), aluminumMat);
    subReflector.position.set(0, 0.72, 0.44);
    subReflector.rotation.x = Math.PI * 0.75;
    this.antennaDish.add(subReflector);

    this.antennaDish.position.set(0.45, descentHeight + deckHeight, -0.42);
    this.bodyGroup.add(this.antennaDish);

    // ========================================================
    // 6. THROTTLEABLE DESCENT ENGINE NOZZLE & VOLUMETRIC PLUME
    // ========================================================
    const engineMat = new THREE.MeshStandardMaterial({
      color: 0x22262e,
      roughness: 0.32,
      metalness: 0.92
    });
    this.engineNozzle = new THREE.Mesh(
      new THREE.ConeGeometry(0.52, 0.95, 24, 2, true),
      engineMat
    );
    this.engineNozzle.position.y = 0.05;
    this.engineNozzle.castShadow = true;
    this.bodyGroup.add(this.engineNozzle);

    // Engine gimbal ring
    const gimbalRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.46, 0.04, 8, 24),
      titaniumMat
    );
    gimbalRing.rotation.x = Math.PI / 2;
    gimbalRing.position.y = 0.28;
    this.bodyGroup.add(gimbalRing);

    // Volumetric flame plume
    const plumeGroup = PlumeMaterials.createDescentPlumeMesh(0.65, 1.8);
    // Assign single mesh proxy to satisfy engineFlame interface
    const flameProxyMat = new THREE.MeshBasicMaterial({
      color: 0xffaa22,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    this.engineFlame = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.8, 16), flameProxyMat);
    this.engineFlame.rotation.x = Math.PI;
    this.engineFlame.position.y = -1.0;
    this.engineFlame.visible = false;
    this.engineFlame.add(plumeGroup);
    this.bodyGroup.add(this.engineFlame);

    this.engineLight = new THREE.PointLight(0xffa522, 0, 20, 1.8);
    this.engineLight.position.set(0, -0.6, 0);
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
      // Stowed: folded up tightly against body. Deployed: angled outward
      const foldAngle = (1 - pLegs) * 0.65;
      leg.group.rotation.x = foldAngle;
      leg.group.position.y = 0.4 + (1 - pLegs) * 0.25;
    }
  }

  /**
   * Compression of landing gear shock absorbers on touchdown (c in [0, 1])
   */
  public setLegCompression(c: number): void {
    const comp = Math.max(0, Math.min(1, c));
    this.legCompression = comp;
    for (const leg of this.landingLegs) {
      leg.group.position.y = 0.4 - comp * 0.12;
    }
  }

  /**
   * Pitch-over orientation for powered descent retro-flip
   * facing = 1: engine points toward travel vector (retro-burn)
   * facing = 0: vertical upright touchdown orientation
   */
  public setEngineFacing(facing: number): void {
    this.engineFacing = Math.max(0, Math.min(1, facing));
    this.bodyGroup.rotation.z = this.engineFacing * (Math.PI * 0.18);
    this.bodyGroup.rotation.x = this.engineFacing * (Math.PI * 0.12);
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
      this.engineLight.intensity = th * 4.2;
    }
  }
}
