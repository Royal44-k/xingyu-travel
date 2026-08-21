import type { AssistantAlternative } from '@/domain/assistant/schema';
import styles from './assistant.module.css';

interface AlternativePlanProps {
  alternative: AssistantAlternative;
  index: number;
  onSelect?: (alternative: AssistantAlternative) => void;
  selected?: boolean;
}

export function AlternativePlan({ alternative, index, onSelect, selected = false }: AlternativePlanProps) {
  const label = String.fromCharCode(65 + index);
  return (
    <article aria-label={`方案 Plan ${label}`} className={styles.planCard}>
      <p>PLAN {label}</p>
      <h3>{alternative.title}</h3>
      <dl>
        <div><dt>成本</dt><dd>{alternative.cost}</dd></div>
        <div><dt>耗时</dt><dd>{alternative.duration}</dd></div>
        <div><dt>风险</dt><dd>{alternative.risk}</dd></div>
      </dl>
      <ul>{alternative.actions.map((action) => <li key={action}>{action}</li>)}</ul>
      {onSelect ? (
        <button
          aria-pressed={selected}
          onClick={() => onSelect(alternative)}
          type="button"
        >选择{alternative.title}方案</button>
      ) : <p className={styles.planReadOnly}>仅查看建议</p>}
    </article>
  );
}
