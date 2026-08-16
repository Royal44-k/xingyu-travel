'use client';

import { useState } from 'react';
import { validatePartnerIntent, type PartnerIntent } from '@/data/partners';
import styles from './partners.module.css';

export function IntentForm({ initialIntent, onPublish }: {
  initialIntent: PartnerIntent;
  onPublish: (intent: PartnerIntent) => void;
}) {
  const [intent, setIntent] = useState(initialIntent);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = <Key extends keyof PartnerIntent>(key: Key, value: PartnerIntent[Key]) => {
    setIntent((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const result = validatePartnerIntent(intent);
    if (!result.success) {
      setErrors(result.fieldErrors);
      return;
    }
    setErrors({});
    onPublish(result.data);
  };

  return (
    <form className={styles.intentForm} noValidate onSubmit={submit}>
      <div className={styles.formHeading}>
        <div><p>YOUR INTENT / 01</p><h2>先把旅行边界说清楚</h2></div>
        <span>所有字段均必填 · 只保存在当前浏览器</span>
      </div>
      <div className={styles.formGrid}>
        <Field error={errors.destination} label="目的地">
          <input aria-invalid={Boolean(errors.destination)} onChange={(event) => update('destination', event.target.value)} value={intent.destination} />
        </Field>
        <Field error={errors.startDate} label="出发日期">
          <input aria-invalid={Boolean(errors.startDate)} onChange={(event) => update('startDate', event.target.value)} type="date" value={intent.startDate} />
        </Field>
        <Field error={errors.endDate} label="返程日期">
          <input aria-invalid={Boolean(errors.endDate)} onChange={(event) => update('endDate', event.target.value)} type="date" value={intent.endDate} />
        </Field>
        <Field error={errors.budget} label="旅行预算">
          <input aria-invalid={Boolean(errors.budget)} min="1" onChange={(event) => update('budget', Number(event.target.value))} type="number" value={intent.budget} />
        </Field>
        <Field error={errors.pace} label="旅行节奏">
          <select onChange={(event) => update('pace', event.target.value)} value={intent.pace}>
            <option value="">请选择</option><option value="舒缓">舒缓</option><option value="适中">适中</option><option value="紧凑">紧凑</option>
          </select>
        </Field>
        <Field error={errors.interests} label="兴趣（用逗号分隔）">
          <input aria-invalid={Boolean(errors.interests)} onChange={(event) => update('interests', event.target.value.split(/[,，]/).map((value) => value.trim()).filter(Boolean))} value={intent.interests.join('，')} />
        </Field>
        <Field className={styles.wideField} error={errors.route} label="期待路线">
          <input aria-invalid={Boolean(errors.route)} onChange={(event) => update('route', event.target.value)} value={intent.route} />
        </Field>
        <Field className={styles.wideField} error={errors.lodgingBoundary} label="住宿边界">
          <input aria-invalid={Boolean(errors.lodgingBoundary)} onChange={(event) => update('lodgingBoundary', event.target.value)} value={intent.lodgingBoundary} />
        </Field>
        <Field error={errors.schedule} label="日常作息">
          <input aria-invalid={Boolean(errors.schedule)} onChange={(event) => update('schedule', event.target.value)} value={intent.schedule} />
        </Field>
        <Field error={errors.socialPreference} label="社交偏好">
          <input aria-invalid={Boolean(errors.socialPreference)} onChange={(event) => update('socialPreference', event.target.value)} value={intent.socialPreference} />
        </Field>
        <Field error={errors.capacity} label="同行容量">
          <input aria-invalid={Boolean(errors.capacity)} max="12" min="1" onChange={(event) => update('capacity', Number(event.target.value))} type="number" value={intent.capacity} />
        </Field>
        <label className={styles.certificationField}>
          <input checked={intent.certificationRequired} onChange={(event) => update('certificationRequired', event.target.checked)} type="checkbox" />
          <span><strong>要求身份状态已验证</strong><small>仅使用验证状态，不收集证件材料</small></span>
        </label>
      </div>
      {Object.keys(errors).length > 0 && (
        <p className={styles.formError} role="alert">{Object.values(errors).join('；')}</p>
      )}
      <button className={styles.primaryButton} type="submit">发布匹配意愿</button>
    </form>
  );
}

function Field({ label, error, className, children }: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return <label className={className}><span>{label}</span>{children}{error && <small>{error}</small>}</label>;
}
