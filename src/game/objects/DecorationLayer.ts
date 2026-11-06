import Phaser from 'phaser';
import { decorationById } from '@/data/catalog';
import { decorationRect } from '@/systems/decorations';
import { DEPTH, SPRITE_RASTER_SCALE } from '../constants';
import type { Placement } from '@/stores/uiStore';
import type { DecorationDef, PlacedDecoration } from '@/types/game';

const DOWN = 1 / SPRITE_RASTER_SCALE;

function originFor(def: DecorationDef): [number, number] {
  return def.zone === 'floor' ? [0.5, 1] : def.zone === 'wall' ? [0.5, 0.5] : [0.5, 0];
}

interface View {
  image: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image | null;
  signature: string;
}

/** Draws placed decorations and the placement ghost. It holds no rules: validity comes from the store. */
export class DecorationLayer {
  private views = new Map<string, View>();
  private ghost: Phaser.GameObjects.Image | null = null;
  private ghostFrame: Phaser.GameObjects.Graphics;
  private ghostDefId: string | null = null;
  private hiddenId: string | null = null;

  constructor(private scene: Phaser.Scene) {
    this.ghostFrame = scene.add.graphics().setDepth(DEPTH.ghost + 1);
  }

  sync(decorations: PlacedDecoration[]): void {
    const seen = new Set<string>();
    for (const d of decorations) {
      seen.add(d.id);
      const def = decorationById(d.defId);
      if (!def) continue;
      const signature = `${d.x},${d.y},${d.flipped}`;
      const existing = this.views.get(d.id);
      if (existing) {
        if (existing.signature !== signature) {
          existing.image.setPosition(d.x, d.y).setFlipX(d.flipped);
          existing.glow?.setPosition(d.x, this.glowY(def, d.y));
          existing.signature = signature;
        }
        continue;
      }
      const [ox, oy] = originFor(def);
      const image = this.scene.add
        .image(d.x, d.y, def.sprite)
        .setOrigin(ox, oy)
        .setScale(DOWN)
        .setFlipX(d.flipped)
        .setDepth(def.zone === 'floor' ? DEPTH.decorFront : DEPTH.decorBack);
      const glow = def.glow
        ? this.scene.add
            .image(d.x, this.glowY(def, d.y), 'fx/glow')
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(DEPTH.lights)
            .setDisplaySize(def.glow * 2, def.glow * 2)
            .setAlpha(0)
        : null;
      this.views.set(d.id, { image, glow, signature });
    }
    for (const [id, view] of this.views) {
      if (!seen.has(id)) {
        view.image.destroy();
        view.glow?.destroy();
        this.views.delete(id);
      }
    }
  }

  private glowY(def: DecorationDef, y: number): number {
    const r = decorationRect(def, 0, y);
    if (def.id === 'floor_lamp') return r.y + 30;
    return r.y + r.h * 0.6;
  }

  setNight(amount: number): void {
    for (const v of this.views.values()) v.glow?.setAlpha(amount * 0.85);
  }

  syncPlacement(p: Placement | null): void {
    if (this.hiddenId && this.hiddenId !== p?.decorationId) {
      this.views.get(this.hiddenId)?.image.setVisible(true);
      this.views.get(this.hiddenId)?.glow?.setVisible(true);
      this.hiddenId = null;
    }
    if (!p) {
      this.ghost?.destroy();
      this.ghost = null;
      this.ghostDefId = null;
      this.ghostFrame.clear();
      return;
    }
    const def = decorationById(p.defId);
    if (!def) return;
    if (p.decorationId && this.hiddenId !== p.decorationId) {
      const view = this.views.get(p.decorationId);
      view?.image.setVisible(false);
      view?.glow?.setVisible(false);
      this.hiddenId = p.decorationId;
    }
    if (this.ghostDefId !== p.defId) {
      this.ghost?.destroy();
      const [ox, oy] = originFor(def);
      this.ghost = this.scene.add.image(p.x, p.y, def.sprite).setOrigin(ox, oy).setScale(DOWN).setDepth(DEPTH.ghost).setAlpha(0.9);
      this.ghostDefId = p.defId;
    }
    this.ghost!.setPosition(p.x, p.y).setFlipX(p.flipped).setAlpha(p.valid ? 0.95 : 0.6);
    const rect = decorationRect(def, p.x, p.y);
    const color = p.valid ? 0x8fd16a : 0xe06a55;
    this.ghostFrame.clear();
    this.ghostFrame.fillStyle(color, 0.16);
    this.ghostFrame.fillRoundedRect(rect.x - 3, rect.y - 3, rect.w + 6, rect.h + 6, 8);
    this.ghostFrame.lineStyle(3, color, 0.95);
    this.ghostFrame.strokeRoundedRect(rect.x - 3, rect.y - 3, rect.w + 6, rect.h + 6, 8);
  }

  hitTest(x: number, y: number, decorations: PlacedDecoration[]): PlacedDecoration | null {
    // Topmost first: later placements draw on top.
    for (let i = decorations.length - 1; i >= 0; i--) {
      const d = decorations[i]!;
      const def = decorationById(d.defId);
      if (!def) continue;
      const r = decorationRect(def, d.x, d.y);
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return d;
    }
    return null;
  }

  ghostContains(x: number, y: number, p: Placement): boolean {
    const def = decorationById(p.defId);
    if (!def) return false;
    const r = decorationRect(def, p.x, p.y);
    const pad = 14;
    return x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad;
  }
}
