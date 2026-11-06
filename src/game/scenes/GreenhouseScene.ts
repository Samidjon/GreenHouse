import Phaser from 'phaser';
import { plantById } from '@/data/plants';
import { slotById, slotsForLevel, WORLD, worldWidth } from '@/data/world';
import { gameBus } from '@/services/gameBus';
import type { BusMessage } from '@/services/gameBus';
import { gameStore } from '@/stores/gameStore';
import { uiStore } from '@/stores/uiStore';
import { potFor, plantInSlot, tankCapacity } from '@/systems/derived';
import { environmentContext, getEnvironment } from '@/systems/environment';
import { DEPTH, levelBackgroundKey, SPRITE_RASTER_SCALE } from '../constants';
import { DecorationLayer } from '../objects/DecorationLayer';
import { EquipmentLayer } from '../objects/EquipmentLayer';
import { PlantSlotView } from '../objects/PlantSlotView';
import { Atmosphere } from '../world/Atmosphere';
import { CameraController } from '../world/CameraController';
import { Effects } from '../world/Effects';
import { WorldInput } from '../world/WorldInput';
import { loadBackground } from './BootScene';
import type { GreenhouseLevel, SaveData } from '@/types/game';

const FLOOR_COLOR: Record<GreenhouseLevel, number> = { 1: 0x5c5242, 2: 0x6e4a36, 3: 0x4a3a2a, 4: 0x3f4a3a, 5: 0x8f8a7c };
const ARROW_PAN_PER_SEC = 620;

/** The greenhouse itself. It renders from the stores and reports taps; game rules live in systems/. */
export class GreenhouseScene extends Phaser.Scene {
  private atmosphere!: Atmosphere;
  private cameraControl!: CameraController;
  private decor!: DecorationLayer;
  private equipment!: EquipmentLayer;
  private effects!: Effects;
  private worldInput!: WorldInput;
  private slotViews = new Map<string, PlantSlotView>();
  private background: Phaser.GameObjects.Image | null = null;
  private floorExtension!: Phaser.GameObjects.Rectangle;
  private tank!: Phaser.GameObjects.Image;
  private tankGauge!: Phaser.GameObjects.Graphics;
  private tankGaugeKey = '';
  private shownLevel: GreenhouseLevel | null = null;
  private lastSave: SaveData | null = null;
  private selectedSlot: string | null = null;
  private keys: Record<'left' | 'right', Phaser.Input.Keyboard.Key[]> | null = null;
  private unsubscribers: (() => void)[] = [];

  constructor() {
    super('greenhouse');
  }

  create(): void {
    const save = gameStore.getState().save;
    if (!save) return;

    this.atmosphere = new Atmosphere(this);
    this.floorExtension = this.add.rectangle(-2000, WORLD.height, 12000, 3000, FLOOR_COLOR[save.greenhouseLevel]).setOrigin(0, 0).setDepth(DEPTH.building);
    this.cameraControl = new CameraController(this.cameras.main);
    this.decor = new DecorationLayer(this);
    this.equipment = new EquipmentLayer(this);
    this.effects = new Effects(this);
    this.worldInput = new WorldInput(this, this.cameraControl, () => [...this.slotViews.values()], this.decor);

    const tankProp = WORLD.props.tank;
    this.tank = this.add
      .image(tankProp.x + tankProp.w / 2, tankProp.y + tankProp.h + 2, 'world/tank')
      .setOrigin(0.5, 1)
      .setScale(1 / SPRITE_RASTER_SCALE)
      .setDepth(DEPTH.tank);
    this.tankGauge = this.add.graphics().setDepth(DEPTH.tank + 0.1);

    if (this.input.keyboard) {
      const k = this.input.keyboard;
      this.keys = {
        left: [k.addKey('LEFT', false)],
        right: [k.addKey('RIGHT', false)],
      };
    }

    this.showLevel(save.greenhouseLevel);
    this.syncFromSave(save);
    this.applySettings();
    this.syncUi();

    // Start framed on the beds rather than the door.
    this.cameraControl.focus(560);

    this.scale.on('resize', this.onResize, this);
    this.onResize();

    this.unsubscribers.push(
      gameStore.subscribe((state, prev) => {
        if (state.save && state.save !== prev.save) this.syncFromSave(state.save);
        if (state.settings !== prev.settings) this.applySettings();
      }),
      uiStore.subscribe(() => this.syncUi()),
      gameBus.on((m) => this.onBus(m)),
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.teardown, this);

    uiStore.setState({ worldReady: true, worldProgress: 1 });
  }

  private teardown(): void {
    for (const u of this.unsubscribers) u();
    this.unsubscribers = [];
    this.scale.off('resize', this.onResize, this);
    this.worldInput?.destroy();
  }

  private onResize(): void {
    this.cameraControl.layout();
    this.atmosphere.fit(this.cameras.main);
  }

  private applySettings(): void {
    const reduced = gameStore.getState().settings.reducedMotion;
    this.atmosphere.setReducedMotion(reduced);
    this.effects.setReducedMotion(reduced);
    this.equipment.setReducedMotion(reduced);
    for (const v of this.slotViews.values()) v.setReducedMotion(reduced);
  }

  private showLevel(level: GreenhouseLevel): void {
    if (this.shownLevel === level) return;
    const key = levelBackgroundKey(level);
    if (!this.textures.exists(key)) {
      loadBackground(this, level);
      this.load.once(Phaser.Loader.Events.COMPLETE, () => {
        if (this.scene.isActive()) this.applyBackground(level);
      });
      this.load.start();
      return;
    }
    this.applyBackground(level);
  }

  private applyBackground(level: GreenhouseLevel): void {
    const key = levelBackgroundKey(level);
    const wasBuilt = this.shownLevel !== null;
    this.shownLevel = level;
    const width = worldWidth(level);

    const next = this.add.image(0, 0, key).setOrigin(0, 0).setDisplaySize(width, WORLD.height).setDepth(DEPTH.building);
    const old = this.background;
    this.background = next;
    if (old) {
      // The old room fades out on top of the new one, so the change reads as a renovation.
      old.setDepth(DEPTH.building + 0.5);
      this.tweens.add({ targets: old, alpha: 0, duration: 1400, onComplete: () => old.destroy() });
    }

    this.floorExtension.setFillStyle(FLOOR_COLOR[level]);
    this.atmosphere.setLevel(level, width);
    this.cameraControl.setWorldWidth(width);
    this.atmosphere.fit(this.cameras.main);

    for (const s of slotsForLevel(level)) {
      if (!this.slotViews.has(s.id)) {
        const view = new PlantSlotView(this, s);
        view.setReducedMotion(gameStore.getState().settings.reducedMotion);
        this.slotViews.set(s.id, view);
      }
    }
    const save = gameStore.getState().save;
    if (save) this.syncFromSave(save);

    if (wasBuilt) {
      const newSlots = slotsForLevel(level).filter((s) => s.level === level);
      const centre = newSlots.reduce((sum, s) => sum + s.x, 0) / Math.max(1, newSlots.length);
      this.cameraControl.glideTo(this, centre);
      this.effects.celebrate(centre);
    }
  }

  private syncFromSave(save: SaveData): void {
    this.lastSave = save;
    if (this.shownLevel !== null && save.greenhouseLevel !== this.shownLevel) this.showLevel(save.greenhouseLevel);
    for (const view of this.slotViews.values()) {
      view.setPot(potFor(save, view.def.id));
      view.sync(plantInSlot(save, view.def.id));
    }
    this.decor.sync(save.decorations);
    this.equipment.sync(save);
    this.drawTankGauge(save);
  }

  private drawTankGauge(save: SaveData): void {
    const capacity = tankCapacity(save);
    const fraction = capacity > 0 ? save.tank / capacity : 0;
    const key = Math.round(fraction * 40).toString();
    if (key === this.tankGaugeKey) return;
    this.tankGaugeKey = key;
    const p = WORLD.props.tank;
    const x = p.x + p.w / 2 - 6;
    const top = p.y + 42;
    const height = 92;
    const g = this.tankGauge;
    g.clear();
    g.fillStyle(0x2a2118, 0.6);
    g.fillRoundedRect(x - 1.5, top - 1.5, 15, height + 3, 6);
    g.fillStyle(0x5aa9d1, 1);
    const h = Math.max(2, height * fraction);
    g.fillRoundedRect(x + 1, top + height - h, 10, h, 4);
  }

  private syncUi(): void {
    const ui = uiStore.getState();
    if (ui.selectedSlot !== this.selectedSlot || ui.pickingSeedFor) {
      const wanted = ui.selectedSlot ?? ui.pickingSeedFor;
      for (const [id, view] of this.slotViews) view.setSelected(id === wanted);
      this.selectedSlot = ui.selectedSlot;
    } else if (!ui.selectedSlot && !ui.pickingSeedFor) {
      for (const view of this.slotViews.values()) view.setSelected(false);
    }
    this.decor.syncPlacement(ui.placement);
  }

  private onBus(message: BusMessage): void {
    if (message.kind === 'focus') {
      this.cameraControl.glideTo(this, message.x, 500);
      return;
    }
    if (message.kind === 'denied') {
      this.slotViews.get(message.slotId)?.nudge();
      return;
    }
    const e = message.event;
    switch (e.type) {
      case 'watered': {
        const s = slotById(e.slotId);
        if (s) this.effects.water(s.x, s.y);
        break;
      }
      case 'planted': {
        const s = slotById(e.slotId);
        if (s) this.effects.soil(s.x, s.y);
        break;
      }
      case 'fertilized': {
        const s = slotById(e.slotId);
        if (s) this.effects.sparkle(s.x, s.y);
        break;
      }
      case 'harvest': {
        const s = slotById(e.slotId);
        if (s) {
          this.effects.harvest(s.x, s.y);
          const name = plantById(e.speciesId)?.name ?? '';
          this.effects.floatText(s.x, s.y - 130, `+${e.quantity + e.bonus} ${name}`);
        }
        break;
      }
    }
  }

  override update(time: number, delta: number): void {
    const save = this.lastSave;
    if (!save) return;
    const env = getEnvironment(Date.now(), environmentContext(save));
    this.atmosphere.update(env, time, delta, this.cameras.main);
    this.decor.setNight(this.atmosphere.nightAmount);
    this.equipment.update(this.atmosphere.nightAmount, time);

    if (this.keys && !uiStore.getState().panel) {
      const dx = (this.keys.right.some((k) => k.isDown) ? 1 : 0) - (this.keys.left.some((k) => k.isDown) ? 1 : 0);
      if (dx) this.cameraControl.panBy((dx * ARROW_PAN_PER_SEC * delta) / 1000);
    }
  }
}
