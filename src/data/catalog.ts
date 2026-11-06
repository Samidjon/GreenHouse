import type {
  AchievementDef,
  CollectionMilestone,
  DecorationDef,
  EquipmentDef,
  ExpansionDef,
  FertilizerDef,
  GreenhouseLevel,
  MutationDef,
  PotDef,
  Price,
  UpgradeDef,
  UpgradeId,
} from '@/types/game';

const coins = (amount: number): Price => ({ currency: 'coins', amount });
const gems = (amount: number): Price => ({ currency: 'gems', amount });

/** Names are masculine adjectives, read together with the word «сорт». */
export const MUTATIONS: MutationDef[] = [
  { id: 'variegated', name: 'Пёстрый', chance: 0.05, sellMultiplier: 1.5, description: 'Кремовые мазки на каждом листе. Красиво, и платят в полтора раза больше.' },
  { id: 'golden', name: 'Золотой', chance: 0.015, sellMultiplier: 3, description: 'Тёплый металлический отблеск. Коллекционеры платят втрое.' },
  { id: 'moonlit', name: 'Лунный', chance: 0.005, sellMultiplier: 5, description: 'Серебристый, едва светится. Встречается почти никогда и стоит в пять раз дороже.' },
];

export const FERTILIZERS: FertilizerDef[] = [
  { id: 'compost', name: 'Садовый компост', description: 'Тёмный, рассыпчатый, честный. Мягко подбадривает одно растение.', price: coins(12), unlockLevel: 1, growthMultiplier: 1.25, durationSec: 10 * 60, instantHealth: 10, instantMoisture: 0, icon: 'items/fert_compost' },
  { id: 'bone_meal', name: 'Костная мука', description: 'Медленная и сильная подкормка для растений с большими планами.', price: coins(60), unlockLevel: 5, growthMultiplier: 1.5, durationSec: 45 * 60, instantHealth: 10, instantMoisture: 0, icon: 'items/fert_bone_meal' },
  { id: 'tonic', name: 'Живительный настой', description: 'Поднимает увядшее растение одним поливом. Сразу возвращает здоровье и влагу.', price: coins(25), unlockLevel: 2, growthMultiplier: 1, durationSec: 0, instantHealth: 60, instantMoisture: 50, icon: 'items/fert_tonic' },
  { id: 'moon_feed', name: 'Лунная подкормка', description: 'Сварена в полнолуние. На два часа удваивает скорость роста.', price: gems(1), unlockLevel: 8, growthMultiplier: 2, durationSec: 2 * 60 * 60, instantHealth: 20, instantMoisture: 0, icon: 'items/fert_moon_feed' },
];

export const POTS: PotDef[] = [
  { id: 'old_clay', name: 'Щербатый жёлтый горшок', description: 'Достался вместе с теплицей. Земля в нём быстро сохнет, но держится.', price: coins(5), unlockLevel: 1, drainMultiplier: 1, mutationMultiplier: 1, sprite: 'pots/old_clay' },
  { id: 'terracotta', name: 'Синий горшок', description: 'Только что из печи. Земля остаётся влажной примерно на 10% дольше.', price: coins(40), unlockLevel: 2, drainMultiplier: 0.9, mutationMultiplier: 1, sprite: 'pots/terracotta' },
  { id: 'glazed', name: 'Глазурованный горшок', description: 'Глубокая бирюзовая глазурь держит влагу: земля сохнет на 25% медленнее.', price: coins(160), unlockLevel: 6, drainMultiplier: 0.75, mutationMultiplier: 1, sprite: 'pots/glazed' },
  { id: 'self_watering', name: 'Горшок с автополивом', description: 'Скрытый резервуар вдвое замедляет высыхание земли.', price: coins(600), unlockLevel: 11, drainMultiplier: 0.5, mutationMultiplier: 1, sprite: 'pots/self_watering' },
  { id: 'brass', name: 'Старинная латунная ваза', description: 'Растения в ней на 50% чаще дают редкие сорта. Никто не знает почему.', price: gems(3), unlockLevel: 14, drainMultiplier: 0.8, mutationMultiplier: 1.5, sprite: 'pots/brass' },
];

export const EQUIPMENT: EquipmentDef[] = [
  { id: 'grow_lamps', name: 'Фитолампы', description: 'Тёплые лампы на стропилах для пасмурных дней и долгих ночей.', effectText: 'Добавляют света, и светолюбивым растениям уютно даже после заката.', effect: 'lamp', price: coins(180), unlockLevel: 3, minGreenhouseLevel: 1, sprite: 'equipment/grow_lamps' },
  { id: 'heater', name: 'Чугунная печка', description: 'Маленькая печка, которая тихонько потрескивает.', effectText: 'Добавляет 6°C, когда в теплице холоднее 20°C.', effect: 'heater', price: coins(320), unlockLevel: 5, minGreenhouseLevel: 2, sprite: 'equipment/heater' },
  { id: 'rain_barrel', name: 'Бочка для дождевой воды', description: 'Собирает каждую каплю с крыши и наполняет бак.', effectText: 'Во время дождя бак наполняется вдвое быстрее.', effect: 'rainBarrel', price: coins(260), unlockLevel: 5, minGreenhouseLevel: 1, sprite: 'equipment/rain_barrel' },
  { id: 'hose', name: 'Садовый шланг', description: 'Свёрнутый, залатанный и достаёт до каждой грядки.', effectText: 'Добавляет на панель кнопку «Полить всё».', effect: 'hose', price: coins(500), unlockLevel: 7, minGreenhouseLevel: 2, sprite: 'equipment/hose' },
  { id: 'fan', name: 'Потолочный вентилятор', description: 'Неспешно вращается и разгоняет тёплый воздух.', effectText: 'Убирает 5°C, когда в теплице жарче 25°C.', effect: 'fan', price: coins(700), unlockLevel: 10, minGreenhouseLevel: 3, sprite: 'equipment/fan' },
  { id: 'mister', name: 'Туманообразователь', description: 'Тонкая постоянная дымка вдоль стропил.', effectText: 'Земля не высыхает ниже 28%, даже когда вас нет.', effect: 'mister', price: coins(2400), unlockLevel: 12, minGreenhouseLevel: 3, sprite: 'equipment/mister' },
];

export const UPGRADES: UpgradeDef[] = [
  { id: 'water_tank', name: 'Бак побольше', description: 'Вместительный бак, починенный и в новых обручах.', effectPerLevel: '+8 к объёму воды', maxLevel: 4, costs: [coins(120), coins(450), coins(1600), coins(6000)], unlockLevels: [2, 6, 11, 18], icon: 'items/upgrade_tank' },
  { id: 'watering_can', name: 'Лейка получше', description: 'Широкая насадка и длинный носик.', effectPerLevel: '+15 влаги за полив', maxLevel: 3, costs: [coins(90), coins(600), coins(3000)], unlockLevels: [2, 8, 15], icon: 'items/tool_watering_can' },
  { id: 'potting_mix', name: 'Богатый грунт', description: 'Листовой перегной, песок и секретный ингредиент.', effectPerLevel: '+5% к скорости роста', maxLevel: 4, costs: [coins(200), coins(900), coins(3500), coins(12000)], unlockLevels: [3, 8, 14, 22], icon: 'items/upgrade_mix' },
  { id: 'harvest_basket', name: 'Корзина для урожая', description: 'Меньше потерянных помидоров, больше в ящике.', effectPerLevel: '+15% к шансу на лишний плод', maxLevel: 3, costs: [coins(250), coins(1500), coins(8000)], unlockLevels: [4, 10, 20], icon: 'items/upgrade_basket' },
  { id: 'market_stall', name: 'Прилавок на рынке', description: 'Настоящий навес на субботнем рынке.', effectPerLevel: '+5% к цене продажи', maxLevel: 5, costs: [coins(300), coins(1000), coins(3000), coins(9000), coins(25000)], unlockLevels: [4, 9, 14, 20, 26], icon: 'items/upgrade_stall' },
  { id: 'seed_satchel', name: 'Сумка для семян', description: 'Покупайте мешочками у старого торговца.', effectPerLevel: 'Скидка 5% на семена за монеты', maxLevel: 3, costs: [coins(350), coins(2000), coins(10000)], unlockLevels: [5, 12, 22], icon: 'items/upgrade_satchel' },
  { id: 'botanist_lens', name: 'Лупа ботаника', description: 'Помогает замечать и поощрять мельчайшие различия.', effectPerLevel: '+25% к шансу на редкий сорт', maxLevel: 3, costs: [gems(2), gems(5), gems(10)], unlockLevels: [6, 14, 24], icon: 'items/upgrade_lens' },
];

export const EXPANSIONS: ExpansionDef[] = [
  { level: 1, name: 'Старая теплица', tagline: 'Пыль, паутина и большие надежды', description: 'Забытая пристройка с треснувшими стёклами и упрямым баком.', cost: [], requiredPlayerLevel: 1, requiredItems: [], baseTemperature: 18, glassClarity: 0.85, unlocksText: ['6 мест для посадки'] },
  { level: 2, name: 'Маленький сад', tagline: 'Чистые стёкла и высокая грядка', description: 'Новые стёкла, свежая краска и грядка под удлинённой крышей.', cost: [coins(350)], requiredPlayerLevel: 3, requiredItems: [], baseTemperature: 20, glassClarity: 1, unlocksText: ['Ещё 4 места для посадки', 'Лаванда, помидоры, земляника и тюльпаны', 'Печка, шланг и новые украшения'] },
  { level: 3, name: 'Ботанический дом', tagline: 'Чугунные арки и настоящие стеллажи', description: 'Высокие арочные пролёты, плитка на полу и место для серьёзных растений.', cost: [coins(2500)], requiredPlayerLevel: 8, requiredItems: [{ itemId: 'harvest:lavender', quantity: 3 }], baseTemperature: 21, glassClarity: 1.05, unlocksText: ['Ещё 6 мест для посадки', 'Папоротники, суккуленты и наперстянка', 'Вентилятор, туманообразователь и мебель'] },
  { level: 4, name: 'Тропический рай', tagline: 'Тепло, влажно и очень зелено', description: 'Тёплое крыло-джунгли с террасами, водопадом и прудом.', cost: [coins(12000)], requiredPlayerLevel: 14, requiredItems: [{ itemId: 'harvest:fern', quantity: 4 }, { itemId: 'harvest:aloe', quantity: 2 }], baseTemperature: 25, glassClarity: 1.1, unlocksText: ['Ещё 8 мест для посадки', 'Монстера, ананас, райская птица и орхидеи'] },
  { level: 5, name: 'Большая оранжерея', tagline: 'Мрамор, латунь и огромный стеклянный купол', description: 'Мечта: дворец из стекла под куполом, а в самом его сердце фонтан.', cost: [coins(50000), gems(8)], requiredPlayerLevel: 22, requiredItems: [{ itemId: 'harvest:moth_orchid', quantity: 3 }], baseTemperature: 24, glassClarity: 1.15, unlocksText: ['Ещё 8 мест для посадки', 'Мухоловка, лунный цветок и орхидея-призрак'] },
];

export function expansionByLevel(level: GreenhouseLevel): ExpansionDef {
  const def = EXPANSIONS[level - 1];
  if (!def) throw new Error(`Unknown greenhouse level ${level}`);
  return def;
}

const deco = (
  id: string,
  name: string,
  kind: DecorationDef['kind'],
  zone: DecorationDef['zone'],
  price: Price,
  unlockLevel: number,
  minGreenhouseLevel: GreenhouseLevel,
  width: number,
  height: number,
  coziness: number,
  description: string,
  glow?: number,
): DecorationDef => ({ id, name, kind, zone, price, unlockLevel, minGreenhouseLevel, width, height, coziness, description, glow, sprite: `decor/${id}` });

export const DECORATIONS: DecorationDef[] = [
  deco('wicker_basket', 'Плетёная корзина', 'ornament', 'floor', coins(25), 1, 1, 80, 60, 1, 'Для обрезков, перчаток и всего, что вы собирались убрать.'),
  deco('stool', 'Трёхногий табурет', 'furniture', 'floor', coins(40), 1, 1, 70, 80, 1, 'Слегка шатается. Идеален, чтобы сидеть и смотреть на листья.'),
  deco('floor_pot', 'Большой терракотовый горшок', 'pot', 'floor', coins(45), 2, 1, 90, 110, 2, 'В нём живёт маленькое вечнозелёное деревце, которое ничего не просит.'),
  deco('wall_shelf', 'Настенная полка', 'shelf', 'wall', coins(55), 2, 1, 140, 70, 2, 'Полочка со старыми банками и свисающим черенком.'),
  deco('botanical_print', 'Ботанический рисунок', 'ornament', 'wall', coins(70), 2, 1, 90, 110, 2, 'Гравюра с папоротником в рамке, чуть пожелтевшая от времени.'),
  deco('lantern', 'Подвесной фонарь', 'lamp', 'hanging', coins(90), 3, 1, 60, 120, 3, 'Мягко светится, когда садится солнце.', 150),
  deco('hanging_ivy', 'Подвесной плющ', 'hanging-plant', 'hanging', coins(85), 3, 1, 90, 150, 3, 'Плющ в верёвочном кашпо. Только для красоты, чудесно растрёпанный.'),
  deco('side_table', 'Садовый столик', 'table', 'floor', coins(110), 4, 1, 130, 90, 3, 'Низкий столик для чашки чая и стопки каталогов семян.'),
  deco('garden_bench', 'Садовая скамейка', 'furniture', 'floor', coins(240), 5, 2, 170, 100, 4, 'Дубовые планки, отполированные теми, кто никуда не спешил.'),
  deco('hanging_fern', 'Подвесной папоротник', 'hanging-plant', 'hanging', coins(190), 6, 2, 110, 130, 4, 'Каскад вайй в глиняной чаше.'),
  deco('floor_lamp', 'Лампа для чтения', 'lamp', 'floor', coins(260), 7, 2, 60, 170, 4, 'Латунная лампа для вечеров с каталогом семян.', 170),
  deco('wall_clock', 'Вокзальные часы', 'ornament', 'wall', coins(320), 8, 2, 90, 90, 3, 'Спасены со старого перрона. С тех пор ни разу не ошиблись.'),
  deco('armchair', 'Выцветшее кресло', 'furniture', 'floor', coins(520), 10, 3, 130, 120, 6, 'Зелёный бархат стал мягким и бледным. Лучшее место в доме.'),
  deco('string_lights', 'Гирлянда', 'lamp', 'hanging', coins(480), 10, 3, 260, 70, 5, 'Тёплые лампочки вдоль стропила.', 190),
  deco('stone_frog', 'Каменная лягушка', 'ornament', 'floor', coins(600), 12, 3, 80, 60, 3, 'Уже сто лет мысленно сторожит пруд.'),
  deco('urn', 'Резная каменная ваза', 'pot', 'floor', coins(1600), 16, 4, 110, 170, 7, 'Выветренный известняк, из которого льётся папоротник.'),
  deco('bird_cage', 'Пустая птичья клетка', 'ornament', 'hanging', gems(2), 12, 3, 90, 170, 6, 'Дверца открыта. Вместо птицы здесь поселилась лоза.'),
  deco('statue', 'Мраморная нимфа', 'ornament', 'floor', gems(4), 20, 4, 110, 230, 10, 'Старая садовая статуя, и мох на ней именно там, где нужно.'),
];

const byId = <T extends { id: string }>(list: T[]): Map<string, T> => new Map(list.map((x) => [x.id, x]));
const POT_MAP = byId(POTS);
const FERT_MAP = byId(FERTILIZERS);
const DECO_MAP = byId(DECORATIONS);
const EQUIP_MAP = byId(EQUIPMENT);
const MUT_MAP = byId(MUTATIONS);
const UPGRADE_MAP = byId(UPGRADES);

export const potById = (id: string) => POT_MAP.get(id);
export const fertilizerById = (id: string) => FERT_MAP.get(id);
export const decorationById = (id: string) => DECO_MAP.get(id);
export const equipmentById = (id: string) => EQUIP_MAP.get(id);
export const mutationById = (id: string) => MUT_MAP.get(id);
export const upgradeById = (id: UpgradeId) => UPGRADE_MAP.get(id);

/** «Золотой сорт», for naming a mutated plant without having to decline the plant's name. */
export const mutationLabel = (name: string): string => `${name.toLowerCase()} сорт`;

export const TOOLS = [
  { id: 'watering_can', name: 'Лейка', description: 'С вмятиной, зато не течёт. Каждый полив берёт одну порцию воды из бака.', icon: 'items/tool_watering_can' },
  { id: 'trowel', name: 'Старый совок', description: 'Выкапывает растение из горшка, чтобы освободить место для нового.', icon: 'items/tool_trowel' },
];

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_seed', name: 'Начало', description: 'Посадите первое семя.', condition: { type: 'stat', stat: 'plantsPlanted', target: 1 }, reward: { coins: 15 } },
  { id: 'first_harvest', name: 'Первые плоды', description: 'Соберите первый урожай.', condition: { type: 'stat', stat: 'plantsHarvested', target: 1 }, reward: { coins: 25, gems: 1 } },
  { id: 'green_thumb', name: 'Лёгкая рука', description: 'Соберите урожай с 25 растений.', condition: { type: 'stat', stat: 'plantsHarvested', target: 25 }, reward: { coins: 150 } },
  { id: 'head_gardener', name: 'Главный садовник', description: 'Соберите урожай с 200 растений.', condition: { type: 'stat', stat: 'plantsHarvested', target: 200 }, reward: { gems: 3 } },
  { id: 'rainmaker', name: 'Повелитель дождя', description: 'Полейте растения 100 раз.', condition: { type: 'stat', stat: 'timesWatered', target: 100 }, reward: { coins: 200 } },
  { id: 'second_chance', name: 'Второй шанс', description: 'Выходите заброшенное растение.', condition: { type: 'stat', stat: 'plantsRecovered', target: 1 }, reward: { coins: 50, gems: 1 } },
  { id: 'market_day', name: 'Базарный день', description: 'Заработайте на продажах 1 000 монет.', condition: { type: 'stat', stat: 'coinsEarned', target: 1000 }, reward: { coins: 100 } },
  { id: 'prosperous', name: 'Процветание', description: 'Заработайте на продажах 50 000 монет.', condition: { type: 'stat', stat: 'coinsEarned', target: 50000 }, reward: { gems: 5 } },
  { id: 'homemaker', name: 'Хозяйка теплицы', description: 'Поставьте 5 украшений.', condition: { type: 'stat', stat: 'decorationsPlaced', target: 5 }, reward: { coins: 120, gems: 1 } },
  { id: 'oddity', name: 'Вот так диковинка', description: 'Соберите урожай редкого сорта.', condition: { type: 'stat', stat: 'mutationsFound', target: 1 }, reward: { gems: 2 } },
  { id: 'botanist', name: 'Ботаник', description: 'Откройте 5 видов растений.', condition: { type: 'species', target: 5 }, reward: { coins: 200 } },
  { id: 'renovator', name: 'Мастер на все руки', description: 'Постройте Маленький сад.', condition: { type: 'greenhouseLevel', target: 2 }, reward: { coins: 100, gems: 1 } },
  { id: 'jungle', name: 'В джунгли', description: 'Постройте Тропический рай.', condition: { type: 'greenhouseLevel', target: 4 }, reward: { gems: 4 } },
  { id: 'conservatory', name: 'Большая оранжерея', description: 'Постройте Большую оранжерею.', condition: { type: 'greenhouseLevel', target: 5 }, reward: { gems: 10 } },
  { id: 'seasoned', name: 'Опытный садовод', description: 'Достигните 10-го уровня.', condition: { type: 'playerLevel', target: 10 }, reward: { gems: 2 } },
];

export const COLLECTION_MILESTONES: CollectionMilestone[] = [
  { id: 'col_3', name: 'Гербарий', speciesRequired: 3, reward: { coins: 60, items: [{ itemId: 'fert:compost', quantity: 3 }] } },
  { id: 'col_6', name: 'Полевой дневник', speciesRequired: 6, reward: { gems: 1, coins: 150 } },
  { id: 'col_10', name: 'Глаз хранителя', speciesRequired: 10, reward: { gems: 2, coins: 800 } },
  { id: 'col_15', name: 'Живая библиотека', speciesRequired: 15, reward: { gems: 4, items: [{ itemId: 'fert:moon_feed', quantity: 2 }] } },
  { id: 'col_all', name: 'Целый мир под стеклом', speciesRequired: 21, reward: { gems: 15 } },
];
