'use client';

import { useUi } from '@/stores/uiStore';
import { AssetImg } from '../ui/primitives';
import styles from './Notifications.module.css';

export function Notifications() {
  const notices = useUi((s) => s.notices);
  return (
    <div className={styles.stack} aria-live="polite">
      {notices.map((n) => (
        <div key={n.id} className={`${styles.notice} ${styles[n.kind]}`}>
          {n.icon && <AssetImg assetKey={n.icon} size={30} />}
          <span className={styles.text}>
            <strong>{n.text}</strong>
            {n.detail && <small>{n.detail}</small>}
          </span>
        </div>
      ))}
    </div>
  );
}
