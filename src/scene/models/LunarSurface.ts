import * as THREE from 'three';
import { HorizonManager } from '../../terrain/horizon';
import { createLunarRegolithMaterial } from '../materials/RocketTextures';

/**
 * 3D Photorealistic Lunar Terrain & Precision Sky-Dome Base Disc
 * 
 * Features:
 * - Multi-octave cratered regolith with raised ejecta rims & micro-relief
 * - Hapke / Lommel-Seeliger scattering characteristics (high roughness 0.95, zero metalness)
 * - Instanced procedural boulder field (`THREE.InstancedMesh`) around the landing zone
 * - 3D extruded LOLA terrain skyline silhouette wall with ridge crest highlighting
 * - Seamless morph into circular base disc for interactive Sky-Dome mode
 */
export class LunarSurface {
  public group: THREE.Group;
  public landingTerrain: THREE.Mesh;
  public domeBaseDisc: THREE.Mesh;
  public horizonWallMesh: THREE.Mesh | null = null;
  public craterGroup: THREE.Group;
  public boulderMesh: THREE.InstancedMesh | null = null;
  private horizonManager: HorizonManager;

  constructor(horizonManager?: HorizonManager) {
    this.group = new THREE.Group();
    this.group.name = 'LunarSurface';
    this.horizonManager = horizonManager || new HorizonManager();

    // --- 1. Authentic Hapke / Lommel-Seeliger Regolith Material ---
    const regolithMaterial = createLunarRegolithMaterial();

    // ========================================================
    // 2. MULTI-OCTAVE PROCEDURAL TERRAIN & CRATER MESH
    // ========================================================
    const terrainSize = 90;
    const terrainSegments = 96;
    const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);
    terrainGeo.rotateX(-Math.PI / 2);

    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      // Multi-octave harmonic lunar topography
      let y = Math.sin(x * 0.08) * 0.55 + Math.cos(z * 0.09) * 0.45;
      y += Math.sin(x * 0.22 + z * 0.18) * 0.28;
      y += Math.sin(x * 0.55 - z * 0.42) * 0.12; // micro-undulation

      const dCenter = Math.hypot(x, z);

      // Ensure stable, flat touchdown zone at coordinates (0, 0)
      if (dCenter < 3.2) {
        y *= Math.pow(dCenter / 3.2, 2.0);
      } else {
        // Primary Impact Crater 1: South-West Complex Basin
        const c1Dist = Math.hypot(x - 14, z - 10);
        if (c1Dist < 10) {
          const normDist = c1Dist / 10;
          if (normDist < 0.75) {
            // Excavation bowl
            y -= Math.cos((normDist / 0.75) * (Math.PI / 2)) * 2.2;
          } else {
            // Raised ejecta rim crest
            const rimFactor = Math.sin(((normDist - 0.75) / 0.25) * Math.PI);
            y += rimFactor * 0.45;
          }
        }

        // Secondary Impact Crater 2: North-East Deep Micro-Cold Trap
        const c2Dist = Math.hypot(x + 18, z + 12);
        if (c2Dist < 12) {
          const normDist = c2Dist / 12;
          if (normDist < 0.78) {
            y -= Math.cos((normDist / 0.78) * (Math.PI / 2)) * 2.8;
          } else {
            const rimFactor = Math.sin(((normDist - 0.78) / 0.22) * Math.PI);
            y += rimFactor * 0.55;
          }
        }

        // Tertiary Degraded Slump Crater 3
        const c3Dist = Math.hypot(x + 8, z - 20);
        if (c3Dist < 7) {
          const normDist = c3Dist / 7;
          y -= (1 - normDist) * 1.2;
        }
      }

      pos.setY(i, y);
    }
    terrainGeo.computeVertexNormals();

    this.landingTerrain = new THREE.Mesh(terrainGeo, regolithMaterial);
    this.landingTerrain.receiveShadow = true;
    this.landingTerrain.castShadow = true;
    this.group.add(this.landingTerrain);

    // ========================================================
    // 3. PROCEDURAL BOULDER FIELD (INSTANCED MESH)
    // ========================================================
    const boulderCount = 90;
    const boulderGeo = new THREE.DodecahedronGeometry(0.35, 1);
    // Micro-deform boulder vertices for faceted rock appearance
    const bPos = boulderGeo.attributes.position;
    for (let b = 0; b < bPos.count; b++) {
      const vx = bPos.getX(b);
      const vy = bPos.getY(b);
      const vz = bPos.getZ(b);
      const jitter = 0.85 + ((b * 13) % 7) * 0.05;
      bPos.setXYZ(b, vx * jitter, vy * (0.8 + ((b * 17) % 5) * 0.08), vz * jitter);
    }
    boulderGeo.computeVertexNormals();

    const boulderMat = new THREE.MeshStandardMaterial({
      color: 0x484b54,
      roughness: 0.92,
      metalness: 0.05
    });

    this.boulderMesh = new THREE.InstancedMesh(boulderGeo, boulderMat, boulderCount);
    this.boulderMesh.castShadow = true;
    this.boulderMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    let seed = 42;
    const rnd = () => {
      seed = (seed * 16807 + 12345) % 2147483647;
      return seed / 2147483647;
    };

    for (let i = 0; i < boulderCount; i++) {
      // Scatter outside 3.5m radius from landing center
      const rad = 4.0 + Math.pow(rnd(), 1.6) * 32.0;
      const th = rnd() * Math.PI * 2;
      const bx = Math.sin(th) * rad;
      const bz = Math.cos(th) * rad;

      // Approximate surface elevation
      const by = Math.sin(bx * 0.08) * 0.55 + Math.cos(bz * 0.09) * 0.45;
      const scale = 0.35 + rnd() * 0.75;

      dummy.position.set(bx, by + scale * 0.15, bz);
      dummy.rotation.set(rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI);
      dummy.scale.set(scale, scale * (0.7 + rnd() * 0.5), scale);
      dummy.updateMatrix();

      this.boulderMesh.setMatrixAt(i, dummy.matrix);
    }
    this.boulderMesh.instanceMatrix.needsUpdate = true;
    this.landingTerrain.add(this.boulderMesh);

    // ========================================================
    // 4. CIRCULAR SKY-DOME BASE DISC
    // ========================================================
    const discRadius = 16.0;
    const discGeo = new THREE.CylinderGeometry(discRadius, discRadius, 0.45, 64);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0x141822,
      roughness: 0.82,
      metalness: 0.28
    });
    this.domeBaseDisc = new THREE.Mesh(discGeo, discMat);
    this.domeBaseDisc.position.y = -0.22;
    this.domeBaseDisc.receiveShadow = true;
    this.domeBaseDisc.visible = false;
    this.group.add(this.domeBaseDisc);

    // Decorative geological features on base disc
    this.craterGroup = new THREE.Group();
    const craterRimMat = new THREE.MeshStandardMaterial({
      color: 0x0f131a,
      roughness: 0.9,
      metalness: 0.1
    });
    for (let i = 0; i < 20; i++) {
      const r = 3.2 + Math.random() * 11.5;
      const th = Math.random() * Math.PI * 2;
      const cx = Math.cos(th) * r;
      const cz = Math.sin(th) * r;
      const craterR = 0.45 + Math.random() * 1.5;

      const craterMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(craterR, craterR * 1.18, 0.09, 20),
        craterRimMat
      );
      craterMesh.position.set(cx, 0.02, cz);
      this.craterGroup.add(craterMesh);
    }
    this.domeBaseDisc.add(this.craterGroup);

    // Build the 3D extruded LOLA terrain skyline wall
    this.updateHorizonWall();
  }

  /**
   * Rebuild the 3D extruded terrain horizon wall based on current LOLA data
   * Creates a vertical topographical silhouette with glowing mountain ridge highlights
   */
  public updateHorizonWall(hm?: HorizonManager): void {
    if (hm) this.horizonManager = hm;

    if (this.horizonWallMesh) {
      this.group.remove(this.horizonWallMesh);
      this.horizonWallMesh.geometry.dispose();
      this.horizonWallMesh = null;
    }

    const radius = 16.0;
    const segments = 360;
    const vertices: number[] = [];
    const colors: number[] = [];

    // Scale elevation degrees to 3D dome height (10° elevation ~ 2.8 units height)
    const elToY = (elDeg: number) => Math.tan((elDeg * Math.PI) / 180) * radius;

    for (let a = 0; a < segments; a++) {
      const a0 = a;
      const a1 = (a + 1) % 360;

      const rad0 = (a0 * Math.PI) / 180;
      const rad1 = (a1 * Math.PI) / 180;

      // Azimuth 0 = North (+Z), Azimuth 90 = East (+X)
      const x0 = radius * Math.sin(rad0);
      const z0 = radius * Math.cos(rad0);
      const x1 = radius * Math.sin(rad1);
      const z1 = radius * Math.cos(rad1);

      const yTop0 = Math.max(0.06, elToY(this.horizonManager.getElevationAtAzimuth(a0)));
      const yTop1 = Math.max(0.06, elToY(this.horizonManager.getElevationAtAzimuth(a1)));

      // Triangle 1: (x0, 0, z0) -> (x1, 0, z1) -> (x1, yTop1, z1)
      vertices.push(x0, 0, z0);
      vertices.push(x1, 0, z1);
      vertices.push(x1, yTop1, z1);

      // Base: dark slate (0.08, 0.10, 0.14) -> Crest: ridge highlight (0.95, 0.75, 0.25)
      colors.push(0.08, 0.10, 0.14);
      colors.push(0.08, 0.10, 0.14);
      colors.push(0.95, 0.72, 0.22);

      // Triangle 2: (x0, 0, z0) -> (x1, yTop1, z1) -> (x0, yTop0, z0)
      vertices.push(x0, 0, z0);
      vertices.push(x1, yTop1, z1);
      vertices.push(x0, yTop0, z0);

      colors.push(0.08, 0.10, 0.14);
      colors.push(0.95, 0.72, 0.22);
      colors.push(0.95, 0.72, 0.22);
    }

    const wallGeo = new THREE.BufferGeometry();
    wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    wallGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    wallGeo.computeVertexNormals();

    const wallMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.2,
      side: THREE.DoubleSide
    });

    this.horizonWallMesh = new THREE.Mesh(wallGeo, wallMat);
    this.horizonWallMesh.castShadow = true;
    this.horizonWallMesh.receiveShadow = true;
    this.horizonWallMesh.visible = false;
    this.group.add(this.horizonWallMesh);
  }

  /**
   * Set transition morph progress: 0 (local ground) to 1 (dome disc with horizon wall)
   */
  public setMorphProgress(progress: number): void {
    const p = Math.max(0, Math.min(1, progress));
    this.landingTerrain.visible = p < 0.99;
    this.landingTerrain.scale.set(1 - p * 0.7, 1 - p * 0.7, 1 - p * 0.7);

    this.domeBaseDisc.visible = p > 0.05;
    this.domeBaseDisc.scale.set(p, p, p);

    if (this.horizonWallMesh) {
      this.horizonWallMesh.visible = p > 0.05;
      this.horizonWallMesh.scale.set(p, p, p);
    }
  }
}
