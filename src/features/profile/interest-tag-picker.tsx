'use client';

import { Check, X } from '@phosphor-icons/react';
import { FormEvent, useState } from 'react';
import { INTEREST_CATEGORIES, interestTagKey, normalizeInterestTag } from '@/data/interest-tags';

type InterestTagPickerProps = {
  interestTags: string[];
  onAddInterestTag: (tag: string) => void;
  onClearInterestTags: () => void;
  onRemoveInterestTag: (tag: string) => void;
};

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message === 'PROFILE_TAG_LIMIT') return '最多选择 12 个兴趣标签';
  return '兴趣标签需为 2–12 个可见字符';
}

export function InterestTagPicker({
  interestTags,
  onAddInterestTag,
  onClearInterestTags,
  onRemoveInterestTag,
}: InterestTagPickerProps) {
  const [customTag, setCustomTag] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [confirmingClear, setConfirmingClear] = useState(false);

  const isSelected = (tag: string) => interestTags.some((selectedTag) => interestTagKey(selectedTag) === interestTagKey(tag));

  function toggleTag(tag: string) {
    setError(null);
    if (isSelected(tag)) {
      onRemoveInterestTag(tag);
      setStatus(`已移除 ${tag}`);
      return;
    }

    try {
      onAddInterestTag(tag);
      setStatus(`已添加 ${normalizeInterestTag(tag)}`);
    } catch (caughtError) {
      setError(errorMessage(caughtError));
    }
  }

  function addCustomTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedTag = normalizeInterestTag(customTag);
    setError(null);

    if (isSelected(normalizedTag)) {
      setStatus(`${normalizedTag} 已在兴趣列表中`);
      setCustomTag('');
      return;
    }

    try {
      onAddInterestTag(customTag);
      setCustomTag('');
      setStatus(`已添加 ${normalizedTag}`);
    } catch (caughtError) {
      setError(errorMessage(caughtError));
    }
  }

  function confirmClear() {
    onClearInterestTags();
    setConfirmingClear(false);
    setError(null);
    setStatus('已清除全部兴趣');
  }

  return (
    <section aria-labelledby="interest-picker-title" className="interestTagPicker">
      <div className="interestPickerHeader">
        <div>
          <p className="interestPickerEyebrow">TRAVEL INTEREST LIBRARY</p>
          <h3 id="interest-picker-title">选择你的旅行兴趣</h3>
          <p>标签只保存在当前浏览器，可随时调整。</p>
        </div>
        {confirmingClear ? (
          <div className="interestClearConfirm" role="group" aria-label="确认清除兴趣">
            <span>确认清除全部兴趣？</span>
            <button onClick={confirmClear} type="button">确认清除</button>
            <button onClick={() => setConfirmingClear(false)} type="button">取消</button>
          </div>
        ) : (
          <button
            className="preferenceClear"
            disabled={!interestTags.length}
            onClick={() => setConfirmingClear(true)}
            type="button"
          >
            <X aria-hidden size={16} /> 清除全部兴趣
          </button>
        )}
      </div>

      <div aria-label="当前兴趣标签" className="preferenceTags">
        {interestTags.length ? interestTags.map((tag) => (
          <span key={tag} className="selectedInterestTag">
            #{tag}
            <button aria-label={`移除 ${tag}`} onClick={() => toggleTag(tag)} type="button">
              <X aria-hidden size={13} />
            </button>
          </span>
        )) : <span>尚无兴趣标签；从下方标签库开始选择。</span>}
      </div>

      <div className="interestCategoryList">
        {INTEREST_CATEGORIES.map((category) => (
          <section aria-labelledby={`interest-category-${category.id}`} className="interestCategory" key={category.id}>
            <h4 id={`interest-category-${category.id}`}>{category.label}</h4>
            <div className="interestChipList">
              {category.tags.map((tag) => {
                const selected = isSelected(tag);
                return (
                  <button
                    aria-label={tag}
                    aria-pressed={selected}
                    className="interestChip"
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    type="button"
                  >
                    {selected ? <Check aria-hidden size={15} weight="bold" /> : null}
                    {tag}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <form className="customInterestForm" onSubmit={addCustomTag}>
        <label htmlFor="custom-interest-tag">自定义兴趣</label>
        <div>
          <input
            aria-describedby={error ? 'custom-interest-error' : undefined}
            id="custom-interest-tag"
            onChange={(event) => setCustomTag(event.target.value)}
            placeholder="例如：博物馆"
            value={customTag}
          />
          <button type="submit">添加兴趣</button>
        </div>
        {error ? <p id="custom-interest-error" role="alert">{error}</p> : null}
      </form>
      <p aria-live="polite" className="interestPickerStatus">{status}</p>
    </section>
  );
}
