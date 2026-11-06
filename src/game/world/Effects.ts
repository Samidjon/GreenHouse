import Phaser from 'phaser';
import { DEPTH } from '../constants';

/** Short one-shot flourishes. Nothing here affects the game. */
export class Effects {
  private reducedMotion = false;

  constructor(private scene: Phaser.Scene) {}

  setReducedMotion(on: boolean): void {
    this.reducedMotion = on;
  }

  private burst(x: number, y: number, key: string, count: number, config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig): void {
    if (this.reducedMotion) return;
    const emitter = this.scene.add.particles(x, y, key, { ...config, emitting: false }).setDepth(DEPTH.floatingText - 1);
    emitter.explode(count);
    const life = typeof config.lifespan === 'number' ? config.lifespan : 1400;
    this.scene.time.delayedCall(life + 100, () => emitter.destroy());
  }

  water(x: number, y: number): void {
    this.burst(x, y - 110, 'fx/drop', 18, {
      x: { min: -30, max: 30 },
      speedY: { min: 60, max: 140 },
      speedX: { min: -12, max: 12 },
      gravityY: 260,
      lifespan: 620,
      scale: { start: 0.24, end: 0.1 },
      alpha: { start: 0.95, end: 0.2 },
    });
  }

  soil(x: number, y: number): void {
    this.burst(x, y - 60, 'fx/mote', 12, {
      speedX: { min: -60, max: 60 },
      speedY: { min: -90, max: -20 },
      gravityY: 300,
      lifespan: 500,
      scale: { start: 0.3, end: 0.1 },
      tint: 0x6b4a33,
    });
  }

  sparkle(x: number, y: number): void {
    this.burst(x, y - 80, 'fx/spark', 14, {
      x: { min: -36, max: 36 },
      y: { min: -36, max: 36 },
      speedY: { min: -40, max: -10 },
      lifespan: 800,
      scale: { start: 0.3, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
    });
  }

  harvest(x: number, y: number): void {
    this.burst(x, y - 90, 'fx/leaf', 16, {
      speedX: { min: -130, max: 130 },
      speedY: { min: -210, max: -60 },
      gravityY: 340,
      rotate: { min: 0, max: 360 },
      lifespan: 950,
      scale: { start: 0.8, end: 0.35 },
      alpha: { start: 1, end: 0 },
    });
    this.sparkle(x, y);
  }

  floatText(x: number, y: number, text: string, color = '#fff8e0'): void {
    const label = this.scene.add
      .text(x, y, text, {
        fontFamily: 'Georgia, serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color,
        stroke: '#3b2f22',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.floatingText);
    this.scene.tweens.add({
      targets: label,
      y: y - (this.reducedMotion ? 0 : 56),
      alpha: { from: 1, to: 0 },
      duration: 1500,
      ease: 'Sine.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  celebrate(x: number): void {
    this.burst(x, 200, 'fx/spark', 60, {
      x: { min: -280, max: 280 },
      speedY: { min: 30, max: 160 },
      speedX: { min: -50, max: 50 },
      lifespan: 1800,
      scale: { start: 0.4, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
    });
    this.burst(x, 120, 'fx/leaf', 40, {
      x: { min: -300, max: 300 },
      speedY: { min: 60, max: 200 },
      speedX: { min: -70, max: 70 },
      rotate: { min: 0, max: 360 },
      lifespan: 2200,
      scale: { start: 0.9, end: 0.5 },
    });
  }
}
