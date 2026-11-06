import Phaser from 'phaser';
import { assetEntry, assetKeys } from '@/assets/manifest';
import type { AssetEntry } from '@/assets/manifest';
import { gameStore } from '@/stores/gameStore';
import { uiStore } from '@/stores/uiStore';
import { levelBackgroundKey, MAX_TEXTURE_WIDTH, SPRITE_RASTER_SCALE } from '../constants';

/** UI icons, seed packets and item art are only ever shown by React as <img>. */
const WORLD_PREFIXES = ['plants/', 'pots/', 'decor/', 'equipment/', 'fx/', 'world/tank', 'world/hills', 'world/cloud', 'ui/water', 'ui/sparkle'];

/** Loads by file type, so final PNG art or a spritesheet can replace a generated SVG with no code changes. */
function loadAsset(scene: Phaser.Scene, key: string, entry: AssetEntry, svgScale: number): void {
  if (entry.path.endsWith('.svg')) {
    scene.load.svg(key, entry.path, { scale: svgScale });
  } else if (entry.frameWidth && entry.frameHeight) {
    scene.load.spritesheet(key, entry.path, { frameWidth: entry.frameWidth, frameHeight: entry.frameHeight });
  } else {
    scene.load.image(key, entry.path);
  }
}

export function loadBackground(scene: Phaser.Scene, level: number): void {
  const key = levelBackgroundKey(level);
  if (scene.textures.exists(key)) return;
  const entry = assetEntry(key);
  loadAsset(scene, key, entry, Math.min(SPRITE_RASTER_SCALE, MAX_TEXTURE_WIDTH / entry.width));
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload(): void {
    uiStore.setState({ worldProgress: 0, worldReady: false });
    this.load.on('progress', (v: number) => uiStore.setState({ worldProgress: v }));
    // A missing file must not hang the loading screen, so report it and carry on.
    this.load.on('loaderror', (file: Phaser.Loader.File) => console.warn('Greenhouse: could not load', file.key));

    for (const key of assetKeys()) {
      if (!WORLD_PREFIXES.some((p) => key.startsWith(p))) continue;
      loadAsset(this, key, assetEntry(key), SPRITE_RASTER_SCALE);
    }
    loadBackground(this, gameStore.getState().save?.greenhouseLevel ?? 1);
  }

  create(): void {
    this.scene.start('greenhouse');
  }
}
