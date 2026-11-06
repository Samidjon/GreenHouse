'use client';

import { useMemo, useState } from 'react';
import { EQUIPMENT } from '@/data/catalog';
import { compareItems, getItemInfo, ITEM_CATEGORY_LABELS } from '@/data/items';
import type { ItemCategory, ItemInfo, ItemSort } from '@/data/items';
import { beginPlacingNew } from '@/stores/commands';
import { applyResult, currentSave, useGame } from '@/stores/gameStore';
import { selectTool } from '@/stores/uiStore';
import { unitSellPrice } from '@/systems/derived';
import { sellItem } from '@/systems/market';
import { formatNumber } from '@/utils/format';
import { AssetImg, Button, EmptyState, PriceTag, RarityTag, Tabs } from '../ui/primitives';
import type { SaveData } from '@/types/game';
import { WORLD } from '@/data/world';
import styles from './panels.module.css';

type CategoryTab = ItemCategory | 'all';

const TABS: { id: CategoryTab; label: string }[] = [
  { id: 'all', label: 'Всё' },
  ...(Object.entries(ITEM_CATEGORY_LABELS) as [ItemCategory, string][]).map(([id, label]) => ({ id, label })),
];

const SORTS: { id: ItemSort; label: string }[] = [
  { id: 'category', label: 'Тип' },
  { id: 'name', label: 'Название' },
  { id: 'quantity', label: 'Количество' },
  { id: 'value', label: 'Цена' },
  { id: 'rarity', label: 'Редкость' },
];

interface Row {
  info: ItemInfo;
  quantity: number;
}

function rowsFor(save: SaveData): Row[] {
  const rows: Row[] = [];
  for (const [id, quantity] of Object.entries(save.inventory)) {
    const info = getItemInfo(id);
    if (info) rows.push({ info, quantity });
  }
  // Installed equipment isn't stacked in the bag, but belongs in this list.
  for (const e of EQUIPMENT) {
    if (save.equipment[e.id]) {
      const info = getItemInfo(`equip:${e.id}`);
      if (info) rows.push({ info, quantity: 1 });
    }
  }
  return rows;
}

export function InventoryContent({ initialCategory }: { initialCategory?: CategoryTab }) {
  const save = useGame((s) => s.save);
  const [category, setCategory] = useState<CategoryTab>(initialCategory ?? 'all');
  const [sort, setSort] = useState<ItemSort>('category');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = useMemo(() => {
    if (!save) return [];
    return rowsFor(save)
      .filter((r) => category === 'all' || r.info.category === category)
      .sort((a, b) => compareItems(a, b, sort));
  }, [save, category, sort]);

  if (!save) return null;

  const selected = rows.find((r) => r.info.id === selectedId) ?? rows[0] ?? null;
  const harvestRows = rowsFor(save).filter((r) => r.info.category === 'harvest');
  const harvestTotal = harvestRows.reduce((sum, r) => sum + (unitSellPrice(save, r.info.id) ?? 0) * r.quantity, 0);

  const sellEverything = () => {
    for (const r of harvestRows) applyResult(sellItem(currentSave(), r.info.id, r.quantity, Date.now()));
  };

  return (
    <div className={styles.column}>
      <Tabs tabs={TABS} value={category} onChange={setCategory} label="Категории предметов" />
      <div className={styles.toolRow}>
        <label className={styles.sortLabel}>
          Сортировка
          <select value={sort} onChange={(e) => setSort(e.target.value as ItemSort)} className={styles.select}>
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <span className={styles.flexGap} />
        {harvestRows.length > 0 && (category === 'all' || category === 'harvest') && (
          <Button small variant="primary" silent onClick={sellEverything}>
            Продать весь урожай за
            <PriceTag price={{ currency: 'coins', amount: harvestTotal }} />
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="ui/bag" title={category === 'harvest' ? 'Урожая пока нет' : 'Здесь пока пусто'}>
          {category === 'harvest' ? 'Нажмите на сверкающее растение, чтобы собрать урожай.' : 'Загляните в магазин.'}
        </EmptyState>
      ) : (
        <div className={styles.split}>
          <ul className={styles.itemGrid}>
            {rows.map((r) => (
              <li key={r.info.id}>
                <button
                  type="button"
                  className={`${styles.itemTile} ${selected?.info.id === r.info.id ? styles.itemOn : ''}`}
                  aria-pressed={selected?.info.id === r.info.id}
                  aria-label={`${r.info.name}, ${r.quantity}`}
                  onClick={() => setSelectedId(r.info.id)}
                >
                  <AssetImg assetKey={r.info.icon} size={54} />
                  {r.info.category !== 'equipment' && r.info.category !== 'tool' && <b className={styles.qty}>{formatNumber(r.quantity)}</b>}
                  {r.info.mutation && <AssetImg assetKey="ui/sparkle" size={16} className={styles.mutBadge} />}
                </button>
              </li>
            ))}
          </ul>
          {selected && <ItemDetail key={selected.info.id} row={selected} save={save} />}
        </div>
      )}
    </div>
  );
}

function ItemDetail({ row, save }: { row: Row; save: SaveData }) {
  const { info, quantity } = row;
  const price = unitSellPrice(save, info.id);

  const actions = () => {
    switch (info.category) {
      case 'seed':
        return (
          <Button variant="primary" onClick={() => selectTool('plant', { seedId: info.refId })}>
            Посадить
          </Button>
        );
      case 'harvest':
        return (
          <>
            <Button variant="primary" silent onClick={() => applyResult(sellItem(currentSave(), info.id, 1, Date.now()))}>
              Продать один за <PriceTag price={{ currency: 'coins', amount: price ?? 0 }} />
            </Button>
            {quantity > 1 && (
              <Button silent onClick={() => applyResult(sellItem(currentSave(), info.id, quantity, Date.now()))}>
                Продать все ({quantity}) за <PriceTag price={{ currency: 'coins', amount: (price ?? 0) * quantity }} />
              </Button>
            )}
          </>
        );
      case 'fertilizer':
        return (
          <Button variant="primary" onClick={() => selectTool('feed', { fertilizerId: info.refId })}>
            Дать растению
          </Button>
        );
      case 'pot':
        return (
          <Button variant="primary" onClick={() => selectTool('repot', { potId: info.refId })}>
            Поставить
          </Button>
        );
      case 'decoration':
        return (
          <Button variant="primary" onClick={() => beginPlacingNew(info.refId, WORLD.props.table.x + WORLD.props.table.w + 90)}>
            Поставить в теплице
          </Button>
        );
      case 'tool':
        return (
          <Button variant="primary" onClick={() => selectTool(info.refId === 'trowel' ? 'trowel' : 'water')}>
            Взять
          </Button>
        );
      case 'equipment':
        return <p className={styles.muted}>Установлено. Включить или выключить можно в разделе «Улучшить».</p>;
    }
  };

  return (
    <aside className={styles.detail}>
      <AssetImg assetKey={info.icon} size={92} />
      <h3>{info.name}</h3>
      <div className={styles.detailTags}>
        <span className={styles.chip}>{ITEM_CATEGORY_LABELS[info.category]}</span>
        {info.rarity && <RarityTag rarity={info.rarity} />}
        <span className={styles.chip}>У вас: {formatNumber(quantity)}</span>
      </div>
      <p className={styles.cardText}>{info.description}</p>
      <div className={styles.detailActions}>{actions()}</div>
    </aside>
  );
}
