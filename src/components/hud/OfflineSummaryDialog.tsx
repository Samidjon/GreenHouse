'use client';

import { plantById } from '@/data/plants';
import { CONFIG } from '@/data/config';
import { dismissOfflineSummary, useGame } from '@/stores/gameStore';
import { useUi } from '@/stores/uiStore';
import { formatAway, plural } from '@/utils/format';
import { AssetImg, Button } from '../ui/primitives';
import { Modal } from '../ui/Modal';
import styles from './SheetContent.module.css';

/** The greeting after time away. It only ever reports good news and gentle nudges. */
export function OfflineSummaryDialog() {
  const summary = useGame((s) => s.offlineSummary);
  const ready = useUi((s) => s.worldReady);
  if (!summary || !ready) return null;

  const anything = summary.stagesAdvanced > 0 || summary.newlyReady.length > 0;

  return (
    <Modal title="С возвращением" icon="ui/sprout" subtitle={`Вас не было ${formatAway(summary.elapsedSec)}`} onClose={dismissOfflineSummary}>
      <div className={styles.welcome}>
        <p className={styles.lead}>{anything ? 'Пока вас не было, в теплице кипела жизнь.' : 'Здесь всё тихо. Теплица рада была отдохнуть.'}</p>
        {summary.newlyReady.length > 0 && (
          <ul className={styles.readyList}>
            {summary.newlyReady.map((r) => {
              const p = plantById(r.speciesId);
              return (
                <li key={r.speciesId}>
                  {p && <AssetImg assetKey={`${p.spriteKey}/HARVESTABLE`} size={48} />}
                  <span>
                    {p?.name}: можно собирать <b>({r.count})</b>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <ul className={styles.facts}>
          {summary.stagesAdvanced > 0 && <li>Растения выросли: новых стадий роста — {summary.stagesAdvanced}.</li>}
          {summary.tankAfter > summary.tankBefore && <li>Бак наполнился: воды на {Math.floor(summary.tankAfter)} {plural(Math.floor(summary.tankAfter), 'полив', 'полива', 'поливов')}.</li>}
          {summary.recovered > 0 && <li>Поправилось заброшенных растений: {summary.recovered}.</li>}
          {summary.thirsty > 0 && <li>Хотят пить растений: {summary.thirsty}. Лейка всё исправит.</li>}
          {summary.capped && <li>Без вас растения растут не дольше {CONFIG.sim.maxOfflineSec / 3600} часов, поэтому засчитано только это время.</li>}
        </ul>
        <Button variant="primary" onClick={dismissOfflineSummary}>
          К растениям
        </Button>
      </div>
    </Modal>
  );
}
