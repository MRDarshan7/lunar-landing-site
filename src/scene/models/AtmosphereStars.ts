import * as THREE from 'three';

export class AtmosphereStars {
  public group: THREE.Group;
  public launchGround: THREE.Group;
  public cloudLayers: THREE.Group;
  public distantEarth: THREE.Group;
  public approachMoon: THREE.Group;
  public starfield: THREE.Points;
  public directionalSun: THREE.DirectionalLight;
  public ambientLight: THREE.AmbientLight;
  public rimLight: THREE.DirectionalLight;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'AtmosphereStars';

    // 1. Lighting (Sunlight + Rim Light)
    this.ambientLight = new THREE.AmbientLight(0xdde5f5, 0.55);
    this.group.add(this.ambientLight);

    this.directionalSun = new THREE.DirectionalLight(0xffffff, 2.5);
    this.directionalSun.position.set(35, 45, 25);
    this.directionalSun.castShadow = true;
    this.directionalSun.shadow.mapSize.width = 2048;
    this.directionalSun.shadow.mapSize.height = 2048;
    this.directionalSun.shadow.camera.near = 0.5;
    this.directionalSun.shadow.camera.far = 300;
    this.directionalSun.shadow.camera.left = -30;
    this.directionalSun.shadow.camera.right = 30;
    this.directionalSun.shadow.camera.top = 30;
    this.directionalSun.shadow.camera.bottom = -30;
    this.directionalSun.shadow.bias = -0.0005;
    this.group.add(this.directionalSun);

    // Rim light for dramatic aerospace edge highlighting
    this.rimLight = new THREE.DirectionalLight(0x7dd3fc, 0.8);
    this.rimLight.position.set(-30, 20, -35);
    this.group.add(this.rimLight);

    // 2. Launch Pad & Earth Ground
    this.launchGround = new THREE.Group();
    const padFloorGeo = new THREE.CylinderGeometry(24, 26, 1.8, 48);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x1a1e26,
      roughness: 0.85,
      metalness: 0.25
    });
    const padFloor = new THREE.Mesh(padFloorGeo, padMat);
    padFloor.position.y = -0.9;
    padFloor.receiveShadow = true;
    this.launchGround.add(padFloor);

    // Launch Gantry Tower
    const towerGeo = new THREE.BoxGeometry(2.6, 26, 2.6);
    const towerMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.5,
      metalness: 0.7
    });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.set(-6.5, 13, -3);
    tower.castShadow = true;
    tower.receiveShadow = true;
    this.launchGround.add(tower);

    // Gantry Service Swing Arm
    const armGeo = new THREE.BoxGeometry(4.8, 1.0, 1.0);
    const arm = new THREE.Mesh(armGeo, towerMat);
    arm.position.set(-3.8, 20.5, -1.8);
    arm.castShadow = true;
    this.launchGround.add(arm);

    this.group.add(this.launchGround);

    // 3. Cloud Layers (Volumetric discs with parallax)
    this.cloudLayers = new THREE.Group();
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.22,
      roughness: 1.0,
      depthWrite: false
    });
    for (let i = 0; i < 18; i++) {
      const cr = 7 + Math.random() * 12;
      const cloudGeo = new THREE.SphereGeometry(cr, 12, 12);
      cloudGeo.scale(2.4, 0.18, 1.6);
      const cloud = new THREE.Mesh(cloudGeo, cloudMat);
      cloud.position.set(
        (Math.random() - 0.5) * 90,
        18 + Math.random() * 24,
        (Math.random() - 0.5) * 90
      );
      this.cloudLayers.add(cloud);
    }
    this.group.add(this.cloudLayers);

    // 4. Crisp Cosmic Starfield (Deep space background)
    const starCount = 5000;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 240 + Math.random() * 120;

      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      const shade = Math.random();
      if (shade > 0.8) {
        starColors[i * 3] = 0.82;
        starColors[i * 3 + 1] = 0.90;
        starColors[i * 3 + 2] = 1.0;
      } else if (shade > 0.6) {
        starColors[i * 3] = 1.0;
        starColors[i * 3 + 1] = 0.94;
        starColors[i * 3 + 2] = 0.80;
      } else {
        starColors[i * 3] = 1.0;
        starColors[i * 3 + 1] = 1.0;
        starColors[i * 3 + 2] = 1.0;
      }
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 0.32,
      vertexColors: true,
      transparent: true,
      opacity: 0.95
    });
    this.starfield = new THREE.Points(starGeo, starMat);
    this.group.add(this.starfield);

    // 5. Distant Shrinking Earth (Seen from ascent & translunar space)
    this.distantEarth = new THREE.Group();
    const dEarthGeo = new THREE.SphereGeometry(16, 36, 36);
    const dEarthMat = new THREE.MeshStandardMaterial({
      color: 0x1d5fb8,
      roughness: 0.45,
      metalness: 0.1
    });
    const dEarthMesh = new THREE.Mesh(dEarthGeo, dEarthMat);
    this.distantEarth.add(dEarthMesh);

    // Blue atmospheric scattering halo
    const dAtmoGeo = new THREE.SphereGeometry(16.5, 36, 36);
    const dAtmoMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.28,
      side: THREE.BackSide
    });
    this.distantEarth.add(new THREE.Mesh(dAtmoGeo, dAtmoMat));
    this.distantEarth.position.set(-30, -50, -20);
    this.distantEarth.visible = false;
    this.group.add(this.distantEarth);

    // 6. Approaching Lunar Sphere (Seen ahead in translunar flight, grows as lander approaches)
    this.approachMoon = new THREE.Group();
    const moonSphereGeo = new THREE.SphereGeometry(22, 48, 48);
    const moonSphereMat = new THREE.MeshStandardMaterial({
      color: 0x8a8f9c,
      roughness: 0.92,
      metalness: 0.08
    });
    const moonMesh = new THREE.Mesh(moonSphereGeo, moonSphereMat);
    this.approachMoon.add(moonMesh);

    // Prominent rayed impact crater on approach sphere
    const tychoGeo = new THREE.RingGeometry(0.8, 2.2, 16);
    const tychoMat = new THREE.MeshBasicMaterial({ color: 0xc8ccd6, side: THREE.DoubleSide });
    const tycho = new THREE.Mesh(tychoGeo, tychoMat);
    tycho.position.set(0, 4, 21.8);
    this.approachMoon.add(tycho);

    this.approachMoon.position.set(0, 15, -120);
    this.approachMoon.visible = false;
    this.group.add(this.approachMoon);
  }
}
