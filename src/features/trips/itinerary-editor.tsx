'use client';

import { ArrowDown, ArrowUp, BookmarkSimple, Check } from '@phosphor-icons/react';
import { useState } from 'react';
import type { WorkbenchItineraryItem } from '@/stores/trip-store';
import styles from './trips.module.css';

interface ItineraryEditorProps {
  items: WorkbenchItineraryItem[];
  onReorder: (itemId: string, direction: 'up' | 'down') => void;
  onSave: (
    itemId: string,
    patch: Pick<WorkbenchItineraryItem, 'title' | 'location' | 'estimatedCost'>,
  ) => void;
  onToggleAlternative: (itemId: string) => void;
}

function ItineraryNode({
  item,
  index,
  itemCount,
  onReorder,
  onSave,
  onToggleAlternative,
}: {
  item: WorkbenchItineraryItem;
  index: number;
  itemCount: number;
  onReorder: ItineraryEditorProps['onReorder'];
  onSave: ItineraryEditorProps['onSave'];
  onToggleAlternative: ItineraryEditorProps['onToggleAlternative'];
}) {
  const [title, setTitle] = useState(item.title);
  const [location, setLocation] = useState(item.location);
  const [estimatedCost, setEstimatedCost] = useState(String(item.estimatedCost));
  const [saved, setSaved] = useState(false);

  const save = () => {
    const parsedCost = Number(estimatedCost);
    if (!title.trim() || !location.trim() || !Number.isFinite(parsedCost) || parsedCost < 0) return;
    onSave(item.id, {
      title: title.trim(),
      location: location.trim(),
      estimatedCost: parsedCost,
    });
    setSaved(true);
  };

  return (
    <fieldset className={styles.itineraryNode} aria-label={`第 ${index + 1} 天行程`}>
      <legend className={styles.srOnly}>第 {index + 1} 天行程</legend>
      <div className={styles.nodeRail} aria-hidden="true">
        <span>{String(index + 1).padStart(2, '0')}</span>
      </div>
      <div className={styles.nodeBody}>
        <div className={styles.nodeToolbar}>
          <span className={styles.dayLabel}>DAY {index + 1}</span>
          <div className={styles.nodeActions}>
            <button
              aria-label={`上移第 ${index + 1} 天`}
              disabled={index === 0}
              onClick={() => onReorder(item.id, 'up')}
              type="button"
            ><ArrowUp aria-hidden size={17} /></button>
            <button
              aria-label={`下移第 ${index + 1} 天`}
              disabled={index === itemCount - 1}
              onClick={() => onReorder(item.id, 'down')}
              type="button"
            ><ArrowDown aria-hidden size={17} /></button>
            <button
              aria-pressed={item.isAlternative}
              className={item.isAlternative ? styles.alternativeActive : undefined}
              onClick={() => onToggleAlternative(item.id)}
              type="button"
            ><BookmarkSimple aria-hidden size={17} weight={item.isAlternative ? 'fill' : 'regular'} /> {item.isAlternative ? '取消备选' : '标记为备选'}</button>
          </div>
        </div>
        <div className={styles.itemFields}>
          <label>标题<input maxLength={60} onChange={(event) => { setTitle(event.target.value); setSaved(false); }} value={title} /></label>
          <label>地点<input maxLength={60} onChange={(event) => { setLocation(event.target.value); setSaved(false); }} value={location} /></label>
          <label>预计花费<input min="0" onChange={(event) => { setEstimatedCost(event.target.value); setSaved(false); }} type="number" value={estimatedCost} /></label>
        </div>
        <p className={styles.nodeDescription}>{item.description}</p>
        <button className={styles.saveItemButton} onClick={save} type="button">
          <Check aria-hidden size={16} /> 保存第 {index + 1} 天
        </button>
        {saved && <span className={styles.savedNote}>已保存</span>}
      </div>
    </fieldset>
  );
}

export function ItineraryEditor(props: ItineraryEditorProps) {
  return (
    <section aria-labelledby="itinerary-title" className={styles.itinerarySection}>
      <div className={styles.sectionHeading}>
        <div><p>ITINERARY / 01</p><h2 id="itinerary-title">路线编排</h2></div>
        <span>五个节点 · 自动保存至本浏览器</span>
      </div>
      <div className={styles.itineraryList}>
        {props.items.map((item, index) => (
          <ItineraryNode
            item={item}
            index={index}
            itemCount={props.items.length}
            key={item.id}
            onReorder={props.onReorder}
            onSave={props.onSave}
            onToggleAlternative={props.onToggleAlternative}
          />
        ))}
      </div>
    </section>
  );
}
