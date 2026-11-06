import Phaser from 'phaser';
import { WORLD } from '@/data/world';

/** The narrowest stretch of world a phone should show, so three pots fit across. */
const MIN_VIEW_WIDTH = 520;

/** World height that must stay above the toolbar: the roof down to the lower row of pots. */
const LOWEST_POTS_Y = 600;

/** Screen pixels the toolbar takes up; it wraps onto more rows as the window narrows. */
function toolbarHeight(screenWidth: number): number {
  if (screenWidth <= 620) return 256;
  if (screenWidth <= 1160) return 190;
  return 100;
}

/**
 * Keeps the side-view framing right at any window shape: landscape fits the
 * full height, portrait fits a comfortable width and lets you pan along.
 */
export class CameraController {
  private worldW = 1280;
  private targetMidX = 640;

  constructor(private camera: Phaser.Cameras.Scene2D.Camera) {}

  setWorldWidth(width: number): void {
    this.worldW = width;
    this.layout();
  }

  layout(): void {
    const c = this.camera;
    const fitHeight = c.height / WORLD.height;
    const fitPhone = c.width / MIN_VIEW_WIDTH;
    const fitAboveToolbar = (c.height - toolbarHeight(c.width)) / LOWEST_POTS_Y;
    let zoom = Math.min(fitHeight, fitPhone, fitAboveToolbar);
    // A very wide window: zoom in so no empty space shows beside the building.
    zoom = Math.max(zoom, c.width / this.worldW);
    c.setZoom(zoom);
    this.clamp();
  }

  get viewWidth(): number {
    return this.camera.width / this.camera.zoom;
  }

  get midX(): number {
    return this.camera.scrollX + this.camera.width / 2;
  }

  private clamp(): void {
    const c = this.camera;
    const half = this.viewWidth / 2;
    const lo = half;
    const hi = this.worldW - half;
    this.targetMidX = hi <= lo ? this.worldW / 2 : Phaser.Math.Clamp(this.targetMidX, lo, hi);

    // Extra height (portrait) goes to the sky, keeping the pots just above the toolbar.
    const viewH = c.height / c.zoom;
    const viewBottom = LOWEST_POTS_Y + toolbarHeight(c.width) / c.zoom;
    const midY = viewH > WORLD.height ? viewBottom - viewH / 2 : WORLD.height / 2;
    c.scrollY = midY - c.height / 2;
    c.scrollX = this.targetMidX - c.width / 2;
  }

  panBy(worldDx: number): void {
    this.targetMidX += worldDx;
    this.clamp();
  }

  focus(x: number): void {
    this.targetMidX = x;
    this.clamp();
  }

  /** Slides to a world position over time, for moments like a new wing opening. */
  glideTo(scene: Phaser.Scene, x: number, duration = 1100): void {
    const proxy = { x: this.midX };
    scene.tweens.add({
      targets: proxy,
      x,
      duration,
      ease: 'Sine.easeInOut',
      onUpdate: () => this.focus(proxy.x),
    });
  }

  worldPoint(pointer: Phaser.Input.Pointer): { x: number; y: number } {
    const p = this.camera.getWorldPoint(pointer.x, pointer.y);
    return { x: p.x, y: p.y };
  }
}
