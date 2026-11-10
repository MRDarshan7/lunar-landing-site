import * as THREE from 'three';

/**
 * Procedural PBR Canvas Texture Generator
 * Creates aerospace panel seams, rivet lines, thermal insulation blankets,
 * and realistic livery without needing external image assets.
 */
export class RocketTextures {
  private static fuselageTexture: THREE.Texture | null = null;
  private static interstageTexture: THREE.Texture | null = null;
  private static nozzleTexture: THREE.Texture | null = null;

  public static getFuselageTexture(): THREE.Texture {
    if (this.fuselageTexture) return this.fuselageTexture;
    if (typeof document === 'undefined') {
      return new THREE.Texture();
    }

    const width = 1024;
    const height = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Base aerospace off-white / light composite
    ctx.fillStyle = '#f4f6fb';
    ctx.fillRect(0, 0, width, height);

    // Subtle vertical panel seams
    ctx.strokeStyle = '#d0d5e2';
    ctx.lineWidth = 2;
    const cols = 8;
    for (let c = 0; c < cols; c++) {
      const x = (c / cols) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Rivets along seams
      ctx.fillStyle = '#b8becd';
      for (let y = 16; y < height; y += 32) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Horizontal weld rings
    const rows = 12;
    for (let r = 0; r < rows; r++) {
      const y = (r / rows) * height;
      ctx.strokeStyle = '#c4cad8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // NASA Meatball inspired insignia band
    const bandY = height * 0.35;
    ctx.fillStyle = '#0b3d91'; // NASA blue
    ctx.fillRect(0, bandY, width, 40);

    ctx.fillStyle = '#d83933'; // NASA red chevron accent
    ctx.fillRect(0, bandY + 40, width, 10);

    // Subtle thermal tile noise
    ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
    for (let i = 0; i < 4000; i++) {
      const rx = Math.random() * width;
      const ry = Math.random() * height;
      ctx.fillRect(rx, ry, 2, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.fuselageTexture = texture;
    return texture;
  }

  public static getInterstageTexture(): THREE.Texture {
    if (this.interstageTexture) return this.interstageTexture;
    if (typeof document === 'undefined') {
      return new THREE.Texture();
    }

    const width = 512;
    const height = 512;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Dark structural titanium / carbon fiber
    ctx.fillStyle = '#181b22';
    ctx.fillRect(0, 0, width, height);

    // Corrugated structural fluting / ribs
    const ribs = 32;
    for (let i = 0; i < ribs; i++) {
      const x = (i / ribs) * width;
      const w = width / ribs;
      const grad = ctx.createLinearGradient(x, 0, x + w, 0);
      grad.addColorStop(0, '#2d333f');
      grad.addColorStop(0.5, '#12141a');
      grad.addColorStop(1, '#2d333f');
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, w, height);

      // Truss diagonal lines
      ctx.strokeStyle = '#3d4454';
      ctx.lineWidth = 2;
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
    if (typeof document === 'undefined') {
      return new THREE.Texture();
    }

    const width = 256;
    const height = 256;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Niobium alloy nozzle exterior to glowing emissive throat
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#ff9922'); // glowing throat
    grad.addColorStop(0.2, '#aa5511');
    grad.addColorStop(0.5, '#444852'); // heat stained bell
    grad.addColorStop(1, '#252830');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Stiffener rings
    ctx.strokeStyle = '#555b68';
    ctx.lineWidth = 3;
    for (let y = 30; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    this.nozzleTexture = texture;
    return texture;
  }
}
