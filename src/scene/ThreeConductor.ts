import * as THREE from 'three';
import { RocketModel } from './models/RocketModel';
import { LanderModel } from './models/LanderModel';
import { LunarSurface } from './models/LunarSurface';
import { AtmosphereStars } from './models/AtmosphereStars';
import { ParticleSystems } from './models/ParticleSystems';
import { SkyDomeScene } from './skydome/SkyDomeScene';
import { HorizonManager } from '../terrain/horizon';
import { EphemerisSample, CelestialBodyPos } from '../types';
import {
  computeCraftState,
  computeCameraState,
  RocketDimensions,
  CraftState,
  CameraState,
  ROCKET_DIMS,
  seg,
  ease
} from './kinematics/flightKinematics';

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
  public scrollProgress: number = 0; // Target progress (driven by scroll)
  public currentProgress: number = 0; // Frame-rate independent exponential damped progress
  private isDestroyed: boolean = false;
  private isContextLost: boolean = false;
  private animFrameId: number | null = null;
  private lastTimeMs: number = 0;
  private width: number = 0;
  private height: number = 0;
  private resizeObserver: ResizeObserver | null = null;

  // Orbit / Interaction in Sky-Dome mode
  public isDomeInteractive: boolean = false;
  public domeYaw: number = 0.5;   // Radians
  public domePitch: number = 0.38; // Radians
  public domeZoom: number = 32.0; // Camera distance
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  // GPU & Shadow tracking
  private lastRenderedProgress: number = -1;
  private shadowNeedsUpdate: boolean = true;

  // Decoupled frame progress listener callback
  public onFrameProgress?: (currentP: number, targetP: number) => void;

  // Pre-allocated scratch objects for zero GC in the render loop
  private readonly craftDims: RocketDimensions;
  private readonly _craftState: CraftState;
  private readonly _cameraState: CameraState;
  private readonly _craftWorldPos = new THREE.Vector3();
  private readonly _craftWorldQuat = new THREE.Quaternion();
  private readonly _sunDir = new THREE.Vector3();
  private readonly _skyColor = new THREE.Color();
  private readonly _dawnColor = new THREE.Color(0x1e3a8a);
  private readonly _spaceColor = new THREE.Color(0x030712);
  private readonly _domeOrbit = { yaw: 0.5, pitch: 0.38, zoom: 32.0 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.width = canvas.clientWidth || window.innerWidth;
    this.height = canvas.clientHeight || window.innerHeight;

    // Renderer: clamp pixel ratio to 2 to prevent 4K/Retina fill-rate bottlenecks
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // Shadow maps: autoUpdate disabled during static orbital phases to conserve GPU fill rate
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;

    // Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060b17);

    this.camera = new THREE.PerspectiveCamera(46, this.width / (this.height || 1), 0.1, 1500);
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

    // Pre-allocate dimensions and scratch state objects
    this.craftDims = {
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

    this._craftState = computeCraftState(0, this.craftDims);
    this._cameraState = computeCameraState(0, this.craftDims, 46, this.width / (this.height || 1), false);

    // Warm up and precompile all shaders
    this.precompileShaders();

    this.bindEvents();
    this.renderCinematicSequence(0, 0);
    this.animFrameId = requestAnimationFrame(this.animate);
  }

  /**
   * Pre-compile all shaders and textures on initialization so stage separations
   * and Sky-Dome morphs never cause first-frame shader stalls.
   */
  public precompileShaders(): void {
    if (this.isDestroyed || !this.renderer) return;

    // Temporarily make all components visible for shader warmup
    const prevVis = {
      surface: this.surface.group.visible,
      landingTerrain: this.surface.landingTerrain.visible,
      domeBaseDisc: this.surface.domeBaseDisc.visible,
      horizonWall: this.surface.horizonWallMesh ? this.surface.horizonWallMesh.visible : false,
      skyDome: this.skyDome.group.visible,
      approachMoon: this.atmosphere.approachMoon.visible,
      distantEarth: this.atmosphere.distantEarth.visible,
      cloudLayers: this.atmosphere.cloudLayers.visible,
      launchGround: this.atmosphere.launchGround.visible
    };

    this.surface.group.visible = true;
    this.surface.landingTerrain.visible = true;
    this.surface.domeBaseDisc.visible = true;
    if (this.surface.horizonWallMesh) this.surface.horizonWallMesh.visible = true;
    this.skyDome.group.visible = true;
    this.atmosphere.approachMoon.visible = true;
    this.atmosphere.distantEarth.visible = true;
    this.atmosphere.cloudLayers.visible = true;
    this.atmosphere.launchGround.visible = true;

    this.scene.updateMatrixWorld(true);
    this.camera.updateMatrixWorld(true);

    try {
      this.renderer.compile(this.scene, this.camera);
    } catch {
      // Safe fallback if headless test mock
    }

    // Restore nominal initial visibility for p = 0
    this.surface.group.visible = prevVis.surface;
    this.surface.landingTerrain.visible = prevVis.landingTerrain;
    this.surface.domeBaseDisc.visible = prevVis.domeBaseDisc;
    if (this.surface.horizonWallMesh) this.surface.horizonWallMesh.visible = prevVis.horizonWall;
    this.skyDome.group.visible = prevVis.skyDome;
    this.atmosphere.approachMoon.visible = prevVis.approachMoon;
    this.atmosphere.distantEarth.visible = prevVis.distantEarth;
    this.atmosphere.cloudLayers.visible = prevVis.cloudLayers;
    this.atmosphere.launchGround.visible = prevVis.launchGround;
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (this.currentProgress >= 0.86) {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.canvas.setPointerCapture(e.pointerId);
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastMouseX;
    const dy = e.clientY - this.lastMouseY;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;

    this.domeYaw += dx * 0.007;
    this.domePitch = Math.max(-0.08, Math.min(1.4, this.domePitch + dy * 0.007));
    this.shadowNeedsUpdate = true;
  };

  private stopDrag = (): void => {
    this.isDragging = false;
  };

  private onWheel = (e: WheelEvent): void => {
    if (this.currentProgress >= 0.86) {
      e.preventDefault();
      this.domeZoom = Math.max(16, Math.min(50, this.domeZoom + (e.deltaY > 0 ? 1.8 : -1.8)));
      this.shadowNeedsUpdate = true;
    }
  };

  private onContextLost = (e: Event): void => {
    e.preventDefault();
    this.isContextLost = true;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    console.warn('[ThreeConductor] WebGL Context Lost: rendering paused');
  };

  private onContextRestored = (): void => {
    console.info('[ThreeConductor] WebGL Context Restored: re-initializing WebGL pipeline');
    this.isContextLost = false;
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.precompileShaders();
    this.shadowNeedsUpdate = true;
    this.lastTimeMs = performance.now();
    this.animFrameId = requestAnimationFrame(this.animate);
  };

  private bindEvents(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.onResize();
      });
      this.resizeObserver.observe(this.canvas);
    } else {
      window.addEventListener('resize', this.onResize);
    }

    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.stopDrag);
    this.canvas.addEventListener('pointercancel', this.stopDrag);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });

    // WebGL Context Lost / Restored reliability handlers
    this.canvas.addEventListener('webglcontextlost', this.onContextLost, false);
    this.canvas.addEventListener('webglcontextrestored', this.onContextRestored, false);
  }

  public onResize = (): void => {
    if (this.isDestroyed || !this.canvas) return;
    this.width = this.canvas.clientWidth || window.innerWidth;
    this.height = this.canvas.clientHeight || window.innerHeight;
    this.camera.aspect = this.width / (this.height || 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.shadowNeedsUpdate = true;
  };

  /**
   * Set target scroll progress (0.0 to 1.0)
   */
  public setScrollProgress(progress: number): void {
    this.scrollProgress = Math.max(0, Math.min(1, progress));
  }

  /**
   * Set progress immediately without damping (100% deterministic for tests & scrub)
   */
  public setProgressImmediate(progress: number): void {
    this.scrollProgress = Math.max(0, Math.min(1, progress));
    this.currentProgress = this.scrollProgress;
    this.shadowNeedsUpdate = true;
    this.renderCinematicSequence(this.currentProgress, 0);
    this.scene.updateMatrixWorld(true);
    this.camera.updateMatrixWorld(true);
    if (this.onFrameProgress) {
      this.onFrameProgress(this.currentProgress, this.scrollProgress);
    }
  }

  /**
   * Alias for setProgressImmediate
   */
  public setProgressInstant(progress: number): void {
    this.setProgressImmediate(progress);
  }

  public updateHorizonProfile(hm: HorizonManager): void {
    this.surface.updateHorizonWall(hm);
    this.shadowNeedsUpdate = true;
  }

  public updateSkyDomePaths(samples: EphemerisSample[]): void {
    this.skyDome.updatePaths(samples);
  }

  public updateSkyDomePositions(sun: CelestialBodyPos, earth: CelestialBodyPos): void {
    this.skyDome.updatePositions(sun, earth);
    if (this.currentProgress >= 0.86 && sun.el > -4) {
      this.skyDome.toCartesian(sun.az, Math.max(0.5, sun.el), 45, this._sunDir);
      this.atmosphere.directionalSun.position.copy(this._sunDir);
      this.shadowNeedsUpdate = true;
    }
  }

  /**
   * Animation & Render Loop with Exponential Damping & Zero GC
   */
  private animate = (timeMs: number): void => {
    if (this.isDestroyed || this.isContextLost) return;
    this.animFrameId = requestAnimationFrame(this.animate);

    const dt = this.lastTimeMs > 0 ? Math.min((timeMs - this.lastTimeMs) / 1000, 0.1) : 0.016;
    this.lastTimeMs = timeMs;

    // Frame-rate independent exponential damping for buttery-smooth camera and craft interpolation
    // currentP += (targetP - currentP) * (1 - Math.exp(-lambda * dt))
    const lambda = 10.0;
    const factor = 1 - Math.exp(-lambda * dt);
    this.currentProgress += (this.scrollProgress - this.currentProgress) * factor;

    if (Math.abs(this.scrollProgress - this.currentProgress) < 0.0001) {
      this.currentProgress = this.scrollProgress;
    }

    // Dynamic shadow updates: only when craft or light vectors actively change
    const hasProgressMoved = Math.abs(this.currentProgress - this.lastRenderedProgress) > 0.0001;
    const isShadowPhase = this.currentProgress < 0.38 || (this.currentProgress >= 0.60 && this.currentProgress <= 0.86);

    if (hasProgressMoved && isShadowPhase) {
      this.renderer.shadowMap.needsUpdate = true;
    } else if (this.shadowNeedsUpdate) {
      this.renderer.shadowMap.needsUpdate = true;
      this.shadowNeedsUpdate = false;
    }

    this.renderCinematicSequence(this.currentProgress, timeMs);
    this.renderer.render(this.scene, this.camera);
    this.lastRenderedProgress = this.currentProgress;

    // Notify decoupled React UI subscribers
    if (this.onFrameProgress) {
      this.onFrameProgress(this.currentProgress, this.scrollProgress);
    }
  };

  /**
   * Orchestrates the 8 continuous flight beats along p in [0, 1].
   * Pure deterministic function of p for 100% reversible scrubbing.
   * Zero GC: no object allocations in loop!
   */
  public renderCinematicSequence(p: number, _timeMs: number = 0): void {
    // ----------------------------------------------------
    // Dynamic Sky Atmosphere & Lighting Transition
    // ----------------------------------------------------
    // 0-35%: Dawn atmosphere (#1e3a8a) -> Space black (#030712)
    const atmoMix = ease(seg(p, 0.12, 0.35));
    this._skyColor.copy(this._dawnColor).lerp(this._spaceColor, atmoMix);
    this.scene.background = this._skyColor;

    // Stars: fade in as atmosphere fades (18% - 40%), stay visible in space
    const starsOpacity = seg(p, 0.18, 0.40) * (1 - seg(p, 0.88, 0.98) * 0.3);
    (this.atmosphere.starfield.material as THREE.PointsMaterial).opacity = starsOpacity;

    // Hard vacuum lighting transition (harsh contrast, near-zero ambient, pure solar key)
    if (p < 0.55) {
      const atmoTrans = seg(p, 0.12, 0.35);
      this.atmosphere.ambientLight.color.setHex(0xdde5f5);
      this.atmosphere.ambientLight.intensity = THREE.MathUtils.lerp(0.55, 0.18, atmoTrans);
      this.atmosphere.directionalSun.color.setHex(0xffffff);
      this.atmosphere.directionalSun.intensity = THREE.MathUtils.lerp(2.5, 3.5, atmoTrans);
      this.atmosphere.directionalSun.position.set(35, 45, 25);
      this.atmosphere.rimLight.intensity = (1 - seg(p, 0.20, 0.45)) * 0.8;
    } else {
      // Hard vacuum lunar phase: zero atmosphere, cool earthshine tint, intense solar beam
      const moonTrans = seg(p, 0.55, 0.65);
      this.atmosphere.ambientLight.color.setHex(0x1a2639);
      this.atmosphere.ambientLight.intensity = THREE.MathUtils.lerp(0.18, 0.04, moonTrans);
      this.atmosphere.directionalSun.color.setHex(0xfffdf8);
      this.atmosphere.directionalSun.intensity = THREE.MathUtils.lerp(3.5, 4.5, moonTrans);
      if (p < 0.86) {
        // Low grazing polar sunlight angle during descent
        this.atmosphere.directionalSun.position.set(28, 14, 32);
      }
      this.atmosphere.rimLight.intensity = 0.0;
    }

    // ----------------------------------------------------
    // UNIFIED CRAFT & STAGE KINEMATICS (Zero Allocations)
    // ----------------------------------------------------
    computeCraftState(p, this.craftDims, this._craftState);

    // Apply rig position & orientation
    this.rocket.craftRig.position.copy(this._craftState.craftRigPos);
    this.rocket.craftRig.rotation.copy(this._craftState.craftRigRot);

    this.rocket.craftRig.getWorldPosition(this._craftWorldPos);
    this.rocket.craftRig.getWorldQuaternion(this._craftWorldQuat);

    // Deterministic staging separations (booster, fairings, upper stage)
    this.rocket.updateSeparations(p, this._craftWorldPos, this._craftWorldQuat);

    // Animate launch pad (swing arm, clamps, vapor venting, ignition light)
    this.atmosphere.updatePad(p);

    // Launch ground pad & gantry tower recede below during ascent
    const padDrop = ease(seg(p, 0.08, 0.35)) * 50;
    this.atmosphere.launchGround.position.set(this._craftState.craftRigPos.x, -padDrop, 0);
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
    this.particles.updatePlume(isBoosterFiring, this._craftState.craftRigPos.x, this._craftState.craftRigPos.y - 1.2, this._craftState.craftRigPos.z);

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
    // ----------------------------------------------------
    this.atmosphere.approachMoon.visible = p >= 0.58 && p < 0.75;
    if (this.atmosphere.approachMoon.visible) {
      const moonGrow = seg(p, 0.58, 0.75);
      const moonScale = 0.4 + moonGrow * 1.8;
      this.atmosphere.approachMoon.scale.set(moonScale, moonScale, moonScale);
      this.atmosphere.approachMoon.position.set(0, 10, -140 + moonGrow * 85);
    }

    // Lander deployment state
    this.lander.setDeploy(this._craftState.deployProgress);
    this.lander.setEngineFacing(this._craftState.engineFacing);
    this.lander.setThrottle(this._craftState.throttle);
    this.lander.setLegCompression(this._craftState.legCompression);

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
      this.lander.group.scale.set(this._craftState.landerScale, this._craftState.landerScale, this._craftState.landerScale);
    } else if (p >= 0.55) {
      if (this.lander.group.parent !== this.scene) {
        this.scene.add(this.lander.group);
      }
      this.lander.group.position.copy(this._craftState.landerWorldPos);
      this.lander.group.rotation.copy(this._craftState.landerWorldRot);
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
    // CAMERA CHOREOGRAPHY (Zero Allocations)
    // ----------------------------------------------------
    const isPortrait = this.width < this.height;
    const aspect = this.width / (this.height || 1);
    this._domeOrbit.yaw = this.domeYaw;
    this._domeOrbit.pitch = this.domePitch;
    this._domeOrbit.zoom = this.domeZoom;

    computeCameraState(
      p,
      this.craftDims,
      46,
      aspect,
      isPortrait,
      this._domeOrbit,
      this._cameraState
    );

    this.camera.position.copy(this._cameraState.position);
    this.camera.lookAt(this._cameraState.lookAt);
  }

  private disposeMaterial(mat: THREE.Material): void {
    const m = mat as any;
    if (m.map) m.map.dispose();
    if (m.lightMap) m.lightMap.dispose();
    if (m.bumpMap) m.bumpMap.dispose();
    if (m.normalMap) m.normalMap.dispose();
    if (m.specularMap) m.specularMap.dispose();
    if (m.roughnessMap) m.roughnessMap.dispose();
    if (m.metalnessMap) m.metalnessMap.dispose();
    if (m.alphaMap) m.alphaMap.dispose();
    mat.dispose();
  }

  public destroy(): void {
    this.isDestroyed = true;

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    // Unbind window & canvas listeners
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    } else {
      window.removeEventListener('resize', this.onResize);
    }

    if (this.canvas) {
      this.canvas.removeEventListener('pointerdown', this.onPointerDown);
      this.canvas.removeEventListener('pointermove', this.onPointerMove);
      this.canvas.removeEventListener('pointerup', this.stopDrag);
      this.canvas.removeEventListener('pointercancel', this.stopDrag);
      this.canvas.removeEventListener('wheel', this.onWheel);
      this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
      this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
    }

    // Recursively dispose all GPU geometries, materials, and textures
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => this.disposeMaterial(m));
        } else {
          this.disposeMaterial(mesh.material);
        }
      }
    });

    this.renderer.dispose();
  }
}
