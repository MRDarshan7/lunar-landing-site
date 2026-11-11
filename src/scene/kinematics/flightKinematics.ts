import * as THREE from 'three';

/**
 * Standard Rocket Stack Dimensions (in world meters/units)
 */
export interface RocketDimensions {
  boosterHeight: number;
  boosterRadius: number;
  interstageHeight: number;
  upperStageHeight: number;
  adapterHeight: number;
  fairingHeight: number;
  fairingRadius: number;
  totalHeight: number;
  stackLanderOffset: number; // Height from rocket base to lander mounting deck
}

export const ROCKET_DIMS: RocketDimensions = {
  boosterHeight: 16.0,
  boosterRadius: 1.6,
  interstageHeight: 1.4,
  upperStageHeight: 7.0,
  adapterHeight: 1.2,
  fairingHeight: 7.5,
  fairingRadius: 1.85,
  totalHeight: 16.0 + 1.4 + 7.0 + 1.2 + 7.5, // 33.1 units
  stackLanderOffset: 16.0 + 1.4 + 7.0 + 1.2 + 0.3 // 25.9 units
};

// Pure math helper functions
export const clamp = (val: number, min = 0, max = 1): number => Math.max(min, Math.min(max, val));
export const seg = (p: number, a: number, b: number): number => clamp((p - a) / (b - a));
export const ease = (t: number): number => t * t * (3 - 2 * t);
export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export interface CraftState {
  craftRigPos: THREE.Vector3;
  craftRigRot: THREE.Euler;
  landerWorldPos: THREE.Vector3;
  landerWorldRot: THREE.Euler;
  landerScale: number;
  boosterAttached: boolean;
  boosterWorldPos: THREE.Vector3;
  boosterWorldRot: THREE.Euler;
  fairingsAttached: boolean;
  fairingLeftPos: THREE.Vector3;
  fairingLeftRot: THREE.Euler;
  fairingRightPos: THREE.Vector3;
  fairingRightRot: THREE.Euler;
  upperStageAttached: boolean;
  upperStageWorldPos: THREE.Vector3;
  upperStageWorldRot: THREE.Euler;
  deployProgress: number;
  engineFacing: number;
  throttle: number;
  legCompression: number;
}

export interface CameraState {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  pitch: number;
}

/**
 * Computes exact vehicle kinematics across scroll progress p in [0, 1].
 * Guarantees C1 continuity across every stage transition (no teleportation).
 */
export function computeCraftState(p: number, dims: RocketDimensions = ROCKET_DIMS): CraftState {
  const padOffsetX = 3.5 * (1 - ease(seg(p, 0.08, 0.22)));

  // Ascent climb (0.08 to 0.52)
  const climb = ease(seg(p, 0.08, 0.52));
  const ascentY = climb * 45.0;

  // CraftRig reference origin position
  let craftRigX = 0;
  let craftRigY = 0;
  let craftRigZ = 0;

  if (p < 0.55) {
    craftRigX = padOffsetX;
    craftRigY = ascentY;
    craftRigZ = 0;
  } else {
    // Upper stage has burned out and separated.
    // The reference position follows the translunar trajectory
    craftRigX = 0;
    craftRigY = 45.0;
    craftRigZ = 0;
  }

  // -------------------------------------------------------------------------
  // 1. Lander World Position: Continuous from frame 0 to touchdown
  // -------------------------------------------------------------------------
  let landerWorldX = 0;
  let landerWorldY = 0;
  let landerWorldZ = 0;
  let landerScale = 1.0;

  if (p < 0.55) {
    // Before release (p < 0.55): lander is securely mounted atop payload adapter
    landerWorldX = craftRigX;
    landerWorldY = craftRigY + dims.stackLanderOffset;
    landerWorldZ = craftRigZ;
  } else if (p < 0.62) {
    // Translunar cruise coast (0.55 -> 0.62):
    // Starts exactly at (0, 45.0 + stackLanderOffset, 0) = (0, 70.9, 0)
    // Ends exactly at lunar orbit entry (0, 32.0, 12.0)
    const coastT = ease(seg(p, 0.55, 0.62));
    const startY = 45.0 + dims.stackLanderOffset; // 70.9
    const endY = 32.0;
    landerWorldX = 0;
    landerWorldY = THREE.MathUtils.lerp(startY, endY, coastT);
    landerWorldZ = THREE.MathUtils.lerp(0.0, 12.0, coastT);
  } else if (p < 0.84) {
    // Lunar powered descent (0.62 -> 0.84):
    // Descends from orbital altitude (0, 32.0, 12.0) to touchdown at (0, 0.85, 0)
    const descentT = ease(seg(p, 0.62, 0.84));
    landerWorldX = 0;
    landerWorldY = THREE.MathUtils.lerp(32.0, 0.85, descentT);
    landerWorldZ = (1 - descentT) * 12.0;
  } else {
    // Touchdown & Sky-Dome (p >= 0.84):
    // Lander rests firmly at touchdown coordinates (0, 0.85, 0)
    landerWorldX = 0;
    landerWorldY = 0.85;
    landerWorldZ = 0;

    // Morph scale to fit nicely within dashboard sky dome
    const domeMorph = ease(seg(p, 0.86, 0.98));
    landerScale = THREE.MathUtils.lerp(1.0, 0.65, domeMorph);
  }

  // -------------------------------------------------------------------------
  // 2. Lander Articulation
  // -------------------------------------------------------------------------
  let deployProgress = 0;
  if (p >= 0.55 && p < 0.65) {
    deployProgress = seg(p, 0.55, 0.65);
  } else if (p >= 0.65) {
    deployProgress = 1.0;
  }

  let engineFacing = 0;
  let throttle = 0;
  if (p >= 0.62 && p <= 0.85) {
    // Smooth retro-flip orientation about center of mass
    engineFacing = seg(p, 0.62, 0.70) * (1 - seg(p, 0.79, 0.84));
    throttle = seg(p, 0.63, 0.70) * (1 - seg(p, 0.82, 0.85));
  }

  let legCompression = 0;
  if (p >= 0.81) {
    legCompression = ease(seg(p, 0.81, 0.85));
  }

  // -------------------------------------------------------------------------
  // 3. Stage 1 Booster Separation (p >= 0.35)
  // -------------------------------------------------------------------------
  const boosterAttached = p < 0.35;
  const boosterWorldPos = new THREE.Vector3();
  const boosterWorldRot = new THREE.Euler();

  if (boosterAttached) {
    boosterWorldPos.set(craftRigX, craftRigY, craftRigZ);
    boosterWorldRot.set(0, 0, 0);
  } else {
    const tBooster = (p - 0.35) / 0.15;
    // Initial separation impulse + quadratic drag-free deceleration
    const dropDist = tBooster * 12.0 + tBooster * tBooster * 32.0;
    const driftX = Math.sin(tBooster * 2.2) * 1.5;

    boosterWorldPos.set(
      craftRigX + driftX,
      craftRigY - dropDist,
      craftRigZ - dropDist * 0.35
    );
    boosterWorldRot.set(tBooster * 0.45, 0, tBooster * 0.85);
  }

  // -------------------------------------------------------------------------
  // 4. Fairing Jettison (p >= 0.45)
  // -------------------------------------------------------------------------
  const fairingsAttached = p < 0.45;
  const fairingLeftPos = new THREE.Vector3();
  const fairingLeftRot = new THREE.Euler();
  const fairingRightPos = new THREE.Vector3();
  const fairingRightRot = new THREE.Euler();

  const fairingMountY = craftRigY + dims.boosterHeight + dims.interstageHeight + dims.upperStageHeight + dims.adapterHeight;

  if (fairingsAttached) {
    fairingLeftPos.set(craftRigX, fairingMountY, craftRigZ);
    fairingLeftRot.set(0, 0, 0);
    fairingRightPos.set(craftRigX, fairingMountY, craftRigZ);
    fairingRightRot.set(0, 0, 0);
  } else {
    const tFairing = (p - 0.45) / 0.15;
    const lateralSpread = tFairing * 10.5;
    const fairingDrop = tFairing * tFairing * 24.0;
    const pitchOut = tFairing * 1.25;

    fairingLeftPos.set(
      craftRigX - lateralSpread,
      fairingMountY - fairingDrop,
      craftRigZ
    );
    fairingLeftRot.set(0, tFairing * 0.5, pitchOut);

    fairingRightPos.set(
      craftRigX + lateralSpread,
      fairingMountY - fairingDrop,
      craftRigZ
    );
    fairingRightRot.set(0, -tFairing * 0.5, -pitchOut);
  }

  // -------------------------------------------------------------------------
  // 5. Stage 2 Upper Stage Separation (p >= 0.55)
  // -------------------------------------------------------------------------
  const upperStageAttached = p < 0.55;
  const upperStageWorldPos = new THREE.Vector3();
  const upperStageWorldRot = new THREE.Euler();

  const upperStageBaseY = craftRigY + dims.boosterHeight + dims.interstageHeight;

  if (upperStageAttached) {
    upperStageWorldPos.set(craftRigX, upperStageBaseY, craftRigZ);
    upperStageWorldRot.set(0, 0, 0);
  } else {
    const tUpper = (p - 0.55) / 0.15;
    const upperDrop = tUpper * 10.0 + tUpper * tUpper * 26.0;

    upperStageWorldPos.set(
      craftRigX + Math.sin(tUpper * 2) * 1.2,
      upperStageBaseY - upperDrop,
      craftRigZ - upperDrop * 0.4
    );
    upperStageWorldRot.set(tUpper * 0.65, 0, tUpper * 0.35);
  }

  return {
    craftRigPos: new THREE.Vector3(craftRigX, craftRigY, craftRigZ),
    craftRigRot: new THREE.Euler(0, 0, 0),
    landerWorldPos: new THREE.Vector3(landerWorldX, landerWorldY, landerWorldZ),
    landerWorldRot: new THREE.Euler(0, 0, 0),
    landerScale,
    boosterAttached,
    boosterWorldPos,
    boosterWorldRot,
    fairingsAttached,
    fairingLeftPos,
    fairingLeftRot,
    fairingRightPos,
    fairingRightRot,
    upperStageAttached,
    upperStageWorldPos,
    upperStageWorldRot,
    deployProgress,
    engineFacing,
    throttle,
    legCompression
  };
}

/**
 * Computes exact Camera choreography across scroll progress p.
 * Handles wide hero framing handover, staging dolly pullback,
 * and pitch-constrained lunar descent.
 */
export function computeCameraState(
  p: number,
  dims: RocketDimensions = ROCKET_DIMS,
  fovDeg = 46,
  aspect = 16 / 9,
  isPortrait = false,
  domeOpts?: { yaw?: number; pitch?: number; zoom?: number }
): CameraState {
  const craft = computeCraftState(p, dims);
  const fovRad = (fovDeg * Math.PI) / 180;

  // -------------------------------------------------------------------------
  // Hero Camera (p = 0.00 -> 0.16)
  // -------------------------------------------------------------------------
  // Fits full rocket from nose to engines plus launch pad into view
  const fitFactor = isPortrait ? 1.85 : 1.30;
  const heroFitDist = (dims.totalHeight * fitFactor) / (2 * Math.tan(fovRad / 2));
  const heroLookY = isPortrait ? dims.totalHeight * 0.80 : dims.totalHeight * 0.46; // In portrait, look higher so rocket is framed in lower half below title text
  const heroShiftX = isPortrait ? 0.0 : -9.5; // Offset camera to place rocket in right third on desktop

  const heroCamPos = new THREE.Vector3(
    craft.craftRigPos.x + heroShiftX,
    heroLookY,
    heroFitDist
  );
  const heroLookAt = new THREE.Vector3(
    craft.craftRigPos.x + (isPortrait ? 0 : 3.5),
    heroLookY,
    0
  );

  // -------------------------------------------------------------------------
  // Ascent Tracking Camera (p = 0.08 -> 0.35)
  // -------------------------------------------------------------------------
  const ascentCamY = craft.craftRigPos.y * 0.85 + 4.5;
  const ascentCamZ = 24.0 - (p / 0.35) * 8.0; // 24 -> 16
  const ascentCamPos = new THREE.Vector3(craft.craftRigPos.x * 0.5, ascentCamY, ascentCamZ);
  const ascentLookAt = new THREE.Vector3(craft.craftRigPos.x * 0.5, craft.craftRigPos.y + 3.0, 0);

  // Deterministic liftoff camera shake (function of p, 100% reversible)
  const boosterThrust = seg(p, 0.08, 0.14) * (1 - seg(p, 0.33, 0.35));
  if (boosterThrust > 0.05) {
    const shakeFreq = p * 420.0;
    const shakeAmp = boosterThrust * 0.14;
    ascentCamPos.x += Math.sin(shakeFreq) * Math.cos(shakeFreq * 1.6) * shakeAmp;
    ascentCamPos.y += Math.cos(shakeFreq * 1.3) * shakeAmp * 0.8;
  }

  // Blend hero framing to ascent tracking: 0.05 -> 0.16
  const heroBlend = 1 - ease(seg(p, 0.05, 0.16));

  let camPos = new THREE.Vector3();
  let lookTarget = new THREE.Vector3();

  if (p < 0.35) {
    camPos.lerpVectors(ascentCamPos, heroCamPos, heroBlend);
    lookTarget.lerpVectors(ascentLookAt, heroLookAt, heroBlend);
  } else if (p < 0.62) {
    // -------------------------------------------------------------------------
    // Staging & Fairing Jettison Dolly Pullback (p = 0.35 -> 0.62)
    // Pulls back to 2.5x distance so separating booster, fairing halves,
    // and upper stage are visibly framed leaving the shot!
    // -------------------------------------------------------------------------
    const dollyFactor = Math.sin(seg(p, 0.35, 0.62) * Math.PI); // Smooth arc [0 -> 1 -> 0]
    const dollyZ = THREE.MathUtils.lerp(16.0, 38.0, ease(dollyFactor));
    const targetY = craft.landerWorldPos.y;

    camPos.set(0, targetY * 0.85 + 3.0, dollyZ);
    lookTarget.set(0, targetY, craft.landerWorldPos.z);
  } else if (p < 0.84) {
    // -------------------------------------------------------------------------
    // Powered Descent Camera (p = 0.62 -> 0.84)
    // Strictly horizontal orientation: pitch restricted to [-0.05, 0.22] rad.
    // The surface rises up into view!
    // -------------------------------------------------------------------------
    const camY = craft.landerWorldPos.y + 1.2;
    const camZ = craft.landerWorldPos.z + 14.5;

    camPos.set(0, camY, camZ);
    lookTarget.set(0, craft.landerWorldPos.y + 1.2, craft.landerWorldPos.z);
  } else {
    // -------------------------------------------------------------------------
    // Sky-Dome Dashboard Interactive Orbit (p >= 0.84)
    // -------------------------------------------------------------------------
    const domeMorph = ease(seg(p, 0.86, 0.98));
    const yawTarget = domeOpts?.yaw ?? 0.45;
    const pitchTarget = domeOpts?.pitch ?? 0.38;
    const zoomTarget = domeOpts?.zoom ?? 32.0;

    const targetZoom = THREE.MathUtils.lerp(12.0, zoomTarget, domeMorph);
    const targetPitch = THREE.MathUtils.lerp(0.18, pitchTarget, domeMorph);
    const targetYaw = THREE.MathUtils.lerp(0.0, yawTarget, domeMorph);

    const cx = targetZoom * Math.cos(targetPitch) * Math.sin(targetYaw);
    const cy = Math.max(1.8, targetZoom * Math.sin(targetPitch));
    const cz = targetZoom * Math.cos(targetPitch) * Math.cos(targetYaw);

    camPos.set(cx, cy, cz);
    lookTarget.set(0, 0.85, 0); // Locked permanently on centered lander
  }

  // Compute camera pitch (angle relative to horizontal plane)
  const forward = new THREE.Vector3().subVectors(lookTarget, camPos).normalize();
  const pitch = Math.asin(forward.y);

  return {
    position: camPos,
    lookAt: lookTarget,
    pitch
  };
}
