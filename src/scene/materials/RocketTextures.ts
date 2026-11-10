import * as THREE from 'three';

/**
 * Procedural PBR Canvas Texture & Material Generator
 * Synthesizes aerospace panel seams, rivet lines, thermal insulation blankets (Kapton MLI),
 * solar cell grids, regolith micro-texture, and titanium weave without external image assets.
 * 
 * Safely guards against Node.js SSR/headless test environments (typeof document === 'undefined').
 */
export class RocketTextures {
  private static fuselageTexture: THREE.Texture | null = null;
  private static interstageTexture: THREE.Texture | null = null;
  private static nozzleTexture: THREE.Texture | null = null;
  private static kaptonNormalMap: THREE.Texture | null = null;
  private static solarCellTexture: THREE.Texture | null = null;
  private static carbonWeaveTexture: THREE.Texture | null = null;
  private static regolithBumpMap: THREE.Texture | null = null;

  public static getFuselageTexture(): THREE.Texture {
    if (this.fuselageTexture) return this.fuselageTexture;
    if (typeof document === 'undefined') return new THREE.Texture();

    const width = 1024;
    const height = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Base aerospace off-white / light composite with subtle grain
    ctx.fillStyle = '#f4f6fb';
    ctx.fillRect(0, 0, width, height);

    // Subtle vertical panel seams
    ctx.strokeStyle = '#c8cedd';
    ctx.lineWidth = 2;
    const cols = 8;
    for (let c = 0; c < cols; c++) {
      const x = (c / cols) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Precision flush rivets along seams
      ctx.fillStyle = '#9da5ba';
      for (let y = 12; y < height; y += 24) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Horizontal stringers & weld rings
    const rows = 12;
    for (let r = 0; r < rows; r++) {
      const y = (r / rows) * height;
      ctx.strokeStyle = '#b8c0d2';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // NASA Meatball inspired insignia band
    const bandY = height * 0.35;
    ctx.fillStyle = '#0b3d91'; // NASA blue
    ctx.fillRect(0, bandY, width, 44);

    ctx.fillStyle = '#d83933'; // NASA red chevron accent
    ctx.fillRect(0, bandY + 44, width, 12);

    // Precision flight marking decals & black roll patterns
    ctx.fillStyle = '#111827';
    ctx.fillRect(width * 0.25, height * 0.1, 40, 180);
    ctx.fillRect(width * 0.75, height * 0.1, 40, 180);
    ctx.fillRect(width * 0.25, height * 0.6, 40, 160);
    ctx.fillRect(width * 0.75, height * 0.6, 40, 160);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.fuselageTexture = texture;
    return texture;
  }

  public static getInterstageTexture(): THREE.Texture {
    if (this.interstageTexture) return this.interstageTexture;
    if (typeof document === 'undefined') return new THREE.Texture();

    const width = 512;
    const height = 512;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Dark structural titanium / carbon fiber
    ctx.fillStyle = '#14171d';
    ctx.fillRect(0, 0, width, height);

    // Corrugated structural fluting / ribs
    const ribs = 32;
    for (let i = 0; i < ribs; i++) {
      const x = (i / ribs) * width;
      const w = width / ribs;
      const grad = ctx.createLinearGradient(x, 0, x + w, 0);
      grad.addColorStop(0, '#2d333f');
      grad.addColorStop(0.5, '#0f1116');
      grad.addColorStop(1, '#2d333f');
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, w, height);

      // Truss diagonal lines
      ctx.strokeStyle = '#3d4454';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + w, height);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.interstageTexture = texture;
    return texture;
  }

  public static getNozzleTexture(): THREE.Texture {
    if (this.nozzleTexture) return this.nozzleTexture;
    if (typeof document === 'undefined') return new THREE.Texture();

    const width = 256;
    const height = 256;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Heat-tempered niobium alloy nozzle exterior to glowing emissive throat
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#ff9922'); // glowing throat
    grad.addColorStop(0.18, '#aa5511');
    grad.addColorStop(0.42, '#3e424d'); // heat-stained bell
    grad.addColorStop(1, '#202228');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Regenerative cooling channel stiffener rings
    ctx.strokeStyle = '#555b68';
    ctx.lineWidth = 2.5;
    for (let y = 20; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Vertical cooling channels
    ctx.strokeStyle = 'rgba(255, 180, 50, 0.15)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 8) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    this.nozzleTexture = texture;
    return texture;
  }

  /**
   * High-frequency crinkle normal map for Kapton Gold MLI thermal blankets
   * Generates micro-faceted tangent-space normals centered at RGB(128, 128, 255)
   */
  public static getKaptonNormalMap(): THREE.Texture {
    if (this.kaptonNormalMap) return this.kaptonNormalMap;
    if (typeof document === 'undefined') return new THREE.Texture();

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    let seed = 1337;
    const rnd = () => {
      seed = (seed * 16807 + 12345) % 2147483647;
      return seed / 2147483647;
    };

    // Heightfield grid
    const hField: number[][] = [];
    for (let y = 0; y < size; y++) {
      hField[y] = new Array(size);
      for (let x = 0; x < size; x++) {
        // Multi-frequency crinkle
        const f1 = Math.sin(x * 0.12) * Math.cos(y * 0.14);
        const f2 = Math.sin(x * 0.28 + y * 0.2) * Math.sin(y * 0.35);
        const f3 = Math.sin(x * 0.65 - y * 0.45) * 0.5;
        const noise = (rnd() - 0.5) * 0.4;
        hField[y][x] = (f1 + f2 + f3 + noise);
      }
    }

    // Compute gradient for tangent-space normals
    for (let y = 0; y < size; y++) {
      const yPrev = (y - 1 + size) % size;
      const yNext = (y + 1) % size;
      for (let x = 0; x < size; x++) {
        const xPrev = (x - 1 + size) % size;
        const xNext = (x + 1) % size;

        const dx = (hField[y][xNext] - hField[y][xPrev]) * 1.8;
        const dy = (hField[yNext][x] - hField[yPrev][x]) * 1.8;

        const len = Math.sqrt(dx * dx + dy * dy + 1.0);
        const nx = -dx / len;
        const ny = -dy / len;
        const nz = 1.0 / len;

        const idx = (y * size + x) * 4;
        data[idx] = Math.floor((nx * 0.5 + 0.5) * 255);     // R: X-tilt
        data[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255); // G: Y-tilt
        data[idx + 2] = Math.floor((nz * 0.5 + 0.5) * 255); // B: Z-up
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    this.kaptonNormalMap = texture;
    return texture;
  }

  /**
   * Photovoltaic solar cell grid texture with dark blue-black silicon and silver busbars
   */
  public static getSolarCellTexture(): THREE.Texture {
    if (this.solarCellTexture) return this.solarCellTexture;
    if (typeof document === 'undefined') return new THREE.Texture();

    const width = 512;
    const height = 512;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Anti-reflective dark blue/black monocrystalline silicon
    ctx.fillStyle = '#0a162b';
    ctx.fillRect(0, 0, width, height);

    // Cell borders (8x4 cell layout)
    const cellsX = 8;
    const cellsY = 4;
    const cellW = width / cellsX;
    const cellH = height / cellsY;

    for (let cx = 0; cx < cellsX; cx++) {
      for (let cy = 0; cy < cellsY; cy++) {
        const x = cx * cellW;
        const y = cy * cellH;

        const grad = ctx.createLinearGradient(x, y, x + cellW, y + cellH);
        grad.addColorStop(0, '#0c1b33');
        grad.addColorStop(0.5, '#071224');
        grad.addColorStop(1, '#0e203d');
        ctx.fillStyle = grad;
        ctx.fillRect(x + 2, y + 2, cellW - 4, cellH - 4);

        // Thin silver collector fingers
        ctx.strokeStyle = 'rgba(180, 205, 235, 0.28)';
        ctx.lineWidth = 1;
        for (let fx = x + 6; fx < x + cellW - 4; fx += 8) {
          ctx.beginPath();
          ctx.moveTo(fx, y + 2);
          ctx.lineTo(fx, y + cellH - 2);
          ctx.stroke();
        }

        // Main primary silver busbars
        ctx.strokeStyle = '#d4e0f0';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x + 2, y + cellH * 0.33);
        ctx.lineTo(x + cellW - 2, y + cellH * 0.33);
        ctx.moveTo(x + 2, y + cellH * 0.67);
        ctx.lineTo(x + cellW - 2, y + cellH * 0.67);
        ctx.stroke();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.solarCellTexture = texture;
    return texture;
  }

  /**
   * Micro-roughness regolith dust bump map for authentic non-plastic lunar scattering
   */
  public static getRegolithBumpMap(): THREE.Texture {
    if (this.regolithBumpMap) return this.regolithBumpMap;
    if (typeof document === 'undefined') return new THREE.Texture();

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Mid-gray baseline
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);

    // High-frequency regolith micro-craters and grain
    for (let i = 0; i < 6000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 0.5 + Math.random() * 2.5;
      const lum = Math.random() > 0.5 ? 255 : 0;
      ctx.fillStyle = `rgba(${lum}, ${lum}, ${lum}, 0.2)`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);
    this.regolithBumpMap = texture;
    return texture;
  }
}

/**
 * Creates authentic Kapton Gold MLI (Multi-Layer Insulation) thermal foil material
 * Used across the Apollo LM, Artemis HLS, and Intuitive Machines lunar landers.
 */
export function createKaptonFoilMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xd49b27,
    metalness: 0.92,
    roughness: 0.22,
    normalMap: RocketTextures.getKaptonNormalMap(),
    normalScale: new THREE.Vector2(0.85, 0.85),
    side: THREE.DoubleSide
  });
}

/**
 * Creates aerospace-grade brushed cryo-aluminum material
 */
export function createBrushedAluminumMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xd6dbe6,
    metalness: 0.85,
    roughness: 0.32
  });
}

/**
 * Creates dark sintered silicon-carbide material for reaction control thrusters
 */
export function createRcsThrusterMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x1f232b,
    metalness: 0.72,
    roughness: 0.48
  });
}

/**
 * Creates photovoltaic silicon cell material with realistic cyan/blue specular reflection
 */
export function createSolarCellMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x081325,
    map: RocketTextures.getSolarCellTexture(),
    metalness: 0.94,
    roughness: 0.14,
    side: THREE.DoubleSide
  });
}

/**
 * Creates Hapke / Lommel-Seeliger regolith material
 * High roughness (0.95), zero metalness, dark volcanic albedo, micro-grain bump mapping
 */
export function createLunarRegolithMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x5a5d64,
    roughness: 0.95,
    metalness: 0.02,
    bumpMap: RocketTextures.getRegolithBumpMap(),
    bumpScale: 0.08,
    flatShading: false
  });
}
