import * as THREE from 'three';
import { LanderModel } from './LanderModel';
import { RocketTextures, createBrushedAluminumMaterial } from '../materials/RocketTextures';
import { PlumeMaterials } from '../materials/PlumeMaterials';

/**
 * Unified Single Craft Rig & Aerospace PBR Heavy Rocket Model
 * Implements the exact scene graph hierarchy from frame 0:
 * craftRig > boosterStage > interstage > upperStage > payloadAdapter > lander > fairings
 * 
 * Features:
 * - External LOX/Methane cable raceways & propellant feedlines along fuselage
 * - Waffle-grid titanium hypersonic grid fins with lattice frame structure
 * - Corrugated structural interstage with staging pneumatic pushers
 * - Pressurized helium Composite Overwrapped Pressure Vessels (COPVs) inside adapter
 * - Detailed 9-engine cluster with regenerative cooling manifolds and stiffener rings
 * - Vacuum nozzle with expansion contour and volumetric cyan Mach plume
 * - Deterministic ballistic separation controller (100% reversible)
 */
export class RocketModel {
  public craftRig: THREE.Group;
  public boosterStage: THREE.Group;
  public interstage: THREE.Group;
  public upperStage: THREE.Group;
  public payloadAdapter: THREE.Group;
  public fairingLeft: THREE.Group;
  public fairingRight: THREE.Group;
  public lander: LanderModel;

  // Visual effects
  public boosterPlume: THREE.Mesh;
  public boosterLight: THREE.PointLight;
  public upperPlume: THREE.Mesh;
  public upperLight: THREE.PointLight;

  // Separation state references
  private sceneRoot: THREE.Scene | null = null;
  public isBoosterDetached: boolean = false;
  public isFairingDetached: boolean = false;
  public isLanderReleased: boolean = false;

  // Stored dimensions (craft local coordinates)
  public readonly boosterHeight = 16.0;
  public readonly boosterRadius = 1.6;
  public readonly interstageHeight = 1.4;
  public readonly upperStageHeight = 7.0;
  public readonly adapterHeight = 1.2;
  public readonly fairingHeight = 7.5;
  public readonly fairingRadius = 1.85;

  constructor(landerInstance: LanderModel) {
    this.lander = landerInstance;

    // --- Master Craft Rig Root ---
    this.craftRig = new THREE.Group();
    this.craftRig.name = 'CraftRig';

    // Materials
    const fuselageTex = RocketTextures.getFuselageTexture();
    const interstageTex = RocketTextures.getInterstageTexture();
    const nozzleTex = RocketTextures.getNozzleTexture();

    const whiteBodyMat = new THREE.MeshStandardMaterial({
      map: fuselageTex,
      roughness: 0.35,
      metalness: 0.22
    });

    const interstageMat = new THREE.MeshStandardMaterial({
      map: interstageTex,
      roughness: 0.52,
      metalness: 0.78
    });

    const engineMetalMat = new THREE.MeshStandardMaterial({
      map: nozzleTex,
      roughness: 0.28,
      metalness: 0.88
    });

    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0x252a34,
      roughness: 0.4,
      metalness: 0.85
    });

    const copvCarbonMat = new THREE.MeshStandardMaterial({
      color: 0x11141a,
      roughness: 0.65,
      metalness: 0.35
    });

    const fairingMat = new THREE.MeshStandardMaterial({
      color: 0xf5f7fb,
      roughness: 0.32,
      metalness: 0.16,
      side: THREE.DoubleSide
    });

    // ==========================================
    // 1. BOOSTER STAGE
    // ==========================================
    this.boosterStage = new THREE.Group();
    this.boosterStage.name = 'BoosterStage';
    this.craftRig.add(this.boosterStage);

    // Booster Core Tank Cylinder
    const boosterGeo = new THREE.CylinderGeometry(
      this.boosterRadius,
      this.boosterRadius,
      this.boosterHeight,
      48
    );
    const boosterMesh = new THREE.Mesh(boosterGeo, whiteBodyMat);
    boosterMesh.position.y = this.boosterHeight / 2;
    boosterMesh.castShadow = true;
    boosterMesh.receiveShadow = true;
    this.boosterStage.add(boosterMesh);

    // External propellant raceways running down booster flanks (0° and 180°)
    for (let r = 0; r < 2; r++) {
      const angle = r * Math.PI;
      const racewayGeo = new THREE.BoxGeometry(0.12, this.boosterHeight * 0.94, 0.16);
      const raceway = new THREE.Mesh(racewayGeo, whiteBodyMat);
      raceway.position.set(
        Math.sin(angle) * (this.boosterRadius + 0.06),
        this.boosterHeight / 2,
        Math.cos(angle) * (this.boosterRadius + 0.06)
      );
      raceway.rotation.y = angle;
      raceway.castShadow = true;
      this.boosterStage.add(raceway);
    }

    // Aft Thrust Structure & Thermal Heat Shield
    const aftShieldGeo = new THREE.CylinderGeometry(
      this.boosterRadius,
      this.boosterRadius * 1.05,
      0.85,
      48
    );
    const aftShieldMat = new THREE.MeshStandardMaterial({ color: 0x181a20, roughness: 0.6, metalness: 0.85 });
    const aftShield = new THREE.Mesh(aftShieldGeo, aftShieldMat);
    aftShield.position.y = 0.42;
    aftShield.castShadow = true;
    this.boosterStage.add(aftShield);

    // 4 Titanium Waffle-Grid Fins at top of booster
    for (let f = 0; f < 4; f++) {
      const finAngle = (f * Math.PI) / 2;
      const finGroup = new THREE.Group();
      finGroup.position.set(
        Math.cos(finAngle) * (this.boosterRadius + 0.35),
        this.boosterHeight - 1.2,
        Math.sin(finAngle) * (this.boosterRadius + 0.35)
      );
      finGroup.rotation.y = -finAngle;

      // Outer fin frame
      const frameGeo = new THREE.BoxGeometry(0.08, 1.35, 0.95);
      const frameMesh = new THREE.Mesh(frameGeo, titaniumMat);
      finGroup.add(frameMesh);

      // Grid fin lattice mesh
      const latticeGeo = new THREE.BoxGeometry(0.05, 1.15, 0.75);
      const latticeMat = new THREE.MeshStandardMaterial({
        color: 0x3d4352,
        roughness: 0.45,
        metalness: 0.75,
        wireframe: true
      });
      const latticeMesh = new THREE.Mesh(latticeGeo, latticeMat);
      finGroup.add(latticeMesh);

      // Hydraulic rotary actuator spindle
      const spindleGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.35, 12);
      const spindle = new THREE.Mesh(spindleGeo, titaniumMat);
      spindle.rotation.z = Math.PI / 2;
      spindle.position.x = -0.2;
      finGroup.add(spindle);

      this.boosterStage.add(finGroup);
    }

    // 4 Booster Landing Legs (tucked flush against fuselage)
    for (let l = 0; l < 4; l++) {
      const legAngle = (l * Math.PI) / 2 + Math.PI / 4;
      const legGeo = new THREE.BoxGeometry(0.14, 4.6, 0.28);
      const legMesh = new THREE.Mesh(legGeo, interstageMat);
      legMesh.position.set(
        Math.cos(legAngle) * (this.boosterRadius + 0.05),
        2.8,
        Math.sin(legAngle) * (this.boosterRadius + 0.05)
      );
      legMesh.rotation.y = -legAngle;
      legMesh.castShadow = true;
      this.boosterStage.add(legMesh);
    }

    // Main Engine Cluster (1 Center + 8 Octaweb Outer Engines)
    const nozzleCluster = new THREE.Group();
    const engineCoords = [
      [0, 0],
      [0.85, 0], [-0.85, 0], [0, 0.85], [0, -0.85],
      [0.6, 0.6], [-0.6, 0.6], [0.6, -0.6], [-0.6, -0.6]
    ];
    for (const [ex, ez] of engineCoords) {
      const nozzleGroup = new THREE.Group();
      nozzleGroup.position.set(ex, -0.25, ez);

      const nozzleGeo = new THREE.ConeGeometry(0.38, 1.15, 20, 2, true);
      const nozzle = new THREE.Mesh(nozzleGeo, engineMetalMat);
      nozzle.castShadow = true;
      nozzleGroup.add(nozzle);

      // Regenerative fuel inlet manifold ring
      const ringGeo = new THREE.TorusGeometry(0.24, 0.035, 8, 16);
      const ring = new THREE.Mesh(ringGeo, titaniumMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.25;
      nozzleGroup.add(ring);

      nozzleCluster.add(nozzleGroup);
    }
    this.boosterStage.add(nozzleCluster);

    // Layered Booster Flame Plume with Mach shock diamonds
    const boosterPlumeGroup = PlumeMaterials.createBoosterPlumeMesh(1.7, 4.8);
    const boosterFlameProxyMat = new THREE.MeshBasicMaterial({
      color: 0xff8811,
      transparent: true,
      opacity: 0.95
    });
    this.boosterPlume = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4.5, 16), boosterFlameProxyMat);
    this.boosterPlume.rotation.x = Math.PI;
    this.boosterPlume.position.y = -2.4;
    this.boosterPlume.visible = false;
    this.boosterPlume.add(boosterPlumeGroup);
    this.boosterStage.add(this.boosterPlume);

    this.boosterLight = new THREE.PointLight(0xff7711, 0, 50, 1.8);
    this.boosterLight.position.set(0, -2.0, 0);
    this.boosterStage.add(this.boosterLight);

    // ==========================================
    // 2. INTERSTAGE
    // ==========================================
    this.interstage = new THREE.Group();
    this.interstage.name = 'Interstage';
    this.interstage.position.y = this.boosterHeight;
    this.boosterStage.add(this.interstage);

    const interGeo = new THREE.CylinderGeometry(
      this.boosterRadius,
      this.boosterRadius,
      this.interstageHeight,
      48
    );
    const interMesh = new THREE.Mesh(interGeo, interstageMat);
    interMesh.position.y = this.interstageHeight / 2;
    interMesh.castShadow = true;
    interMesh.receiveShadow = true;
    this.interstage.add(interMesh);

    // Stage separation pneumatic pushers
    for (let p = 0; p < 4; p++) {
      const pAngle = (p * Math.PI) / 2;
      const pusherGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8);
      const pusher = new THREE.Mesh(pusherGeo, titaniumMat);
      pusher.position.set(
        Math.cos(pAngle) * (this.boosterRadius * 0.92),
        this.interstageHeight - 0.15,
        Math.sin(pAngle) * (this.boosterRadius * 0.92)
      );
      this.interstage.add(pusher);
    }

    // ==========================================
    // 3. UPPER STAGE
    // ==========================================
    this.upperStage = new THREE.Group();
    this.upperStage.name = 'UpperStage';
    this.upperStage.position.y = this.interstageHeight;
    this.interstage.add(this.upperStage);

    const upperGeo = new THREE.CylinderGeometry(
      this.boosterRadius * 0.98,
      this.boosterRadius * 0.98,
      this.upperStageHeight,
      48
    );
    const upperMesh = new THREE.Mesh(upperGeo, whiteBodyMat);
    upperMesh.position.y = this.upperStageHeight / 2;
    upperMesh.castShadow = true;
    upperMesh.receiveShadow = true;
    this.upperStage.add(upperMesh);

    // Upper stage cable raceway
    const upperRacewayGeo = new THREE.BoxGeometry(0.10, this.upperStageHeight * 0.96, 0.14);
    const upperRaceway = new THREE.Mesh(upperRacewayGeo, whiteBodyMat);
    upperRaceway.position.set(0, this.upperStageHeight / 2, this.boosterRadius * 0.98 + 0.05);
    upperRaceway.castShadow = true;
    this.upperStage.add(upperRaceway);

    // High-expansion vacuum engine nozzle inside interstage
    const vacNozzleGeo = new THREE.ConeGeometry(0.92, 1.85, 32, 2, true);
    const vacNozzle = new THREE.Mesh(vacNozzleGeo, engineMetalMat);
    vacNozzle.position.y = -0.52;
    vacNozzle.castShadow = true;
    this.upperStage.add(vacNozzle);

    // Stiffener hat-bands on vacuum nozzle
    const vacBandGeo = new THREE.TorusGeometry(0.72, 0.03, 8, 32);
    const vacBand = new THREE.Mesh(vacBandGeo, titaniumMat);
    vacBand.rotation.x = Math.PI / 2;
    vacBand.position.y = -0.9;
    this.upperStage.add(vacBand);

    // Upper Stage Vacuum Plume (Cyan-blue vacuum expansion)
    const upperPlumeGroup = PlumeMaterials.createVacuumPlumeMesh(1.3, 3.8);
    const upperFlameProxyMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.92
    });
    this.upperPlume = new THREE.Mesh(new THREE.ConeGeometry(1.2, 3.8, 16), upperFlameProxyMat);
    this.upperPlume.rotation.x = Math.PI;
    this.upperPlume.position.y = -2.2;
    this.upperPlume.visible = false;
    this.upperPlume.add(upperPlumeGroup);
    this.upperStage.add(this.upperPlume);

    this.upperLight = new THREE.PointLight(0x38bdf8, 0, 40, 1.8);
    this.upperLight.position.set(0, -1.8, 0);
    this.upperStage.add(this.upperLight);

    // ==========================================
    // 4. PAYLOAD ADAPTER
    // ==========================================
    this.payloadAdapter = new THREE.Group();
    this.payloadAdapter.name = 'PayloadAdapter';
    this.payloadAdapter.position.y = this.upperStageHeight;
    this.upperStage.add(this.payloadAdapter);

    // Conical payload adapter structural ring
    const adapterGeo = new THREE.CylinderGeometry(
      this.fairingRadius,
      this.boosterRadius * 0.98,
      this.adapterHeight,
      48
    );
    const adapterMesh = new THREE.Mesh(adapterGeo, interstageMat);
    adapterMesh.position.y = this.adapterHeight / 2;
    adapterMesh.castShadow = true;
    adapterMesh.receiveShadow = true;
    this.payloadAdapter.add(adapterMesh);

    // Pressurized Helium COPV tanks visible inside adapter ring
    for (let c = 0; c < 3; c++) {
      const cAngle = (c * Math.PI * 2) / 3;
      const copvGeo = new THREE.SphereGeometry(0.24, 16, 16);
      const copv = new THREE.Mesh(copvGeo, copvCarbonMat);
      copv.position.set(
        Math.cos(cAngle) * (this.fairingRadius * 0.58),
        this.adapterHeight * 0.45,
        Math.sin(cAngle) * (this.fairingRadius * 0.58)
      );
      copv.castShadow = true;
      this.payloadAdapter.add(copv);
    }

    // ==========================================
    // 5. LANDER (STOWED CHILD OF PAYLOAD ADAPTER)
    // ==========================================
    this.lander.group.position.set(0, this.adapterHeight + 0.3, 0);
    this.lander.group.scale.set(1.0, 1.0, 1.0);
    this.payloadAdapter.add(this.lander.group);

    // ==========================================
    // 6. PAYLOAD FAIRINGS (LEFT & RIGHT)
    // ==========================================
    // Tangent Ogive Curve: r(y) = R * sqrt(max(0, 1 - (y / H)^1.8))
    const fairingPoints: THREE.Vector2[] = [];
    const segments = 28;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = t * this.fairingHeight;
      const r = this.fairingRadius * Math.sqrt(Math.max(0.02, 1 - Math.pow(t, 1.75)));
      fairingPoints.push(new THREE.Vector2(r, y));
    }

    const fairingLeftGeo = new THREE.LatheGeometry(fairingPoints, 28, 0, Math.PI);
    const fairingRightGeo = new THREE.LatheGeometry(fairingPoints, 28, Math.PI, Math.PI);

    this.fairingLeft = new THREE.Group();
    this.fairingLeft.name = 'FairingLeft';
    const fairingLeftMesh = new THREE.Mesh(fairingLeftGeo, fairingMat);
    fairingLeftMesh.castShadow = true;
    fairingLeftMesh.receiveShadow = true;
    this.fairingLeft.add(fairingLeftMesh);
    this.fairingLeft.position.set(0, this.adapterHeight, 0);
    this.payloadAdapter.add(this.fairingLeft);

    this.fairingRight = new THREE.Group();
    this.fairingRight.name = 'FairingRight';
    const fairingRightMesh = new THREE.Mesh(fairingRightGeo, fairingMat);
    fairingRightMesh.castShadow = true;
    fairingRightMesh.receiveShadow = true;
    this.fairingRight.add(fairingRightMesh);
    this.fairingRight.position.set(0, this.adapterHeight, 0);
    this.payloadAdapter.add(this.fairingRight);

    // Master craft rig root
    this.craftRig.scale.set(1.0, 1.0, 1.0);
  }

  public registerScene(scene: THREE.Scene): void {
    this.sceneRoot = scene;
  }

  public setBoosterThrust(intensity: number): void {
    const i = Math.max(0, intensity);
    if (i <= 0.01) {
      this.boosterPlume.visible = false;
      this.boosterLight.intensity = 0;
    } else {
      this.boosterPlume.visible = true;
      this.boosterPlume.scale.set(i, i * (1 + Math.random() * 0.25), i);
      this.boosterLight.intensity = i * 4.8;
    }
  }

  public setUpperThrust(intensity: number): void {
    const i = Math.max(0, intensity);
    if (i <= 0.01) {
      this.upperPlume.visible = false;
      this.upperLight.intensity = 0;
    } else {
      this.upperPlume.visible = true;
      this.upperPlume.scale.set(i, i * (1 + Math.random() * 0.25), i);
      this.upperLight.intensity = i * 4.2;
    }
  }

  /**
   * Deterministic separation controller for progress p
   * Guarantees 100% reversible forward & backward scrubbing!
   */
  public updateSeparations(
    p: number,
    craftWorldPos: THREE.Vector3,
    craftWorldQuat: THREE.Quaternion
  ): void {
    // ----------------------------------------------------
    // Beat 35% - 45%: Booster MECO & Separation
    // ----------------------------------------------------
    if (p < 0.35) {
      // Re-attach booster to craft hierarchy if scrubbing backwards
      if (this.isBoosterDetached) {
        this.craftRig.add(this.boosterStage);
        this.boosterStage.position.set(0, 0, 0);
        this.boosterStage.rotation.set(0, 0, 0);
        this.isBoosterDetached = false;
      }
      if (this.interstage.parent !== this.boosterStage) {
        this.boosterStage.add(this.interstage);
        this.interstage.position.set(0, this.boosterHeight, 0);
        this.interstage.rotation.set(0, 0, 0);
      }
    } else {
      // Booster has separated: falls behind with ballistic tumble
      if (!this.isBoosterDetached && this.sceneRoot) {
        if (this.interstage.parent !== this.craftRig) {
          this.craftRig.add(this.interstage);
          this.interstage.position.set(0, this.boosterHeight, 0);
          this.interstage.rotation.set(0, 0, 0);
        }
        this.sceneRoot.attach(this.boosterStage);
        this.isBoosterDetached = true;
      }
      const tBooster = (p - 0.35) / 0.15;
      const dropDist = tBooster * 12.0 + tBooster * tBooster * 30.0;
      const driftX = Math.sin(tBooster * 2.5) * 1.5;

      this.boosterStage.position.set(
        craftWorldPos.x + driftX,
        craftWorldPos.y - dropDist,
        craftWorldPos.z - dropDist * 0.3
      );
      this.boosterStage.rotation.z = tBooster * 0.85;
      this.boosterStage.rotation.x = tBooster * 0.45;
    }

    // ----------------------------------------------------
    // Beat 45% - 55%: Fairing Jettison
    // ----------------------------------------------------
    if (p < 0.45) {
      if (this.isFairingDetached) {
        this.payloadAdapter.add(this.fairingLeft);
        this.payloadAdapter.add(this.fairingRight);
        this.fairingLeft.position.set(0, this.adapterHeight, 0);
        this.fairingLeft.rotation.set(0, 0, 0);
        this.fairingRight.position.set(0, this.adapterHeight, 0);
        this.fairingRight.rotation.set(0, 0, 0);
        this.isFairingDetached = false;
      }
    } else {
      if (!this.isFairingDetached && this.sceneRoot) {
        this.sceneRoot.attach(this.fairingLeft);
        this.sceneRoot.attach(this.fairingRight);
        this.isFairingDetached = true;
      }
      const tFairing = (p - 0.45) / 0.15;
      const lateralSpread = tFairing * 9.5;
      const fairingDrop = tFairing * tFairing * 22.0;
      const pitchOut = tFairing * 1.2;

      this.fairingLeft.position.set(
        craftWorldPos.x - lateralSpread,
        craftWorldPos.y + (this.upperStageHeight * 0.4) - fairingDrop,
        craftWorldPos.z
      );
      this.fairingLeft.rotation.z = pitchOut;
      this.fairingLeft.rotation.y = tFairing * 0.5;

      this.fairingRight.position.set(
        craftWorldPos.x + lateralSpread,
        craftWorldPos.y + (this.upperStageHeight * 0.4) - fairingDrop,
        craftWorldPos.z
      );
      this.fairingRight.rotation.z = -pitchOut;
      this.fairingRight.rotation.y = -tFairing * 0.5;
    }

    // ----------------------------------------------------
    // Beat 55% - 62%: Lander Release from Upper Stage
    // ----------------------------------------------------
    if (p < 0.55) {
      if (this.isLanderReleased) {
        this.payloadAdapter.add(this.lander.group);
        this.lander.group.position.set(0, this.adapterHeight + 0.3, 0);
        this.lander.group.rotation.set(0, 0, 0);
        this.lander.group.scale.set(1, 1, 1);
        this.isLanderReleased = false;
      }
      if (this.upperStage.parent !== this.interstage) {
        this.interstage.add(this.upperStage);
        this.upperStage.position.set(0, this.interstageHeight, 0);
        this.upperStage.rotation.set(0, 0, 0);
        this.upperStage.scale.set(1, 1, 1);
      }
    } else {
      if (!this.isLanderReleased && this.sceneRoot) {
        this.sceneRoot.attach(this.lander.group);
        this.isLanderReleased = true;
      }
      const tStage2 = (p - 0.55) / 0.15;
      const stage2Drop = tStage2 * tStage2 * 28.0;
      if (this.upperStage.parent === this.interstage && this.sceneRoot) {
        this.sceneRoot.attach(this.upperStage);
      }
      this.upperStage.position.set(
        craftWorldPos.x + Math.sin(tStage2 * 2) * 1.5,
        craftWorldPos.y - stage2Drop,
        craftWorldPos.z + stage2Drop * 0.3
      );
      this.upperStage.rotation.x = tStage2 * 0.7;
    }
  }
}
