import { AudioService } from '@/audio/AudioService';
import { CONFIG } from '@/data/config';
import { decorationById } from '@/data/catalog';
import { plantById } from '@/data/plants';
import { fertItemId, potItemId, seedItemId } from '@/data/items';
import { WORLD } from '@/data/world';
import { gameBus } from '@/services/gameBus';
import { checkPlacement, moveDecoration, placeDecoration, removeDecoration } from '@/systems/decorations';
import { plantInSlot, tankCapacity } from '@/systems/derived';
import { isReady } from '@/systems/growth';
import { changePot, fertilizePlant, harvestPlant, plantSeed, waterPlant } from '@/systems/plantActions';
import { applyResult, currentSave } from './gameStore';
import { notify, openPanel, selectTool, uiStore } from './uiStore';
import type { Placement } from './uiStore';

/**
 * What a tap in the world means, given the current tool. Phaser reports what
 * was tapped; every decision is made here so the scene holds no game rules.
 */
export function tapSlot(slotId: string): void {
  const save = currentSave();
  if (!save.slots[slotId]) return;
  const ui = uiStore.getState();
  const plant = plantInSlot(save, slotId);

  switch (ui.tool) {
    case 'water':
      if (!plant) return denied(slotId, 'Здесь ничего не посажено.');
      applyResult(waterPlant(save, plant.id, Date.now()));
      return;
    case 'feed':
      if (!plant) return denied(slotId, 'Здесь ничего не посажено.');
      if (!ui.fertilizerId) return void uiStore.setState({ selectedSlot: slotId });
      if (applyResult(fertilizePlant(save, plant.id, ui.fertilizerId, Date.now()))) {
        if ((currentSave().inventory[fertItemId(ui.fertilizerId)] ?? 0) === 0) selectTool('hand');
      }
      return;
    case 'plant': {
      if (plant) return denied(slotId, 'Этот горшок уже занят.');
      if (!ui.seedId) return void uiStore.setState({ pickingSeedFor: slotId });
      plantHere(slotId, ui.seedId);
      return;
    }
    case 'trowel':
      if (!plant) return denied(slotId, 'Этот горшок и так пуст.');
      uiStore.setState({ selectedSlot: slotId });
      return;
    case 'decorate':
      return;
    case 'repot':
      if (!ui.potId) return;
      if (applyResult(changePot(save, slotId, ui.potId, Date.now()))) {
        AudioService.play('place');
        if ((currentSave().inventory[potItemId(ui.potId)] ?? 0) === 0) selectTool('hand');
      }
      return;
    case 'hand':
      if (plant && isReady(plant)) {
        applyResult(harvestPlant(save, plant.id, Date.now()));
        uiStore.setState({ selectedSlot: null });
        return;
      }
      if (!plant) {
        AudioService.play('ui');
        uiStore.setState({ pickingSeedFor: slotId, selectedSlot: null });
        return;
      }
      AudioService.play('ui');
      uiStore.setState({ selectedSlot: slotId });
  }
}

function denied(slotId: string, text: string): void {
  notify('info', text);
  AudioService.play('deny');
  gameBus.emit({ kind: 'denied', slotId });
}

export function plantHere(slotId: string, speciesId: string): boolean {
  const save = currentSave();
  const ok = applyResult(plantSeed(save, slotId, speciesId, Date.now(), Math.random));
  if (ok) {
    uiStore.setState({ pickingSeedFor: null });
    const left = currentSave().inventory[seedItemId(speciesId)] ?? 0;
    if (uiStore.getState().tool === 'plant' && left === 0) {
      selectTool('hand');
      notify('info', `Это были последние семена: ${plantById(speciesId)?.name ?? ''}.`);
    }
  }
  return ok;
}

export function tapTank(): void {
  const save = currentSave();
  AudioService.play('ui');
  const cap = tankCapacity(save);
  notify(
    'info',
    `Бак с водой: ${Math.floor(save.tank)} из ${cap} поливов`,
    `Наполняется сам: один полив за ${CONFIG.tank.refillSec} секунд, а в дождь быстрее.`,
    'ui/water',
  );
}

export function tapTable(): void {
  AudioService.play('ui');
  openPanel({ id: 'shop', shopSection: 'seeds' });
}

export function tapDoor(): void {
  AudioService.play('ui');
  openPanel({ id: 'inventory', inventoryCategory: 'harvest' });
}

// --- decorations ---------------------------------------------------------------

function buildPlacement(partial: Omit<Placement, 'valid' | 'reason'>): Placement {
  const def = decorationById(partial.defId)!;
  const check = checkPlacement(currentSave(), def, partial.x, partial.y, partial.decorationId);
  return { ...partial, x: check.x, y: check.y, valid: check.valid, reason: check.reason };
}

export function beginPlacingNew(defId: string, atX: number): void {
  if (!decorationById(defId)) return;
  uiStore.setState({
    tool: 'decorate',
    panel: null,
    selectedSlot: null,
    placement: buildPlacement({ mode: 'new', defId, decorationId: null, x: atX, y: (WORLD.wallBand.top + WORLD.wallBand.bottom) / 2, flipped: false }),
  });
}

export function beginMoving(decorationId: string): void {
  const placed = currentSave().decorations.find((d) => d.id === decorationId);
  if (!placed) return;
  AudioService.play('ui');
  uiStore.setState({
    placement: buildPlacement({ mode: 'move', defId: placed.defId, decorationId, x: placed.x, y: placed.y, flipped: placed.flipped }),
  });
}

export function movePlacementTo(x: number, y: number): void {
  const p = uiStore.getState().placement;
  if (!p) return;
  uiStore.setState({ placement: buildPlacement({ ...p, x, y }) });
}

export function flipPlacement(): void {
  const p = uiStore.getState().placement;
  if (p) uiStore.setState({ placement: { ...p, flipped: !p.flipped } });
}

export function cancelPlacement(): void {
  uiStore.setState({ placement: null });
}

export function confirmPlacement(): boolean {
  const p = uiStore.getState().placement;
  if (!p) return false;
  const save = currentSave();
  const now = Date.now();
  const result =
    p.mode === 'new'
      ? placeDecoration(save, p.defId, p.x, p.y, p.flipped, now)
      : moveDecoration(save, p.decorationId!, p.x, p.y, p.flipped, now);
  const ok = applyResult(result);
  if (ok) {
    AudioService.play('place');
    uiStore.setState({ placement: null });
  }
  return ok;
}

export function storePlacedDecoration(): void {
  const p = uiStore.getState().placement;
  if (!p?.decorationId) return;
  if (applyResult(removeDecoration(currentSave(), p.decorationId, Date.now()))) {
    AudioService.play('ui');
    uiStore.setState({ placement: null });
  }
}
