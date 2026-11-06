import Phaser from 'phaser';
import { equipmentById } from '@/data/catalog';
import { worldWidth } from '@/data/world';
import { DEPTH, SPRITE_RASTER_SCALE } from '../constants';
import { randomZone } from '../world/zones';
import type { GreenhouseLevel, SaveData } from '@/types/game';

const DOWN = 1 / SPRITE_RASTER_SCALE;

/** Where each piece of installed equipment visibly lives. Scene-only: no rule depends on it. */
const PLACEMENT = {
  heater: { x: 828, y: 652 },
  rain_barrel: { x: 1240, y: 652 },
  hose: { x: 1120, y: 652 },
  fan: { x: 640, y: 98 },
} as const;

interface Rig {
  objects: Phaser.GameObjects.GameObject[];
  lights: Phaser.GameObjects.Image[];
  mist?: Phaser.GameObjects.Particles.ParticleEmitter;
  spin?: Phaser.GameObjects.Image;
  flicker?: Phaser.GameObjects.Image;
  active: boolean;
}

export class EquipmentLayer {
  private rigs = new Map<string, Rig>();
  private level: GreenhouseLevel | null = null;
  private reducedMotion = false;

  constructor(private scene: Phaser.Scene) {}

  setReducedMotion(on: boolean): void {
    this.reducedMotion = on;
  }

  sync(save: SaveData): void {
    // Tiled kit follows the roof, so it is rebuilt when the building grows.
    if (this.level !== save.greenhouseLevel) {
      this.level = save.greenhouseLevel;
      for (const id of ['grow_lamps', 'mister']) this.remove(id);
    }
    for (const id of Object.keys(save.equipment)) {
      if (!equipmentById(id)) continue;
      const active = save.equipment[id]!.active;
      let rig = this.rigs.get(id);
      if (!rig) {
        rig = this.build(id, save.greenhouseLevel);
        this.rigs.set(id, rig);
      }
      rig.active = active;
      rig.mist?.setVisible(active);
      if (rig.mist) {
        if (active && !rig.mist.emitting) rig.mist.start();
        if (!active && rig.mist.emitting) rig.mist.stop();
      }
    }
  }

  private remove(id: string): void {
    const rig = this.rigs.get(id);
    if (!rig) return;
    for (const o of rig.objects) o.destroy();
    for (const l of rig.lights) l.destroy();
    rig.mist?.destroy();
    this.rigs.delete(id);
  }

  private build(id: string, level: GreenhouseLevel): Rig {
    const scene = this.scene;
    const rig: Rig = { objects: [], lights: [], active: true };
    const width = worldWidth(level);
    switch (id) {
      case 'grow_lamps':
        for (let x = 330; x < width - 60; x += 400) {
          rig.objects.push(scene.add.image(x, 100, 'equipment/grow_lamps').setOrigin(0.5, 0).setScale(DOWN).setDepth(DEPTH.equipmentFront));
          for (const dx of [-60, 60]) {
            const glow = scene.add.image(x + dx, 200, 'fx/glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.lights).setDisplaySize(330, 330).setAlpha(0);
            rig.lights.push(glow);
          }
        }
        break;
      case 'mister': {
        for (let x = 0; x < width; x += 240) {
          rig.objects.push(scene.add.image(x, 102, 'equipment/mister').setOrigin(0, 0).setScale(DOWN).setDepth(DEPTH.equipmentFront));
        }
        rig.mist = scene.add
          .particles(0, 128, 'fx/mote', {
            emitZone: randomZone(new Phaser.Geom.Rectangle(0, 0, width, 4)),
            lifespan: 2400,
            speedY: { min: 12, max: 30 },
            speedX: { min: -8, max: 8 },
            scale: { start: 0.25, end: 1.1 },
            alpha: { start: 0.2, end: 0 },
            frequency: 160,
          })
          .setDepth(DEPTH.particles);
        break;
      }
      case 'fan': {
        const p = PLACEMENT.fan;
        const blades = scene.add.image(p.x, p.y, 'equipment/fan').setOrigin(0.5, 0).setScale(DOWN).setDepth(DEPTH.equipmentFront);
        rig.objects.push(blades);
        rig.spin = blades;
        break;
      }
      case 'heater': {
        const p = PLACEMENT.heater;
        rig.objects.push(scene.add.image(p.x, p.y, 'equipment/heater').setOrigin(0.5, 1).setScale(DOWN * 0.72).setDepth(DEPTH.equipmentBack));
        const glow = scene.add.image(p.x, p.y - 60, 'fx/glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.lights).setDisplaySize(190, 190).setAlpha(0);
        rig.lights.push(glow);
        rig.flicker = glow;
        break;
      }
      case 'rain_barrel': {
        const p = PLACEMENT.rain_barrel;
        rig.objects.push(scene.add.image(p.x, p.y, 'equipment/rain_barrel').setOrigin(0.5, 1).setScale(DOWN * 0.85).setDepth(DEPTH.equipmentBack));
        break;
      }
      case 'hose': {
        const p = PLACEMENT.hose;
        rig.objects.push(scene.add.image(p.x, p.y, 'equipment/hose').setOrigin(0.5, 1).setScale(DOWN * 0.8).setDepth(DEPTH.equipmentBack));
        break;
      }
    }
    return rig;
  }

  update(night: number, time: number): void {
    for (const rig of this.rigs.values()) {
      const lit = rig.active ? Math.max(0.12, night) : 0;
      for (const l of rig.lights) l.setAlpha(lit * (rig.flicker === l ? 0.65 + 0.2 * Math.sin(time * 0.009) : 0.5));
      if (rig.spin && rig.active && !this.reducedMotion) rig.spin.setScale(DOWN * Math.cos(time * 0.004), DOWN);
    }
  }
}
