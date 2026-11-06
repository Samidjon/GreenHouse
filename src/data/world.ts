import layout from './worldLayout.json';
import type { GreenhouseLevel } from '@/types/game';

export type SlotSurface = 'shelf' | 'bench' | 'planter' | 'terrace' | 'stand';

export interface SlotDef {
  id: string;
  level: GreenhouseLevel;
  x: number;
  /** Y of the surface the pot stands on. */
  y: number;
  surface: SlotSurface;
}

export interface WorldRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BlockerDef extends WorldRect {
  id: string;
  level: GreenhouseLevel;
}

export const WORLD = {
  height: layout.height,
  floorY: layout.floorY,
  wallBand: layout.wallBand,
  hangingY: layout.hangingY,
  /** Horizontal footprint a slot reserves for its pot and plant. */
  slotHalfWidth: 62,
  slotHeight: 200,
  props: layout.props,
} as const;

export const ALL_SLOTS = layout.slots as SlotDef[];
export const ALL_BLOCKERS = layout.blockers as BlockerDef[];

export function worldWidth(level: GreenhouseLevel): number {
  return layout.widths[String(level) as keyof typeof layout.widths];
}

export function slotsForLevel(level: GreenhouseLevel): SlotDef[] {
  return ALL_SLOTS.filter((s) => s.level <= level);
}

export function slotById(id: string): SlotDef | undefined {
  return ALL_SLOTS.find((s) => s.id === id);
}

export function slotRect(slot: SlotDef): WorldRect {
  return {
    x: slot.x - WORLD.slotHalfWidth,
    y: slot.y - WORLD.slotHeight,
    w: WORLD.slotHalfWidth * 2,
    h: WORLD.slotHeight,
  };
}
