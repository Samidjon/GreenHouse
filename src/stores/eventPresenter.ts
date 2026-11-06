import { AudioService } from '@/audio/AudioService';
import { ACHIEVEMENTS, COLLECTION_MILESTONES, expansionByLevel, mutationById, mutationLabel } from '@/data/catalog';
import { coinsText, gemsText } from '@/utils/format';
import { plantById } from '@/data/plants';
import { notify } from './uiStore';
import type { GameEvent, Reward } from '@/types/game';

function rewardText(reward: Reward): string {
  const parts: string[] = [];
  if (reward.coins) parts.push(coinsText(reward.coins));
  if (reward.gems) parts.push(gemsText(reward.gems));
  return parts.length ? `Награда: ${parts.join(' и ')}` : '';
}

/** Turns gameplay events into sounds and notices. */
export function presentEvents(events: GameEvent[]): void {
  for (const e of events) {
    switch (e.type) {
      case 'harvest': {
        const plant = plantById(e.speciesId);
        const mutation = e.mutation ? mutationById(e.mutation) : null;
        AudioService.play('harvest');
        notify(
          mutation ? 'reward' : 'success',
          `${e.quantity + e.bonus} × ${plant?.name ?? e.speciesId}${mutation ? `, ${mutationLabel(mutation.name)}` : ''}`,
          `+${e.xp} опыта${e.bonus ? ' · бонус от корзины!' : ''}`,
          plant ? `${plant.spriteKey}/HARVESTABLE` : undefined,
        );
        break;
      }
      case 'planted':
        AudioService.play('plant');
        break;
      case 'watered':
        AudioService.play('water');
        break;
      case 'fertilized':
        AudioService.play('plant');
        break;
      case 'sold':
        AudioService.play('coin');
        notify('success', `Продано за ${coinsText(e.coins)}`, undefined, 'ui/coin');
        break;
      case 'purchased':
        AudioService.play('coin');
        notify('info', `Куплено: ${e.name}`);
        break;
      case 'levelUp':
        AudioService.play('levelUp');
        notify('reward', `Уровень ${e.level}!`, `+${coinsText(e.coins)}. Загляните в магазин: там могло появиться новое.`, 'ui/xp');
        break;
      case 'discovery': {
        const plant = plantById(e.speciesId);
        notify('reward', `Новый вид: ${plant?.name}`, 'Добавлен в энциклопедию.', 'ui/book');
        break;
      }
      case 'achievement': {
        const a = ACHIEVEMENTS.find((x) => x.id === e.id);
        if (a) {
          AudioService.play('achievement');
          notify('reward', a.name, rewardText(a.reward), 'ui/trophy');
        }
        break;
      }
      case 'collection': {
        const m = COLLECTION_MILESTONES.find((x) => x.id === e.id);
        if (m) {
          AudioService.play('achievement');
          notify('reward', `Коллекция: ${m.name}`, rewardText(m.reward), 'ui/book');
        }
        break;
      }
      case 'recovered': {
        notify('success', `Растение поправилось: ${plantById(e.speciesId)?.name ?? ''}`, undefined, 'ui/heart');
        break;
      }
      case 'rescued':
        notify('info', 'Соседи оставили у двери семена базилика', 'Иногда всем нужна помощь.', 'seeds/basil');
        break;
      case 'expanded': {
        AudioService.play('build');
        notify('reward', `Новый этап: ${expansionByLevel(e.level).name}`, expansionByLevel(e.level).tagline, 'ui/hammer');
        break;
      }
    }
  }
}
