import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { ShopSection } from '@/systems/shop';
import type { ItemCategory } from '@/data/items';

export type PanelId = 'inventory' | 'shop' | 'encyclopedia' | 'achievements' | 'upgrades' | 'expansion' | 'settings';
export type Tool = 'hand' | 'water' | 'plant' | 'feed' | 'trowel' | 'decorate' | 'repot';

export interface PanelState {
  id: PanelId;
  shopSection?: ShopSection;
  inventoryCategory?: ItemCategory | 'all';
}

export interface Placement {
  mode: 'new' | 'move';
  defId: string;
  /** The placed decoration being moved. */
  decorationId: string | null;
  x: number;
  y: number;
  flipped: boolean;
  valid: boolean;
  reason: string | null;
}

export type NoticeKind = 'info' | 'success' | 'reward' | 'warn';

export interface Notice {
  id: number;
  kind: NoticeKind;
  text: string;
  detail?: string;
  icon?: string;
}

export interface UiState {
  panel: PanelState | null;
  tool: Tool;
  seedId: string | null;
  fertilizerId: string | null;
  potId: string | null;
  /** The slot whose details card or pickers are showing. */
  selectedSlot: string | null;
  /** Slot awaiting a seed choice. */
  pickingSeedFor: string | null;
  placement: Placement | null;
  notices: Notice[];
  worldProgress: number;
  worldReady: boolean;
}

export const uiStore = createStore<UiState>(() => ({
  panel: null,
  tool: 'hand',
  seedId: null,
  fertilizerId: null,
  potId: null,
  selectedSlot: null,
  pickingSeedFor: null,
  placement: null,
  notices: [],
  worldProgress: 0,
  worldReady: false,
}));

export function useUi<T>(selector: (s: UiState) => T): T {
  return useStore(uiStore, selector);
}

let noticeId = 1;
const NOTICE_MS = 3800;
const MAX_NOTICES = 4;

export function notify(kind: NoticeKind, text: string, detail?: string, icon?: string): void {
  const id = noticeId++;
  uiStore.setState((s) => ({ notices: [...s.notices.slice(-(MAX_NOTICES - 1)), { id, kind, text, detail, icon }] }));
  setTimeout(() => dismissNotice(id), NOTICE_MS);
}

export function dismissNotice(id: number): void {
  uiStore.setState((s) => ({ notices: s.notices.filter((n) => n.id !== id) }));
}

export function openPanel(panel: PanelState): void {
  uiStore.setState({ panel, selectedSlot: null, pickingSeedFor: null });
}

export function closePanel(): void {
  uiStore.setState({ panel: null });
}

export function togglePanel(id: PanelId): void {
  uiStore.setState((s) => ({ panel: s.panel?.id === id ? null : { id }, selectedSlot: null, pickingSeedFor: null }));
}

export function selectTool(tool: Tool, options: { seedId?: string | null; fertilizerId?: string | null; potId?: string | null } = {}): void {
  uiStore.setState({
    tool,
    seedId: options.seedId ?? (tool === 'plant' ? uiStore.getState().seedId : null),
    fertilizerId: options.fertilizerId ?? (tool === 'feed' ? uiStore.getState().fertilizerId : null),
    potId: options.potId ?? null,
    panel: null,
    placement: tool === 'decorate' ? uiStore.getState().placement : null,
    selectedSlot: null,
    pickingSeedFor: null,
  });
}

export function resetUiForNewSession(): void {
  uiStore.setState({
    panel: null,
    tool: 'hand',
    seedId: null,
    fertilizerId: null,
    potId: null,
    selectedSlot: null,
    pickingSeedFor: null,
    placement: null,
    notices: [],
    worldProgress: 0,
    worldReady: false,
  });
}
