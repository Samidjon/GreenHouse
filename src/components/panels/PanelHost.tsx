'use client';

import { closePanel, useUi } from '@/stores/uiStore';
import { Modal } from '../ui/Modal';
import { AchievementsContent } from './AchievementsPanel';
import { EncyclopediaContent } from './EncyclopediaPanel';
import { ExpansionContent } from './ExpansionPanel';
import { InventoryContent } from './InventoryPanel';
import { SettingsContent } from './SettingsPanel';
import { ShopContent } from './ShopPanel';
import { UpgradesContent } from './UpgradesPanel';

export function PanelHost() {
  const panel = useUi((s) => s.panel);
  if (!panel) return null;

  switch (panel.id) {
    case 'inventory':
      return (
        <Modal title="Ваша сумка" icon="ui/bag" wide onClose={closePanel}>
          <InventoryContent initialCategory={panel.inventoryCategory} />
        </Modal>
      );
    case 'shop':
      return (
        <Modal title="Садовая лавка" icon="ui/shop" wide onClose={closePanel}>
          <ShopContent initialSection={panel.shopSection} />
        </Modal>
      );
    case 'encyclopedia':
      return (
        <Modal title="Энциклопедия растений" icon="ui/book" wide onClose={closePanel}>
          <EncyclopediaContent />
        </Modal>
      );
    case 'achievements':
      return (
        <Modal title="Достижения" icon="ui/trophy" onClose={closePanel}>
          <AchievementsContent />
        </Modal>
      );
    case 'upgrades':
      return (
        <Modal title="Улучшения" icon="ui/up" wide onClose={closePanel}>
          <UpgradesContent />
        </Modal>
      );
    case 'expansion':
      return (
        <Modal title="Стройка теплицы" icon="ui/hammer" onClose={closePanel}>
          <ExpansionContent />
        </Modal>
      );
    case 'settings':
      return (
        <Modal title="Настройки" icon="ui/gear" onClose={closePanel}>
          <SettingsContent inGame />
        </Modal>
      );
  }
}
