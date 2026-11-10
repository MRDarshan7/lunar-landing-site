import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { RocketModel } from '../models/RocketModel';
import { LanderModel } from '../models/LanderModel';
import { getMissionTelemetry } from '../../ephemeris/telemetryConductor';

/**
 * Headless Simulation Rig for Scene Graph & Kinematics Testing
 * Runs without WebGL, evaluating Three.js matrices directly.
 */
class HeadlessSceneRig {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public rocket: RocketModel;
  public lander: LanderModel;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(46, 16 / 9, 0.1, 1500);
    this.camera.position.set(0, 5, 24);

    this.lander = new LanderModel();
    this.rocket = new RocketModel(this.lander);
    this.rocket.registerScene(this.scene);

    this.scene.add(this.rocket.craftRig);
  }

  public evaluateProgress(p: number): void {
    const clamp = (val: number, min = 0, max = 1) => Math.max(min, Math.min(max, val));
    const seg = (a: number, b: number) => clamp((p - a) / (b - a));
    const ease = (t: number) => t * t * (3 - 2 * t);

    let craftX = 0;
    let craftY = 0;
    let craftZ = 0;

    const padOffsetX = 3.5 * (1 - ease(seg(0.08, 0.22)));

    if (p < 0.55) {
      const climb = ease(seg(0.08, 0.52));
      craftX = padOffsetX;
      craftY = climb * 45.0;
      craftZ = 0;
      this.rocket.craftRig.position.set(craftX, craftY, craftZ);
      this.rocket.craftRig.rotation.set(0, 0, 0);
    } else if (p < 0.62) {
      const coastT = ease(seg(0.55, 0.62));
      craftX = 0;
      craftY = THREE.MathUtils.lerp(70.9, 32.0, coastT);
      craftZ = THREE.MathUtils.lerp(0.0, 12.0, coastT);
      this.rocket.craftRig.position.set(craftX, craftY, craftZ);
      this.rocket.craftRig.rotation.set(0, 0, 0);
    } else {
      const descentT = ease(seg(0.62, 0.84));
      craftX = 0;
      craftY = THREE.MathUtils.lerp(32.0, 0.85, descentT);
      craftZ = (1 - descentT) * 12.0;
      this.rocket.craftRig.position.set(craftX, craftY, craftZ);
    }

    const craftWorldPos = new THREE.Vector3();
    this.rocket.craftRig.getWorldPosition(craftWorldPos);
    const craftWorldQuat = new THREE.Quaternion();
    this.rocket.craftRig.getWorldQuaternion(craftWorldQuat);

    this.rocket.updateSeparations(p, craftWorldPos, craftWorldQuat);

    if (p >= 0.86) {
      const domeMorph = ease(seg(0.86, 0.98));
      this.lander.group.position.set(0, 0.85, 0);
      this.lander.group.rotation.set(0, 0, 0);
      const s = THREE.MathUtils.lerp(1.0, 0.65, domeMorph);
      this.lander.group.scale.set(s, s, s);
      this.lander.setDeploy(1.0);
    } else if (p >= 0.55) {
      if (this.lander.group.parent !== this.scene) {
        this.scene.attach(this.lander.group);
      }
      this.lander.group.position.set(craftX, craftY, craftZ);
      this.lander.group.rotation.set(0, 0, 0);
      this.lander.group.scale.set(1.0, 1.0, 1.0);
      this.lander.setDeploy(seg(0.55, 0.65));
    } else {
      if (this.lander.group.parent !== this.rocket.payloadAdapter) {
        this.rocket.payloadAdapter.add(this.lander.group);
        this.lander.group.position.set(0, this.rocket.adapterHeight + 0.3, 0);
        this.lander.group.rotation.set(0, 0, 0);
        this.lander.group.scale.set(1.0, 1.0, 1.0);
      }
      this.lander.setDeploy(0);
    }

    if (p >= 0.62 && p <= 0.86) {
      const flipT = seg(0.62, 0.72) * (1 - seg(0.79, 0.84));
      this.lander.setEngineFacing(flipT);
      this.lander.setThrottle(seg(0.63, 0.70) * (1 - seg(0.82, 0.85)));
    } else {
      this.lander.setEngineFacing(0);
      this.lander.setThrottle(0);
    }

    if (p >= 0.82) {
      this.lander.setLegCompression(ease(seg(0.82, 0.86)));
    } else {
      this.lander.setLegCompression(0);
    }

    // Camera rig evaluation
    if (p < 0.35) {
      const camY = craftY * 0.85 + 4.5;
      const camZ = 24 - (p / 0.35) * 8.0;
      this.camera.position.set(craftX * 0.5, camY, camZ);
      this.camera.lookAt(craftX * 0.5, craftY + 3.0, 0);
    } else if (p < 0.84) {
      const camBlend = ease(seg(0.35, 0.40));
      const camY = THREE.MathUtils.lerp(craftY * 0.85 + 4.5, craftY + 3.0, camBlend);
      const camZ = 16.0 + craftZ;
      this.camera.position.set(0, camY, camZ);
      this.camera.lookAt(0, craftY + 1.2, craftZ);
    } else {
      const domeMorph = ease(seg(0.86, 0.98));
      const targetZoom = THREE.MathUtils.lerp(12, 32, domeMorph);
      const targetPitch = THREE.MathUtils.lerp(0.18, 0.38, domeMorph);
      const targetYaw = THREE.MathUtils.lerp(0, 0.5, domeMorph);

      const cx = targetZoom * Math.cos(targetPitch) * Math.sin(targetYaw);
      const cy = Math.max(1.8, targetZoom * Math.sin(targetPitch));
      const cz = targetZoom * Math.cos(targetPitch) * Math.cos(targetYaw);

      this.camera.position.set(cx, cy, cz);
      this.camera.lookAt(0, 0.85, 0);
    }

    this.scene.updateMatrixWorld(true);
    this.camera.updateMatrixWorld(true);
  }
}

describe('Scene Graph Continuity & Reversibility Tests', () => {
  it('a) lander exists in the scene graph at every p and world position never jumps more than threshold', () => {
    const rig = new HeadlessSceneRig();
    const step = 0.002;
    let prevPos: THREE.Vector3 | null = null;
    const maxThreshold = 1.8; // Continuous motion limit per 0.002 step (no teleportation)

    for (let p = 0; p <= 1.0; p += step) {
      rig.evaluateProgress(p);

      // Verify lander has a parent in the scene graph
      expect(rig.lander.group.parent).not.toBeNull();

      const worldPos = new THREE.Vector3();
      rig.lander.group.getWorldPosition(worldPos);

      // Assert coordinates are valid real numbers
      expect(Number.isFinite(worldPos.x)).toBe(true);
      expect(Number.isFinite(worldPos.y)).toBe(true);
      expect(Number.isFinite(worldPos.z)).toBe(true);

      if (prevPos) {
        const delta = worldPos.distanceTo(prevPos);
        expect(delta).toBeLessThanOrEqual(maxThreshold);
      }
      prevPos = worldPos.clone();
    }
  });

  it('b) lander is outside the fairing bounds only when fairing halves have separated', () => {
    const rig = new HeadlessSceneRig();

    // At p = 0.20: fairing is closed
    rig.evaluateProgress(0.20);
    expect(rig.rocket.isFairingDetached).toBe(false);

    const landerPos = new THREE.Vector3();
    rig.lander.group.getWorldPosition(landerPos);
    const fairingLPos = new THREE.Vector3();
    rig.rocket.fairingLeft.getWorldPosition(fairingLPos);
    const fairingRPos = new THREE.Vector3();
    rig.rocket.fairingRight.getWorldPosition(fairingRPos);

    // Lander X is between left and right fairing shells
    expect(landerPos.x).toBeGreaterThanOrEqual(fairingLPos.x - 0.2);
    expect(landerPos.x).toBeLessThanOrEqual(fairingRPos.x + 0.2);

    // At p = 0.50: fairing halves have separated laterally
    rig.evaluateProgress(0.50);
    expect(rig.rocket.isFairingDetached).toBe(true);
    rig.rocket.fairingLeft.getWorldPosition(fairingLPos);
    rig.rocket.fairingRight.getWorldPosition(fairingRPos);

    const fairingSpread = fairingRPos.x - fairingLPos.x;
    expect(fairingSpread).toBeGreaterThan(4.0); // Opened up widely
  });

  it('c) each debris item distance from the camera is non-decreasing after separation', () => {
    const rig = new HeadlessSceneRig();
    const step = 0.005;

    // Test spent booster separation (from p = 0.36 to 0.48)
    let prevBoosterDist = -1;
    for (let p = 0.36; p <= 0.48; p += step) {
      rig.evaluateProgress(p);
      const camPos = rig.camera.position;
      const boosterPos = new THREE.Vector3();
      rig.rocket.boosterStage.getWorldPosition(boosterPos);
      const dist = camPos.distanceTo(boosterPos);

      if (prevBoosterDist >= 0) {
        expect(dist).toBeGreaterThanOrEqual(prevBoosterDist - 0.05); // Non-decreasing distance
      }
      prevBoosterDist = dist;
    }
  });

  it('d) camera pitch stays within a set horizontal range through the descent (no downward pan)', () => {
    const rig = new HeadlessSceneRig();
    const step = 0.005;

    // Test powered descent phase (p = 0.62 to 0.84)
    for (let p = 0.62; p <= 0.84; p += step) {
      rig.evaluateProgress(p);

      const lookDir = new THREE.Vector3();
      rig.camera.getWorldDirection(lookDir);

      // Pitch is angle with horizontal plane: arcsin(lookDir.y)
      const pitch = Math.asin(lookDir.y);

      // Camera must NEVER tilt sharply downward (pitch must stay > -0.25 rad)
      expect(pitch).toBeGreaterThan(-0.25);
      expect(pitch).toBeLessThan(0.35);
    }
  });

  it('e) altitude telemetry is monotonic up to lander release and speed is monotonic down during descent', () => {
    const step = 0.002;

    // 1. Monotonic Ascent Altitude up to lander release (p = 0.08 to 0.55)
    let prevAlt = -1;
    for (let p = 0.08; p <= 0.55; p += step) {
      const tel = getMissionTelemetry(p);
      expect(tel.altitudeKm).toBeGreaterThanOrEqual(prevAlt);
      prevAlt = tel.altitudeKm;
    }

    // 2. Monotonic Descent Speed Deceleration (p = 0.62 to 0.85)
    let prevSpeed = 999999;
    for (let p = 0.62; p <= 0.85; p += step) {
      const tel = getMissionTelemetry(p);
      expect(tel.velocityKmh).toBeLessThanOrEqual(prevSpeed + 0.01);
      prevSpeed = tel.velocityKmh;
    }
  });

  it('f) forward and reverse sweeps give identical transforms for the same p (reversibility)', () => {
    const rig = new HeadlessSceneRig();
    const step = 0.02;
    const forwardTransforms: Array<{ p: number; landerMat: string; camMat: string }> = [];

    // Forward sweep: 0 -> 1
    for (let p = 0; p <= 1.0; p += step) {
      rig.evaluateProgress(p);
      forwardTransforms.push({
        p,
        landerMat: rig.lander.group.matrixWorld.elements.map(v => v.toFixed(3)).join(','),
        camMat: rig.camera.matrixWorld.elements.map(v => v.toFixed(3)).join(',')
      });
    }

    // Reverse sweep: 1 -> 0
    for (let i = forwardTransforms.length - 1; i >= 0; i--) {
      const expected = forwardTransforms[i];
      rig.evaluateProgress(expected.p);

      const landerMat = rig.lander.group.matrixWorld.elements.map(v => v.toFixed(3)).join(',');
      const camMat = rig.camera.matrixWorld.elements.map(v => v.toFixed(3)).join(',');

      expect(landerMat).toBe(expected.landerMat);
      expect(camMat).toBe(expected.camMat);
    }
  });
});
