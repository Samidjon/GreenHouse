'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioService } from '@/audio/AudioService';
import { SaveService } from '@/persistence/saveService';
import { currentSave, gameStore, persist, replaceGame, returnToMenu, updateSettings, useGame } from '@/stores/gameStore';
import { notify } from '@/stores/uiStore';
import { downloadText, formatDateTime } from '@/utils/format';
import { SHORTCUTS } from '../hud/useShortcuts';
import { Button, ConfirmDialog } from '../ui/primitives';
import type { SaveData, Settings } from '@/types/game';
import styles from './panels.module.css';

const SLIDERS: { key: keyof Settings; label: string }[] = [
  { key: 'masterVolume', label: 'Общая громкость' },
  { key: 'musicVolume', label: 'Музыка' },
  { key: 'ambienceVolume', label: 'Дождь и природа' },
  { key: 'sfxVolume', label: 'Звуковые эффекты' },
];

const BACKUP_LABEL = {
  rotation: 'Автоматическая',
  'pre-migration': 'Перед обновлением игры',
  'pre-import': 'Перед загрузкой из файла или копии',
  'pre-new-game': 'Перед новой игрой',
  unreadable: 'Повреждённая копия',
};

type BackupRow = Awaited<ReturnType<typeof SaveService.listBackups>>[number];

export function SettingsContent({ inGame = false }: { inGame?: boolean }) {
  const settings = useGame((s) => s.settings);
  const lastSavedAt = useGame((s) => s.lastSavedAt);
  const saveError = useGame((s) => s.saveError);
  const [backups, setBackups] = useState<BackupRow[]>([]);
  const [pendingImport, setPendingImport] = useState<SaveData | null>(null);
  const [pendingRestore, setPendingRestore] = useState<BackupRow | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const refreshBackups = useCallback(() => {
    SaveService.listBackups().then(setBackups, () => setBackups([]));
  }, []);

  useEffect(refreshBackups, [refreshBackups]);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const parsed = SaveService.parseImport(await f.text(), Date.now());
    if (parsed.ok) {
      setError(null);
      setPendingImport(parsed.save);
    } else {
      setError(parsed.error);
    }
    if (file.current) file.current.value = '';
  };

  const exportSave = () => {
    const save = gameStore.getState().save;
    const load = gameStore.getState().load;
    const source = save ?? (load && (load.kind === 'ok' || load.kind === 'recovered') ? load.save : null);
    if (!source) {
      setError('Пока нечего сохранять в файл.');
      return;
    }
    const day = new Date().toISOString().slice(0, 10);
    downloadText(`greenhouse-save-${day}.json`, SaveService.exportText(source, Date.now()));
  };

  const restore = async (row: BackupRow) => {
    const result = await SaveService.restoreBackup(row.key, Date.now());
    if (result.ok) {
      gameStore.setState({ load: { kind: 'ok', save: result.save, notes: [] }, save: null, phase: 'menu', offlineSummary: null });
    } else {
      setError(result.error);
    }
  };

  return (
    <div className={styles.column}>
      <section>
        <h3 className={styles.heading}>Звук</h3>
        <label className={styles.check}>
          <input type="checkbox" checked={settings.muted} onChange={(e) => updateSettings({ muted: e.target.checked })} /> Выключить весь звук
        </label>
        <div className={styles.sliders}>
          {SLIDERS.map((s) => (
            <label key={s.key} className={styles.slider}>
              <span>{s.label}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                disabled={settings.muted}
                value={settings[s.key] as number}
                onChange={(e) => {
                  AudioService.unlock();
                  updateSettings({ [s.key]: Number(e.target.value) });
                }}
                onPointerUp={() => AudioService.play('ui')}
              />
            </label>
          ))}
        </div>
      </section>

      <section>
        <h3 className={styles.heading}>Удобство</h3>
        <label className={styles.check}>
          <input type="checkbox" checked={settings.reducedMotion} onChange={(e) => updateSettings({ reducedMotion: e.target.checked })} /> Меньше движения (без покачивания и вспышек)
        </label>
      </section>

      <section>
        <h3 className={styles.heading}>Ваше сохранение</h3>
        <p className={styles.muted}>
          Игра сама сохраняется в этом браузере.
          {lastSavedAt ? ` Последнее сохранение: ${formatDateTime(lastSavedAt)}.` : ''}
        </p>
        {saveError && <p className={styles.alert}>{saveError}</p>}
        {error && <p className={styles.alert}>{error}</p>}
        <div className={styles.buttonRow}>
          {inGame && (
            <Button
              variant="primary"
              onClick={() => {
                void persist().then((ok) => notify(ok ? 'success' : 'warn', ok ? 'Сохранено' : 'Сейчас не удалось сохранить', undefined, 'ui/save'));
              }}
            >
              Сохранить
            </Button>
          )}
          <Button onClick={exportSave}>Сохранить в файл</Button>
          <Button onClick={() => file.current?.click()}>Загрузить из файла</Button>
          <input ref={file} type="file" accept=".json,application/json" hidden aria-label="Выберите файл сохранения" onChange={(e) => void onFile(e.target.files?.[0])} />
        </div>

        {backups.length > 0 && (
          <details className={styles.backups}>
            <summary>Резервные копии ({backups.length})</summary>
            <ul className={styles.rows}>
              {backups.map((b) => (
                <li key={b.key} className={styles.row}>
                  <div className={styles.grow}>
                    <b>{BACKUP_LABEL[b.reason]}</b>
                    <small>{formatDateTime(b.createdAt)}</small>
                  </div>
                  {b.valid ? (
                    <Button small onClick={() => setPendingRestore(b)}>
                      Вернуть
                    </Button>
                  ) : (
                    <small>Не читается, хранится на всякий случай</small>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {inGame && (
        <section>
          <h3 className={styles.heading}>Клавиатура</h3>
          <dl className={styles.shortcuts}>
            {SHORTCUTS.map((s) => (
              <div key={s.keys}>
                <dt>
                  <kbd>{s.keys}</kbd>
                </dt>
                <dd>{s.action}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {inGame && (
        <div className={styles.buttonRow}>
          <Button variant="ghost" onClick={() => setLeaving(true)}>
            В главное меню
          </Button>
        </div>
      )}

      {leaving && (
        <ConfirmDialog
          title="Вернуться в главное меню?"
          confirmLabel="Сохранить и выйти"
          onCancel={() => setLeaving(false)}
          onConfirm={() => {
            setLeaving(false);
            returnToMenu();
          }}
        >
          Пока вас нет, растения продолжат расти.
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
            if (gameStore.getState().save) void persist();
            void replaceGame(save);
          }}
        >
          Уровень {pendingImport.profile.level}, сохранено {formatDateTime(pendingImport.lastSavedAt)}. Текущая игра останется резервной копией. Вы вернётесь в главное меню.
        </ConfirmDialog>
      )}

      {pendingRestore && (
        <ConfirmDialog
          title="Вернуть эту копию?"
          confirmLabel="Вернуть"
          onCancel={() => setPendingRestore(null)}
          onConfirm={() => {
            const row = pendingRestore;
            setPendingRestore(null);
            void (async () => {
              if (gameStore.getState().save) {
                currentSave();
                await persist();
              }
              await restore(row);
            })();
          }}
        >
          Копия от {formatDateTime(pendingRestore.createdAt)}. Сначала текущая игра сохранится как резервная копия. Вы вернётесь в главное меню.
        </ConfirmDialog>
      )}
    </div>
  );
}
