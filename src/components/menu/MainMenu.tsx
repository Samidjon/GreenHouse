'use client';

import { useRef, useState } from 'react';
import { assetUrl } from '@/assets/manifest';
import { AudioService } from '@/audio/AudioService';
import { expansionByLevel } from '@/data/catalog';
import { SaveService } from '@/persistence/saveService';
import { continueGame, replaceGame, startNewGame, useGame } from '@/stores/gameStore';
import { coinsText, formatDateTime } from '@/utils/format';
import { SettingsContent } from '../panels/SettingsPanel';
import { AssetImg, Button, ConfirmDialog } from '../ui/primitives';
import { Modal } from '../ui/Modal';
import type { SaveData } from '@/types/game';
import styles from './Menu.module.css';

export function MainMenu() {
  const load = useGame((s) => s.load);
  const [confirmNew, setConfirmNew] = useState(false);
  const [pendingImport, setPendingImport] = useState<SaveData | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const existing = load && (load.kind === 'ok' || load.kind === 'recovered') ? load.save : null;
  const blockedNewer = load?.kind === 'newer';

  const begin = async (fn: () => Promise<void>) => {
    AudioService.unlock();
    setBusy(true);
    try {
      await fn();
    } catch (error) {
      console.warn('Greenhouse: menu action failed', error);
      setMessage('Браузер не дал игре доступ к хранилищу. Ничего не изменилось.');
    }
    setBusy(false);
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const parsed = SaveService.parseImport(await f.text(), Date.now());
    if (!parsed.ok) setMessage(parsed.error);
    else setPendingImport(parsed.save);
    if (file.current) file.current.value = '';
  };

  return (
    <main className={styles.menu}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.hills} src={assetUrl('world/hills')} alt="" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.room} src={assetUrl('world/bg2')} alt="" />
      <div className={styles.vignette} />

      <section className={styles.card} aria-labelledby="game-title">
        <h1 id="game-title" className={styles.logo}>
          Теплица
        </h1>
        <p className={styles.tagline}>Верните к жизни забытую теплицу, росток за ростком.</p>

        {existing && (
          <div className={styles.summary}>
            <AssetImg assetKey="ui/sprout" size={30} />
            <div>
              <strong>{expansionByLevel(existing.greenhouseLevel).name}</strong>
              <div className={styles.summaryLine}>
                Уровень {existing.profile.level} · {coinsText(existing.currencies.coins)} · растений: {Object.keys(existing.plants).length}
              </div>
              <div className={styles.summaryLine}>Последний визит: {formatDateTime(existing.lastSavedAt)}</div>
            </div>
          </div>
        )}

        {load?.kind === 'recovered' && <p className={styles.alert}>{load.notes[0]}</p>}
        {load?.kind === 'corrupt' && <p className={styles.alert}>{load.message} Можно восстановить старую копию из резервной или из файла либо начать заново: повреждённое сохранение всё равно останется.</p>}
        {blockedNewer && load.kind === 'newer' && <p className={styles.alert}>{load.message} Обновите игру, чтобы продолжить. Сохранение осталось нетронутым.</p>}
        {message && <p className={styles.alert}>{message}</p>}

        <div className={styles.actions}>
          {existing && (
            <Button variant="primary" className={styles.main} disabled={busy} onClick={() => void begin(continueGame)}>
              Продолжить
            </Button>
          )}
          <Button
            variant={existing ? 'wood' : 'primary'}
            className={existing ? undefined : styles.main}
            disabled={busy || blockedNewer}
            onClick={() => (existing || load?.kind === 'corrupt' ? setConfirmNew(true) : void begin(startNewGame))}
          >
            Новая игра
          </Button>
          <div className={styles.row}>
            <Button disabled={busy || blockedNewer} onClick={() => file.current?.click()}>
              Загрузить из файла
            </Button>
            <Button onClick={() => setSettings(true)}>Настройки</Button>
          </div>
          <input ref={file} type="file" accept=".json,application/json" hidden aria-label="Выберите файл сохранения" onChange={(e) => void onFile(e.target.files?.[0])} />
        </div>
      </section>

      {settings && (
        <Modal title="Настройки" icon="ui/gear" onClose={() => setSettings(false)}>
          <SettingsContent />
        </Modal>
      )}

      {confirmNew && (
        <ConfirmDialog
          title="Начать новую игру?"
          confirmLabel="Начать заново"
          onCancel={() => setConfirmNew(false)}
          onConfirm={() => {
            setConfirmNew(false);
            void begin(startNewGame);
          }}
        >
          Текущее сохранение не сотрётся, а перейдёт в резервные копии. Его можно будет вернуть в настройках.
        </ConfirmDialog>
      )}

      {pendingImport && (
        <ConfirmDialog
          title="Загрузить это сохранение?"
          confirmLabel="Загрузить"
          onCancel={() => setPendingImport(null)}
          onConfirm={() => {
            const save = pendingImport;
            setPendingImport(null);
            void begin(() => replaceGame(save));
          }}
        >
          Уровень {pendingImport.profile.level}, {expansionByLevel(pendingImport.greenhouseLevel).name}. Текущая игра сохранится как резервная копия.
        </ConfirmDialog>
      )}
    </main>
  );
}
