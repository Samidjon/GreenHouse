import type { GreenhouseLevel, LightNeed, PlantCategory, PlantDef, Price, Rarity } from '@/types/game';

const coins = (amount: number): Price => ({ currency: 'coins', amount });
const gems = (amount: number): Price => ({ currency: 'gems', amount });

const MIN = 60;
const HOUR = 3600;

interface PlantRow {
  id: string;
  name: string;
  latin: string;
  category: PlantCategory;
  rarity: Rarity;
  seed: Price;
  sell: number;
  grow: number;
  drain: number;
  light: LightNeed;
  temp: [number, number];
  yield: [number, number];
  xp: number;
  level: number;
  house: GreenhouseLevel;
  text: string;
}

function waterLabel(row: PlantRow): PlantDef['water']['label'] {
  // Normalised by growth time: how many full cans a plant asks for over its life.
  const cans = (row.drain * row.grow) / HOUR / 60;
  if (cans < 0.8) return 'Мало';
  if (cans < 2.5) return 'Умеренно';
  return 'Много';
}

/**
 * To add a species: add one row here and an entry to scripts/art/species.mjs,
 * then run `npm run assets`. A test fails if a species has no sprites.
 */
const ROWS: PlantRow[] = [
  { id: 'basil', name: 'Сладкий базилик', latin: 'Ocimum basilicum', category: 'herb', rarity: 'common', seed: coins(8), sell: 6, grow: 2 * MIN, drain: 480, light: 'partial', temp: [14, 30], yield: [2, 3], xp: 6, level: 1, house: 1, text: 'Неприхотливый и душистый. Он рос здесь задолго до вас, в треснувшем горшке, о котором все забыли.' },
  { id: 'mint', name: 'Садовая мята', latin: 'Mentha spicata', category: 'herb', rarity: 'common', seed: coins(12), sell: 8, grow: 3 * MIN, drain: 420, light: 'shade', temp: [10, 28], yield: [2, 4], xp: 8, level: 1, house: 1, text: 'Переносит почти всё, даже ваше отсутствие. Дай ей волю, и она займёт всю полку.' },
  { id: 'radish', name: 'Редис', latin: 'Raphanus sativus', category: 'vegetable', rarity: 'common', seed: coins(15), sell: 11, grow: 4 * MIN, drain: 360, light: 'partial', temp: [8, 26], yield: [2, 3], xp: 10, level: 2, house: 1, text: 'Хрустящий, с перчинкой и вечно спешит. Выдёргивайте, когда над землёй покажутся розовые плечики.' },
  { id: 'marigold', name: 'Бархатцы', latin: 'Tagetes patula', category: 'flower', rarity: 'common', seed: coins(20), sell: 14, grow: 5 * MIN, drain: 300, light: 'bright', temp: [14, 32], yield: [2, 3], xp: 13, level: 2, house: 1, text: 'Маленькое оранжевое солнце на стебле. Старые садоводы сажают их рядом со всем подряд, на всякий случай.' },
  { id: 'lettuce', name: 'Кочанный салат', latin: 'Lactuca sativa', category: 'vegetable', rarity: 'common', seed: coins(26), sell: 17, grow: 7 * MIN, drain: 300, light: 'shade', temp: [8, 24], yield: [2, 3], xp: 17, level: 3, house: 1, text: 'Нежные зелёные розетки, которым по душе прохладный уголок и немного тишины.' },
  { id: 'chamomile', name: 'Ромашка', latin: 'Matricaria chamomilla', category: 'herb', rarity: 'uncommon', seed: coins(40), sell: 24, grow: 10 * MIN, drain: 200, light: 'bright', temp: [12, 28], yield: [2, 4], xp: 24, level: 4, house: 1, text: 'Крошечные цветки с яблочным ароматом. Засушите головки, и во всей комнате станет спокойнее.' },

  { id: 'lavender', name: 'Английская лаванда', latin: 'Lavandula angustifolia', category: 'herb', rarity: 'uncommon', seed: coins(60), sell: 34, grow: 15 * MIN, drain: 110, light: 'bright', temp: [12, 30], yield: [2, 4], xp: 34, level: 5, house: 2, text: 'Серебристые листья и лиловые свечки. Заденете рукавом, и он целый час будет пахнуть летом.' },
  { id: 'tomato', name: 'Помидоры черри', latin: 'Solanum lycopersicum', category: 'fruit', rarity: 'uncommon', seed: coins(80), sell: 22, grow: 20 * MIN, drain: 140, light: 'bright', temp: [16, 32], yield: [4, 7], xp: 46, level: 6, house: 2, text: 'Сладкие маленькие кисти, которые зреют сверху вниз. До кухни доходят немногие.' },
  { id: 'strawberry', name: 'Альпийская земляника', latin: 'Fragaria vesca', category: 'fruit', rarity: 'uncommon', seed: coins(100), sell: 28, grow: 25 * MIN, drain: 120, light: 'partial', temp: [10, 26], yield: [4, 6], xp: 58, level: 7, house: 2, text: 'Размером с ноготок и невероятно душистая. Стоит целой полки крупных ягод.' },
  { id: 'tulip', name: 'Попугайный тюльпан', latin: 'Tulipa gesneriana', category: 'flower', rarity: 'uncommon', seed: coins(130), sell: 75, grow: 30 * MIN, drain: 90, light: 'partial', temp: [6, 22], yield: [2, 3], xp: 72, level: 8, house: 2, text: 'Кружевной, полосатый и немного театральный. Когда-то за такие луковицы отдавали целые состояния.' },

  { id: 'fern', name: 'Бостонский папоротник', latin: 'Nephrolepis exaltata', category: 'foliage', rarity: 'rare', seed: coins(200), sell: 110, grow: 45 * MIN, drain: 70, light: 'shade', temp: [14, 28], yield: [2, 3], xp: 105, level: 9, house: 3, text: 'Зелёный фонтан из вайй. Любит влажный уголок и в благодарность очищает воздух.' },
  { id: 'aloe', name: 'Алоэ лечебное', latin: 'Aloe vera', category: 'succulent', rarity: 'rare', seed: coins(260), sell: 130, grow: 60 * MIN, drain: 22, light: 'bright', temp: [14, 34], yield: [2, 3], xp: 135, level: 10, house: 3, text: 'Хранит в листьях воду на целый сезон и почти ничего не просит взамен.' },
  { id: 'echeveria', name: 'Эхеверия', latin: 'Echeveria elegans', category: 'succulent', rarity: 'rare', seed: coins(340), sell: 170, grow: 90 * MIN, drain: 16, light: 'bright', temp: [12, 32], yield: [2, 3], xp: 190, level: 12, house: 3, text: 'Резной нефритовый цветок, будто припудренный. Берите за горшок и старайтесь не трогать.' },
  { id: 'foxglove', name: 'Наперстянка', latin: 'Digitalis purpurea', category: 'flower', rarity: 'rare', seed: coins(420), sell: 210, grow: 2 * HOUR, drain: 30, light: 'partial', temp: [8, 24], yield: [2, 3], xp: 250, level: 13, house: 3, text: 'Крапчатые колокольчики взбираются по высокому стеблю, и у каждого своя дверца размером со шмеля.' },

  { id: 'monstera', name: 'Монстера', latin: 'Monstera deliciosa', category: 'tropical', rarity: 'rare', seed: coins(600), sell: 320, grow: 3 * HOUR, drain: 20, light: 'partial', temp: [18, 34], yield: [2, 3], xp: 370, level: 15, house: 4, text: 'Новые листья разворачиваются целыми, а потом вдруг разрезаются, будто подумав. Для неё всегда найдётся место.' },
  { id: 'pineapple', name: 'Карликовый ананас', latin: 'Ananas comosus', category: 'tropical', rarity: 'epic', seed: coins(850), sell: 280, grow: 4 * HOUR, drain: 14, light: 'bright', temp: [20, 36], yield: [3, 5], xp: 520, level: 17, house: 4, text: 'Драгоценный плод под колючей короной. Не торопится, а созрев, пахнет отпуском.' },
  { id: 'paradise', name: 'Райская птица', latin: 'Strelitzia reginae', category: 'tropical', rarity: 'epic', seed: coins(1200), sell: 640, grow: 5 * HOUR, drain: 14, light: 'bright', temp: [18, 34], yield: [2, 3], xp: 720, level: 19, house: 4, text: 'Оранжевые хохолки и синий язычок, вечно готовые вспорхнуть с широкого листа.' },
  { id: 'moth_orchid', name: 'Орхидея-бабочка', latin: 'Phalaenopsis amabilis', category: 'orchid', rarity: 'epic', seed: coins(1700), sell: 900, grow: 6 * HOUR, drain: 9, light: 'partial', temp: [18, 30], yield: [2, 3], xp: 980, level: 21, house: 4, text: 'Стайка бледных мотыльков на одном изогнутом стебле. Лучшее удобрение здесь терпение.' },

  { id: 'flytrap', name: 'Венерина мухоловка', latin: 'Dionaea muscipula', category: 'carnivorous', rarity: 'epic', seed: coins(2400), sell: 1200, grow: 7 * HOUR, drain: 11, light: 'bright', temp: [14, 32], yield: [2, 3], xp: 1350, level: 24, house: 5, text: 'Очень вежлива, если вы не мошка. Любая теплица втайне ей благодарна.' },
  { id: 'moonflower', name: 'Лунный цветок', latin: 'Ipomoea alba', category: 'mythic', rarity: 'legendary', seed: gems(6), sell: 2600, grow: 8 * HOUR, drain: 9, light: 'shade', temp: [16, 30], yield: [2, 3], xp: 2100, level: 27, house: 5, text: 'Раскрывается только после заката и слабо светится, словно лампа, оставленная для вас.' },
  { id: 'ghost_orchid', name: 'Орхидея-призрак', latin: 'Dendrophylax lindenii', category: 'mythic', rarity: 'legendary', seed: gems(10), sell: 4200, grow: 10 * HOUR, drain: 7, light: 'shade', temp: [20, 30], yield: [2, 3], xp: 3200, level: 30, house: 5, text: 'Безлистный призрачный цветок. Ботаники годами бродят по болотам, чтобы хоть раз его увидеть.' },
];

export const PLANTS: PlantDef[] = ROWS.map((r) => ({
  id: r.id,
  name: r.name,
  latinName: r.latin,
  category: r.category,
  rarity: r.rarity,
  seedPrice: r.seed,
  sellPrice: r.sell,
  growthDurationSec: r.grow,
  water: { drainPerHour: r.drain, label: waterLabel(r) },
  light: r.light,
  temperature: { min: r.temp[0], max: r.temp[1] },
  harvest: { min: r.yield[0], max: r.yield[1] },
  xp: r.xp,
  unlockLevel: r.level,
  minGreenhouseLevel: r.house,
  description: r.text,
  spriteKey: `plants/${r.id}`,
}));

const BY_ID = new Map(PLANTS.map((p) => [p.id, p]));

export function plantById(id: string): PlantDef | undefined {
  return BY_ID.get(id);
}

export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export const CATEGORY_LABELS: Record<PlantCategory, string> = {
  herb: 'Пряная трава',
  vegetable: 'Овощ',
  flower: 'Цветок',
  fruit: 'Плодовое',
  foliage: 'Лиственное',
  succulent: 'Суккулент',
  tropical: 'Тропическое',
  orchid: 'Орхидея',
  carnivorous: 'Хищное',
  mythic: 'Легендарное',
};

export const RARITY_LABELS: Record<Rarity, string> = {
  common: 'Обычное',
  uncommon: 'Необычное',
  rare: 'Редкое',
  epic: 'Особое',
  legendary: 'Легендарное',
};

export const LIGHT_LABELS: Record<LightNeed, string> = {
  shade: 'Тень',
  partial: 'Полутень',
  bright: 'Яркое солнце',
};
