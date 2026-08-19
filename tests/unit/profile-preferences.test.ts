import { beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeInterestTag } from '@/data/interest-tags';
import { createProfileStore } from '@/stores/profile-store';

describe('profile preferences v2', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('normalizes, de-duplicates, and restores interests after clearing', async () => {
    const store = createProfileStore();
    await store.persist.rehydrate();

    store.getState().clearInterestTags();
    store.getState().addInterestTag('  #海岛  ');
    store.getState().addInterestTag('海岛');

    expect(store.getState().interestTags).toEqual(['海岛']);
    expect(store.getState().personalizedFeed).toBe(false);
  });

  it('normalizes whitespace and removes hash prefixes', () => {
    expect(normalizeInterestTag('  ##城市   漫游  ')).toBe('城市 漫游');
  });

  it('persists a hash-prefixed interest with intervening whitespace and rehydrates it', async () => {
    const store = createProfileStore();
    await store.persist.rehydrate();
    store.getState().clearInterestTags();
    store.getState().addInterestTag(' # 海岛 ');

    expect(store.getState().interestTags).toEqual(['海岛']);

    const rehydratedStore = createProfileStore();
    await rehydratedStore.persist.rehydrate();
    expect(rehydratedStore.getState().interestTags).toEqual(['海岛']);
  });

  it('rejects invalid tags without changing saved interests', () => {
    const store = createProfileStore();
    const before = store.getState().interestTags;

    expect(() => store.getState().addInterestTag('#旅')).toThrow('PROFILE_TAG_INVALID');
    expect(store.getState().interestTags).toEqual(before);
  });

  it('prevents case-insensitive duplicates and enforces the tag limit', () => {
    const store = createProfileStore();
    store.getState().replaceInterestTags([
      '山野', '人文', '慢旅行', '海岛', '山水', '雪山',
      '古镇', '摄影', '亲子', '自驾', '周末', 'Safety',
    ]);
    store.getState().addInterestTag('SAFETY');

    expect(store.getState().interestTags).toHaveLength(12);
    expect(() => store.getState().addInterestTag('博物馆')).toThrow('PROFILE_TAG_LIMIT');
    expect(store.getState().interestTags).toHaveLength(12);
  });

  it('de-duplicates Latin tags when the runtime default locale maps I differently', () => {
    const localeLowercase = vi.spyOn(String.prototype, 'toLocaleLowerCase').mockImplementation(function (this: string) {
      return this.replaceAll('I', 'ı').toLowerCase();
    });
    const store = createProfileStore();

    try {
      store.getState().replaceInterestTags(['ISTANBUL']);
      store.getState().addInterestTag('istanbul');

      expect(store.getState().interestTags).toEqual(['ISTANBUL']);
    } finally {
      localeLowercase.mockRestore();
    }
  });

  it('migrates version one preferences to version two', async () => {
    window.localStorage.setItem('xingyu-profile-demo-v1', JSON.stringify({
      state: { personalizedFeed: true, interestTags: [' #山野 ', '山野'] },
      version: 1,
    }));
    const store = createProfileStore();

    await store.persist.rehydrate();

    expect(store.getState().interestTags).toEqual(['山野']);
    expect(JSON.parse(window.localStorage.getItem('xingyu-profile-demo-v1')!).version).toBe(2);
  });

  it('fails closed without overwriting malformed version two bytes', async () => {
    const malformed = JSON.stringify({
      state: { personalizedFeed: true, interestTags: ['山野', '山野'] },
      version: 2,
    });
    window.localStorage.setItem('xingyu-profile-demo-v1', malformed);
    const store = createProfileStore();

    await store.persist.rehydrate();

    expect(store.getState().personalizedFeed).toBe(false);
    expect(store.getState().interestTags).toEqual([]);
    expect(window.localStorage.getItem('xingyu-profile-demo-v1')).toBe(malformed);
  });
});
