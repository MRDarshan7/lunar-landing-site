import * as THREE from 'three';

export class ParticleSystems {
  public group: THREE.Group;
  private plumePoints: THREE.Points;
  private plumePositions: Float32Array;
  private plumeVelocities: Float32Array;
  private plumeCount: number = 300;

  private dustPoints: THREE.Points;
  private dustPositions: Float32Array;
  private dustVelocities: Float32Array;
  private dustCount: number = 250;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'ParticleSystems';

    // 1. Rocket Engine Plume Particles
    const plumeGeo = new THREE.BufferGeometry();
    this.plumePositions = new Float32Array(this.plumeCount * 3);
    this.plumeVelocities = new Float32Array(this.plumeCount * 3);

    for (let i = 0; i < this.plumeCount; i++) {
      this.resetPlumeParticle(i, 0, 0, 0);
    }
    plumeGeo.setAttribute('position', new THREE.BufferAttribute(this.plumePositions, 3));

    const plumeMat = new THREE.PointsMaterial({
      color: 0xff8811,
      size: 0.85,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    this.plumePoints = new THREE.Points(plumeGeo, plumeMat);
    this.group.add(this.plumePoints);

    // 2. Lunar Touchdown Dust Particles
    const dustGeo = new THREE.BufferGeometry();
    this.dustPositions = new Float32Array(this.dustCount * 3);
    this.dustVelocities = new Float32Array(this.dustCount * 3);

    for (let i = 0; i < this.dustCount; i++) {
      this.resetDustParticle(i, 0, 0, 0);
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(this.dustPositions, 3));

    const dustMat = new THREE.PointsMaterial({
      color: 0x9fa4ae,
      size: 0.55,
      transparent: true,
      opacity: 0.65
    });
    this.dustPoints = new THREE.Points(dustGeo, dustMat);
    this.group.add(this.dustPoints);

    this.plumePoints.visible = false;
    this.dustPoints.visible = false;
  }

  private resetPlumeParticle(i: number, originX: number, originY: number, originZ: number): void {
    const idx = i * 3;
    this.plumePositions[idx] = originX + (Math.random() - 0.5) * 0.4;
    this.plumePositions[idx + 1] = originY;
    this.plumePositions[idx + 2] = originZ + (Math.random() - 0.5) * 0.4;

    this.plumeVelocities[idx] = (Math.random() - 0.5) * 0.8;
    this.plumeVelocities[idx + 1] = -1.5 - Math.random() * 2.0;
    this.plumeVelocities[idx + 2] = (Math.random() - 0.5) * 0.8;
  }

  private resetDustParticle(i: number, originX: number, originY: number, originZ: number): void {
    const idx = i * 3;
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 2.2;

    this.dustPositions[idx] = originX + (Math.random() - 0.5) * 0.2;
    this.dustPositions[idx + 1] = originY + 0.05;
    this.dustPositions[idx + 2] = originZ + (Math.random() - 0.5) * 0.2;

    this.dustVelocities[idx] = Math.cos(angle) * speed;
    this.dustVelocities[idx + 1] = 0.2 + Math.random() * 0.6;
    this.dustVelocities[idx + 2] = Math.sin(angle) * speed;
  }

  public updatePlume(active: boolean, originX: number, originY: number, originZ: number): void {
    this.plumePoints.visible = active;
    if (!active) return;

    for (let i = 0; i < this.plumeCount; i++) {
      const idx = i * 3;
      this.plumePositions[idx] += this.plumeVelocities[idx] * 0.1;
      this.plumePositions[idx + 1] += this.plumeVelocities[idx + 1] * 0.1;
      this.plumePositions[idx + 2] += this.plumeVelocities[idx + 2] * 0.1;

      // Particle lifetime expiration
      if (this.plumePositions[idx + 1] < originY - 14) {
        this.resetPlumeParticle(i, originX, originY, originZ);
      }
    }
    this.plumePoints.geometry.attributes.position.needsUpdate = true;
  }

  public updateDust(active: boolean, originX: number, originY: number, originZ: number): void {
    this.dustPoints.visible = active;
    if (!active) return;

    for (let i = 0; i < this.dustCount; i++) {
      const idx = i * 3;
      this.dustPositions[idx] += this.dustVelocities[idx] * 0.08;
      this.dustPositions[idx + 1] += this.dustVelocities[idx + 1] * 0.08;
      this.dustPositions[idx + 2] += this.dustVelocities[idx + 2] * 0.08;

      // Gravity settling
      this.dustVelocities[idx + 1] -= 0.015;

      const dist = Math.hypot(this.dustPositions[idx] - originX, this.dustPositions[idx + 2] - originZ);
      if (dist > 9.0 || this.dustPositions[idx + 1] < originY) {
        this.resetDustParticle(i, originX, originY, originZ);
      }
    }
    this.dustPoints.geometry.attributes.position.needsUpdate = true;
  }
}
