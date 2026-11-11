import * as THREE from 'three';
import { LanderModel } from './LanderModel';
import { RocketTextures } from '../materials/RocketTextures';

/**
 * Unified Single Craft Rig & Production PBR Rocket Model
 * Implements the exact scene graph hierarchy from frame 0:
 * craftRig > boosterStage > interstage > upperStage > payloadAdapter > lander > fairings
 * 
 * Includes:
 * - Lofted tangent ogive fairings concealing the stowed lander without clipping
 * - Fuselage panel seams and realistic NASA/Artemis livery
 * - Corrugated structural interstage
 * - 4 titanium grid fins on booster
 * - Detailed engine cluster with emissive nozzle throats
 * - Deterministic ballistic separation for spent stages and fairings (fully reversible)
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

  public get totalHeight(): number {
    return this.boosterHeight + this.interstageHeight + this.upperStageHeight + this.adapterHeight + this.fairingHeight;
  }

  public get stackLanderOffset(): number {
    return this.boosterHeight + this.interstageHeight + this.upperStageHeight + this.adapterHeight + 0.3;
  }

  constructor(landerInstance: LanderModel) {
    this.lander = landerInstance;

    // --- Master Craft Rig Root ---
    this.craftRig = new THREE.Group();
    this.craftRig.name = 'CraftRig';

    // Textures & Materials
    const fuselageTex = RocketTextures.getFuselageTexture();
    const interstageTex = RocketTextures.getInterstageTexture();
    const nozzleTex = RocketTextures.getNozzleTexture();

    const whiteBodyMat = new THREE.MeshStandardMaterial({
      map: fuselageTex,
      roughness: 0.38,
      metalness: 0.2
    });

    const interstageMat = new THREE.MeshStandardMaterial({
      map: interstageTex,
      roughness: 0.55,
      metalness: 0.75
    });

    const engineMetalMat = new THREE.MeshStandardMaterial({
      map: nozzleTex,
      roughness: 0.3,
      metalness: 0.85
    });

    const fairingMat = new THREE.MeshStandardMaterial({
      color: 0xf6f8fc,
      roughness: 0.35,
      metalness: 0.15,
      side: THREE.DoubleSide
    });

    // ==========================================
    // 1. BOOSTER STAGE
    // ==========================================
    this.boosterStage = new THREE.Group();
    this.boosterStage.name = 'BoosterStage';
    this.craftRig.add(this.boosterStage);

    // Booster Core Tank
    const boosterGeo = new THREE.CylinderGeometry(
      this.boosterRadius,
      this.boosterRadius,
      this.boosterHeight,
      36
    );
    const boosterMesh = new THREE.Mesh(boosterGeo, whiteBodyMat);
    boosterMesh.position.y = this.boosterHeight / 2;
    this.boosterStage.add(boosterMesh);

    // Aft Heat Shield & Thrust Structure
    const aftShieldGeo = new THREE.CylinderGeometry(
      this.boosterRadius,
      this.boosterRadius * 1.05,
      0.8,
      36
    );
    const aftShieldMat = new THREE.MeshStandardMaterial({ color: 0x1a1c22, roughness: 0.6, metalness: 0.8 });
    const aftShield = new THREE.Mesh(aftShieldGeo, aftShieldMat);
    aftShield.position.y = 0.4;
    this.boosterStage.add(aftShield);

    // 4 Aerodynamic Grid Fins at top of booster
    for (let f = 0; f < 4; f++) {
      const finAngle = (f * Math.PI) / 2;
      const finGroup = new THREE.Group();
      finGroup.position.set(
        Math.cos(finAngle) * (this.boosterRadius + 0.35),
        this.boosterHeight - 1.2,
        Math.sin(finAngle) * (this.boosterRadius + 0.35)
      );
      finGroup.rotation.y = -finAngle;

      const finGeo = new THREE.BoxGeometry(0.08, 1.3, 0.9);
      const finMesh = new THREE.Mesh(finGeo, interstageMat);
      finGroup.add(finMesh);
      this.boosterStage.add(finGroup);
    }

    // 4 Booster Landing Legs (tucked flush against fuselage)
    for (let l = 0; l < 4; l++) {
      const legAngle = (l * Math.PI) / 2 + Math.PI / 4;
      const legGeo = new THREE.BoxGeometry(0.12, 4.5, 0.25);
      const legMesh = new THREE.Mesh(legGeo, interstageMat);
      legMesh.position.set(
        Math.cos(legAngle) * (this.boosterRadius + 0.05),
        2.8,
        Math.sin(legAngle) * (this.boosterRadius + 0.05)
      );
      legMesh.rotation.y = -legAngle;
      this.boosterStage.add(legMesh);
    }

    // Main Engine Cluster (1 Center + 8 Outer Engines)
    const nozzleCluster = new THREE.Group();
    const engineCoords = [
      [0, 0],
      [0.85, 0], [-0.85, 0], [0, 0.85], [0, -0.85],
      [0.6, 0.6], [-0.6, 0.6], [0.6, -0.6], [-0.6, -0.6]
    ];
    for (const [ex, ez] of engineCoords) {
      const nozzleGeo = new THREE.ConeGeometry(0.38, 1.1, 16, 1, true);
      const nozzle = new THREE.Mesh(nozzleGeo, engineMetalMat);
      nozzle.position.set(ex, -0.25, ez);
      nozzleCluster.add(nozzle);
    }
    this.boosterStage.add(nozzleCluster);

    // Booster Flame Plume
    const boosterFlameMat = new THREE.MeshBasicMaterial({
      color: 0xff8811,
      transparent: true,
      opacity: 0.95
    });
    this.boosterPlume = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4.5, 16), boosterFlameMat);
    this.boosterPlume.rotation.x = Math.PI;
    this.boosterPlume.position.y = -2.4;
    this.boosterPlume.visible = false;
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
      36
    );
    const interMesh = new THREE.Mesh(interGeo, interstageMat);
    interMesh.position.y = this.interstageHeight / 2;
    this.interstage.add(interMesh);

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
      36
    );
    const upperMesh = new THREE.Mesh(upperGeo, whiteBodyMat);
    upperMesh.position.y = this.upperStageHeight / 2;
    this.upperStage.add(upperMesh);

    // High-expansion vacuum engine nozzle inside interstage
    const vacNozzleGeo = new THREE.ConeGeometry(0.9, 1.8, 24, 1, true);
    const vacNozzle = new THREE.Mesh(vacNozzleGeo, engineMetalMat);
    vacNozzle.position.y = -0.5;
    this.upperStage.add(vacNozzle);

    // Upper Stage Vacuum Plume (Bluer/cyan LH2-LOX / Methane flame)
    const upperFlameMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.92
    });
    this.upperPlume = new THREE.Mesh(new THREE.ConeGeometry(1.2, 3.8, 16), upperFlameMat);
    this.upperPlume.rotation.x = Math.PI;
    this.upperPlume.position.y = -2.2;
    this.upperPlume.visible = false;
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

    // Conical payload adapter ring
    const adapterGeo = new THREE.CylinderGeometry(
      this.fairingRadius,
      this.boosterRadius * 0.98,
      this.adapterHeight,
      36
    );
    const adapterMesh = new THREE.Mesh(adapterGeo, interstageMat);
    adapterMesh.position.y = this.adapterHeight / 2;
    this.payloadAdapter.add(adapterMesh);

    // ==========================================
    // 5. LANDER (STOWED CHILD OF PAYLOAD ADAPTER)
    // ==========================================
    // Nested inside the payload adapter from frame 0!
    // Offset so lander sits securely atop the adapter deck
    this.lander.group.position.set(0, this.adapterHeight + 0.3, 0);
    this.lander.group.scale.set(1.0, 1.0, 1.0);
    this.payloadAdapter.add(this.lander.group);

    // ==========================================
    // 6. PAYLOAD FAIRINGS (LEFT & RIGHT)
    // ==========================================
    // Tangent Ogive Curve:
    // r(y) = R * sqrt(max(0, 1 - (y / H)^1.8))
    const fairingPoints: THREE.Vector2[] = [];
    const segments = 24;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = t * this.fairingHeight;
      const r = this.fairingRadius * Math.sqrt(Math.max(0.02, 1 - Math.pow(t, 1.75)));
      fairingPoints.push(new THREE.Vector2(r, y));
    }

    const fairingLeftGeo = new THREE.LatheGeometry(fairingPoints, 24, 0, Math.PI);
    const fairingRightGeo = new THREE.LatheGeometry(fairingPoints, 24, Math.PI, Math.PI);

    this.fairingLeft = new THREE.Group();
    this.fairingLeft.name = 'FairingLeft';
    const fairingLeftMesh = new THREE.Mesh(fairingLeftGeo, fairingMat);
    this.fairingLeft.add(fairingLeftMesh);
    this.fairingLeft.position.set(0, this.adapterHeight, 0);
    this.payloadAdapter.add(this.fairingLeft);

    this.fairingRight = new THREE.Group();
    this.fairingRight.name = 'FairingRight';
    const fairingRightMesh = new THREE.Mesh(fairingRightGeo, fairingMat);
    this.fairingRight.add(fairingRightMesh);
    this.fairingRight.position.set(0, this.adapterHeight, 0);
    this.payloadAdapter.add(this.fairingRight);

    // Master craft rig root is standard scale (1.0)
    this.craftRig.scale.set(1.0, 1.0, 1.0);
  }

  public registerScene(scene: THREE.Scene): void {
    this.sceneRoot = scene;
  }

  /**
   * Set engine throttle levels
   */
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
    const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));

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
      const dropDist = tBooster * 12.0 + tBooster * tBooster * 30.0; // Linear impulse + quadratic acceleration
      const driftX = Math.sin(tBooster * 2.5) * 1.5;

      // Position in world space relative to craft at separation
      // Spent booster falls behind in both -Y (gravity/drag) and -Z (receding)
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
      // Upper stage and payload adapter fall away backwards into -Y and -Z behind camera
      const tStage2 = (p - 0.55) / 0.15;
      const stage2DropY = tStage2 * 14.0 + tStage2 * tStage2 * 35.0;
      const stage2DropZ = tStage2 * 12.0 + tStage2 * tStage2 * 30.0;
      if (this.upperStage.parent === this.interstage && this.sceneRoot) {
        this.sceneRoot.attach(this.upperStage);
      }
      this.upperStage.position.set(
        craftWorldPos.x + Math.sin(tStage2 * 2) * 1.5,
        craftWorldPos.y + this.boosterHeight + this.interstageHeight - stage2DropY,
        craftWorldPos.z - stage2DropZ
      );
      this.upperStage.rotation.x = tStage2 * 0.7;
      this.upperStage.rotation.z = tStage2 * 0.35;
    }
  }
}
