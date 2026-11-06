import Phaser from 'phaser';
import { assetEntry } from '@/assets/manifest';
import { CONFIG } from '@/data/config';
import { plantById } from '@/data/plants';
import { OLD_POT_VARIANTS } from '@/data/catalog';
import { ALL_SLOTS, WORLD } from '@/data/world';
import type { SlotDef } from '@/data/world';
import { isReady, stageForGrowth, stageIndexForGrowth } from '@/systems/growth';
import { DEPTH, POT_SOIL_OFFSET, SPRITE_RASTER_SCALE } from '../constants';
import type { PlantInstance, PotDef } from '@/types/game';

const DOWN = 1 / SPRITE_RASTER_SCALE;
const POT_SCALE = 0.9;
const MUTATION_TINT: Record<string, number> = { golden: 0xffdf8a, moonlit: 0xc9d6ff, variegated: 0xeef5c9 };
const WILT_TINT = 0xc9b27a;

/** One planting position: its pot, plant, and the small indicators around them. */
export class PlantSlotView {
  private pot: Phaser.GameObjects.Image;
  private plant: Phaser.GameObjects.Image | null = null;
  private selection: Phaser.GameObjects.Ellipse;
  private bar: Phaser.GameObjects.Graphics;
  private needsWater: Phaser.GameObjects.Image;
  private readySpark: Phaser.GameObjects.Image;
  private shimmer: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private sway: Phaser.Tweens.Tween | null = null;
  private plantId: string | null = null;
  private stage = -1;
  private potId: string | null = null;
  private lastTint: number | null = null;
  private lastBarKey = '';
  private reducedMotion = false;
  private baseDepth: number;

  constructor(private scene: Phaser.Scene, readonly def: SlotDef) {
    // Lower rows draw over upper rows, so tall plants overlap the shelf above them.
    this.baseDepth = DEPTH.plants + (def.y > 450 ? 1 : 0);
    const d = this.baseDepth;
    this.selection = scene.add.ellipse(def.x, def.y - 2, 124, 26, 0xfff2bd, 0.55).setDepth(d - 0.1).setVisible(false);
    this.pot = scene.add.image(def.x, def.y + 2, 'pots/old_clay_1').setOrigin(0.5, 1).setScale(DOWN * POT_SCALE).setDepth(d);
    this.bar = scene.add.graphics().setDepth(d + 0.3);
    this.needsWater = scene.add.image(def.x + 50, def.y - 100, 'ui/water').setScale(DOWN * 0.9).setDepth(d + 0.4).setVisible(false);
    this.readySpark = scene.add.image(def.x + 46, def.y - 114, 'ui/sparkle').setScale(DOWN * 1).setDepth(d + 0.4).setVisible(false);
    scene.tweens.add({ targets: this.needsWater, y: '-=7', duration: 780, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    scene.tweens.add({ targets: this.readySpark, y: '-=9', angle: 20, duration: 950, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  setReducedMotion(on: boolean): void {
    this.reducedMotion = on;
    if (on) {
      this.sway?.stop();
      this.sway = null;
      this.plant?.setAngle(0);
    } else if (this.plant && !this.sway) {
      this.startSway();
    }
  }

  setSelected(on: boolean): void {
    this.selection.setVisible(on);
  }

  setPot(pot: PotDef): void {
    if (this.potId === pot.id) return;
    this.potId = pot.id;
    // Starting pots take turns through their colours, so each spot keeps its own.
    const colour = (ALL_SLOTS.findIndex((s) => s.id === this.def.id) % OLD_POT_VARIANTS) + 1;
    this.pot.setTexture(pot.id === 'old_clay' ? `pots/old_clay_${colour}` : pot.sprite);
  }

  /** Reconciles with the save. Cheap when nothing visible changed. */
  sync(plant: PlantInstance | undefined): void {
    if (!plant) {
      if (this.plantId) this.clearPlant();
      return;
    }
    const def = plantById(plant.speciesId);
    if (!def) return;

    const stageIndex = stageIndexForGrowth(plant.growth);
    if (this.plantId !== plant.id) {
      this.clearPlant();
      this.plantId = plant.id;
      this.stage = stageIndex;
      this.createPlant(def.spriteKey, plant);
    } else if (stageIndex !== this.stage) {
      this.stage = stageIndex;
      this.plant!.setTexture(`${def.spriteKey}/${stageForGrowth(plant.growth)}`);
      this.popIn(true);
    }

    this.applyCondition(plant);
  }

  private createPlant(spriteKey: string, plant: PlantInstance): void {
    const key = `${spriteKey}/${stageForGrowth(plant.growth)}`;
    const entry = assetEntry(key);
    this.plant = this.scene.add
      .image(this.def.x, this.def.y - POT_SOIL_OFFSET * POT_SCALE, key)
      .setOrigin(entry.originX ?? 0.5, entry.originY ?? 1)
      .setScale(DOWN)
      // In front of the pot: stems rise from the soil, and low leaves spill over the rim.
      .setDepth(this.baseDepth + 0.2);
    this.popIn(false);
    if (!this.reducedMotion) this.startSway();
  }

  private startSway(): void {
    if (!this.plant) return;
    this.sway?.stop();
    this.sway = this.scene.tweens.add({
      targets: this.plant,
      angle: { from: -1.4, to: 1.4 },
      duration: Phaser.Math.Between(2100, 3200),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: Phaser.Math.Between(0, 800),
    });
  }

  private popIn(small: boolean): void {
    if (!this.plant || this.reducedMotion) return;
    const target = this.plant;
    target.setScale(DOWN * (small ? 0.86 : 0.4));
    this.scene.tweens.add({ targets: target, scaleX: DOWN, scaleY: DOWN, duration: 420, ease: 'Back.easeOut' });
  }

  private applyCondition(plant: PlantInstance): void {
    const ready = isReady(plant);
    const thirsty = !ready && plant.moisture < CONFIG.moisture.thirsty;
    this.needsWater.setVisible(thirsty);
    this.readySpark.setVisible(ready);

    let tint: number | null = null;
    if (plant.health < CONFIG.health.neglectedBelow) tint = WILT_TINT;
    else if (plant.mutation && this.stage >= 4) tint = MUTATION_TINT[plant.mutation] ?? null;
    if (tint !== this.lastTint) {
      this.lastTint = tint;
      if (tint === null) this.plant!.clearTint();
      else this.plant!.setTint(tint);
    }

    const wantShimmer = !!plant.mutation && this.stage >= 4;
    if (wantShimmer && !this.shimmer) {
      this.shimmer = this.scene.add
        .particles(this.def.x, this.def.y - 130, 'fx/spark', {
          x: { min: -48, max: 48 },
          y: { min: -48, max: 48 },
          lifespan: 1400,
          scale: { start: 0.18, end: 0 },
          alpha: { start: 0.9, end: 0 },
          blendMode: Phaser.BlendModes.ADD,
          frequency: 300,
        })
        .setDepth(this.baseDepth + 0.3);
    } else if (!wantShimmer && this.shimmer) {
      this.shimmer.destroy();
      this.shimmer = null;
    }

    this.drawBar(plant, ready);
  }

  private drawBar(plant: PlantInstance, ready: boolean): void {
    const key = ready ? 'ready' : `${Math.round(plant.growth * 50)}:${plant.moisture < CONFIG.moisture.thirsty}`;
    if (key === this.lastBarKey) return;
    this.lastBarKey = key;
    this.bar.clear();
    if (ready) return;
    const w = 96;
    const x = this.def.x - w / 2;
    const y = this.def.y + 7;
    this.bar.fillStyle(0x2a2118, 0.55);
    this.bar.fillRoundedRect(x - 2, y - 2, w + 4, 14, 6);
    this.bar.fillStyle(plant.moisture < CONFIG.moisture.thirsty ? 0xd9a441 : 0x8fc25e, 1);
    this.bar.fillRoundedRect(x, y, Math.max(10, w * plant.growth), 10, 5);
  }

  private clearPlant(): void {
    this.sway?.stop();
    this.sway = null;
    this.plant?.destroy();
    this.plant = null;
    this.plantId = null;
    this.stage = -1;
    this.lastTint = null;
    this.lastBarKey = '';
    this.bar.clear();
    this.needsWater.setVisible(false);
    this.readySpark.setVisible(false);
    this.shimmer?.destroy();
    this.shimmer = null;
  }

  containsPoint(x: number, y: number): boolean {
    return (
      x >= this.def.x - WORLD.slotHalfWidth &&
      x <= this.def.x + WORLD.slotHalfWidth &&
      y >= this.def.y - WORLD.slotHeight &&
      y <= this.def.y + 16
    );
  }

  nudge(): void {
    if (this.reducedMotion) return;
    this.scene.tweens.add({ targets: this.pot, x: this.def.x + 4, duration: 50, yoyo: true, repeat: 2 });
  }
}
