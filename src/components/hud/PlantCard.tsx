'use client';

import { useState } from 'react';
import { CONFIG } from '@/data/config';
import { FERTILIZERS, fertilizerById, mutationById, mutationLabel } from '@/data/catalog';
import { fertItemId } from '@/data/items';
import { CATEGORY_LABELS, LIGHT_LABELS, plantById } from '@/data/plants';
import { applyResult, currentSave, useGame } from '@/stores/gameStore';
import { selectTool, uiStore, useUi } from '@/stores/uiStore';
import { plantInSlot } from '@/systems/derived';
import { environmentContext, getEnvironment } from '@/systems/environment';
import { describeModifiers, estimateSecondsLeft, isReady, stageForGrowth } from '@/systems/growth';
import { fertilizePlant, harvestPlant, uprootPlant, waterPlant } from '@/systems/plantActions';
import { formatDuration } from '@/utils/format';
import { AssetImg, Button, ConfirmDialog, Meter, RarityTag } from '../ui/primitives';
import styles from './SheetContent.module.css';

const STAGE_LABEL: Record<string, string> = {
  SEED: 'Семя',
  SPROUT: 'Росток',
  SEEDLING: 'Сеянец',
  GROWING: 'Растёт',
  MATURE: 'Взрослое',
  HARVESTABLE: 'Можно собирать',
};

/** Everything about one plant, including exactly why it's growing at its current speed. */
export function PlantCard() {
  const slotId = useUi((s) => s.selectedSlot);
  const tool = useUi((s) => s.tool);
  const save = useGame((s) => s.save);
  const [confirmUproot, setConfirmUproot] = useState(false);
  const [feeding, setFeeding] = useState(false);

  if (!slotId || !save) return null;
  const plant = plantInSlot(save, slotId);
  if (!plant) return null;
  const def = plantById(plant.speciesId);
  if (!def) return null;

  const env = getEnvironment(save.simulatedUntil, environmentContext(save));
  const ready = isReady(plant);
  const stage = stageForGrowth(plant.growth);
  const modifiers = describeModifiers(plant, def, env, save);
  const owned = FERTILIZERS.filter((f) => (save.inventory[fertItemId(f.id)] ?? 0) > 0);
  const mutation = plant.mutation && stage !== 'SEED' && plant.growth >= 0.8 ? mutationById(plant.mutation) : null;
  const close = () => uiStore.setState({ selectedSlot: null });
  const tempOk = env.temperature >= def.temperature.min && env.temperature <= def.temperature.max;

  return (
    <aside className={styles.sheet} aria-label={`Подробности: ${def.name}`}>
      <header className={styles.sheetHead}>
        <AssetImg assetKey={`${def.spriteKey}/${stage}`} size={58} />
        <div className={styles.grow}>
          <h3>{def.name}</h3>
          <div className={styles.tags}>
            <RarityTag rarity={def.rarity} />
            <small>{CATEGORY_LABELS[def.category]}</small>
          </div>
        </div>
        <button type="button" className={styles.x} onClick={close} aria-label="Закрыть подробности">
          <AssetImg assetKey="ui/close" size={18} />
        </button>
      </header>

      {mutation && (
        <p className={styles.mutation}>
          <AssetImg assetKey="ui/sparkle" size={18} /> {mutationLabel(mutation.name)}: {mutation.description}
        </p>
      )}

      <div className={styles.meters}>
        <Meter
          label={STAGE_LABEL[stage] ?? stage}
          value={plant.growth}
          tone="leaf"
          detail={ready ? 'Готово' : `осталось около ${formatDuration(estimateSecondsLeft(plant, def, env, save))}`}
        />
        <Meter label="Влажность земли" value={plant.moisture / 100} tone={plant.moisture < CONFIG.moisture.thirsty ? 'sun' : 'water'} />
        <Meter label="Здоровье" value={plant.health / 100} tone={plant.health < CONFIG.health.poorThreshold ? 'berry' : 'leaf'} />
      </div>

      {!ready && (
        <>
          <dl className={styles.needs}>
            <div>
              <dt>
                <AssetImg assetKey="ui/water" size={16} /> Вода
              </dt>
              <dd>{def.water.label}</dd>
            </div>
            <div>
              <dt>
                <AssetImg assetKey="ui/bulb" size={16} /> Свет
              </dt>
              <dd>{LIGHT_LABELS[def.light]}</dd>
            </div>
            <div>
              <dt>
                <AssetImg assetKey="ui/thermometer" size={16} /> Тепло
              </dt>
              <dd className={tempOk ? undefined : styles.off}>
                {def.temperature.min}–{def.temperature.max}°C
              </dd>
            </div>
          </dl>

          <div className={styles.modifiers}>
            <h4>Как растёт сейчас</h4>
            {modifiers.length === 0 ? (
              <p>Ровно и спокойно. Всего хватает.</p>
            ) : (
              <ul>
                {modifiers.map((m) => (
                  <li key={m.id}>
                    <span className={m.multiplier >= 1 ? styles.good : styles.slow}>
                      {m.multiplier >= 1 ? '+' : '−'}
                      {Math.round(Math.abs(m.multiplier - 1) * 100)}%
                    </span>{' '}
                    <b>{m.label}.</b> {m.explanation}
                  </li>
                ))}
              </ul>
            )}
            {plant.fertilizer && (
              <p className={styles.fert}>
                {fertilizerById(plant.fertilizer.id)?.name}: осталось {formatDuration(plant.fertilizer.remainingSec)}
              </p>
            )}
          </div>
        </>
      )}

      <div className={styles.sheetFoot}>
        {ready ? (
          <Button
            variant="primary"
            silent
            onClick={() => {
              if (applyResult(harvestPlant(currentSave(), plant.id, Date.now()))) close();
            }}
          >
            Собрать
          </Button>
        ) : (
          <>
            <Button variant="primary" silent disabled={plant.moisture >= 95} onClick={() => applyResult(waterPlant(currentSave(), plant.id, Date.now()))}>
              <AssetImg assetKey="ui/water" size={18} /> Полить
            </Button>
            <Button onClick={() => setFeeding((v) => !v)} aria-expanded={feeding}>
              Удобрить
            </Button>
          </>
        )}
        <Button variant={tool === 'trowel' ? 'danger' : 'ghost'} onClick={() => setConfirmUproot(true)}>
          Выкопать
        </Button>
      </div>

      {feeding && !ready && (
        <div className={styles.feedList}>
          {owned.length === 0 && <small>В сумке нет удобрений. Они продаются в магазине, в разделе «Семена и удобрения».</small>}
          {owned.map((f) => (
            <Button
              key={f.id}
              small
              silent
              onClick={() => {
                if (applyResult(fertilizePlant(currentSave(), plant.id, f.id, Date.now()))) setFeeding(false);
              }}
            >
              <AssetImg assetKey={f.icon} size={20} /> {f.name} ×{save.inventory[fertItemId(f.id)]}
            </Button>
          ))}
        </div>
      )}

      {confirmUproot && (
        <ConfirmDialog
          title={`Выкопать: ${def.name}?`}
          danger
          confirmLabel="Выкопать"
          onCancel={() => setConfirmUproot(false)}
          onConfirm={() => {
            setConfirmUproot(false);
            if (applyResult(uprootPlant(currentSave(), plant.id, Date.now()))) {
              close();
              if (tool === 'trowel') selectTool('hand');
            }
          }}
        >
          {plant.growth < CONFIG.growth.stageThresholds[1] ? 'Оно ещё не проросло, поэтому семя вернётся в сумку.' : 'Растение пропадёт. С несозревшего растения урожая не будет.'}
        </ConfirmDialog>
      )}
    </aside>
  );
}
