import * as THREE from 'three';
import { HorizonManager } from '../../terrain/horizon';

/**
 * 3D Lunar Terrain & Sky-Dome Base Disc
 * Supports:
 * - Cratered landing surface for powered descent
 * - Seamless morph into circular base disc for Sky-Dome view
 * - Dynamic 3D LOLA terrain horizon skyline wall matching real topography
 */
export class LunarSurface {
  public group: THREE.Group;
  public landingTerrain: THREE.Mesh;
  public domeBaseDisc: THREE.Mesh;
  public horizonWallMesh: THREE.Mesh | null = null;
  public craterGroup: THREE.Group;
  private horizonManager: HorizonManager;

  constructor(horizonManager?: HorizonManager) {
    this.group = new THREE.Group();
    this.group.name = 'LunarSurface';
    this.horizonManager = horizonManager || new HorizonManager();

    // --- Cratered Surface Material ---
    const lunarMaterial = new THREE.MeshStandardMaterial({
      color: 0x6e737e,
      roughness: 0.92,
      metalness: 0.08,
      flatShading: true
    });

    // 1. Local Landing Terrain (Plane with procedural crater height displacement)
    const terrainGeo = new THREE.PlaneGeometry(80, 80, 64, 64);
    terrainGeo.rotateX(-Math.PI / 2);

    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      let y = Math.sin(x * 0.12) * 0.4 + Math.cos(z * 0.14) * 0.35;
      y += Math.sin(x * 0.35 + z * 0.28) * 0.2;

      // Craters
      const dCenter = Math.hypot(x, z);
      // Flat touchdown pad at center (lander touchdown zone)
      if (dCenter < 3.0) {
        y *= (dCenter / 3.0);
      } else {
        // Impact craters
        const crater1Dist = Math.hypot(x - 12, z - 8);
        if (crater1Dist < 8) {
          const depth = Math.sin((crater1Dist / 8) * Math.PI) * 1.8;
          y -= depth;
        }

        const crater2Dist = Math.hypot(x + 15, z + 10);
        if (crater2Dist < 11) {
          const depth = Math.sin((crater2Dist / 11) * Math.PI) * 2.4;
          y -= depth;
        }
      }

      pos.setY(i, y);
    }
    terrainGeo.computeVertexNormals();

    this.landingTerrain = new THREE.Mesh(terrainGeo, lunarMaterial);
    this.landingTerrain.receiveShadow = true;
    this.group.add(this.landingTerrain);

    // 2. Dome Circular Base Disc (Radius 16 for Sky-Dome view)
    const discRadius = 16;
    const discGeo = new THREE.CylinderGeometry(discRadius, discRadius, 0.4, 64);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0x222834,
      roughness: 0.85,
      metalness: 0.2
    });
    this.domeBaseDisc = new THREE.Mesh(discGeo, discMat);
    this.domeBaseDisc.position.y = -0.2;
    this.domeBaseDisc.visible = false;
    this.group.add(this.domeBaseDisc);

    // Decorative lunar craters on base disc
    this.craterGroup = new THREE.Group();
    const craterRimMat = new THREE.MeshStandardMaterial({ color: 0x181c25, roughness: 0.9 });
    for (let i = 0; i < 18; i++) {
      const r = 3 + Math.random() * 11;
      const th = Math.random() * Math.PI * 2;
      const cx = Math.cos(th) * r;
      const cz = Math.sin(th) * r;
      const craterR = 0.5 + Math.random() * 1.4;

      const craterMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(craterR, craterR * 1.15, 0.08, 16),
        craterRimMat
      );
      craterMesh.position.set(cx, 0.02, cz);
      this.craterGroup.add(craterMesh);
    }
    this.domeBaseDisc.add(this.craterGroup);

    // Build the 3D LOLA terrain skyline wall around the dome rim
    this.updateHorizonWall();
  }

  /**
   * Rebuild the 3D extruded terrain horizon wall based on current LOLA data
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
    // Each azimuth degree produces 2 triangles (quad): bottom and top
    const vertices: number[] = [];
    const uvs: number[] = [];

    // Scale elevation degrees to 3D dome height: 10° elevation ~ 2.8 units height
    const elToY = (elDeg: number) => Math.tan((elDeg * Math.PI) / 180) * radius;

    for (let a = 0; a < segments; a++) {
      const a0 = a;
      const a1 = (a + 1) % 360;

      const rad0 = (a0 * Math.PI) / 180;
      const rad1 = (a1 * Math.PI) / 180;

      // In our scene: Azimuth 0 = North (+Z), Azimuth 90 = East (+X)
      // Note: x = r * sin(az), z = r * cos(az)
      const x0 = radius * Math.sin(rad0);
      const z0 = radius * Math.cos(rad0);
      const x1 = radius * Math.sin(rad1);
      const z1 = radius * Math.cos(rad1);

      const yTop0 = Math.max(0.05, elToY(this.horizonManager.getElevationAtAzimuth(a0)));
      const yTop1 = Math.max(0.05, elToY(this.horizonManager.getElevationAtAzimuth(a1)));

      // Triangle 1: (x0, 0, z0) -> (x1, 0, z1) -> (x1, yTop1, z1)
      vertices.push(x0, 0, z0);
      vertices.push(x1, 0, z1);
      vertices.push(x1, yTop1, z1);

      // Triangle 2: (x0, 0, z0) -> (x1, yTop1, z1) -> (x0, yTop0, z0)
      vertices.push(x0, 0, z0);
      vertices.push(x1, yTop1, z1);
      vertices.push(x0, yTop0, z0);

      uvs.push(a0 / 360, 0, a1 / 360, 0, a1 / 360, 1);
      uvs.push(a0 / 360, 0, a1 / 360, 1, a0 / 360, 1);
    }

    const wallGeo = new THREE.BufferGeometry();
    wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    wallGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    wallGeo.computeVertexNormals();

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x1f242e,
      roughness: 0.85,
      metalness: 0.25,
      side: THREE.DoubleSide
    });

    this.horizonWallMesh = new THREE.Mesh(wallGeo, wallMat);
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
