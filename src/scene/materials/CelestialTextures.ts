import * as THREE from 'three';

/**
 * Procedural PBR Texture Generator for Earth and Moon
 * Generates high-fidelity planetary albedo maps via HTML5 Canvas.
 */
export class CelestialTextures {
  private static earthTexture: THREE.Texture | null = null;
  private static moonTexture: THREE.Texture | null = null;

  public static getEarthTexture(): THREE.Texture {
    if (this.earthTexture) return this.earthTexture;
    if (typeof document === 'undefined') return new THREE.Texture();

    const w = 1024;
    const h = 512;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    // 1. Deep Ocean Blue Background
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, h);
    oceanGrad.addColorStop(0, '#0a2342'); // Arctic ocean
    oceanGrad.addColorStop(0.3, '#0b396e');
    oceanGrad.addColorStop(0.5, '#0e4a8c'); // Tropical ocean
    oceanGrad.addColorStop(0.7, '#0b396e');
    oceanGrad.addColorStop(1, '#081c36'); // Southern ocean
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Continental Landmasses (Stylized continental plates)
    ctx.fillStyle = '#22543d'; // Rich forest green / terrain

    // Americas
    ctx.beginPath();
    // North America
    ctx.ellipse(w * 0.22, h * 0.32, w * 0.11, h * 0.16, -0.2, 0, Math.PI * 2);
    ctx.fill();
    // South America
    ctx.beginPath();
    ctx.ellipse(w * 0.30, h * 0.65, w * 0.07, h * 0.18, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Eurasia & Africa
    ctx.fillStyle = '#2d6a4f';
    ctx.beginPath();
    // Europe & Asia
    ctx.ellipse(w * 0.68, h * 0.30, w * 0.20, h * 0.16, 0.1, 0, Math.PI * 2);
    ctx.fill();
    // Africa (warm savanna tint)
    ctx.fillStyle = '#744210';
    ctx.beginPath();
    ctx.ellipse(w * 0.55, h * 0.55, w * 0.09, h * 0.18, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Australia
    ctx.fillStyle = '#975a16';
    ctx.beginPath();
    ctx.ellipse(w * 0.82, h * 0.72, w * 0.05, h * 0.08, -0.1, 0, Math.PI * 2);
    ctx.fill();

    // 3. Polar Ice Caps
    ctx.fillStyle = '#e2e8f0';
    // North pole ice
    ctx.beginPath();
    ctx.ellipse(w * 0.5, 0, w * 0.45, h * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    // Antarctica
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h, w * 0.48, h * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. Swirled Atmospheric Cloud Systems
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    for (let c = 0; c < 24; c++) {
      const cx = (c / 24) * w + (Math.sin(c) * 40);
      const cy = h * 0.25 + Math.cos(c * 1.5) * (h * 0.35);
      ctx.beginPath();
      ctx.ellipse(cx % w, cy, w * 0.06, h * 0.025, Math.sin(c) * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Equatorial intertropical convergence cloud band
    ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.fillRect(0, h * 0.48, w, h * 0.035);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    this.earthTexture = texture;
    return texture;
  }

  public static getMoonTexture(): THREE.Texture {
    if (this.moonTexture) return this.moonTexture;
    if (typeof document === 'undefined') return new THREE.Texture();

    const w = 1024;
    const h = 512;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    // 1. Highland Anorthosite Base Crust (Warm gray/silver)
    ctx.fillStyle = '#8e94a0';
    ctx.fillRect(0, 0, w, h);

    // Subtle regolith noise
    for (let i = 0; i < 8000; i++) {
      const rx = Math.random() * w;
      const ry = Math.random() * h;
      const shade = Math.random() > 0.5 ? 255 : 0;
      ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, 0.04)`;
      ctx.fillRect(rx, ry, 2, 2);
    }

    // 2. Basaltic Lunar Maria (Dark plains)
    ctx.fillStyle = '#4a4f59';
    // Oceanus Procellarum / Mare Imbrium
    ctx.beginPath();
    ctx.ellipse(w * 0.35, h * 0.38, w * 0.16, h * 0.20, -0.2, 0, Math.PI * 2);
    ctx.fill();
    // Mare Serenitatis & Tranquillitatis
    ctx.beginPath();
    ctx.ellipse(w * 0.52, h * 0.42, w * 0.11, h * 0.14, 0.1, 0, Math.PI * 2);
    ctx.fill();
    // Mare Crisium
    ctx.beginPath();
    ctx.ellipse(w * 0.68, h * 0.40, w * 0.05, h * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    // Mare Fecunditatis & Nectaris
    ctx.beginPath();
    ctx.ellipse(w * 0.58, h * 0.60, w * 0.08, h * 0.10, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // 3. Impact Crater Rays (Tycho / Copernicus ejecta blankets)
    ctx.strokeStyle = 'rgba(235, 240, 250, 0.35)';
    ctx.lineWidth = 1.5;
    const tychoX = w * 0.44;
    const tychoY = h * 0.76;
    for (let r = 0; r < 20; r++) {
      const angle = (r / 20) * Math.PI * 2;
      const len = 60 + Math.random() * 120;
      ctx.beginPath();
      ctx.moveTo(tychoX, tychoY);
      ctx.lineTo(tychoX + Math.cos(angle) * len, tychoY + Math.sin(angle) * len);
      ctx.stroke();
    }

    // Tycho crater bright central peak
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.arc(tychoX, tychoY, 6, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    this.moonTexture = texture;
    return texture;
  }
}
