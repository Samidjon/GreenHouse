'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { AssetImg } from './primitives';
import styles from './Modal.module.css';

const FOCUSABLE = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])';

export function Modal({ title, icon, subtitle, onClose, children, wide }: { title: string; icon: string; subtitle?: ReactNode; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('[data-close]')?.focus();
    return () => previous?.focus?.();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !ref.current) return;
    // Keep keyboard focus inside the panel.
    const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className={styles.back} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={`${styles.panel} ${wide ? styles.wide : ''}`} role="dialog" aria-modal="true" aria-label={title} onKeyDown={onKeyDown}>
        <header className={styles.header}>
          <AssetImg assetKey={icon} size={34} />
          <div className={styles.titles}>
            <h2>{title}</h2>
            {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
          </div>
          <button type="button" data-close className={styles.close} onClick={onClose} aria-label={`Закрыть: ${title}`}>
            <AssetImg assetKey="ui/close" size={20} />
          </button>
        </header>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
