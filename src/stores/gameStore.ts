import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { AudioService } from '@/audio/AudioService';
import { CONFIG, DEFAULT_SETTINGS } from '@/data/config';
import { SaveService } from '@/persistence/saveService';
import type { LoadStatus } from '@/persistence/saveService';
import { gameBus } from '@/services/gameBus';
import { createNewSave } from '@/systems/newGame';
import { catchUp } from '@/systems/offline';
import { presentEvents } from './eventPresenter';
import { notify } from './uiStore';
import type { ActionResult, OfflineSummary, SaveData, Settings } from '@/types/game';

export type Phase = 'loading' | 'menu' | 'playing';

export interface GameState {
  phase: Phase;
  load: LoadStatus | null;
  save: SaveData | null;
  settings: Settings;
  offlineSummary: OfflineSummary | null;
  /** True once another tab has taken over: this tab must stop writing. */
  suspended: boolean;
  lastSavedAt: number | null;
  saveError: string | null;
}

export const gameStore = createStore<GameState>(() => ({
  phase: 'loading',
  load: null,
  save: null,
  settings: { ...DEFAULT_SETTINGS },
  offlineSummary: null,
  suspended: false,
  lastSavedAt: null,
  saveError: null,
}));

export function useGame<T>(selector: (s: GameState) => T): T {
  return useStore(gameStore, selector);
}

/** The live save. Only call while playing. */
export function currentSave(): SaveData {
  const save = gameStore.getState().save;
  if (!save) throw new Error('No game in progress.');
  return save;
}

const PREFS_KEY = 'greenhouse.prefs';

function readPrefs(): Settings {
  try {
    const text = globalThis.localStorage?.getItem(PREFS_KEY);
    return text ? { ...DEFAULT_SETTINGS, ...(JSON.parse(text) as Partial<Settings>) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function writePrefs(settings: Settings): void {
  try {
    globalThis.localStorage?.setItem(PREFS_KEY, JSON.stringify(settings));
  } catch {
    // Settings still apply for this session and stay in the save file.
  }
}

// --- saving ------------------------------------------------------------------

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(): void {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void persist();
  }, CONFIG.save.actionSaveDebounceMs);
}

export async function persist(): Promise<boolean> {
  const { save, suspended } = gameStore.getState();
  if (!save || suspended) return false;
  try {
    const now = Date.now();
    await SaveService.write(save, now);
    gameStore.setState({ lastSavedAt: now, saveError: null });
    return true;
  } catch (error) {
    console.warn('Greenhouse: save failed', error);
    gameStore.setState({ saveError: 'Браузер не дал сохранить игру. В этой вкладке прогресс цел, попробуйте выгрузить его в файл.' });
    return false;
  }
}

export function persistEmergency(): void {
  const { save, suspended } = gameStore.getState();
  if (save && !suspended) SaveService.writeEmergency(save, Date.now());
}

// --- actions -----------------------------------------------------------------

/** Applies the outcome of a gameplay action: state, world effects, sounds, notices, save. */
export function applyResult(result: ActionResult): boolean {
  if (!result.ok) {
    notify('warn', result.reason);
    AudioService.play('deny');
    return false;
  }
  gameStore.setState({ save: result.save });
  presentEvents(result.events);
  for (const event of result.events) gameBus.emit({ kind: 'game', event });
  scheduleSave();
  return true;
}

/** Live clock: all growth comes from timestamps, this only asks the simulation to catch up. */
export function tick(now = Date.now()): void {
  const { save } = gameStore.getState();
  if (!save) return;
  const result = catchUp(save, now);
  if (result.save === save) return;
  gameStore.setState({ save: result.save });
  if (result.events.length) {
    presentEvents(result.events);
    scheduleSave();
  }
  if (result.summary) {
    gameStore.setState({ offlineSummary: result.summary });
    scheduleSave();
  }
}

export function dismissOfflineSummary(): void {
  gameStore.setState({ offlineSummary: null });
}

export async function bootGame(): Promise<void> {
  const settings = readPrefs();
  AudioService.applySettings(settings);
  gameStore.setState({ settings });
  let load: LoadStatus;
  try {
    load = await SaveService.load(Date.now());
  } catch (error) {
    console.warn('Greenhouse: could not open storage', error);
    load = { kind: 'corrupt', message: 'Хранилище браузера сейчас недоступно. Ничего не изменилось.' };
  }
  if (load.kind === 'ok' || load.kind === 'recovered') {
    AudioService.applySettings(load.save.settings);
    writePrefs(load.save.settings);
    gameStore.setState({ settings: load.save.settings });
  }
  gameStore.setState({ phase: 'menu', load });
}

export async function continueGame(): Promise<void> {
  // Re-read storage: this menu may have been open while another tab kept playing.
  const load = await SaveService.load(Date.now());
  gameStore.setState({ load });
  if (load.kind !== 'ok' && load.kind !== 'recovered') return;
  const result = catchUp(load.save, Date.now());
  gameStore.setState({
    save: result.save,
    phase: 'playing',
    offlineSummary: result.summary,
    settings: result.save.settings,
  });
  for (const note of load.notes) notify('info', note);
  if (result.events.length) presentEvents(result.events);
  scheduleSave();
}

export async function startNewGame(): Promise<void> {
  const now = Date.now();
  // Whatever exists, readable or not, goes to backups first. Starting over never erases.
  await SaveService.archiveCurrent('pre-new-game', now);
  const seed = crypto.getRandomValues(new Uint32Array(1))[0]!;
  const save = createNewSave(now, seed, gameStore.getState().settings);
  await SaveService.write(save, now);
  gameStore.setState({ save, phase: 'playing', offlineSummary: null, load: { kind: 'ok', save, notes: [] } });
}

export async function replaceGame(save: SaveData): Promise<void> {
  const now = Date.now();
  await SaveService.commitImport(save, now);
  writePrefs(save.settings);
  AudioService.applySettings(save.settings);
  gameStore.setState({ load: { kind: 'ok', save, notes: [] }, settings: save.settings, phase: 'menu', save: null, offlineSummary: null });
}

export function returnToMenu(): void {
  const { save } = gameStore.getState();
  if (save) void persist();
  AudioService.stop();
  gameStore.setState({ phase: 'menu', load: save ? { kind: 'ok', save, notes: [] } : gameStore.getState().load, save: null, offlineSummary: null });
}

export function updateSettings(patch: Partial<Settings>): void {
  const settings = { ...gameStore.getState().settings, ...patch };
  const { save } = gameStore.getState();
  gameStore.setState({ settings, save: save ? { ...save, settings } : save });
  writePrefs(settings);
  AudioService.applySettings(settings);
  if (save) scheduleSave();
}

export function markSuspended(): void {
  gameStore.setState({ suspended: true });
}
