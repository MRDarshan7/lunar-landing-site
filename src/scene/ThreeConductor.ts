import * as THREE from 'three';
import { RocketModel } from './models/RocketModel';
import { LanderModel } from './models/LanderModel';
import { LunarSurface } from './models/LunarSurface';
import { AtmosphereStars } from './models/AtmosphereStars';
import { ParticleSystems } from './models/ParticleSystems';
import { SkyDomeScene } from './skydome/SkyDomeScene';
import { HorizonManager } from '../terrain/horizon';
import { EphemerisSample, CelestialBodyPos } from '../types';
import { computeCraftState, computeCameraState, ROCKET_DIMS, seg, ease } from './kinematics/flightKinematics';

export class ThreeConductor {
  public canvas: HTMLCanvasElement;
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;

  // Scene Components (One unified craft rig)
  public rocket: RocketModel;
  public lander: LanderModel;
  public surface: LunarSurface;
  public atmosphere: AtmosphereStars;
  public particles: ParticleSystems;
  public skyDome: SkyDomeScene;

  // Progress state
  public scrollProgress: number = 0;
  public currentProgress: number = 0; // Lerped for buttery smoothness
  private isDestroyed: boolean = false;
  private width: number = 0;
  private height: number = 0;

  // Orbit / Interaction in Sky-Dome mode
  public isDomeInteractive: boolean = false;
  public domeYaw: number = 0.5;   // Radians
  public domePitch: number = 0.38; // Radians
  public domeZoom: number = 32.0; // Camera distance
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.width = canvas.clientWidth || window.innerWidth;
    this.height = canvas.clientHeight || window.innerHeight;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060b17);

    this.camera = new THREE.PerspectiveCamera(46, this.width / this.height, 0.1, 1500);
    this.camera.position.set(0, 5, 24);

    // Single Lander instance shared across entire journey & Sky-Dome
    this.lander = new LanderModel();

    // Single Craft Rig with lander stowed inside from frame 0
    this.rocket = new RocketModel(this.lander);
    this.rocket.registerScene(this.scene);

    this.surface = new LunarSurface();
    this.atmosphere = new AtmosphereStars();
    this.particles = new ParticleSystems();
    this.skyDome = new SkyDomeScene();

    this.scene.add(this.atmosphere.group);
    this.scene.add(this.particles.group);
    this.scene.add(this.surface.group);
    this.scene.add(this.rocket.craftRig);
    this.scene.add(this.skyDome.group);

    this.bindEvents();
    this.animate(0);
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize);

    // Mouse / Touch Drag for Sky-Dome orbit
    this.canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      if (this.currentProgress >= 0.86) {
        this.isDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.canvas.setPointerCapture(e.pointerId);
      }
    });

    this.canvas.addEventListener('pointermove', (e: PointerEvent) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      this.domeYaw += dx * 0.007;
      this.domePitch = Math.max(-0.08, Math.min(1.4, this.domePitch + dy * 0.007));
    });

    const stopDrag = () => { this.isDragging = false; };
    this.canvas.addEventListener('pointerup', stopDrag);
    this.canvas.addEventListener('pointercancel', stopDrag);

    // Zoom in SkyDome
    this.canvas.addEventListener('wheel', (e: WheelEvent) => {
      if (this.currentProgress >= 0.86) {
        e.preventDefault();
        this.domeZoom = Math.max(16, Math.min(50, this.domeZoom + (e.deltaY > 0 ? 1.8 : -1.8)));
      }
    }, { passive: false });
  }

  public onResize = (): void => {
    if (this.isDestroyed) return;
    this.width = this.canvas.clientWidth || window.innerWidth;
    this.height = this.canvas.clientHeight || window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  };

  /**
   * Set target scroll progress (0.0 to 1.0)
   */
  public setScrollProgress(progress: number): void {
    this.scrollProgress = Math.max(0, Math.min(1, progress));
  }

  /**
   * Jump instantly to progress without lerp (used in testing & frame scrubbing)
   */
  public setProgressInstant(progress: number): void {
    this.scrollProgress = Math.max(0, Math.min(1, progress));
    this.currentProgress = this.scrollProgress;
    this.renderCinematicSequence(this.currentProgress, 0);
    this.scene.updateMatrixWorld(true);
  }

  public updateHorizonProfile(hm: HorizonManager): void {
    this.surface.updateHorizonWall(hm);
  }

  public updateSkyDomePaths(samples: EphemerisSample[]): void {
    this.skyDome.updatePaths(samples);
  }

  public updateSkyDomePositions(sun: CelestialBodyPos, earth: CelestialBodyPos): void {
    this.skyDome.updatePositions(sun, earth);
    if (this.currentProgress >= 0.86 && sun.el > -4) {
      const sunDir = this.skyDome.toCartesian(sun.az, Math.max(0.5, sun.el), 45);
      this.atmosphere.directionalSun.position.copy(sunDir);
    }
  }

  /**
   * Animation & Render Loop
   */
  private animate = (time: number): void => {
    if (this.isDestroyed) return;
    requestAnimationFrame(this.animate);

    // Smooth lerp scroll progress
    this.currentProgress += (this.scrollProgress - this.currentProgress) * 0.09;
    if (Math.abs(this.scrollProgress - this.currentProgress) < 0.0003) {
      this.currentProgress = this.scrollProgress;
    }

    this.renderCinematicSequence(this.currentProgress, time);
    this.renderer.render(this.scene, this.camera);
  };

  /**
   * Orchestrates the 8 continuous flight beats along p in [0, 1].
   * Pure deterministic function of p for 100% reversible scrubbing!
   */
  public renderCinematicSequence(p: number, timeMs: number = 0): void {
    // ----------------------------------------------------
    // Dynamic Sky Atmosphere & Lighting Transition
    // ----------------------------------------------------
    // 0-35%: Dawn atmosphere (#1e3a8a) -> Space black (#030712)
    const atmoMix = ease(seg(p, 0.12, 0.35));
    const skyColor = new THREE.Color().lerpColors(
      new THREE.Color(0x1e3a8a),
      new THREE.Color(0x030712),
      atmoMix
    );
    this.scene.background = skyColor;

    // Stars: fade in as atmosphere fades (18% - 40%), stay visible in space
    const starsOpacity = seg(p, 0.18, 0.40) * (1 - seg(p, 0.88, 0.98) * 0.3);
    (this.atmosphere.starfield.material as THREE.PointsMaterial).opacity = starsOpacity;

    // Hard vacuum lighting transition (harsh contrast, near-zero ambient, pure solar key)
    if (p < 0.55) {
      const atmoTrans = seg(0.12, 0.35);
      this.atmosphere.ambientLight.color.setHex(0xdde5f5);
      this.atmosphere.ambientLight.intensity = THREE.MathUtils.lerp(0.55, 0.18, atmoTrans);
      this.atmosphere.directionalSun.color.setHex(0xffffff);
      this.atmosphere.directionalSun.intensity = THREE.MathUtils.lerp(2.5, 3.5, atmoTrans);
      this.atmosphere.directionalSun.position.set(35, 45, 25);
      this.atmosphere.rimLight.intensity = (1 - seg(0.20, 0.45)) * 0.8;
    } else {
      // Hard vacuum lunar phase: zero atmosphere, cool earthshine tint, intense solar beam
      const moonTrans = seg(0.55, 0.65);
      this.atmosphere.ambientLight.color.set(new THREE.Color(0x1a2639));
      this.atmosphere.ambientLight.intensity = THREE.MathUtils.lerp(0.18, 0.04, moonTrans);
      this.atmosphere.directionalSun.color.set(new THREE.Color(0xfffdf8));
      this.atmosphere.directionalSun.intensity = THREE.MathUtils.lerp(3.5, 4.5, moonTrans);
      if (p < 0.86) {
        // Low grazing polar sunlight angle during descent
        this.atmosphere.directionalSun.position.set(28, 14, 32);
      }
      this.atmosphere.rimLight.intensity = 0.0;
    }

    // ----------------------------------------------------
    // UNIFIED CRAFT & STAGE KINEMATICS
    // ----------------------------------------------------
    const craftDims = {
      boosterHeight: this.rocket.boosterHeight,
      boosterRadius: this.rocket.boosterRadius,
      interstageHeight: this.rocket.interstageHeight,
      upperStageHeight: this.rocket.upperStageHeight,
      adapterHeight: this.rocket.adapterHeight,
      fairingHeight: this.rocket.fairingHeight,
      fairingRadius: this.rocket.fairingRadius,
      totalHeight: this.rocket.totalHeight,
      stackLanderOffset: this.rocket.stackLanderOffset
    };

    const craftState = computeCraftState(p, craftDims);

    // Apply rig position & orientation
    this.rocket.craftRig.position.copy(craftState.craftRigPos);
    this.rocket.craftRig.rotation.copy(craftState.craftRigRot);

    const craftWorldPos = new THREE.Vector3();
    this.rocket.craftRig.getWorldPosition(craftWorldPos);
    const craftWorldQuat = new THREE.Quaternion();
    this.rocket.craftRig.getWorldQuaternion(craftWorldQuat);

    // Deterministic staging separations (booster, fairings, upper stage)
    this.rocket.updateSeparations(p, craftWorldPos, craftWorldQuat);

    // Animate launch pad (swing arm, clamps, vapor venting, ignition light)
    this.atmosphere.updatePad(p);

    // Launch ground pad & gantry tower recede below during ascent
    const padDrop = ease(seg(p, 0.08, 0.35)) * 50;
    this.atmosphere.launchGround.position.set(craftState.craftRigPos.x, -padDrop, 0);
    this.atmosphere.launchGround.visible = p < 0.38;

    // Clouds thin and drop with parallax
    const cloudDrop = ease(seg(p, 0.12, 0.35)) * 40;
    this.atmosphere.cloudLayers.position.y = -cloudDrop;
    this.atmosphere.cloudLayers.visible = p < 0.38;

    // ----------------------------------------------------
    // BEAT 1 & 2: LIFTOFF & ASCENT (0.08 - 0.35)
    // ----------------------------------------------------
    const boosterThrust = seg(p, 0.08, 0.14) * (1 - seg(p, 0.33, 0.35));
    this.rocket.setBoosterThrust(boosterThrust);

    // Liftoff engine plume particles
    const isBoosterFiring = p > 0.08 && p < 0.35;
    this.particles.updatePlume(isBoosterFiring, craftState.craftRigPos.x, craftState.craftRigPos.y - 1.2, craftState.craftRigPos.z);

    // ----------------------------------------------------
    // BEAT 3: BOOSTER MECO & VACUUM IGNITION (0.35 - 0.45)
    // ----------------------------------------------------
    const upperThrust = seg(p, 0.35, 0.39) * (1 - seg(p, 0.53, 0.55));
    this.rocket.setUpperThrust(upperThrust);

    // Distant Earth below (28% to 65%)
    this.atmosphere.distantEarth.visible = p > 0.28 && p < 0.65;
    const earthScale = Math.max(0.2, 1.0 - seg(p, 0.28, 0.65) * 0.75);
    this.atmosphere.distantEarth.scale.set(earthScale, earthScale, earthScale);

    // ----------------------------------------------------
    // BEAT 4 & 5: FAIRING JETTISON, MOON GROWS & LANDER DEPLOY (0.45 - 0.62)
    // Moon sphere ahead: only visible once lander is in translunar cruise (p >= 0.58),
    // NEVER obscuring the stowed lander reveal at p = 0.50!
    // ----------------------------------------------------
    this.atmosphere.approachMoon.visible = p >= 0.58 && p < 0.75;
    if (this.atmosphere.approachMoon.visible) {
      const moonGrow = seg(p, 0.58, 0.75);
      const moonScale = 0.4 + moonGrow * 1.8;
      this.atmosphere.approachMoon.scale.set(moonScale, moonScale, moonScale);
      this.atmosphere.approachMoon.position.set(0, 10, -140 + moonGrow * 85);
    }

    // Lander deployment state
    this.lander.setDeploy(craftState.deployProgress);
    this.lander.setEngineFacing(craftState.engineFacing);
    this.lander.setThrottle(craftState.throttle);
    this.lander.setLegCompression(craftState.legCompression);

    // ----------------------------------------------------
    // BEAT 6: APPROACH & POWERED DESCENT (0.62 - 0.80)
    // ----------------------------------------------------
    this.surface.group.visible = p > 0.60;
    const surfaceRise = ease(seg(p, 0.60, 0.78));
    this.surface.landingTerrain.position.y = (surfaceRise - 1.0) * 16.0;

    // ----------------------------------------------------
    // BEAT 7: TOUCHDOWN & DUST (0.80 - 0.86)
    // ----------------------------------------------------
    this.particles.updateDust(p >= 0.80 && p < 0.85, 0, 0.1, 0);

    // ----------------------------------------------------
    // BEAT 8: SKY-DOME DASHBOARD MORPH (0.86 - 1.00)
    // ----------------------------------------------------
    const domeMorph = ease(seg(p, 0.86, 0.98));
    this.surface.setMorphProgress(domeMorph);
    this.skyDome.group.visible = domeMorph > 0.05;
    this.skyDome.domeWireframeGroup.scale.set(domeMorph, domeMorph, domeMorph);
    this.isDomeInteractive = p >= 0.86;

    // Reparent lander preserving single persistent instance
    if (p >= 0.86) {
      if (this.lander.group.parent !== this.skyDome.group) {
        this.skyDome.group.add(this.lander.group);
      }
      this.lander.group.position.set(0, 0.85, 0);
      this.lander.group.rotation.set(0, 0, 0);
      this.lander.group.scale.set(craftState.landerScale, craftState.landerScale, craftState.landerScale);
    } else if (p >= 0.55) {
      if (this.lander.group.parent !== this.scene) {
        this.scene.add(this.lander.group);
      }
      this.lander.group.position.copy(craftState.landerWorldPos);
      this.lander.group.rotation.copy(craftState.landerWorldRot);
      this.lander.group.scale.set(1.0, 1.0, 1.0);
    } else {
      if (this.lander.group.parent !== this.rocket.payloadAdapter) {
        this.rocket.payloadAdapter.add(this.lander.group);
      }
      this.lander.group.position.set(0, this.rocket.adapterHeight + 0.3, 0);
      this.lander.group.rotation.set(0, 0, 0);
      this.lander.group.scale.set(1.0, 1.0, 1.0);
    }

    // ----------------------------------------------------
    // CAMERA CHOREOGRAPHY
    // Hero framing, dolly pullback at staging, and horizontal descent
    // ----------------------------------------------------
    const isPortrait = this.width < this.height;
    const aspect = this.width / (this.height || 1);
    const camState = computeCameraState(
      p,
      craftDims,
      46,
      aspect,
      isPortrait,
      { yaw: this.domeYaw, pitch: this.domePitch, zoom: this.domeZoom }
    );

    this.camera.position.copy(camState.position);
    this.camera.lookAt(camState.lookAt);
  }

  public destroy(): void {
    this.isDestroyed = true;
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
