'use client';

import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { assetKeyExists, assetUrl } from '@/assets/manifest';
import { AudioService } from '@/audio/AudioService';
import { RARITY_LABELS } from '@/data/plants';
import { formatNumber } from '@/utils/format';
import type { Price, Rarity } from '@/types/game';
import styles from './primitives.module.css';

export function AssetImg({ assetKey, size, alt = '', className }: { assetKey: string; size: number; alt?: string; className?: string }) {
  // Items from a newer content update may have no art in this build.
  const src = assetKeyExists(assetKey) ? assetUrl(assetKey) : assetUrl('ui/sprout');
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} width={size} height={size} alt={alt} draggable={false} className={`${styles.asset} ${className ?? ''}`} />;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'wood' | 'ghost' | 'danger';
  small?: boolean;
  silent?: boolean;
}

export function Button({ variant = 'wood', small, silent, className, onClick, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={`${styles.button} ${styles[variant]} ${small ? styles.small : ''} ${className ?? ''}`}
      onClick={(e) => {
        AudioService.unlock();
        if (!silent) AudioService.play('ui');
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

export function PriceTag({ price, unaffordable }: { price: Price; unaffordable?: boolean }) {
  return (
    <span className={`${styles.price} ${unaffordable ? styles.priceShort : ''}`}>
      <AssetImg assetKey={price.currency === 'coins' ? 'ui/coin' : 'ui/gem'} size={16} />
      {formatNumber(price.amount)}
      <span className="sr-only">{price.currency === 'coins' ? ' монет' : ' самоцветов'}</span>
    </span>
  );
}

export function RarityTag({ rarity }: { rarity: Rarity }) {
  return <span className={`${styles.rarity} ${styles[`rarity_${rarity}`]}`}>{RARITY_LABELS[rarity]}</span>;
}

export function Meter({ value, label, tone = 'leaf', detail }: { value: number; label: string; tone?: 'leaf' | 'water' | 'berry' | 'sun'; detail?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className={styles.meter}>
      <div className={styles.meterText}>
        <span>{label}</span>
        <span>{detail ?? `${pct}%`}</span>
      </div>
      <div className={styles.meterTrack} role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={`${styles.meterFill} ${styles[`fill_${tone}`]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: { id: T; label: string }[]; value: T; onChange: (id: T) => void; label: string }) {
  return (
    <div className={styles.tabs} role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={t.id === value}
          className={`${styles.tab} ${t.id === value ? styles.tabOn : ''}`}
          onClick={() => {
            AudioService.play('ui');
            onChange(t.id);
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <AssetImg assetKey={icon} size={52} />
      <h4>{title}</h4>
      {children && <p>{children}</p>}
    </div>
  );
}

/** A modal yes/no. Used only where something is hard to undo. */
export function ConfirmDialog({ title, children, confirmLabel, onConfirm, onCancel, danger }: { title: string; children: ReactNode; confirmLabel: string; onConfirm: () => void; onCancel: () => void; danger?: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div className={styles.confirmBack} role="alertdialog" aria-modal="true" aria-label={title} onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), onCancel())}>
      <div className={styles.confirm}>
        <h3>{title}</h3>
        <div className={styles.confirmBody}>{children}</div>
        <div className={styles.confirmActions}>
          <Button variant="ghost" onClick={onCancel}>
            Оставить как есть
          </Button>
          <button ref={ref} type="button" className={`${styles.button} ${danger ? styles.danger : styles.primary}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
