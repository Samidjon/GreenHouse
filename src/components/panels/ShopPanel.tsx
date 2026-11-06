'use client';

import { useState } from 'react';
import { useGame } from '@/stores/gameStore';
import { SHOP_SECTIONS, shopEntries } from '@/systems/shop';
import type { ShopSection } from '@/systems/shop';
import { Tabs } from '../ui/primitives';
import { ShopCard } from './ShopCard';
import styles from './panels.module.css';

export function ShopContent({ initialSection }: { initialSection?: ShopSection }) {
  const [section, setSection] = useState<ShopSection>(initialSection ?? 'seeds');
  const save = useGame((s) => s.save);
  if (!save) return null;

  // What you can buy now comes first; the rest shows what to look forward to.
  const entries = shopEntries(save, section)
    .map((e, i) => ({ e, i }))
    .sort((a, b) => Number(!!a.e.blockedReason) - Number(!!b.e.blockedReason) || a.i - b.i)
    .map((x) => x.e);

  return (
    <div className={styles.column}>
      <Tabs tabs={SHOP_SECTIONS} value={section} onChange={setSection} label="Разделы магазина" />
      <div className={styles.cardGrid}>
        {entries.map((e) => (
          <ShopCard key={e.id} entry={e} />
        ))}
      </div>
    </div>
  );
}
