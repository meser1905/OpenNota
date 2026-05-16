import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryCache } from './in-memory-cache';

/** Unit tests for the process-local {@link InMemoryCache}. */
describe('InMemoryCache', () => {
  let cache: InMemoryCache;

  beforeEach(() => {
    cache = new InMemoryCache();
  });

  it('returns undefined for a missing key', async () => {
    expect(await cache.get('absent')).toBeUndefined();
  });

  it('stores and retrieves a value', async () => {
    await cache.set('answer', 42);
    expect(await cache.get<number>('answer')).toBe(42);
  });

  it('reports presence with has()', async () => {
    expect(await cache.has('k')).toBe(false);
    await cache.set('k', 'v');
    expect(await cache.has('k')).toBe(true);
  });

  it('deletes a single key', async () => {
    await cache.set('k', 'v');
    await cache.delete('k');
    expect(await cache.get('k')).toBeUndefined();
  });

  it('clears every key', async () => {
    await cache.set('a', 1);
    await cache.set('b', 2);
    await cache.clear();
    expect(cache.size).toBe(0);
  });

  it('removes every key matching a prefix', async () => {
    await cache.set('term-average:1', 'x');
    await cache.set('term-average:2', 'y');
    await cache.set('other:1', 'z');

    await cache.deleteByPrefix('term-average:');

    expect(await cache.get('term-average:1')).toBeUndefined();
    expect(await cache.get('term-average:2')).toBeUndefined();
    expect(await cache.get('other:1')).toBe('z');
  });

  describe('TTL expiry', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('expires an entry once its TTL has elapsed', async () => {
      await cache.set('temp', 'value', 1000);
      expect(await cache.get('temp')).toBe('value');

      vi.advanceTimersByTime(1001);
      expect(await cache.get('temp')).toBeUndefined();
    });

    it('keeps an entry with no TTL indefinitely', async () => {
      await cache.set('forever', 'value');
      vi.advanceTimersByTime(60 * 60 * 1000);
      expect(await cache.get('forever')).toBe('value');
    });
  });
});
