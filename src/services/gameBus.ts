import type { GameEvent } from '@/types/game';

/** One-way signals from gameplay to presentation (world effects). State itself flows through the stores. */
export type BusMessage = { kind: 'game'; event: GameEvent } | { kind: 'focus'; x: number } | { kind: 'denied'; slotId: string };

type Listener = (message: BusMessage) => void;

const listeners = new Set<Listener>();

export const gameBus = {
  emit(message: BusMessage): void {
    for (const l of listeners) l(message);
  },
  on(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
