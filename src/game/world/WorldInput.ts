import Phaser from 'phaser';
import { WORLD } from '@/data/world';
import { currentSave } from '@/stores/gameStore';
import { beginMoving, confirmPlacement, movePlacementTo, tapDoor, tapSlot, tapTable, tapTank } from '@/stores/commands';
import { uiStore } from '@/stores/uiStore';
import { TAP_SLOP_PX } from '../constants';
import type { DecorationLayer } from '../objects/DecorationLayer';
import type { PlantSlotView } from '../objects/PlantSlotView';
import type { CameraController } from './CameraController';

type Rect = { x: number; y: number; w: number; h: number };
const inside = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

type Gesture = 'none' | 'tap' | 'pan' | 'drag-ghost' | 'pending-move';

/**
 * Turns one pointer's motion into a tap, a pan, or a drag. Mouse and touch take
 * the same path, and no action depends on hovering.
 */
export class WorldInput {
  private gesture: Gesture = 'none';
  private startX = 0;
  private startY = 0;
  private lastX = 0;
  private dragged = false;
  private pendingMoveId: string | null = null;
  private activeId: number | null = null;

  constructor(
    private scene: Phaser.Scene,
    private camera: CameraController,
    private slots: () => PlantSlotView[],
    private decor: DecorationLayer,
  ) {
    const input = scene.input;
    input.on('pointerdown', this.onDown, this);
    input.on('pointermove', this.onMove, this);
    input.on('pointerup', this.onUp, this);
    input.on('pointerupoutside', this.onUp, this);
    input.on('wheel', this.onWheel, this);
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (this.activeId !== null) return;
    this.activeId = pointer.id;
    this.startX = pointer.x;
    this.startY = pointer.y;
    this.lastX = pointer.x;
    this.dragged = false;
    this.pendingMoveId = null;

    const ui = uiStore.getState();
    const { x, y } = this.camera.worldPoint(pointer);
    if (ui.placement && this.decor.ghostContains(x, y, ui.placement)) {
      this.gesture = 'drag-ghost';
      return;
    }
    if (ui.tool === 'decorate' && !ui.placement) {
      const hit = this.decor.hitTest(x, y, currentSave().decorations);
      if (hit) {
        this.gesture = 'pending-move';
        this.pendingMoveId = hit.id;
        return;
      }
    }
    this.gesture = 'tap';
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (this.activeId === null) {
      if (pointer.wasTouch) return;
      this.updateCursor(pointer);
      return;
    }
    if (pointer.id !== this.activeId) return;
    const moved = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.startX, this.startY);
    if (!this.dragged && moved < TAP_SLOP_PX) return;
    this.dragged = true;

    if (this.gesture === 'pending-move' && this.pendingMoveId) {
      beginMoving(this.pendingMoveId);
      this.pendingMoveId = null;
      this.gesture = 'drag-ghost';
    }
    if (this.gesture === 'drag-ghost') {
      const { x, y } = this.camera.worldPoint(pointer);
      movePlacementTo(x, y);
      return;
    }
    if (this.gesture === 'tap') this.gesture = 'pan';
    if (this.gesture === 'pan') {
      this.camera.panBy((this.lastX - pointer.x) / this.scene.cameras.main.zoom);
      this.lastX = pointer.x;
    }
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activeId) return;
    this.activeId = null;
    const gesture = this.gesture;
    this.gesture = 'none';
    const { x, y } = this.camera.worldPoint(pointer);

    if (gesture === 'drag-ghost') {
      // Drag and drop: a valid drop commits straight away. An invalid one stays up so it can be adjusted.
      if (this.dragged && uiStore.getState().placement?.valid) confirmPlacement();
      return;
    }
    if (gesture === 'pending-move' && this.pendingMoveId) {
      beginMoving(this.pendingMoveId);
      this.pendingMoveId = null;
      return;
    }
    if (gesture === 'tap' && !this.dragged) this.tap(x, y);
  }

  private tap(x: number, y: number): void {
    const ui = uiStore.getState();
    if (ui.placement) {
      movePlacementTo(x, y);
      return;
    }
    const slot = this.slots().find((s) => s.containsPoint(x, y));
    if (slot) {
      tapSlot(slot.def.id);
      return;
    }
    if (ui.tool === 'decorate') return;
    if (inside(WORLD.props.tank, x, y)) tapTank();
    else if (inside(WORLD.props.table, x, y)) tapTable();
    else if (inside(WORLD.props.door, x, y)) tapDoor();
    else if (ui.selectedSlot || ui.pickingSeedFor) uiStore.setState({ selectedSlot: null, pickingSeedFor: null });
  }

  private onWheel(_p: Phaser.Input.Pointer, _o: unknown, dx: number, dy: number): void {
    this.camera.panBy((Math.abs(dx) > Math.abs(dy) ? dx : dy) / this.scene.cameras.main.zoom);
  }

  private updateCursor(pointer: Phaser.Input.Pointer): void {
    const { x, y } = this.camera.worldPoint(pointer);
    const ui = uiStore.getState();
    let hot = false;
    if (ui.placement) hot = this.decor.ghostContains(x, y, ui.placement);
    else if (ui.tool === 'decorate') hot = !!this.decor.hitTest(x, y, currentSave().decorations);
    else {
      hot =
        this.slots().some((s) => s.containsPoint(x, y)) ||
        inside(WORLD.props.tank, x, y) ||
        inside(WORLD.props.table, x, y) ||
        inside(WORLD.props.door, x, y);
    }
    this.scene.input.setDefaultCursor(hot ? 'pointer' : 'grab');
  }

  destroy(): void {
    const input = this.scene.input;
    input.off('pointerdown', this.onDown, this);
    input.off('pointermove', this.onMove, this);
    input.off('pointerup', this.onUp, this);
    input.off('pointerupoutside', this.onUp, this);
    input.off('wheel', this.onWheel, this);
  }
}
