'use client';

import { useEffect, useState } from 'react';
import { AudioService } from '@/audio/AudioService';
import { useGame } from '@/stores/gameStore';
import { tankCapacity } from '@/systems/derived';
import { environmentContext, getEnvironment, WEATHER_INFO } from '@/systems/environment';
import { xpProgress } from '@/systems/progression';
import { coinsText, formatNumber, gemsText } from '@/utils/format';
import { AssetImg } from '../ui/primitives';
import type { DayPhase, WeatherKind } from '@/types/game';
import styles from './Hud.module.css';

function weatherIcon(weather: WeatherKind, phase: DayPhase): string {
  if (weather === 'rain') return 'ui/rain';
  if (weather === 'cloudy') return 'ui/cloudy';
  if (phase === 'night') return 'ui/moon';
  return weather === 'sunny' ? 'ui/sun' : 'ui/clear';
}

const pad = (n: number) => String(n).padStart(2, '0');

export function Hud() {
  const save = useGame((s) => s.save);
  const [showWeather, setShowWeather] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // The simulation moves in 5-second steps, but the clock on screen should match the real one.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!save) return null;

  const env = getEnvironment(now, environmentContext(save));
  const xp = xpProgress(save.profile);
  const capacity = tankCapacity(save);
  const info = WEATHER_INFO[env.weather];

  return (
    <div className={styles.hud}>
      <div className={`${styles.plate} ${styles.level}`} title={xp.maxed ? 'Высший уровень' : `Опыт: ${formatNumber(xp.current)} из ${formatNumber(xp.needed)}`}>
        <span className={styles.levelBadge}>
          <span className="sr-only">Уровень </span>
          {save.profile.level}
        </span>
        <div className={styles.xpTrack} role="progressbar" aria-label="Опыт до следующего уровня" aria-valuenow={Math.round(xp.fraction * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className={styles.xpFill} style={{ width: `${xp.fraction * 100}%` }} />
        </div>
      </div>

      <div className={styles.plate} aria-label={coinsText(save.currencies.coins)}>
        <AssetImg assetKey="ui/coin" size={24} />
        <span className={styles.value}>{formatNumber(save.currencies.coins)}</span>
      </div>
      <div className={styles.plate} aria-label={gemsText(save.currencies.gems)}>
        <AssetImg assetKey="ui/gem" size={24} />
        <span className={styles.value}>{formatNumber(save.currencies.gems)}</span>
      </div>
      <div className={styles.plate} aria-label={`Бак с водой: ${Math.floor(save.tank)} из ${capacity} поливов`}>
        <AssetImg assetKey="ui/water" size={22} />
        <span className={styles.value}>
          {Math.floor(save.tank)}
          <span className={styles.of}>/{capacity}</span>
        </span>
      </div>

      <div className={styles.spacer} />

      <div className={styles.clockWrap}>
        <button
          type="button"
          className={`${styles.plate} ${styles.clock}`}
          aria-expanded={showWeather}
          aria-label={`${pad(env.hour)}:${pad(env.minute)}, ${info.label}. Показать погоду`}
          onClick={() => {
            AudioService.play('ui');
            setShowWeather((v) => !v);
          }}
        >
          <AssetImg assetKey={weatherIcon(env.weather, env.phase)} size={24} />
          <span className={styles.value}>
            {pad(env.hour)}:{pad(env.minute)}
          </span>
        </button>
        {showWeather && (
          <div className={styles.popover} role="status">
            <strong>{info.label}</strong>
            <p>{info.rule}</p>
            <ul>
              <li>
                Температура в теплице: <b>{Math.round(env.temperature)}°C</b>
              </li>
              <li>
                Свет в теплице: <b>{Math.round(env.light * 100)}%</b>
              </li>
            </ul>
            <p className={styles.popoverNote}>Погода лишь немного влияет на рост и не может навредить растениям. Время в игре совпадает с часами на вашем устройстве.</p>
          </div>
        )}
      </div>
    </div>
  );
}
