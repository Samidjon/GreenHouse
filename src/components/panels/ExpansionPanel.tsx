'use client';

import { EXPANSIONS } from '@/data/catalog';
import { slotsForLevel } from '@/data/world';
import { applyResult, currentSave, useGame } from '@/stores/gameStore';
import { closePanel } from '@/stores/uiStore';
import { expandGreenhouse, expansionStatus } from '@/systems/expansion';
import { Button } from '../ui/primitives';
import styles from './panels.module.css';

export function ExpansionContent() {
  const save = useGame((s) => s.save);
  if (!save) return null;

  return (
    <ol className={styles.stages}>
      {EXPANSIONS.map((def) => {
        const status = expansionStatus(save, def.level);
        return (
          <li key={def.level} className={`${styles.stage} ${status.built ? styles.stageBuilt : ''} ${status.isNext ? styles.stageNext : ''}`}>
            <span className={styles.stageNumber}>{def.level}</span>
            <div className={styles.grow}>
              <h3>{def.name}</h3>
              <p className={styles.tagline}>{def.tagline}</p>
              {status.built ? (
                <small className={styles.stageMeta}>
                  {def.level === save.greenhouseLevel ? 'Вы здесь.' : 'Построено.'} Всего мест для посадки: {slotsForLevel(def.level).length}.
                </small>
              ) : (
                <>
                  <p className={styles.cardText}>{def.description}</p>
                  <ul className={styles.unlocks}>
                    {def.unlocksText.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                  {status.isNext && (
                    <>
                      <ul className={styles.reqs} aria-label="Что нужно">
                        {status.requirements.map((r) => (
                          <li key={r.label} className={r.met ? styles.reqMet : styles.reqNot}>
                            <span aria-hidden>{r.met ? '✓' : '○'}</span> {r.label}
                            <span className="sr-only">{r.met ? ' (есть)' : ' (ещё нужно)'}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        variant="primary"
                        silent
                        disabled={!status.canBuild}
                        onClick={() => {
                          if (applyResult(expandGreenhouse(currentSave(), Date.now()))) closePanel();
                        }}
                      >
                        Построить: {def.name}
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
