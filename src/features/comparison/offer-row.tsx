'use client';

import {
  ArrowSquareOut,
  CaretDown,
  CheckCircle,
  Heart,
  ShieldCheck,
  SuitcaseRolling,
  WarningCircle,
} from '@phosphor-icons/react';
import { useState } from 'react';
import type { NormalizedOffer } from '@/domain/comparison/types';
import styles from './comparison.module.css';

type OfferRowProps = {
  offer: NormalizedOffer;
  now: string;
  favorite: boolean;
  favoriteDisabled: boolean;
  selected: boolean;
  comparisonDisabled: boolean;
  onFavorite: (trigger: HTMLButtonElement) => void;
  onSelect: () => void;
  onOutbound: (trigger: HTMLButtonElement) => void;
};

const STALE_AFTER_MS = 2 * 60 * 60 * 1000;

function formatUpdatedAt(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return `${value} 更新`;
  return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]} 更新`;
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(value);
}

export function OfferRow({
  offer,
  now,
  favorite,
  favoriteDisabled,
  selected,
  comparisonDisabled,
  onFavorite,
  onSelect,
  onOutbound,
}: OfferRowProps) {
  const [expanded, setExpanded] = useState(false);
  const updatedAt = Date.parse(offer.updatedAt);
  const referenceTime = Date.parse(now);
  const stale =
    Number.isFinite(updatedAt) &&
    Number.isFinite(referenceTime) &&
    referenceTime - updatedAt > STALE_AFTER_MS;
  const benefit = offer.baggageIncluded
    ? '含托运行李'
    : offer.includedBenefits?.[0] ?? '未含额外权益';

  return (
    <article className={styles.offerRow} data-testid="offer-row">
      <div className={styles.offerIdentity}>
        <div className={styles.providerLine}>
          <span>{offer.provider}</span>
          <span className={styles.verified}>
            <ShieldCheck aria-hidden size={15} weight="fill" />
            {offer.providerVerified === false
              ? '供应商可信度待核验'
              : '供应商可信度 4.8/5 · 已验证'}
          </span>
        </div>
        <h2>{offer.title ?? `${offer.destination ?? ''}演示报价`}</h2>
        <p className={styles.updated}>{formatUpdatedAt(offer.updatedAt)}</p>
        {stale ? (
          <p className={styles.stale}>
            <WarningCircle aria-hidden size={16} />
            报价较早，请在确认前复核
          </p>
        ) : null}
      </div>

      <div className={styles.offerConditions}>
        <p>
          <SuitcaseRolling aria-hidden size={18} />
          {benefit}
        </p>
        <p>
          <CheckCircle aria-hidden size={18} />
          {offer.refundable ? '支持退改' : '限制退改'}
        </p>
        <button
          aria-expanded={expanded}
          className={styles.textButton}
          onClick={() => setExpanded((value) => !value)}
          type="button"
          aria-label={`查看 ${offer.provider} 报价条件`}
        >
          条件详情
          <CaretDown aria-hidden size={15} />
        </button>
      </div>

      <div className={styles.offerPrice}>
        <strong>¥{formatPrice(offer.totalPrice)} 含税总价</strong>
        <span>{offer.priceExplanation}</span>
        <button
          aria-label={`查看 ${offer.provider} 演示报价`}
          className={styles.primaryButton}
          onClick={(event) => onOutbound(event.currentTarget)}
          type="button"
        >
          查看演示报价
          <ArrowSquareOut aria-hidden size={17} />
        </button>
      </div>

      <div className={styles.offerActions}>
        <label className={styles.compareCheck}>
          <input
            checked={selected}
            disabled={comparisonDisabled}
            onChange={onSelect}
            type="checkbox"
            aria-label={`加入同屏对比：${offer.provider}`}
          />
          同屏对比
        </label>
        <button
          aria-describedby={favoriteDisabled ? 'comparison-library-state' : undefined}
          aria-label={`收藏 ${offer.provider} 报价`}
          aria-pressed={favorite}
          className={styles.iconButton}
          disabled={favoriteDisabled}
          onClick={(event) => onFavorite(event.currentTarget)}
          type="button"
        >
          <Heart aria-hidden size={20} weight={favorite ? 'fill' : 'regular'} />
        </button>
      </div>

      {expanded ? (
        <div className={styles.expandedConditions}>
          <p>{offer.baggageIncluded ? '含 1 件托运行李' : benefit}</p>
          <p>{offer.refundable ? '起飞前支持按供应商规则退改' : '不可免费退改'}</p>
          <p>价格已统一计入税费与必须支付的服务费用，附加选购服务不计入。</p>
        </div>
      ) : null}
    </article>
  );
}
