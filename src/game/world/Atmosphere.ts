import Phaser from 'phaser';
import { DEPTH, SPRITE_RASTER_SCALE } from '../constants';
import { goldenHour, interiorDarkness, skyColors } from './skyColors';
import { randomZone } from './zones';
import type { Environment, GreenhouseLevel } from '@/types/game';

const DOWN = 1 / SPRITE_RASTER_SCALE;
const SKY_REFRESH_MS = 1500;

/**
 * Sky, sun and moon, clouds, hills, sunbeams, rain, night, and the small living
 * details. Purely presentational: rules about weather live in systems/environment.
 */
export class Atmosphere {
  private sky: Phaser.Textures.CanvasTexture;
  private skyImage: Phaser.GameObjects.Image;
  private sun: Phaser.GameObjects.Arc;
  private sunHalo: Phaser.GameObjects.Image;
  private moon: Phaser.GameObjects.Arc;
  private stars: Phaser.GameObjects.Graphics;
  private clouds: { img: Phaser.GameObjects.Image; speed: number }[] = [];
  private beams: { img: Phaser.GameObjects.Image; phase: number }[] = [];
  private night: Phaser.GameObjects.Rectangle;
  private golden: Phaser.GameObjects.Rectangle;
  private rainZone = new Phaser.Geom.Rectangle(0, 0, 1400, 10);
  private glassZone = new Phaser.Geom.Rectangle(0, 60, 1400, 300);
  private moteZone = new Phaser.Geom.Rectangle(0, 120, 1280, 500);
  private rainOutside: Phaser.GameObjects.Particles.ParticleEmitter;
  private rainGlass: Phaser.GameObjects.Particles.ParticleEmitter;
  private motes: Phaser.GameObjects.Particles.ParticleEmitter;
  private butterflies: { img: Phaser.GameObjects.Image; t: number; baseX: number; baseY: number; speed: number }[] = [];
  private fireflies: { img: Phaser.GameObjects.Image; phase: number; x: number; y: number }[] = [];
  private levelFx: Phaser.GameObjects.GameObject[] = [];
  private lastSkyAt = -Infinity;
  private lastEnv: Environment | null = null;
  private reducedMotion = false;
  private builtLevel: GreenhouseLevel | null = null;

  constructor(private scene: Phaser.Scene) {
    const tex = scene.textures.exists('dynamic-sky') ? (scene.textures.get('dynamic-sky') as Phaser.Textures.CanvasTexture) : scene.textures.createCanvas('dynamic-sky', 4, 128);
    if (!tex) throw new Error('Could not create the sky texture.');
    this.sky = tex;
    this.skyImage = scene.add.image(0, 0, 'dynamic-sky').setScrollFactor(0).setDepth(DEPTH.sky);

    this.stars = scene.add.graphics().setDepth(DEPTH.sun).setScrollFactor(0.05);
    const rng = new Phaser.Math.RandomDataGenerator(['stars']);
    for (let i = 0; i < 220; i++) {
      this.stars.fillStyle(0xfff6d8, rng.realInRange(0.3, 0.9));
      this.stars.fillCircle(rng.between(-800, 4400), rng.between(-250, 460), rng.realInRange(0.6, 1.6));
    }

    this.sunHalo = scene.add.image(0, 0, 'fx/glow').setDepth(DEPTH.sun).setScrollFactor(0.1).setBlendMode(Phaser.BlendModes.ADD).setScale(0.8);
    this.sun = scene.add.circle(0, 0, 36, 0xfff0b4).setDepth(DEPTH.sun).setScrollFactor(0.1);
    this.moon = scene.add.circle(0, 0, 24, 0xf0e8cc).setDepth(DEPTH.sun).setScrollFactor(0.1);

    for (let i = 0; i < 6; i++) {
      const img = scene.add
        .image(i * 620 - 200, 60 + (i % 3) * 58, i % 2 ? 'world/cloud1' : 'world/cloud2')
        .setDepth(DEPTH.clouds)
        .setScrollFactor(0.12)
        .setScale(DOWN * (1 + (i % 3) * 0.25));
      this.clouds.push({ img, speed: 3 + (i % 3) * 1.6 });
    }

    // Hills repeat across the widest world, drifting slowly against the glass.
    for (let i = -1; i < 4; i++) {
      scene.add.image(i * 1600, 100, 'world/hills').setOrigin(0, 0).setDepth(DEPTH.hills).setScrollFactor(0.3).setScale(DOWN);
    }

    this.rainOutside = scene.add
      .particles(0, 0, 'fx/drop', {
        emitZone: randomZone(this.rainZone),
        lifespan: 900,
        speedY: { min: 560, max: 760 },
        speedX: { min: -50, max: -30 },
        scaleX: 0.06,
        scaleY: 0.9,
        alpha: 0.45,
        quantity: 2,
        frequency: 18,
        emitting: false,
      })
      .setDepth(DEPTH.rainOutside)
      .setScrollFactor(0);

    this.rainGlass = scene.add
      .particles(0, 0, 'fx/drop', {
        emitZone: randomZone(this.glassZone),
        lifespan: 2600,
        speedY: { min: 26, max: 80 },
        scaleX: 0.07,
        scaleY: { start: 0.22, end: 0.5 },
        alpha: { start: 0.55, end: 0 },
        frequency: 110,
        emitting: false,
      })
      .setDepth(DEPTH.rainOnGlass)
      .setScrollFactor(0);

    this.motes = scene.add
      .particles(0, 0, 'fx/mote', {
        emitZone: randomZone(this.moteZone),
        lifespan: 9000,
        speedX: { min: -7, max: 9 },
        speedY: { min: -7, max: 3 },
        scale: { min: 0.08, max: 0.24 },
        alpha: { start: 0.7, end: 0 },
        blendMode: Phaser.BlendModes.ADD,
        frequency: 340,
      })
      .setDepth(DEPTH.particles);

    this.night = scene.add.rectangle(0, 0, 10, 10, 0x121b42, 0).setScrollFactor(0).setDepth(DEPTH.nightOverlay);
    this.golden = scene.add.rectangle(0, 0, 10, 10, 0xff9a4a, 0).setScrollFactor(0).setDepth(DEPTH.nightOverlay);

    for (let i = 0; i < 14; i++) {
      const img = scene.add.image(0, 0, 'fx/spark').setBlendMode(Phaser.BlendModes.ADD).setScale(0.22).setAlpha(0).setDepth(DEPTH.fireflies);
      this.fireflies.push({ img, phase: i * 1.73, x: 0, y: 0 });
    }
  }

  setReducedMotion(on: boolean): void {
    this.reducedMotion = on;
    if (on) {
      this.motes.stop();
      this.rainGlass.stop();
    } else if (!this.motes.emitting) {
      this.motes.start();
    }
  }

  /** Keeps screen-fixed layers covering the view at the current zoom. */
  fit(camera: Phaser.Cameras.Scene2D.Camera): void {
    const w = camera.width / camera.zoom + 8;
    const h = camera.height / camera.zoom + 8;
    const cx = camera.width / 2;
    const cy = camera.height / 2;
    this.skyImage.setPosition(cx, cy).setDisplaySize(w, h);
    for (const r of [this.night, this.golden]) {
      r.setPosition(cx, cy).setSize(w, h).setDisplaySize(w, h);
    }
    const left = cx - w / 2;
    const top = cy - h / 2;
    this.rainOutside.setPosition(left, top - 20);
    this.rainGlass.setPosition(left, top);
    this.rainZone.width = w;
    this.glassZone.width = w;
  }

  /** Rebuilds world-width-dependent details after an expansion. */
  setLevel(level: GreenhouseLevel, worldW: number): void {
    if (this.builtLevel === level) return;
    this.builtLevel = level;
    const scene = this.scene;

    for (const b of this.beams) b.img.destroy();
    this.beams = [];
    for (let x = 120; x < worldW; x += 330) {
      const img = scene.add
        .image(x, 96, 'fx/beam')
        .setOrigin(0.5, 0)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(DEPTH.beams)
        .setDisplaySize(190, 620);
      this.beams.push({ img, phase: x * 0.013 });
    }

    this.moteZone.width = worldW;

    for (const b of this.butterflies) b.img.destroy();
    this.butterflies = [];
    if (level >= 2) {
      const count = Math.min(5, level);
      for (let i = 0; i < count; i++) {
        const baseX = 300 + ((i * 437) % Math.max(400, worldW - 500));
        const img = scene.add.image(baseX, 300, i % 2 ? 'fx/butterfly1' : 'fx/butterfly2').setDepth(DEPTH.butterflies).setScale(0.42);
        this.butterflies.push({ img, t: i * 2.1, baseX, baseY: 240 + (i % 3) * 90, speed: 0.22 + (i % 3) * 0.07 });
      }
    }

    for (const f of this.fireflies) {
      f.x = Phaser.Math.Between(60, worldW - 60);
      f.y = Phaser.Math.Between(200, 620);
    }

    for (const o of this.levelFx) o.destroy();
    this.levelFx = [];
    if (level >= 4) {
      // Waterfall foam and falling water.
      this.levelFx.push(
        scene.add
          .particles(2550, 390, 'fx/mote', {
            x: { min: -24, max: 24 },
            lifespan: 900,
            speedY: { min: -40, max: -14 },
            speedX: { min: -24, max: 24 },
            scale: { start: 0.3, end: 0.9 },
            alpha: { start: 0.5, end: 0 },
            frequency: 70,
          })
          .setDepth(DEPTH.plants - 1),
        scene.add
          .particles(2550, 110, 'fx/drop', {
            x: { min: -14, max: 14 },
            lifespan: 700,
            speedY: { min: 340, max: 420 },
            scaleX: 0.12,
            scaleY: 0.55,
            alpha: { start: 0.7, end: 0.1 },
            frequency: 40,
          })
          .setDepth(DEPTH.plants - 1),
      );
    }
    if (level >= 5) {
      this.levelFx.push(
        scene.add
          .particles(3200, 430, 'fx/drop', {
            speedY: { min: -130, max: -70 },
            speedX: { min: -42, max: 42 },
            gravityY: 260,
            lifespan: 1100,
            scale: { start: 0.22, end: 0.1 },
            alpha: { start: 0.8, end: 0.3 },
            frequency: 60,
          })
          .setDepth(DEPTH.plants - 1),
        scene.add
          .particles(3200, 516, 'fx/drop', {
            x: { min: -38, max: 38 },
            speedY: { min: 80, max: 140 },
            lifespan: 700,
            scale: 0.12,
            alpha: { start: 0.65, end: 0 },
            frequency: 48,
          })
          .setDepth(DEPTH.plants - 1),
      );
    }
    this.lastSkyAt = -Infinity;
  }

  /** Night strength, for things that glow. */
  get nightAmount(): number {
    return this.lastEnv ? Math.min(1, interiorDarkness(this.lastEnv) / 0.24) : 0;
  }

  update(env: Environment, time: number, dt: number, camera: Phaser.Cameras.Scene2D.Camera): void {
    this.lastEnv = env;
    if (time - this.lastSkyAt > SKY_REFRESH_MS) {
      this.lastSkyAt = time;
      this.paintSky(env);
    }

    // Arc of the sun and moon across the visible sky.
    const viewW = camera.width / camera.zoom;
    const sunT = (env.dayProgress * 24 - 5.5) / 15;
    const arcX = (t: number) => camera.scrollX * 0.1 + (camera.width - viewW) / 2 + t * viewW;
    const arcY = (t: number) => 300 - Math.sin(Math.max(0, Math.min(1, t)) * Math.PI) * 240;
    const up = sunT > -0.05 && sunT < 1.05;
    this.sun.setPosition(arcX(sunT), arcY(sunT)).setVisible(up);
    this.sun.setFillStyle(env.sun < 0.35 ? 0xffc27a : 0xfff0b4);
    const cloudCover = env.weather === 'rain' ? 0.15 : env.weather === 'cloudy' ? 0.45 : 1;
    this.sun.setAlpha(cloudCover);
    this.sunHalo.setPosition(this.sun.x, this.sun.y).setVisible(up).setAlpha(0.45 * cloudCover);
    const moonT = sunT > 1 ? (sunT - 1) / 0.6 : (sunT + 0.6) / 0.6;
    this.moon.setPosition(arcX(moonT), arcY(moonT)).setVisible(!up);
    this.stars.setAlpha((1 - Math.min(1, env.sun * 4)) * (env.weather === 'clear' || env.weather === 'sunny' ? 1 : 0.15));

    const dts = dt / 1000;
    const cloudAlpha = env.weather === 'rain' ? 0.95 : env.weather === 'cloudy' ? 0.85 : env.weather === 'sunny' ? 0.35 : 0.65;
    for (const c of this.clouds) {
      if (!this.reducedMotion) c.img.x += c.speed * dts;
      if (c.img.x > camera.scrollX * 0.12 + viewW + 300) c.img.x = camera.scrollX * 0.12 - 340;
      c.img.setAlpha(cloudAlpha * (0.3 + 0.7 * Math.min(1, env.sun * 3)));
    }

    const beamStrength = env.sun * (env.weather === 'sunny' ? 0.75 : env.weather === 'clear' ? 0.5 : env.weather === 'cloudy' ? 0.14 : 0.04);
    for (const b of this.beams) {
      const shimmer = this.reducedMotion ? 1 : 0.8 + 0.2 * Math.sin(time * 0.00035 + b.phase);
      b.img.setAlpha(beamStrength * shimmer);
      // Beams lean with the sun as it crosses the sky.
      b.img.setAngle(22 - sunT * 44);
    }

    this.night.setFillStyle(0x121b42, interiorDarkness(env));
    this.golden.setFillStyle(0xff9a4a, goldenHour(env));

    const raining = env.weather === 'rain';
    if (raining !== this.rainOutside.emitting) {
      if (raining) {
        this.rainOutside.start();
        if (!this.reducedMotion) this.rainGlass.start();
      } else {
        this.rainOutside.stop();
        this.rainGlass.stop();
      }
    }

    this.motes.setAlpha(Math.min(1, env.sun * 1.6 + 0.15));

    if (!this.reducedMotion) {
      for (const b of this.butterflies) {
        b.t += dts * b.speed;
        b.img.x = b.baseX + Math.sin(b.t) * 140 + Math.sin(b.t * 2.7) * 24;
        b.img.y = b.baseY + Math.sin(b.t * 1.9) * 52;
        b.img.setScale(0.42 * (0.45 + 0.55 * Math.abs(Math.sin(time * 0.012 + b.t * 3))), 0.42);
        b.img.setFlipX(Math.cos(b.t) < 0);
      }
    }
    const showingBugs = env.phase !== 'night' && env.weather !== 'rain';
    for (const b of this.butterflies) b.img.setVisible(showingBugs);

    const fireflies = (this.builtLevel ?? 1) >= 3 && env.phase === 'night';
    for (const f of this.fireflies) {
      f.img.setVisible(fireflies);
      if (!fireflies) continue;
      const t = time * 0.0004 + f.phase;
      f.img.setPosition(f.x + Math.sin(t * 1.3) * 60, f.y + Math.cos(t * 1.7) * 40);
      f.img.setAlpha(0.3 + 0.7 * Math.max(0, Math.sin(t * 4)));
    }
  }

  private paintSky(env: Environment): void {
    const { top, bottom } = skyColors(env);
    const ctx = this.sky.getContext();
    const gradient = ctx.createLinearGradient(0, 0, 0, 128);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 4, 128);
    this.sky.refresh();
  }
}
