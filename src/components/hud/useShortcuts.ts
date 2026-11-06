'use client';

import { useEffect } from 'react';
import { AudioService } from '@/audio/AudioService';
import { persist } from '@/stores/gameStore';
import { closePanel, notify, selectTool, togglePanel, uiStore } from '@/stores/uiStore';
import type { PanelId, Tool } from '@/stores/uiStore';

const PANEL_KEYS: Record<string, PanelId> = {
  i: 'inventory',
  s: 'shop',
  e: 'encyclopedia',
  a: 'achievements',
  u: 'upgrades',
  x: 'expansion',
  o: 'settings',
};

const TOOL_KEYS: Record<string, Tool> = {
  '1': 'hand',
  '2': 'water',
  '3': 'plant',
  '4': 'feed',
  '5': 'trowel',
  d: 'decorate',
};

export const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: 'I', action: 'Сумка' },
  { keys: 'S', action: 'Магазин' },
  { keys: 'E', action: 'Энциклопедия' },
  { keys: 'A', action: 'Достижения' },
  { keys: 'U', action: 'Улучшения' },
  { keys: 'X', action: 'Стройка' },
  { keys: 'O', action: 'Настройки' },
  { keys: 'D', action: 'Режим декора' },
  { keys: '1–5', action: 'Рука, полив, посадка, подкормка, совок' },
  { keys: '← →', action: 'Осмотреть теплицу' },
  { keys: 'Ctrl + S', action: 'Сохранить' },
  { keys: 'Esc', action: 'Закрыть или вернуться к руке' },
];

export function useShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
        e.preventDefault();
        void persist().then((ok) => notify(ok ? 'success' : 'warn', ok ? 'Сохранено' : 'Сейчас не удалось сохранить', undefined, 'ui/save'));
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Physical key, not the typed letter: on a Russian layout S types «ы».
      const key = e.code.replace(/^(Key|Digit)/, '').toLowerCase();
      if (key === 'escape') {
        const ui = uiStore.getState();
        if (ui.panel) closePanel();
        else if (ui.placement) uiStore.setState({ placement: null });
        else if (ui.selectedSlot || ui.pickingSeedFor) uiStore.setState({ selectedSlot: null, pickingSeedFor: null });
        else if (ui.tool !== 'hand') selectTool('hand');
        return;
      }
      const panel = PANEL_KEYS[key];
      if (panel) {
        AudioService.play('ui');
        togglePanel(panel);
        return;
      }
      const tool = TOOL_KEYS[key];
      if (tool) {
        AudioService.play('ui');
        selectTool(uiStore.getState().tool === tool ? 'hand' : tool);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
