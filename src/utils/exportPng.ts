export function exportCanvasPng(canvas: HTMLCanvasElement, filename: string = 'lunar-landing-site-dome.png'): void {
  try {
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Failed to export PNG snapshot', err);
  }
}
