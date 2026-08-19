export const INTEREST_CATEGORIES = [
  { id: 'style', label: '旅行方式', tags: ['慢旅行', '自驾', '亲子', '独自出发', '周末'] },
  { id: 'nature', label: '自然景观', tags: ['海岛', '山水', '雪山', '轻徒步'] },
  { id: 'culture', label: '城市人文', tags: ['古镇', '城市漫游', '人文历史', '摄影'] },
  { id: 'lodging', label: '住宿偏好', tags: ['特色民宿', '精品酒店'] },
  { id: 'food', label: '美食体验', tags: ['美食'] },
  { id: 'safety', label: '安全与同行', tags: ['雨天出行', '安全'] },
] as const;

export function normalizeInterestTag(raw: string): string {
  return raw.trim().replace(/^#+/, '').replace(/\s+/g, ' ');
}

export function hasValidInterestTagLength(tag: string): boolean {
  const visibleCharacterCount = Array.from(tag.replace(/\s/g, '')).length;
  return visibleCharacterCount >= 2 && visibleCharacterCount <= 12;
}

export function interestTagKey(tag: string): string {
  return normalizeInterestTag(tag).toLocaleLowerCase();
}
