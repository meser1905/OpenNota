import type { CacheStore } from './cache-store';

interface CacheEntry<T> {
  value: T;
  /** Epoch milliseconds at which the entry expires, or `null` for no expiry. */
  expiresAt: number | null;
}

/**
 * Process-local cache backed by a `Map`, with per-entry TTL support.
 *
 * Suitable for the single-process MVP. It is not shared across processes and
 * does not survive a restart; both are acceptable for cached derived data such
 * as term averages, which can always be recomputed from the database.
 */
export class InMemoryCache implements CacheStore {
  private readonly store = new Map<string, CacheEntry<unknown>>();

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);
    if (entry === undefined) {
      return undefined;
    }
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const expiresAt = ttlMs !== undefined && ttlMs > 0 ? Date.now() + ttlMs : null;
    this.store.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== undefined;
  }

  /** Current entry count, including not-yet-evicted expired entries. Test aid. */
  get size(): number {
    return this.store.size;
  }
}
