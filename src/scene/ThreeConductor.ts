import * as THREE from 'three';
import { RocketModel } from './models/RocketModel';
import { LanderModel } from './models/LanderModel';
import { LunarSurface } from './models/LunarSurface';
import { AtmosphereStars } from './models/AtmosphereStars';
import { ParticleSystems } from './models/ParticleSystems';
import { SkyDomeScene } from './skydome/SkyDomeScene';
import { HorizonManager } from '../terrain/horizon';
import { EphemerisSample, CelestialBodyPos } from '../types';
import { getMissionTelemetry } from '../ephemeris/telemetryConductor';

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
    const clamp = (val: number, min = 0, max = 1) => Math.max(min, Math.min(max, val));
    const seg = (a: number, b: number) => clamp((p - a) / (b - a));
    const ease = (t: number) => t * t * (3 - 2 * t);

    // ----------------------------------------------------
    // Dynamic Sky Atmosphere & Lighting Transition
    // ----------------------------------------------------
    // 0-35%: Day/twilight atmosphere (#1e3a8a) -> Space black (#030712)
    const atmoMix = ease(seg(0.12, 0.35));
    const skyColor = new THREE.Color().lerpColors(
      new THREE.Color(0x1e3a8a),
      new THREE.Color(0x030712),
      atmoMix
    );
    this.scene.background = skyColor;

    // Stars: fade in as atmosphere fades (18% - 40%), stay visible in space
    const starsOpacity = seg(0.18, 0.40) * (1 - seg(0.88, 0.98) * 0.3);
    (this.atmosphere.starfield.material as THREE.PointsMaterial).opacity = starsOpacity;

    // ----------------------------------------------------
    // CRAFT KINEMATICS & WORLD POSITION
    // ----------------------------------------------------
    let craftX = 0;
    let craftY = 0;
    let craftZ = 0;

    // Pad offset: On landing page (p < 0.12), offset craft to right (x = 3.5) to balance hero title
    const padOffsetX = 3.5 * (1 - ease(seg(0.08, 0.22)));

    if (p < 0.55) {
      // Ascent phase: vertical climb Y: 0 -> 45
      const climb = ease(seg(0.08, 0.52));
      craftX = padOffsetX;
      craftY = climb * 45.0;
      craftZ = 0;
      this.rocket.craftRig.position.set(craftX, craftY, craftZ);
      this.rocket.craftRig.rotation.set(0, 0, 0);
    } else if (p < 0.62) {
      // Translunar cruise coast: smooth continuous transition from ascent to lunar insertion
      const coastT = ease(seg(0.55, 0.62));
      craftX = 0;
      craftY = THREE.MathUtils.lerp(70.9, 32.0, coastT);
      craftZ = THREE.MathUtils.lerp(0.0, 12.0, coastT);
      this.rocket.craftRig.position.set(craftX, craftY, craftZ);
      this.rocket.craftRig.rotation.set(0, 0, 0);
    } else {
      // Lunar descent: craft transitions to lunar coordinate frame
      // Lunar landing touchdown happens at (0, 0.85, 0) in world space!
      const descentT = ease(seg(0.62, 0.84));
      craftX = 0;
      // Drops from orbital altitude 32.0 down to touchdown 0.85
      craftY = THREE.MathUtils.lerp(32.0, 0.85, descentT);
      craftZ = (1 - descentT) * 12.0; // approaching along Z
      this.rocket.craftRig.position.set(craftX, craftY, craftZ);
    }

    const craftWorldPos = new THREE.Vector3();
    this.rocket.craftRig.getWorldPosition(craftWorldPos);
    const craftWorldQuat = new THREE.Quaternion();
    this.rocket.craftRig.getWorldQuaternion(craftWorldQuat);

    // Update deterministic separations (booster, fairings, lander release)
    this.rocket.updateSeparations(p, craftWorldPos, craftWorldQuat);

    // ----------------------------------------------------
    // BEAT 1 & 2: LIFTOFF & ASCENT (0.08 - 0.35)
    // ----------------------------------------------------
    const boosterThrust = seg(0.08, 0.14) * (1 - seg(0.33, 0.35));
    this.rocket.setBoosterThrust(boosterThrust);

    // Liftoff engine plume particles
    const isBoosterFiring = p > 0.08 && p < 0.35;
    this.particles.updatePlume(isBoosterFiring, craftX, craftY - 1.2, craftZ);

    // Launch ground pad & gantry tower recede below
    const padDrop = ease(seg(0.08, 0.35)) * 50;
    this.atmosphere.launchGround.position.set(padOffsetX, -padDrop, 0);
    this.atmosphere.launchGround.visible = p < 0.38;

    // Clouds thin and drop with parallax
    const cloudDrop = ease(seg(0.12, 0.35)) * 40;
    this.atmosphere.cloudLayers.position.y = -cloudDrop;
    this.atmosphere.cloudLayers.visible = p < 0.38;

    // ----------------------------------------------------
    // BEAT 3: BOOSTER MECO & VACUUM IGNITION (0.35 - 0.45)
    // ----------------------------------------------------
    const upperThrust = seg(0.35, 0.39) * (1 - seg(0.53, 0.55));
    this.rocket.setUpperThrust(upperThrust);

    // Distant Earth below (35% to 65%)
    this.atmosphere.distantEarth.visible = p > 0.28 && p < 0.65;
    const earthScale = Math.max(0.2, 1.0 - seg(0.28, 0.65) * 0.75);
    this.atmosphere.distantEarth.scale.set(earthScale, earthScale, earthScale);

    // ----------------------------------------------------
    // BEAT 4 & 5: FAIRING JETTISON, MOON GROWS & LANDER DEPLOY (0.45 - 0.62)
    // ----------------------------------------------------
    // Moon sphere ahead grows as lander approaches
    this.atmosphere.approachMoon.visible = p > 0.46 && p < 0.72;
    const moonGrow = seg(0.46, 0.72);
    const moonScale = 0.4 + moonGrow * 1.8;
    this.atmosphere.approachMoon.scale.set(moonScale, moonScale, moonScale);
    this.atmosphere.approachMoon.position.set(0, 10, -140 + moonGrow * 85);

    // Lander deployment state across sub-ranges
    if (p < 0.55) {
      // Stowed inside fairing
      this.lander.setDeploy(0);
      this.lander.setEngineFacing(0);
      this.lander.setThrottle(0);
      this.lander.setLegCompression(0);
    } else {
      // Released into space: unfolds solar panels, antenna dish, and landing gear
      const deployT = seg(0.55, 0.65);
      this.lander.setDeploy(deployT);
    }

    // ----------------------------------------------------
    // BEAT 6: APPROACH & POWERED DESCENT (0.62 - 0.80)
    // ----------------------------------------------------
    const isDescentPhase = p >= 0.62 && p <= 0.86;
    if (isDescentPhase) {
      // Retro-flip orientation: engine faces toward direction of travel
      const flipT = seg(0.62, 0.72) * (1 - seg(0.79, 0.84));
      this.lander.setEngineFacing(flipT);

      // Descent throttle: deceleration burn
      const descentThrottle = seg(0.63, 0.70) * (1 - seg(0.82, 0.85));
      this.lander.setThrottle(descentThrottle);
    }

    // Lunar Surface terrain rises UP to meet the craft
    // The surface rises toward y = 0 as p approaches 0.80
    this.surface.group.visible = p > 0.60;
    const surfaceRise = ease(seg(0.60, 0.78));
    this.surface.landingTerrain.position.y = (surfaceRise - 1.0) * 16.0;

    // ----------------------------------------------------
    // BEAT 7: TOUCHDOWN & DUST (0.80 - 0.86)
    // ----------------------------------------------------
    const isTouchdown = p >= 0.80 && p <= 0.86;
    // Ballistic dust billowing horizontally
    this.particles.updateDust(isTouchdown && p < 0.85, 0, 0.1, 0);

    // Leg shock absorber compression on touchdown
    if (p >= 0.82) {
      const legComp = ease(seg(0.82, 0.86));
      this.lander.setLegCompression(legComp);
    } else {
      this.lander.setLegCompression(0);
    }

    if (p >= 0.85) {
      // Touchdown complete: engine off, lander upright at touchdown coordinates
      this.lander.setThrottle(0);
      this.lander.setEngineFacing(0);
      this.lander.setDeploy(1.0);
    }

    // ----------------------------------------------------
    // BEAT 8: SKY-DOME DASHBOARD MORPH (0.86 - 1.00)
    // ----------------------------------------------------
    const domeMorph = ease(seg(0.86, 0.98));
    this.surface.setMorphProgress(domeMorph);
    this.skyDome.group.visible = domeMorph > 0.05;
    this.skyDome.domeWireframeGroup.scale.set(domeMorph, domeMorph, domeMorph);

    // Reparent lander to Sky-Dome root at final beat so lander is exactly centered
    if (p >= 0.86) {
      if (this.lander.group.parent !== this.skyDome.group) {
        this.skyDome.group.add(this.lander.group);
      }
      this.lander.group.position.set(0, 0.85, 0);
      this.lander.group.rotation.set(0, 0, 0);
      const s = THREE.MathUtils.lerp(1.0, 0.65, domeMorph);
      this.lander.group.scale.set(s, s, s);
    } else if (p >= 0.55) {
      if (this.lander.group.parent !== this.scene) {
        this.scene.add(this.lander.group);
      }
      this.lander.group.position.set(craftX, craftY, craftZ);
      this.lander.group.rotation.set(0, 0, 0);
      this.lander.group.scale.set(1.0, 1.0, 1.0);
    } else {
      if (this.lander.group.parent !== this.rocket.payloadAdapter) {
        this.rocket.payloadAdapter.add(this.lander.group);
        this.lander.group.position.set(0, this.rocket.adapterHeight + 0.3, 0);
        this.lander.group.rotation.set(0, 0, 0);
        this.lander.group.scale.set(1.0, 1.0, 1.0);
      }
    }

    // ----------------------------------------------------
    // CAMERA RIG CHOREOGRAPHY
    // "The camera must never tilt down to follow the lander to the Moon.
    // It follows the craft's forward motion, and the Moon rises up into frame."
    // ----------------------------------------------------
    if (p < 0.35) {
      // Liftoff & Ascent camera: framed wider so rocket and pad are visible
      const camY = craftY * 0.85 + 4.5;
      const camZ = 24 - (p / 0.35) * 8.0; // drops linearly from 24 to 16
      // Camera shake at liftoff
      const shake = boosterThrust > 0.3 ? (Math.random() - 0.5) * 0.12 * boosterThrust : 0;
      this.camera.position.set(craftX * 0.5 + shake, camY, camZ);
      this.camera.lookAt(craftX * 0.5, craftY + 3.0, 0);
    } else if (p < 0.84) {
      // Translunar cruise & Powered descent camera:
      // Camera stays HORIZONTAL / forward-facing at z = 16.0 + craftZ. The surface rises from below!
      const camBlend = ease(seg(0.35, 0.40));
      const camY = THREE.MathUtils.lerp(craftY * 0.85 + 4.5, craftY + 3.0, camBlend);
      const camZ = 16.0 + craftZ;
      this.camera.position.set(0, camY, camZ);
      // LookAt target is strictly horizontal / forward: craftY + 1.2
      // Camera pitch stays in safe range [-0.05, 0.22] radians (no downward pan!)
      this.camera.lookAt(0, craftY + 1.2, craftZ);
    } else {
      // Sky-Dome interactive view:
      this.isDomeInteractive = true;
      // Smooth interpolation from touchdown perspective (dist 12) to wide dome view (domeZoom ~ 32)
      const targetZoom = THREE.MathUtils.lerp(12, this.domeZoom, domeMorph);
      const targetPitch = THREE.MathUtils.lerp(0.18, this.domePitch, domeMorph);
      const targetYaw = THREE.MathUtils.lerp(0, this.domeYaw, domeMorph);

      const cx = targetZoom * Math.cos(targetPitch) * Math.sin(targetYaw);
      const cy = Math.max(1.8, targetZoom * Math.sin(targetPitch));
      const cz = targetZoom * Math.cos(targetPitch) * Math.cos(targetYaw);

      this.camera.position.set(cx, cy, cz);
      // Centered permanently on the lander at (0, 0.85, 0)
      this.camera.lookAt(0, 0.85, 0);
    }
  }

  public destroy(): void {
    this.isDestroyed = true;
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
