import * as THREE from 'three';

/**
 * Creates high-fidelity layered rocket and lander exhaust plumes
 * Transitions from a bright white-hot Mach diamond core at the nozzle throat
 * to a translucent supersonic expansion plume boundary.
 */
export class PlumeMaterials {
  /**
   * Booster sea-level hydrocarbon/solid plume with Mach shock diamonds
   */
  public static createBoosterPlumeMesh(radius: number = 1.6, length: number = 4.5): THREE.Group {
    const group = new THREE.Group();

    // 1. Outer volumetric expansion envelope
    const outerGeo = new THREE.ConeGeometry(radius, length, 24, 4, true);
    outerGeo.rotateX(Math.PI);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    outerMesh.position.y = -length / 2;
    group.add(outerMesh);

    // 2. Middle hot core
    const midGeo = new THREE.ConeGeometry(radius * 0.55, length * 0.8, 16, 2, true);
    midGeo.rotateX(Math.PI);
    const midMat = new THREE.MeshBasicMaterial({
      color: 0xffaa22,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const midMesh = new THREE.Mesh(midGeo, midMat);
    midMesh.position.y = -length * 0.4;
    group.add(midMesh);

    // 3. Mach shock diamonds (series of white-hot bicones inside the throat core)
    const diamondCount = 3;
    for (let d = 0; d < diamondCount; d++) {
      const dGeo = new THREE.OctahedronGeometry(radius * (0.28 - d * 0.06), 0);
      dGeo.scale(1, 2.2, 1);
      const dMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95 - d * 0.15,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const dMesh = new THREE.Mesh(dGeo, dMat);
      dMesh.position.y = -0.5 - d * (length * 0.22);
      group.add(dMesh);
    }

    return group;
  }

  /**
   * Upper stage vacuum plume (methalox/hydrolox cyan-blue vacuum expansion)
   */
  public static createVacuumPlumeMesh(radius: number = 1.3, length: number = 3.8): THREE.Group {
    const group = new THREE.Group();

    // 1. Wide vacuum underexpanded envelope
    const outerGeo = new THREE.ConeGeometry(radius * 1.35, length, 24, 2, true);
    outerGeo.rotateX(Math.PI);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7, // sky blue
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    outerMesh.position.y = -length / 2;
    group.add(outerMesh);

    // 2. High-energy ion / hydroxyl cyan core
    const coreGeo = new THREE.ConeGeometry(radius * 0.45, length * 0.65, 16, 1, true);
    coreGeo.rotateX(Math.PI);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.y = -length * 0.32;
    group.add(coreMesh);

    // 3. Throat Mach core (bright white)
    const throatGeo = new THREE.SphereGeometry(radius * 0.28, 12, 12);
    throatGeo.scale(1, 2.5, 1);
    const throatMat = new THREE.MeshBasicMaterial({
      color: 0xf0f9ff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const throatMesh = new THREE.Mesh(throatGeo, throatMat);
    throatMesh.position.y = -0.4;
    group.add(throatMesh);

    return group;
  }

  /**
   * Throttleable lunar descent engine plume (warm golden amber with white throat)
   */
  public static createDescentPlumeMesh(radius: number = 0.65, length: number = 1.8): THREE.Group {
    const group = new THREE.Group();

    // 1. Expansion envelope
    const outerGeo = new THREE.ConeGeometry(radius, length, 20, 2, true);
    outerGeo.rotateX(Math.PI);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    outerMesh.position.y = -length / 2;
    group.add(outerMesh);

    // 2. White-hot throat cone
    const innerGeo = new THREE.ConeGeometry(radius * 0.35, length * 0.55, 12, 1, true);
    innerGeo.rotateX(Math.PI);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xfffbeb,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    innerMesh.position.y = -length * 0.28;
    group.add(innerMesh);

    return group;
  }
}

