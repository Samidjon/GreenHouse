import { assetUrl } from '@/assets/manifest';
import styles from './Menu.module.css';

export function Splash({ label, progress }: { label: string; progress?: number }) {
  return (
    <div className={styles.splash} role="status">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={assetUrl('ui/sprout')} width={72} height={72} alt="" className={styles.splashIcon} />
      <p>{label}</p>
      {progress !== undefined && (
        <div className={styles.splashBar}>
          <div style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
    </div>
  );
}
